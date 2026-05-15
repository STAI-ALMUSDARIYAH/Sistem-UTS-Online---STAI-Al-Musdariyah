// ========================================
// MAHASISWA.JS - VERSI CLOUD SYNC
// STAI Al-Musdariyah - UTS Online System
// ========================================

let currentMhs = null;
let kertasFotoData = [];
let currentKertasMatkulId = null;
let currentMaxFoto = 5;

document.addEventListener('DOMContentLoaded', async function () {
    let session = checkAuth('mahasiswa');
    if (!session) return;
    currentMhs = session.user;

    document.getElementById('mhs-nama').textContent = currentMhs.nama;
    document.getElementById('profile-nama').textContent = currentMhs.nama;
    document.getElementById('profile-nim').textContent = currentMhs.nim;
    document.getElementById('profile-semester').textContent = currentMhs.semester;
    document.getElementById('profile-kelas').textContent = currentMhs.kelas || 'RPL';

    // PENTING: Force sync dari cloud sebelum load data
    showLoadingMhs('Memuat data ujian dari server...');
    await DB.syncFromCloud();
    hideLoadingMhs();

    loadUjianTersedia();
    loadRiwayatUjian();
    loadNilaiSaya();
});

// ===== LOADING INDICATOR =====
function showLoadingMhs(msg) {
    let existing = document.getElementById('mhs-loading');
    if (existing) existing.remove();
    let div = document.createElement('div');
    div.id = 'mhs-loading';
    div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;';
    div.innerHTML = '<div style="background:white;padding:25px 40px;border-radius:12px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.3);">' +
        '<div style="width:40px;height:40px;border:4px solid #f3f3f3;border-top:4px solid #2e86c1;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 12px;"></div>' +
        '<p style="margin:0;font-size:13px;color:#333;font-weight:500;">' + msg + '</p>' +
        '</div>';
    document.body.appendChild(div);
}

function hideLoadingMhs() {
    let el = document.getElementById('mhs-loading');
    if (el) el.remove();
}

