// ─────────────────────────────────────────────────────────────────────────────
//  LLD Viewer — Centralized Engine
//  Fetches article JSON + GitHub code tree, renders standardized LLD layout
// ─────────────────────────────────────────────────────────────────────────────

let monacoEditor = null;
let currentFileContent = '';
const GITHUB_CACHE_KEY = 'lld-github-cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 min

// ─── Entry Point ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('lld-page') && window.location.pathname.includes('lld.html')) {
    initLLDViewer();
  }
});

window.initLLDViewer = async function(resourceId) {
  const id = resourceId || new URLSearchParams(window.location.search).get('id') || window.location.hash.replace('#', '');
  
  // Only setup LLD viewer if we actually have the container
  if (!document.getElementById('lld-page')) return;
  if (!id) return showError('No problem ID provided. Use ?id=lld-01');

  try {
    // 1. Load resource metadata from resources.json
    const resource = await loadResourceById(id);
    if (!resource) return showError(`Resource "${id}" not found in resources.json`);

    // 2. Load article content JSON
    const article = await loadArticleContent(resource.contentPath);
    if (!article) return showError('Could not load article content.');

    // 3. Render the page
    renderHeader(resource, article);
    renderBadges(resource);
    renderWalkthrough(article.walkthrough);
    renderFollowUps(article.followUpQuestions);

    // 4. Fetch code from GitHub and render editor
    await initCodeEditor(resource.github);

    // Show page, hide loading
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('lld-page').classList.remove('hidden');
    document.title = `${resource.title} — LLD Viewer`;

    // 5. Render Mermaid AFTER page is visible (Mermaid needs visible container)
    setTimeout(() => renderMermaid(article.mermaid), 200);

  } catch (err) {
    console.error('LLD Viewer init error:', err);
    showError(err.message);
  }
}

// ─── Data Loading ───────────────────────────────────────────────────────────

async function loadResourceById(id) {
  const res = await fetch('resources.json');
  const data = await res.json();
  // Search all categories/subcategories for the resource
  for (const cat of data.categories) {
    const found = findResourceInCategory(cat.subcategories, id, cat);
    if (found) return found;
  }
  return null;
}

function findResourceInCategory(subcategories, id, cat) {
  if (!subcategories) return null;
  for (const sub of subcategories) {
    if (sub.resources) {
      const r = sub.resources.find(r => r.id === id);
      if (r) return { ...r, catLabel: cat.label, catIcon: cat.icon, catColor: cat.color };
    }
    if (sub.subcategories) {
      const found = findResourceInCategory(sub.subcategories, id, cat);
      if (found) return found;
    }
  }
  return null;
}

async function loadArticleContent(contentPath) {
  if (!contentPath) return null;
  const res = await fetch(contentPath);
  if (!res.ok) throw new Error(`Failed to fetch ${contentPath}`);
  return res.json();
}

// ─── GitHub API ─────────────────────────────────────────────────────────────

function parseGitHubPath(githubPath) {
  if (!githubPath) return null;
  // Support formats:
  //   "owner/repo"
  //   "owner/repo/tree/branch/path/to/folder"
  //   "https://github.com/owner/repo/tree/branch/path"
  let cleaned = githubPath.replace('https://github.com/', '').replace(/\/$/, '');
  const parts = cleaned.split('/');
  const owner = parts[0];
  const repo = parts[1];
  let branch = 'main';
  let path = '';

  if (parts.length > 2 && parts[2] === 'tree') {
    branch = parts[3] || 'main';
    path = parts.slice(4).join('/');
  } else if (parts.length > 2) {
    // owner/repo/subfolder — assume main branch
    path = parts.slice(2).join('/');
  }
  return { owner, repo, branch, path };
}

