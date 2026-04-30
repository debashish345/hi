// ─── Admin State ────────────────────────────────────────────────────────
const adminState = {
  data: null,
  selectedType: null, // 'category' | 'subcategory' | 'resource'
  selectedPath: null, // { catIndex, subIndex?, nestedIndex?, resIndex? }
  treeOpenState: {},
};

// ─── Init ───────────────────────────────────────────────────────────────
async function initAdmin() {
  try {
    const res = await fetch('resources.json');
    adminState.data = await res.json();
  } catch (e) {
    console.error('Failed to load resources.json', e);
    adminState.data = { categories: [], meta: { totalResources: 0, lastUpdated: '', version: '2.0.0', author: 'Interview Hub' } };
  }

  renderTree();
  updatePreview();
  bindAdminEvents();
}

// ─── Render Tree ────────────────────────────────────────────────────────
function renderTree() {
  const container = document.getElementById('tree-container');
  const { categories } = adminState.data;

  let html = '';

  categories.forEach((cat, ci) => {
    const catOpen = adminState.treeOpenState[`cat-${ci}`] !== false;
    const catActive = adminState.selectedType === 'category' && adminState.selectedPath?.catIndex === ci;

    html += `<div class="tree-item">
      <div class="tree-item-header ${catActive ? 'active' : ''}" data-type="category" data-ci="${ci}">
        <span class="tree-toggle ${catOpen ? 'open' : ''}" data-toggle="cat-${ci}">▶</span>
        <span class="tree-icon">${cat.icon || '📁'}</span>
        <span class="tree-label">${cat.label}</span>
        <span class="tree-count">${countCategoryResources(cat)}</span>
      </div>
      <div class="tree-children ${catOpen ? '' : 'collapsed'}" id="tree-cat-${ci}">`;

    if (cat.subcategories) {
      cat.subcategories.forEach((sub, si) => {
        const subOpen = adminState.treeOpenState[`sub-${ci}-${si}`] !== false;
        const subActive = adminState.selectedType === 'subcategory' &&
          adminState.selectedPath?.catIndex === ci &&
          adminState.selectedPath?.subIndex === si &&
          adminState.selectedPath?.nestedIndex === undefined;

        html += `<div class="tree-item">
          <div class="tree-item-header ${subActive ? 'active' : ''}" data-type="subcategory" data-ci="${ci}" data-si="${si}">
            <span class="tree-toggle ${subOpen ? 'open' : ''}" data-toggle="sub-${ci}-${si}">▶</span>
            <span class="tree-label">${sub.label}</span>
            <span class="tree-count">${(sub.resources || []).length}</span>
          </div>
          <div class="tree-children ${subOpen ? '' : 'collapsed'}" id="tree-sub-${ci}-${si}">`;

        // Resources
        if (sub.resources) {
          sub.resources.forEach((res, ri) => {
            const resActive = adminState.selectedType === 'resource' &&
              adminState.selectedPath?.catIndex === ci &&
              adminState.selectedPath?.subIndex === si &&
              adminState.selectedPath?.resIndex === ri &&
              adminState.selectedPath?.nestedIndex === undefined;

            html += `<div class="tree-resource ${resActive ? 'active' : ''}" data-type="resource" data-ci="${ci}" data-si="${si}" data-ri="${ri}">
              <span class="tree-resource-dot"></span>
              <span class="tree-label">${res.title}</span>
            </div>`;
          });
        }

        // Nested subcategories (e.g., LLD > Easy)
        if (sub.subcategories) {
          sub.subcategories.forEach((nested, ni) => {
            const nestedOpen = adminState.treeOpenState[`nested-${ci}-${si}-${ni}`] !== false;
            const nestedActive = adminState.selectedType === 'subcategory' &&
              adminState.selectedPath?.catIndex === ci &&
              adminState.selectedPath?.subIndex === si &&
              adminState.selectedPath?.nestedIndex === ni;

            html += `<div class="tree-item">
              <div class="tree-item-header ${nestedActive ? 'active' : ''}" data-type="nested-subcategory" data-ci="${ci}" data-si="${si}" data-ni="${ni}">
                <span class="tree-toggle ${nestedOpen ? 'open' : ''}" data-toggle="nested-${ci}-${si}-${ni}">▶</span>
                <span class="tree-label">${nested.label}</span>
                <span class="tree-count">${(nested.resources || []).length}</span>
              </div>
              <div class="tree-children ${nestedOpen ? '' : 'collapsed'}" id="tree-nested-${ci}-${si}-${ni}">`;

            if (nested.resources) {
              nested.resources.forEach((res, ri) => {
                const resActive = adminState.selectedType === 'resource' &&
                  adminState.selectedPath?.catIndex === ci &&
                  adminState.selectedPath?.subIndex === si &&
                  adminState.selectedPath?.nestedIndex === ni &&
                  adminState.selectedPath?.resIndex === ri;

                html += `<div class="tree-resource ${resActive ? 'active' : ''}" data-type="nested-resource" data-ci="${ci}" data-si="${si}" data-ni="${ni}" data-ri="${ri}">
                  <span class="tree-resource-dot"></span>
                  <span class="tree-label">${res.title}</span>
                </div>`;
              });
            }

            html += `</div></div>`;
          });
        }

        html += `</div></div>`;
      });
    }

    html += `</div></div>`;
  });

  container.innerHTML = html;

  // Bind tree click events
  container.querySelectorAll('.tree-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = toggle.dataset.toggle;
      adminState.treeOpenState[key] = adminState.treeOpenState[key] === false ? true : false;
      renderTree();
    });
  });

  container.querySelectorAll('[data-type="category"]').forEach(el => {
    el.addEventListener('click', () => {
      adminState.selectedType = 'category';
      adminState.selectedPath = { catIndex: parseInt(el.dataset.ci) };
      renderTree();
      showCategoryEditor();
    });
  });

  container.querySelectorAll('[data-type="subcategory"]').forEach(el => {
    el.addEventListener('click', () => {
      adminState.selectedType = 'subcategory';
      adminState.selectedPath = { catIndex: parseInt(el.dataset.ci), subIndex: parseInt(el.dataset.si) };
      renderTree();
      showSubcategoryEditor();
    });
  });

  container.querySelectorAll('[data-type="nested-subcategory"]').forEach(el => {
    el.addEventListener('click', () => {
      adminState.selectedType = 'subcategory';
      adminState.selectedPath = {
        catIndex: parseInt(el.dataset.ci),
        subIndex: parseInt(el.dataset.si),
        nestedIndex: parseInt(el.dataset.ni),
      };
      renderTree();
      showNestedSubcategoryEditor();
    });
  });

  container.querySelectorAll('[data-type="resource"]').forEach(el => {
    el.addEventListener('click', () => {
      adminState.selectedType = 'resource';
      adminState.selectedPath = {
        catIndex: parseInt(el.dataset.ci),
        subIndex: parseInt(el.dataset.si),
        resIndex: parseInt(el.dataset.ri),
      };
      renderTree();
      showResourceEditor();
    });
  });

  container.querySelectorAll('[data-type="nested-resource"]').forEach(el => {
    el.addEventListener('click', () => {
      adminState.selectedType = 'resource';
      adminState.selectedPath = {
        catIndex: parseInt(el.dataset.ci),
        subIndex: parseInt(el.dataset.si),
        nestedIndex: parseInt(el.dataset.ni),
        resIndex: parseInt(el.dataset.ri),
      };
      renderTree();
      showNestedResourceEditor();
    });
  });
}

