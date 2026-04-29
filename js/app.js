/* ============================================
   Interview Resources — app.js
   ============================================ */

const STORAGE_KEY = 'ir_progress_v1';

// ─── State ──────────────────────────────────
let allData = [];
let activeFilter = 'all';
let searchQuery = '';
let viewMode = 'all'; // 'all' | 'bookmarks'
let activeModal = null; // { resourceId, tab }

// ─── Load / Save Progress ────────────────────
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { bookmarks: {}, read: {}, lastRead: null, discussions: {} };
  } catch { return { bookmarks: {}, read: {}, lastRead: null, discussions: {} }; }
}

function saveProgress(p) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

let progress = loadProgress();

// ─── Fetch Data ──────────────────────────────
async function fetchData() {
  try {
    const res = await fetch('data/resources.json');
    const json = await res.json();
    allData = json.categories;
  } catch (e) {
    console.error('Failed to load resources.json', e);
    allData = [];
  }
}

// ─── Helpers ────────────────────────────────
function isNew(resource) {
  if (!resource.isNew) return false;
  const added = new Date(resource.addedDate);
  const days = (Date.now() - added) / 86400000;
  return days <= 30;
}

function getResourceById(id) {
  for (const cat of allData) {
    const r = cat.resources.find(r => r.id === id);
    if (r) return { resource: r, category: cat };
  }
  return null;
}

function getMergedDiscussions(resourceId, repoDiscussions) {
  const local = progress.discussions[resourceId] || [];
  return [...(repoDiscussions || []), ...local];
}

// ─── Render ──────────────────────────────────
function render() {
  const query = searchQuery.toLowerCase();
  const container = document.getElementById('sections-container');
  container.innerHTML = '';
  let totalVisible = 0;

  // Last Read banner
  renderLastRead();

  // Render bookmarks view
  if (viewMode === 'bookmarks') {
    renderBookmarks(container);
    return;
  }

  // Progress bar
  renderProgressBar();

  allData.forEach(cat => {
    if (activeFilter !== 'all' && activeFilter !== cat.id) return;

    const filtered = cat.resources.filter(r => {
      if (!query) return true;
      return r.name.toLowerCase().includes(query) || r.desc.toLowerCase().includes(query);
    });

    if (filtered.length === 0) return;
    totalVisible += filtered.length;

    const section = document.createElement('div');
    section.className = 'section';
    section.setAttribute('data-category', cat.id);
    section.innerHTML = `
      <div class="section-header">
        <div class="section-icon" style="background:${cat.iconBg}">${cat.icon}</div>
        <span class="section-title">${cat.label}</span>
        <span class="section-count">${filtered.length} resource${filtered.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="resource-grid">
        ${filtered.map(r => renderCard(r, cat)).join('')}
      </div>
    `;
    container.appendChild(section);
  });

  if (totalVisible === 0 && viewMode === 'all') {
    container.innerHTML = `<div class="empty-state">No resources found for "<strong>${escHtml(searchQuery)}</strong>"</div>`;
  }

  document.getElementById('total-stat').innerHTML = `<strong>${totalVisible}</strong> resources`;
  attachCardListeners();
}