function showMhsSection(section) {
    document.querySelectorAll('.mhs-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.mhs-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('mhs-' + section).classList.add('active');
    event.target.closest('.mhs-tab').classList.add('active');

    // Refresh data dari cloud setiap pindah tab
    if (section === 'nilai-saya') {
        refreshNilai();
    } else if (section === 'riwayat-ujian') {
        refreshRiwayat();
    } else if (section === 'ujian-tersedia') {
        refreshUjian();
    }
}

async function refreshUjian() {
    showLoadingMhs('Memuat ujian terbaru...');
    await DB.syncFromCloud();
    hideLoadingMhs();
    loadUjianTersedia();
}

async function refreshRiwayat() {
    showLoadingMhs('Memuat riwayat...');
    await DB.syncFromCloud();
    hideLoadingMhs();
    loadRiwayatUjian();
}

async function refreshNilai() {
    showLoadingMhs('Memuat nilai...');
    await DB.syncFromCloud();
    hideLoadingMhs();
    loadNilaiSaya();
}

// ===== UJIAN TERSEDIA =====
function loadUjianTersedia() {
    let semester = currentMhs.semester;
    let mkData = semester === '5' ? MATA_KULIAH_DATA.semester5 : MATA_KULIAH_DATA.semester7;
    let soalAll = DB.getSoal();
    let jawabanMhs = DB.getJawabanByNim(currentMhs.nim);
    let container = document.getElementById('ujian-list');
    let ujianHtml = '';
    let count = 0;

    console.log('📚 Loading ujian for semester:', semester);
    console.log('📋 Soal di cloud:', Object.keys(soalAll));
    console.log('📝 Jawaban mhs:', jawabanMhs.length);

    mkData.forEach(mk => {
        let soal = soalAll[mk.id];
        if (!soal) {
            console.log('⚠️ Belum ada soal untuk:', mk.id, '-', mk.nama);
            return;
        }
        let alreadySubmitted = jawabanMhs.find(j => j.matkulId === mk.id);
        let mode = soal.mode || 'online';
        count++;

        let modeIcon = '';
        if (mode === 'kertas') {
            modeIcon = '<span class="ujian-mode-badge mode-kertas"><i class="fas fa-file-signature"></i> Kertas Polio</span>';
        } else if (mode === 'gform') {
            modeIcon = '<span class="ujian-mode-badge mode-gform"><i class="fab fa-google"></i> Google Form</span>';
        } else {
            modeIcon = '<span class="ujian-mode-badge mode-online"><i class="fas fa-laptop"></i> Online</span>';
        }

        let durasi = soal.durasi || 90;
        let jumlahSoal = soal.soal ? soal.soal.length : 0;
        let extraInfo = '';
        if (mode === 'kertas') {
            extraInfo = '<p><i class="fas fa-camera"></i> Upload maks. ' + (soal.maxFoto || 5) + ' foto</p>';
        } else if (mode === 'gform') {
            extraInfo = '<p><i class="fas fa-external-link-alt"></i> Mengerjakan via Google Form</p>';
        } else {
            extraInfo = '<p><i class="fas fa-question-circle"></i> Jumlah Soal: ' + jumlahSoal + '</p>';
        }

        let btnHtml = '';
        if (alreadySubmitted) {
            btnHtml = '<button class="btn-start-ujian" disabled><i class="fas fa-check-circle"></i> Sudah Dikerjakan</button>';
        } else if (mode === 'gform') {
            btnHtml = '<button class="btn-start-ujian" onclick="openGForm(\'' + mk.id + '\')"><i class="fab fa-google"></i> Buka Google Form</button>';
        } else if (mode === 'kertas') {
            btnHtml = '<button class="btn-start-ujian" style="background:linear-gradient(135deg,#e67e22,#f0b27a);" onclick="startUjianKertas(\'' + mk.id + '\')"><i class="fas fa-camera"></i> Mulai & Upload</button>';
        } else {
            btnHtml = '<button class="btn-start-ujian" onclick="startUjian(\'' + mk.id + '\')"><i class="fas fa-play"></i> Mulai Ujian</button>';
        }

        ujianHtml += '<div class="ujian-card">' +
            '<div class="ujian-card-info">' +
            '<h4>' + escapeHtml(mk.nama) + '</h4>' +
            modeIcon +
            '<p><i class="fas fa-user-tie"></i> ' + escapeHtml(mk.dosen) + '</p>' +
            '<p><i class="fas fa-clock"></i> Durasi: ' + durasi + ' menit</p>' +
            extraInfo +
            '<p><i class="fas fa-calendar"></i> ' + mk.hari + ', ' + mk.jam + '</p>' +
            '</div><div>' + btnHtml + '</div></div>';
    });

    if (count === 0) {
        container.innerHTML = '<div class="empty-state" style="padding:30px;">' +
            '<p><i class="fas fa-info-circle" style="font-size:30px;color:#3498db;display:block;margin-bottom:10px;"></i></p>' +
            '<p>Tidak ada ujian yang tersedia untuk Semester ' + semester + ' saat ini.</p>' +
            '<p style="font-size:12px;color:#999;margin-top:10px;">Soal akan muncul setelah Admin/Dosen menambahkan.</p>' +
            '<button class="btn-secondary" style="margin-top:15px;" onclick="refreshUjian()">' +
            '<i class="fas fa-sync"></i> Refresh Data</button>' +
            '</div>';
    } else {
        container.innerHTML = ujianHtml;
    }
}

// ===== START UJIAN ONLINE =====
function startUjian(matkulId) {
    let soal = DB.getSoalMatkul(matkulId);
    if (!soal) { alert('Soal belum tersedia!'); return; }
    if (!confirm('Mulai ujian:\n\n' + soal.matkulNama + '\nDurasi: ' + soal.durasi + ' menit\n\nLanjutkan?')) return;
    let ujianData = {
        matkulId: matkulId, nim: currentMhs.nim,
        namaMhs: currentMhs.nama, semester: currentMhs.semester,
        startTime: new Date().toISOString(), durasi: soal.durasi
    };
    DB.setUjianSession(ujianData);
    DB.addActivity(currentMhs.nama + ' memulai ujian: ' + soal.matkulNama);
    window.location.href = 'ujian.html';
}

// ===== GOOGLE FORM =====
async function openGForm(matkulId) {
    let soal = DB.getSoalMatkul(matkulId);
    if (!soal || !soal.gformLink) { alert('Link Google Form belum tersedia!'); return; }
    let mk = DB.getMatkulById(matkulId);
    if (!confirm('Anda akan membuka Google Form:\n\n' + mk.nama + '\n\n' +
        (soal.petunjuk || 'Jawab semua pertanyaan lalu klik Submit.') + '\n\nLanjutkan?')) return;

    let jawaban = {
        nim: currentMhs.nim, namaMhs: currentMhs.nama, semester: currentMhs.semester,
        matkulId: matkulId, matkulNama: mk.nama, mode: 'gform',
        jawaban: [{ no: 1, tipe: 'gform', pertanyaan: 'Dikerjakan via Google Form', jawaban: 'Link: ' + soal.gformLink, bobot: 100 }],
        startedAt: new Date().toISOString(), submittedAt: new Date().toISOString()
    };

    showLoadingMhs('Menyimpan data...');
    await DB.addJawaban(jawaban);
    hideLoadingMhs();

    DB.addActivity(currentMhs.nama + ' membuka Google Form: ' + mk.nama);
    window.open(soal.gformLink, '_blank');
    loadUjianTersedia();
    alert('✅ Google Form telah dibuka di tab baru.\n\nKerjakan dan klik Submit di Google Form tersebut.');
}

// ========================================
// ===== KERTAS POLIO =====
// ========================================

function startUjianKertas(matkulId) {
    let soal = DB.getSoalMatkul(matkulId);
    if (!soal) { alert('Soal belum tersedia!'); return; }
    let mk = DB.getMatkulById(matkulId);
    let maxFoto = soal.maxFoto || 5;

    currentKertasMatkulId = matkulId;
    currentMaxFoto = maxFoto;
    kertasFotoData = [];

    let soalFormatted = formatSoalKertas(soal.soalText || '');

    let html = '<div class="kp-container">' +

        '<div class="kp-cover">' +
        '<div class="kp-cover-icon"><i class="fas fa-file-signature"></i></div>' +
        '<h1>UJIAN TENGAH SEMESTER</h1>' +
        '<h2>' + escapeHtml(mk.nama) + '</h2>' +
        '<div class="kp-pills">' +
        '<span><i class="fas fa-user-tie"></i> ' + escapeHtml(mk.dosen) + '</span>' +
        '<span><i class="fas fa-clock"></i> ' + (soal.durasi || 90) + ' Menit</span>' +
        '<span><i class="fas fa-camera"></i> Maks. ' + maxFoto + ' Foto</span>' +
        '</div></div>' +

        '<div class="kp-info">' +
        '<div class="kp-info-item"><span class="kp-info-label">Nama</span><span class="kp-info-value">' + escapeHtml(currentMhs.nama) + '</span></div>' +
        '<div class="kp-info-item"><span class="kp-info-label">NIM</span><span class="kp-info-value">' + escapeHtml(currentMhs.nim) + '</span></div>' +
        '<div class="kp-info-item"><span class="kp-info-label">Semester</span><span class="kp-info-value">' + currentMhs.semester + ' (' + (currentMhs.kelas || 'RPL') + ')</span></div>' +
        '<div class="kp-info-item"><span class="kp-info-label">Tanggal</span><span class="kp-info-value">' + formatTodayLong() + '</span></div>' +
        '</div>' +

        '<div class="kp-card">' +
        '<div class="kp-card-head kp-head-orange"><i class="fas fa-info-circle"></i> Petunjuk Pengerjaan</div>' +
        '<div class="kp-card-body">' + escapeHtml(soal.petunjuk || '').replace(/\n/g, '<br>') + '</div>' +
        '</div>' +

        '<div class="kp-card">' +
        '<div class="kp-card-head kp-head-blue"><i class="fas fa-file-alt"></i> Soal Ujian</div>' +
        '<div class="kp-card-body kp-soal-body">' + soalFormatted + '</div>' +
        '</div>' +

        '<div class="kp-card">' +
        '<div class="kp-card-head kp-head-green"><i class="fas fa-list-ol"></i> Cara Mengumpulkan</div>' +
        '<div class="kp-card-body">' +
        '<div class="kp-step"><div class="kp-step-num">1</div><div class="kp-step-text">Tulis <b>Nama, NIM, dan Mata Kuliah</b> di kertas polio</div></div>' +
        '<div class="kp-step"><div class="kp-step-num">2</div><div class="kp-step-text">Kerjakan semua soal dengan rapi</div></div>' +
        '<div class="kp-step"><div class="kp-step-num">3</div><div class="kp-step-text">Foto setiap halaman dengan terang</div></div>' +
        '<div class="kp-step"><div class="kp-step-num">4</div><div class="kp-step-text">Klik tombol upload (maks. ' + maxFoto + ' foto)</div></div>' +
        '<div class="kp-step"><div class="kp-step-num">5</div><div class="kp-step-text">Klik <b>"Kumpulkan Jawaban"</b></div></div>' +
        '</div></div>' +

        '<div class="kp-card">' +
        '<div class="kp-card-head kp-head-orange-dark"><i class="fas fa-cloud-upload-alt"></i> Upload Foto Jawaban</div>' +
        '<div class="kp-card-body">' +

        '<button type="button" class="kp-upload-btn" onclick="triggerFileInput()">' +
        '<i class="fas fa-camera"></i>' +
        '<span>Klik untuk Pilih / Foto Jawaban</span>' +
        '<small>Pilih beberapa foto sekaligus (Maks. ' + maxFoto + ' foto)</small>' +
        '</button>' +

        '<input type="file" id="kertas-foto-input" accept="image/*" multiple style="display:none;">' +

        '<div id="kertas-progress" class="kp-progress" style="display:none;">' +
        '<i class="fas fa-spinner fa-spin"></i> <span id="progress-text">Memproses...</span>' +
        '</div>' +

        '<div class="kp-counter"><i class="fas fa-images"></i> Foto terupload: <span id="foto-count">0</span> / ' + maxFoto + '</div>' +

        '<div id="kertas-foto-preview" class="kp-foto-grid"></div>' +

        '</div></div>' +

        '<div class="kp-actions">' +
        '<button type="button" class="kp-btn-submit" onclick="submitKertasFinal()"><i class="fas fa-paper-plane"></i> KUMPULKAN JAWABAN</button>' +
        '<button type="button" class="kp-btn-cancel" onclick="closeKertasOverlay()"><i class="fas fa-times"></i> Batal</button>' +
        '</div>' +

        '</div>';

    let overlay = document.createElement('div');
    overlay.id = 'kertas-overlay';
    overlay.className = 'kp-overlay';
    overlay.innerHTML =
        '<div class="kp-topbar">' +
        '<div class="kp-topbar-title"><i class="fas fa-file-signature"></i> <span>Ujian: ' + escapeHtml(mk.nama) + '</span></div>' +
        '<button type="button" onclick="closeKertasOverlay()" class="kp-topbar-close"><i class="fas fa-times"></i> Tutup</button>' +
        '</div>' +
        html;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    setTimeout(function () {
        let fileInput = document.getElementById('kertas-foto-input');
        if (fileInput) {
            fileInput.addEventListener('change', function (e) {
                handleFotoSelect(e.target);
            });
        }
        renderFotoPreview();
    }, 100);
}

function triggerFileInput() {
    let fileInput = document.getElementById('kertas-foto-input');
    if (fileInput) {
        fileInput.value = '';
        fileInput.click();
    } else {
        alert('❌ Input file tidak ditemukan!');
    }
}

function formatSoalKertas(text) {
    if (!text || !text.trim()) {
        return '<p style="color:#999;text-align:center;padding:20px;font-style:italic;">Tidak ada soal tersedia</p>';
    }
    let lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let html = '';
    let currentMain = null;
    let mainCont = [];
    let subItems = [];

    function flush() {
        if (currentMain === null) return;
        html += '<div class="kp-q-main"><div class="kp-q-row">';
        html += '<div class="kp-q-num">' + currentMain.num + '</div>';
        html += '<div class="kp-q-text">' + escapeHtml(currentMain.text) + '</div></div>';
        if (mainCont.length > 0) {
            mainCont.forEach(p => {
                html += '<div class="kp-q-cont">' + escapeHtml(p) + '</div>';
            });
        }
        if (subItems.length > 0) {
            html += '<div class="kp-q-subs">';
            subItems.forEach(s => {
                html += '<div class="kp-q-sub-row">';
                html += '<div class="kp-q-sub-num">' + s.label + '</div>';
                html += '<div class="kp-q-sub-text">' + escapeHtml(s.text) + '</div>';
                html += '</div>';
            });
            html += '</div>';
        }
        html += '</div>';
        currentMain = null; mainCont = []; subItems = [];
    }

    lines.forEach(line => {
        let mainMatch = line.match(/^(\d+)[\.\)]\s*(.+)$/);
        let subMatch = line.match(/^([a-z])[\.\)]\s*(.+)$/i);
        if (mainMatch) {
            flush();
            currentMain = { num: mainMatch[1], text: mainMatch[2] };
        } else if (subMatch && currentMain !== null) {
            subItems.push({ label: subMatch[1].toLowerCase(), text: subMatch[2] });
        } else {
            if (currentMain !== null) mainCont.push(line);
            else html += '<p class="kp-q-paragraph">' + escapeHtml(line) + '</p>';
        }
    });
    flush();
    return html;
}