// ─── Count Resources ────────────────────────────────────────────────────
function countCategoryResources(cat) {
  let count = 0;
  if (cat.subcategories) {
    cat.subcategories.forEach(sub => {
      count += (sub.resources || []).length;
      if (sub.subcategories) {
        sub.subcategories.forEach(nested => {
          count += (nested.resources || []).length;
        });
      }
    });
  }
  return count;
}

// ─── Hide All Editors ───────────────────────────────────────────────────
function hideAllEditors() {
  document.getElementById('editor-placeholder').style.display = 'none';
  document.getElementById('editor-category').classList.add('hidden');
  document.getElementById('editor-subcategory').classList.add('hidden');
  document.getElementById('editor-resource').classList.add('hidden');
}

// ─── Show Category Editor ───────────────────────────────────────────────
function showCategoryEditor() {
  hideAllEditors();
  const cat = adminState.data.categories[adminState.selectedPath.catIndex];
  const panel = document.getElementById('editor-category');
  panel.classList.remove('hidden');

  document.getElementById('editor-cat-title').textContent = `Edit: ${cat.label}`;
  document.getElementById('cat-id').value = cat.id || '';
  document.getElementById('cat-label').value = cat.label || '';
  document.getElementById('cat-fullname').value = cat.fullName || '';
  document.getElementById('cat-icon').value = cat.icon || '';
  document.getElementById('cat-color').value = cat.color || '#3b82f6';
  document.getElementById('cat-description').value = cat.description || '';
}

