// ========================================
// APP.JS - Main Application Logic
// ========================================

// ===== LOGIN PAGE FUNCTIONS =====

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.login-form').forEach(form => form.classList.remove('active'));
    
    if (tab === 'mahasiswa') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('form-mahasiswa').classList.add('active');
    } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('form-admin').classList.add('active');
    }
    
    hideMessage();
}

function loginMahasiswa() {
    let nim = document.getElementById('nim-input').value.trim();
    let password = document.getElementById('password-mhs').value.trim();
    
    if (!nim || !password) {
        showMessage('Masukkan NIM dan Password!', 'error');
        return;
    }
    
    let mhs = DB.findMahasiswa(nim);
    if (!mhs) {
        showMessage('NIM tidak ditemukan! Hubungi Admin.', 'error');
        return;
    }
    
    if (mhs.password !== password) {
        showMessage('Password salah!', 'error');
        return;
    }
    
    DB.setSession('mahasiswa', mhs);
    DB.addActivity(`Mahasiswa ${mhs.nama} (${mhs.nim}) login`);
    window.location.href = 'mahasiswa.html';
}

function loginAdmin() {
    let username = document.getElementById('admin-user').value.trim();
    let password = document.getElementById('admin-pass').value.trim();
    
    if (!username || !password) {
        showMessage('Masukkan Username dan Password!', 'error');
        return;
    }
    
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        DB.setSession('admin', { username: 'Admin' });
        DB.addActivity('Admin login ke sistem');
        window.location.href = 'admin.html';
    } else {
        showMessage('Username atau Password Admin salah!', 'error');
    }
}

function logout() {
    let session = DB.getSession();
    if (session.role === 'admin') {
        DB.addActivity('Admin logout dari sistem');
    } else if (session.user) {
        DB.addActivity(`Mahasiswa ${session.user.nama} logout`);
    }
    DB.clearSession();
    DB.clearUjianSession();
    window.location.href = 'index.html';
}

function showMessage(msg, type) {
    let el = document.getElementById('login-message');
    if (el) {
        el.textContent = msg;
        el.className = 'message ' + type;
    }
}

function hideMessage() {
    let el = document.getElementById('login-message');
    if (el) {
        el.className = 'message';
    }
}

// ===== MODAL FUNCTIONS =====
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// ===== AUTH CHECK =====
function checkAuth(requiredRole) {
    let session = DB.getSession();
    if (!session.role || session.role !== requiredRole) {
        window.location.href = 'index.html';
        return null;
    }
    return session;
}

// ===== UTILITY FUNCTIONS =====
function formatDateTime(isoString) {
    if (!isoString) return '-';
    let d = new Date(isoString);
    return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    let div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}

// Enter key support for login
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        let activeForm = document.querySelector('.login-form.active');
        if (activeForm) {
            if (activeForm.id === 'form-mahasiswa') {
                loginMahasiswa();
            } else {
                loginAdmin();
            }
        }
    }
});