async function fetchGitHubTree(githubPath) {
  const parsed = parseGitHubPath(githubPath);
  if (!parsed) return [];

  const cacheKey = `${GITHUB_CACHE_KEY}:${githubPath}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    // Get the tree SHA for the branch
    const branchUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/branches/${parsed.branch}`;
    const branchRes = await fetch(branchUrl);
    if (!branchRes.ok) throw new Error('Branch not found');
    const branchData = await branchRes.json();
    const treeSha = branchData.commit.commit.tree.sha;

    // Get full recursive tree
    const treeUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${treeSha}?recursive=1`;
    const treeRes = await fetch(treeUrl);
    if (!treeRes.ok) throw new Error('Tree fetch failed');
    const treeData = await treeRes.json();

    // Filter to only files under the specified path
    let files = treeData.tree.filter(item => item.type === 'blob');
    if (parsed.path) {
      files = files.filter(f => f.path.startsWith(parsed.path + '/'));
      // Remove the prefix path so tree starts from the subfolder
      files = files.map(f => ({ ...f, path: f.path.slice(parsed.path.length + 1) }));
    }

    const result = files.map(f => ({
      path: f.path,
      url: `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${parsed.branch}/${parsed.path ? parsed.path + '/' : ''}${f.path}`,
      size: f.size,
    }));

    setCachedData(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('GitHub fetch failed:', err.message);
    return [];
  }
}

async function fetchFileContent(url) {
  const cacheKey = `${GITHUB_CACHE_KEY}:file:${url}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const res = await fetch(url);
  if (!res.ok) throw new Error('File fetch failed');
  const text = await res.text();
  setCachedData(cacheKey, text);
  return text;
}

// ─── Cache Helpers ──────────────────────────────────────────────────────────

function getCachedData(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
}

function setCachedData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* storage full */ }
}

// ─── Rendering: Header & Badges ─────────────────────────────────────────────

function renderHeader(resource, article) {
  document.getElementById('lld-title').textContent = resource.title;
  document.getElementById('lld-question').innerHTML = article.question;
}

function renderBadges(resource) {
  const container = document.getElementById('lld-badges');
  const diffMap = { 'Beginner': 'badge-green', 'Intermediate': 'badge-amber', 'Advanced': 'badge-red' };
  const diffClass = diffMap[resource.difficulty] || 'badge-blue';

  let html = `<span class="badge badge-purple">${resource.catIcon || '🏗️'} ${resource.catLabel || 'System Design'}</span>`;
  html += `<span class="badge ${diffClass}">${resource.difficulty}</span>`;
  resource.tags.forEach(tag => {
    html += `<span class="badge-tag">#${tag}</span>`;
  });
  container.innerHTML = html;
}

// ─── Rendering: Mermaid Diagram ─────────────────────────────────────────────

let mermaidInitialized = false;

function renderMermaid(mermaidCode) {
  if (!mermaidCode) {
    document.getElementById('diagram-section').classList.add('hidden');
    return;
  }
  if (typeof mermaid === 'undefined') {
    setTimeout(() => renderMermaid(mermaidCode), 500);
    return;
  }

  if (!mermaidInitialized) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      themeVariables: isDark ? {
        darkMode: true,
        background: '#161822',
        primaryColor: '#2e3357',
        primaryTextColor: '#e8eaed',
        primaryBorderColor: '#3a3d55',
        lineColor: '#818cf8',
        secondaryColor: '#252840',
        tertiaryColor: '#1c1e2e',
        fontFamily: 'Inter, sans-serif',
        fontSize: '13px',
      } : {
        darkMode: false,
        fontFamily: 'Inter, sans-serif',
        fontSize: '13px',
      },
    });
    mermaidInitialized = true;
  }

  const container = document.getElementById('mermaid-container');
  try {
    // Create a temporary hidden element for Mermaid to render into
    const tempDiv = document.createElement('div');
    tempDiv.id = 'mermaid-temp-render';
    tempDiv.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
    document.body.appendChild(tempDiv);

    const uniqueId = 'lld-diagram';
    // Use mermaidAPI which is the stable low-level API in v9
    if (mermaid.mermaidAPI) {
      mermaid.mermaidAPI.render(uniqueId, mermaidCode, (svgCode) => {
        container.innerHTML = svgCode;
        tempDiv.remove();
      }, tempDiv);
    } else {
      // Fallback for builds where mermaidAPI is not exposed
      const result = mermaid.render(uniqueId, mermaidCode);
      if (typeof result === 'string') {
        container.innerHTML = result;
      } else if (result && result.svg) {
        container.innerHTML = result.svg;
      }
      tempDiv.remove();
    }
  } catch (err) {
    console.error('Mermaid render error:', err);
    container.innerHTML = `<p style="color:#f87171;padding:16px;">Diagram rendering failed: ${err.message}</p>`;
  }
}

