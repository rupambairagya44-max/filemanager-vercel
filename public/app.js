// --- Utilities ---
const showToast = (message, type = 'info') => {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

const showLoading = (text = 'Loading...') => {
  document.getElementById('loading-text').innerText = text;
  document.getElementById('loading-overlay').classList.remove('hidden');
};

const hideLoading = () => {
  document.getElementById('loading-overlay').classList.add('hidden');
};

// Gravatar MD5 Implementation
const md5 = function() {
  var k = [], i = 0;
  for (; i < 64;) {
    k[i] = 0 | (Math.abs(Math.sin(++i)) * 4294967296);
  }
  function calcMD5(str) {
    var b, c, d, j, x = [], str2 = unescape(encodeURI(str)), a = str2.length, h = [b = 1732584193, c = -271733879, ~b, ~c];
    for (i = 0; i <= a;) x[i >> 2] |= (str2.charCodeAt(i) || 128) << 8 * (i++ % 4);
    x[str2.length = (a + 8 >> 6) * 16 + 14] = a * 8;
    i = 0;
    for (; i < str2.length; i += 16) {
      a = h; j = 0;
      for (; j < 64;) {
        a = [d = a[3], (b = a[1] | 0) + ((d = a[0] + [b & (c = a[2]) | ~b & d, d & b | ~d & c, b ^ c ^ d, c ^ (b | ~d)][a = j >> 4] + (k[j] + (x[[j, 5 * j + 1, 3 * j + 5, 7 * j][a] % 16 + i] | 0))) << (a = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21][4 * a + j++ % 4]) | d >>> 32 - a), b, c];
      }
      for (j = 4; j;) h[--j] = h[j] + a[j];
    }
    str = "";
    for (; j < 32;) str += ((h[j >> 3] >> ((1 ^ j++ & 7) * 4)) & 15).toString(16);
    return str;
  }
  return calcMD5;
}();

const getGravatar = (email) => `https://www.gravatar.com/avatar/${md5(email.trim().toLowerCase())}?d=identicon`;

// --- State ---
let currentUser = null;
let currentPath = []; // Array of folder objects {id, name}
let allFiles = []; // Flattened array of all file nodes from DB

// --- API ---
const API_URL = '/api';

const apiFetch = async (endpoint, options = {}) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.error || 'API Error');
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw err;
  }
};

// --- Authentication ---
const checkAuth = () => {
  const userStr = localStorage.getItem('fm_user');
  if (userStr) {
    currentUser = JSON.parse(userStr);
    initApp();
  } else {
    showView('auth-view');
  }
};

const login = async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  
  // Validation
  if (!email || !password) {
    showToast('Please enter email and password', 'error');
    return;
  }
  
  try {
    showLoading('Logging in...');
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem('fm_user', JSON.stringify(data.user));
    currentUser = data.user;
    showToast('Logged in successfully!', 'success');
    // Clear form
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    initApp();
  } catch (err) {
    console.error('Login error:', err);
    const errorMessage = err.message || 'Login failed. Please try again.';
    showToast(errorMessage, 'error');
  } finally {
    hideLoading();
  }
};

const register = async (e) => {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  
  // Validation
  if (!name || !email || !password) {
    showToast('Please fill in all fields', 'error');
    return;
  }
  
  if (password.length < 6) {
    showToast('Password must be at least 6 characters', 'error');
    return;
  }
  
  if (!email.includes('@')) {
    showToast('Please enter a valid email', 'error');
    return;
  }
  
  try {
    showLoading('Creating account...');
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    showToast(data.message, 'success');
    // Clear form
    document.getElementById('reg-name').value = '';
    document.getElementById('reg-email').value = '';
    document.getElementById('reg-password').value = '';
    // Switch to login
    setTimeout(() => document.getElementById('show-login').click(), 1000);
  } catch (err) {
    console.error('Registration error:', err);
    const errorMessage = err.message || 'Registration failed. Please try again.';
    showToast(errorMessage, 'error');
  } finally {
    hideLoading();
  }
};

const logout = () => {
  localStorage.removeItem('fm_user');
  currentUser = null;
  showView('auth-view');
};

// --- App Initialization ---
const initApp = async () => {
  showView('app-view');
  
  // Set User Profile
  document.getElementById('user-avatar').src = getGravatar(currentUser.email);
  document.getElementById('user-name').innerText = currentUser.name;
  document.getElementById('user-role-badge').innerText = currentUser.role;

  // Set Role based UI
  if (currentUser.role === 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
    document.getElementById('nav-users').classList.remove('hidden');
  } else {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    document.getElementById('nav-users').classList.add('hidden');
  }

  // Load Data
  await refreshFiles();
  switchNav('dashboard');
};

