// ------------------- CONFIGURATION -------------------
const SOUND_FILE = "sound.mp3";

// ------------------- DOM elements -------------------
const phaseLabelEl = document.getElementById("phaseLabel");
const timerDisplayEl = document.getElementById("timerDisplay");
const mainBtn = document.getElementById("mainActionBtn");
const resetBtn = document.getElementById("resetBtn");
// Поля ввода временных интервалов
const workInput = document.getElementById('workDurationInput');
const breakInput = document.getElementById('breakDurationInput');

// ------------------- Audio setup -------------------
const audio = new Audio(SOUND_FILE);
audio.preload = "auto";

// ------------------- State machine -------------------
class AppState {
  static INIT = "init";
  static RUNNING = "running";
  static PAUSE = "pause";
  static WAITING_FOR_NEXT = "waiting_for_next";
}
class PeriodState {
  static WORK = "work";
  static BREAK = "break";
}
let appState = AppState.INIT;
let periodState = PeriodState.WORK;
let timerIntervalId = null;
/**
 * Время начала текущего интервала
 */
let startDateTime = null;
/**
 * Время конца текущего интервала
 */
let targetEndDateTime = null;
let workSeconds = 25 * 60;
let breakSeconds = 5 * 60;
/**
 * Отображаемое оставшееся время в секундах
 */
let timeLeftSeconds = workSeconds;
/**
 * Кол-во оставшихся минут, указываемых в названии вкладки
 */
let minsLeftInTitle = null;

// ------------------- Helper: format mm:ss -------------------
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getMins(seconds) {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  return Math.floor(seconds / 60);
}

// ------------------- UI update -------------------
function refreshUI() {
  if (periodState === PeriodState.WORK) {
    phaseLabelEl.textContent = "🍅 WORK";
  } else {
    phaseLabelEl.textContent = "☕ BREAK";
  }
  
  refreshTimerUI()
  switch (appState) {
    case AppState.INIT:
      mainBtn.textContent = "▶ START";
      break;
    case AppState.RUNNING:
      mainBtn.textContent = "⏸ PAUSE";
      break;
    case AppState.PAUSE:
      mainBtn.textContent = "▶ RESUME";
      break;
    case AppState.WAITING_FOR_NEXT:
      mainBtn.textContent = "▶▶ NEXT INTERVAL";
      break;
  }
}

function refreshTimerUI() {
  if (minsLeftInTitle != getMins(timeLeftSeconds)) {
    minsLeftInTitle = getMins(timeLeftSeconds)
    document.title = (periodState === PeriodState.WORK ? "🍅" : "☕") + minsLeftInTitle + " min left"
  }
  timerDisplayEl.textContent = formatTime(timeLeftSeconds);
}

// ------------------- Audio control -------------------

function primeAudio() {
  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.then(() => {
      audio.pause();
      audio.currentTime = 0;
    }).catch(err => console.warn("Audio prime failed:", err));
  }
}

function playEndSound() {
  audio.loop = true;
  audio.currentTime = 0;
  audio.play().catch(err => console.warn("Sound play blocked:", err));
}

// ------------------- Main controls -------------------
function stopTimer() {
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
}

function startTimer() {
  if (!timeLeftSeconds || timeLeftSeconds === workSeconds || timeLeftSeconds === breakSeconds || timeLeftSeconds <= 0) {
    timeLeftSeconds = periodState === PeriodState.WORK ? workSeconds : breakSeconds;
  }
  startDateTime = Date.now();
  targetEndDateTime = startDateTime + timeLeftSeconds * 1000;
  startCountdown(500);
}

function resumeTimer() {
  targetEndDateTime = Date.now() + timeLeftSeconds * 1000;
  startCountdown(500);
}

function startCountdown(delayMs) {
  if (timerIntervalId) clearInterval(timerIntervalId);
  
  function updateTimer() {
    timeLeftSeconds = Math.max(0, Math.ceil((targetEndDateTime - Date.now()) / 1000));
    refreshTimerUI();
    
    if (timeLeftSeconds <= 0) {
      clearInterval(timerIntervalId);
      handleIntervalEnd();
    }
  }
  updateTimer()
  if (appState === AppState.RUNNING) {
    timerIntervalId = setInterval(updateTimer, delayMs);
  }
}

function handleIntervalEnd() {
  stopTimer()
  appState = AppState.WAITING_FOR_NEXT;
  timeLeftSeconds = 0;
  playEndSound();
  refreshUI();

  // 🟢 МЕСТО ДЛЯ СТАТИСТИКИ: здесь можно записать завершённый интервал в localStorage
  // saveCompletedInterval(currentPhase);
}

function proceedToNextInterval() {
  stopTimer()
  periodState = periodState === PeriodState.WORK ? PeriodState.BREAK : PeriodState.WORK;
  appState = AppState.RUNNING;
  primeAudio();
  startTimer();
  refreshUI();
}

function fullReset() {
  stopTimer();
  appState = AppState.INIT;
  periodState = PeriodState.WORK;
  timeLeftSeconds = workSeconds;
  primeAudio();
  refreshUI();
}

// ------------------- Event handlers -------------------
function onMainButtonClick() {
  if (appState === AppState.INIT) {
    appState = AppState.RUNNING;
    startTimer();
    refreshUI();
    return;
  }
  if (appState === AppState.RUNNING) {
    stopTimer();
    appState = AppState.PAUSE;
    refreshUI();
    return;
  }
  if (appState === AppState.PAUSE) {
    appState = AppState.RUNNING;
    resumeTimer();
    refreshUI();
    return;
  }
  if (appState === AppState.WAITING_FOR_NEXT) {
    proceedToNextInterval();
  }
}

function onReset() {
  fullReset();
}

// Функция обновления внутренних переменных из полей
function updateDurationsFromInputs() {
    let newWork = parseInt(workInput.value, 10);
    let newBreak = parseInt(breakInput.value, 10);
    
    // Валидация: если не число или меньше 1, ставим значение по умолчанию
    if (isNaN(newWork) || newWork < 1) newWork = 25;
    if (isNaN(newBreak) || newBreak < 1) newBreak = 5;
    
    workSeconds = newWork * 60;
    breakSeconds = newBreak * 60;

    fullReset()
}

function updateIntervalOnVisibilityChange() {
  if (appState != AppState.RUNNING) {
    return;
  }
  if (document.hidden) {
    startCountdown(60000);
  } else {
    startCountdown(500);
  }
  if (!document.hidden) {
    refreshTimerUI();
  }
}


// ------------------- Attach listeners -------------------
mainBtn.addEventListener("click", onMainButtonClick);
resetBtn.addEventListener("click", onReset);
workInput.addEventListener('change', updateDurationsFromInputs);
breakInput.addEventListener('change', updateDurationsFromInputs);
document.addEventListener('visibilitychange', updateIntervalOnVisibilityChange);

// ------------------- Initialisation -------------------
fullReset(); // ensures clean start