// ─── Show Subcategory Editor ────────────────────────────────────────────
function showSubcategoryEditor() {
  hideAllEditors();
  const { catIndex, subIndex } = adminState.selectedPath;
  const sub = adminState.data.categories[catIndex].subcategories[subIndex];
  const panel = document.getElementById('editor-subcategory');
  panel.classList.remove('hidden');

  document.getElementById('editor-sub-title').textContent = `Edit: ${sub.label}`;
  document.getElementById('sub-id').value = sub.id || '';
  document.getElementById('sub-label').value = sub.label || '';
}

// ─── Show Nested Subcategory Editor ─────────────────────────────────────
function showNestedSubcategoryEditor() {
  hideAllEditors();
  const { catIndex, subIndex, nestedIndex } = adminState.selectedPath;
  const nested = adminState.data.categories[catIndex].subcategories[subIndex].subcategories[nestedIndex];
  const panel = document.getElementById('editor-subcategory');
  panel.classList.remove('hidden');

  document.getElementById('editor-sub-title').textContent = `Edit: ${nested.label}`;
  document.getElementById('sub-id').value = nested.id || '';
  document.getElementById('sub-label').value = nested.label || '';
}

// ─── Show Resource Editor ───────────────────────────────────────────────
function showResourceEditor() {
  hideAllEditors();
  const { catIndex, subIndex, resIndex } = adminState.selectedPath;
  const res = adminState.data.categories[catIndex].subcategories[subIndex].resources[resIndex];
  populateResourceForm(res);
}

function showNestedResourceEditor() {
  hideAllEditors();
  const { catIndex, subIndex, nestedIndex, resIndex } = adminState.selectedPath;
  const res = adminState.data.categories[catIndex].subcategories[subIndex].subcategories[nestedIndex].resources[resIndex];
  populateResourceForm(res);
}

function populateResourceForm(res) {
  const panel = document.getElementById('editor-resource');
  panel.classList.remove('hidden');

  document.getElementById('editor-res-title').textContent = `Edit: ${res.title}`;
  document.getElementById('res-id').value = res.id || '';
  document.getElementById('res-slug').value = res.slug || '';
  document.getElementById('res-title').value = res.title || '';
  document.getElementById('res-type').value = res.type || 'html';
  document.getElementById('res-difficulty').value = res.difficulty || 'Beginner';
  document.getElementById('res-path').value = res.path || '';
  document.getElementById('res-description').value = res.description || '';
  document.getElementById('res-tags').value = (res.tags || []).join(', ');
  document.getElementById('res-lastUpdated').value = res.lastUpdated || '';
}

