// ========================================
// MAHASISWA.JS - Mahasiswa Dashboard Functions
// ========================================

let currentMhs = null;

document.addEventListener('DOMContentLoaded', function() {
    let session = checkAuth('mahasiswa');
    if (!session) return;
    
    currentMhs = session.user;
    
    // Set profile info
    document.getElementById('mhs-nama').textContent = currentMhs.nama;
    document.getElementById('profile-nama').textContent = currentMhs.nama;
    document.getElementById('profile-nim').textContent = currentMhs.nim;
    document.getElementById('profile-semester').textContent = currentMhs.semester;
    document.getElementById('profile-kelas').textContent = currentMhs.kelas || 'RPL';
    
    loadUjianTersedia();
    loadRiwayatUjian();
    loadNilaiSaya();
});

// ===== SECTION NAVIGATION =====
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
        if (!soal) return; // No soal available
        
        let alreadySubmitted = jawabanMhs.find(j => j.matkulId === mk.id);
        
        count++;
        ujianHtml += `
            <div class="ujian-card">
                <div class="ujian-card-info">
                    <h4>${escapeHtml(mk.nama)}</h4>
                    <p><i class="fas fa-user-tie"></i> ${escapeHtml(mk.dosen)}</p>
                    <p><i class="fas fa-clock"></i> Durasi: ${soal.durasi} menit | Jumlah Soal: ${soal.soal.length}</p>
                    <p><i class="fas fa-calendar"></i> ${mk.hari}, ${mk.jam}</p>
                </div>
                <div>
                    ${alreadySubmitted 
                        ? `<button class="btn-start-ujian" disabled>
                            <i class="fas fa-check-circle"></i> Sudah Dikerjakan
                           </button>`
                        : `<button class="btn-start-ujian" onclick="startUjian('${mk.id}')">
                            <i class="fas fa-play"></i> Mulai Ujian
                           </button>`
                    }
                </div>
            </div>
        `;
    });
    
    if (count === 0) {
        container.innerHTML = '<p class="empty-state"><i class="fas fa-info-circle"></i> Tidak ada ujian yang tersedia saat ini untuk semester Anda.</p>';
    } else {
        container.innerHTML = ujianHtml;
    }
}

// ===== START UJIAN =====
function startUjian(matkulId) {
    let soal = DB.getSoalMatkul(matkulId);
    if (!soal) {
        alert('Soal belum tersedia!');
        return;
    }
    
    if (!confirm(`Anda akan memulai ujian:\n\n${soal.matkulNama}\nDurasi: ${soal.durasi} menit\nJumlah Soal: ${soal.soal.length}\n\nSetelah dimulai, waktu akan berjalan.\nLanjutkan?`)) {
        return;
    }
    
    // Set ujian session
    let ujianData = {
        matkulId: matkulId,
        nim: currentMhs.nim,
        namaMhs: currentMhs.nama,
        semester: currentMhs.semester,
        startTime: new Date().toISOString(),
        durasi: soal.durasi
    };
    
    DB.setUjianSession(ujianData);
    DB.addActivity(`${currentMhs.nama} memulai ujian: ${soal.matkulNama}`);
    
    window.location.href = 'ujian.html';
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
        
        return `
            <tr>
                <td>${i + 1}</td>
                <td>${escapeHtml(mk ? mk.nama : j.matkulNama)}</td>
                <td>${formatDateTime(j.submittedAt)}</td>
                <td>
                    <span class="status-badge ${nilai ? 'status-lulus' : 'status-submitted'}">
                        ${nilai ? `Dinilai (${nilai.nilai})` : 'Menunggu Penilaian'}
                    </span>
                </td>
                <td>
                    <span class="status-badge status-submitted">
                        <i class="fas fa-check"></i> Terkumpul
                    </span>
                </td>
            </tr>
        `;
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
        
        let nilaiText = '-';
        let gradeText = '-';
        let statusText = 'Belum Ujian';
        let statusClass = 'status-pending';
        let gradeClass = '';
        let keterangan = '-';
        
        if (nilai) {
            nilaiText = nilai.nilai;
            gradeText = nilai.grade;
            statusText = nilai.status;
            statusClass = nilai.status === 'Lulus' ? 'status-lulus' : 'status-remedial';
            gradeClass = 'grade-' + nilai.grade;
            keterangan = nilai.catatan || '-';
            
            if (nilai.status === 'Remedial') {
                remedialItems.push({
                    matkul: mk.nama,
                    dosen: mk.dosen,
                    noHp: mk.noHp,
                    nilai: nilai.nilai
                });
            }
        } else if (sudahUjian) {
            statusText = 'Menunggu Nilai';
            statusClass = 'status-submitted';
        }
        
        return `
            <tr>
                <td>${i + 1}</td>
                <td>${escapeHtml(mk.nama)}</td>
                <td>${escapeHtml(mk.dosen)}</td>
                <td><strong>${nilaiText}</strong></td>
                <td><span class="grade-badge ${gradeClass}">${gradeText}</span></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${escapeHtml(keterangan)}</td>
            </tr>
        `;
    }).join('');
    
    // Show remedial info if any
    let remedialBox = document.getElementById('remedial-info');
    let remedialList = document.getElementById('remedial-list');
    
    if (remedialItems.length > 0) {
        remedialBox.style.display = 'block';
        remedialList.innerHTML = remedialItems.map(r => `
            <div class="remedial-item">
                <p><strong>${escapeHtml(r.matkul)}</strong> - Nilai: ${r.nilai}</p>
                <p>Dosen: ${escapeHtml(r.dosen)}</p>
                <p>Hubungi: <a href="https://wa.me/${r.noHp.replace(/^0/, '62')}" target="_blank">
                    <i class="fab fa-whatsapp"></i> ${r.noHp}
                </a></p>
            </div>
        `).join('');
    } else {
        remedialBox.style.display = 'none';
    }
}

