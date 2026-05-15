// ========================================
// MAHASISWA.JS - FULL VERSION
// Support: Online + Kertas Polio + Google Form
// ========================================

let currentMhs = null;

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
        matkulId: matkulId,
        nim: currentMhs.nim,
        namaMhs: currentMhs.nama,
        semester: currentMhs.semester,
        startTime: new Date().toISOString(),
        durasi: soal.durasi
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
        (soal.petunjuk || 'Jawab semua pertanyaan lalu klik Submit.') +
        '\n\nLanjutkan?')) return;

    let jawaban = {
        nim: currentMhs.nim,
        namaMhs: currentMhs.nama,
        semester: currentMhs.semester,
        matkulId: matkulId,
        matkulNama: mk.nama,
        mode: 'gform',
        jawaban: [{ no: 1, tipe: 'gform', pertanyaan: 'Dikerjakan via Google Form', jawaban: 'Link: ' + soal.gformLink, bobot: 100 }],
        startedAt: new Date().toISOString(),
        submittedAt: new Date().toISOString()
    };
    DB.addJawaban(jawaban);
    DB.addActivity(currentMhs.nama + ' membuka Google Form: ' + mk.nama);
    window.open(soal.gformLink, '_blank');
    loadUjianTersedia();
    alert('✅ Google Form telah dibuka di tab baru.\n\nKerjakan dan klik Submit di Google Form tersebut.');
}

// ========================================
// ===== KERTAS POLIO (FIXED) =====
// ========================================

let kertasFotoData = []; // Store compressed photos
let currentKertasMatkulId = null;

