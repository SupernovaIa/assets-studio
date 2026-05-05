// slides-studio frontend — vanilla ES module, no build step.
// State lives in the client; the server is stateless.

const state = {
  brand: 'default',
  showLogo: true,
  slides: [],
  chats: [],
  selectedIndex: -1,
  markdown: '',
  infographic: null, // { imageUrl, html }
};

// ── Persistence ─────────────────────────────────────────────────────────────
const STORAGE_KEY = 'slides-studio:v1';

function saveState() {
  try {
    const snapshot = {
      brand: state.brand,
      showLogo: state.showLogo,
      slides: state.slides,
      chats: state.chats,
      selectedIndex: state.selectedIndex,
      markdown: state.markdown,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.warn('saveState failed', err);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (typeof s.brand === 'string') state.brand = s.brand;
    if (typeof s.showLogo === 'boolean') state.showLogo = s.showLogo;
    if (Array.isArray(s.slides)) state.slides = s.slides;
    if (Array.isArray(s.chats)) state.chats = s.chats;
    if (Number.isInteger(s.selectedIndex)) state.selectedIndex = s.selectedIndex;
    if (typeof s.markdown === 'string') state.markdown = s.markdown;
  } catch (err) {
    console.warn('loadState failed', err);
  }
}

// ── DOM helpers ─────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const setStatus = (el, text, kind = '') => {
  el.textContent = text;
  el.className = `status${kind ? ` ${kind}` : ''}`;
};