// ========================================
// ===== OVERRIDE loadUjianTersedia (Mode Support) =====
// ========================================

let _origLoadUjianTersedia = loadUjianTersedia;
loadUjianTersedia = function () {
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

        let modeLabel = '';
        let modeIcon = '';
        if (mode === 'kertas') {
            modeLabel = '📝 Kertas Polio (Upload Foto)';
            modeIcon = '<span class="ujian-mode-badge mode-kertas"><i class="fas fa-file-signature"></i> Kertas Polio</span>';
        } else if (mode === 'gform') {
            modeLabel = '📋 Google Form';
            modeIcon = '<span class="ujian-mode-badge mode-gform"><i class="fab fa-google"></i> Google Form</span>';
        } else {
            modeLabel = '💻 Online (Website)';
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
            btnHtml = '<button class="btn-start-ujian" style="background:linear-gradient(135deg,#e67e22,#f0b27a);" onclick="startUjianKertas(\'' + mk.id + '\')"><i class="fas fa-camera"></i> Upload Jawaban</button>';
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
};

// ===== GOOGLE FORM =====
function openGForm(matkulId) {
    let soal = DB.getSoalMatkul(matkulId);
    if (!soal || !soal.gformLink) { alert('Link Google Form belum tersedia!'); return; }
    let mk = DB.getMatkulById(matkulId);

    if (!confirm('Anda akan membuka Google Form untuk:\n\n' + mk.nama + '\n\n' +
        (soal.petunjuk || 'Jawab semua pertanyaan lalu klik Submit.') +
        '\n\nPastikan koneksi internet stabil.\n\nLanjutkan?')) return;

    // Record bahwa mahasiswa sudah buka
    let jawaban = {
        nim: currentMhs.nim,
        namaMhs: currentMhs.nama,
        semester: currentMhs.semester,
        matkulId: matkulId,
        matkulNama: mk.nama,
        jawaban: [{ no: 1, tipe: 'gform', pertanyaan: 'Dikerjakan via Google Form', jawaban: 'Link: ' + soal.gformLink, bobot: 100 }],
        mode: 'gform',
        startedAt: new Date().toISOString(),
        submittedAt: new Date().toISOString()
    };
    DB.addJawaban(jawaban);
    DB.addActivity(currentMhs.nama + ' membuka Google Form: ' + mk.nama);

    // Open form
    window.open(soal.gformLink, '_blank');
    loadUjianTersedia();
    alert('✅ Google Form telah dibuka di tab baru.\n\nPastikan Anda mengerjakan dan klik Submit di Google Form tersebut.');
}

// ===== KERTAS POLIO =====
function startUjianKertas(matkulId) {
    let soal = DB.getSoalMatkul(matkulId);
    if (!soal) { alert('Soal belum tersedia!'); return; }
    let mk = DB.getMatkulById(matkulId);
    let maxFoto = soal.maxFoto || 5;

    // Show soal & upload form
    let soalDisplay = escapeHtml(soal.soalText || '').replace(/\n/g, '<br>');

    let html = '<div style="max-width:700px;margin:0 auto;padding:20px;">' +
        '<div style="background:#fff;border-radius:12px;padding:25px;box-shadow:0 2px 10px rgba(0,0,0,.1);">' +
        '<h2 style="color:#1a5276;text-align:center;margin-bottom:5px;">📝 Ujian Kertas Polio</h2>' +
        '<h3 style="text-align:center;color:#555;margin-bottom:15px;">' + escapeHtml(mk.nama) + '</h3>' +
        '<div style="background:#fff3cd;border-left:4px solid #f39c12;padding:12px;border-radius:6px;margin-bottom:15px;">' +
        '<strong>Petunjuk:</strong><br>' + escapeHtml(soal.petunjuk || '') + '</div>' +
        '<div style="background:#f8f9fa;border:1px solid #ddd;border-radius:8px;padding:15px;margin-bottom:20px;">' +
        '<h4 style="color:#1a5276;margin-bottom:10px;">📋 SOAL:</h4>' +
        '<div style="line-height:1.8;font-size:14px;">' + soalDisplay + '</div></div>' +
        '<h4 style="color:#e67e22;margin-bottom:10px;"><i class="fas fa-camera"></i> Upload Foto Jawaban (Maks. ' + maxFoto + ' foto)</h4>' +
        '<input type="file" id="kertas-foto-input" accept="image/*" multiple onchange="previewFotoKertas(this,' + maxFoto + ')" style="margin-bottom:15px;">' +
        '<div id="kertas-foto-preview" style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:15px;"></div>' +
        '<button class="btn-success" style="width:100%;padding:15px;font-size:16px;" onclick="submitKertas(\'' + matkulId + '\')">' +
        '<i class="fas fa-paper-plane"></i> Kumpulkan Jawaban</button>' +
        '</div></div>';

    // Create overlay
    let overlay = document.createElement('div');
    overlay.id = 'kertas-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#f0f2f5;z-index:999;overflow-y:auto;';
    overlay.innerHTML = '<div style="position:sticky;top:0;background:#1a5276;color:white;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;z-index:1;">' +
        '<span><i class="fas fa-file-signature"></i> ' + escapeHtml(mk.nama) + '</span>' +
        '<button onclick="closeKertasOverlay()" style="background:rgba(255,255,255,.2);color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;">✕ Tutup</button></div>' +
        html;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
}

function closeKertasOverlay() {
    if (!confirm('Tutup halaman? Jawaban yang belum dikumpulkan akan hilang.')) return;
    let overlay = document.getElementById('kertas-overlay');
    if (overlay) overlay.remove();
    document.body.style.overflow = '';
}

function previewFotoKertas(input, maxFoto) {
    let files = input.files;
    let preview = document.getElementById('kertas-foto-preview');
    preview.innerHTML = '';
    if (files.length > maxFoto) {
        alert('Maksimal ' + maxFoto + ' foto!');
        input.value = '';
        return;
    }
    Array.from(files).forEach((file, i) => {
        let reader = new FileReader();
        reader.onload = function (e) {
            preview.innerHTML += '<div style="position:relative;width:120px;height:120px;border:2px solid #ddd;border-radius:8px;overflow:hidden;">' +
                '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:cover;">' +
                '<span style="position:absolute;top:2px;right:5px;background:#1a5276;color:white;padding:1px 6px;border-radius:10px;font-size:10px;">Hal ' + (i + 1) + '</span></div>';
        };
        reader.readAsDataURL(file);
    });
}

function submitKertas(matkulId) {
    let input = document.getElementById('kertas-foto-input');
    if (!input.files || input.files.length === 0) {
        alert('Upload minimal 1 foto jawaban!');
        return;
    }
    if (!confirm('Kumpulkan ' + input.files.length + ' foto jawaban?\n\nSetelah dikumpulkan tidak bisa diubah.')) return;

    let mk = DB.getMatkulById(matkulId);
    let fotoData = [];
    let promises = [];

    Array.from(input.files).forEach((file, i) => {
        let p = new Promise(resolve => {
            let reader = new FileReader();
            reader.onload = function (e) {
                fotoData.push({
                    no: i + 1,
                    namaFile: file.name,
                    ukuran: (file.size / 1024).toFixed(1) + ' KB',
                    dataUrl: e.target.result
                });
                resolve();
            };
            reader.readAsDataURL(file);
        });
        promises.push(p);
    });

    Promise.all(promises).then(() => {
        let jawaban = {
            nim: currentMhs.nim,
            namaMhs: currentMhs.nama,
            semester: currentMhs.semester,
            matkulId: matkulId,
            matkulNama: mk.nama,
            mode: 'kertas',
            jawaban: fotoData.map((f, i) => ({
                no: i + 1,
                tipe: 'foto',
                pertanyaan: 'Foto jawaban halaman ' + (i + 1),
                jawaban: f.namaFile + ' (' + f.ukuran + ')',
                fotoData: f.dataUrl,
                bobot: 0
            })),
            startedAt: new Date().toISOString(),
            submittedAt: new Date().toISOString()
        };

        if (DB.addJawaban(jawaban)) {
            DB.addActivity(currentMhs.nama + ' upload jawaban kertas: ' + mk.nama + ' (' + fotoData.length + ' foto)');
            let overlay = document.getElementById('kertas-overlay');
            if (overlay) overlay.remove();
            document.body.style.overflow = '';
            loadUjianTersedia();
            loadRiwayatUjian();
            alert('✅ Jawaban berhasil dikumpulkan!\n\n' + fotoData.length + ' foto telah diupload.');
        } else {
            alert('❌ Anda sudah pernah mengumpulkan jawaban untuk mata kuliah ini!');
        }
    });
}
