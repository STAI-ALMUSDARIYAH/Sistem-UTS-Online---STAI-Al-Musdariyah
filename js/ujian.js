// ========================================
// UJIAN.JS - Exam Page Functions
// Support: Soal Biasa + Soal Cerita/Kasus
// ========================================

let ujianSession = null;
let soalData = null;
let jawabanTemp = {};
let timerInterval = null;
let remainingSeconds = 0;

document.addEventListener('DOMContentLoaded', function () {
    let session = checkAuth('mahasiswa');
    if (!session) return;

    ujianSession = DB.getUjianSession();
    if (!ujianSession) { alert('Tidak ada sesi ujian aktif!'); window.location.href = 'mahasiswa.html'; return; }

    let existing = DB.getJawabanDetail(ujianSession.nim, ujianSession.matkulId);
    if (existing) { alert('Anda sudah mengumpulkan jawaban!'); DB.clearUjianSession(); window.location.href = 'mahasiswa.html'; return; }

    soalData = DB.getSoalMatkul(ujianSession.matkulId);
    if (!soalData) { alert('Soal tidak ditemukan!'); window.location.href = 'mahasiswa.html'; return; }

    initUjian();
});

function initUjian() {
    let mk = DB.getMatkulById(ujianSession.matkulId);
    document.getElementById('ujian-matkul-title').textContent = mk ? mk.nama : soalData.matkulNama;
    document.getElementById('ujian-nama-mhs').textContent = ujianSession.namaMhs;
    document.getElementById('ujian-nim-mhs').textContent = ujianSession.nim;
    document.getElementById('ujian-matkul-info').textContent = mk ? mk.nama : soalData.matkulNama;
    document.getElementById('ujian-dosen-info').textContent = mk ? mk.dosen : soalData.dosen;

    let petEl = document.getElementById('ujian-petunjuk');
    petEl.innerHTML = `<h4><i class="fas fa-info-circle"></i> Petunjuk Pengerjaan</h4><p>${escapeHtml(soalData.petunjuk || 'Jawablah semua pertanyaan dengan jelas dan lengkap.')}</p>`;

    renderSoal();
    startTimer();
    document.getElementById('total-soal-count').textContent = soalData.soal.length;

    window.addEventListener('beforeunload', function (e) {
        e.preventDefault();
        e.returnValue = 'Ujian sedang berlangsung!';
    });
}

function renderSoal() {
    let container = document.getElementById('soal-container');
    let navContainer = document.getElementById('soal-nav-buttons');
    let soalHtml = '';
    let navHtml = '';
    let lastCerita = null;

    soalData.soal.forEach((s, i) => {
        let saved = jawabanTemp[i] || '';

        // Check if this soal has ceritaRef (from soal cerita block)
        if (s.ceritaRef && s.ceritaRef !== lastCerita) {
            lastCerita = s.ceritaRef;
            soalHtml += `
                <div class="cerita-display-box">
                    <div class="cerita-display-header">
                        <i class="fas fa-book-open"></i> Bacalah cerita/kasus berikut untuk menjawab pertanyaan di bawahnya:
                    </div>
                    <div class="cerita-display-text">${escapeHtml(s.ceritaRef)}</div>
                </div>`;
        }
        if (s.ceritaRef === null || s.ceritaRef === undefined) {
            lastCerita = null;
        }

        soalHtml += `
            <div class="soal-card" id="soal-card-${i}">
                <span class="soal-number">Soal ${s.no}</span>
                <p class="soal-bobot">Bobot: ${s.bobot} poin</p>
                <div class="soal-text">${escapeHtml(s.pertanyaan)}</div>
                <textarea id="jawaban-${i}" placeholder="Tuliskan jawaban Anda di sini..."
                    oninput="saveJawabanTemp(${i})" onfocus="highlightNav(${i})">${escapeHtml(saved)}</textarea>
            </div>`;

        navHtml += `<button class="nav-btn" id="nav-btn-${i}" onclick="scrollToSoal(${i})">${s.no}</button>`;
    });

    container.innerHTML = soalHtml;
    navContainer.innerHTML = navHtml;
}

function saveJawabanTemp(index) {
    let ta = document.getElementById('jawaban-' + index);
    jawabanTemp[index] = ta.value;
    let nb = document.getElementById('nav-btn-' + index);
    if (ta.value.trim()) nb.classList.add('answered');
    else nb.classList.remove('answered');
    updateAnsweredCount();
}

function highlightNav(index) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('current'));
    let nb = document.getElementById('nav-btn-' + index);
    if (nb) nb.classList.add('current');
}

function scrollToSoal(index) {
    let el = document.getElementById('soal-card-' + index);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); document.getElementById('jawaban-' + index).focus(); }
}

function updateAnsweredCount() {
    let total = soalData.soal.length, answered = 0;
    for (let i = 0; i < total; i++) {
        let ta = document.getElementById('jawaban-' + i);
        if (ta && ta.value.trim()) answered++;
    }
    document.getElementById('answered-count').textContent = answered;
}

function startTimer() {
    let startTime = new Date(ujianSession.startTime).getTime();
    let endTime = startTime + ujianSession.durasi * 60 * 1000;
    timerInterval = setInterval(function () {
        let now = Date.now();
        remainingSeconds = Math.floor((endTime - now) / 1000);
        if (remainingSeconds <= 0) {
            clearInterval(timerInterval);
            document.getElementById('timer-countdown').textContent = '00:00:00';
            openModal('modal-time-up');
            return;
        }
        let h = Math.floor(remainingSeconds / 3600);
        let m = Math.floor((remainingSeconds % 3600) / 60);
        let s = remainingSeconds % 60;
        document.getElementById('timer-countdown').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        if (remainingSeconds < 300) document.querySelector('.timer-display').classList.add('warning');
    }, 1000);
}

function confirmSubmitUjian() {
    let total = soalData.soal.length, answered = 0;
    for (let i = 0; i < total; i++) { let ta = document.getElementById('jawaban-' + i); if (ta && ta.value.trim()) answered++; }
    let w = document.getElementById('unanswered-warning');
    if (answered < total) { w.style.display = 'block'; w.querySelector('p').textContent = `⚠ Masih ada ${total - answered} soal belum dijawab!`; }
    else w.style.display = 'none';
    openModal('modal-confirm-submit');
}

function submitUjian() { closeModal('modal-confirm-submit'); doSubmit(); }
function forceSubmit() { closeModal('modal-time-up'); doSubmit(); }

function doSubmit() {
    clearInterval(timerInterval);
    let jawaban = soalData.soal.map((s, i) => {
        let ta = document.getElementById('jawaban-' + i);
        return {
            no: s.no,
            pertanyaan: s.pertanyaan,
            bobot: s.bobot,
            ceritaRef: s.ceritaRef || null,
            jawaban: ta ? ta.value.trim() : ''
        };
    });
    let mk = DB.getMatkulById(ujianSession.matkulId);
    DB.addJawaban({
        nim: ujianSession.nim, namaMhs: ujianSession.namaMhs, semester: ujianSession.semester,
        matkulId: ujianSession.matkulId, matkulNama: mk ? mk.nama : soalData.matkulNama,
        jawaban: jawaban, startedAt: ujianSession.startTime, submittedAt: new Date().toISOString()
    });
    DB.addActivity(`${ujianSession.namaMhs} submit jawaban: ${mk ? mk.nama : ''}`);
    DB.clearUjianSession();
    alert('✅ Jawaban berhasil dikumpulkan!\nTerima kasih.');
    window.location.href = 'mahasiswa.html';
}