function renderCard(r, cat) {
  const bookmarked = !!progress.bookmarks[r.id];
  const read = !!progress.read[r.id];
  const allDiscussions = getMergedDiscussions(r.id, r.discussions);
  const dCount = allDiscussions.length;
  const qCount = (r.interviewQuestions || []).length;

  return `
    <div class="resource-card ${bookmarked ? 'bookmarked' : ''} ${read ? 'read' : ''}"
         data-id="${r.id}" data-href="${escHtml(r.href)}">
      <div class="resource-card-top">
        <span class="resource-name">${escHtml(r.name)}</span>
        <svg class="resource-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M5 15L15 5M15 5H8M15 5v7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <p class="resource-desc">${escHtml(r.desc)}</p>
      <div class="resource-footer">
        <span class="tag" style="background:${cat.tagBg};color:${cat.tagColor}">${cat.label}</span>
        ${r.isHot ? '<span class="badge-hot">🔥 Hot</span>' : ''}
        ${isNew(r) ? '<span class="badge-new">✨ New</span>' : ''}
        <span class="resource-type">.${r.type}</span>
      </div>
      <div class="card-actions">
        <button class="card-btn bookmark-btn ${bookmarked ? 'active' : ''}" data-id="${r.id}" title="Bookmark">
          <svg viewBox="0 0 20 20" fill="${bookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.7">
            <path d="M5 3h10a1 1 0 011 1v13l-6-3-6 3V4a1 1 0 011-1z" stroke-linejoin="round"/>
          </svg>
          ${bookmarked ? 'Saved' : 'Save'}
        </button>
        <button class="card-btn discuss-btn" data-id="${r.id}" title="Discussions">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7">
            <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6l-4 2V5z" stroke-linejoin="round"/>
          </svg>
          ${dCount > 0 ? dCount : ''} Discuss
        </button>
        <button class="card-btn iq-btn" data-id="${r.id}" title="Interview Questions">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7">
            <circle cx="10" cy="10" r="8"/>
            <path d="M10 7v1.5a2 2 0 000 4V14" stroke-linecap="round"/>
            <circle cx="10" cy="15.5" r="0.5" fill="currentColor"/>
          </svg>
          ${qCount > 0 ? qCount : ''} Q&amp;A
        </button>
        <button class="card-btn read-btn ${read ? 'active' : ''}" data-id="${r.id}" title="Mark as read">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7">
            <path d="M3 10l5 5L17 5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          ${read ? 'Read' : 'Mark read'}
        </button>
      </div>
    </div>
  `;
}

function renderBookmarks(container) {
  const bookmarkedIds = Object.keys(progress.bookmarks).filter(id => progress.bookmarks[id]);
  if (bookmarkedIds.length === 0) {
    container.innerHTML = `<div class="empty-state">No bookmarks yet. Click <strong>Save</strong> on any resource card to bookmark it.</div>`;
    return;
  }

  const section = document.createElement('div');
  section.className = 'section';
  const cards = [];

  for (const cat of allData) {
    for (const r of cat.resources) {
      if (bookmarkedIds.includes(r.id)) {
        cards.push(renderCard(r, cat));
      }
    }
  }

  section.innerHTML = `
    <div class="section-header">
      <div class="section-icon" style="background:#fef9c3">🔖</div>
      <span class="section-title">Bookmarks</span>
      <span class="section-count">${cards.length} saved</span>
    </div>
    <div class="resource-grid">${cards.join('')}</div>
  `;
  container.appendChild(section);
  attachCardListeners();
}

function renderLastRead() {
  const lr = progress.lastRead;
  const wrap = document.getElementById('last-read-section');
  if (!lr) { wrap.classList.remove('visible'); return; }

  const found = getResourceById(lr.id);
  if (!found) { wrap.classList.remove('visible'); return; }

  const { resource } = found;
  wrap.classList.add('visible');
  wrap.innerHTML = `
    <span class="lr-label">↩ Last Read</span>
    <div>
      <div class="lr-name">${escHtml(resource.name)}</div>
      <div class="lr-desc">${escHtml(resource.desc)}</div>
    </div>
    <a href="${escHtml(resource.href)}" target="_blank" rel="noopener">Continue →</a>
  `;
}

function renderProgressBar() {
  let total = 0, readCount = 0;
  allData.forEach(cat => {
    total += cat.resources.length;
    cat.resources.forEach(r => { if (progress.read[r.id]) readCount++; });
  });

  const pct = total > 0 ? Math.round((readCount / total) * 100) : 0;
  const wrap = document.getElementById('progress-bar-wrap');
  if (wrap) {
    wrap.querySelector('.progress-fill').style.width = pct + '%';
    wrap.querySelector('.progress-label').innerHTML =
      `<strong>${readCount}/${total}</strong> resources read &nbsp;·&nbsp; ${pct}%`;
  }
}

