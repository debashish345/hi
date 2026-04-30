// ─── State ──────────────────────────────────────────────────────────────
const state = {
  data: null,
  activeCategory: 'all',
  searchQuery: '',
  completed: JSON.parse(localStorage.getItem('completed-resources') || '{}'),
  favourites: JSON.parse(localStorage.getItem('favourite-sections') || '{}'),
};

// ─── Fetch Data ─────────────────────────────────────────────────────────
async function fetchData() {
  try {
    const res = await fetch('resources.json');
    state.data = await res.json();
  } catch (e) {
    console.error('Failed to load resources.json — trying GitHub raw', e);
    try {
      const res = await fetch('https://raw.githubusercontent.com/debashish345/hi/refs/heads/main/resources.json');
      state.data = await res.json();
    } catch (e2) {
      console.error('Failed to load from GitHub as well', e2);
      state.data = { categories: [], meta: {} };
    }
  }
  init();
}

// ─── Init ───────────────────────────────────────────────────────────────
function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const resourceSlug = urlParams.get('article') || urlParams.get('resource') || urlParams.get('slug');

  if (resourceSlug) {
    const resource = findResourceBySlug(resourceSlug);
    if (resource) {
      renderResourceView(resource);
      return;
    }
  }

  // Normal view
  document.getElementById('category-tabs').classList.remove('hidden');
  document.getElementById('main-content').classList.remove('hidden');
  document.getElementById('resource-viewer').classList.add('hidden');
  renderCategoryTabs();
  renderContent();
  bindSearch();
  bindHeaderTabs();
  bindClearFilters();
  bindThemeToggle();
}

// ─── Find Resource by Slug ──────────────────────────────────────────────
function findResourceBySlug(slug) {
  if (!state.data || !state.data.categories) return null;
  const flat = flattenResources(state.data.categories, {});
  return flat.find(r => r.slug === slug || r.id === slug);
}

// ─── Theme Toggle ───────────────────────────────────────────────────────
function bindThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle');
  if (!toggleBtn) return;
  
  const iconSun = toggleBtn.querySelector('.icon-sun');
  const iconMoon = toggleBtn.querySelector('.icon-moon');
  
  // Check local storage or system preference
  const currentTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  
  if (currentTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    iconSun.style.display = 'block';
    iconMoon.style.display = 'none';
  }
  
  toggleBtn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
      iconSun.style.display = 'none';
      iconMoon.style.display = 'block';
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      iconSun.style.display = 'block';
      iconMoon.style.display = 'none';
    }
    
    // Dispatch event so Monaco editor can update its theme if it's open
    window.dispatchEvent(new Event('themeChanged'));
  });
}

// ─── Category Tabs ──────────────────────────────────────────────────────
function renderCategoryTabs() {
  const container = document.querySelector('.tabs-inner');
  const { categories } = state.data;

  let html = `<button class="cat-tab ${state.activeCategory === 'all' ? 'active' : ''}" data-cat="all">All</button>`;

  categories.forEach(cat => {
    html += `<button class="cat-tab ${state.activeCategory === cat.id ? 'active' : ''}" data-cat="${cat.id}">${cat.icon} ${cat.label}</button>`;
  });

  container.innerHTML = html;

  container.querySelectorAll('.cat-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeCategory = btn.dataset.cat;
      renderCategoryTabs();
      renderContent();
    });
  });
}

// ─── Flatten All Resources ──────────────────────────────────────────────
function flattenResources(subcategories, catMeta) {
  const results = [];
  if (!subcategories) return results;

  subcategories.forEach(sub => {
    if (sub.resources) {
      sub.resources.forEach(r => {
        results.push({
          ...r,
          subLabel: sub.label,
          subId: sub.id,
          ...catMeta,
        });
      });
    }
    if (sub.subcategories) {
      sub.subcategories.forEach(nested => {
        if (nested.resources) {
          nested.resources.forEach(r => {
            results.push({
              ...r,
              subLabel: `${sub.label} › ${nested.label}`,
              subId: nested.id,
              ...catMeta,
            });
          });
        }
      });
    }
  });

  return results;
}