function formatTodayLong() {
    let d = new Date();
    let bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return d.getDate() + ' ' + bulan[d.getMonth()] + ' ' + d.getFullYear();
}

function closeKertasOverlay() {
    if (kertasFotoData.length > 0) {
        if (!confirm('⚠️ Anda sudah upload beberapa foto. Yakin ingin keluar? Foto akan hilang.')) return;
    }
    let overlay = document.getElementById('kertas-overlay');
    if (overlay) overlay.remove();
    document.body.style.overflow = '';
    kertasFotoData = [];
    currentKertasMatkulId = null;
}

function handleFotoSelect(input) {
    let files = input.files;
    if (!files || files.length === 0) return;
    if (kertasFotoData.length + files.length > currentMaxFoto) {
        alert('⚠️ Maksimal ' + currentMaxFoto + ' foto!\nSudah upload ' + kertasFotoData.length + ' foto.');
        input.value = '';
        return;
    }
    let progressDiv = document.getElementById('kertas-progress');
    let progressText = document.getElementById('progress-text');
    if (progressDiv) progressDiv.style.display = 'block';
    let totalFiles = files.length;
    let promises = [];
    Array.from(files).forEach((file, i) => {
        let p = new Promise((resolve) => {
            if (!file.type.startsWith('image/')) { resolve(); return; }
            if (progressText) progressText.textContent = 'Memproses ' + (i + 1) + '/' + totalFiles + '...';
            compressImage(file, function (compressedDataUrl, sizeKB) {
                kertasFotoData.push({
                    no: kertasFotoData.length + 1,
                    namaFile: file.name,
                    ukuranKompres: sizeKB + ' KB',
                    dataUrl: compressedDataUrl
                });
                resolve();
            }, function (err) { console.error(err); resolve(); });
        });
        promises.push(p);
    });
    Promise.all(promises).then(() => {
        if (progressDiv) progressDiv.style.display = 'none';
        renderFotoPreview();
        input.value = '';
    });
}

