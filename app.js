const LIB_KEY = "english-study-library-v1";
const LOG_KEY = "english-study-logs-v1";
const SCHEDULE_KEY = "english-study-schedule-v1";
const MODE_KEY = "english-study-practice-mode-v1";
const ROUND_KEY = "english-study-round-v1";
const ROUNDS_KEY = "english-study-rounds-v1";
const ROUND_SIZE_KEY = "english-study-round-size-v1";

const seed = [
  {
    "id": "reading",
    "title": "Reading Practice",
    "type": "文章",
    "author": "Gatsby · 原创示例",
    "level": "入门",
    "progress": 0,
    "description": "用原创短句练习阅读，在语境中理解表达。",
    "units": [
      {
        "kind": "词汇",
        "prompt": "notice",
        "answer": "注意到",
        "context": "I noticed a small library near the station.",
        "note": "notice 后可直接接名词。"
      },
      {
        "kind": "词汇",
        "prompt": "quiet",
        "answer": "安静的",
        "context": "The reading room is quiet in the morning.",
        "note": ""
      },
      {
        "kind": "词汇",
        "prompt": "chapter",
        "answer": "章节",
        "context": "We read one chapter before breakfast.",
        "note": ""
      },
      {
        "kind": "词汇",
        "prompt": "curious",
        "answer": "好奇的",
        "context": "The new student is curious about every story.",
        "note": "be curious about = 对……好奇。"
      }
    ]
  },
  {
    "id": "conversation",
    "title": "Everyday Conversation",
    "type": "影视台词",
    "author": "Gatsby · 原创示例",
    "level": "入门",
    "progress": 0,
    "description": "原创日常对话示例，不摘录影视字幕。",
    "units": [
      {
        "kind": "句子",
        "prompt": "Could you repeat that?",
        "answer": "你能再说一遍吗？",
        "context": "Could you repeat that? I missed the street name.",
        "note": "Could you ...? 是礼貌请求。"
      },
      {
        "kind": "句子",
        "prompt": "That sounds good.",
        "answer": "听起来不错。",
        "context": "A walk after lunch? That sounds good.",
        "note": "sound + 形容词表示听起来如何。"
      },
      {
        "kind": "句子",
        "prompt": "Let me check.",
        "answer": "让我确认一下。",
        "context": "Let me check the timetable before we leave.",
        "note": "let + 宾语 + 动词原形。"
      }
    ]
  },
  {
    "id": "core",
    "title": "Core Vocabulary",
    "type": "单词书",
    "author": "Gatsby · 原创示例",
    "level": "入门",
    "progress": 0,
    "description": "常用单词与原创例句，适合尝试翻卡和拼写。",
    "units": [
      {
        "kind": "词汇",
        "prompt": "accurate",
        "answer": "准确的",
        "context": "An accurate map helps us find the new library.",
        "note": ""
      },
      {
        "kind": "词汇",
        "prompt": "context",
        "answer": "上下文；语境",
        "context": "Read the whole paragraph to understand the context.",
        "note": ""
      },
      {
        "kind": "词汇",
        "prompt": "hesitate",
        "answer": "犹豫；迟疑",
        "context": "Please do not hesitate to ask a question.",
        "note": "hesitate to do = 犹豫做某事。"
      },
      {
        "kind": "词汇",
        "prompt": "retain",
        "answer": "保留；记住",
        "context": "Short reviews help me retain useful expressions.",
        "note": ""
      }
    ]
  },
  {
    "id": "phrases",
    "title": "Phrases in Practice",
    "type": "单词书",
    "author": "Gatsby · 原创示例",
    "level": "入门",
    "progress": 0,
    "description": "从原创生活场景中练习固定搭配。",
    "units": [
      {
        "kind": "短语",
        "prompt": "look forward to",
        "answer": "期待",
        "context": "I look forward to visiting your new studio.",
        "note": "to 是介词，后接名词或动名词。"
      },
      {
        "kind": "短语",
        "prompt": "take a break",
        "answer": "休息一下",
        "context": "Let us take a break after this exercise.",
        "note": ""
      },
      {
        "kind": "短语",
        "prompt": "make progress",
        "answer": "取得进步",
        "context": "Regular practice helps us make progress.",
        "note": "progress 在此为不可数名词。"
      },
      {
        "kind": "短语",
        "prompt": "keep in mind",
        "answer": "记住；牢记",
        "context": "Keep the opening hours in mind when planning your visit.",
        "note": ""
      }
    ]
  }
];
const state = {
  items: load("library", seed),
  logs: load("logs", []),
  schedule: loadObject(SCHEDULE_KEY, {}),
  view:"home",
  filter:"全部",
  query:"",
  practiceMode:["spelling","cloze"].indexOf(localStorage.getItem(MODE_KEY))>=0 ? localStorage.getItem(MODE_KEY) : "cards",
  session:null,
  round:loadObject(ROUND_KEY, null),
  rounds:loadArray(ROUNDS_KEY, []),
  roundSize:loadRoundSize(),
  roundStartItemId:null
};

const pronunciationCache = new Map();
const pronunciationFetches = new Map();

function validRound(round) {
  return Boolean(round && Array.isArray(round.cards) && round.cards.length && Array.isArray(round.cardQueue) && round.cardQueue.length && ["cards","gate","spelling","complete"].indexOf(round.stage)>=0);
}
if (!validRound(state.round)) state.round=null;

