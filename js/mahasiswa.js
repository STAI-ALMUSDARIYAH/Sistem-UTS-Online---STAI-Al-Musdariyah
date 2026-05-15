// ========================================
// MAHASISWA.JS - FULL VERSION
// Support: Online + Kertas Polio (RAPI) + Google Form
// ========================================

let currentMhs = null;
let kertasFotoData = [];
let currentKertasMatkulId = null;

document.addEventListener('DOMContentLoaded', function () {
    let session = checkAuth('mahasiswa');
    if (!session) return;
    currentMhs = session.user;

    document.getElementById('mhs-nama').textContent = currentMhs.nama;
    document.getElementById('profile-nama').textContent = currentMhs.nama;
    document.getElementById('profile-nim').textContent = currentMhs.nim;
    document.getElementById('profile-semester').textContent = currentMhs.semester;
    document.getElementById('profile-kelas').textContent = currentMhs.kelas || 'RPL';

    loadUjianTersedia();
    loadRiwayatUjian();
    loadNilaiSaya();
});

function showMhsSection(section) {
    document.querySelectorAll('.mhs-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.mhs-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('mhs-' + section).classList.add('active');
    event.target.closest('.mhs-tab').classList.add('active');
    if (section === 'nilai-saya') loadNilaiSaya();
    if (section === 'riwayat-ujian') loadRiwayatUjian();
    if (section === 'ujian-tersedia') loadUjianTersedia();
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

    mkData.forEach(mk => {
        let soal = soalAll[mk.id];
        if (!soal) return;
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
        container.innerHTML = '<p class="empty-state"><i class="fas fa-info-circle"></i> Tidak ada ujian yang tersedia untuk semester Anda.</p>';
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
function openGForm(matkulId) {
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
    DB.addJawaban(jawaban);
    DB.addActivity(currentMhs.nama + ' membuka Google Form: ' + mk.nama);
    window.open(soal.gformLink, '_blank');
    loadUjianTersedia();
    alert('✅ Google Form telah dibuka di tab baru.');
}

// ========================================
// ===== KERTAS POLIO - TAMPILAN RAPI =====
// ========================================

// PARSER untuk format soal yang rapi & terstruktur
function formatSoalKertas(text) {
    if (!text) return '<p style="color:#999;text-align:center;padding:20px;">Tidak ada soal</p>';

    let lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let html = '';
    let currentMain = null;
    let mainBuffer = [];
    let subBuffer = [];

    function flushMain() {
        if (currentMain === null) return;
        
        // Build main item
        html += '<div class="qq-main-block">';
        html += '<div class="qq-main-row">';
        html += '<div class="qq-num-circle">' + currentMain.num + '</div>';
        html += '<div class="qq-main-text">' + escapeHtml(currentMain.text) + '</div>';
        html += '</div>';
        
        // Continuation paragraphs (text dibawah main yang bukan sub)
        if (mainBuffer.length > 0) {
            mainBuffer.forEach(p => {
                html += '<div class="qq-main-cont">' + escapeHtml(p) + '</div>';
            });
        }
        
        // Sub items
        if (subBuffer.length > 0) {
            html += '<div class="qq-sub-wrapper">';
            subBuffer.forEach(s => {
                html += '<div class="qq-sub-row">';
                html += '<div class="qq-sub-circle">' + s.label + '</div>';
                html += '<div class="qq-sub-text">' + escapeHtml(s.text) + '</div>';
                html += '</div>';
            });
            html += '</div>';
        }
        
        html += '</div>';
        currentMain = null;
        mainBuffer = [];
        subBuffer = [];
    }

    lines.forEach(line => {
        // Match nomor utama: "1." "2." "1)" "2)"
        let mainMatch = line.match(/^(\d+)[\.\)]\s*(.+)$/);
        // Match sub-letter: "a." "b." "a)" "b)"  
        let subMatch = line.match(/^([a-z])[\.\)]\s*(.+)$/i);

        if (mainMatch) {
            flushMain();
            currentMain = { num: mainMatch[1], text: mainMatch[2] };
        } else if (subMatch && currentMain !== null) {
            subBuffer.push({ label: subMatch[1].toLowerCase(), text: subMatch[2] });
        } else {
            if (currentMain !== null) {
                // Continuation of main soal
                mainBuffer.push(line);
            } else {
                // Free paragraph at top
                html += '<p class="qq-paragraph">' + escapeHtml(line) + '</p>';
            }
        }
    });

    flushMain();
    return html;
}

    let overlay = document.createElement('div');
    overlay.id = 'kertas-overlay';
    overlay.className = 'kertas-overlay';
    overlay.innerHTML = `
        <div class="kertas-topbar">
            <div class="topbar-title">
                <i class="fas fa-file-signature"></i>
                <span>Ujian Kertas Polio: ${escapeHtml(mk.nama)}</span>
            </div>
            <button onclick="closeKertasOverlay()" class="topbar-close">
                <i class="fas fa-times"></i> Tutup
            </button>
        </div>
        ${html}
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    renderFotoPreview();
}

// PARSER untuk format soal yang rapi
function formatSoalKertas(text) {
    if (!text) return '<p style="color:#999;">Tidak ada soal</p>';

    let lines = text.split('\n');
    let html = '';
    let inList = false;

    lines.forEach(line => {
        let trimmed = line.trim();
        if (!trimmed) {
            if (inList) { html += '</div>'; inList = false; }
            html += '<div class="soal-spacer"></div>';
            return;
        }

        // Detect main number (1. 2. 3. etc atau 1) 2) 3))
        let mainMatch = trimmed.match(/^(\d+)[\.\)]\s*(.+)$/);
        // Detect sub-letter (a. b. c. atau a) b) c))
        let subMatch = trimmed.match(/^([a-z])[\.\)]\s*(.+)$/i);

        if (mainMatch) {
            if (inList) { html += '</div>'; inList = false; }
            html += '<div class="soal-main-item">' +
                '<div class="soal-main-num">' + mainMatch[1] + '</div>' +
                '<div class="soal-main-text">' + escapeHtml(mainMatch[2]) + '</div>' +
                '</div>';
            inList = true;
        } else if (subMatch && inList) {
            html += '<div class="soal-sub-item">' +
                '<div class="soal-sub-num">' + subMatch[1].toLowerCase() + '.</div>' +
                '<div class="soal-sub-text">' + escapeHtml(subMatch[2]) + '</div>' +
                '</div>';
        } else {
            if (inList) {
                // Continuation paragraph dalam soal main
                html += '<div class="soal-continuation">' + escapeHtml(trimmed) + '</div>';
            } else {
                html += '<p class="soal-paragraph">' + escapeHtml(trimmed) + '</p>';
            }
        }
    });

    if (inList) html += '</div>';
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

function handleFotoSelect(input, maxFoto) {
    let files = input.files;
    if (!files || files.length === 0) return;
    if (kertasFotoData.length + files.length > maxFoto) {
        alert('⚠️ Maksimal ' + maxFoto + ' foto!\nAnda sudah upload ' + kertasFotoData.length + ' foto.');
        input.value = '';
        return;
    }
    let progressDiv = document.getElementById('kertas-progress');
    let progressText = document.getElementById('progress-text');
    progressDiv.style.display = 'block';
    let totalFiles = files.length;
    let processedFiles = 0;
    let promises = [];

    Array.from(files).forEach((file, i) => {
        let p = new Promise((resolve) => {
            if (!file.type.startsWith('image/')) { resolve(); return; }
            progressText.textContent = 'Memproses ' + (i + 1) + '/' + totalFiles + '...';
            compressImage(file, function (compressedDataUrl, sizeKB) {
                kertasFotoData.push({
                    no: kertasFotoData.length + 1,
                    namaFile: file.name,
                    ukuranAsli: (file.size / 1024).toFixed(1) + ' KB',
                    ukuranKompres: sizeKB + ' KB',
                    dataUrl: compressedDataUrl
                });
                processedFiles++;
                resolve();
            }, function (err) { console.error(err); resolve(); });
        });
        promises.push(p);
    });

    Promise.all(promises).then(() => {
        progressDiv.style.display = 'none';
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
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                let compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                let sizeKB = (compressedDataUrl.length * 0.75 / 1024).toFixed(1);
                callback(compressedDataUrl, sizeKB);
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

    if (kertasFotoData.length === 0) {
        preview.innerHTML = '<div class="foto-empty"><i class="fas fa-images"></i><p>Belum ada foto diupload</p></div>';
        return;
    }
    preview.innerHTML = kertasFotoData.map((f, i) =>
        '<div class="foto-card">' +
        '<div class="foto-card-img" style="background-image:url(' + f.dataUrl + ');"></div>' +
        '<div class="foto-card-footer">' +
        '<span class="foto-page">Hal. ' + (i + 1) + '</span>' +
        '<span class="foto-size">' + f.ukuranKompres + '</span>' +
        '</div>' +
        '<button class="foto-remove" onclick="removeFoto(' + i + ')" title="Hapus">×</button>' +
        '<button class="foto-zoom" onclick="zoomFoto(\'' + i + '\')" title="Lihat"><i class="fas fa-search-plus"></i></button>' +
        '</div>'
    ).join('');
}

function zoomFoto(idx) {
    let foto = kertasFotoData[idx];
    if (!foto) return;
    let zoom = document.createElement('div');
    zoom.id = 'foto-zoom-overlay';
    zoom.className = 'foto-zoom-overlay';
    zoom.innerHTML = '<div class="foto-zoom-close" onclick="document.getElementById(\'foto-zoom-overlay\').remove();">×</div>' +
        '<img src="' + foto.dataUrl + '" alt="Foto Jawaban">';
    zoom.onclick = function (e) { if (e.target === zoom) zoom.remove(); };
    document.body.appendChild(zoom);
}

function removeFoto(idx) {
    if (!confirm('Hapus foto halaman ' + (idx + 1) + '?')) return;
    kertasFotoData.splice(idx, 1);
    renderFotoPreview();
}

function submitKertasFinal() {
    if (kertasFotoData.length === 0) { alert('⚠️ Upload minimal 1 foto jawaban terlebih dahulu!'); return; }
    if (!currentKertasMatkulId) { alert('❌ Error: Mata kuliah tidak terdeteksi.'); return; }
    if (!confirm('📤 Kumpulkan ' + kertasFotoData.length + ' foto jawaban?\n\n⚠️ Setelah dikumpulkan TIDAK BISA DIUBAH lagi.\n\nLanjutkan?')) return;

    let progressDiv = document.getElementById('kertas-progress');
    let progressText = document.getElementById('progress-text');
    progressDiv.style.display = 'block';
    progressText.textContent = 'Mengumpulkan jawaban...';

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
        let result = DB.addJawaban(jawaban);
        if (!result) {
            progressDiv.style.display = 'none';
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
        alert('✅ Jawaban berhasil dikumpulkan!\n\n' + jawaban.jawaban.length + ' foto telah diupload.\nTerima kasih.');
    } catch (err) {
        progressDiv.style.display = 'none';
        if (err.name === 'QuotaExceededError' || err.message.indexOf('quota') !== -1) {
            alert('❌ GAGAL: Penyimpanan browser penuh!\n\nKurangi jumlah foto atau hubungi admin.');
        } else {
            alert('❌ Gagal: ' + err.message);
        }
    }
}

// ===== RIWAYAT =====
function loadRiwayatUjian() {
    let jawaban = DB.getJawabanByNim(currentMhs.nim);
    let tbody = document.getElementById('tbody-riwayat');
    if (jawaban.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Belum ada riwayat</td></tr>'; return; }
    tbody.innerHTML = jawaban.map((j, i) => {
        let mk = DB.getMatkulById(j.matkulId);
        let nilai = DB.getNilai().find(n => n.nim === j.nim && n.matkulId === j.matkulId);
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
