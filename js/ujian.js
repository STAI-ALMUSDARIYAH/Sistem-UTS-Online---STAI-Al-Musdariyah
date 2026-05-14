// ========================================
// UJIAN.JS - Exam Page Functions
// Support: Esai + Cerita + Pilihan+Alasan
// ========================================

let ujianSession = null;
let soalData = null;
let jawabanTemp = {};      // { idx: { jawaban?, pilihan?, alasan? } }
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

    document.getElementById('ujian-petunjuk').innerHTML = `<h4><i class="fas fa-info-circle"></i> Petunjuk Pengerjaan</h4><p>${escapeHtml(soalData.petunjuk || 'Jawablah semua pertanyaan dengan jelas dan lengkap.')}</p>`;

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
    let html = '';
    let navHtml = '';
    let lastCerita = null;

    soalData.soal.forEach((s, i) => {
        // Render cerita box if needed
        if (s.ceritaRef && s.ceritaRef !== lastCerita) {
            lastCerita = s.ceritaRef;
            html += `<div class="cerita-display-box">
                <div class="cerita-display-header">
                    <i class="fas fa-book-open"></i> Bacalah cerita/kasus berikut untuk menjawab pertanyaan di bawahnya:
                </div>
                <div class="cerita-display-text">${escapeHtml(s.ceritaRef)}</div>
            </div>`;
        }
        if (!s.ceritaRef) lastCerita = null;

        if (s.tipe === 'pilihan') {
            html += renderSoalPilihanUjian(i, s);
        } else {
            // Esai (default)
            let saved = jawabanTemp[i] && jawabanTemp[i].jawaban ? jawabanTemp[i].jawaban : '';
            html += `<div class="soal-card" id="soal-card-${i}">
                <span class="soal-number">Soal ${s.no}</span>
                <p class="soal-bobot">Bobot: ${s.bobot} poin</p>
                <div class="soal-text">${escapeHtml(s.pertanyaan)}</div>
                <textarea id="jawaban-${i}" placeholder="Tuliskan jawaban Anda di sini..."
                    oninput="saveJawabanEsai(${i})" onfocus="highlightNav(${i})">${escapeHtml(saved)}</textarea>
            </div>`;
        }

        navHtml += `<button class="nav-btn" id="nav-btn-${i}" onclick="scrollToSoal(${i})">${s.no}</button>`;
    });

    container.innerHTML = html;
    navContainer.innerHTML = navHtml;
}

function renderSoalPilihanUjian(idx, s) {
    let savedPilihan = (jawabanTemp[idx] && jawabanTemp[idx].pilihan) ? jawabanTemp[idx].pilihan : [];
    let savedAlasan = (jawabanTemp[idx] && jawabanTemp[idx].alasan) ? jawabanTemp[idx].alasan : '';

    let opsiHtml = '';
    let inputType = s.modePilihan === 'multi' ? 'checkbox' : 'radio';
    let groupName = `pilihan-${idx}`;

    if (s.opsi) {
        s.opsi.forEach(opt => {
            let isChecked = savedPilihan.includes(opt.label);
            opsiHtml += `<label class="ujian-opsi-label">
                <input type="${inputType}" name="${groupName}" value="${opt.label}" ${isChecked ? 'checked' : ''} 
                    onchange="savePilihan(${idx})">
                <span class="ujian-opsi-letter">${opt.label}.</span>
                <span class="ujian-opsi-text">${escapeHtml(opt.teks)}</span>
            </label>`;
        });
    }

    let alasanHtml = '';
    if (s.butuhAlasan) {
        alasanHtml = `<div class="ujian-alasan-box">
            <label><i class="fas fa-pen"></i> Berikan Alasan dari pilihan Anda:</label>
            <textarea id="alasan-${idx}" placeholder="Tuliskan alasan dari pilihan Anda..."
                oninput="saveAlasan(${idx})">${escapeHtml(savedAlasan)}</textarea>
        </div>`;
    }

    return `<div class="soal-card soal-card-pilihan" id="soal-card-${idx}">
        <span class="soal-number">Soal ${s.no}</span>
        <p class="soal-bobot">Bobot: ${s.bobot} poin | <span class="badge-mode">${s.modePilihan === 'multi' ? '☑ Pilih Beberapa' : '◉ Pilih Satu'}</span></p>
        <div class="soal-text">${escapeHtml(s.pertanyaan)}</div>
        <div class="ujian-opsi-list">
            <p class="opsi-instruksi"><i class="fas fa-${s.modePilihan === 'multi' ? 'check-square' : 'dot-circle'}"></i> 
                ${s.modePilihan === 'multi' ? 'Pilih satu atau lebih jawaban yang tepat:' : 'Pilih salah satu jawaban yang tepat:'}
            </p>
            ${opsiHtml}
        </div>
        ${alasanHtml}
    </div>`;
}

