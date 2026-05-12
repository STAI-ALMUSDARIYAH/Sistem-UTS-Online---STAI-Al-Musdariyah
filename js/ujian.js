// ========================================
// UJIAN.JS - Exam Page Functions
// ========================================

let ujianSession = null;
let soalData = null;
let jawabanTemp = {};
let timerInterval = null;
let remainingSeconds = 0;

document.addEventListener('DOMContentLoaded', function() {
    let session = checkAuth('mahasiswa');
    if (!session) return;
    
    ujianSession = DB.getUjianSession();
    if (!ujianSession) {
        alert('Tidak ada sesi ujian aktif!');
        window.location.href = 'mahasiswa.html';
        return;
    }
    
    // Check if already submitted
    let existingJawaban = DB.getJawabanDetail(ujianSession.nim, ujianSession.matkulId);
    if (existingJawaban) {
        alert('Anda sudah mengumpulkan jawaban untuk ujian ini!');
        DB.clearUjianSession();
        window.location.href = 'mahasiswa.html';
        return;
    }
    
    soalData = DB.getSoalMatkul(ujianSession.matkulId);
    if (!soalData) {
        alert('Soal tidak ditemukan!');
        window.location.href = 'mahasiswa.html';
        return;
    }
    
    initUjian();
});

function initUjian() {
    let mk = DB.getMatkulById(ujianSession.matkulId);
    
    // Set header info
    document.getElementById('ujian-matkul-title').textContent = mk ? mk.nama : soalData.matkulNama;
    document.getElementById('ujian-nama-mhs').textContent = ujianSession.namaMhs;
    document.getElementById('ujian-nim-mhs').textContent = ujianSession.nim;
    document.getElementById('ujian-matkul-info').textContent = mk ? mk.nama : soalData.matkulNama;
    document.getElementById('ujian-dosen-info').textContent = mk ? mk.dosen : soalData.dosen;
    
    // Set petunjuk
    let petunjukEl = document.getElementById('ujian-petunjuk');
    if (soalData.petunjuk) {
        petunjukEl.innerHTML = `<h4><i class="fas fa-info-circle"></i> Petunjuk Pengerjaan</h4><p>${escapeHtml(soalData.petunjuk)}</p>`;
    } else {
        petunjukEl.innerHTML = `<h4><i class="fas fa-info-circle"></i> Petunjuk Pengerjaan</h4><p>Jawablah semua pertanyaan dengan jelas dan lengkap.</p>`;
    }
    
    // Render soal
    renderSoal();
    
    // Start timer
    startTimer();
    
    // Set total soal count
    document.getElementById('total-soal-count').textContent = soalData.soal.length;
    
    // Prevent page close
    window.addEventListener('beforeunload', function(e) {
        e.preventDefault();
        e.returnValue = 'Ujian sedang berlangsung. Yakin ingin meninggalkan halaman?';
    });
}

function renderSoal() {
    let container = document.getElementById('soal-container');
    let navContainer = document.getElementById('soal-nav-buttons');
    
    let soalHtml = '';
    let navHtml = '';
    
    soalData.soal.forEach((s, i) => {
        let savedAnswer = jawabanTemp[i] || '';
        
        soalHtml += `
            <div class="soal-card" id="soal-card-${i}">
                <span class="soal-number">Soal ${s.no}</span>
                <p class="soal-bobot">Bobot: ${s.bobot} poin</p>
                <div class="soal-text">${escapeHtml(s.pertanyaan)}</div>
                <textarea 
                    id="jawaban-${i}" 
                    placeholder="Tuliskan jawaban Anda di sini..." 
                    oninput="saveJawabanTemp(${i})"
                    onfocus="highlightNav(${i})"
                >${escapeHtml(savedAnswer)}</textarea>
            </div>
        `;
        
        navHtml += `
            <button class="nav-btn" id="nav-btn-${i}" onclick="scrollToSoal(${i})">${s.no}</button>
        `;
    });
    
    container.innerHTML = soalHtml;
    navContainer.innerHTML = navHtml;
}

