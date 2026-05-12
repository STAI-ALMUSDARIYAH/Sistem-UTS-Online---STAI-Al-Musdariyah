// ========================================
// ADMIN.JS - Admin Dashboard Functions
// ========================================

let currentViewJawaban = null;

// Check auth on load
document.addEventListener('DOMContentLoaded', function() {
    let session = checkAuth('admin');
    if (!session) return;
    
    loadDashboard();
    loadJadwal();
    populateMatkulSelects();
});

// ===== NAVIGATION =====
function showSection(section) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    
    document.getElementById('section-' + section).classList.add('active');
    event.target.closest('.menu-item').classList.add('active');
    
    // Refresh data when switching sections
    switch(section) {
        case 'dashboard': loadDashboard(); break;
        case 'kelola-mahasiswa': loadMahasiswaTable(); break;
        case 'kelola-matakuliah': showSemesterMK(5); break;
        case 'hasil-ujian': loadHasilUjian(); break;
        case 'input-nilai': break;
    }
}

// ===== DASHBOARD =====
function loadDashboard() {
    let mahasiswa = DB.getMahasiswa();
    let soal = DB.getSoal();
    let jawaban = DB.getJawaban();
    let allMK = [...MATA_KULIAH_DATA.semester5, ...MATA_KULIAH_DATA.semester7];
    
    document.getElementById('total-mahasiswa').textContent = mahasiswa.length;
    document.getElementById('total-matkul').textContent = allMK.length;
    document.getElementById('total-soal').textContent = Object.keys(soal).length;
    document.getElementById('total-submitted').textContent = jawaban.length;
    
    // Activity log
    let activities = DB.getActivity();
    let actLog = document.getElementById('activity-log');
    if (activities.length === 0) {
        actLog.innerHTML = '<p class="empty-state">Belum ada aktivitas</p>';
    } else {
        actLog.innerHTML = activities.slice(0, 10).map(a => `
            <div class="activity-item">
                <i class="fas fa-circle" style="font-size:6px; color:#2e86c1;"></i>
                <span>${escapeHtml(a.message)}</span>
                <span class="activity-time">${a.time}</span>
            </div>
        `).join('');
    }
}