function saveJawabanEsai(idx) {
    let ta = document.getElementById('jawaban-' + idx);
    if (!jawabanTemp[idx]) jawabanTemp[idx] = {};
    jawabanTemp[idx].jawaban = ta.value;
    let nb = document.getElementById('nav-btn-' + idx);
    if (ta.value.trim()) nb.classList.add('answered');
    else nb.classList.remove('answered');
    updateAnsweredCount();
}

function savePilihan(idx) {
    let s = soalData.soal[idx];
    let groupName = `pilihan-${idx}`;
    let inputs = document.querySelectorAll(`input[name="${groupName}"]:checked`);
    let pilihan = [];
    inputs.forEach(inp => pilihan.push(inp.value));
    
    if (!jawabanTemp[idx]) jawabanTemp[idx] = {};
    jawabanTemp[idx].pilihan = pilihan;
    
    // Update nav status
    updateNavStatus(idx);
    updateAnsweredCount();
}

function saveAlasan(idx) {
    let ta = document.getElementById('alasan-' + idx);
    if (!jawabanTemp[idx]) jawabanTemp[idx] = {};
    jawabanTemp[idx].alasan = ta.value;
    updateNavStatus(idx);
    updateAnsweredCount();
}

function updateNavStatus(idx) {
    let s = soalData.soal[idx];
    let nb = document.getElementById('nav-btn-' + idx);
    let isAnswered = false;
    
    if (s.tipe === 'pilihan') {
        let temp = jawabanTemp[idx] || {};
        let hasPilihan = temp.pilihan && temp.pilihan.length > 0;
        let hasAlasan = !s.butuhAlasan || (temp.alasan && temp.alasan.trim());
        isAnswered = hasPilihan && hasAlasan;
    } else {
        let temp = jawabanTemp[idx] || {};
        isAnswered = temp.jawaban && temp.jawaban.trim();
    }
    
    if (isAnswered) nb.classList.add('answered');
    else nb.classList.remove('answered');
}

function highlightNav(index) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('current'));
    let nb = document.getElementById('nav-btn-' + index);
    if (nb) nb.classList.add('current');
}

function scrollToSoal(index) {
    let el = document.getElementById('soal-card-' + index);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        let ta = document.getElementById('jawaban-' + index) || document.getElementById('alasan-' + index);
        if (ta) ta.focus();
    }
}

function updateAnsweredCount() {
    let total = soalData.soal.length, answered = 0;
    for (let i = 0; i < total; i++) {
        let s = soalData.soal[i];
        let temp = jawabanTemp[i] || {};
        if (s.tipe === 'pilihan') {
            let hasPilihan = temp.pilihan && temp.pilihan.length > 0;
            let hasAlasan = !s.butuhAlasan || (temp.alasan && temp.alasan.trim());
            if (hasPilihan && hasAlasan) answered++;
        } else {
            if (temp.jawaban && temp.jawaban.trim()) answered++;
        }
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
    for (let i = 0; i < total; i++) {
        let s = soalData.soal[i];
        let temp = jawabanTemp[i] || {};
        if (s.tipe === 'pilihan') {
            let hasPilihan = temp.pilihan && temp.pilihan.length > 0;
            let hasAlasan = !s.butuhAlasan || (temp.alasan && temp.alasan.trim());
            if (hasPilihan && hasAlasan) answered++;
        } else {
            if (temp.jawaban && temp.jawaban.trim()) answered++;
        }
    }
    let w = document.getElementById('unanswered-warning');
    if (answered < total) { w.style.display = 'block'; w.querySelector('p').textContent = `⚠ Masih ada ${total - answered} soal belum dijawab lengkap!`; }
    else w.style.display = 'none';
    openModal('modal-confirm-submit');
}

function submitUjian() { closeModal('modal-confirm-submit'); doSubmit(); }
function forceSubmit() { closeModal('modal-time-up'); doSubmit(); }

function doSubmit() {
    clearInterval(timerInterval);
    let jawaban = soalData.soal.map((s, i) => {
        let temp = jawabanTemp[i] || {};
        let item = {
            no: s.no,
            tipe: s.tipe || 'esai',
            pertanyaan: s.pertanyaan,
            bobot: s.bobot,
            ceritaRef: s.ceritaRef || null
        };
        if (s.tipe === 'pilihan') {
            item.opsi = s.opsi;
            item.modePilihan = s.modePilihan;
            item.butuhAlasan = s.butuhAlasan;
            item.pilihan = temp.pilihan || [];
            item.alasan = temp.alasan || '';
        } else {
            item.jawaban = temp.jawaban || '';
        }
        return item;
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