function compressImage(file, callback, errorCallback) {
    let reader = new FileReader();
    reader.onload = function (e) {
        let img = new Image();
        img.onload = function () {
            try {
                let canvas = document.createElement('canvas');
                let ctx = canvas.getContext('2d');
                let maxDim = 1200;
                let width = img.width, height = img.height;
                if (width > height) {
                    if (width > maxDim) { height = Math.round((height * maxDim) / width); width = maxDim; }
                } else {
                    if (height > maxDim) { width = Math.round((width * maxDim) / height); height = maxDim; }
                }
                canvas.width = width; canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                let dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                let sizeKB = (dataUrl.length * 0.75 / 1024).toFixed(1);
                callback(dataUrl, sizeKB);
            } catch (err) { errorCallback(err); }
        };
        img.onerror = function () { errorCallback(new Error('Gagal load gambar')); };
        img.src = e.target.result;
    };
    reader.onerror = function () { errorCallback(new Error('Gagal baca file')); };
    reader.readAsDataURL(file);
}

function renderFotoPreview() {
    let preview = document.getElementById('kertas-foto-preview');
    let counter = document.getElementById('foto-count');
    if (counter) counter.textContent = kertasFotoData.length;
    if (!preview) return;
    if (kertasFotoData.length === 0) {
        preview.innerHTML = '<div class="kp-foto-empty"><i class="fas fa-images"></i><p>Belum ada foto diupload</p></div>';
        return;
    }
    preview.innerHTML = kertasFotoData.map((f, i) =>
        '<div class="kp-foto-card">' +
        '<div class="kp-foto-img" style="background-image:url(' + f.dataUrl + ');"></div>' +
        '<div class="kp-foto-foot"><span>Hal. ' + (i + 1) + '</span><span>' + f.ukuranKompres + '</span></div>' +
        '<button type="button" class="kp-foto-remove" onclick="removeFoto(' + i + ')" title="Hapus">×</button>' +
        '<button type="button" class="kp-foto-zoom" onclick="zoomFoto(' + i + ')" title="Lihat"><i class="fas fa-search-plus"></i></button>' +
        '</div>'
    ).join('');
}

