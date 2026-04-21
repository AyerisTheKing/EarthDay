// v2.5

const SUPABASE_URL = "https://tdlhwokrmuyxsdleepht.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbGh3b2tybXV5eHNkbGVlcGh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MDc3ODAsImV4cCI6MjA4NDk4Mzc4MH0.RlfUmejx2ywHNcFofZM4mNE8nIw6qxaTNzqxmf4N4-4";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let gameStartTime = 0;
let stageStartTimes = [0, 0, 0, 0];
let stageDurations = [0, 0, 0, 0];

let totalScore = 0, currentStage = 1, stagesCompleted = [false, false, false, false];
let anagramCurrent = [];
let anagramWord = "";
let leaderboardReturnTo = 'screen-auth';

function playStageHint() {
  const indicator = document.getElementById('speaking-indicator');
  const emoji = document.getElementById('character-emoji');
  indicator.classList.add('active');
  
  // Dynamic audio selection supporting all stages including final (5)
  let audioToPlay = document.getElementById('audio-stage' + currentStage);
  
  if (audioToPlay) {
    if (!audioToPlay.paused) {
      audioToPlay.pause();
      indicator.classList.remove('active');
      emoji.style.animation = 'emojiBounce 2.5s ease-in-out infinite';
      return;
    }
    document.querySelectorAll('audio').forEach(a => { if (a !== audioToPlay) { a.pause(); a.currentTime = 0; } });
    audioToPlay.currentTime = 0;
    audioToPlay.play().catch(error => {
      console.log('Аудио не воспроизводится:', error);
      alert('🔊 Эко хочет дать подсказку!\n(Добавьте аудиофайл для этапа ' + currentStage + ')');
    });
    audioToPlay.onended = function() { indicator.classList.remove('active'); };
  } else {
    alert('🔊 Подсказка для этапа ' + currentStage + '\n(Аудиофайл не найден)');
    indicator.classList.remove('active');
  }
  
  emoji.style.animation = 'emojiBounce 0.4s ease 4';
  setTimeout(() => { emoji.style.animation = 'emojiBounce 2.5s ease-in-out infinite'; }, 1600);
}

function createMagicEffects() {
  const container = document.getElementById('magic-lights');
  for (let i = 0; i < 8; i++) {
    const orb = document.createElement('div'); orb.className = 'magic-orb';
    const size = 80 + Math.random() * 150;
    orb.style.width = size + 'px'; orb.style.height = size + 'px';
    orb.style.left = Math.random() * 100 + '%';
    orb.style.animationDuration = (15 + Math.random() * 20) + 's';
    orb.style.animationDelay = Math.random() * 15 + 's';
    container.appendChild(orb);
  }
  for (let i = 0; i < 30; i++) {
    const sparkle = document.createElement('div'); sparkle.className = 'sparkle';
    sparkle.style.left = Math.random() * 100 + '%'; sparkle.style.top = Math.random() * 100 + '%';
    sparkle.style.animationDuration = (2 + Math.random() * 4) + 's';
    sparkle.style.animationDelay = Math.random() * 5 + 's';
    container.appendChild(sparkle);
  }
  for (let i = 0; i < 5; i++) {
    const glow = document.createElement('div'); glow.className = 'glow-pulse';
    const size = 150 + Math.random() * 200;
    glow.style.width = size + 'px'; glow.style.height = size + 'px';
    glow.style.left = Math.random() * 100 + '%'; glow.style.top = Math.random() * 100 + '%';
    glow.style.animationDuration = (3 + Math.random() * 4) + 's';
    glow.style.animationDelay = Math.random() * 5 + 's';
    container.appendChild(glow);
  }
}

function createParticles() {
  const container = document.getElementById('particles');
  const emojis = ['🍃', '🌿', '🍄', '🌰', '🦋', '🐿️', '🌸', '🌲', '✨', '🌟'];
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div'); p.className = 'particle'; p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    p.style.left = Math.random() * 100 + '%'; p.style.fontSize = (18 + Math.random() * 28) + 'px';
    p.style.animationDuration = (10 + Math.random() * 15) + 's'; p.style.animationDelay = Math.random() * 12 + 's';
    container.appendChild(p);
  }
}

