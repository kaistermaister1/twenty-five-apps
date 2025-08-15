(() => {
  const STORAGE_KEYS = {
    categories: 'tt_categories_v1',
    sessions: 'tt_sessions_v1',
    active: 'tt_active_v1'
  };

  /**
   * Utility formatting
   */
  const formatMs = (ms) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const loadJson = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  };
  const saveJson = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  /**
   * State
   */
  let categories = loadJson(STORAGE_KEYS.categories, ['Work', 'Study', 'Exercise']);
  let sessions = loadJson(STORAGE_KEYS.sessions, []);
  let active = loadJson(STORAGE_KEYS.active, null); // {category, start}
  let selectedRange = 'today'; // 'today' | 'all'

  /**
   * Elements
   */
  const categorySelect = document.getElementById('categorySelect');
  const startStopBtn = document.getElementById('startStopBtn');
  const nowPlaying = document.getElementById('nowPlaying');
  const activeCategoryEl = document.getElementById('activeCategory');
  const activeElapsedEl = document.getElementById('activeElapsed');
  const overview = document.getElementById('overview');
  const recentSessions = document.getElementById('recentSessions');
  const recentSection = document.getElementById('recentSessionsSection');

  const settingsDialog = document.getElementById('settingsDialog');
  const openSettings = document.getElementById('openSettings');
  const closeSettings = document.getElementById('closeSettings');
  const categoryList = document.getElementById('categoryList');
  const newCategoryInput = document.getElementById('newCategoryInput');
  const addCategoryBtn = document.getElementById('addCategoryBtn');
  const tabToday = document.getElementById('tabToday');
  const tabAll = document.getElementById('tabAll');

  /**
   * Rendering
   */
  const renderCategories = () => {
    categorySelect.innerHTML = '';
    for (const name of categories) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      categorySelect.appendChild(opt);
    }
    if (active) {
      categorySelect.value = active.category;
    }
  };

  const renderSettingsList = () => {
    categoryList.innerHTML = '';
    categories.forEach((name) => {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.className = 'name';
      span.textContent = name;
      const remove = document.createElement('button');
      remove.className = 'remove';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        if (active && active.category === name) return; // don't allow removing active
        if (categories.length <= 1) return; // keep at least one category
        categories = categories.filter(c => c !== name);
        saveJson(STORAGE_KEYS.categories, categories);
        renderCategories();
        renderSettingsList();
        renderOverview();
      });
      li.appendChild(span);
      li.appendChild(remove);
      categoryList.appendChild(li);
    });
  };

  const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const withinRange = (session) => {
    if (selectedRange === 'all') return true;
    const today = new Date();
    const s = new Date(session.start);
    return isSameDay(today, s);
  };

  const computeTotals = () => {
    const totals = new Map();
    for (const c of categories) totals.set(c, 0);
    for (const s of sessions) {
      if (!withinRange(s)) continue;
      const duration = Math.max(0, (s.end ?? Date.now()) - s.start);
      totals.set(s.category, (totals.get(s.category) || 0) + duration);
    }
    if (active && withinRange({ start: active.start })) {
      totals.set(active.category, (totals.get(active.category) || 0) + (Date.now() - active.start));
    }
    return totals;
  };

  const renderOverview = () => {
    const totals = computeTotals();
    overview.innerHTML = '';
    categories.forEach((c) => {
      const row = document.createElement('div');
      row.className = 'row';
      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = c;
      const time = document.createElement('div');
      time.className = 'time';
      time.textContent = formatMs(totals.get(c) || 0);
      row.appendChild(label);
      row.appendChild(time);
      overview.appendChild(row);
    });
  };

  const renderRecent = () => {
    const items = sessions.slice(-10).reverse();
    recentSessions.innerHTML = '';
    if (items.length === 0) {
      recentSection.hidden = true;
      return;
    }
    recentSection.hidden = false;
    for (const s of items) {
      const row = document.createElement('div');
      row.className = 'session';
      const left = document.createElement('div');
      left.textContent = s.category;
      const right = document.createElement('div');
      right.className = 'meta';
      const startDt = new Date(s.start);
      const endDt = s.end ? new Date(s.end) : null;
      const dur = formatMs((s.end ?? Date.now()) - s.start);
      right.textContent = `${startDt.toLocaleString()} — ${endDt ? endDt.toLocaleTimeString() : 'running'} · ${dur}`;
      row.appendChild(left);
      row.appendChild(right);
      recentSessions.appendChild(row);
    }
  };

  const renderActive = () => {
    if (active) {
      nowPlaying.hidden = false;
      activeCategoryEl.textContent = active.category;
      startStopBtn.textContent = 'Stop';
      categorySelect.disabled = true;
    } else {
      nowPlaying.hidden = true;
      startStopBtn.textContent = 'Start';
      categorySelect.disabled = false;
    }
  };

  /**
   * Behavior
   */
  let tickInterval = null;
  const startTick = () => {
    if (tickInterval) return;
    tickInterval = setInterval(() => {
      if (active) {
        activeElapsedEl.textContent = formatMs(Date.now() - active.start);
        renderOverview();
      }
    }, 1000);
  };
  const stopTick = () => { if (tickInterval) { clearInterval(tickInterval); tickInterval = null; } };

  const startSession = () => {
    const category = categorySelect.value || categories[0];
    if (!category) return;
    active = { category, start: Date.now() };
    saveJson(STORAGE_KEYS.active, active);
    activeElapsedEl.textContent = '00:00:00';
    renderActive();
    renderRecent();
    startTick();
  };

  const stopSession = () => {
    if (!active) return;
    const finished = { category: active.category, start: active.start, end: Date.now() };
    sessions.push(finished);
    saveJson(STORAGE_KEYS.sessions, sessions);
    active = null;
    saveJson(STORAGE_KEYS.active, active);
    renderActive();
    renderOverview();
    renderRecent();
    stopTick();
  };

  startStopBtn.addEventListener('click', () => {
    if (active) stopSession(); else startSession();
  });

  // Tabs
  const setRange = (range) => {
    selectedRange = range;
    tabToday.classList.toggle('active', range === 'today');
    tabAll.classList.toggle('active', range === 'all');
    renderOverview();
  };
  tabToday.addEventListener('click', () => setRange('today'));
  tabAll.addEventListener('click', () => setRange('all'));

  // Settings dialog
  openSettings.addEventListener('click', () => {
    renderSettingsList();
    if (typeof settingsDialog.showModal === 'function') settingsDialog.showModal();
  });
  closeSettings.addEventListener('click', (e) => {
    e.preventDefault();
    settingsDialog.close();
  });
  addCategoryBtn.addEventListener('click', () => {
    const name = newCategoryInput.value.trim();
    if (!name) return;
    if (!categories.includes(name)) {
      categories.push(name);
      saveJson(STORAGE_KEYS.categories, categories);
      renderCategories();
      renderSettingsList();
      renderOverview();
    }
    newCategoryInput.value = '';
    newCategoryInput.focus();
  });

  // Init
  renderCategories();
  renderActive();
  renderOverview();
  renderRecent();
  if (active) startTick();
})();
  