function zoomFoto(idx) {
    let foto = kertasFotoData[idx];
    if (!foto) return;
    let zoom = document.createElement('div');
    zoom.id = 'foto-zoom-overlay';
    zoom.className = 'kp-zoom-overlay';
    zoom.innerHTML = '<div class="kp-zoom-close" onclick="document.getElementById(\'foto-zoom-overlay\').remove();">×</div>' +
        '<img src="' + foto.dataUrl + '" alt="Foto Jawaban">';
    zoom.onclick = function (e) { if (e.target === zoom) zoom.remove(); };
    document.body.appendChild(zoom);
}

function removeFoto(idx) {
    if (!confirm('Hapus foto halaman ' + (idx + 1) + '?')) return;
    kertasFotoData.splice(idx, 1);
    renderFotoPreview();
}

async function submitKertasFinal() {
    if (kertasFotoData.length === 0) { alert('⚠️ Upload minimal 1 foto jawaban terlebih dahulu!'); return; }
    if (!currentKertasMatkulId) { alert('❌ Error: Mata kuliah tidak terdeteksi.'); return; }
    if (!confirm('📤 Kumpulkan ' + kertasFotoData.length + ' foto jawaban?\n\n⚠️ Setelah dikumpulkan TIDAK BISA DIUBAH lagi.\n\nLanjutkan?')) return;

    let progressDiv = document.getElementById('kertas-progress');
    let progressText = document.getElementById('progress-text');
    if (progressDiv) progressDiv.style.display = 'block';
    if (progressText) progressText.textContent = 'Mengumpulkan jawaban ke server...';

    let mk = DB.getMatkulById(currentKertasMatkulId);
    let jawaban = {
        nim: currentMhs.nim, namaMhs: currentMhs.nama, semester: currentMhs.semester,
        matkulId: currentKertasMatkulId, matkulNama: mk.nama, mode: 'kertas',
        jawaban: kertasFotoData.map((f, i) => ({
            no: i + 1, tipe: 'foto',
            pertanyaan: 'Foto jawaban halaman ' + (i + 1),
            jawaban: f.namaFile + ' (' + f.ukuranKompres + ')',
            fotoData: f.dataUrl, bobot: 0
        })),
        startedAt: new Date().toISOString(), submittedAt: new Date().toISOString()
    };

    try {
        let result = await DB.addJawaban(jawaban);
        if (!result) {
            if (progressDiv) progressDiv.style.display = 'none';
            alert('❌ Anda sudah pernah mengumpulkan jawaban untuk mata kuliah ini!');
            return;
        }
        DB.addActivity(currentMhs.nama + ' upload jawaban kertas: ' + mk.nama + ' (' + kertasFotoData.length + ' foto)');
        let overlay = document.getElementById('kertas-overlay');
        if (overlay) overlay.remove();
        document.body.style.overflow = '';
        kertasFotoData = [];
        currentKertasMatkulId = null;
        loadUjianTersedia();
        loadRiwayatUjian();
        alert('✅ Jawaban berhasil dikumpulkan!\n\n' + jawaban.jawaban.length + ' foto telah diupload ke server.');
    } catch (err) {
        if (progressDiv) progressDiv.style.display = 'none';
        if (err.name === 'QuotaExceededError' || err.message.indexOf('quota') !== -1) {
            alert('❌ GAGAL: Penyimpanan penuh!\n\nKurangi jumlah foto.');
        } else {
            alert('❌ Gagal: ' + err.message);
        }
    }
}