// ─── Rendering: Code Editor ─────────────────────────────────────────────────

async function initCodeEditor(githubPath) {
  const loadingEl = document.getElementById('code-loading');

  if (!githubPath) {
    document.getElementById('code-section').classList.add('hidden');
    return;
  }

  loadingEl.classList.remove('hidden');
  const files = await fetchGitHubTree(githubPath);
  loadingEl.classList.add('hidden');

  if (files.length === 0) {
    document.getElementById('file-tree').innerHTML =
      `<div class="tree-item" style="padding:16px;color:var(--text-muted);font-size:12px;">No files found. Check GitHub path or API rate limit.</div>`;
    initMonaco('// No files loaded.\n// Check the GitHub path or API rate limit (60 req/hr unauthenticated).');
    return;
  }

  // Set repo name in tree header
  const parsed = parseGitHubPath(githubPath);
  if (parsed) document.getElementById('tree-repo-name').textContent = parsed.repo;

  // Build and render file tree
  const tree = buildTreeStructure(files);
  renderFileTree(tree, document.getElementById('file-tree'), 0);

  // Init Monaco and load first file
  initMonaco('// ← Select a file from the tree');
  loadFirstFile(files);

  // Wire up buttons
  setupEditorButtons();
}

function buildTreeStructure(files) {
  const root = {};
  files.forEach(file => {
    const parts = file.path.split('/');
    let current = root;
    parts.forEach((part, i) => {
      if (!current[part]) {
        current[part] = i === parts.length - 1
          ? { __file: true, __url: file.url, __path: file.path }
          : {};
      }
      current = current[part];
    });
  });
  return root;
}

function renderFileTree(tree, container, depth) {
  // Sort: folders first, then files, alphabetically
  const entries = Object.entries(tree).sort(([aKey, aVal], [bKey, bVal]) => {
    const aIsFile = aVal.__file;
    const bIsFile = bVal.__file;
    if (aIsFile && !bIsFile) return 1;
    if (!aIsFile && bIsFile) return -1;
    return aKey.localeCompare(bKey);
  });

  entries.forEach(([name, value]) => {
    if (value.__file) {
      // File item
      const item = document.createElement('div');
      item.className = 'tree-item';
      item.style.paddingLeft = `${12 + depth * 16}px`;
      item.innerHTML = `<span class="tree-icon">${getFileIcon(name)}</span><span class="tree-name">${name}</span>`;
      item.dataset.url = value.__url;
      item.dataset.path = value.__path;
      item.addEventListener('click', () => onFileClick(item));
      container.appendChild(item);
    } else {
      // Folder
      const label = document.createElement('div');
      label.className = 'tree-item tree-folder-label';
      label.style.paddingLeft = `${12 + depth * 16}px`;
      label.innerHTML = `<span class="tree-chevron">▶</span><span class="tree-icon">📁</span><span class="tree-name">${name}</span>`;

      const children = document.createElement('div');
      children.className = 'tree-children tree-indent';

      label.addEventListener('click', () => {
        label.classList.toggle('open');
        children.classList.toggle('open');
      });

      // Auto-open first two levels
      if (depth < 2) {
        label.classList.add('open');
        children.classList.add('open');
      }

      container.appendChild(label);
      container.appendChild(children);
      renderFileTree(value, children, depth + 1);
    }
  });
}

