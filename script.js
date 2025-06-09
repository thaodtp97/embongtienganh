let data, current;
let totalQ, answered, correct;
let user;

async function loadData() {
  data = await fetch('data.json').then(r => r.json());
  totalQ = data.length;
  // Load user & stats từ localStorage
  user = localStorage.getItem('quiz_user') || null;
  if (user) initQuiz();
}

function initQuiz() {
  answered = parseInt(localStorage.getItem(user + '_answered')) || 0;
  correct  = parseInt(localStorage.getItem(user + '_correct'))  || 0;
  document.getElementById('login-container').style.display = 'none';
  document.getElementById('quiz-container').style.display  = 'block';
  document.getElementById('welcome').textContent = `Xin chào, ${user}`;
  updateStats();
  nextQuestion();
}

function updateStats() {
  document.getElementById('stats').textContent =
    `Câu ${answered+1}/${totalQ} (Đúng: ${correct})`;
}

function shuffle(a) { return a.sort(() => Math.random() - 0.5); }

function nextQuestion() {
  document.querySelector('.options').innerHTML = '';
  document.getElementById('next-btn').style.display = 'none';

  current = data[Math.floor(Math.random() * totalQ)];
  document.getElementById('question').textContent =
    `Chọn từ tương ứng với nghĩa: "${current.meaning}"`;

  let answers = [current];
  let others = data.filter(d => d.word !== current.word);
  shuffle(others);
  answers.push(...others.slice(0, 3));
  shuffle(answers);

  answers.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML =
      `<strong>${item.word}</strong><br>` +
      `<em>${item.pos}</em> [${item.phonetic}]`;
    btn.onclick = () => selectAnswer(btn, item);
    document.querySelector('.options').append(btn);
  });
}

function selectAnswer(btn, item) {
  document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
  const isCorrect = item.word === current.word;
  if (isCorrect) {
    btn.classList.add('correct');
    correct++;
  } else {
    btn.classList.add('wrong');
    document.querySelectorAll('.option-btn').forEach(b => {
      if (b.innerText.includes(current.word)) b.classList.add('correct');
    });
  }
  answered++;
  localStorage.setItem(user + '_answered', answered);
  localStorage.setItem(user + '_correct',  correct);

  // Play audio
  new Audio(`audio/${current.word.replace(/ /g, '_').replace(/\//g, '_')}.mp3`).play();

  updateStats();
  document.getElementById('next-btn').style.display = 'inline-block';
}

document.getElementById('next-btn').onclick = nextQuestion;
document.getElementById('login-btn').onclick = () => {
  const input = document.getElementById('username-input').value.trim();
  if (!input) return alert('Nhập tên tài khoản!');
  user = input;
  localStorage.setItem('quiz_user', user);
  initQuiz();
};

loadData();