// ===== RIWAYAT =====
function loadRiwayatUjian() {
    let jawaban = DB.getJawabanByNim(currentMhs.nim);
    let tbody = document.getElementById('tbody-riwayat');
    if (jawaban.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Belum ada riwayat ujian</td></tr>';
        return;
    }
    tbody.innerHTML = jawaban.map((j, i) => {
        let mk = DB.getMatkulById(j.matkulId);
        let nilai = DB.getNilai().find(n => String(n.nim) === String(j.nim) && n.matkulId === j.matkulId);
        let modeLabel = '';
        if (j.mode === 'kertas') modeLabel = '<span class="ujian-mode-badge mode-kertas">📝 Kertas</span>';
        else if (j.mode === 'gform') modeLabel = '<span class="ujian-mode-badge mode-gform">📋 GForm</span>';
        else modeLabel = '<span class="ujian-mode-badge mode-online">💻 Online</span>';
        return '<tr><td>' + (i + 1) + '</td>' +
            '<td>' + escapeHtml(mk ? mk.nama : j.matkulNama) + ' ' + modeLabel + '</td>' +
            '<td>' + formatDateTime(j.submittedAt) + '</td>' +
            '<td><span class="status-badge ' + (nilai ? 'status-lulus' : 'status-submitted') + '">' +
            (nilai ? 'Dinilai (' + nilai.nilai + ')' : 'Menunggu Nilai') + '</span></td>' +
            '<td><span class="status-badge status-submitted"><i class="fas fa-check"></i> Terkumpul</span></td></tr>';
    }).join('');
}