// ─── Get Sections for Rendering ─────────────────────────────────────────
function getSections() {
  const { categories } = state.data;
  const sections = [];

  const catsToShow = state.activeCategory === 'all'
    ? categories
    : categories.filter(c => c.id === state.activeCategory);

  catsToShow.forEach(cat => {
    const catMeta = { catId: cat.id, catLabel: cat.label, catColor: cat.color, catIcon: cat.icon };

    if (cat.subcategories) {
      cat.subcategories.forEach(sub => {
        if (sub.resources && sub.resources.length > 0) {
          const resources = sub.resources.map(r => ({ ...r, ...catMeta, subLabel: sub.label, subId: sub.id }));
          const filtered = filterResources(resources);
          if (filtered.length > 0) {
            sections.push({
              id: sub.id,
              label: sub.label,
              icon: cat.icon,
              color: cat.color,
              catLabel: cat.label,
              resources: filtered,
            });
          }
        }

        // Nested subcategories (e.g., LLD > Easy)
        if (sub.subcategories) {
          sub.subcategories.forEach(nested => {
            if (nested.resources && nested.resources.length > 0) {
              const resources = nested.resources.map(r => ({
                ...r, ...catMeta,
                subLabel: `${sub.label} › ${nested.label}`,
                subId: nested.id,
              }));
              const filtered = filterResources(resources);
              if (filtered.length > 0) {
                sections.push({
                  id: nested.id,
                  label: `${sub.label} › ${nested.label}`,
                  icon: cat.icon,
                  color: cat.color,
                  catLabel: cat.label,
                  resources: filtered,
                });
              }
            }
          });
        }
      });
    }
  });

  return sections;
}

// ─── Filter ─────────────────────────────────────────────────────────────
function filterResources(resources) {
  if (!state.searchQuery) return resources;

  return resources.filter(r =>
    r.title.toLowerCase().includes(state.searchQuery) ||
    r.description.toLowerCase().includes(state.searchQuery) ||
    r.tags.some(t => t.toLowerCase().includes(state.searchQuery))
  );
}

