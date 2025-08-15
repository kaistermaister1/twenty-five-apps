const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const screenUpload = $('#screen-upload');
const screenSwipe = $('#screen-swipe');
const screenResults = $('#screen-results');

const fileInput = $('#fileInput');
const fileCount = $('#fileCount');
const startBtn = $('#startBtn');
const backToUpload = $('#backToUpload');
const toResults = $('#toResults');
const progressText = $('#progressText');

const cardStack = $('#cardStack');
const btnLike = $('#btnLike');
const btnNope = $('#btnNope');

const likedGrid = $('#likedGrid');
const passedGrid = $('#passedGrid');
const likedCount = $('#likedCount');
const passedCount = $('#passedCount');
const restartBtn = $('#restartBtn');

let photos = [];
let currentIndex = 0;
let liked = [];
let passed = [];

function showScreen(target) {
  for (const s of [screenUpload, screenSwipe, screenResults]) {
    s.classList.add('hidden');
    s.classList.remove('active');
  }
  target.classList.remove('hidden');
  target.classList.add('active');
}

function updateFileCount() {
  const count = fileInput.files?.length || 0;
  fileCount.textContent = count ? `${count} photo${count>1?'s':''} selected` : 'No photos selected';
  startBtn.disabled = count === 0;
}

fileInput.addEventListener('change', updateFileCount);

startBtn.addEventListener('click', async () => {
  const files = Array.from(fileInput.files || []);
  if (!files.length) return;
  // Convert to object URLs for fast display
  photos = files.map((f) => ({ url: URL.createObjectURL(f), name: f.name }));
  currentIndex = 0;
  liked = [];
  passed = [];
  buildStack();
  updateProgress();
  showScreen(screenSwipe);
});

backToUpload.addEventListener('click', () => {
  cleanupObjectUrls();
  resetAll();
  showScreen(screenUpload);
});

toResults.addEventListener('click', () => {
  finishAndShowResults();
});

restartBtn.addEventListener('click', () => {
  cleanupObjectUrls();
  resetAll();
  showScreen(screenUpload);
});

function resetAll() {
  photos = [];
  currentIndex = 0;
  liked = [];
  passed = [];
  cardStack.innerHTML = '';
  likedGrid.innerHTML = '';
  passedGrid.innerHTML = '';
  fileInput.value = '';
  updateFileCount();
}

function cleanupObjectUrls() {
  for (const p of photos) {
    try { URL.revokeObjectURL(p.url); } catch {}
  }
}

function buildStack() {
  cardStack.innerHTML = '';
  const slice = photos.slice(currentIndex);
  slice.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.zIndex = String(100 - i);
    card.style.transform = `translate3d(0, ${i*2}px, 0) scale(${1 - i*0.02})`;
    card.innerHTML = `
      <img src="${p.url}" alt="photo" />
      <div class="badge like" style="opacity:0">LIKE</div>
      <div class="badge nope" style="opacity:0">NOPE</div>
    `;
    attachDrag(card, p);
    cardStack.appendChild(card);
  });
}

function updateProgress() {
  progressText.textContent = `${Math.min(currentIndex + 1, photos.length)}/${photos.length}`;
}

function attachDrag(card, photo) {
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  let isDragging = false;

  const likeBadge = card.querySelector('.badge.like');
  const nopeBadge = card.querySelector('.badge.nope');

  const onPointerDown = (e) => {
    isDragging = true;
    startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    startY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    currentX = (e.clientX || (e.touches && e.touches[0].clientX) || 0) - startX;
    currentY = (e.clientY || (e.touches && e.touches[0].clientY) || 0) - startY;
    const rot = currentX / 20;
    const likeOpacity = Math.min(Math.max(currentX / 100, 0), 1);
    const nopeOpacity = Math.min(Math.max(-currentX / 100, 0), 1);
    card.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rot}deg)`;
    likeBadge.style.opacity = String(likeOpacity);
    nopeBadge.style.opacity = String(nopeOpacity);
  };

  const commitDecision = (direction) => {
    isDragging = false;
    card.style.transition = 'transform 240ms ease-out, opacity 240ms ease-out';
    const flyX = direction === 'right' ? window.innerWidth : -window.innerWidth;
    card.style.transform = `translate(${flyX}px, ${currentY}px) rotate(${direction==='right'?20:-20}deg)`;
    card.style.opacity = '0';
    setTimeout(() => {
      card.remove();
      if (direction === 'right') {
        liked.push(photo);
      } else {
        passed.push(photo);
      }
      currentIndex += 1;
      if (currentIndex >= photos.length) {
        finishAndShowResults();
      } else {
        updateProgress();
        // Ensure the next card has handlers and proper transforms
        if (!cardStack.querySelector('.card')) buildStack();
      }
    }, 220);
  };

  const onPointerUp = () => {
    if (!isDragging) return;
    const threshold = 80;
    if (currentX > threshold) {
      commitDecision('right');
    } else if (currentX < -threshold) {
      commitDecision('left');
    } else {
      card.style.transition = 'transform 180ms ease-out';
      card.style.transform = '';
      likeBadge.style.opacity = '0';
      nopeBadge.style.opacity = '0';
      isDragging = false;
    }
  };

  // Mouse + touch support without PointerEvents requirement
  card.addEventListener('mousedown', onPointerDown, { passive: true });
  card.addEventListener('mousemove', onPointerMove, { passive: true });
  window.addEventListener('mouseup', onPointerUp, { passive: true });

  card.addEventListener('touchstart', onPointerDown, { passive: true });
  card.addEventListener('touchmove', onPointerMove, { passive: true });
  card.addEventListener('touchend', onPointerUp, { passive: true });
}

btnLike.addEventListener('click', () => programmaticSwipe('right'));
btnNope.addEventListener('click', () => programmaticSwipe('left'));

function programmaticSwipe(direction) {
  const top = cardStack.querySelector('.card');
  if (!top) return;
  // Trigger a quick decision animation
  const event = new Event('mousedown');
  top.dispatchEvent(event);
  // Simulate quick commit
  const photo = photos[currentIndex];
  top.style.transition = 'transform 240ms ease-out, opacity 240ms ease-out';
  const flyX = direction === 'right' ? window.innerWidth : -window.innerWidth;
  top.style.transform = `translate(${flyX}px, 0) rotate(${direction==='right'?20:-20}deg)`;
  top.style.opacity = '0';
  setTimeout(() => {
    top.remove();
    if (direction === 'right') liked.push(photo); else passed.push(photo);
    currentIndex += 1;
    if (currentIndex >= photos.length) finishAndShowResults(); else updateProgress();
  }, 220);
}

function finishAndShowResults() {
  likedGrid.innerHTML = '';
  passedGrid.innerHTML = '';
  likedCount.textContent = String(liked.length);
  passedCount.textContent = String(passed.length);
  for (const p of liked) {
    const img = document.createElement('img');
    img.src = p.url; img.alt = 'liked';
    likedGrid.appendChild(img);
  }
  for (const p of passed) {
    const img = document.createElement('img');
    img.src = p.url; img.alt = 'passed';
    passedGrid.appendChild(img);
  }
  showScreen(screenResults);
}
  