// --- Navigation ---
const switchNav = (viewId) => {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`[data-view="${viewId}"]`).classList.add('active');
  
  document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
  document.getElementById(`view-${viewId}`).classList.remove('hidden');

  if (viewId === 'dashboard') renderDashboard();
  if (viewId === 'files') renderFiles();
  if (viewId === 'users' && currentUser.role === 'admin') renderUsers();
};

const showView = (viewId) => {
  document.querySelectorAll('.view-container').forEach(v => v.classList.add('hidden'));
  document.getElementById(viewId).classList.remove('hidden');
};

// --- File System ---
const refreshFiles = async () => {
  try {
    const data = await apiFetch('/files');
    allFiles = data;
  } catch (err) {
    showToast('Failed to load files', 'error');
  }
};

const getCurrentFolderId = () => {
  return currentPath.length > 0 ? currentPath[currentPath.length - 1]._id : null;
};

const getFilesByParent = (parentId) => {
  return allFiles.filter(f => f.parentId === parentId);
};

const renderFiles = () => {
  const container = document.getElementById('files-container');
  container.innerHTML = '';
  
  const currentId = getCurrentFolderId();
  const folderFiles = getFilesByParent(currentId);

  // Render Breadcrumbs
  const breadcrumbs = document.getElementById('breadcrumbs');
  breadcrumbs.innerHTML = `
    <span class="crumb-link" data-id="root">Home</span> 
  `;
  currentPath.forEach((p, idx) => {
    breadcrumbs.innerHTML += ` / <span class="crumb-link" data-index="${idx}">${p.name}</span>`;
  });

  if (folderFiles.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted); padding:2rem;">Folder is empty.</p>`;
    return;
  }

  folderFiles.forEach(file => {
    const card = document.createElement('div');
    card.className = `file-card ${file.type}`;
    
    let icon = '📄';
    if (file.type === 'folder') icon = '📁';
    else if (file.mimeType.startsWith('image/')) icon = '🖼️';
    else if (file.mimeType.includes('pdf')) icon = '📕';

    card.innerHTML = `
      <div class="file-icon">${icon}</div>
      <div class="file-name">${file.name}</div>
      ${currentUser.role === 'admin' ? `
      <div class="context-menu">
        <button class="menu-btn">⋮</button>
        <div class="menu-dropdown">
          <button class="action-rename" data-id="${file._id}">Rename</button>
          <button class="action-delete" data-id="${file._id}">Delete</button>
          ${file.type === 'file' ? `<button class="action-download" data-id="${file._id}">Download</button>` : ''}
        </div>
      </div>` : ''}
    `;

    // Folder click
    if(file.type === 'folder') {
      card.addEventListener('click', (e) => {
        if(e.target.closest('.context-menu')) return;
        currentPath.push(file);
        renderFiles();
      });
    } else {
      // File Preview
      card.addEventListener('click', (e) => {
        if(e.target.closest('.context-menu')) return;
        previewFile(file);
      });
    }

    container.appendChild(card);
  });
};

const previewFile = (file) => {
  const modal = document.getElementById('preview-modal');
  const title = document.getElementById('preview-title');
  const body = document.getElementById('preview-body');
  
  title.innerText = file.name;
  body.innerHTML = '';

  const downloadUrl = `${API_URL}/files/download/${file._id}`;

  if (file.mimeType.startsWith('image/')) {
    body.innerHTML = `<img src="${downloadUrl}" />`;
  } else if (file.mimeType === 'text/plain') {
    // Fetch text and display
    fetch(downloadUrl).then(res => res.text()).then(text => {
      body.innerHTML = `<pre>${text}</pre>`;
    });
  } else {
    body.innerHTML = `
      <p>Preview not available for this file type.</p>
      <a href="${downloadUrl}" target="_blank" class="btn btn-primary" style="margin-top:1rem;">Download</a>
    `;
  }

  modal.classList.remove('hidden');
};

const handleBreadcrumbClick = (e) => {
  if (e.target.classList.contains('crumb-link')) {
    if (e.target.dataset.id === 'root') {
      currentPath = [];
    } else {
      const idx = parseInt(e.target.dataset.index);
      currentPath = currentPath.slice(0, idx + 1);
    }
    renderFiles();
  }
};