// ─── Render Content ─────────────────────────────────────────────────────
function renderContent() {
  const main = document.getElementById('main-content');
  const emptyState = document.getElementById('empty-state');
  const sections = getSections();

  if (sections.length === 0) {
    main.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  main.innerHTML = sections.map(section => `
    <div class="section" id="section-${section.id}">
      <div class="section-header">
        <div class="section-left">
          <span class="section-icon">${section.icon}</span>
          <span class="section-title">${section.label}</span>
          <span class="section-count">${section.resources.length} resource${section.resources.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="section-right">
          <button class="section-fav" data-section="${section.id}" onclick="toggleFavourite('${section.id}')">
            ${state.favourites[section.id] ? '★ Favourited' : 'Favourites'}
          </button>
        </div>
      </div>
      <div class="card-grid">
        ${section.resources.map(r => renderCard(r)).join('')}
      </div>
    </div>
  `).join('');
}

// ─── Render Card ────────────────────────────────────────────────────────
function renderCard(r) {
  const isChecked = state.completed[r.id] || false;
  const tagClass = `tag-${r.catId || 'default'}`;
  const diffClass = `tag-${r.difficulty.toLowerCase()}`;

  const tags = r.tags.slice(0, 3).map(t =>
    `<span class="card-tag ${tagClass}">${t}</span>`
  ).join('');

  return `
    <div class="resource-card" onclick="openResource('${r.path}', '${r.type}', '${r.title}', '${r.id}', '${r.slug || r.id}')">
      <div class="card-top">
        <span class="card-title">${r.title}</span>
        <button class="card-check ${isChecked ? 'checked' : ''}" onclick="event.stopPropagation(); toggleComplete('${r.id}', this)" title="Mark as completed">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
      </div>
      <p class="card-desc">${r.description}</p>
      <div class="card-tags">
        ${tags}
        <span class="card-tag ${diffClass}">${r.difficulty}</span>
      </div>
    </div>
  `;
}

// ─── Toggle Complete ────────────────────────────────────────────────────
function toggleComplete(id, btn) {
  state.completed[id] = !state.completed[id];
  localStorage.setItem('completed-resources', JSON.stringify(state.completed));

  if (state.completed[id]) {
    btn.classList.add('checked');
  } else {
    btn.classList.remove('checked');
  }
}

// ─── Toggle Favourite ───────────────────────────────────────────────────
function toggleFavourite(sectionId) {
  state.favourites[sectionId] = !state.favourites[sectionId];
  localStorage.setItem('favourite-sections', JSON.stringify(state.favourites));
  renderContent();
}

// ─── Resource Opening ───────────────────────────────────────────────────
function openResource(path, type, title, id, slug) {
  const urlSlug = slug || id;
  const url = `?article=${urlSlug}`;
  window.history.pushState({ slug: urlSlug }, '', url);
  
  const resource = findResourceBySlug(urlSlug) || { path, type, title, id, slug: urlSlug };
  renderResourceView(resource);
}

// ─── Render Resource View ───────────────────────────────────────────────
async function renderResourceView(resource) {
  document.getElementById('category-tabs').classList.add('hidden');
  document.getElementById('main-content').classList.add('hidden');
  const viewer = document.getElementById('resource-viewer');
  viewer.classList.remove('hidden');
  
  const frame = document.getElementById('resource-content-frame');
  frame.innerHTML = ''; // clear

  if (resource.type === 'lld') {
    // Inject LLD Template
    const template = document.getElementById('lld-template');
    frame.appendChild(template.content.cloneNode(true));
    // Trigger lld-viewer init logic but dynamically
    if (window.initLLDViewer) {
      window.initLLDViewer(resource.id);
    }
  } else {
    // For HTML, fetch the content
    try {
      frame.innerHTML = `<div class="loader-spinner" style="margin:40px auto; display:block;"></div>`;
      const res = await fetch(resource.path);
      const htmlText = await res.text();
      // Extract everything inside .container or body
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      const content = doc.querySelector('.container') || doc.body;
      // Remove any inner back links
      const backLinks = content.querySelectorAll('.back');
      backLinks.forEach(b => b.remove());
      
      frame.innerHTML = '';
      frame.appendChild(content);

      // Initialize the Mini Tree
      if (typeof window.initMiniTree === 'function') {
        window.initMiniTree(frame);
      }
    } catch (e) {
      frame.innerHTML = `<div class="error-screen"><p>Failed to load content.</p></div>`;
    }
  }
}

// ─── Mini Tree Navigation (Table of Contents) ───────────────────────────
window.initMiniTree = function(container) {
  const headings = Array.from(container.querySelectorAll('h2, h3'));
  if (headings.length === 0) return;

  // Create container layout
  const wrapper = document.createElement('div');
  wrapper.className = 'article-layout';
  
  const contentCol = document.createElement('div');
  contentCol.className = 'article-content-col';
  
  const tocCol = document.createElement('div');
  tocCol.className = 'article-toc-col';

  // Move existing children to contentCol
  while (container.firstChild) {
    contentCol.appendChild(container.firstChild);
  }

  // Build TOC
  const tocTitle = document.createElement('div');
  tocTitle.className = 'toc-title';
  tocTitle.textContent = 'ON THIS PAGE';
  tocCol.appendChild(tocTitle);

  const tocList = document.createElement('ul');
  tocList.className = 'toc-list';

  // Using IntersectionObserver to track active section
  const observer = new IntersectionObserver((entries) => {
    // Only care about headings currently intersecting
    const visibleEntries = entries.filter(entry => entry.isIntersecting);
    if (visibleEntries.length > 0) {
      // Pick the first visible heading
      const activeId = visibleEntries[0].target.id;
      document.querySelectorAll('.toc-link').forEach(l => l.classList.remove('active'));
      const activeLink = tocList.querySelector(`.toc-link[href="#${activeId}"]`);
      if (activeLink) activeLink.classList.add('active');
    }
  }, { rootMargin: '0px 0px -80% 0px' });

  headings.forEach((heading, index) => {
    // Ensure the heading has an ID
    if (!heading.id) {
      const text = heading.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      heading.id = `heading-${index}-${text}`;
    }
    
    const li = document.createElement('li');
    li.className = `toc-item toc-${heading.tagName.toLowerCase()}`;
    
    const a = document.createElement('a');
    a.href = `#${heading.id}`;
    a.className = 'toc-link';
    a.textContent = heading.innerText; // InnerText avoids getting HTML like <span class="bar">
    
    a.addEventListener('click', (e) => {
      e.preventDefault();
      // Scroll offset to account for any fixed headers if needed
      const top = heading.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
      
      document.querySelectorAll('.toc-link').forEach(l => l.classList.remove('active'));
      a.classList.add('active');
    });

    li.appendChild(a);
    tocList.appendChild(li);
    
    observer.observe(heading);
  });

  // Set the first link as active initially
  if (tocList.firstChild) {
    tocList.firstChild.querySelector('.toc-link').classList.add('active');
  }

  tocCol.appendChild(tocList);
  wrapper.appendChild(contentCol);
  wrapper.appendChild(tocCol);
  container.appendChild(wrapper);
};

// Handle back button clicks in SPA
window.addEventListener('popstate', (e) => {
  init();
});

document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('close-viewer-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      window.history.pushState({}, '', window.location.pathname);
      init();
    });
  }
});

