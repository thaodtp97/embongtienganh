const SESSION_SIZE = 50;
let data, sessionWords, currentIdx;
let user, streakCount, lastSessionDate;
let answeredCount, correctCount;
let srsData, wrongWords;

async function loadData() {
  data = await fetch('data.json').then(r => r.json());
  initSRS();
  user = localStorage.getItem('quiz_user') || null;
  if (user) initQuiz();
}

function initSRS() {
  const key = 'srs_data';
  const stored = localStorage.getItem(key);
  if (stored) srsData = JSON.parse(stored);
  else {
    srsData = data.map(item => ({
      word: item.word,
      pos: item.pos,
      phonetic: item.phonetic,
      meaning: item.meaning,
      rep: 0,
      interval: 1,
      ease: 2.5,
      nextReview: new Date().toISOString()
    }));
    localStorage.setItem(key, JSON.stringify(srsData));
  }
}

function initQuiz() {
  streakCount = parseInt(localStorage.getItem(user + '_streak')) || 0;
  lastSessionDate = localStorage.getItem(user + '_lastDate') || null;
  updateStreakDisplay();

  const sessKey = user + '_session';
  const idxKey  = user + '_sessionIdx';
  const storedSess = localStorage.getItem(sessKey);
  if (storedSess) {
    sessionWords = JSON.parse(storedSess);
    currentIdx   = parseInt(localStorage.getItem(idxKey)) || 0;
  } else {
    buildNewSession();
  }

  answeredCount = parseInt(localStorage.getItem(user + '_answered')) || 0;
  correctCount  = parseInt(localStorage.getItem(user + '_correct'))  || 0;
  wrongWords    = [];

  document.getElementById('login-container').style.display = 'none';
  document.getElementById('quiz-container').style.display  = 'block';
  document.getElementById('welcome').textContent = `Xin chào, ${user}`;
  document.getElementById('show-analytics-btn').style.display = 'inline-block';
  renderHistory();
  updateHeader();
  showQuestion();
}

function buildNewSession() {
  const now = new Date();
  let due = srsData.filter(i => new Date(i.nextReview) <= now);
  if (due.length < SESSION_SIZE) due = [...srsData];
  sessionWords = shuffle(due).slice(0, SESSION_SIZE);
  localStorage.setItem(user + '_session', JSON.stringify(sessionWords));
  currentIdx = 0;
  localStorage.setItem(user + '_sessionIdx', currentIdx);
  answeredCount = 0; correctCount = 0;
  localStorage.setItem(user + '_answered', answeredCount);
  localStorage.setItem(user + '_correct',  correctCount);
}

function updateStreakDisplay() {
  document.getElementById('streak').textContent = `Streak: ${streakCount} ngày`;
}

function updateHeader() {
  const qNum = Math.min(currentIdx + 1, SESSION_SIZE);
  const acc = answeredCount ? ((correctCount/answeredCount)*100).toFixed(0) : 0;
  document.getElementById('session-stats').textContent =
    `Câu ${qNum}/${SESSION_SIZE} (Đúng: ${correctCount}) - Accuracy: ${acc}%`;
}

function showQuestion() {
  document.querySelector('.options').innerHTML = '';
  document.getElementById('next-btn').style.display = 'none';
  document.getElementById('end-session-btn').style.display = 'none';

  if (currentIdx >= sessionWords.length) return endSession();
  const cur = sessionWords[currentIdx];
  document.getElementById('question').textContent =
    `Chọn từ tương ứng với nghĩa: "${cur.meaning}"`;

  const opts = [cur, ...shuffle(srsData.filter(i=>i.word!==cur.word)).slice(0,3)];
  shuffle(opts).forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `<strong>${item.word}</strong><br>` +
                    `<em>${item.pos}</em> [${item.phonetic}]`;
    btn.onclick = () => selectAnswer(btn, item);
    document.querySelector('.options').append(btn);
  });
}