function startUjianKertas(matkulId) {
    let soal = DB.getSoalMatkul(matkulId);
    if (!soal) { alert('Soal belum tersedia!'); return; }
    let mk = DB.getMatkulById(matkulId);
    let maxFoto = soal.maxFoto || 5;

    currentKertasMatkulId = matkulId;
    kertasFotoData = [];

    let soalDisplay = escapeHtml(soal.soalText || '').replace(/\n/g, '<br>');

    let html = '<div style="max-width:800px;margin:0 auto;padding:20px;">' +
        '<div style="background:#fff;border-radius:12px;padding:25px;box-shadow:0 4px 20px rgba(0,0,0,.1);">' +
        '<h2 style="color:#1a5276;text-align:center;margin-bottom:5px;">📝 Ujian Kertas Polio</h2>' +
        '<h3 style="text-align:center;color:#555;margin-bottom:20px;font-size:16px;">' + escapeHtml(mk.nama) + '</h3>' +

        '<div style="background:#fff3cd;border-left:4px solid #f39c12;padding:14px;border-radius:6px;margin-bottom:20px;">' +
        '<strong><i class="fas fa-info-circle"></i> Petunjuk:</strong><br>' +
        '<span style="font-size:13px;line-height:1.6;">' + escapeHtml(soal.petunjuk || '') + '</span>' +
        '</div>' +

        '<div style="background:#f8f9fa;border:2px solid #ddd;border-radius:8px;padding:18px;margin-bottom:20px;">' +
        '<h4 style="color:#1a5276;margin-bottom:12px;"><i class="fas fa-file-alt"></i> SOAL UJIAN:</h4>' +
        '<div style="line-height:1.8;font-size:14px;white-space:pre-wrap;">' + soalDisplay + '</div>' +
        '</div>' +

        '<div style="background:#e8f8f5;border:2px solid #82e0aa;border-radius:8px;padding:15px;margin-bottom:15px;">' +
        '<h4 style="color:#1e8449;margin-bottom:8px;"><i class="fas fa-camera"></i> Cara Mengumpulkan:</h4>' +
        '<ol style="font-size:13px;line-height:1.7;margin-left:20px;">' +
        '<li>Tulis Nama, NIM, dan Mata Kuliah di kertas polio</li>' +
        '<li>Kerjakan semua soal dengan rapi</li>' +
        '<li>Foto setiap halaman dengan jelas dan terang</li>' +
        '<li>Klik tombol di bawah untuk upload foto (Maks. ' + maxFoto + ' foto)</li>' +
        '<li>Setelah semua foto terupload, klik tombol "Kumpulkan Jawaban"</li>' +
        '</ol></div>' +

        '<h4 style="color:#e67e22;margin-bottom:10px;"><i class="fas fa-upload"></i> Upload Foto Jawaban</h4>' +

        '<label for="kertas-foto-input" style="display:block;background:linear-gradient(135deg,#e67e22,#f0b27a);color:white;padding:18px;border-radius:8px;text-align:center;cursor:pointer;font-weight:600;margin-bottom:15px;">' +
        '<i class="fas fa-camera" style="font-size:24px;display:block;margin-bottom:8px;"></i>' +
        'Klik untuk Pilih / Foto Jawaban<br>' +
        '<span style="font-size:11px;opacity:.9;">(Bisa pilih beberapa foto sekaligus, maks. ' + maxFoto + ')</span>' +
        '</label>' +
        '<input type="file" id="kertas-foto-input" accept="image/*" multiple onchange="handleFotoSelect(this,' + maxFoto + ')" style="display:none;">' +

        '<div id="kertas-foto-preview" style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:15px;min-height:50px;">' +
        '<p style="color:#999;font-style:italic;font-size:12px;width:100%;text-align:center;">Belum ada foto diupload</p>' +
        '</div>' +

        '<div id="kertas-progress" style="display:none;background:#cfe2ff;padding:10px;border-radius:6px;margin-bottom:15px;text-align:center;">' +
        '<i class="fas fa-spinner fa-spin"></i> <span id="progress-text">Memproses...</span>' +
        '</div>' +

        '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
        '<button class="btn-success" style="flex:1;padding:14px;font-size:15px;font-weight:600;" onclick="submitKertasFinal()">' +
        '<i class="fas fa-paper-plane"></i> Kumpulkan Jawaban</button>' +
        '<button class="btn-secondary" style="padding:14px 20px;" onclick="closeKertasOverlay()">' +
        '<i class="fas fa-times"></i> Batal</button>' +
        '</div>' +

        '</div></div>';

    let overlay = document.createElement('div');
    overlay.id = 'kertas-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#f0f2f5;z-index:9999;overflow-y:auto;';
    overlay.innerHTML = '<div style="position:sticky;top:0;background:#1a5276;color:white;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;z-index:1;box-shadow:0 2px 10px rgba(0,0,0,.2);">' +
        '<span style="font-weight:600;"><i class="fas fa-file-signature"></i> Ujian: ' + escapeHtml(mk.nama) + '</span>' +
        '<button onclick="closeKertasOverlay()" style="background:rgba(255,255,255,.2);color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;">✕ Tutup</button></div>' +
        html;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
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

// Handle file selection - dengan kompresi otomatis
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
        let p = new Promise((resolve, reject) => {
            // Validasi tipe file
            if (!file.type.startsWith('image/')) {
                console.warn('Skip non-image:', file.name);
                resolve();
                return;
            }

            progressText.textContent = 'Memproses foto ' + (i + 1) + '/' + totalFiles + '...';

            // Compress image
            compressImage(file, function (compressedDataUrl, sizeKB) {
                kertasFotoData.push({
                    no: kertasFotoData.length + 1,
                    namaFile: file.name,
                    ukuranAsli: (file.size / 1024).toFixed(1) + ' KB',
                    ukuranKompres: sizeKB + ' KB',
                    dataUrl: compressedDataUrl
                });
                processedFiles++;
                progressText.textContent = 'Diproses ' + processedFiles + '/' + totalFiles;
                resolve();
            }, function (err) {
                console.error('Error compressing:', err);
                resolve();
            });
        });
        promises.push(p);
    });

    Promise.all(promises).then(() => {
        progressDiv.style.display = 'none';
        renderFotoPreview();
        input.value = ''; // Reset input
    }).catch(err => {
        progressDiv.style.display = 'none';
        alert('❌ Error: ' + err.message);
    });
}

// Image compression function
function compressImage(file, callback, errorCallback) {
    let reader = new FileReader();

    reader.onload = function (e) {
        let img = new Image();

        img.onload = function () {
            try {
                let canvas = document.createElement('canvas');
                let ctx = canvas.getContext('2d');

                // Maksimal dimensi 1200px (cukup untuk dibaca, hemat space)
                let maxDim = 1200;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxDim) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    }
                } else {
                    if (height > maxDim) {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // Compress ke JPEG quality 0.7 (hemat space ~70-80%)
                let compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                let sizeKB = (compressedDataUrl.length * 0.75 / 1024).toFixed(1);

                callback(compressedDataUrl, sizeKB);
            } catch (err) {
                errorCallback(err);
            }
        };

        img.onerror = function () {
            errorCallback(new Error('Gagal load gambar'));
        };

        img.src = e.target.result;
    };

    reader.onerror = function () {
        errorCallback(new Error('Gagal baca file'));
    };

    reader.readAsDataURL(file);
}

