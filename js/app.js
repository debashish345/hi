// ─── State ──────────────────────────────────────────────────────────────────
const state = {
  data: null,
  activeCategory: "all",
  activeFilter: "all",
  searchQuery: "",
  view: "grid",
};

// ─── Fetch Data ──────────────────────────────────────────────────────────────
async function fetchData() {
  try {
    const res = await fetch('https://raw.githubusercontent.com/debashish345/hi/refs/heads/main/resources.json');
    const json = await res.json();
    allData = json.categories;
  } catch (e) {
    console.error('Failed to load resources.json', e);
    allData = [];
  }
}

// ─── Init ────────────────────────────────────────────────────────────────────
function init() {
  renderSidebar();
  renderStats();
  renderContent();
  bindSearch();
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function renderSidebar() {
  const nav = document.getElementById("category-nav");
  const { categories } = state.data;

  const totalCount = categories.reduce((a, c) => a + c.resources.length, 0);

  const allBtn = createNavItem(
    "all",
    "📚",
    "All Resources",
    totalCount,
    "#a78bfa",
    state.activeCategory === "all"
  );
  nav.innerHTML = "";
  nav.appendChild(allBtn);

  categories.forEach((cat) => {
    const btn = createNavItem(
      cat.id,
      cat.icon,
      cat.label,
      cat.resources.length,
      cat.color,
      state.activeCategory === cat.id
    );
    nav.appendChild(btn);
  });
}

function createNavItem(id, icon, label, count, color, active) {
  const btn = document.createElement("button");
  btn.className = `nav-item w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 group ${
    active ? "active" : "hover:bg-zinc-800/60"
  }`;
  btn.dataset.category = id;
  btn.innerHTML = `
    <span class="text-xl w-8 flex items-center justify-center">${icon}</span>
    <span class="flex-1 font-medium text-sm ${active ? "text-white" : "text-zinc-400 group-hover:text-zinc-200"}">${label}</span>
    <span class="text-xs px-2 py-0.5 rounded-full font-mono font-bold" style="background:${color}22; color:${color}">${count}</span>
  `;
  if (active) btn.style.background = `${color}18`;
  btn.addEventListener("click", () => {
    state.activeCategory = id;
    state.activeFilter = "all";
    renderSidebar();
    renderContent();
    renderFilterBar();
  });
  return btn;
}

// ─── Stats ───────────────────────────────────────────────────────────────────
function renderStats() {
  const { categories, meta } = state.data;
  const total = meta.totalResources;
  const htmlCount = categories.flatMap((c) => c.resources).filter((r) => r.type === "html").length;
  const mdCount = categories.flatMap((c) => c.resources).filter((r) => r.type === "md").length;
  const advCount = categories
    .flatMap((c) => c.resources)
    .filter((r) => r.difficulty === "Advanced").length;

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-html").textContent = htmlCount;
  document.getElementById("stat-md").textContent = mdCount;
  document.getElementById("stat-adv").textContent = advCount;
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────
function renderFilterBar() {
  const bar = document.getElementById("filter-bar");
  const filters = ["all", "Beginner", "Intermediate", "Advanced"];
  bar.innerHTML = filters
    .map(
      (f) => `
    <button onclick="setFilter('${f}')" 
      class="filter-btn px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
        state.activeFilter === f
          ? "bg-violet-500 text-white"
          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
      }">
      ${f === "all" ? "All Levels" : f}
    </button>`
    )
    .join("");
}

function setFilter(f) {
  state.activeFilter = f;
  renderFilterBar();
  renderContent();
}

// ─── Search ──────────────────────────────────────────────────────────────────
function bindSearch() {
  const input = document.getElementById("search-input");
  input.addEventListener("input", (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    renderContent();
  });
}

// ─── Get Filtered Resources ───────────────────────────────────────────────────
function getFilteredResources() {
  const { categories } = state.data;
  let resources = [];

  if (state.activeCategory === "all") {
    resources = categories.flatMap((cat) =>
      cat.resources.map((r) => ({ ...r, catId: cat.id, catLabel: cat.label, catColor: cat.color, catIcon: cat.icon }))
    );
  } else {
    const cat = categories.find((c) => c.id === state.activeCategory);
    if (cat) {
      resources = cat.resources.map((r) => ({
        ...r,
        catId: cat.id,
        catLabel: cat.label,
        catColor: cat.color,
        catIcon: cat.icon,
      }));
    }
  }

  if (state.activeFilter !== "all") {
    resources = resources.filter((r) => r.difficulty === state.activeFilter);
  }

  if (state.searchQuery) {
    resources = resources.filter(
      (r) =>
        r.title.toLowerCase().includes(state.searchQuery) ||
        r.description.toLowerCase().includes(state.searchQuery) ||
        r.tags.some((t) => t.toLowerCase().includes(state.searchQuery))
    );
  }

  return resources;
}

// ─── Render Content ───────────────────────────────────────────────────────────
function renderContent() {
  renderFilterBar();
  const resources = getFilteredResources();
  const grid = document.getElementById("resource-grid");
  const emptyState = document.getElementById("empty-state");
  const countEl = document.getElementById("result-count");

  countEl.textContent = `${resources.length} resource${resources.length !== 1 ? "s" : ""}`;

  if (resources.length === 0) {
    grid.classList.add("hidden");
    emptyState.classList.remove("hidden");
    return;
  }

  grid.classList.remove("hidden");
  emptyState.classList.add("hidden");
  grid.innerHTML = resources.map((r) => renderCard(r)).join("");

  // Animate cards in
  requestAnimationFrame(() => {
    document.querySelectorAll(".resource-card").forEach((card, i) => {
      card.style.animationDelay = `${i * 40}ms`;
      card.classList.add("card-enter");
    });
  });
}

// ─── Difficulty Badge ─────────────────────────────────────────────────────────
const difficultyConfig = {
  Beginner: { bg: "bg-emerald-500/15", text: "text-emerald-400", dot: "bg-emerald-400" },
  Intermediate: { bg: "bg-amber-500/15", text: "text-amber-400", dot: "bg-amber-400" },
  Advanced: { bg: "bg-red-500/15", text: "text-red-400", dot: "bg-red-400" },
};

// ─── Render Card ──────────────────────────────────────────────────────────────
function renderCard(r) {
  const diff = difficultyConfig[r.difficulty] || difficultyConfig["Beginner"];
  const typeIcon = r.type === "html" ? "🌐" : "📝";
  const typeBadge = r.type === "html" ? "HTML" : "Markdown";
  const tags = r.tags
    .slice(0, 3)
    .map(
      (t) =>
        `<span class="tag px-2 py-0.5 rounded-md text-xs font-mono" style="background:${r.catColor}15; color:${r.catColor}cc">#${t}</span>`
    )
    .join("");

  return `
    <div class="resource-card group relative bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4 
                hover:border-zinc-600 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40 cursor-pointer"
         style="--cat-color: ${r.catColor}"
         onclick="openResource('${r.path}', '${r.type}', '${r.title}')">
      
      <!-- Top glow accent -->
      <div class="absolute inset-x-0 top-0 h-px rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
           style="background: linear-gradient(90deg, transparent, ${r.catColor}80, transparent)"></div>

      <!-- Header -->
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="text-2xl">${r.catIcon}</span>
          <span class="text-xs font-semibold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400">${r.catLabel}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="${diff.bg} ${diff.text} text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full ${diff.dot}"></span>
            ${r.difficulty}
          </span>
        </div>
      </div>

      <!-- Title -->
      <div>
        <h3 class="font-bold text-white text-base leading-snug group-hover:text-violet-300 transition-colors duration-200">${r.title}</h3>
        <p class="text-zinc-500 text-sm mt-1.5 leading-relaxed line-clamp-2">${r.description}</p>
      </div>

      <!-- Tags -->
      <div class="flex flex-wrap gap-1.5">${tags}</div>

      <!-- Footer -->
      <div class="flex items-center justify-between mt-auto pt-3 border-t border-zinc-800">
        <div class="flex items-center gap-1.5 text-xs text-zinc-600">
          <span>${typeIcon}</span>
          <span class="font-mono">${typeBadge}</span>
          <span class="mx-1 opacity-40">·</span>
          <span>${formatDate(r.lastUpdated)}</span>
        </div>
        <button class="flex items-center gap-1 text-xs font-semibold text-zinc-500 group-hover:text-violet-400 transition-colors duration-200">
          Open <span class="group-hover:translate-x-0.5 transition-transform duration-200">→</span>
        </button>
      </div>
    </div>
  `;
}

// ─── Open Resource ─────────────────────────────────────────────────────────────
function openResource(path, type, title) {
  // Opens the resource in a new tab
  window.open(path, "_blank");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── View Toggle ──────────────────────────────────────────────────────────────
function setView(v) {
  state.view = v;
  const grid = document.getElementById("resource-grid");
  const btnGrid = document.getElementById("btn-grid");
  const btnList = document.getElementById("btn-list");

  if (v === "grid") {
    grid.className = "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4";
    btnGrid.classList.add("active-view");
    btnList.classList.remove("active-view");
  } else {
    grid.className = "grid grid-cols-1 gap-3";
    btnGrid.classList.remove("active-view");
    btnList.classList.add("active-view");
  }
}

// ─── Sidebar Toggle (mobile) ──────────────────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  sidebar.classList.toggle("-translate-x-full");
  overlay.classList.toggle("hidden");
}

// ─── Start ───────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", fetchData);