function launchConfetti() {
  const container = document.getElementById('confetti-container'); container.innerHTML = '';
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div'); piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%'; piece.style.width = (10 + Math.random() * 12) + 'px';
    piece.style.height = (10 + Math.random() * 12) + 'px'; piece.style.background = ['#4f772d','#90a955','#f4a261','#b5885d','#7f5539','#fefae0'][Math.floor(Math.random() * 6)];
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '3px';
    piece.style.animationDuration = (3 + Math.random() * 4) + 's'; piece.style.animationDelay = Math.random() * 3 + 's';
    container.appendChild(piece);
  }
  setTimeout(() => { container.innerHTML = ''; }, 7000);
}

async function checkSession() {
  // Используем getUser для проверки на сервере (заблокирует удаленные аккаунты)
  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (user && !error) {
    currentUser = user;
    document.getElementById('profile-me-btn').style.display = 'flex';
    startGame();
  } else {
    // Если аккаунта больше нет в БД — чистим кеш
    await supabaseClient.auth.signOut();
  }
}

async function authPlayer() {
  const nameInput = document.getElementById('auth-name').value.trim();
  const grade = document.getElementById('auth-grade').value;
  const letter = document.getElementById('auth-letter').value;
  const msg = document.getElementById('auth-message');
  
  if (!nameInput || !grade || !letter) {
    msg.textContent = 'Заполни имя, класс и букву!';
    return;
  }
  
  msg.textContent = 'Проверяем и регистрируем...';
  
  const cyrillicToLatin = (text) => {
    const ru = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 
      'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i', 
      'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 
      'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 
      'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 
      'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 
      'э': 'e', 'ю': 'yu', 'я': 'ya'
    };
    return text.toLowerCase().split('').map(c => ru[c] || c).join('').replace(/[^a-z0-9]/g, '');
  };

  const safeName = cyrillicToLatin(nameInput);
  const safeLetter = cyrillicToLatin(letter);
  const fakeEmail = `${safeName}_${grade}${safeLetter}@ecoplayer.com`;
  const fakePassword = 'eco_password_123';
  
  // Строгая регистрация: если такой аккаунт уже есть, он выдаст ошибку
  const { data, error } = await supabaseClient.auth.signUp({
    email: fakeEmail,
    password: fakePassword,
    options: {
      data: {
        display_name: nameInput,
        grade: grade,
        grade_letter: letter
      }
    }
  });
  
  if (error) {
    if (error.message.includes('already registered')) {
      msg.textContent = 'Это имя уже занято в твоем классе!';
    } else {
      msg.textContent = 'Ошибка: ' + error.message;
    }
    return;
  }
  
  currentUser = data?.user;
  document.getElementById('profile-me-btn').style.display = 'flex';
  msg.textContent = '';
  startGame();
let leaderboardData = [];