function load(kind, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(kind==="library"?LIB_KEY:LOG_KEY));
    return Array.isArray(value) && value.length ? value : fallback;
  } catch (error) { return fallback; }
}
function loadObject(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
  } catch (error) { return fallback; }
}
function loadArray(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : fallback;
  } catch (error) { return fallback; }
}
function loadRoundSize() {
  const value=Number.parseInt(localStorage.getItem(ROUND_SIZE_KEY),10);
  return [5,10,15,20].indexOf(value)>=0 ? value : 10;
}
function persist() {
  localStorage.setItem(LIB_KEY, JSON.stringify(state.items));
  localStorage.setItem(LOG_KEY, JSON.stringify(state.logs));
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(state.schedule));
  localStorage.setItem(MODE_KEY, state.practiceMode);
  localStorage.setItem(ROUND_KEY, state.round ? JSON.stringify(state.round) : "null");
  localStorage.setItem(ROUNDS_KEY, JSON.stringify(state.rounds));
  localStorage.setItem(ROUND_SIZE_KEY, String(state.roundSize));
}
function escapeHtml(value) {
  return String(value === undefined || value === null ? "" : value).replace(/[&<>"']/g, function(char) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char];
  });
}
function units() {
  return state.items.reduce(function(all, item) {
    return all.concat(item.units.map(function(unit, index) {
      return Object.assign({}, unit, {itemId:item.id,itemTitle:item.title,unitIndex:index});
    }));
  }, []);
}
function cardKey(unit) { return unit.itemId + "::" + unit.prompt; }
function cardSchedule(unit) {
  return state.schedule[cardKey(unit)] || {dueAt:0,interval:0,ease:2.5,reviews:0,lapses:0};
}
function dueUnits() {
  const now = Date.now();
  return units().filter(function(unit){ return cardSchedule(unit).dueAt <= now; });
}
function dueCount() { return dueUnits().length; }
function formatInterval(minutes) {
  if (minutes < 60) return Math.max(1, Math.round(minutes)) + " 分钟";
  if (minutes < 1440) return Math.round(minutes / 60) + " 小时";
  return Math.round(minutes / 1440) + " 天";
}
function formatDue(unit) {
  const dueAt = cardSchedule(unit).dueAt;
  if (!dueAt || dueAt <= Date.now()) return "现在复习";
  const minutes = Math.ceil((dueAt - Date.now()) / 60000);
  return "下次复习 · " + formatInterval(minutes);
}
function scheduleCard(unit, rating) {
  const key = cardKey(unit);
  const current = cardSchedule(unit);
  let interval;
  if (rating === "again") interval = 10;
  else if (rating === "hard") interval = current.interval ? Math.max(60, Math.round(current.interval * 1.4)) : 720;
  else interval = current.interval ? Math.max(1440, Math.round(current.interval * current.ease)) : 1440;
  const next = {
    dueAt: Date.now() + interval * 60000,
    interval: interval,
    ease: rating === "hard" ? Math.max(1.8, current.ease - .15) : rating === "know" ? Math.min(3.2, current.ease + .05) : current.ease,
    reviews: current.reviews + 1,
    lapses: current.lapses + (rating === "again" ? 1 : 0),
    lastRating: rating,
    lastReviewedAt: Date.now()
  };
  state.schedule[key] = next;
  return next;
}
function startOfDay(value) {
  const date=value instanceof Date ? new Date(value.getTime()) : new Date(value);
  date.setHours(0,0,0,0);
  return date;
}
function dayKey(value) {
  const date=startOfDay(value);
  return date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0");
}
function isMastered(unit) {
  const current=cardSchedule(unit);
  return current.reviews>0 && current.lastRating==="know" && current.interval>=1440;
}
function itemProgress(item) {
  if (!item || !item.units || !item.units.length) return 0;
  const mastered=item.units.filter(function(unit){return isMastered(Object.assign({},unit,{itemId:item.id}));}).length;
  return Math.round(mastered/item.units.length*100);
}
function recentDays() {
  const today=startOfDay(new Date());
  const logsByDay={};
  state.logs.forEach(function(log){
    const timestamp=new Date(log.at).getTime();
    if (!Number.isNaN(timestamp)) {
      const key=dayKey(timestamp);
      logsByDay[key]=(logsByDay[key] || 0)+1;
    }
  });
  const labels=["日","一","二","三","四","五","六"];
  return Array.from({length:7},function(_,offset){
    const date=new Date(today);
    date.setDate(today.getDate()-6+offset);
    return {key:dayKey(date),label:labels[date.getDay()],count:logsByDay[dayKey(date)] || 0};
  });
}
function currentStreak() {
  const days=new Set(state.logs.map(function(log){return dayKey(log.at);}));
  let cursor=startOfDay(new Date());
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate()-1);
    if (!days.has(dayKey(cursor))) return 0;
  }
  let streak=0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate()-1);
  }
  return streak;
}
function learningStats() {
  const weekStart=startOfDay(new Date());
  weekStart.setDate(weekStart.getDate()-6);
  const totalReviews=state.logs.length;
  const rememberedReviews=state.logs.filter(function(log){return log.rating==="know";}).length;
  const weekReviews=state.logs.filter(function(log){
    const timestamp=new Date(log.at).getTime();
    return !Number.isNaN(timestamp) && timestamp>=weekStart.getTime();
  }).length;
  return {
    totalReviews:totalReviews,
    rememberedReviews:rememberedReviews,
    masteredCards:units().filter(isMastered).length,
    dueCards:dueCount(),
    weekReviews:weekReviews,
    streak:currentStreak(),
    sourceCount:new Set(state.items.map(function(item){return item.type;})).size,
    completedRounds:state.rounds.length
  };
}
function notify(message) {
  const root = document.getElementById("toast-root");
  root.innerHTML = '<div class="toast">'+escapeHtml(message)+"</div>";
  window.setTimeout(function(){ root.innerHTML=""; }, 2300);
}
function speak(text) {
  if (!("speechSynthesis" in window)) { notify("当前浏览器不支持语音播放"); return; }
  window.speechSynthesis.cancel();
  const voice = new SpeechSynthesisUtterance(text);
  voice.lang = "en-US";
  voice.rate = .9;
  voice.pitch = 1;
  // Queueing on the next task avoids Chrome occasionally delaying a freshly cancelled utterance.
  window.setTimeout(function(){ window.speechSynthesis.speak(voice); }, 0);
}
function playCachedAudio(url, fallback) {
  const player = new Audio(url);
  player.preload = "auto";
  player.onerror = function(){ speak(fallback); };
  const attempt = player.play();
  if (attempt && typeof attempt.catch === "function") attempt.catch(function(){ speak(fallback); });
}
function warmPronunciation(text) {
  const word = text.trim().split(/\s+/)[0].replace(/[^A-Za-z'-]/g, "").toLowerCase();
  if (!word || pronunciationCache.has(word) || pronunciationFetches.has(word)) return;
  const request = fetch("https://api.dictionaryapi.dev/api/v2/entries/en/"+encodeURIComponent(word), {cache:"force-cache"})
    .then(function(response){ return response.ok ? response.json() : null; })
    .then(function(data){
      const item = data && data[0];
      const audio = item && item.phonetics && item.phonetics.find(function(entry){return entry.audio;});
      if (audio && audio.audio) pronunciationCache.set(word, audio.audio);
    })
    .catch(function(){})
    .finally(function(){ pronunciationFetches.delete(word); });
  pronunciationFetches.set(word, request);
}
function playWord(text) {
  const word = text.trim().split(/\s+/)[0].replace(/[^A-Za-z'-]/g, "").toLowerCase();
  // TTS is the immediate path. Online dictionary audio is only an enhancement for later clicks.
  if (word && pronunciationCache.has(word)) playCachedAudio(pronunciationCache.get(word), text);
  else speak(text);
  warmPronunciation(text);
}
function setView(view) {
  state.view=view;
  document.querySelectorAll(".nav-item").forEach(function(button){button.classList.toggle("active",button.dataset.view===view);});
  document.querySelectorAll(".view").forEach(function(panel){panel.classList.toggle("active-view",panel.id==="view-"+view);});
  document.getElementById("page-kicker").textContent = view==="home" ? "TODAY" : view.toUpperCase();
  render();
}
function head(kicker, title, copy, action) {
  return '<div class="page-head"><div><div class="kicker">'+kicker+'</div><h1>'+title+'</h1></div><div><p>'+copy+'</p>'+(action || "")+"</div></div>";
}
function render() {
  document.getElementById("due-count").textContent=dueCount();
  if (state.view==="home") renderHome();
  if (state.view==="library") renderLibrary();
  if (state.view==="review") renderReview();
  if (state.view==="stats") renderStats();
}
function renderHome() {
  const metrics=learningStats();
  const featured=state.items[0];
  if (!featured) {
    document.getElementById("view-home").innerHTML=head("TODAY","先放入一份 <em>学习内容</em>。","内容库还是空的，导入单词、歌词、字幕或文章后就可以开始学习。",'<button class="primary-btn" data-view-link="library">打开内容库</button>')+'<div class="empty">还没有学习内容。</div>';
    bind();
    return;
  }
  const featuredProgress=itemProgress(featured);
  const streakText=metrics.streak ? "已连续学习 "+metrics.streak+" 天" : "从今天开始第一天";
  document.getElementById("view-home").innerHTML =
    head("WEDNESDAY · 26 AUG 2026","今天，学一点 <em>真正用得上</em> 的英语。","把内容拆成小块，先理解，再回忆，最后让它在几天后重新出现。","")+
    '<div class="hero-grid"><section class="hero-card"><div><div class="eyebrow" style="color:var(--yellow)">CONTINUE WHERE YOU LEFT OFF</div><h2>'+escapeHtml(featured.title)+'</h2><div class="hero-meta">'+escapeHtml(featured.author)+" · "+featured.units.length+' 个学习单元</div></div><div class="hero-controls"><button class="play-btn" data-speak="'+escapeHtml(featured.units[0].context)+'" title="播放句子">▶</button><div class="hero-progress"><i style="width:'+featuredProgress+'%"></i></div><button class="quiet-btn" style="color:var(--paper);border-color:rgba(255,255,255,.25)" data-start="'+featured.id+'">继续学习</button></div></section><section class="side-card"><div><div class="kicker">TODAY\'S REVIEW</div><h3>复习不是回头，<br>是让记忆留下来。</h3></div><div><div class="stat-big">'+metrics.dueCards+' <small>张卡片待复习</small></div><div class="streak"><span class="fire">◒</span> '+streakText+'</div></div></section></div>'+
    '<div class="metrics"><div class="metric"><div class="metric-label">已掌握卡片</div><div class="metric-value">'+metrics.masteredCards+'</div></div><div class="metric"><div class="metric-label">学习内容</div><div class="metric-value">'+state.items.length+'</div></div><div class="metric"><div class="metric-label">本周复习</div><div class="metric-value">'+metrics.weekReviews+' <small>次</small></div></div><div class="metric"><div class="metric-label">学习来源</div><div class="metric-value">'+metrics.sourceCount+' <small>类</small></div></div></div>'+
    '<div class="section-row"><h2>接下来学什么</h2><a data-view-link="library">查看全部内容 →</a></div><div class="content-list">'+state.items.slice(0,4).map(function(item,index){return '<div class="content-row"><div class="content-index">0'+(index+1)+'</div><div><div class="content-title">'+escapeHtml(item.title)+'</div><div class="content-sub">'+escapeHtml(item.author)+" · "+item.units.length+' 个单元</div></div><span class="content-tag">'+escapeHtml(item.type)+'</span><div class="progress-mini"><i style="width:'+itemProgress(item)+'%"></i></div><span class="row-arrow" data-start="'+item.id+'">→</span></div>';}).join("")+"</div>";
  bind();
}
function renderLibrary() {
  const types=["全部","歌曲笔记","单词书","影视台词","文章"];
  const visible=state.items.filter(function(item){
    return (state.filter==="全部" || item.type===state.filter) && (!state.query || [item.title,item.author,item.description].join(" ").toLowerCase().indexOf(state.query.toLowerCase())>=0);
  });
  document.getElementById("view-library").innerHTML =
    head("CONTENT LIBRARY","你的英语内容，<em>不止一种来源</em>。","歌曲、单词书、影视台词和自定义文本都可以进入同一套学习与复习节奏.",'<button class="primary-btn" id="open-import">＋ 导入内容</button>')+
    '<div class="library-tools"><input class="search-field" id="library-search" placeholder="搜索标题、来源或主题" value="'+escapeHtml(state.query)+'">'+types.map(function(type){return '<button class="filter-btn '+(state.filter===type?"active":"")+'" data-filter="'+type+'">'+type+"</button>";}).join("")+"</div>"+
    (visible.length ? '<div class="library-grid">'+visible.map(function(item){return '<article class="library-card"><div class="card-type">'+escapeHtml(item.type).toUpperCase()+'</div><h3>'+escapeHtml(item.title)+'</h3><p>'+escapeHtml(item.author)+'</p><p style="margin-top:10px;line-height:1.45">'+escapeHtml(item.description)+'</p><div class="card-footer"><div class="progress-line"><i style="width:'+itemProgress(item)+'%"></i></div><div class="card-actions"><button class="card-open" data-start="'+item.id+'">打开内容 →</button><button class="card-icon" data-edit="'+item.id+'" title="编辑内容" aria-label="编辑内容">✎</button><button class="card-icon" data-reset="'+item.id+'" title="重置学习进度" aria-label="重置学习进度">↺</button><button class="card-icon card-icon-danger" data-delete="'+item.id+'" title="删除内容" aria-label="删除内容">×</button></div></div></article>';}).join("")+"</div>" : '<div class="empty">没有找到匹配内容。试试导入一份 Markdown 或单词表。</div>');
  bind();
  const search=document.getElementById("library-search");
  if (search) search.addEventListener("input",function(event){state.query=event.target.value;renderLibrary();});
  const importer=document.getElementById("open-import");
  if (importer) importer.addEventListener("click",openImport);
}
function serializeEditableUnit(unit) {
  return [unit.prompt,unit.answer,unit.context,unit.note].map(function(value){return String(value || "").replace(/\r?\n/g," ").replace(/\|/g,"／");}).join(" | ");
}
function parseEditableUnits(raw, type) {
  const parsed=[];
  raw.replace(/\r/g,"").split("\n").map(function(line){return line.trim();}).filter(Boolean).forEach(function(line){
    const pieces=line.split("|").map(function(piece){return piece.trim();});
    const prompt=pieces.shift();
    if (!prompt) return;
    const answer=pieces.shift() || "待补充释义";
    const context=pieces.shift() || "来自编辑内容："+prompt;
    const note=pieces.join(" | ") || "编辑后可以在复习中继续补充自己的例句和理解。";
    parsed.push({kind:type==="歌曲笔记"?"短语":type==="影视台词"?"句子":"词汇",prompt:prompt,answer:answer,context:context,note:note});
  });
  return parsed;
}
function openEdit(itemId) {
  const item=state.items.find(function(entry){return entry.id===itemId;});
  if (!item) return;
  const types=["歌曲笔记","单词书","影视台词","文章"];
  const options=types.map(function(type){return '<option '+(item.type===type?"selected":"")+'>'+type+"</option>";}).join("");
  const unitText=item.units.map(serializeEditableUnit).join("\n");
  document.getElementById("modal-root").innerHTML='<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>编辑学习内容</h2><button class="close-btn" id="close-modal">×</button></div><div class="form-grid"><label>标题<input id="edit-title" value="'+escapeHtml(item.title)+'"></label><label>内容类型<select id="edit-type">'+options+'</select></label><label>来源<input id="edit-author" value="'+escapeHtml(item.author)+'"></label><label>简介<textarea id="edit-description" class="compact-textarea">'+escapeHtml(item.description)+'</textarea></label><label>学习单元<textarea id="edit-units" placeholder="英文 | 中文释义 | 例句 | 笔记">'+escapeHtml(unitText)+'</textarea><span class="form-help">每行一个学习单元，使用竖线分隔英文、释义、例句和笔记。</span></label></div><div class="modal-actions"><button class="quiet-btn" id="cancel-edit">取消</button><button class="primary-btn" id="confirm-edit">保存修改</button></div></div></div>';
  document.getElementById("close-modal").onclick=closeModal;
  document.getElementById("cancel-edit").onclick=closeModal;
  document.getElementById("confirm-edit").onclick=function(){saveEditedItem(itemId);};
}
function saveEditedItem(itemId) {
  const item=state.items.find(function(entry){return entry.id===itemId;});
  if (!item) return;
  const title=document.getElementById("edit-title").value.trim();
  const type=document.getElementById("edit-type").value;
  const author=document.getElementById("edit-author").value.trim() || "本地内容";
  const description=document.getElementById("edit-description").value.trim();
  const parsed=parseEditableUnits(document.getElementById("edit-units").value,type);
  if (!title || !parsed.length) { notify("标题和学习单元不能为空"); return; }
  const prefix=item.id+"::";
  const prompts=new Set(parsed.map(function(unit){return unit.prompt;}));
  Object.keys(state.schedule).forEach(function(key){if (key.indexOf(prefix)===0 && !prompts.has(key.slice(prefix.length))) delete state.schedule[key];});
  item.title=title;
  item.type=type;
  item.author=author;
  item.description=description || "个人编辑的学习内容。";
  item.units=parsed.slice(0,120);
  item.progress=itemProgress(item);
  if (state.session && state.session.itemId===itemId) state.session=null;
  clearRoundIfUsesItem(itemId);
  persist(); closeModal(); renderLibrary(); notify("学习内容已更新");
}
function itemSchedulePrefix(itemId) { return itemId+"::"; }
function clearRoundIfUsesItem(itemId) {
  if (!state.round) return;
  const matches=state.round.itemId===itemId || (state.round.cards || []).some(function(unit){return unit.itemId===itemId;});
  if (matches) state.round=null;
}
function deleteItem(itemId) {
  const item=state.items.find(function(entry){return entry.id===itemId;});
  if (!item || !window.confirm("确定删除“"+item.title+"”？删除后学习记录也会移除。")) return;
  const prefix=itemSchedulePrefix(itemId);
  state.items=state.items.filter(function(entry){return entry.id!==itemId;});
  state.logs=state.logs.filter(function(log){return log.itemId!==itemId;});
  Object.keys(state.schedule).forEach(function(key){if (key.indexOf(prefix)===0) delete state.schedule[key];});
  if (state.session && state.session.itemId===itemId) state.session=null;
  clearRoundIfUsesItem(itemId);
  persist(); render(); notify("学习内容已删除");
}
function resetItemProgress(itemId) {
  const item=state.items.find(function(entry){return entry.id===itemId;});
  if (!item || !window.confirm("确定重置“"+item.title+"”的学习进度？")) return;
  const prefix=itemSchedulePrefix(itemId);
  state.logs=state.logs.filter(function(log){return log.itemId!==itemId;});
  Object.keys(state.schedule).forEach(function(key){if (key.indexOf(prefix)===0) delete state.schedule[key];});
  item.progress=0;
  if (state.session && state.session.itemId===itemId) state.session=null;
  clearRoundIfUsesItem(itemId);
  persist(); render(); notify("学习进度已重置");
}
function reviewActionMarkup(session) {
  if (session.feedback === "forgot") return '<div class="review-buttons"><button data-next>下一个</button></div>';
  return '<div class="review-buttons"><button data-next>下一个</button><button data-repeat>再来一次</button></div>';
}
function escapeRegExp(value) {
  return String(value).replace(/[-\/\\^$*+?.()|[\]{}]/g,"\\$&");
}
function maskPrompt(context, prompt) {
  if (!context || !prompt) return context || "";
  try { return String(context).replace(new RegExp(escapeRegExp(prompt),"ig"),"______"); }
  catch (error) { return String(context); }
}
function normalizeAnswer(value) {
  return String(value || "").toLowerCase().replace(/[’‘']/g,"").replace(/[-–—]/g," ").replace(/[.!?,;:]+$/g,"").replace(/\s+/g," ").trim();
}
function roundSourceUnits(sourceId) {
  if (sourceId && sourceId!=="all") {
    const item=state.items.find(function(entry){return entry.id===sourceId;});
    if (item) return item.units.map(function(unit,index){return Object.assign({},unit,{itemId:item.id,itemTitle:item.title,unitIndex:index});});
  }
  return units();
}
function selectRoundCards(sourceId, size) {
  const source=roundSourceUnits(sourceId).slice();
  const now=Date.now();
  const due=source.filter(function(unit){return cardSchedule(unit).dueAt<=now;});
  const later=source.filter(function(unit){return cardSchedule(unit).dueAt>now;}).sort(function(a,b){return cardSchedule(a).dueAt-cardSchedule(b).dueAt;});
  return due.concat(later).slice(0,Math.max(1,size));
}
function roundCardKey(unit) { return cardKey(unit); }
function roundCurrentCard(round) { return round && round.cardQueue ? round.cardQueue[round.cardIndex] : null; }
function roundCurrentSpellingCard(round) { return round && round.spellingQueue ? round.spellingQueue[round.spellingIndex] : null; }
function ensureSpellingQueue(round) {
  if (!round || !Array.isArray(round.cards) || !round.cards.length) return;
  if (!Array.isArray(round.spellingQueue) || !round.spellingQueue.length) {
    round.spellingQueue=round.cards.slice();
    round.spellingIndex=Math.max(0,Math.min(Number(round.spellingIndex) || 0,round.spellingQueue.length-1));
  }
}
function roundLabel(round) {
  if (!round) return "";
  if (round.stage==="cards") return "翻卡 " + Math.min(round.cardIndex+1,round.cardQueue.length) + " / " + round.cardQueue.length;
  if (round.stage==="gate") return "翻卡已完成";
  if (round.stage==="spelling") return "拼写 " + Math.min(round.spellingIndex+1,round.spellingQueue.length) + " / " + round.spellingQueue.length;
  return "本轮已完成";
}
function roundQueueMarkup(round) {
  let queue=[];
  if (round.stage==="cards") queue=round.cardQueue.slice(round.cardIndex+1);
  if (round.stage==="spelling") queue=round.spellingQueue.slice(round.spellingIndex+1);
  return queue.slice(0,5).map(function(unit,index){return '<div class="queue-item"><div class="queue-bar"></div><div><strong>'+escapeHtml(unit.prompt)+'</strong><span>'+escapeHtml(unit.kind)+" · "+escapeHtml(unit.itemTitle)+(index===0 ? " · 下一张" : "")+'</span></div></div>';}).join("");
}
function roundProgressMarkup(round) {
  const total=round.stage==="cards" ? round.cardQueue.length : round.stage==="spelling" ? round.spellingQueue.length : round.cards.length;
  const done=round.stage==="spelling" ? round.spellingIndex : round.stage==="gate" || round.stage==="complete" ? total : Math.min(round.cardIndex,total);
  return '<div class="round-progress"><div class="round-progress-top"><span>第 '+escapeHtml(round.id.replace(/^round-/,""))+' 轮</span><strong>'+escapeHtml(roundLabel(round))+'</strong></div><div class="round-progress-track"><i style="width:'+Math.round(done/total*100)+'%"></i></div></div>';
}
function createRound(sourceId, size) {
  const cards=selectRoundCards(sourceId,size);
  if (!cards.length) { notify("当前没有可学习的内容"); return false; }
  const sourceTitle=sourceId && sourceId!=="all" ? ((state.items.find(function(item){return item.id===sourceId;}) || {}).title || "指定内容") : "全部内容";
  state.round={
    id:"round-"+Date.now(), itemId:sourceId && sourceId!=="all" ? sourceId : null, sourceTitle:sourceTitle,
    requestedSize:Number(size), cards:cards, cardQueue:cards.slice(), cardIndex:0, cardPhase:"prompt", cardFeedback:null,
    cardRepeats:{}, stage:"cards", spellingIndex:0, spellingPhase:"prompt", typedAnswer:"", typingCorrect:null,
    spellingQueue:cards.slice(), spellingAttempts:{}, spellingWrong:0, startedAt:new Date().toISOString(), completedAt:null
  };
  state.session=null;
  state.roundStartItemId=null;
  persist();
  return true;
}
function startRound(sourceId, size) {
  if (validRound(state.round)) { setView("review"); notify("当前已有进行中的学习轮次"); return; }
  const selectedSize=[5,10,15,20].indexOf(Number(size))>=0 ? Number(size) : state.roundSize;
  state.roundSize=selectedSize;
  if (!createRound(sourceId || "all", selectedSize)) return;
  setView("review");
  notify("已开始本轮学习");
}
function completeRound(reason) {
  const round=state.round;
  if (!round || round.completedAt) return;
  round.stage="complete";
  round.completedAt=new Date().toISOString();
  state.rounds.unshift({id:round.id,sourceTitle:round.sourceTitle,requestedSize:round.requestedSize,cardCount:round.cards.length,spellingCompleted:reason!=="skip",spellingWrong:round.spellingWrong || 0,startedAt:round.startedAt,completedAt:round.completedAt});
  state.rounds=state.rounds.slice(0,100);
  state.round=null;
  persist();
  renderReview();
  notify(reason==="skip" ? "本轮已结束，记录已保存" : "本轮学习完成，记录已保存");
}
function renderRoundStart() {
  const selected=state.roundStartItemId && state.items.some(function(item){return item.id===state.roundStartItemId;}) ? state.roundStartItemId : "all";
  const options='<option value="all" '+(selected==="all"?"selected":"")+'>全部内容（按到期优先）</option>'+state.items.map(function(item){return '<option value="'+escapeHtml(item.id)+'" '+(selected===item.id?"selected":"")+'>'+escapeHtml(item.title)+' · '+item.units.length+' 个单元</option>';}).join("");
  const sizes=[5,10,15,20].map(function(size){return '<option value="'+size+'" '+(state.roundSize===size?"selected":"")+'>'+size+' 个</option>';}).join("");
  document.getElementById("view-review").innerHTML=head("LEARNING ROUND","开始一轮，<em>专注一小组</em>。","每轮先翻卡复习固定数量的单词、词组或句子，再决定是否进行拼写巩固。关闭窗口后，当前轮次会从原位置继续。","")+ '<section class="round-start-panel"><div class="round-start-copy"><div class="kicker">ONE ROUND · ONE FOCUS</div><h2>把今天的内容分成一小步</h2><p>到期卡片会优先进入本轮，不足数量时再补充其他内容。</p></div><div class="round-start-form"><label>学习来源<select id="round-source">'+options+'</select></label><label>本轮数量<select id="round-size">'+sizes+'</select></label><button class="primary-btn" data-start-round>开始这一轮</button><button class="quiet-btn" data-free-start>进入自由练习</button></div></section>'+
    (state.rounds.length ? '<section class="round-history-preview"><div class="section-row"><h2>最近完成的轮次</h2><span>'+state.rounds.length+' 轮已记录</span></div>'+state.rounds.slice(0,3).map(function(round){return '<div class="round-history-row"><strong>'+escapeHtml(round.sourceTitle)+'</strong><span>'+round.cardCount+' 个单元 · '+(round.spellingCompleted?"完成拼写":"跳过拼写")+' · '+new Date(round.completedAt).toLocaleDateString()+'</span></div>';}).join("")+'</section>' : '');
  bind();
  const source=document.getElementById("round-source");
  const size=document.getElementById("round-size");
  if (source) source.addEventListener("change",function(){state.roundStartItemId=source.value==="all"?null:source.value;});
  if (size) size.addEventListener("change",function(){state.roundSize=Number(size.value);persist();});
  document.querySelectorAll("[data-start-round]").forEach(function(button){button.addEventListener("click",function(){startRound(source ? source.value : "all",size ? Number(size.value) : state.roundSize);});});
  document.querySelectorAll("[data-free-start]").forEach(function(button){button.addEventListener("click",function(){startFreeSession(source && source.value!=="all" ? source.value : null);});});
}
function renderRoundCard(round) {
  const current=roundCurrentCard(round);
  if (!current) return "";
  const answerVisible=round.cardPhase==="answer";
  const actions=answerVisible ? (round.cardFeedback==="forgot" ? '<div class="review-buttons"><button data-round-next>下一个</button></div>' : '<div class="review-buttons"><button data-round-next>下一个</button><button data-round-repeat>再来一次</button></div>') : '<div class="review-buttons"><button data-round-feedback="forgot">不记得</button><button data-round-feedback="remembered">记得</button></div>';
  return '<section class="review-card"><div class="review-kind">翻卡复习 · '+escapeHtml(current.kind)+' · '+escapeHtml(current.itemTitle)+'</div><div class="review-prompt">'+escapeHtml(current.prompt)+' <button class="icon-button" style="display:inline-grid;background:transparent;border-color:rgba(255,255,255,.25);color:var(--yellow);vertical-align:middle" data-word-sound="'+escapeHtml(current.prompt)+'" title="播放发音">♪</button></div><div class="review-context">'+escapeHtml(current.context)+'</div>'+(answerVisible?'<div class="answer">'+escapeHtml(current.answer)+'</div><div class="review-context" style="margin-top:8px">'+escapeHtml(current.note)+'</div>':"")+actions+'</section>';
}
function renderRoundGate(round) {
  return '<section class="round-gate"><div class="kicker">FLASHCARDS COMPLETE</div><h2>翻卡复习完成</h2><p>这一轮的 '+round.cards.length+' 个学习单元已经看过。现在可以把刚才的内容再写一遍，巩固拼写和回忆。</p><div class="round-gate-stats"><span><strong>'+round.cards.length+'</strong> 个单元</span><span><strong>'+Object.keys(round.cardRepeats || {}).length+'</strong> 个稍后重现</span></div><div class="review-buttons"><button class="primary-btn" data-enter-spelling>进入拼写练习</button><button class="quiet-btn" data-finish-round>结束本轮</button></div></section>';
}
function renderRoundSpelling(round) {
  ensureSpellingQueue(round);
  const current=roundCurrentSpellingCard(round);
  if (!current) return "";
  const answerVisible=round.spellingPhase==="answer";
  const header='<div class="review-kind">本轮拼写 · '+escapeHtml(current.kind)+' · '+escapeHtml(current.itemTitle)+'</div>';
  if (!answerVisible) return '<section class="review-card spelling-card">'+header+'<div class="spelling-instruction">根据中文释义写出刚才复习过的英文</div><div class="spelling-hint-row"><div class="spelling-hint">'+escapeHtml(current.answer)+'</div><button class="icon-button spelling-sound" data-word-sound="'+escapeHtml(current.prompt)+'" title="播放参考发音">♪</button></div><div class="review-context spelling-context">'+escapeHtml(maskPrompt(current.context,current.prompt))+'</div><div class="spelling-entry"><input id="round-practice-input" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="输入英文答案"><button class="primary-btn" data-round-check>检查答案</button></div></section>';
  const correct=round.typingCorrect===true;
  return '<section class="review-card spelling-card">'+header+'<div class="spelling-result '+(correct?"typing-correct":"typing-incorrect")+'">'+(correct?"拼写正确":"先记住答案，稍后再来")+'</div><div class="typed-answer">你的答案：'+escapeHtml(round.typedAnswer || "未填写")+'</div><div class="answer">答案：'+escapeHtml(current.prompt)+' <button class="icon-button spelling-sound" data-word-sound="'+escapeHtml(current.prompt)+'" title="播放发音">♪</button></div><div class="review-context">'+escapeHtml(current.answer)+'</div><div class="review-context" style="margin-top:8px">'+escapeHtml(current.note)+'</div><div class="review-buttons"><button data-round-spelling-next>'+ (correct ? '下一个' : '继续下一张') +'</button></div></section>';
}
function renderActiveRound() {
  const round=state.round;
  if (!validRound(round)) { state.round=null; persist(); renderRoundStart(); return; }
  if (round.stage==="spelling") ensureSpellingQueue(round);
  let body="";
  if (round.stage==="cards") body=renderRoundCard(round);
  if (round.stage==="gate") body=renderRoundGate(round);
  if (round.stage==="spelling") body=renderRoundSpelling(round);
  const queue=round.stage==="gate" ? [] : roundQueueMarkup(round);
  document.getElementById("view-review").innerHTML=head("LEARNING ROUND",escapeHtml(round.sourceTitle)+' · <em>'+escapeHtml(roundLabel(round))+'</em>',"本轮进度会自动保存。你可以随时关闭程序，之后从这里继续。",roundProgressMarkup(round))+'<div class="review-layout">'+body+'<aside class="queue"><div class="kicker">ROUND QUEUE</div><h3>本轮接下来</h3>'+(queue || '<div class="empty">这一阶段没有待处理内容。</div>')+'</aside></div>';
  bind();
  document.querySelectorAll("[data-round-feedback]").forEach(function(button){button.addEventListener("click",function(){recordRoundFeedback(button.dataset.roundFeedback);});});
  document.querySelectorAll("[data-round-next]").forEach(function(button){button.addEventListener("click",advanceRoundCard);});
  document.querySelectorAll("[data-round-repeat]").forEach(function(button){button.addEventListener("click",repeatRoundCard);});
  document.querySelectorAll("[data-enter-spelling]").forEach(function(button){button.addEventListener("click",enterRoundSpelling);});
  document.querySelectorAll("[data-finish-round]").forEach(function(button){button.addEventListener("click",function(){completeRound("skip");});});
  document.querySelectorAll("[data-round-check]").forEach(function(button){button.addEventListener("click",checkRoundSpelling);});
  document.querySelectorAll("[data-round-spelling-next]").forEach(function(button){button.addEventListener("click",advanceRoundSpelling);});
  if (round.stage==="spelling" && round.spellingPhase!=="answer") {
    const input=document.getElementById("round-practice-input");
    if (input) { input.addEventListener("keydown",function(event){if(event.key==="Enter")checkRoundSpelling();}); window.setTimeout(function(){input.focus();},0); }
  }
}
function renderReviewCard(current, session) {
  const answerVisible=Boolean(session && session.phase === "answer");
  const actions=answerVisible ? reviewActionMarkup(session) : '<div class="review-buttons"><button data-feedback="forgot">不记得</button><button data-feedback="remembered">记得</button></div>';
  return '<section class="review-card"><div class="review-kind">'+escapeHtml(current.kind)+" · "+escapeHtml(current.itemTitle)+' <span class="review-due">'+escapeHtml(formatDue(current))+'</span></div><div class="review-prompt">'+escapeHtml(current.prompt)+' <button class="icon-button" style="display:inline-grid;background:transparent;border-color:rgba(255,255,255,.25);color:var(--yellow);vertical-align:middle" data-word-sound="'+escapeHtml(current.prompt)+'" title="播放发音">♪</button></div><div class="review-context">'+escapeHtml(current.context)+"</div>"+
    (answerVisible ? '<div class="answer">'+escapeHtml(current.answer)+'</div><div class="review-context" style="margin-top:8px">'+escapeHtml(current.note)+"</div>" : "")+
    actions+'</section>';
}
function renderTypedReview(current, session, mode) {
  const answerVisible=Boolean(session && session.phase === "answer");
  const cloze=mode==="cloze";
  const header='<div class="review-kind">'+(cloze ? "语境填空" : "拼写练习")+" · "+escapeHtml(current.itemTitle)+' <span class="review-due">'+escapeHtml(formatDue(current))+'</span></div>';
  if (!answerVisible) return '<section class="review-card spelling-card">'+header+'<div class="spelling-instruction">'+(cloze ? "根据句子和中文释义补全目标表达" : "根据中文释义写出英文")+'</div><div class="spelling-hint-row"><div class="spelling-hint">'+escapeHtml(current.answer)+'</div><button class="icon-button spelling-sound" data-word-sound="'+escapeHtml(current.prompt)+'" title="播放参考发音">♪</button></div><div class="review-context spelling-context">'+escapeHtml(cloze ? maskPrompt(current.context,current.prompt) : current.context)+'</div><div class="spelling-entry"><input id="practice-input" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="'+(cloze ? "输入句子中的英文表达" : "输入英文答案")+'"><button class="primary-btn" data-check-practice>检查答案</button></div></section>';
  const correct=session.typingCorrect === true;
  const resultClass=correct ? "typing-correct" : "typing-incorrect";
  const resultText=correct ? (cloze ? "填空正确" : "拼写正确") : "这次不正确";
  return '<section class="review-card spelling-card">'+header+'<div class="spelling-result '+resultClass+'">'+resultText+'</div><div class="typed-answer">你的答案：'+escapeHtml(session.typedAnswer || "未填写")+'</div><div class="answer">答案：'+escapeHtml(current.prompt)+' <button class="icon-button spelling-sound" data-word-sound="'+escapeHtml(current.prompt)+'" title="播放发音">♪</button></div><div class="review-context">'+escapeHtml(current.answer)+'</div><div class="review-context" style="margin-top:8px">'+escapeHtml(current.note)+'</div>'+reviewActionMarkup(session)+'</section>';
}
function setPracticeMode(mode) {
  state.practiceMode=mode==="spelling" || mode==="cloze" ? mode : "cards";
  if (state.session) {
    state.session.phase="prompt";
    state.session.feedback=null;
    state.session.typedAnswer="";
    state.session.typingCorrect=null;
  }
  persist();
  renderReview();
  notify(state.practiceMode==="spelling" ? "已切换到拼写练习" : state.practiceMode==="cloze" ? "已切换到语境填空" : "已切换到翻卡复习");
}
function checkTypedAnswer(current) {
  const input=document.getElementById("practice-input");
  const value=input ? input.value.trim() : "";
  if (!value) { notify("先输入英文答案"); if (input) input.focus(); return; }
  const session=ensureReviewSession(current);
  session.typedAnswer=value;
  session.typingCorrect=normalizeAnswer(value)===normalizeAnswer(current.prompt);
  recordFeedback(session.typingCorrect ? "remembered" : "forgot", current);
}
function renderFreeReview() {
  const list=units();
  const fallbackQueue = dueUnits().length ? dueUnits() : list;
  const session = state.session && state.session.unit ? state.session : null;
  const current=session ? session.unit : fallbackQueue[0];
  if (!current) {
    document.getElementById("view-review").innerHTML=head("SPACED REVIEW","还没有 <em>学习卡片</em>。","先从内容库导入或创建学习内容。",'<button class="primary-btn" data-view-link="library">打开内容库</button>')+'<div class="empty">当前没有可练习的内容。</div>';
    bind();
    return;
  }
  const mode=state.practiceMode==="spelling" || state.practiceMode==="cloze" ? state.practiceMode : "cards";
  const modeSwitch='<div class="mode-switch" role="tablist" aria-label="练习模式"><button class="'+(mode==="cards"?"active":"")+'" data-mode="cards" role="tab" aria-selected="'+(mode==="cards")+'">翻卡复习</button><button class="'+(mode==="spelling"?"active":"")+'" data-mode="spelling" role="tab" aria-selected="'+(mode==="spelling")+'">拼写练习</button><button class="'+(mode==="cloze"?"active":"")+'" data-mode="cloze" role="tab" aria-selected="'+(mode==="cloze")+'">语境填空</button></div>';
  const queue = session && Array.isArray(session.queue) ? session.queue.slice(session.index + 1).concat(session.repeats || []) : fallbackQueue;
  const body=mode==="cards" ? renderReviewCard(current,session) : renderTypedReview(current,session,mode);
  document.getElementById("view-review").innerHTML =
    head("SPACED REVIEW","复习队列，<em>按记忆出现</em>。","先凭记忆回想，再选择练习方式；每一次结果都会进入同一套复习调度。",modeSwitch)+
    '<div class="review-layout">'+body+'<aside class="queue"><div class="kicker">UP NEXT</div><h3>接下来会遇到</h3>'+queue.slice(0,5).map(function(unit){return '<div class="queue-item"><div class="queue-bar"></div><div><strong>'+escapeHtml(unit.prompt)+'</strong><span>'+escapeHtml(unit.kind)+" · "+escapeHtml(unit.itemTitle)+" · "+escapeHtml(formatDue(unit))+"</span></div></div>";}).join("")+"</aside></div>";
  bind();
  document.querySelectorAll("[data-mode]").forEach(function(button){button.addEventListener("click",function(){setPracticeMode(button.dataset.mode);});});
  if (mode!=="cards" && !(session && session.phase==="answer")) {
    document.querySelectorAll("[data-check-practice]").forEach(function(button){button.addEventListener("click",function(){checkTypedAnswer(current);});});
    const input=document.getElementById("practice-input");
    if (input) {
      input.addEventListener("keydown",function(event){if (event.key==="Enter") checkTypedAnswer(current);});
      window.setTimeout(function(){input.focus();},0);
    }
  } else {
    document.querySelectorAll("[data-feedback]").forEach(function(button){button.addEventListener("click",function(){recordFeedback(button.dataset.feedback,current);});});
    document.querySelectorAll("[data-next]").forEach(function(button){button.addEventListener("click",advanceReview);});
    document.querySelectorAll("[data-repeat]").forEach(function(button){button.addEventListener("click",repeatReview);});
  }
}
function renderReview() {
  if (validRound(state.round)) return renderActiveRound();
  if (state.session && state.session.unit) return renderFreeReview();
  return renderRoundStart();
}
function renderStats() {
  const metrics=learningStats();
  const days=recentDays();
  const maxDaily=Math.max(1,...days.map(function(day){return day.count;}));
  const bars=days.map(function(day){const height=day.count ? Math.max(12,Math.round(day.count/maxDaily*100)) : 4; return '<i style="height:'+height+'%" title="'+day.count+' 次复习"><span>'+day.label+'</span></i>';}).join("");
  document.getElementById("view-stats").innerHTML =
    head("LEARNING RECORD","慢慢积累，<em>看得见变化</em>。","这里不评判你，只记录你真正做过的练习，以及哪些内容值得再次出现.","")+
    '<div class="stats-grid"><div class="stats-box"><h3>累计复习</h3><div class="big">'+metrics.totalReviews+'</div><div style="color:var(--muted);font-size:12px">次反馈</div></div><div class="stats-box"><h3>记得反馈</h3><div class="big">'+metrics.rememberedReviews+'</div><div style="color:var(--muted);font-size:12px">次选择“记得”</div></div><div class="stats-box"><h3>当前待复习</h3><div class="big">'+metrics.dueCards+'</div><div style="color:var(--muted);font-size:12px">张卡片到期</div></div><div class="stats-box"><h3>完成学习轮次</h3><div class="big">'+metrics.completedRounds+'</div><div style="color:var(--muted);font-size:12px">轮已记录</div></div></div>'+
    '<div class="section-row" style="margin-top:35px"><h2>最近 7 天</h2><span style="color:var(--muted);font-size:12px">共 '+metrics.weekReviews+' 次复习 · 连续 '+metrics.streak+' 天</span></div><div class="stats-box"><div class="bar-chart">'+bars+'</div></div>'+
    '<div class="section-row" style="margin-top:35px"><h2>轮次历史</h2><span style="color:var(--muted);font-size:12px">最近 '+Math.min(10,state.rounds.length)+' 轮</span></div>'+ (state.rounds.length ? '<div class="round-history-list">'+state.rounds.slice(0,10).map(function(round){return '<div class="round-history-row"><strong>'+escapeHtml(round.sourceTitle)+'</strong><span>'+round.cardCount+' 个单元 · '+(round.spellingCompleted?"完成拼写":"跳过拼写")+' · 拼写错 '+(round.spellingWrong || 0)+' 次 · '+new Date(round.completedAt).toLocaleString()+'</span></div>';}).join("")+'</div>' : '<div class="empty">完成第一轮后，这里会留下你的学习轨迹。</div>');
  bind();
}
function bind() {
  document.querySelectorAll("[data-view-link]").forEach(function(element){element.addEventListener("click",function(){setView(element.dataset.viewLink);});});
  document.querySelectorAll("[data-view]").forEach(function(element){element.addEventListener("click",function(){setView(element.dataset.view);});});
  document.querySelectorAll("[data-start]").forEach(function(element){element.addEventListener("click",function(){startSession(element.dataset.start);});});
  document.querySelectorAll("[data-edit]").forEach(function(element){element.addEventListener("click",function(){openEdit(element.dataset.edit);});});
  document.querySelectorAll("[data-reset]").forEach(function(element){element.addEventListener("click",function(){resetItemProgress(element.dataset.reset);});});
  document.querySelectorAll("[data-delete]").forEach(function(element){element.addEventListener("click",function(){deleteItem(element.dataset.delete);});});
  document.querySelectorAll("[data-speak]").forEach(function(element){element.addEventListener("click",function(){speak(element.dataset.speak);});});
  document.querySelectorAll("[data-word-sound]").forEach(function(element){element.addEventListener("click",function(){playWord(element.dataset.wordSound);});});
  document.querySelectorAll("[data-filter]").forEach(function(element){element.addEventListener("click",function(){state.filter=element.dataset.filter;renderLibrary();});});
}
function startSession(itemId) {
  if (validRound(state.round)) {
    setView("review");
    notify("已恢复当前学习轮次");
    return;
  }
  state.roundStartItemId=itemId || null;
  state.session=null;
  setView("review");
  notify("请选择本轮数量并开始学习");
}
function startFreeSession(itemId) {
  const item=state.items.find(function(entry){return entry.id===itemId;}) || state.items[0];
  if (!item) { setView("library"); return; }
  const itemUnits=item.units.map(function(unit,index){return Object.assign({},unit,{itemId:item.id,itemTitle:item.title,unitIndex:index});});
  const firstIndex=itemUnits.findIndex(function(unit){return cardSchedule(unit).dueAt<=Date.now();});
  const index=firstIndex < 0 ? 0 : firstIndex;
  state.session={itemId:item.id,baseQueue:itemUnits.slice(),queue:itemUnits,index:index,unit:itemUnits[index],phase:"prompt",feedback:null,repeats:[],repeatPass:false,typedAnswer:"",typingCorrect:null};
  state.round=null;
  persist();
  setView("review");
  notify("已进入 "+item.title+" 的自由练习");
}
function sameCard(first, second) {
  return Boolean(first && second && first.itemId===second.itemId && first.prompt===second.prompt);
}
function ensureReviewSession(current) {
  if (state.session && state.session.unit) return state.session;
  const queue=dueUnits().length ? dueUnits() : units();
  const index=Math.max(0,queue.findIndex(function(unit){return sameCard(unit,current);}));
  state.session={itemId:current.itemId,baseQueue:queue.slice(),queue:queue,index:index,unit:queue[index] || current,phase:"prompt",feedback:null,repeats:[],repeatPass:false,typedAnswer:"",typingCorrect:null};
  return state.session;
}
function recordFeedback(feedback, current) {
  const session=ensureReviewSession(current);
  const rating=feedback==="forgot" ? "again" : "know";
  state.logs.push({itemId:current.itemId,prompt:current.prompt,rating:rating,at:new Date().toISOString()});
  const item=state.items.find(function(entry){return entry.id===current.itemId;});
  if (item) item.progress=Math.min(100,item.progress+(rating==="know"?4:1));
  scheduleCard(current, rating);
  session.unit=current;
  session.phase="answer";
  session.feedback=feedback;
  if (feedback==="forgot" && !session.repeatPass && !session.repeats.some(function(unit){return sameCard(unit,current);})) session.repeats.push(current);
  persist(); renderReview();
  notify(feedback==="forgot" ? "答案会一直显示，并在本轮稍后再次出现" : "答案已显示，可以继续下一张");
}
function advanceReview() {
  const session=state.session;
  if (!session || !session.unit) return;
  let queue=session.queue, index=session.index+1, repeatPass=session.repeatPass;
  if (index >= queue.length) {
    if (session.repeats && session.repeats.length) {
      queue=session.repeats.slice();
      session.repeats=[];
      index=0;
      repeatPass=true;
    } else {
      queue=session.baseQueue && session.baseQueue.length ? session.baseQueue.slice() : (dueUnits().length ? dueUnits() : units());
      index=0;
      repeatPass=false;
    }
  }
  session.queue=queue;
  session.index=index;
  session.unit=queue[index];
  session.phase="prompt";
  session.feedback=null;
  session.typedAnswer="";
  session.typingCorrect=null;
  session.repeatPass=repeatPass;
  renderReview();
}
function repeatReview() {
  if (!state.session || !state.session.unit) return;
  state.session.phase="prompt";
  state.session.feedback=null;
  state.session.typedAnswer="";
  state.session.typingCorrect=null;
  renderReview();
  notify("再来一次");
}
function recordRoundFeedback(feedback) {
  const round=state.round;
  const current=roundCurrentCard(round);
  if (!validRound(round) || round.stage!=="cards" || !current || round.cardPhase!=="prompt") return;
  const rating=feedback==="forgot" ? "again" : "know";
  state.logs.push({itemId:current.itemId,prompt:current.prompt,rating:rating,roundId:round.id,phase:"cards",at:new Date().toISOString()});
  const item=state.items.find(function(entry){return entry.id===current.itemId;});
  if (item) item.progress=Math.min(100,item.progress+(rating==="know"?4:1));
  scheduleCard(current,rating);
  round.cardPhase="answer";
  round.cardFeedback=feedback;
  if (feedback==="forgot") {
    const key=roundCardKey(current);
    const repeats=round.cardRepeats || (round.cardRepeats={});
    if (!repeats[key]) { repeats[key]=1; round.cardQueue.push(Object.assign({},current)); }
  }
  persist();
  renderActiveRound();
  notify(feedback==="forgot" ? "答案已显示，这张卡会在本轮稍后重现" : "答案已显示，可以继续下一张");
}
function advanceRoundCard() {
  const round=state.round;
  if (!validRound(round) || round.stage!=="cards") return;
  round.cardIndex+=1;
  round.cardPhase="prompt";
  round.cardFeedback=null;
  if (round.cardIndex>=round.cardQueue.length) {
    round.stage="gate";
  }
  persist();
  renderActiveRound();
}
function repeatRoundCard() {
  const round=state.round;
  if (!validRound(round) || round.stage!=="cards") return;
  round.cardPhase="prompt";
  round.cardFeedback=null;
  persist();
  renderActiveRound();
  notify("再来一次");
}
function enterRoundSpelling() {
  const round=state.round;
  if (!validRound(round) || round.stage!=="gate") return;
  round.stage="spelling";
  round.spellingQueue=round.cards.slice();
  round.spellingIndex=0;
  round.spellingPhase="prompt";
  round.typedAnswer="";
  round.typingCorrect=null;
  persist();
  renderActiveRound();
  notify("开始本轮拼写练习");
}
function checkRoundSpelling() {
  const round=state.round;
  if (!validRound(round) || round.stage!=="spelling" || round.spellingPhase==="answer") return;
  ensureSpellingQueue(round);
  const input=document.getElementById("round-practice-input");
  const value=input ? input.value.trim() : "";
  if (!value) { notify("先输入英文答案"); if (input) input.focus(); return; }
  const current=roundCurrentSpellingCard(round);
  const correct=normalizeAnswer(value)===normalizeAnswer(current.prompt);
  const key=roundCardKey(current);
  round.typedAnswer=value;
  round.typingCorrect=correct;
  round.spellingAttempts[key]=(round.spellingAttempts[key] || 0)+1;
  if (!correct) {
    round.spellingWrong+=1;
    round.spellingQueue.push(Object.assign({},current));
  }
  state.logs.push({itemId:current.itemId,prompt:current.prompt,rating:correct?"know":"again",roundId:round.id,phase:"spelling",at:new Date().toISOString()});
  scheduleCard(current,correct?"know":"again");
  round.spellingPhase="answer";
  persist();
  renderActiveRound();
  notify(correct ? "拼写正确" : "答案已显示，这个词会在本轮末尾再次出现");
}
function advanceRoundSpelling() {
  const round=state.round;
  if (!validRound(round) || round.stage!=="spelling" || round.spellingPhase!=="answer") return;
  ensureSpellingQueue(round);
  round.spellingIndex+=1;
  round.spellingPhase="prompt";
  round.typedAnswer="";
  round.typingCorrect=null;
  if (round.spellingIndex>=round.spellingQueue.length) return completeRound("spelling");
  persist();
  renderActiveRound();
}
function parseSubtitleUnits(raw) {
  const parsed=[];
  raw.replace(/\r/g, "").split("\n").forEach(function(line){
    let text=line.trim();
    if (!text || /^\d+$/.test(text) || /^WEBVTT/i.test(text) || /^NOTE\b/i.test(text) || /^STYLE\b/i.test(text)) return;
    if (/^Dialogue:/i.test(text)) text=text.split(",").slice(9).join(",").trim();
    if (/-->/.test(text) || /^\d{1,2}:\d{2}(?::\d{2})?[,.]\d{3}/.test(text)) return;
    text=text.replace(/<[^>]+>/g, "").replace(/\{[^}]+\}/g, "").trim();
    if (text && text.length>1 && text.length<=180) parsed.push({kind:"句子",prompt:text,answer:"先回忆这句台词的中文含义",context:text,note:"字幕导入内容；可以在复习中补充译文、语气和场景说明。"});
  });
  return parsed;
}
function parseLearningUnits(raw, type) {
  if (type === "影视台词" && /-->|^Dialogue:/im.test(raw)) return parseSubtitleUnits(raw);
  const parsed=[];
  raw.replace(/\r/g, "").split("\n").map(function(line){return line.trim();}).filter(Boolean).forEach(function(line){
    const clean=line.replace(/^[-*]\s*/, "").replace(/^\d+[.)]\s*/, "");
    if (!clean || clean[0]==="#" || clean[0]===">" || clean[0]==="|" || /^---+$/.test(clean) || /^(word|term|english)\s*,/i.test(clean)) return;
    const separator=clean.indexOf("：")>=0 ? "：" : clean.indexOf(",")>=0 ? "," : clean.indexOf(":")>=0 ? ":" : null;
    if (!separator && type!=="单词书" && clean.includes(" ") && clean.split(/\s+/).length>5) return;
    const pieces=separator ? clean.split(separator) : [clean], prompt=pieces.shift().trim(), answer=pieces.join("，").trim() || "待补充释义";
    if (prompt && prompt.length>1 && prompt.length<=80) parsed.push({kind:type==="歌曲笔记"?"短语":type==="影视台词"?"句子":"词汇",prompt:prompt,answer:answer,context:"来自导入内容："+prompt,note:"导入后可以在复习中继续补充自己的例句和理解。"});
  });
  return parsed;
}
function openImport() {
  document.getElementById("modal-root").innerHTML='<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>导入学习内容</h2><button class="close-btn" id="close-modal">×</button></div><div class="form-grid"><label>标题<input id="import-title" placeholder="例如：Friends · Season 01"></label><label>内容类型<select id="import-type"><option>单词书</option><option>歌曲笔记</option><option>影视台词</option><option>文章</option></select></label><label>粘贴 Markdown、CSV、TXT 或字幕<textarea id="import-text" placeholder="# Vocabulary\n\n- retain：保留；记住\n- context：语境\n\n## Phrases\n- in context：在语境中"></textarea></label><label>或选择文件<input id="import-file" type="file" accept=".md,.txt,.csv,.srt,.vtt,.ass"></label></div><div class="modal-actions"><button class="quiet-btn" id="cancel-import">取消</button><button class="primary-btn" id="confirm-import">导入并建立学习卡片</button></div></div></div>';
  document.getElementById("close-modal").onclick=closeModal;
  document.getElementById("cancel-import").onclick=closeModal;
  document.getElementById("confirm-import").onclick=importContent;
  const fileInput=document.getElementById("import-file");
  if(fileInput) fileInput.addEventListener("change",function(event){const file=event.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=function(){document.getElementById("import-text").value=reader.result;if(!document.getElementById("import-title").value)document.getElementById("import-title").value=file.name.replace(/\.[^.]+$/,"");};reader.readAsText(file);});
}
function closeModal(){document.getElementById("modal-root").innerHTML="";}
function importContent() {
  const title=document.getElementById("import-title").value.trim() || "未命名学习内容";
  const type=document.getElementById("import-type").value;
  const raw=document.getElementById("import-text").value.trim();
  if (!raw) { notify("请先粘贴内容"); return; }
  const parsed=parseLearningUnits(raw,type);
  if (!parsed.length) { notify("没有识别出可学习的条目"); return; }
  state.items.unshift({id:"import-"+Date.now(),type:type,title:title,author:"本地导入",level:"自定义",progress:0,description:"从本地文本导入的个人学习内容。",units:parsed.slice(0,60)});
  persist(); closeModal(); state.filter="全部"; state.query=""; setView("library"); notify("已导入 "+parsed.length+" 个学习单元");
}
document.getElementById("quick-search").addEventListener("click",function(){setView("library");window.setTimeout(function(){const input=document.getElementById("library-search");if(input) input.focus();},50);});
document.querySelectorAll("[data-view]").forEach(function(element){element.addEventListener("click",function(){setView(element.dataset.view);});});
render();