function renderFotoPreview() {
    let preview = document.getElementById('kertas-foto-preview');
    if (kertasFotoData.length === 0) {
        preview.innerHTML = '<p style="color:#999;font-style:italic;font-size:12px;width:100%;text-align:center;">Belum ada foto diupload</p>';
        return;
    }

    preview.innerHTML = kertasFotoData.map((f, i) =>
        '<div style="position:relative;width:140px;border:2px solid #82e0aa;border-radius:8px;overflow:hidden;background:white;">' +
        '<img src="' + f.dataUrl + '" style="width:100%;height:140px;object-fit:cover;display:block;">' +
        '<div style="background:#1a5276;color:white;padding:4px 8px;font-size:11px;text-align:center;">Hal. ' + (i + 1) + ' (' + f.ukuranKompres + ')</div>' +
        '<button onclick="removeFoto(' + i + ')" style="position:absolute;top:5px;right:5px;background:#e74c3c;color:white;border:none;width:24px;height:24px;border-radius:50%;cursor:pointer;font-weight:bold;">×</button>' +
        '</div>'
    ).join('');
}

function removeFoto(idx) {
    if (!confirm('Hapus foto ini?')) return;
    kertasFotoData.splice(idx, 1);
    renderFotoPreview();
}

// SUBMIT FINAL
function submitKertasFinal() {
    if (kertasFotoData.length === 0) {
        alert('⚠️ Upload minimal 1 foto jawaban terlebih dahulu!');
        return;
    }

    if (!currentKertasMatkulId) {
        alert('❌ Error: Mata kuliah tidak terdeteksi. Silakan ulangi.');
        return;
    }

    if (!confirm('📤 Kumpulkan ' + kertasFotoData.length + ' foto jawaban?\n\n⚠️ Setelah dikumpulkan TIDAK BISA DIUBAH lagi.\n\nLanjutkan?')) return;

    let progressDiv = document.getElementById('kertas-progress');
    let progressText = document.getElementById('progress-text');
    progressDiv.style.display = 'block';
    progressText.textContent = 'Mengumpulkan jawaban...';

    let mk = DB.getMatkulById(currentKertasMatkulId);

    // Build jawaban object
    let jawaban = {
        nim: currentMhs.nim,
        namaMhs: currentMhs.nama,
        semester: currentMhs.semester,
        matkulId: currentKertasMatkulId,
        matkulNama: mk.nama,
        mode: 'kertas',
        jawaban: kertasFotoData.map((f, i) => ({
            no: i + 1,
            tipe: 'foto',
            pertanyaan: 'Foto jawaban halaman ' + (i + 1),
            jawaban: f.namaFile + ' (' + f.ukuranKompres + ')',
            fotoData: f.dataUrl,
            bobot: 0
        })),
        startedAt: new Date().toISOString(),
        submittedAt: new Date().toISOString()
    };

    // Save dengan error handling
    try {
        let result = DB.addJawaban(jawaban);

        if (!result) {
            progressDiv.style.display = 'none';
            alert('❌ Anda sudah pernah mengumpulkan jawaban untuk mata kuliah ini!');
            return;
        }

        DB.addActivity(currentMhs.nama + ' upload jawaban kertas: ' + mk.nama + ' (' + kertasFotoData.length + ' foto)');

        // Cleanup & success
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
        console.error('Error saving:', err);

        if (err.name === 'QuotaExceededError' || err.message.indexOf('quota') !== -1 || err.message.indexOf('storage') !== -1) {
            alert('❌ GAGAL: Penyimpanan browser penuh!\n\nSolusi:\n1. Kurangi jumlah foto (coba ulang)\n2. Atau hubungi admin untuk dibersihkan');
        } else {
            alert('❌ Gagal menyimpan: ' + err.message + '\n\nCoba ulangi atau hubungi admin.');
        }
    }
}

// ===== RIWAYAT UJIAN =====
function loadRiwayatUjian() {
    let jawaban = DB.getJawabanByNim(currentMhs.nim);
    let tbody = document.getElementById('tbody-riwayat');
    if (jawaban.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Belum ada riwayat ujian</td></tr>';
        return;
    }
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

// ===== NILAI SAYA =====
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
            nilaiText = nilai.nilai;
            gradeText = nilai.grade;
            statusText = nilai.status;
            statusClass = nilai.status === 'Lulus' ? 'status-lulus' : 'status-remedial';
            gradeClass = 'grade-' + nilai.grade;
            keterangan = nilai.catatan || '-';
            if (nilai.status === 'Remedial') {
                remedialItems.push({ matkul: mk.nama, dosen: mk.dosen, noHp: mk.noHp, nilai: nilai.nilai });
            }
        } else if (sudahUjian) {
            statusText = 'Menunggu Nilai';
            statusClass = 'status-submitted';
        }

        return '<tr><td>' + (i + 1) + '</td><td>' + escapeHtml(mk.nama) + '</td>' +
            '<td>' + escapeHtml(mk.dosen) + '</td>' +
            '<td><strong>' + nilaiText + '</strong></td>' +
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
    } else {
        remedialBox.style.display = 'none';
    }
}