// --- Search Functionality ---
const handleSearch = (e) => {
  const query = e.target.value.toLowerCase();
  
  if (!query) {
    // If search is empty, go back to folder view
    renderFiles();
    return;
  }
  
  const container = document.getElementById('files-container');
  container.innerHTML = '';
  
  const filteredFiles = allFiles.filter(f => f.name.toLowerCase().includes(query));
  
  if (filteredFiles.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted); padding:2rem;">No files found matching '${query}'.</p>`;
    return;
  }
  
  const breadcrumbs = document.getElementById('breadcrumbs');
  breadcrumbs.innerHTML = `<span>Search Results for "${query}"</span>`;
  
  filteredFiles.forEach(file => {
    const card = document.createElement('div');
    card.className = `file-card ${file.type}`;
    
    let icon = '📄';
    if (file.type === 'folder') icon = '📁';
    else if (file.mimeType && file.mimeType.startsWith('image/')) icon = '🖼️';
    else if (file.mimeType && file.mimeType.includes('pdf')) icon = '📕';

    card.innerHTML = `
      <div class="file-icon">${icon}</div>
      <div class="file-name">${file.name}</div>
      ${currentUser.role === 'admin' ? `
      <div class="context-menu">
        <button class="menu-btn">⋮</button>
        <div class="menu-dropdown">
          <button class="action-rename" data-id="${file._id}">Rename</button>
          <button class="action-delete" data-id="${file._id}">Delete</button>
          ${file.type === 'file' ? `<button class="action-download" data-id="${file._id}">Download</button>` : ''}
        </div>
      </div>` : ''}
    `;

    if(file.type !== 'folder') {
      card.addEventListener('click', (e) => {
        if(e.target.closest('.context-menu')) return;
        previewFile(file);
      });
    }

    container.appendChild(card);
  });
};

// --- Actions (Admin) ---
const createFolder = async () => {
  const name = prompt('Folder Name:');
  if (!name) return;
  showLoading('Creating folder...');
  try {
    await apiFetch('/files/folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parentId: getCurrentFolderId(), ownerId: currentUser._id })
    });
    await refreshFiles();
    renderFiles();
    showToast('Folder created');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
};

const uploadFile = async (e) => {
  const files = e.target.files;
  if (!files.length) return;
  
  showLoading('Uploading...');
  try {
    for(let file of files) {
      const formData = new FormData();
      formData.append('file', file);
      const pid = getCurrentFolderId();
      if(pid) formData.append('parentId', pid);
      formData.append('ownerId', currentUser._id);
      
      const res = await fetch(`${API_URL}/files/upload`, {
        method: 'POST',
        body: formData
      });
      if(!res.ok) throw new Error('Upload failed');
    }
    await refreshFiles();
    renderFiles();
    showToast('Upload successful');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
    e.target.value = ''; // Reset input
  }
};

const uploadFolder = async (e) => {
  const files = e.target.files;
  if (!files.length) return;
  
  showLoading('Uploading Folder Map...');
  // For simplicity, this demo uploads all files in the folder into the CURRENT path. 
  // A complete implementation would read `webkitRelativePath` to reconstruct the folder tree via API.
  try {
    for(let file of files) {
      const formData = new FormData();
      formData.append('file', file);
      const pid = getCurrentFolderId();
      if(pid) formData.append('parentId', pid);
      formData.append('ownerId', currentUser._id);
      
      await fetch(`${API_URL}/files/upload`, {
        method: 'POST',
        body: formData
      });
    }
    await refreshFiles();
    renderFiles();
    showToast('Folder upload complete');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
    e.target.value = '';
  }
};