// ─── Bind Events ────────────────────────────────────────────────────────
function bindAdminEvents() {
  // Save Category
  document.getElementById('form-category').addEventListener('submit', (e) => {
    e.preventDefault();
    const cat = adminState.data.categories[adminState.selectedPath.catIndex];
    cat.id = document.getElementById('cat-id').value;
    cat.label = document.getElementById('cat-label').value;
    cat.fullName = document.getElementById('cat-fullname').value;
    cat.icon = document.getElementById('cat-icon').value;
    cat.color = document.getElementById('cat-color').value;
    cat.description = document.getElementById('cat-description').value;
    onDataChanged();
    showToast('Category saved!', 'success');
  });

  // Save Subcategory
  document.getElementById('form-subcategory').addEventListener('submit', (e) => {
    e.preventDefault();
    const { catIndex, subIndex, nestedIndex } = adminState.selectedPath;
    let sub;
    if (nestedIndex !== undefined) {
      sub = adminState.data.categories[catIndex].subcategories[subIndex].subcategories[nestedIndex];
    } else {
      sub = adminState.data.categories[catIndex].subcategories[subIndex];
    }
    sub.id = document.getElementById('sub-id').value;
    sub.label = document.getElementById('sub-label').value;
    onDataChanged();
    showToast('Subcategory saved!', 'success');
  });

  // Save Resource
  document.getElementById('form-resource').addEventListener('submit', (e) => {
    e.preventDefault();
    const { catIndex, subIndex, nestedIndex, resIndex } = adminState.selectedPath;
    let res;
    if (nestedIndex !== undefined) {
      res = adminState.data.categories[catIndex].subcategories[subIndex].subcategories[nestedIndex].resources[resIndex];
    } else {
      res = adminState.data.categories[catIndex].subcategories[subIndex].resources[resIndex];
    }
    res.id = document.getElementById('res-id').value;
    res.slug = document.getElementById('res-slug').value;
    res.title = document.getElementById('res-title').value;
    res.type = document.getElementById('res-type').value;
    res.difficulty = document.getElementById('res-difficulty').value;
    res.path = document.getElementById('res-path').value;
    res.description = document.getElementById('res-description').value;
    res.tags = document.getElementById('res-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    res.lastUpdated = document.getElementById('res-lastUpdated').value;
    onDataChanged();
    showToast('Resource saved!', 'success');
  });

  // Add Category
  document.getElementById('btn-add-category').addEventListener('click', () => {
    const newCat = {
      id: `category-${Date.now()}`,
      label: 'New Category',
      fullName: 'New Category',
      icon: '📁',
      color: '#6366f1',
      description: '',
      subcategories: [],
    };
    adminState.data.categories.push(newCat);
    adminState.selectedType = 'category';
    adminState.selectedPath = { catIndex: adminState.data.categories.length - 1 };
    onDataChanged();
    showCategoryEditor();
    showToast('Category added!', 'success');
  });

  // Add Subcategory
  document.getElementById('btn-add-subcategory').addEventListener('click', () => {
    const cat = adminState.data.categories[adminState.selectedPath.catIndex];
    if (!cat.subcategories) cat.subcategories = [];
    const newSub = {
      id: `sub-${Date.now()}`,
      label: 'New Subcategory',
      resources: [],
    };
    cat.subcategories.push(newSub);
    adminState.selectedType = 'subcategory';
    adminState.selectedPath = {
      catIndex: adminState.selectedPath.catIndex,
      subIndex: cat.subcategories.length - 1,
    };
    onDataChanged();
    showSubcategoryEditor();
    showToast('Subcategory added!', 'success');
  });

  // Add Resource
  document.getElementById('btn-add-resource').addEventListener('click', () => {
    const { catIndex, subIndex, nestedIndex } = adminState.selectedPath;
    let container;
    if (nestedIndex !== undefined) {
      container = adminState.data.categories[catIndex].subcategories[subIndex].subcategories[nestedIndex];
    } else {
      container = adminState.data.categories[catIndex].subcategories[subIndex];
    }
    if (!container.resources) container.resources = [];
    const cat = adminState.data.categories[catIndex];
    const newRes = {
      id: `res-${Date.now()}`,
      slug: `new-resource-${Date.now()}`,
      title: 'New Resource',
      type: 'html',
      difficulty: 'Beginner',
      tags: [],
      path: `data/${cat.id}/new-resource.html`,
      description: '',
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    container.resources.push(newRes);
    adminState.selectedType = 'resource';
    adminState.selectedPath = {
      ...adminState.selectedPath,
      resIndex: container.resources.length - 1,
    };
    onDataChanged();
    populateResourceForm(newRes);
    hideAllEditors();
    document.getElementById('editor-resource').classList.remove('hidden');
    showToast('Resource added!', 'success');
  });

  // Delete Category
  document.getElementById('btn-delete-category').addEventListener('click', () => {
    if (!confirm('Delete this category and all its contents?')) return;
    adminState.data.categories.splice(adminState.selectedPath.catIndex, 1);
    adminState.selectedType = null;
    adminState.selectedPath = null;
    onDataChanged();
    hideAllEditors();
    document.getElementById('editor-placeholder').style.display = '';
    showToast('Category deleted', 'success');
  });

  // Delete Subcategory
  document.getElementById('btn-delete-subcategory').addEventListener('click', () => {
    if (!confirm('Delete this subcategory and all its resources?')) return;
    const { catIndex, subIndex, nestedIndex } = adminState.selectedPath;
    if (nestedIndex !== undefined) {
      adminState.data.categories[catIndex].subcategories[subIndex].subcategories.splice(nestedIndex, 1);
    } else {
      adminState.data.categories[catIndex].subcategories.splice(subIndex, 1);
    }
    adminState.selectedType = null;
    adminState.selectedPath = null;
    onDataChanged();
    hideAllEditors();
    document.getElementById('editor-placeholder').style.display = '';
    showToast('Subcategory deleted', 'success');
  });

  // Delete Resource
  document.getElementById('btn-delete-resource').addEventListener('click', () => {
    if (!confirm('Delete this resource?')) return;
    const { catIndex, subIndex, nestedIndex, resIndex } = adminState.selectedPath;
    if (nestedIndex !== undefined) {
      adminState.data.categories[catIndex].subcategories[subIndex].subcategories[nestedIndex].resources.splice(resIndex, 1);
    } else {
      adminState.data.categories[catIndex].subcategories[subIndex].resources.splice(resIndex, 1);
    }
    adminState.selectedType = null;
    adminState.selectedPath = null;
    onDataChanged();
    hideAllEditors();
    document.getElementById('editor-placeholder').style.display = '';
    showToast('Resource deleted', 'success');
  });

  // Download JSON
  document.getElementById('btn-download-json').addEventListener('click', () => {
    updateMeta();
    const json = JSON.stringify(adminState.data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resources.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded resources.json!', 'success');
  });

  // Load JSON
  document.getElementById('btn-load-json').addEventListener('click', () => {
    document.getElementById('file-input').click();
  });

  document.getElementById('file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        adminState.data = JSON.parse(ev.target.result);
        adminState.selectedType = null;
        adminState.selectedPath = null;
        renderTree();
        updatePreview();
        hideAllEditors();
        document.getElementById('editor-placeholder').style.display = '';
        showToast('JSON loaded successfully!', 'success');
      } catch (err) {
        showToast('Invalid JSON file!', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // Copy JSON
  document.getElementById('btn-copy-json').addEventListener('click', () => {
    updateMeta();
    const json = JSON.stringify(adminState.data, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      showToast('Copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy', 'error');
    });
  });
}

// ─── Data Changed ───────────────────────────────────────────────────────
function onDataChanged() {
  renderTree();
  updatePreview();
}

// ─── Update Meta ────────────────────────────────────────────────────────
function updateMeta() {
  let total = 0;
  adminState.data.categories.forEach(cat => {
    total += countCategoryResources(cat);
  });
  if (!adminState.data.meta) {
    adminState.data.meta = {};
  }
  adminState.data.meta.totalResources = total;
  adminState.data.meta.lastUpdated = new Date().toISOString().split('T')[0];
}

// ─── Update Preview ─────────────────────────────────────────────────────
function updatePreview() {
  const pre = document.querySelector('#json-preview code');
  pre.textContent = JSON.stringify(adminState.data, null, 2);
}

// ─── Toast ──────────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 2500);
}

// ─── Start ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initAdmin);