// ─── Search ─────────────────────────────────────────────────────────────
function bindSearch() {
  const input = document.getElementById('search-input');
  let debounceTimer;

  input.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      renderContent();
    }, 200);
  });
}

// ─── Header Tabs (All Items / For You) ──────────────────────────────────
function bindHeaderTabs() {
  document.querySelectorAll('.header-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.header-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      if (tab.dataset.tab === 'for-you') {
        // Show only favourited sections or completed items
        state.showForYou = true;
        renderForYou();
      } else {
        state.showForYou = false;
        renderContent();
      }
    });
  });
}

// ─── For You View ───────────────────────────────────────────────────────
function renderForYou() {
  const main = document.getElementById('main-content');
  const emptyState = document.getElementById('empty-state');
  const sections = getSections();

  // Filter to only favourited sections or sections with completed items
  const favSections = sections.filter(s =>
    state.favourites[s.id] ||
    s.resources.some(r => state.completed[r.id])
  );

  if (favSections.length === 0) {
    main.innerHTML = '';
    emptyState.querySelector('h3').textContent = 'No favourites yet';
    emptyState.querySelector('p').textContent = 'Star sections or check off resources to see them here';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  main.innerHTML = favSections.map(section => `
    <div class="section" id="section-${section.id}">
      <div class="section-header">
        <div class="section-left">
          <span class="section-icon">${section.icon}</span>
          <span class="section-title">${section.label}</span>
          <span class="section-count">${section.resources.length} resource${section.resources.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="section-right">
          <button class="section-fav" onclick="toggleFavourite('${section.id}')">
            ${state.favourites[section.id] ? '★ Favourited' : 'Favourites'}
          </button>
        </div>
      </div>
      <div class="card-grid">
        ${section.resources.map(r => renderCard(r)).join('')}
      </div>
    </div>
  `).join('');
}

// ─── Clear Filters ──────────────────────────────────────────────────────
function bindClearFilters() {
  const btn = document.getElementById('clear-filters-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      state.searchQuery = '';
      state.activeCategory = 'all';
      document.getElementById('search-input').value = '';
      renderCategoryTabs();
      renderContent();
    });
  }
}

// ─── Start ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', fetchData);