// ─── Event Listeners ─────────────────────────
function attachCardListeners() {
  // Card click → open resource link (unless a button was clicked)
  document.querySelectorAll('.resource-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.card-btn')) return;
      const href = card.dataset.href;
      const id = card.dataset.id;
      // Track last read
      progress.lastRead = { id };
      saveProgress(progress);
      window.open(href, '_blank', 'noopener');
    });
  });

  // Bookmark toggle
  document.querySelectorAll('.bookmark-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      progress.bookmarks[id] = !progress.bookmarks[id];
      if (!progress.bookmarks[id]) delete progress.bookmarks[id];
      saveProgress(progress);
      render();
      showToast(progress.bookmarks[id] ? 'Bookmarked!' : 'Bookmark removed');
    });
  });

  // Mark read
  document.querySelectorAll('.read-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      progress.read[id] = !progress.read[id];
      if (!progress.read[id]) delete progress.read[id];
      saveProgress(progress);
      render();
      showToast(progress.read[id] ? 'Marked as read ✓' : 'Unmarked');
    });
  });

  // Open discuss modal
  document.querySelectorAll('.discuss-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openModal(btn.dataset.id, 'discussion');
    });
  });

  // Open Q&A modal
  document.querySelectorAll('.iq-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openModal(btn.dataset.id, 'iq');
    });
  });
}

// ─── Modal ───────────────────────────────────
function openModal(resourceId, tab) {
  const found = getResourceById(resourceId);
  if (!found) return;
  const { resource, category } = found;

  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal');

  const discussions = getMergedDiscussions(resourceId, resource.discussions);
  const questions = resource.interviewQuestions || [];

  modal.innerHTML = `
    <div class="modal-header">
      <div class="modal-header-info">
        <h2>${escHtml(resource.name)}</h2>
        <p>${escHtml(resource.desc)}</p>
      </div>
      <button class="modal-close" id="modal-close-btn">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 5l10 10M15 5L5 15" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="modal-tabs">
      <button class="modal-tab ${tab === 'discussion' ? 'active' : ''}" data-tab="discussion">
        💬 Discussion ${discussions.length > 0 ? `(${discussions.length})` : ''}
      </button>
      <button class="modal-tab ${tab === 'iq' ? 'active' : ''}" data-tab="iq">
        ❓ Interview Q&A ${questions.length > 0 ? `(${questions.length})` : ''}
      </button>
    </div>
    <div class="modal-body" id="modal-body"></div>
  `;

  renderModalTab(resourceId, tab, resource);

  overlay.classList.add('open');
  activeModal = { resourceId, tab };

  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

  modal.querySelectorAll('.modal-tab').forEach(t => {
    t.addEventListener('click', () => {
      modal.querySelectorAll('.modal-tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      renderModalTab(resourceId, t.dataset.tab, resource);
    });
  });
}

function renderModalTab(resourceId, tab, resource) {
  const body = document.getElementById('modal-body');
  if (!body) return;

  if (tab === 'discussion') {
    const discussions = getMergedDiscussions(resourceId, resource.discussions);
    body.innerHTML = `
      <div class="discussion-list">
        ${discussions.length > 0
          ? discussions.map(d => `
            <div class="discussion-item">
              <div class="discussion-meta">
                <strong>${escHtml(d.author)}</strong>
                <span>${d.date}</span>
              </div>
              <div class="discussion-text">${escHtml(d.text)}</div>
            </div>
          `).join('')
          : `<div class="empty-modal">No discussions yet. Be the first to start one!<br><small style="margin-top:6px;display:block">Discussions from the repo are loaded from <code>data/resources.json</code>.<br>Your local comments are saved in your browser.</small></div>`
        }
      </div>
      <div class="discussion-form">
        <input type="text" id="disc-author" placeholder="Your name or alias" maxlength="40" />
        <textarea id="disc-text" placeholder="Share your thoughts, tips, or questions…"></textarea>
        <button class="btn-submit" id="disc-submit">Post Comment</button>
      </div>
    `;

    document.getElementById('disc-submit').addEventListener('click', () => {
      const author = document.getElementById('disc-author').value.trim();
      const text = document.getElementById('disc-text').value.trim();
      if (!author || !text) { showToast('Please fill in both fields'); return; }

      const newComment = { id: 'u' + Date.now(), author, text, date: new Date().toISOString().split('T')[0] };
      if (!progress.discussions[resourceId]) progress.discussions[resourceId] = [];
      progress.discussions[resourceId].push(newComment);
      saveProgress(progress);
      renderModalTab(resourceId, 'discussion', resource);
      showToast('Comment posted locally ✓');
    });

  } else {
    const questions = resource.interviewQuestions || [];
    const local = progress.discussions['iq_' + resourceId] || [];

    body.innerHTML = `
      <div class="iq-list">
        ${questions.length > 0
          ? questions.map(q => `<div class="iq-item">${escHtml(q)}</div>`).join('')
          : `<div class="empty-modal">No interview questions yet.</div>`
        }
        ${local.map(q => `<div class="iq-item" style="border-left: 2px solid var(--accent-border)">${escHtml(q.text)}</div>`).join('')}
      </div>
      <div class="discussion-form">
        <textarea id="iq-text" placeholder="Add an interview question you encountered…" rows="3"></textarea>
        <button class="btn-submit" id="iq-submit">Add Question (local)</button>
      </div>
      <p style="font-size:11.5px;color:var(--text-muted);margin-top:8px">
        💡 To add permanently, open a PR editing <code>data/resources.json</code> — see README.
      </p>
    `;

    document.getElementById('iq-submit').addEventListener('click', () => {
      const text = document.getElementById('iq-text').value.trim();
      if (!text) return;
      const key = 'iq_' + resourceId;
      if (!progress.discussions[key]) progress.discussions[key] = [];
      progress.discussions[key].push({ id: 'u' + Date.now(), text, date: new Date().toISOString().split('T')[0] });
      saveProgress(progress);
      renderModalTab(resourceId, 'iq', resource);
      showToast('Question saved locally ✓');
    });
  }
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  activeModal = null;
}

// ─── Toast ───────────────────────────────────
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

// ─── Download / Import Progress ──────────────
function downloadProgress() {
  const blob = new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'interview-resources-progress.json';
  a.click();
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      progress = { ...loadProgress(), ...imported };
      saveProgress(progress);
      render();
      showToast('Progress imported ✓');
    } catch { showToast('Invalid file'); }
  };
  reader.readAsText(file);
}

