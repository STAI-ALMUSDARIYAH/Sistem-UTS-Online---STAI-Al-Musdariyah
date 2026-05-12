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