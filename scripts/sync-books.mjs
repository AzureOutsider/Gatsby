import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const defaultManifest = path.join(root, "content", "books", "manifest.json");
const defaultSeed = path.join(root, "src", "data", "seed.json");

function parseArgs(argv) {
  const options = { apply: false, check: false, discover: false, replace: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--apply") options.apply = true;
    else if (value === "--check") options.check = true;
    else if (value === "--discover") options.discover = true;
    else if (value === "--replace-existing") options.replace = true;
    else if (value === "--manifest") options.manifest = argv[++index];
    else if (value === "--seed") options.seed = argv[++index];
    else if (value === "--source-dir") options.sourceDir = argv[++index];
    else if (value === "--help" || value === "-h") options.help = true;
    else throw new Error(`未知参数：${value}`);
  }
  if (options.apply && options.check)
    throw new Error("--apply 和 --check 不能同时使用。");
  if (!options.apply && !options.check) options.check = true;
  return options;
}

function printHelp() {
  console.log(`用法：
  npm run sync-books -- --check
  npm run sync-books -- --apply
  npm run sync-books -- --discover --apply

选项：
  --source-dir <目录>       覆盖 manifest 中的词书源目录
  --discover                将源目录中未登记的 CSV 加入 manifest
  --replace-existing        明确允许用源文件覆盖已有种子单元
  --check                   只检查，不写入文件
  --apply                   将缺失词书加入 seed.json`);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`无法读取 JSON：${file}\n${error.message}`);
  }
}

function csvRows(text) {
  const rows = [];
  let row = [], value = "", quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"' && quoted && input[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      row.push(value.trim());
      value = "";
      if (row.some((field) => field !== "")) rows.push(row);
      row = [];
    } else value += char;
  }
  if (quoted) throw new Error("CSV 中存在未闭合的引号。");
  row.push(value.trim());
  if (row.some((field) => field !== "")) rows.push(row);
  return rows;
}

function unitKind(type) {
  if (type === "歌曲笔记") return "短语";
  if (type === "影视台词") return "句子";
  return "词汇";
}

function parseCsv(file, metadata) {
  const rows = csvRows(fs.readFileSync(file, "utf8"));
  const units = [];
  for (const fields of rows) {
    const first = fields[0]?.trim() || "";
    if (!first || first.startsWith("#")) continue;
    if (/^(word|term|english|英文|单词)$/i.test(first)) continue;
    const [prompt, answer, context, ...notes] = fields;
    if (!answer) throw new Error(`${file}：词条“${prompt}”缺少释义。`);
    units.push({
      kind: unitKind(metadata.type),
      prompt,
      answer,
      context: context || "",
      note: notes.join(","),
    });
  }
  return units;
}

function readSource(file, metadata) {
  const extension = path.extname(file).toLowerCase();
  if (extension === ".csv") return parseCsv(file, metadata);
  if (extension === ".json") {
    const value = readJson(file);
    const book = Array.isArray(value) ? value[0] : value.items?.[0] || value;
    if (!book?.units || !Array.isArray(book.units))
      throw new Error(`${file}：JSON 中找不到 units 数组。`);
    return book.units;
  }
  throw new Error(`${file}：只支持 CSV 或 JSON 词书源文件。`);
}

function validateBook(book, source) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(book.id))
    throw new Error(`词书 ID 无效：${book.id}（来源：${source}）`);
  for (const field of ["title", "type", "author", "level", "description"])
    if (!book[field]?.trim()) throw new Error(`${book.id} 缺少 ${field}。`);
  if (!book.units.length) throw new Error(`${book.id} 没有有效学习单元。`);
  const prompts = new Set();
  for (const [index, unit] of book.units.entries()) {
    if (!unit.prompt?.trim() || !unit.answer?.trim())
      throw new Error(`${book.id} 的第 ${index + 1} 个单元缺少词条或释义。`);
    const key = unit.prompt.trim().toLowerCase();
    if (prompts.has(key)) throw new Error(`${book.id} 存在重复词条：${unit.prompt}`);
    prompts.add(key);
  }
}