function saveJawabanTemp(index) {
    let textarea = document.getElementById('jawaban-' + index);
    jawabanTemp[index] = textarea.value;
    
    // Update nav button
    let navBtn = document.getElementById('nav-btn-' + index);
    if (textarea.value.trim()) {
        navBtn.classList.add('answered');
    } else {
        navBtn.classList.remove('answered');
    }
    
    updateAnsweredCount();
}

function highlightNav(index) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('current'));
    let navBtn = document.getElementById('nav-btn-' + index);
    if (navBtn) navBtn.classList.add('current');
}

function scrollToSoal(index) {
    let el = document.getElementById('soal-card-' + index);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        document.getElementById('jawaban-' + index).focus();
    }
}

function updateAnsweredCount() {
    let total = soalData.soal.length;
    let answered = 0;
    
    for (let i = 0; i < total; i++) {
        let textarea = document.getElementById('jawaban-' + i);
        if (textarea && textarea.value.trim()) {
            answered++;
        }
    }
    
    document.getElementById('answered-count').textContent = answered;
}

// ===== TIMER =====
function startTimer() {
    let startTime = new Date(ujianSession.startTime).getTime();
    let durasiMs = ujianSession.durasi * 60 * 1000;
    let endTime = startTime + durasiMs;
    
    timerInterval = setInterval(function() {
        let now = Date.now();
        remainingSeconds = Math.floor((endTime - now) / 1000);
        
        if (remainingSeconds <= 0) {
            clearInterval(timerInterval);
            document.getElementById('timer-countdown').textContent = '00:00:00';
            // Time's up!
            openModal('modal-time-up');
            return;
        }
        
        let hours = Math.floor(remainingSeconds / 3600);
        let minutes = Math.floor((remainingSeconds % 3600) / 60);
        let seconds = remainingSeconds % 60;
        
        let display = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        document.getElementById('timer-countdown').textContent = display;
        
        // Warning when less than 5 minutes
        if (remainingSeconds < 300) {
            document.querySelector('.timer-display').classList.add('warning');
        }
    }, 1000);
}

// ===== SUBMIT =====
function confirmSubmitUjian() {
    let total = soalData.soal.length;
    let answered = 0;
    
    for (let i = 0; i < total; i++) {
        let textarea = document.getElementById('jawaban-' + i);
        if (textarea && textarea.value.trim()) {
            answered++;
        }
    }
    
    let warningEl = document.getElementById('unanswered-warning');
    if (answered < total) {
        warningEl.style.display = 'block';
        warningEl.querySelector('p').textContent = `⚠ Masih ada ${total - answered} soal yang belum dijawab!`;
    } else {
        warningEl.style.display = 'none';
    }
    
    openModal('modal-confirm-submit');
}

function submitUjian() {
    closeModal('modal-confirm-submit');
    doSubmit();
}

function forceSubmit() {
    closeModal('modal-time-up');
    doSubmit();
}

function doSubmit() {
    clearInterval(timerInterval);
    
    // Collect all answers
    let jawaban = soalData.soal.map((s, i) => {
        let textarea = document.getElementById('jawaban-' + i);
        return {
            no: s.no,
            pertanyaan: s.pertanyaan,
            bobot: s.bobot,
            jawaban: textarea ? textarea.value.trim() : ''
        };
    });
    
    let mk = DB.getMatkulById(ujianSession.matkulId);
    
    let jawabanData = {
        nim: ujianSession.nim,
        namaMhs: ujianSession.namaMhs,
        semester: ujianSession.semester,
        matkulId: ujianSession.matkulId,
        matkulNama: mk ? mk.nama : soalData.matkulNama,
        jawaban: jawaban,
        startedAt: ujianSession.startTime,
        submittedAt: new Date().toISOString()
    };
    
    let result = DB.addJawaban(jawabanData);
    
    if (result) {
        DB.addActivity(`${ujianSession.namaMhs} mengumpulkan jawaban: ${jawabanData.matkulNama}`);
    }
    
    DB.clearUjianSession();
    
    // Remove beforeunload
    window.removeEventListener('beforeunload', function() {});
    
    alert('Jawaban berhasil dikumpulkan!\nTerima kasih telah mengerjakan ujian.');
    window.location.href = 'mahasiswa.html';
}