// ─── Escape HTML ─────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Init ────────────────────────────────────
async function init() {
  await fetchData();

  // Build filter chips from data
  const filterBar = document.getElementById('filter-bar');
  filterBar.innerHTML = `<button class="filter-chip active" data-filter="all">All</button>` +
    allData.map(c => `<button class="filter-chip" data-filter="${c.id}">${c.label}</button>`).join('');

  filterBar.addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = chip.dataset.filter;
    render();
  });

  document.getElementById('search-input').addEventListener('input', e => {
    searchQuery = e.target.value;
    if (searchQuery) {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      document.querySelector('[data-filter="all"]').classList.add('active');
      activeFilter = 'all';
    }
    render();
  });

  // Bookmarks toggle
  document.getElementById('btn-bookmarks').addEventListener('click', () => {
    viewMode = viewMode === 'bookmarks' ? 'all' : 'bookmarks';
    const btn = document.getElementById('btn-bookmarks');
    btn.classList.toggle('active', viewMode === 'bookmarks');
    render();
  });

  // Download progress
  document.getElementById('btn-download').addEventListener('click', downloadProgress);

  // Import progress
  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('import-input').click();
  });
  document.getElementById('import-input').addEventListener('change', e => {
    if (e.target.files[0]) importProgress(e.target.files[0]);
  });

  // Keyboard close modal
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  render();
}

document.addEventListener('DOMContentLoaded', init);