// ===== NILAI =====
function loadNilaiSaya() {
    let semester = currentMhs.semester;
    let mkData = semester === '5' ? MATA_KULIAH_DATA.semester5 : MATA_KULIAH_DATA.semester7;
    let nilaiAll = DB.getNilaiByNim(currentMhs.nim);
    let jawabanMhs = DB.getJawabanByNim(currentMhs.nim);
    let tbody = document.getElementById('tbody-nilai-mhs');
    let remedialItems = [];
    tbody.innerHTML = mkData.map((mk, i) => {
        let nilai = nilaiAll.find(n => n.matkulId === mk.id);
        let sudahUjian = jawabanMhs.find(j => j.matkulId === mk.id);
        let nilaiText = '-', gradeText = '-', statusText = 'Belum Ujian';
        let statusClass = 'status-pending', gradeClass = '', keterangan = '-';
        if (nilai) {
            nilaiText = nilai.nilai; gradeText = nilai.grade;
            statusText = nilai.status;
            statusClass = nilai.status === 'Lulus' ? 'status-lulus' : 'status-remedial';
            gradeClass = 'grade-' + nilai.grade;
            keterangan = nilai.catatan || '-';
            if (nilai.status === 'Remedial') {
                remedialItems.push({ matkul: mk.nama, dosen: mk.dosen, noHp: mk.noHp, nilai: nilai.nilai });
            }
        } else if (sudahUjian) { statusText = 'Menunggu Nilai'; statusClass = 'status-submitted'; }
        return '<tr><td>' + (i + 1) + '</td><td>' + escapeHtml(mk.nama) + '</td>' +
            '<td>' + escapeHtml(mk.dosen) + '</td><td><strong>' + nilaiText + '</strong></td>' +
            '<td><span class="grade-badge ' + gradeClass + '">' + gradeText + '</span></td>' +
            '<td><span class="status-badge ' + statusClass + '">' + statusText + '</span></td>' +
            '<td>' + escapeHtml(keterangan) + '</td></tr>';
    }).join('');
    let remedialBox = document.getElementById('remedial-info');
    let remedialList = document.getElementById('remedial-list');
    if (remedialItems.length > 0) {
        remedialBox.style.display = 'block';
        remedialList.innerHTML = remedialItems.map(r =>
            '<div class="remedial-item">' +
            '<p><strong>' + escapeHtml(r.matkul) + '</strong> - Nilai: ' + r.nilai + '</p>' +
            '<p>Dosen: ' + escapeHtml(r.dosen) + '</p>' +
            '<p>Hubungi: <a href="https://wa.me/' + r.noHp.replace(/^0/, '62') + '" target="_blank">' +
            '<i class="fab fa-whatsapp"></i> ' + r.noHp + '</a></p></div>'
        ).join('');
    } else { remedialBox.style.display = 'none'; }
}

// CSS animation for spinner (inject sekali aja)
if (!document.getElementById('mhs-spinner-css')) {
    let style = document.createElement('style');
    style.id = 'mhs-spinner-css';
    style.textContent = '@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }';
    document.head.appendChild(style);
}