// ── API ─────────────────────────────────────────────────────────────────────
async function api(path, body, opts = {}) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res;
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}: ${url}`);
  return res.json();
}

// ── Brand selector ──────────────────────────────────────────────────────────
async function loadBrands() {
  const select = $('brand-select');
  try {
    const brands = await getJson('/api/brands');
    select.innerHTML = '';
    for (const b of brands) {
      const opt = document.createElement('option');
      opt.value = b.name;
      opt.textContent = b.displayName;
      select.appendChild(opt);
    }
    select.value = state.brand;
    select.addEventListener('change', () => {
      state.brand = select.value;
      saveState();
      // No LLM call needed: slides reference brand vars, so re-rendering
      // with a different brand recolours/refonts the deck for free.
      if (state.slides.length > 0) {
        refreshPreview();
      }
    });
  } catch (err) {
    select.innerHTML = '<option>error</option>';
    console.error(err);
  }
}

function initLogoToggle() {
  const cb = $('logo-toggle');
  if (!cb) return;
  cb.checked = state.showLogo;
  cb.addEventListener('change', () => {
    state.showLogo = cb.checked;
    saveState();
    if (state.slides.length > 0) {
      refreshPreview();
    }
  });
}

// ── Tabs ────────────────────────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      $(`${btn.dataset.tab}-tab`).classList.add('active');
    });
  });
}

// ── Slides ──────────────────────────────────────────────────────────────────
async function refreshPreview() {
  if (state.slides.length === 0) {
    $('slides-preview').srcdoc = '';
    return;
  }
  const res = await api('/api/slides/preview', { slides: state.slides, brand: state.brand, showLogo: state.showLogo });
  const html = await res.text();
  $('slides-preview').srcdoc = html;
}

function renderSlidesList() {
  const list = $('slides-list');
  list.innerHTML = '';
  state.slides.forEach((s, i) => {
    const li = document.createElement('li');
    li.className = s.type;
    if (i === state.selectedIndex) li.classList.add('selected');
    const title =
      s.type === 'cover' ? s.title :
      s.type === 'section' ? `${String(s.number).padStart(2, '0')}. ${s.title}` :
      s.type === 'content' ? s.title :
      s.text;
    li.innerHTML = `<span class="badge ${s.type}">${s.type}</span><span class="title"></span>`;
    li.querySelector('.title').textContent = title;
    if (s.type === 'content') {
      li.addEventListener('click', () => openEditPanel(i));
    }
    list.appendChild(li);
  });
}

function renderEditPanel() {
  const panel = $('slides-edit-panel');
  if (state.selectedIndex < 0) {
    panel.hidden = true;
    return;
  }
  const slide = state.slides[state.selectedIndex];
  const chat = state.chats[state.selectedIndex] ?? [];
  panel.hidden = false;
  $('edit-slide-label').textContent = slide.title;
  const ul = $('edit-chat');
  ul.innerHTML = '';
  for (const m of chat) {
    const li = document.createElement('li');
    li.className = m.role;
    li.textContent = `${m.role === 'user' ? '› ' : '✓ '}${m.content}`;
    ul.appendChild(li);
  }
  ul.scrollTop = ul.scrollHeight;
}

function openEditPanel(index) {
  state.selectedIndex = index;
  saveState();
  renderSlidesList();
  renderEditPanel();
  $('edit-message').focus();
}

function closeEditPanel() {
  state.selectedIndex = -1;
  saveState();
  renderSlidesList();
  renderEditPanel();
}

async function generateSlides() {
  const md = $('slides-md').value.trim();
  if (!md) { setStatus($('slides-status'), 'Pega markdown primero', 'error'); return; }

  const btn = $('slides-generate');
  btn.disabled = true;
  setStatus($('slides-status'), 'Generando outline + slides…');
  const t0 = Date.now();
  try {
    const res = await api('/api/slides/generate', { markdown: md, brand: state.brand });
    const data = await res.json();
    state.slides = data.slides;
    state.chats = data.slides.map(() => []);
    state.selectedIndex = -1;
    saveState();
    renderSlidesList();
    renderEditPanel();
    await refreshPreview();
    $('slides-download').disabled = false;
    setStatus($('slides-status'), `${data.slides.length} slides en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } catch (err) {
    setStatus($('slides-status'), err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function sendEdit() {
  if (state.selectedIndex < 0) return;
  const message = $('edit-message').value.trim();
  if (!message) return;

  const btn = $('edit-send');
  btn.disabled = true;
  setStatus($('edit-status'), 'Editando…');
  try {
    const res = await api('/api/slides/edit', {
      slides: state.slides,
      chats: state.chats,
      slideIndex: state.selectedIndex,
      message,
      brand: state.brand,
    });
    const data = await res.json();
    state.slides = data.slides;
    state.chats = data.chats;
    saveState();
    $('edit-message').value = '';
    renderEditPanel();
    await refreshPreview();
    setStatus($('edit-status'), 'Aplicado');
  } catch (err) {
    setStatus($('edit-status'), err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function downloadDeck() {
  if (state.slides.length === 0) return;
  setStatus($('slides-status'), 'Preparando descarga…');
  try {
    const res = await api('/api/slides/download', {
      slides: state.slides,
      brand: state.brand,
      showLogo: state.showLogo,
      filename: `${state.brand}-deck`,
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.brand}-deck.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus($('slides-status'), 'Descargado');
  } catch (err) {
    setStatus($('slides-status'), err.message, 'error');
  }
}

// ── Infographic ─────────────────────────────────────────────────────────────
async function generateInfographic() {
  const md = $('info-md').value.trim();
  if (!md) { setStatus($('info-status'), 'Pega markdown primero', 'error'); return; }

  const btn = $('info-generate');
  btn.disabled = true;
  setStatus($('info-status'), 'Generando brief + imagen (~2-3 min)…');
  const t0 = Date.now();
  try {
    const res = await api('/api/infographic', { markdown: md, brand: state.brand });
    const data = await res.json();
    state.infographic = data;
    const img = $('info-image');
    img.src = data.imageUrl;
    img.hidden = false;
    const a = $('info-download');
    a.href = data.imageUrl;
    a.download = `${state.brand}-infografia.png`;
    a.hidden = false;
    setStatus($('info-status'), `Listo en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } catch (err) {
    setStatus($('info-status'), err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

// ── Wire up ────────────────────────────────────────────────────────────────
async function rehydrate() {
  const ta = $('slides-md');
  if (ta && state.markdown) ta.value = state.markdown;
  if (state.slides.length > 0) {
    renderSlidesList();
    renderEditPanel();
    $('slides-download').disabled = false;
    await refreshPreview();
    setStatus($('slides-status'), `Restaurado: ${state.slides.length} slides`);
  }
}

function init() {
  loadState();
  initTabs();
  loadBrands();
  initLogoToggle();
  $('slides-generate').addEventListener('click', generateSlides);
  $('slides-download').addEventListener('click', downloadDeck);
  $('edit-send').addEventListener('click', sendEdit);
  $('edit-close').addEventListener('click', closeEditPanel);
  $('edit-message').addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') sendEdit();
  });
  $('slides-md').addEventListener('input', (e) => {
    state.markdown = e.target.value;
    saveState();
  });
  $('info-generate').addEventListener('click', generateInfographic);
  rehydrate();
}

init();