function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const icons = {
    java: '☕', js: '⚡', ts: '🔷', py: '🐍', go: '🐹',
    json: '📋', xml: '📄', yaml: '📄', yml: '📄',
    md: '📝', txt: '📝', html: '🌐', css: '🎨',
    sql: '🗄️', sh: '🐚', dockerfile: '🐳',
  };
  return icons[ext] || '📄';
}

function getLanguageFromFilename(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const map = {
    java: 'java', js: 'javascript', ts: 'typescript', py: 'python',
    go: 'go', json: 'json', xml: 'xml', yaml: 'yaml', yml: 'yaml',
    md: 'markdown', html: 'html', css: 'css', sql: 'sql',
    sh: 'shell', dockerfile: 'dockerfile', kt: 'kotlin', rs: 'rust',
    cpp: 'cpp', c: 'c', cs: 'csharp', rb: 'ruby', swift: 'swift',
  };
  return map[ext] || 'plaintext';
}

async function onFileClick(item) {
  // Highlight active
  document.querySelectorAll('.tree-item.active').forEach(el => el.classList.remove('active'));
  item.classList.add('active');

  const url = item.dataset.url;
  const path = item.dataset.path;
  const filename = path.split('/').pop();

  document.getElementById('active-file-name').textContent = path;

  try {
    const content = await fetchFileContent(url);
    currentFileContent = content;
    const lang = getLanguageFromFilename(filename);

    if (monacoEditor) {
      const model = monacoEditor.getModel();
      monaco.editor.setModelLanguage(model, lang);
      monacoEditor.setValue(content);
      monacoEditor.revealLine(1);
    }

    document.getElementById('status-lang').textContent = lang.charAt(0).toUpperCase() + lang.slice(1);
    document.getElementById('status-lines').textContent = `Lines: ${content.split('\n').length}`;
    document.getElementById('status-cursor').textContent = 'Ln 1, Col 1';
  } catch (err) {
    console.error('Failed to load file:', err);
    if (monacoEditor) monacoEditor.setValue('// Failed to load file content.');
  }
}

async function loadFirstFile(files) {
  // Try to auto-select a meaningful first file (e.g. Main, App, or first .java/.py)
  const priorities = ['Main.java', 'App.java', 'ParkingLot.java', 'main.py', 'app.py', 'index.js'];
  let firstFile = files.find(f => priorities.some(p => f.path.endsWith(p)));
  if (!firstFile) firstFile = files.find(f => !f.path.includes('test') && !f.path.includes('Test'));
  if (!firstFile) firstFile = files[0];

  // Find and click the tree item
  const treeItems = document.querySelectorAll('.tree-item[data-path]');
  for (const item of treeItems) {
    if (item.dataset.path === firstFile.path) {
      item.click();
      break;
    }
  }
}

// ─── Monaco Editor Setup ────────────────────────────────────────────────────