async function loadLeaderboard() {
  const tbody = document.getElementById('leaderboard-tbody');
  if (!tbody) return;
  try {
    const { data, error } = await supabaseClient.from('player_progress')
      .select('display_name, grade, grade_letter, total_score, total_time_seconds, stage1_time, stage2_time, stage3_time, stage4_time')
      .order('total_score', { ascending: false })
      .order('total_time_seconds', { ascending: true })
      .limit(10);
      
    if (error) throw error;
    
    leaderboardData = data || [];
    
    if (leaderboardData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Пока нет рекордсменов!</td></tr>';
      return;
    }
    
    tbody.innerHTML = '';
    leaderboardData.forEach((row, index) => {
      const rank = index + 1;
      let rankClass = '';
      if (rank === 1) rankClass = 'rank-1';
      else if (rank === 2) rankClass = 'rank-2';
      else if (rank === 3) rankClass = 'rank-3';
      
      const tr = document.createElement('tr');
      tr.className = 'leaderboard-row';
      tr.onclick = () => openPlayerProfile(index);
      
      const timeStr = Math.floor(row.total_time_seconds / 60) + ':' + (row.total_time_seconds % 60).toString().padStart(2, '0');
      tr.innerHTML = `
        <td class="${rankClass}">${rank === 1 ? '🥇 ' : rank === 2 ? '🥈 ' : rank === 3 ? '🥉 ' : ''}${rank}</td>
        <td>${row.display_name} (${row.grade}${row.grade_letter})</td>
        <td>⭐ ${row.total_score}</td>
        <td>⏱️ ${timeStr}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Ошибка загрузки лидеров:', err);
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Ошибка загрузки</td></tr>';
  }
}

// PROFILES & LEADERBOARD NAVIGATION

let profileReturnTo = 'screen-map';

function showProfileScreen(returnId) {
  profileReturnTo = returnId || 'screen-map';
  showScreen('screen-profile');
}
function hideProfileScreen() { showScreen(profileReturnTo); }

function renderProfile(player) {
  document.getElementById('profile-title').textContent = `👤 ${player.display_name} (${player.grade}${player.grade_letter})`;
  
  const t1 = player.stage1_time || 0; const t2 = player.stage2_time || 0;
  const t3 = player.stage3_time || 0; const t4 = player.stage4_time || 0;
  const total = player.total_time_seconds || 1; 

  const p1 = Math.round((t1/total)*100) || 0; const p2 = Math.round((t2/total)*100) || 0;
  const p3 = Math.round((t3/total)*100) || 0; const p4 = Math.round((t4/total)*100) || 0;
  
  const formatT = (sec) => Math.floor(sec/60) + ':' + (sec%60).toString().padStart(2, '0');

  document.getElementById('profile-content').innerHTML = `
    <div class="profile-stats">
      <div class="profile-stat-box">⭐ Очки: ${player.total_score}</div>
      <div class="profile-stat-box">⏱️ Общее время: ${formatT(total)}</div>
    </div>
    <div class="profile-stages">
       <div class="profile-stage-line">
          <div class="profile-stage-label">🌱 Этап 1</div>
          <div class="profile-stage-bar-bg"><div class="profile-stage-bar" style="width:${p1}%"></div></div>
          <div class="profile-stage-val">${formatT(t1)} (${p1}%)</div>
       </div>
       <div class="profile-stage-line">
          <div class="profile-stage-label">💧 Этап 2</div>
          <div class="profile-stage-bar-bg"><div class="profile-stage-bar" style="width:${p2}%"></div></div>
          <div class="profile-stage-val">${formatT(t2)} (${p2}%)</div>
       </div>
       <div class="profile-stage-line">
          <div class="profile-stage-label">🌬️ Этап 3</div>
          <div class="profile-stage-bar-bg"><div class="profile-stage-bar" style="width:${p3}%"></div></div>
          <div class="profile-stage-val">${formatT(t3)} (${p3}%)</div>
       </div>
       <div class="profile-stage-line">
          <div class="profile-stage-label">🔥 Этап 4</div>
          <div class="profile-stage-bar-bg"><div class="profile-stage-bar" style="width:${p4}%"></div></div>
          <div class="profile-stage-val">${formatT(t4)} (${p4}%)</div>
       </div>
    </div>
  `;
}

function openPlayerProfile(idx) {
  const player = leaderboardData[idx];
  if (!player) return;
  document.getElementById('profile-logout-container').style.display = 'none';
  renderProfile(player);
  showProfileScreen('screen-leaderboard');
}

async function openMyProfile() {
  if (!currentUser) return;
  document.getElementById('profile-title').textContent = `👤 Мой профиль`;
  document.getElementById('profile-content').innerHTML = '<div style="text-align:center;">Загрузка данных...</div>';
  document.getElementById('profile-logout-container').style.display = 'flex'; 
  
  let currentScreen = 'screen-map';
  document.querySelectorAll('.screen').forEach(s => { if(s.classList.contains('active')) currentScreen = s.id; });
  showProfileScreen(currentScreen === 'screen-profile' ? profileReturnTo : currentScreen);

  try {
    const { data } = await supabaseClient.from('player_progress').select('*').eq('user_id', currentUser.id).order('total_score', { ascending: false }).limit(1);
    if (data && data.length > 0) { renderProfile(data[0]); document.getElementById('profile-logout-container').style.display = 'flex'; }
    else {
      document.getElementById('profile-content').innerHTML = `
        <div style="text-align:center; font-weight:700; color:var(--forest-dark); margin:20px 0;">
          Вы еще не прошли игру до конца!<br><br>
          Как только вы соберете все 4 печати, здесь появятся ваши достижения.
        </div>
      `;
    }
  } catch(err) { document.getElementById('profile-content').innerHTML = 'Ошибка загрузки профиля.'; }
}

async function logoutPlayer() {
  if (!confirm('Вы уверены, что хотите выйти из аккаунта?')) return;
  await supabaseClient.auth.signOut();
  currentUser = null;
  document.getElementById('profile-me-btn').style.display = 'none';
  window.location.reload();
}

function showLeaderboardScreen(returnId) {
  leaderboardReturnTo = returnId || 'screen-auth';
  showScreen('screen-leaderboard');
  document.getElementById('leaderboard-tbody').innerHTML = '<tr><td colspan="4" style="text-align:center;">Загрузка данных...</td></tr>';
  loadLeaderboard();
}

function hideLeaderboardScreen() {
  showScreen(leaderboardReturnTo);
}

function showScreen(id) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); document.getElementById(id).classList.add('active'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function startGame() { 
  totalScore = 0; currentStage = 1; stagesCompleted = [false, false, false, false]; 
  stageDurations = [0, 0, 0, 0];
  gameStartTime = Date.now();
  updateProgress(); showScreen('screen-map'); updateMapUI(); 
}
function restartGame() { startGame(); }

function updateProgress() {
  const completedCount = stagesCompleted.filter(Boolean).length;
  const pct = Math.round((completedCount / 4) * 100);
  document.getElementById('progress-bar').style.width = pct + '%'; document.getElementById('progress-bar').textContent = pct + '%';
  document.getElementById('score-display').textContent = '⭐ ' + totalScore + ' очков';
  for (let i = 1; i <= 4; i++) {
    const circle = document.getElementById('stage-' + i + '-circle'); circle.classList.remove('active', 'completed');
    if (stagesCompleted[i - 1]) circle.classList.add('completed');
    else if (i === currentStage) circle.classList.add('active');
  }
}

function updateMapUI() {
  if (currentStage > 4) { showFinalScreen(); return; }
  const messages = [
    { text: 'Первая печать — <strong>Печать Жизни</strong> 🌱 — скрыта за знаниями! Ответь на вопросы о Дне Земли.', btn: '🧠 Начать испытание 1' },
    { text: 'Отлично! Печать Жизни сияет! Теперь ищем <strong>Печать Воды</strong> 💧. Соедини термины с определениями!', btn: '🔗 Начать испытание 2' },
    { text: 'Печать Воды восстановлена! Следующая — <strong>Печать Воздуха</strong> 🌬️. Найди слова в филворде!', btn: '🔍 Начать испытание 3' },
    { text: 'Почти готово! Последняя — <strong>Печать Огня</strong> 🔥. Собери слова из перемешанных букв!', btn: '🔤 Начать испытание 4' }
  ];
  const stageIdx = currentStage - 1;
  document.getElementById('map-character-text').innerHTML = messages[stageIdx].text;
  document.getElementById('map-next-btn').textContent = messages[stageIdx].btn;
  document.getElementById('map-next-btn').onclick = () => launchStage(currentStage);
}

function launchStage(n) {
  stageStartTimes[n - 1] = Date.now();
  if (n === 1) { showScreen('screen-quiz'); initQuiz(); }
  else if (n === 2) { showScreen('screen-matching'); initMatching(); }
  else if (n === 3) { showScreen('screen-wordsearch'); initWordSearch(); }
  else if (n === 4) { showScreen('screen-anagrams'); initAnagrams(); }
}

function completeStage(n) {
  stageDurations[n - 1] = Math.floor((Date.now() - stageStartTimes[n - 1]) / 1000);
  stagesCompleted[n - 1] = true;
  currentStage = n + 1;
  updateProgress();
  if (currentStage > 4) showFinalScreen();
  else { showScreen('screen-map'); updateMapUI(); }
}

function shuffleArray(arr) { 
  const a = [...arr]; 
  for (let i = a.length - 1; i > 0; i--) { 
    const j = Math.floor(Math.random() * (i + 1)); 
    [a[i], a[j]] = [a[j], a[i]]; 
  } 
  return a; 
}

// QUIZ
const quizData = [
  { question: "Когда отмечается Международный день Земли?", options: ["22 апреля", "5 июня", "15 марта", "1 сентября"], correct: 0, explanation: "День Земли отмечается 22 апреля с 1970 года." },
  { question: "Что относится к возобновляемым источникам энергии?", options: ["Каменный уголь", "Нефть", "Солнечная энергия", "Природный газ"], correct: 2, explanation: "Солнечная энергия — возобновляемый источник!" },
  { question: "Сколько лет может разлагаться пластиковая бутылка?", options: ["10 лет", "50 лет", "100 лет", "До 450 лет"], correct: 3, explanation: "Пластик разлагается до 450 лет! Сдавайте его на переработку." },
  { question: "Что такое «углеродный след»?", options: ["След от обуви", "Количество парниковых газов от деятельности человека", "Тёмное облако над заводом", "Рисунок углём"], correct: 1, explanation: "Это общее количество парниковых газов, выделяемых из-за нашей деятельности." },
  { question: "Какое дерево производит больше всего кислорода?", options: ["Берёза", "Тополь", "Сосна", "Дуб"], correct: 1, explanation: "Тополь — рекордсмен! Одно дерево обеспечивает кислородом 3 человек в год." },
  { question: "Что означает правило «3R» в экологии?", options: ["Run, Rest, Repeat", "Reduce, Reuse, Recycle", "Read, Research, Report", "Rain, River, Rocks"], correct: 1, explanation: "Reduce (сокращай), Reuse (используй повторно), Recycle (перерабатывай)." }
];
let quizIndex = 0, quizScore = 0;
function initQuiz() { quizIndex = 0; quizScore = 0; updateQuizScore(); showQuizQuestion(); }
function updateQuizScore() { document.getElementById('quiz-score').textContent = '⭐ ' + quizScore + ' / ' + quizData.length; }
function showQuizQuestion() {
  const q = quizData[quizIndex]; const letters = ['А', 'Б', 'В', 'Г'];
  let html = `<div class="quiz-question"><span class="quiz-number">${quizIndex + 1}</span>${q.question}</div><div class="quiz-options">`;
  q.options.forEach((opt, i) => html += `<button class="quiz-option" onclick="checkQuizAnswer(${i})" id="quiz-opt-${i}"><span class="option-letter">${letters[i]}</span>${opt}</button>`);
  html += '</div><div id="quiz-feedback"></div>';
  document.getElementById('quiz-content').innerHTML = html; document.getElementById('quiz-next-btn-container').style.display = 'none';
}
function checkQuizAnswer(idx) {
  const q = quizData[quizIndex]; document.querySelectorAll('.quiz-option').forEach(o => o.classList.add('disabled'));
  if (idx === q.correct) { document.getElementById('quiz-opt-' + idx).classList.add('correct'); document.getElementById('quiz-feedback').innerHTML = `<div class="quiz-feedback correct">✅ ${q.explanation}</div>`; quizScore++; totalScore += 10; }
  else { document.getElementById('quiz-opt-' + idx).classList.add('wrong'); document.getElementById('quiz-opt-' + q.correct).classList.add('correct'); document.getElementById('quiz-feedback').innerHTML = `<div class="quiz-feedback wrong">❌ ${q.explanation}</div>`; }
  updateQuizScore(); updateProgress(); setTimeout(() => { document.getElementById('quiz-next-btn-container').style.display = 'flex'; }, 1200);
}
function nextQuizQuestion() { quizIndex++; if (quizIndex < quizData.length) showQuizQuestion(); else completeStage(1); }

// MATCHING
const matchData = [
  { term: "♻️ Переработка", def: "Повторное использование отходов для создания новых продуктов" },
  { term: "🌊 Кислотные дожди", def: "Осадки с повышенной кислотностью из-за выбросов в атмосферу" },
  { term: "🏭 Парниковый эффект", def: "Нагрев атмосферы из-за накопления газов, удерживающих тепло" },
  { term: "🌳 Биоразнообразие", def: "Разнообразие живых организмов в экосистеме" },
  { term: "💨 Озоновый слой", def: "Защитный слой в атмосфере, задерживающий ультрафиолет" },
  { term: "🗑️ Свалка", def: "Место захоронения твёрдых бытовых отходов" }
];
let matchState = { selected: null, matched: 0, selectedSide: null };
function initMatching() {
  matchState = { selected: null, matched: 0, selectedSide: null };
  const shuffledTerms = shuffleArray(matchData);
  const shuffledDefs = shuffleArray(matchData);
  let html = '<div class="matching-container"><div class="matching-column"><div class="matching-column-title">📌 Термины</div>';
  shuffledTerms.forEach(item => { const realIdx = matchData.indexOf(item); html += `<button class="match-item" id="term-${realIdx}" onclick="selectMatch('term', ${realIdx})">${item.term}</button>`; });
  html += '</div><div class="matching-column"><div class="matching-column-title">📖 Определения</div>';
  shuffledDefs.forEach(item => { const realIdx = matchData.indexOf(item); html += `<button class="match-item" id="def-${realIdx}" onclick="selectMatch('def', ${realIdx})">${item.def}</button>`; });
  html += '</div></div><div id="match-feedback" style="text-align:center; margin-top:18px; font-weight:700;"></div>';
  document.getElementById('matching-content').innerHTML = html;
}
function selectMatch(side, idx) {
  const el = document.getElementById(side + '-' + idx); if (el.classList.contains('matched')) return;
  if (matchState.selected === null) { 
    matchState.selected = idx; matchState.selectedSide = side; el.classList.add('selected'); 
  } else {
    if (matchState.selectedSide === side) { 
      if (matchState.selected === idx) {
        el.classList.remove('selected');
        matchState.selected = null;
        matchState.selectedSide = null;
      } else {
        document.getElementById(side + '-' + matchState.selected).classList.remove('selected'); 
        matchState.selected = idx; 
        el.classList.add('selected'); 
      }
    } else {
      const firstIdx = matchState.selected; const firstEl = document.getElementById(matchState.selectedSide + '-' + firstIdx);
      if (firstIdx === idx) { 
        firstEl.classList.remove('selected'); firstEl.classList.add('matched'); el.classList.add('matched'); 
        matchState.matched++; totalScore += 10; matchState.selected = null; matchState.selectedSide = null; 
        document.getElementById('match-feedback').innerHTML = `<span style="color:var(--forest-dark);">✅ Верно! Пар найдено: ${matchState.matched} / ${matchData.length}</span>`; 
        updateProgress(); if (matchState.matched === matchData.length) setTimeout(() => completeStage(2), 1500); 
      } else { 
        firstEl.classList.remove('selected'); firstEl.classList.add('wrong-match'); el.classList.add('wrong-match'); 
        setTimeout(() => { firstEl.classList.remove('wrong-match'); el.classList.remove('wrong-match'); }, 600); 
        document.getElementById('match-feedback').innerHTML = `<span style="color:#c1121f;">❌ Не совпадает! Попробуй ещё раз.</span>`; 
        matchState.selected = null; matchState.selectedSide = null; 
      }
    }
  }
}

// WORD SEARCH
const wsGrid = [
  ['Э','К','О','Л','О','Г','И','Я','Ф','Д'],
  ['Ц','Ч','С','М','Ш','Щ','Ы','Ъ','Ю','Я'],
  ['П','Р','И','Р','О','Д','А','Б','Г','Д'],
  ['К','Л','М','Н','О','М','О','Р','Е','У'],
  ['В','О','Д','А','Ц','Ч','Ш','Щ','Ъ','Ы'],
  ['Г','О','З','О','Н','З','И','Й','К','Л'],
  ['Д','Е','Ё','Ж','З','И','Й','К','Л','М'],
  ['Л','Е','С','Ц','Ч','Ш','Щ','Ъ','Ы','Э'],
  ['Ю','Я','А','Б','М','Ы','В','Г','Д','Е'],
  ['Н','О','П','Р','С','Т','У','Ф','Х','Ц']
];
const wsWords = [
  { word: "ЭКОЛОГИЯ", startRow: 0, startCol: 0, dir: "right" },
  { word: "ПРИРОДА", startRow: 2, startCol: 0, dir: "right" },
  { word: "МОРЕ", startRow: 3, startCol: 5, dir: "right" },
  { word: "ВОДА", startRow: 4, startCol: 0, dir: "right" },
  { word: "ОЗОН", startRow: 5, startCol: 1, dir: "right" },
  { word: "ЛЕС", startRow: 7, startCol: 0, dir: "right" },
  { word: "МЫ", startRow: 8, startCol: 4, dir: "right" }
];
let wsState = { selected: [], found: [] };
function getWordCells(w) { const cells = []; let dr = 0, dc = 0; if (w.dir === "right") dc = 1; else if (w.dir === "down") dr = 1; else if (w.dir === "left") dc = -1; else if (w.dir === "up") dr = -1; for (let i = 0; i < w.word.length; i++) cells.push({ r: w.startRow + dr * i, c: w.startCol + dc * i }); return cells; }
function initWordSearch() {
  wsState = { selected: [], found: [] };
  let html = '<div class="wordsearch-wrapper"><div class="wordsearch-grid" id="ws-grid">';
  for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) html += `<div class="ws-cell" id="ws-${r}-${c}" onclick="wsClick(${r},${c})">${wsGrid[r][c]}</div>`;
  html += '</div></div><div style="text-align:center; font-weight:700; color:var(--forest-dark); margin-top:14px;">Найди слова:</div><div class="wordsearch-words" id="ws-words-list">';
  wsWords.forEach((w, i) => html += `<div class="ws-word" id="ws-word-${i}">${w.word}</div>`);
  html += '</div><div id="ws-feedback" style="text-align:center; margin-top:14px; font-weight:700; min-height:24px;"></div>';
  html += '<div class="btn-center"><button class="btn btn-secondary" onclick="clearWsSelection()" style="font-size:15px; padding:12px 22px; margin-top:10px;">🔄 Очистить выделение</button></div>';
  document.getElementById('wordsearch-content').innerHTML = html;
}
function wsClick(r, c) { const cell = document.getElementById(`ws-${r}-${c}`); if (cell.classList.contains('found')) return; if (cell.classList.contains('selected')) { cell.classList.remove('selected'); wsState.selected = wsState.selected.filter(s => !(s.r === r && s.c === c)); } else { cell.classList.add('selected'); wsState.selected.push({ r, c }); } checkWordSearch(); }
function checkWordSearch() {
  const selLen = wsState.selected.length;
  for (let i = 0; i < wsWords.length; i++) {
    if (wsState.found.includes(i)) continue;
    const w = wsWords[i]; if (w.word.length !== selLen) continue;
    const expectedCells = getWordCells(w);
    const match = expectedCells.every(exp => wsState.selected.some(sel => sel.r === exp.r && sel.c === exp.c));
    if (match) {
      wsState.found.push(i); expectedCells.forEach(ec => { const el = document.getElementById(`ws-${ec.r}-${ec.c}`); el.classList.remove('selected'); el.classList.add('found'); });
      document.getElementById('ws-word-' + i).classList.add('found'); totalScore += 10; updateProgress(); wsState.selected = [];
      document.getElementById('ws-feedback').innerHTML = `<span style="color:var(--forest-dark);">✅ Найдено: ${w.word}! (${wsState.found.length} / ${wsWords.length})</span>`;
      if (wsState.found.length === wsWords.length) setTimeout(() => completeStage(3), 1500); return;
    }
  }
  if (selLen > 10) clearWsSelection();
}
function clearWsSelection() { wsState.selected.forEach(s => document.getElementById(`ws-${s.r}-${s.c}`).classList.remove('selected')); wsState.selected = []; document.getElementById('ws-feedback').innerHTML = ''; }

// ANAGRAMS
const anagramData = [
  { word: "ПЛАСТИК", hint: "Материал, который загрязняет океаны и разлагается сотни лет", letters: "ПЛАСТИК" },
  { word: "КЛИМАТ", hint: "Изменение этого из-за деятельности человека — глобальная проблема", letters: "КЛИМАТ" },
  { word: "ЭНЕРГИЯ", hint: "Её можно получать от солнца, ветра и воды", letters: "ЭНЕРГИЯ" },
  { word: "КОМПОСТ", hint: "Удобрение из переработанных органических отходов", letters: "КОМПОСТ" },
  { word: "ЗАПОВЕДНИК", hint: "Территория, где природа охраняется от вмешательства человека", letters: "ЗАПОВЕДНИК" }
];
let anagramIndex = 0;
function initAnagrams() { anagramIndex = 0; showAnagram(); }
function showAnagram() {
  if (anagramIndex >= anagramData.length) { completeStage(4); return; }
  const a = anagramData[anagramIndex]; const shuffled = shuffleArray(a.letters.split('')); const wordLen = a.word.length;
  let html = `<div class="anagram-word"><div style="font-size:15px; color:var(--forest-mid); font-weight:700;">Слово ${anagramIndex + 1} из ${anagramData.length}</div><div class="anagram-hint">💡 ${a.hint}</div></div><div class="anagram-answer" id="anagram-answer">`;
  for (let i = 0; i < wordLen; i++) html += `<div class="anagram-slot" id="a-slot-${i}"></div>`;
  html += `</div><div class="anagram-letters" id="anagram-letters">`;
  shuffled.forEach((letter, i) => html += `<div class="anagram-letter" id="a-letter-${i}" onclick="anagramClick(${i}, '${letter}')">${letter}</div>`);
  html += `</div><div style="text-align:center; margin-top:18px;"><button class="btn btn-danger" onclick="anagramReset()" style="font-size:15px; padding:12px 22px;">🔄 Сбросить</button><button class="btn btn-secondary" onclick="anagramHint()" style="font-size:15px; padding:12px 22px; margin-left:10px;">💡 Подсказка</button></div><div id="anagram-feedback" style="text-align:center; margin-top:14px; font-weight:700; min-height:24px;"></div>`;
  document.getElementById('anagram-content').innerHTML = html; 
  anagramCurrent = []; 
  anagramWord = a.word;
}
function anagramClick(idx, letter) { 
  const letterEl = document.getElementById('a-letter-' + idx); 
  if (letterEl.classList.contains('used')) return; 
  letterEl.classList.add('used'); 
  anagramCurrent.push({ idx, letter }); 
  const slotIdx = anagramCurrent.length - 1; 
  const slot = document.getElementById('a-slot-' + slotIdx); 
  slot.textContent = letter; 
  slot.classList.add('filled'); 
  if (anagramCurrent.length === anagramWord.length) { 
    const attempt = anagramCurrent.map(x => x.letter).join(''); 
    if (attempt === anagramWord) { 
      document.getElementById('anagram-feedback').innerHTML = `<span style="color:var(--forest-dark);">✅ Правильно! Слово: ${anagramWord}</span>`; 
      totalScore += 15; 
      updateProgress(); 
      setTimeout(() => { anagramIndex++; showAnagram(); }, 1500); 
    } else { 
      document.getElementById('anagram-feedback').innerHTML = `<span style="color:#9d0208;">❌ Неверно! Попробуй ещё раз.</span>`; 
      setTimeout(() => { anagramReset(); }, 1000); 
    } 
  } 
}
function anagramReset() { 
  anagramCurrent.forEach(x => document.getElementById('a-letter-' + x.idx).classList.remove('used')); 
  anagramCurrent = []; 
  for (let i = 0; i < anagramWord.length; i++) { 
    const slot = document.getElementById('a-slot-' + i); 
    slot.textContent = ''; 
    slot.classList.remove('filled'); 
  } 
  document.getElementById('anagram-feedback').innerHTML = ''; 
}
function anagramHint() { 
  const w = anagramWord; 
  document.getElementById('anagram-feedback').innerHTML = `<span style="color:var(--forest-mid);">💡 Первая буква: «${w[0]}», последняя: «${w[w.length - 1]}», всего ${w.length} букв</span>`; 
}

// FINAL
async function saveProgress() {
  if (!currentUser) return;
  const meta = currentUser.user_metadata || {};
  const totalTime = Math.floor((Date.now() - gameStartTime) / 1000);
  await supabaseClient.from('player_progress').insert([
    { 
      user_id: currentUser.id, 
      display_name: meta.display_name || 'Аноним',
      grade: parseInt(meta.grade) || null,
      grade_letter: meta.grade_letter || '',
      total_score: totalScore, 
      total_time_seconds: totalTime,
      stage1_time: stageDurations[0],
      stage2_time: stageDurations[1],
      stage3_time: stageDurations[2],
      stage4_time: stageDurations[3]
    }
  ]);
}

function showFinalScreen() {
  saveProgress();
  showScreen('screen-final'); document.getElementById('final-score').textContent = '⭐ ' + totalScore + ' очков';
  const maxScore = 60 + 60 + 70 + 75; const pct = totalScore / maxScore;
  let stars = 1, message = '', charText = '';
  if (pct >= 0.85) { stars = 3; message = '🌟 Великолепно! Ты — настоящий Хранитель Земли!'; charText = 'Четыре печати восстановлены благодаря твоим знаниям и стараниям! Земля снова в безопасности. Спасибо, герой! 🌍💚'; }
  else if (pct >= 0.55) { stars = 2; message = '👏 Отличная работа! Большинство печатей сияют!'; charText = 'Ты справился очень хорошо! Печати стали ярче. Продолжай изучать экологию и беречь природу каждый день! 🌱'; }
  else { stars = 1; message = '💪 Хорошее начало! Попробуй пройти ещё раз!'; charText = 'Не расстраивайся! Каждый день — возможность узнать что-то новое о планете. Попробуй снова, и ты станешь настоящим Хранителем! 🌿'; }
  document.getElementById('final-message').textContent = message; document.getElementById('final-character-text').textContent = charText;
  const starsContainer = document.getElementById('final-stars'); starsContainer.innerHTML = '';
  for (let i = 0; i < 3; i++) { const span = document.createElement('span'); span.className = 'star'; span.textContent = i < stars ? '⭐' : '☆'; span.style.animationDelay = (0.25 + i * 0.35) + 's'; if (i >= stars) { span.style.opacity = '0.35'; span.style.fontSize = '48px'; } starsContainer.appendChild(span); }
  if (stars >= 2) launchConfetti();
}

window.onload = function() { 
  createMagicEffects(); 
  createParticles(); 
  checkSession(); 
};}