function selectAnswer(btn, item) {
  document.querySelectorAll('.option-btn').forEach(b=>b.disabled=true);
  const cur = sessionWords[currentIdx];
  const ok  = item.word === cur.word;
  if (ok) correctCount++;
  else {
    btn.classList.add('wrong');
    wrongWords.push(cur.word);
  }
  if (!ok) {
    document.querySelectorAll('.option-btn').forEach(b=>{
      if (b.innerText.includes(cur.word)) b.classList.add('correct');
    });
  } else btn.classList.add('correct');

  // SRS update
  const s = srsData.find(i=>i.word===cur.word);
  if (ok) {
    s.rep++;
    s.interval = s.rep===1?1:(s.rep===2?6:Math.ceil(s.interval*s.ease));
    s.nextReview = new Date(Date.now()+s.interval*24*3600*1000).toISOString();
  } else {
    s.rep = 0; s.interval = 1;
    s.nextReview = new Date(Date.now()+24*3600*1000).toISOString();
  }
  localStorage.setItem('srs_data', JSON.stringify(srsData));

  answeredCount++;
  localStorage.setItem(user + '_answered', answeredCount);
  localStorage.setItem(user + '_correct',  correctCount);
  localStorage.setItem(user + '_sessionIdx', currentIdx);

  new Audio(`audio/${cur.word.replace(/ /g,'_')}.mp3`).play();

  updateHeader();
  document.getElementById('next-btn').style.display = 'inline-block';
  document.getElementById('end-session-btn').style.display = 'inline-block';
}

document.getElementById('next-btn').onclick = () => {
  currentIdx++; showQuestion(); updateHeader();
};
document.getElementById('end-session-btn').onclick = endSession;

function endSession() {
  const today = new Date().toISOString().slice(0,10);
  if (lastSessionDate === new Date(Date.now()-24*3600*1000).toISOString().slice(0,10))
    streakCount++;
  else if (lastSessionDate !== today)
    streakCount = 1;
  lastSessionDate = today;
  localStorage.setItem(user + '_streak', streakCount);
  localStorage.setItem(user + '_lastDate', today);

  const histKey = user + '_history';
  const prev   = JSON.parse(localStorage.getItem(histKey)||'[]');
  prev.push({
    date: new Date().toISOString(),
    correct: correctCount,
    total: answeredCount,
    pct: answeredCount?Math.round(correctCount/answeredCount*100):0,
    mistakes: wrongWords
  });
  localStorage.setItem(histKey, JSON.stringify(prev));

  // push lên Firestore
  db.collection('sessions').add({
    user,
    date: new Date().toISOString(),
    correct: correctCount,
    total: answeredCount,
    mistakes: wrongWords
  }).catch(console.error);

  localStorage.removeItem(user + '_session');
  localStorage.removeItem(user + '_sessionIdx');
  initQuiz();
}

function renderHistory() {
  const hist = JSON.parse(localStorage.getItem(user + '_history')||'[]');
  if (!hist.length) return;
  const tbody = document.querySelector('#history-table tbody');
  tbody.innerHTML = '';
  hist.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td>${new Date(r.date).toLocaleString()}</td>`+
      `<td>${r.correct}</td><td>${r.total}</td>`+
      `<td>${r.pct}%</td><td>${(r.mistakes||[]).join(', ')}</td>`;
    tbody.append(tr);
  });
  document.getElementById('history-container').style.display='block';
}

document.getElementById('show-analytics-btn').onclick = showAnalytics;

function showAnalytics() {
  const hist = JSON.parse(localStorage.getItem(user + '_history')||'[]');
  const counts = {};
  hist.forEach(r=> (r.mistakes||[]).forEach(w=>counts[w]=(counts[w]||0)+1));
  const entries = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const labels = entries.map(e=>e[0]), values = entries.map(e=>e[1]);
  const ctx = document.getElementById('mistakeChart').getContext('2d');
  if (window.mistakeChart) window.mistakeChart.destroy();
  window.mistakeChart = new Chart(ctx,{
    type:'bar',
    data:{labels,datasets:[{label:'Lỗi sai',data:values,backgroundColor:'#f44336'}]},
    options:{scales:{y:{beginAtZero:true}}}
  });
  const ul = document.getElementById('mistakeList'); ul.innerHTML='';
  entries.forEach(([w,c])=>{ const li=document.createElement('li'); li.textContent=`${w}: sai ${c} lần`; ul.append(li);});
  document.getElementById('analytics').style.display='block';
  document.getElementById('analytics').scrollIntoView({behavior:'smooth'});
}

// login
document.getElementById('login-btn').onclick = () => {
  const v = document.getElementById('username-input').value.trim();
  if (!v) return alert('Nhập tên tài khoản!');
  user = v; localStorage.setItem('quiz_user', user);
  initQuiz();
};

function shuffle(a){return a.sort(()=>Math.random()-0.5);}
loadData();