function initMonaco(initialCode) {
  require.config({
    paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }
  });

  require(['vs/editor/editor.main'], function () {
    const defineThemes = () => {
      monaco.editor.defineTheme('lld-dark', {
        base: 'vs-dark', inherit: true,
        rules: [
          { token: 'comment', foreground: '5c6378', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'c084fc' },
          { token: 'string', foreground: '86efac' },
          { token: 'number', foreground: 'fbbf24' },
          { token: 'type', foreground: '60a5fa' },
          { token: 'annotation', foreground: 'fb923c' },
        ],
        colors: {
          'editor.background': '#12141f',
          'editor.foreground': '#e8eaed',
          'editor.lineHighlightBackground': '#1a1d2e',
          'editor.selectionBackground': '#2e3357',
          'editorCursor.foreground': '#818cf8',
          'editorLineNumber.foreground': '#3a3d55',
          'editorLineNumber.activeForeground': '#818cf8',
          'editorIndentGuide.background': '#1e2133',
          'editorGutter.background': '#12141f',
          'minimap.background': '#12141f',
          'scrollbarSlider.background': '#2a2d4050',
        }
      });
      monaco.editor.defineTheme('lld-light', {
        base: 'vs', inherit: true,
        rules: [
          { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
          { token: 'keyword', foreground: '6366f1' },
          { token: 'string', foreground: '10b981' },
          { token: 'number', foreground: 'f59e0b' },
          { token: 'type', foreground: '3b82f6' },
          { token: 'annotation', foreground: 'f97316' },
        ],
        colors: {
          'editor.background': '#ffffff',
          'editor.foreground': '#1e293b',
          'editor.lineHighlightBackground': '#f8fafc',
          'editor.selectionBackground': '#e2e8f0',
          'editorCursor.foreground': '#6366f1',
          'editorLineNumber.foreground': '#94a3b8',
          'editorLineNumber.activeForeground': '#6366f1',
          'editorIndentGuide.background': '#f1f5f9',
          'editorGutter.background': '#ffffff',
          'minimap.background': '#ffffff',
          'scrollbarSlider.background': '#cbd5e150',
        }
      });
    };
    
    defineThemes();
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const initialTheme = isDark ? 'lld-dark' : 'lld-light';

    monacoEditor = monaco.editor.create(document.getElementById('monaco-editor'), {
      value: initialCode || '',
      language: 'java',
      theme: initialTheme,
      readOnly: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontLigatures: true,
      minimap: { enabled: true, scale: 1 },
      scrollBeyondLastLine: false,
      padding: { top: 16, bottom: 16 },
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      renderLineHighlight: 'line',
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true, indentation: true },
      folding: true,
      glyphMargin: false,
      automaticLayout: true,
      scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8, useShadows: false },
    });

    window.addEventListener('themeChanged', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      monaco.editor.setTheme(isDark ? 'lld-dark' : 'lld-light');
    });

    monacoEditor.onDidChangeCursorPosition(e => {
      document.getElementById('status-cursor').textContent =
        `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
    });
  });
}

function setupEditorButtons() {
  const copyBtn = document.getElementById('copy-btn');
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(currentFileContent).then(() => {
      copyBtn.classList.add('copied');
      copyBtn.querySelector('span').textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtn.querySelector('span').textContent = 'Copy';
      }, 2000);
    });
  });

  const fsBtn = document.getElementById('fullscreen-btn');
  const split = document.getElementById('editor-split');
  fsBtn.addEventListener('click', () => {
    split.classList.toggle('fullscreen');
    if (monacoEditor) monacoEditor.layout();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && split.classList.contains('fullscreen')) {
      split.classList.remove('fullscreen');
      if (monacoEditor) monacoEditor.layout();
    }
  });
}

// ─── Rendering: Walkthrough ─────────────────────────────────────────────────

function renderWalkthrough(steps) {
  const container = document.getElementById('walkthrough-list');
  if (!steps || steps.length === 0) {
    document.getElementById('walkthrough-section').classList.add('hidden');
    return;
  }
  container.innerHTML = steps.map((step, i) => `
    <div class="wt-item">
      <div class="wt-num">${String(i + 1).padStart(2, '0')}</div>
      <div>
        <h4>${step.title}</h4>
        <p>${step.description}</p>
      </div>
    </div>
  `).join('');
}

// ─── Rendering: Follow-up Questions ─────────────────────────────────────────

function renderFollowUps(questions) {
  const container = document.getElementById('followup-list');
  if (!questions || questions.length === 0) {
    document.getElementById('followup-section').classList.add('hidden');
    return;
  }
  container.innerHTML = questions.map((fq, i) => `
    <div class="fq-item" id="fq-${i}">
      <div class="fq-question" onclick="toggleFollowUp(${i})">
        <h4>${fq.question}</h4>
        <div class="fq-chevron">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
      <div class="fq-answer"><p>${fq.answer}</p></div>
    </div>
  `).join('');
}

function toggleFollowUp(index) {
  document.getElementById(`fq-${index}`).classList.toggle('open');
}

// ─── Error Display ──────────────────────────────────────────────────────────

function showError(msg) {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('lld-page').classList.add('hidden');
  const errScreen = document.getElementById('error-screen');
  errScreen.classList.remove('hidden');
  document.getElementById('error-msg').textContent = msg;
}