function inferBook(file) {
  const base = path.basename(file, path.extname(file));
  const title = base.replace(/[_-]+/g, " ").trim();
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    id,
    file: path.basename(file),
    type: "单词书",
    title,
    author: "本地内容",
    level: "自定义",
    description: `从 ${title} 的词条中学习英语。`,
  };
}

function writeManifest(file, manifest) {
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return printHelp();
  const manifestFile = path.resolve(options.manifest || defaultManifest);
  const seedFile = path.resolve(options.seed || defaultSeed);
  const manifest = readJson(manifestFile);
  if (!Array.isArray(manifest.books)) throw new Error("manifest.books 必须是数组。");
  const sourceDir = path.resolve(
    options.sourceDir || process.env.GATSBY_BOOK_SOURCE_DIR || manifest.sourceDir,
  );
  const ids = new Set();
  const files = new Set();
  for (const metadata of manifest.books) {
    if (ids.has(metadata.id)) throw new Error(`manifest 中存在重复 ID：${metadata.id}`);
    if (files.has(metadata.file)) throw new Error(`manifest 中存在重复文件：${metadata.file}`);
    ids.add(metadata.id);
    files.add(metadata.file);
  }
  if (!fs.existsSync(sourceDir))
    throw new Error(`词书源目录不存在：${sourceDir}\n请使用 --source-dir 指定目录。`);

  let discovered = [];
  if (options.discover) {
    discovered = fs.readdirSync(sourceDir)
      .filter((file) => file.toLowerCase().endsWith(".csv") && !files.has(file))
      .map((file) => inferBook(file));
    if (discovered.length) {
      manifest.books.push(...discovered);
      if (options.check) throw new Error(`发现未登记词书：${discovered.map((book) => book.file).join(", ")}。请使用 --apply 写入 manifest。`);
    }
  }

  const sourceBooks = manifest.books.map((metadata) => {
    const bookSourceDir = metadata.sourceDir
      ? path.resolve(metadata.sourceDir)
      : sourceDir;
    const file = path.resolve(bookSourceDir, metadata.file);
    if (!fs.existsSync(file)) throw new Error(`找不到词书源文件：${file}`);
    const { file: _file, sourceDir: _sourceDir, ...bookMetadata } = metadata;
    const book = { ...bookMetadata, units: readSource(file, metadata) };
    validateBook(book, file);
    return book;
  });
  const seed = readJson(seedFile);
  if (!Array.isArray(seed)) throw new Error("seed.json 必须是数组。");
  const seedIds = new Set();
  for (const book of seed) {
    if (seedIds.has(book.id)) throw new Error(`seed.json 存在重复词书 ID：${book.id}`);
    seedIds.add(book.id);
  }
  let seedChanged = false;
  for (const book of sourceBooks) {
    const current = seed.find((item) => item.id === book.id);
    if (current && current.units.length !== book.units.length)
      console.log(`提示：${book.title} 源文件 ${book.units.length} 个单元，当前种子 ${current.units.length} 个单元。`);
    if (!current) console.log(`待加入：${book.title}（${book.units.length} 个单元）`);
    if (options.check && !current) throw new Error(`seed.json 缺少 manifest 词书：${book.id}`);
    if (options.apply && !current) {
      seed.push(book);
      seedChanged = true;
    } else if (options.apply && current && options.replace) {
      Object.assign(current, book);
      seedChanged = true;
    }
  }
  if (discovered.length) {
    writeManifest(manifestFile, manifest);
    console.log(`已登记 ${discovered.length} 本新词书到 ${manifestFile}`);
  }
  if (options.apply) {
    if (seedChanged)
      fs.writeFileSync(seedFile, `${JSON.stringify(seed, null, 2)}\n`, "utf8");
    console.log(`已同步 ${sourceBooks.length} 本登记词书；种子总数 ${seed.length} 本。`);
  } else {
    console.log(`检查通过：${sourceBooks.length} 本登记词书，种子总数 ${seed.length} 本。`);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
