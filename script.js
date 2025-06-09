let data, current;
async function loadData() {
  data = await fetch('data.json').then(r=>r.json());
  nextQuestion();
}
function shuffle(a){return a.sort(()=>Math.random()-0.5);}
function nextQuestion(){
  document.querySelector('.options').innerHTML='';
  document.getElementById('next-btn').style.display='none';
  current = data[Math.floor(Math.random()*data.length)];
  document.getElementById('question').textContent = `Chọn nghĩa của: "${current.word}"`;
  let answers = [current];
  let others = data.filter(d=>d.word!==current.word);
  shuffle(others);
  answers.push(...others.slice(0,3));
  shuffle(answers);
  answers.forEach(item=>{
    const btn=document.createElement('button');
    btn.className='option-btn';
    btn.innerHTML=`<strong>${item.word}</strong><br>
      <em>${item.pos}</em> [${item.phonetic}]`;
    btn.onclick=()=>selectAnswer(btn,item);
    document.querySelector('.options').append(btn);
  });
}
function selectAnswer(btn,item){
  document.querySelectorAll('.option-btn').forEach(b=>b.disabled=true);
  if(item.word===current.word) btn.classList.add('correct');
  else{
    btn.classList.add('wrong');
    document.querySelectorAll('.option-btn').forEach(b=>{
      if(b.innerText.includes(current.word)) b.classList.add('correct');
    });
  }
  // play pre-generated audio
  const file = `audio/${current.word.replace(/ /g,'_').replace(/\//g,'_')}.mp3`;
  new Audio(file).play();
  document.getElementById('next-btn').style.display='inline-block';
}
document.getElementById('next-btn').onclick=nextQuestion;
loadData();
