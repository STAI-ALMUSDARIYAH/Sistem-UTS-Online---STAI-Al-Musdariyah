// ========================================
// APP.JS - Main Application Logic
// LOGIN: Mahasiswa pakai NIM saja, Admin pakai user+password
// ========================================

// ===== LOGIN PAGE FUNCTIONS =====

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.login-form').forEach(form => form.classList.remove('active'));
    
    if (tab === 'mahasiswa') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('form-mahasiswa').classList.add('active');
        setTimeout(() => {
            let nimInput = document.getElementById('nim-input');
            if (nimInput) nimInput.focus();
        }, 100);
    } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('form-admin').classList.add('active');
        setTimeout(() => {
            let userInput = document.getElementById('admin-user');
            if (userInput) userInput.focus();
        }, 100);
    }
    
    hideMessage();
}

// LOGIN MAHASISWA - HANYA NIM
function loginMahasiswa() {
    let nim = document.getElementById('nim-input').value.trim();
    
    if (!nim) {
        showMessage('Masukkan NIM Anda!', 'error');
        return;
    }
    
    let mhs = DB.findMahasiswa(nim);
    if (!mhs) {
        showMessage('NIM tidak ditemukan! Silakan hubungi Admin.', 'error');
        return;
    }
    
    DB.setSession('mahasiswa', mhs);
    DB.addActivity(`Mahasiswa ${mhs.nama} (${mhs.nim}) login`);
    
    showMessage('Login berhasil! Mengalihkan...', 'success');
    setTimeout(() => {
        window.location.href = 'mahasiswa.html';
    }, 600);
}

// LOGIN ADMIN
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
        showMessage('Login berhasil! Mengalihkan...', 'success');
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 600);
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
    let modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
}

function closeModal(id) {
    let modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
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
    if (text === null || text === undefined) return '';
    let str = String(text);
    let div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
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