const deleteNode = async (id) => {
  if (!confirm('Are you sure you want to delete this?')) return;
  showLoading('Deleting...');
  try {
    await apiFetch(`/files/${id}`, { method: 'DELETE' });
    await refreshFiles();
    renderFiles();
    showToast('Deleted');
  } catch(err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
};

const renameNode = async (id) => {
  const name = prompt('New name:');
  if(!name) return;
  showLoading('Renaming...');
  try {
    await apiFetch(`/files/rename/${id}`, { 
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    await refreshFiles();
    renderFiles();
  } catch(err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
};

// --- Users Admin ---
const renderUsers = async () => {
  if(currentUser.role !== 'admin') return;
  
  const tbody = document.getElementById('users-table-body');
  tbody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
  
  try {
    const users = await apiFetch('/auth/users');
    tbody.innerHTML = '';
    
    // update dashboard stats too
    document.getElementById('stat-users').innerText = users.length;
    document.getElementById('stat-pending').innerText = users.filter(u => u.status === 'pending').length;

    users.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><img src="${getGravatar(u.email)}" class="mini-avatar"></td>
        <td>${u.name} ${u.role === 'admin' ? '⭐' : ''}</td>
        <td>${u.email}</td>
        <td><span class="status-badge status-${u.status}">${u.status}</span></td>
        <td>${new Date(u.createdAt).toLocaleDateString()}</td>
        <td>
          ${u.role !== 'admin' ? `
            <select class="status-select" data-id="${u._id}">
              <option value="pending" ${u.status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="approved" ${u.status === 'approved' ? 'selected' : ''}>Approve</option>
              <option value="rejected" ${u.status === 'rejected' ? 'selected' : ''}>Reject</option>
            </select>
            <button class="btn btn-danger delete-user-btn" data-id="${u._id}">Delete</button>
          ` : ''}
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    showToast('Failed to load users', 'error');
  }
};

// --- Dashboard ---
const renderDashboard = () => {
  document.getElementById('stat-files').innerText = allFiles.length;
  const totalBytes = allFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  document.getElementById('stat-storage').innerText = (totalBytes / (1024*1024)).toFixed(2) + ' MB';
  if(currentUser.role === 'admin') {
    renderUsers(); // To populate user stats softly
  }
};


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
  
  // Mobile Menu Toggle
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  const closeMobileMenu = () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('open');
  };

  const openMobileMenu = () => {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('open');
  };

  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (sidebar.classList.contains('open')) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeMobileMenu);
  }

  // Close menu when nav item is clicked
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', closeMobileMenu);
  });

  // Auth Toggles
  document.getElementById('show-register').onclick = (e) => {
    e.preventDefault();
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
  };
  document.getElementById('show-login').onclick = (e) => {
    e.preventDefault();
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
  };

  // Forms
  document.getElementById('login-form').addEventListener('submit', login);
  document.getElementById('register-form').addEventListener('submit', register);

  // Nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      switchNav(e.target.dataset.view);
    });
  });

  document.getElementById('btn-logout').addEventListener('click', logout);

  // Files
  document.getElementById('breadcrumbs').addEventListener('click', handleBreadcrumbClick);
  document.getElementById('btn-create-folder').addEventListener('click', createFolder);
  document.getElementById('file-upload').addEventListener('change', uploadFile);
  document.getElementById('folder-upload').addEventListener('change', uploadFolder);
  
  // Search
  document.getElementById('search-input').addEventListener('input', handleSearch);

  // Context Menu Global Listener
  document.addEventListener('click', (e) => {
    // Close menus if clicked outside
    if(!e.target.closest('.context-menu')) {
      document.querySelectorAll('.context-menu').forEach(m => m.classList.remove('open'));
    }
    
    // Toggle Menu
    if(e.target.classList.contains('menu-btn')) {
      const menu = e.target.closest('.context-menu');
      const wasOpen = menu.classList.contains('open');
      document.querySelectorAll('.context-menu').forEach(m => m.classList.remove('open'));
      if(!wasOpen) menu.classList.add('open');
    }

    // Actions
    if(e.target.classList.contains('action-delete')) {
      deleteNode(e.target.dataset.id);
    }
    if(e.target.classList.contains('action-rename')) {
      renameNode(e.target.dataset.id);
    }
    if(e.target.classList.contains('action-download')) {
      window.open(`${API_URL}/files/download/${e.target.dataset.id}`, '_blank');
    }

    // Admin User Mgmt
    if(e.target.classList.contains('delete-user-btn')) {
      if(confirm('Delete user?')) {
        apiFetch(`/auth/users/${e.target.dataset.id}`, { method: 'DELETE' })
          .then(() => { showToast('User deleted'); renderUsers(); })
          .catch(err => showToast(err.message, 'error'));
      }
    }
  });

  document.addEventListener('change', (e) => {
    if(e.target.classList.contains('status-select')) {
      apiFetch(`/auth/users/${e.target.dataset.id}/status`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: e.target.value })
      })
      .then(() => showToast('Status updated', 'success'))
      .catch(err => showToast(err.message, 'error'));
    }
  });

  // Modals
  document.querySelector('.close-modal').addEventListener('click', () => {
    document.getElementById('preview-modal').classList.add('hidden');
    document.getElementById('preview-body').innerHTML = '';
  });

  // Init
  checkAuth();
});
