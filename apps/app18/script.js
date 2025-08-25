/* Memory Grid - App 18 */
(function () {
  const GRID_SIZE = 8; // 8x8
  const board = document.getElementById('board');
  const startBtn = document.getElementById('startBtn');
  const resetBtn = document.getElementById('resetBtn');
  const levelEl = document.getElementById('level');
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const messageEl = document.getElementById('message');

  /**
   * Game state
   */
  let level = 1;
  let score = 0;
  let lives = 3;
  let showing = false;
  let accepting = false;
  let targetSet = new Set(); // cells to remember
  let pickedSet = new Set(); // player's picks

  /**
   * Helpers
   */
  function rng(maxExclusive) {
    return Math.floor(Math.random() * maxExclusive);
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function setMessage(text) {
    messageEl.textContent = text || '';
  }

  function updateHud() {
    levelEl.textContent = String(level);
    scoreEl.textContent = String(score);
    livesEl.textContent = String(lives);
  }

  function clamp(min, val, max) { return Math.max(min, Math.min(val, max)); }

  /**
   * Grid
   */
  const totalCells = GRID_SIZE * GRID_SIZE;
  const cellElements = [];
  function buildGrid() {
    board.innerHTML = '';
    cellElements.length = 0;
    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell locked';
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `Cell ${i + 1}`);
      const btn = document.createElement('button');
      btn.addEventListener('click', () => onPick(i));
      cell.appendChild(btn);
      board.appendChild(cell);
      cellElements.push(cell);
    }
  }

  function setCellsLocked(isLocked) {
    for (const cell of cellElements) {
      if (isLocked) cell.classList.add('locked');
      else cell.classList.remove('locked');
    }
  }

  /**
   * Round lifecycle
   */
  function determinePatternSizeForLevel(lvl) {
    // Start at 4 cells, increase every level, but cap to 16
    return clamp(3, 3 + Math.floor((lvl - 1) * 0.75), 16);
  }

  function determineShowMsForLevel(lvl) {
    // Shorten reveal time as level increases
    const base = 1600; // ms
    const decay = Math.min(900, (lvl - 1) * 60);
    return clamp(600, base - decay, 1800);
  }

  function determineScorePerCorrect(lvl) {
    return 10 + Math.floor(lvl * 2);
  }

  function determinePenaltyPerWrong(lvl) {
    return 3 + Math.floor(lvl * 1.5);
  }

  function generatePattern(count) {
    const chosen = new Set();
    while (chosen.size < count) {
      chosen.add(rng(totalCells));
    }
    return chosen;
  }

  async function showPattern(set) {
    setMessage('Memorize the highlighted squares…');
    showing = true;
    setCellsLocked(true);
    for (const idx of set) {
      cellElements[idx].classList.add('show');
    }
    await delay(determineShowMsForLevel(level));
    for (const idx of set) {
      cellElements[idx].classList.remove('show');
    }
    showing = false;
  }

  function startGuessing() {
    setMessage('Now select the squares.');
    pickedSet.clear();
    setCellsLocked(false);
    accepting = true;
    startBtn.disabled = true;
  }

  function endGuessing() {
    accepting = false;
    setCellsLocked(true);
    startBtn.disabled = false;
  }

  function onPick(idx) {
    if (!accepting) return;
    if (pickedSet.has(idx)) return; // ignore double-clicks
    pickedSet.add(idx);

    const isCorrect = targetSet.has(idx);
    const cell = cellElements[idx];
    cell.classList.add(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
      score += determineScorePerCorrect(level);
    } else {
      score = Math.max(0, score - determinePenaltyPerWrong(level));
      lives -= 1;
    }
    updateHud();

    // Check round completion
    const allFound = [...targetSet].every((c) => pickedSet.has(c));
    const exhausted = pickedSet.size >= targetSet.size && !allFound;

    if (lives <= 0) {
      revealMissed();
      setMessage('Game Over. Press Start to play again.');
      resetForNewGame();
      endGuessing();
      return;
    }

    if (allFound) {
      setMessage('Nice! Advancing to next level…');
      endGuessing();
      level += 1;
      updateHud();
      // brief pause before next round
      setTimeout(() => void startRound(), 700);
      return;
    }

    if (exhausted) {
      // Player picked as many as pattern but was not fully correct
      revealMissed();
      setMessage('Close! Try again.');
      endGuessing();
      // repeat same level with a fresh pattern
      setTimeout(() => void startRound(), 800);
    }
  }

  function revealMissed() {
    for (const idx of targetSet) {
      if (!pickedSet.has(idx)) {
        cellElements[idx].classList.add('show');
      }
    }
    setTimeout(() => {
      for (const idx of targetSet) {
        cellElements[idx].classList.remove('show');
      }
      // clear marks
      for (const c of cellElements) c.classList.remove('correct', 'wrong');
    }, 700);
  }

  async function startRound() {
    // clear visual state
    for (const c of cellElements) c.classList.remove('correct', 'wrong', 'show');
    // generate pattern size based on level
    const count = determinePatternSizeForLevel(level);
    targetSet = generatePattern(count);
    await showPattern(targetSet);
    startGuessing();
  }

  function resetVisuals() {
    for (const c of cellElements) c.classList.remove('correct', 'wrong', 'show');
  }

  function resetForNewGame() {
    level = 1;
    score = 0;
    lives = 3;
    updateHud();
  }

  async function handleStart() {
    if (showing || accepting) return; // ignore during a round
    // Start new game if lives are at zero
    if (lives <= 0) resetForNewGame();
    pickedSet.clear();
    resetVisuals();
    await startRound();
  }

  function handleReset() {
    pickedSet.clear();
    resetForNewGame();
    resetVisuals();
    setMessage('');
    endGuessing();
  }

  // init
  buildGrid();
  updateHud();
  setCellsLocked(true);
  startBtn.addEventListener('click', () => void handleStart());
  resetBtn.addEventListener('click', handleReset);
})();


