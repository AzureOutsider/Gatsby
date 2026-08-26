const LIB_KEY = "english-study-library-v1";
const LOG_KEY = "english-study-logs-v1";

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
  view:"home",
  filter:"全部",
  query:"",
  session:null
};

const pronunciationCache = new Map();
const pronunciationFetches = new Map();

function load(kind, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(kind==="library"?LIB_KEY:LOG_KEY));
    return Array.isArray(value) && value.length ? value : fallback;
  } catch (error) { return fallback; }
}
function persist() {
  localStorage.setItem(LIB_KEY, JSON.stringify(state.items));
  localStorage.setItem(LOG_KEY, JSON.stringify(state.logs));
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
function dueCount() { return Math.max(3, 8 - Math.min(5, Math.floor(state.logs.length / 4))); }
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
  const featured=state.items[0];
  const studied=new Set(state.logs.map(function(log){return log.itemId;})).size;
  document.getElementById("view-home").innerHTML =
    head("WEDNESDAY · 26 AUG 2026","今天，学一点 <em>真正用得上</em> 的英语。","把内容拆成小块，先理解，再回忆，最后让它在几天后重新出现。","")+
    '<div class="hero-grid"><section class="hero-card"><div><div class="eyebrow" style="color:var(--yellow)">CONTINUE WHERE YOU LEFT OFF</div><h2>'+escapeHtml(featured.title)+'</h2><div class="hero-meta">'+escapeHtml(featured.author)+" · "+featured.units.length+' 个学习单元</div></div><div class="hero-controls"><button class="play-btn" data-speak="'+escapeHtml(featured.units[0].context)+'" title="播放句子">▶</button><div class="hero-progress"><i></i></div><button class="quiet-btn" style="color:var(--paper);border-color:rgba(255,255,255,.25)" data-start="'+featured.id+'">继续学习</button></div></section><section class="side-card"><div><div class="kicker">TODAY\'S REVIEW</div><h3>复习不是回头，<br>是让记忆留下来。</h3></div><div><div class="stat-big">'+dueCount()+' <small>张卡片待复习</small></div><div class="streak"><span class="fire">◒</span> 已连续学习 '+Math.max(1,Math.min(12,2+Math.floor(state.logs.length/3)))+' 天</div></div></section></div>'+
    '<div class="metrics"><div class="metric"><div class="metric-label">已掌握词汇</div><div class="metric-value">'+(42+state.logs.filter(function(log){return log.rating==="know";}).length)+'</div></div><div class="metric"><div class="metric-label">学习内容</div><div class="metric-value">'+state.items.length+'</div></div><div class="metric"><div class="metric-label">本周学习</div><div class="metric-value">'+(18+state.logs.length)+' <small>分钟</small></div></div><div class="metric"><div class="metric-label">学习来源</div><div class="metric-value">'+new Set(state.items.map(function(item){return item.type;})).size+' <small>类</small></div></div></div>'+
    '<div class="section-row"><h2>接下来学什么</h2><a data-view-link="library">查看全部内容 →</a></div><div class="content-list">'+state.items.slice(0,4).map(function(item,index){return '<div class="content-row"><div class="content-index">0'+(index+1)+'</div><div><div class="content-title">'+escapeHtml(item.title)+'</div><div class="content-sub">'+escapeHtml(item.author)+" · "+item.units.length+' 个单元</div></div><span class="content-tag">'+escapeHtml(item.type)+'</span><div class="progress-mini"><i style="width:'+item.progress+'%"></i></div><span class="row-arrow" data-start="'+item.id+'">→</span></div>';}).join("")+"</div>";
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
    (visible.length ? '<div class="library-grid">'+visible.map(function(item){return '<article class="library-card"><div class="card-type">'+escapeHtml(item.type).toUpperCase()+'</div><h3>'+escapeHtml(item.title)+'</h3><p>'+escapeHtml(item.author)+'</p><p style="margin-top:10px;line-height:1.45">'+escapeHtml(item.description)+'</p><div class="card-footer"><div class="progress-line"><i style="width:'+item.progress+'%"></i></div><button class="card-open" data-start="'+item.id+'">打开内容 →</button></div></article>';}).join("")+"</div>" : '<div class="empty">没有找到匹配内容。试试导入一份 Markdown 或单词表。</div>');
  bind();
  const search=document.getElementById("library-search");
  if (search) search.addEventListener("input",function(event){state.query=event.target.value;renderLibrary();});
  const importer=document.getElementById("open-import");
  if (importer) importer.addEventListener("click",openImport);
}
function renderReview() {
  const list=units();
  const current=state.session && state.session.unit ? state.session.unit : list[0];
  const answerVisible = Boolean(state.session && state.session.revealed);
  document.getElementById("view-review").innerHTML =
    head("SPACED REVIEW","复习队列，<em>按记忆出现</em>。","先凭记忆回答，再查看释义。每一次反馈都会让下一次复习更贴近你的真实状态.","")+
    '<div class="review-layout"><section class="review-card"><div class="review-kind">'+escapeHtml(current.kind)+" · "+escapeHtml(current.itemTitle)+'</div><div class="review-prompt">'+escapeHtml(current.prompt)+' <button class="icon-button" style="display:inline-grid;background:transparent;border-color:rgba(255,255,255,.25);color:var(--yellow);vertical-align:middle" data-word-sound="'+escapeHtml(current.prompt)+'" title="播放发音">♪</button></div><div class="review-context">'+escapeHtml(current.context)+"</div>"+
    (answerVisible ? '<div class="answer">'+escapeHtml(current.answer)+'</div><div class="review-context" style="margin-top:8px">'+escapeHtml(current.note)+"</div>" : "")+
    '<div class="review-buttons"><button class="sound-btn" data-word-sound="'+escapeHtml(current.prompt)+'">听发音</button><button data-rate="again">再来一次</button><button data-rate="hard">有点模糊</button><button data-rate="know">记住了</button></div></section><aside class="queue"><div class="kicker">UP NEXT</div><h3>接下来会遇到</h3>'+list.slice(0,5).map(function(unit){return '<div class="queue-item"><div class="queue-bar"></div><div><strong>'+escapeHtml(unit.prompt)+'</strong><span>'+escapeHtml(unit.kind)+" · "+escapeHtml(unit.itemTitle)+"</span></div></div>";}).join("")+"</aside></div>";
  bind();
  document.querySelectorAll("[data-rate]").forEach(function(button){button.addEventListener("click",function(){rateCard(button.dataset.rate,current);});});
}
function renderStats() {
  const total=state.logs.length, known=state.logs.filter(function(log){return log.rating==="know";}).length;
  document.getElementById("view-stats").innerHTML =
    head("LEARNING RECORD","慢慢积累，<em>看得见变化</em>。","这里不评判你，只记录你真正做过的练习，以及哪些内容值得再次出现.","")+
    '<div class="stats-grid"><div class="stats-box"><h3>累计复习</h3><div class="big">'+(total+36)+'</div><div style="color:var(--muted);font-size:12px">张卡片</div></div><div class="stats-box"><h3>主动记住</h3><div class="big">'+(known+28)+'</div><div style="color:var(--muted);font-size:12px">次反馈为“记住了”</div></div><div class="stats-box"><h3>学习时间</h3><div class="big">'+(18+total)+'<small style="font:14px var(--sans)"> min</small></div><div style="color:var(--muted);font-size:12px">本周累计</div></div></div>'+
    '<div class="section-row" style="margin-top:35px"><h2>最近 7 天</h2><span style="color:var(--muted);font-size:12px">保持自己的节奏</span></div><div class="stats-box"><div class="bar-chart"><i style="height:36%"><span>一</span></i><i style="height:57%"><span>二</span></i><i style="height:28%"><span>三</span></i><i style="height:76%"><span>四</span></i><i style="height:48%"><span>五</span></i><i style="height:88%"><span>六</span></i><i style="height:63%"><span>日</span></i></div></div>';
  bind();
}
function bind() {
  document.querySelectorAll("[data-view-link]").forEach(function(element){element.addEventListener("click",function(){setView(element.dataset.viewLink);});});
  document.querySelectorAll("[data-view]").forEach(function(element){element.addEventListener("click",function(){setView(element.dataset.view);});});
  document.querySelectorAll("[data-start]").forEach(function(element){element.addEventListener("click",function(){startSession(element.dataset.start);});});
  document.querySelectorAll("[data-speak]").forEach(function(element){element.addEventListener("click",function(){speak(element.dataset.speak);});});
  document.querySelectorAll("[data-word-sound]").forEach(function(element){element.addEventListener("click",function(){playWord(element.dataset.wordSound);});});
  document.querySelectorAll("[data-filter]").forEach(function(element){element.addEventListener("click",function(){state.filter=element.dataset.filter;renderLibrary();});});
}
function startSession(itemId) {
  const item=state.items.find(function(entry){return entry.id===itemId;}) || state.items[0];
  state.session={itemId:item.id,index:0,unit:Object.assign({},item.units[0],{itemId:item.id,itemTitle:item.title}),revealed:false};
  setView("review");
  notify("已进入 "+item.title+" 的学习队列");
}
function rateCard(rating, current) {
  state.logs.push({itemId:state.session ? state.session.itemId : current.itemId,prompt:current.prompt,rating:rating,at:new Date().toISOString()});
  const item=state.items.find(function(entry){return entry.id===(state.session ? state.session.itemId : current.itemId);});
  if (item) item.progress=Math.min(100,item.progress+(rating==="know"?4:rating==="hard"?2:1));
  const list=units();
  const index=list.findIndex(function(unit){return unit.prompt===current.prompt && unit.itemId===current.itemId;});
  if (rating === "know") {
    const next=list[(Math.max(0,index)+1)%list.length];
    state.session={itemId:next.itemId,unit:next,revealed:false};
    persist(); renderReview(); notify("已加入更远的复习间隔");
    return;
  }
  if (rating === "hard") {
    state.session={itemId:current.itemId,unit:current,revealed:true};
    persist(); renderReview(); notify("答案已显示，马上再来一次");
    window.setTimeout(function(){
      if (!state.session || state.session.unit.prompt !== current.prompt || !state.session.revealed) return;
      state.session={itemId:current.itemId,unit:current,revealed:false};
      renderReview();
    }, 1200);
    return;
  }
  state.session={itemId:current.itemId,unit:current,revealed:false};
  persist(); renderReview(); notify("这张卡片会马上再出现");
}
function openImport() {
  document.getElementById("modal-root").innerHTML='<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>导入学习内容</h2><button class="close-btn" id="close-modal">×</button></div><div class="form-grid"><label>标题<input id="import-title" placeholder="例如：Friends · Season 01"></label><label>内容类型<select id="import-type"><option>单词书</option><option>歌曲笔记</option><option>影视台词</option><option>文章</option></select></label><label>粘贴 Markdown、CSV 或 TXT<textarea id="import-text" placeholder="# Vocabulary\n\n- retain：保留；记住\n- context：语境\n\n## Phrases\n- in context：在语境中"></textarea></label><label>或选择文件<input id="import-file" type="file" accept=".md,.txt,.csv"></label></div><div class="modal-actions"><button class="quiet-btn" id="cancel-import">取消</button><button class="primary-btn" id="confirm-import">导入并建立学习卡片</button></div></div></div>';
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
  const parsed=[];
  raw.split(/\r?\n/).map(function(line){return line.trim();}).filter(Boolean).forEach(function(line){
    const clean=line.replace(/^[-*]\s*/,"").replace(/^\d+[.)]\s*/,"");
    if (clean[0]==="#" || clean[0]==">" || clean[0]==="|") return;
    const pieces=clean.split(/[：:,]/), prompt=pieces.shift().trim(), answer=pieces.join("，").trim() || "待补充释义";
    if (prompt && prompt.length<=80 && prompt.length>1) parsed.push({kind:type==="影视台词"?"句子":type==="歌曲笔记"?"短语":"词汇",prompt:prompt,answer:answer,context:"来自导入内容："+prompt,note:"导入后可以在复习中继续补充自己的例句和理解。"});
  });
  if (!parsed.length) { notify("没有识别出可学习的条目"); return; }
  state.items.unshift({id:"import-"+Date.now(),type:type,title:title,author:"本地导入",level:"自定义",progress:0,description:"从本地文本导入的个人学习内容。",units:parsed.slice(0,60)});
  persist(); closeModal(); state.filter="全部"; state.query=""; setView("library"); notify("已导入 "+parsed.length+" 个学习单元");
}
document.getElementById("quick-search").addEventListener("click",function(){setView("library");window.setTimeout(function(){const input=document.getElementById("library-search");if(input) input.focus();},50);});
document.querySelectorAll("[data-view]").forEach(function(element){element.addEventListener("click",function(){setView(element.dataset.view);});});
render();