// ===== KELOLA MAHASISWA =====
function loadMahasiswaTable() {
    let data = DB.getMahasiswa();
    let tbody = document.getElementById('tbody-mahasiswa');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Belum ada data mahasiswa</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map((m, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${escapeHtml(m.nim)}</strong></td>
            <td>${escapeHtml(m.nama)}</td>
            <td>Semester ${m.semester}</td>
            <td>${escapeHtml(m.kelas)}</td>
            <td><code>${escapeHtml(m.password)}</code></td>
            <td>
                <button class="btn-small btn-edit" onclick="editMahasiswa('${m.nim}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-small btn-delete" onclick="deleteMahasiswa('${m.nim}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function filterMahasiswa() {
    let semester = document.getElementById('filter-semester-mhs').value;
    let search = document.getElementById('search-mhs').value.toLowerCase();
    let data = DB.getMahasiswa();
    
    let filtered = data.filter(m => {
        let matchSem = !semester || m.semester === semester;
        let matchSearch = !search || m.nim.toLowerCase().includes(search) || m.nama.toLowerCase().includes(search);
        return matchSem && matchSearch;
    });
    
    let tbody = document.getElementById('tbody-mahasiswa');
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Tidak ada data ditemukan</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map((m, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${escapeHtml(m.nim)}</strong></td>
            <td>${escapeHtml(m.nama)}</td>
            <td>Semester ${m.semester}</td>
            <td>${escapeHtml(m.kelas)}</td>
            <td><code>${escapeHtml(m.password)}</code></td>
            <td>
                <button class="btn-small btn-edit" onclick="editMahasiswa('${m.nim}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-small btn-delete" onclick="deleteMahasiswa('${m.nim}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function showAddMahasiswaModal() {
    document.getElementById('add-nim').value = '';
    document.getElementById('add-nama').value = '';
    document.getElementById('add-semester').value = '5';
    document.getElementById('add-kelas').value = 'RPL';
    document.getElementById('add-password').value = '';
    openModal('modal-add-mhs');
}

function showImportMahasiswaModal() {
    document.getElementById('import-data').value = '';
    openModal('modal-import-mhs');
}

function addMahasiswa() {
    let nim = document.getElementById('add-nim').value.trim();
    let nama = document.getElementById('add-nama').value.trim();
    let semester = document.getElementById('add-semester').value;
    let kelas = document.getElementById('add-kelas').value.trim();
    let password = document.getElementById('add-password').value.trim();
    
    if (!nim || !nama || !password) {
        alert('Semua field harus diisi!');
        return;
    }
    
    let result = DB.addMahasiswa({
        nim, nama, semester, kelas, password
    });
    
    if (result) {
        DB.addActivity(`Admin menambahkan mahasiswa: ${nama} (${nim})`);
        closeModal('modal-add-mhs');
        loadMahasiswaTable();
        loadDashboard();
        alert('Mahasiswa berhasil ditambahkan!');
    } else {
        alert('NIM sudah terdaftar!');
    }
}

function importMahasiswa() {
    let raw = document.getElementById('import-data').value.trim();
    if (!raw) {
        alert('Data import tidak boleh kosong!');
        return;
    }
    
    let lines = raw.split('\n').filter(l => l.trim());
    let success = 0;
    let failed = 0;
    
    lines.forEach(line => {
        let parts = line.split('|').map(p => p.trim());
        if (parts.length >= 5) {
            let result = DB.addMahasiswa({
                nim: parts[0],
                nama: parts[1],
                semester: parts[2],
                kelas: parts[3],
                password: parts[4]
            });
            if (result) success++;
            else failed++;
        } else {
            failed++;
        }
    });
    
    DB.addActivity(`Admin import batch: ${success} berhasil, ${failed} gagal`);
    closeModal('modal-import-mhs');
    loadMahasiswaTable();
    loadDashboard();
    alert(`Import selesai!\nBerhasil: ${success}\nGagal/Duplikat: ${failed}`);
}

function editMahasiswa(nim) {
    let mhs = DB.findMahasiswa(nim);
    if (!mhs) return;
    
    let newNama = prompt('Nama Lengkap:', mhs.nama);
    if (newNama === null) return;
    
    let newPassword = prompt('Password:', mhs.password);
    if (newPassword === null) return;
    
    let newSemester = prompt('Semester (5 atau 7):', mhs.semester);
    if (newSemester === null) return;
    
    DB.updateMahasiswa(nim, {
        nama: newNama || mhs.nama,
        password: newPassword || mhs.password,
        semester: newSemester || mhs.semester
    });
    
    DB.addActivity(`Admin mengedit data mahasiswa: ${nim}`);
    loadMahasiswaTable();
    alert('Data mahasiswa berhasil diupdate!');
}

function deleteMahasiswa(nim) {
    if (confirm(`Yakin ingin menghapus mahasiswa dengan NIM: ${nim}?`)) {
        DB.deleteMahasiswa(nim);
        DB.addActivity(`Admin menghapus mahasiswa: ${nim}`);
        loadMahasiswaTable();
        loadDashboard();
    }
}

// ===== MATA KULIAH =====
function showSemesterMK(sem) {
    document.querySelectorAll('.sem-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    let mkData = sem === 5 ? MATA_KULIAH_DATA.semester5 : MATA_KULIAH_DATA.semester7;
    let soalAll = DB.getSoal();
    let tbody = document.getElementById('tbody-matakuliah');
    
    tbody.innerHTML = mkData.map(mk => {
        let hasSoal = soalAll[mk.id] ? true : false;
        return `
            <tr>
                <td>${mk.no}</td>
                <td><strong>${escapeHtml(mk.nama)}</strong></td>
                <td>${mk.sks}</td>
                <td>${escapeHtml(mk.dosen)}</td>
                <td>${mk.noHp}</td>
                <td>${mk.hari}</td>
                <td>${mk.jam}</td>
                <td>
                    <span class="status-badge ${hasSoal ? 'status-lulus' : 'status-pending'}">
                        ${hasSoal ? '✓ Sudah Ada' : '✗ Belum Ada'}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

// ===== KELOLA SOAL =====
function populateMatkulSelects() {
    let allMK = [...MATA_KULIAH_DATA.semester5, ...MATA_KULIAH_DATA.semester7];
    
    // Soal select
    let selectSoal = document.getElementById('select-matkul-soal');
    if (selectSoal) {
        let options = '<option value="">-- Pilih Mata Kuliah --</option>';
        
        options += '<optgroup label="Semester 5">';
        MATA_KULIAH_DATA.semester5.forEach(mk => {
            options += `<option value="${mk.id}">${mk.nama}</option>`;
        });
        options += '</optgroup>';
        
        options += '<optgroup label="Semester 7">';
        MATA_KULIAH_DATA.semester7.forEach(mk => {
            options += `<option value="${mk.id}">${mk.nama}</option>`;
        });
        options += '</optgroup>';
        
        selectSoal.innerHTML = options;
    }
    
    // Hasil filter select
    let filterHasil = document.getElementById('filter-matkul-hasil');
    if (filterHasil) {
        let options = '<option value="">-- Semua Mata Kuliah --</option>';
        allMK.forEach(mk => {
            options += `<option value="${mk.id}">${mk.nama}</option>`;
        });
        filterHasil.innerHTML = options;
    }
    
    // Nilai filter select
    let filterNilai = document.getElementById('filter-matkul-nilai');
    if (filterNilai) {
        let options = '<option value="">-- Pilih Mata Kuliah --</option>';
        
        options += '<optgroup label="Semester 5">';
        MATA_KULIAH_DATA.semester5.forEach(mk => {
            options += `<option value="${mk.id}">${mk.nama}</option>`;
        });
        options += '</optgroup>';
        
        options += '<optgroup label="Semester 7">';
        MATA_KULIAH_DATA.semester7.forEach(mk => {
            options += `<option value="${mk.id}">${mk.nama}</option>`;
        });
        options += '</optgroup>';
        
        filterNilai.innerHTML = options;
    }
}

function loadSoalMatkul() {
    let matkulId = document.getElementById('select-matkul-soal').value;
    let editor = document.getElementById('soal-editor');
    
    if (!matkulId) {
        editor.style.display = 'none';
        return;
    }
    
    editor.style.display = 'block';
    
    let mk = DB.getMatkulById(matkulId);
    document.getElementById('soal-matkul-name').textContent = mk.nama;
    document.getElementById('soal-dosen-name').textContent = 'Dosen: ' + mk.dosen;
    
    let existing = DB.getSoalMatkul(matkulId);
    
    if (existing) {
        document.getElementById('petunjuk-soal').value = existing.petunjuk || '';
        document.getElementById('durasi-ujian').value = existing.durasi || 90;
        document.getElementById('waktu-ujian').value = existing.waktuUjian || '';
        
        let container = document.getElementById('soal-items');
        container.innerHTML = '';
        
        if (existing.soal && existing.soal.length > 0) {
            existing.soal.forEach((s, i) => {
                addSoalItemWithData(i + 1, s.pertanyaan, s.bobot);
            });
        }
    } else {
        document.getElementById('petunjuk-soal').value = '';
        document.getElementById('durasi-ujian').value = 90;
        document.getElementById('waktu-ujian').value = '';
        document.getElementById('soal-items').innerHTML = '';
    }
}

let soalCounter = 0;

function addSoalItem() {
    soalCounter++;
    addSoalItemWithData(soalCounter, '', 10);
}

function addSoalItemWithData(num, pertanyaan, bobot) {
    let container = document.getElementById('soal-items');
    let div = document.createElement('div');
    div.className = 'soal-item';
    div.id = 'soal-item-' + num;
    div.innerHTML = `
        <div class="soal-item-header">
            <h4>Soal ${num}</h4>
            <button class="remove-soal-btn" onclick="removeSoalItem('soal-item-${num}')">
                <i class="fas fa-trash"></i> Hapus
            </button>
        </div>
        <div class="form-group">
            <label>Pertanyaan</label>
            <textarea class="soal-pertanyaan" rows="4" placeholder="Tuliskan pertanyaan soal...">${escapeHtml(pertanyaan)}</textarea>
        </div>
        <div class="form-group">
            <label>Bobot Nilai</label>
            <input type="number" class="soal-bobot" value="${bobot}" min="1" max="100" style="width:100px;">
        </div>
    `;
    container.appendChild(div);
    soalCounter = num;
}

function removeSoalItem(id) {
    if (confirm('Hapus soal ini?')) {
        document.getElementById(id).remove();
        renumberSoal();
    }
}

function renumberSoal() {
    let items = document.querySelectorAll('#soal-items .soal-item');
    items.forEach((item, i) => {
        item.querySelector('h4').textContent = 'Soal ' + (i + 1);
    });
    soalCounter = items.length;
}

function saveSoal() {
    let matkulId = document.getElementById('select-matkul-soal').value;
    if (!matkulId) {
        alert('Pilih mata kuliah terlebih dahulu!');
        return;
    }
    
    let petunjuk = document.getElementById('petunjuk-soal').value.trim();
    let durasi = parseInt(document.getElementById('durasi-ujian').value) || 90;
    let waktuUjian = document.getElementById('waktu-ujian').value;
    
    let soalItems = document.querySelectorAll('#soal-items .soal-item');
    if (soalItems.length === 0) {
        alert('Tambahkan minimal 1 soal!');
        return;
    }
    
    let soal = [];
    soalItems.forEach((item, i) => {
        let pertanyaan = item.querySelector('.soal-pertanyaan').value.trim();
        let bobot = parseInt(item.querySelector('.soal-bobot').value) || 10;
        soal.push({ no: i + 1, pertanyaan, bobot });
    });
    
    let mk = DB.getMatkulById(matkulId);
    
    DB.setSoalMatkul(matkulId, {
        matkulId,
        matkulNama: mk.nama,
        dosen: mk.dosen,
        petunjuk,
        durasi,
        waktuUjian,
        soal,
        createdAt: new Date().toISOString()
    });
    
    DB.addActivity(`Admin membuat/update soal: ${mk.nama} (${soal.length} soal)`);
    alert(`Soal berhasil disimpan!\nMata Kuliah: ${mk.nama}\nJumlah Soal: ${soal.length}`);
}

// ===== HASIL UJIAN =====
function loadHasilUjian() {
    let jawaban = DB.getJawaban();
    renderHasilTable(jawaban);
}

function filterHasilUjian() {
    let matkul = document.getElementById('filter-matkul-hasil').value;
    let semester = document.getElementById('filter-semester-hasil').value;
    let jawaban = DB.getJawaban();
    
    let filtered = jawaban.filter(j => {
        let matchMK = !matkul || j.matkulId === matkul;
        let matchSem = !semester || j.semester === semester;
        return matchMK && matchSem;
    });
    
    renderHasilTable(filtered);
}

function renderHasilTable(data) {
    let tbody = document.getElementById('tbody-hasil');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Belum ada jawaban yang dikumpulkan</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map((j, i) => {
        let mk = DB.getMatkulById(j.matkulId);
        let mkNama = mk ? mk.nama : j.matkulNama || '-';
        let nilai = DB.getNilai().find(n => n.nim === j.nim && n.matkulId === j.matkulId);
        let statusClass = nilai ? 'status-lulus' : 'status-submitted';
        let statusText = nilai ? `Dinilai (${nilai.nilai})` : 'Belum Dinilai';
        
        return `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${escapeHtml(j.nim)}</strong></td>
                <td>${escapeHtml(j.namaMhs)}</td>
                <td>${escapeHtml(mkNama)}</td>
                <td>Semester ${j.semester || '-'}</td>
                <td>${formatDateTime(j.submittedAt)}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn-small btn-view" onclick="viewJawaban('${j.nim}','${j.matkulId}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-small btn-download" onclick="downloadJawabanSingle('${j.nim}','${j.matkulId}')">
                        <i class="fas fa-download"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function viewJawaban(nim, matkulId) {
    let jawaban = DB.getJawabanDetail(nim, matkulId);
    if (!jawaban) {
        alert('Data jawaban tidak ditemukan!');
        return;
    }
    
    currentViewJawaban = jawaban;
    
    let mk = DB.getMatkulById(matkulId);
    let content = document.getElementById('view-jawaban-content');
    
    let html = `
        <div class="jawaban-view">
            <div class="jawaban-header">
                <h3>LEMBAR JAWABAN UTS</h3>
                <p>STAI Al-Musdariyah Kota Cimahi</p>
                <p>Program Studi Hukum Ekonomi Syariah</p>
            </div>
            <div class="nilai-info">
                <p><strong>Nama:</strong> ${escapeHtml(jawaban.namaMhs)}</p>
                <p><strong>NIM:</strong> ${jawaban.nim}</p>
                <p><strong>Mata Kuliah:</strong> ${mk ? mk.nama : jawaban.matkulNama}</p>
                <p><strong>Dosen:</strong> ${mk ? mk.dosen : '-'}</p>
                <p><strong>Waktu Submit:</strong> ${formatDateTime(jawaban.submittedAt)}</p>
            </div>
    `;
    
    jawaban.jawaban.forEach((j, i) => {
        html += `
            <div class="jawaban-item">
                <div class="soal-q">Soal ${i + 1}: ${escapeHtml(j.pertanyaan)}</div>
                <div class="jawaban-text">${escapeHtml(j.jawaban) || '<em style="color:#999;">Tidak dijawab</em>'}</div>
            </div>
        `;
    });
    
    html += '</div>';
    content.innerHTML = html;
    openModal('modal-view-jawaban');
}

function downloadJawaban() {
    if (!currentViewJawaban) return;
    downloadJawabanSingle(currentViewJawaban.nim, currentViewJawaban.matkulId);
}

function downloadJawabanSingle(nim, matkulId) {
    let jawaban = DB.getJawabanDetail(nim, matkulId);
    if (!jawaban) return;
    
    let mk = DB.getMatkulById(matkulId);
    
    let text = `====================================================\n`;
    text += `           LEMBAR JAWABAN UTS\n`;
    text += `    STAI Al-Musdariyah Kota Cimahi\n`;
    text += `   Program Studi Hukum Ekonomi Syariah\n`;
    text += `        Tahun Akademik 2025-2026\n`;
    text += `====================================================\n\n`;
    text += `Nama       : ${jawaban.namaMhs}\n`;
    text += `NIM        : ${jawaban.nim}\n`;
    text += `Mata Kuliah: ${mk ? mk.nama : jawaban.matkulNama}\n`;
    text += `Dosen      : ${mk ? mk.dosen : '-'}\n`;
    text += `Semester   : ${jawaban.semester}\n`;
    text += `Waktu Submit: ${formatDateTime(jawaban.submittedAt)}\n`;
    text += `\n====================================================\n\n`;
    
    jawaban.jawaban.forEach((j, i) => {
        text += `SOAL ${i + 1}:\n`;
        text += `${j.pertanyaan}\n\n`;
        text += `JAWABAN:\n`;
        text += `${j.jawaban || '(Tidak dijawab)'}\n`;
        text += `\n----------------------------------------------------\n\n`;
    });
    
    text += `\n====================================================\n`;
    text += `            Tanda Tangan Dosen\n\n\n\n`;
    text += `        _________________________\n`;
    text += `        ${mk ? mk.dosen : ''}\n`;
    text += `====================================================\n`;
    
    // Create download
    let blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = `Jawaban_UTS_${nim}_${matkulId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    DB.addActivity(`Admin download jawaban: ${jawaban.namaMhs} - ${mk ? mk.nama : matkulId}`);
}

// ===== INPUT NILAI =====
function loadNilaiMatkul() {
    let matkulId = document.getElementById('filter-matkul-nilai').value;
    if (!matkulId) {
        document.getElementById('tbody-nilai').innerHTML = '<tr><td colspan="8" class="empty-state">Pilih mata kuliah terlebih dahulu</td></tr>';
        return;
    }
    
    let mk = DB.getMatkulById(matkulId);
    let jawaban = DB.getJawabanByMatkul(matkulId);
    let nilaiAll = DB.getNilai();
    let tbody = document.getElementById('tbody-nilai');
    
    if (jawaban.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Belum ada mahasiswa yang mengumpulkan jawaban untuk mata kuliah ini</td></tr>';
        return;
    }
    
    tbody.innerHTML = jawaban.map((j, i) => {
        let nilai = nilaiAll.find(n => n.nim === j.nim && n.matkulId === matkulId);
        let nilaiVal = nilai ? nilai.nilai : '';
        let grade = nilai ? nilai.grade : '-';
        let status = nilai ? nilai.status : 'Belum Dinilai';
        let statusClass = !nilai ? 'status-pending' : (nilai.status === 'Lulus' ? 'status-lulus' : 'status-remedial');
        let gradeClass = nilai ? 'grade-' + nilai.grade : '';
        
        return `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${escapeHtml(j.nim)}</strong></td>
                <td>${escapeHtml(j.namaMhs)}</td>
                <td>${escapeHtml(mk.nama)}</td>
                <td>
                    <input type="number" class="nilai-input" data-nim="${j.nim}" data-matkul="${matkulId}" 
                        value="${nilaiVal}" min="0" max="100" style="width:70px; padding:5px; border:1px solid #ddd; border-radius:4px;">
                </td>
                <td><span class="grade-badge ${gradeClass}">${grade}</span></td>
                <td><span class="status-badge ${statusClass}">${status}</span></td>
                <td>
                    <button class="btn-small btn-view" onclick="viewJawaban('${j.nim}','${matkulId}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function saveAllNilai() {
    let inputs = document.querySelectorAll('.nilai-input');
    let count = 0;
    
    inputs.forEach(input => {
        let nilai = input.value.trim();
        if (nilai !== '') {
            let nim = input.dataset.nim;
            let matkulId = input.dataset.matkul;
            DB.setNilai(nim, matkulId, parseInt(nilai), '');
            count++;
        }
    });
    
    if (count > 0) {
        DB.addActivity(`Admin menginput ${count} nilai`);
        let matkulId = document.getElementById('filter-matkul-nilai').value;
        loadNilaiMatkul();
        alert(`${count} nilai berhasil disimpan!`);
    } else {
        alert('Tidak ada nilai yang diinput!');
    }
}

function saveNilaiIndividual() {
    let nim = document.getElementById('nilai-nim').textContent;
    let matkulId = document.getElementById('nilai-matkul').dataset.matkulId;
    let nilai = document.getElementById('input-nilai-angka').value;
    let catatan = document.getElementById('input-nilai-catatan').value;
    
    if (!nilai) {
        alert('Masukkan nilai!');
        return;
    }
    
    DB.setNilai(nim, matkulId, parseInt(nilai), catatan);
    DB.addActivity(`Admin menginput nilai ${nim}: ${nilai}`);
    closeModal('modal-input-nilai');
    loadNilaiMatkul();
    alert('Nilai berhasil disimpan!');
}

// ===== JADWAL =====
function loadJadwal() {
    // Semester 5
    let tbody5 = document.getElementById('jadwal-sem5');
    if (tbody5) {
        tbody5.innerHTML = MATA_KULIAH_DATA.semester5.map(mk => `
            <tr>
                <td>${mk.no}</td>
                <td>${escapeHtml(mk.nama)}</td>
                <td>${mk.sks}</td>
                <td>${escapeHtml(mk.dosen)}</td>
                <td>${mk.noHp}</td>
                <td>${mk.hari}</td>
                <td>${mk.ke}</td>
                <td>${mk.jam}</td>
            </tr>
        `).join('');
    }
    
    // Semester 7
    let tbody7 = document.getElementById('jadwal-sem7');
    if (tbody7) {
        tbody7.innerHTML = MATA_KULIAH_DATA.semester7.map(mk => `
            <tr>
                <td>${mk.no}</td>
                <td>${escapeHtml(mk.nama)}</td>
                <td>${mk.sks}</td>
                <td>${escapeHtml(mk.dosen)}</td>
                <td>${mk.noHp}</td>
                <td>${mk.hari}</td>
                <td>${mk.ke}</td>
                <td>${mk.jam}</td>
            </tr>
        `).join('');
    }
}