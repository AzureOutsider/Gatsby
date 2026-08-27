const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

function createApp(sharedStorage) {
  const storage = sharedStorage || new Map();
  const nodes = new Map();
  function node(id) {
    if (!nodes.has(id)) {
      nodes.set(id, {
        id,
        innerHTML: "",
        textContent: "",
        value: "",
        files: [],
        classList: { toggle() {} },
        addEventListener() {},
        focus() {},
        appendChild() {},
        remove() {}
      });
    }
    return nodes.get(id);
  }
  const localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  };
  const document = {
    getElementById: node,
    querySelectorAll() { return []; },
    addEventListener() {},
    createElement() { return node("created"); }
  };
  const context = {
    console,
    document,
    localStorage,
    window: {
      setTimeout(callback) { callback(); return 0; },
      clearTimeout() {},
      confirm() { return true; },
      URL: { createObjectURL() { return "blob:test"; }, revokeObjectURL() {} }
    },
    URL: { createObjectURL() { return "blob:test"; }, revokeObjectURL() {} },
    Blob: function Blob() {},
    FileReader: function FileReader() {},
    Audio: function Audio() {},
    fetch() { return Promise.reject(new Error("network disabled in state tests")); },
    Date,
    Map,
    Set,
    Math,
    JSON,
    Number,
    String,
    Boolean,
    Object,
    Array,
    RegExp,
    Promise,
    __nodes: nodes
  };
  vm.createContext(context);
  vm.runInContext(source + "\n" +
    "globalThis.__app = {state, nodes:globalThis.__nodes, createRound, startRound, recordRoundFeedback, advanceRoundCard, enterRoundSpelling, checkRoundSpelling, advanceRoundSpelling, buildExportData, mergeImportedData, replaceImportedData, normalizeAnswer, renderHome, renderActiveRound, leaveRound, abandonRound, persist};", context);
  const app = context.__app;
  app.renderActiveRound = function() {};
  app.renderHome = app.renderHome.bind(context);
  app.nodes = nodes;
  return app;
}

function current(app) {
  return app.state.round.cardQueue[app.state.round.cardIndex];
}

{
  const app = createApp();
  assert.equal(app.normalizeAnswer(" Hold-something / dear! "), "hold something dear");
  assert.equal(app.normalizeAnswer("WHAT'S  UP?"), "whats up");
}

{
  const app = createApp();
  assert.equal(app.createRound("core", 2), true);
  assert.equal(app.state.round.cards.length, 2);
  assert.match(app.state.round.sourceTitle, /Core Vocabulary/);
  app.renderHome();
  assert.match(app.nodes.get("view-home").innerHTML, /继续当前轮次/);
  app.recordRoundFeedback("forgot", current(app));
  assert.equal(app.state.round.cardQueue.length, 3);
  app.advanceRoundCard();
  app.advanceRoundCard();
  assert.equal(app.state.round.cardQueue[2].prompt, app.state.round.cardQueue[0].prompt);
  app.advanceRoundCard();
  assert.equal(app.state.round.stage, "gate");
}

{
  const storage = new Map();
  const app = createApp(storage);
  app.createRound("core", 2);
  const roundId = app.state.round.id;
  app.leaveRound();
  assert.equal(app.state.view, "home");
  assert.equal(JSON.parse(storage.get("english-study-round-v1")).id, roundId);
  app.state.view = "review";
  app.abandonRound();
  assert.equal(app.state.round, null);
  assert.equal(JSON.parse(storage.get("english-study-round-v1")), null);
  assert.equal(app.state.rounds.length, 0);
}

{
  const app = createApp();
  app.createRound("core", 2);
  app.state.round.stage = "gate";
  app.enterRoundSpelling();
  const input = app.nodes.get("round-practice-input");
  input.value = "wrong answer";
  app.checkRoundSpelling();
  assert.equal(app.state.round.spellingQueue.length, 3);
  assert.equal(app.state.round.spellingWrong, 1);
  app.advanceRoundSpelling();
  input.value = app.state.round.spellingQueue[1].prompt;
  app.checkRoundSpelling();
  assert.equal(app.state.round.typingCorrect, true);
  app.advanceRoundSpelling();
  assert.equal(app.state.round.spellingQueue[app.state.round.spellingIndex].prompt, app.state.round.spellingQueue[0].prompt);
}

{
  const storage = new Map();
  const app = createApp(storage);
  app.state.dailyGoal = 30;
  app.state.roundSize = 15;
  app.state.round = null;
  app.state.session = { unit: { prompt: "x" } };
  app.state.rounds = [{ id: "round-old", completedAt: "2026-08-01T00:00:00.000Z" }];
  app.state.logs = [{ itemId: "core", prompt: "accurate", rating: "know", at: "2026-08-01T00:00:00.000Z" }];
  const backup = app.buildExportData();
  assert.equal(backup.version, 1);
  assert.ok(Array.isArray(backup.items));
  assert.ok(Array.isArray(backup.logs));
  assert.ok(Array.isArray(backup.rounds));
  assert.equal(backup.dailyGoal, 30);
  app.mergeImportedData({ ...backup, items: backup.items.concat({ id: "extra", units: [{ prompt: "test" }] }), dailyGoal: 20 });
  assert.ok(app.state.items.some((item) => item.id === "extra"));
  assert.equal(app.state.dailyGoal, 20);
  app.replaceImportedData({ ...backup, items: [{ id: "replacement", units: [{ prompt: "replace" }] }], logs: [], schedule: {}, rounds: [], dailyGoal: 5, roundSize: 5, round: null });
  assert.deepEqual(app.state.items.map((item) => item.id), ["replacement"]);
  assert.equal(app.state.dailyGoal, 5);
  assert.equal(app.state.session, null);
}

console.log("app-state tests: 4 passed");
