// ========================================
// ADMIN.JS - Admin Dashboard Functions
// STAI Al-Musdariyah - UTS Online System
// Support: Soal Biasa + Soal Cerita/Kasus
// ========================================

let currentViewJawaban = null;
let soalBuilderData = []; // Array of soal blocks

document.addEventListener('DOMContentLoaded', function () {
    let session = checkAuth('admin');
    if (!session) return;
    loadDashboard();
    loadJadwal();
    populateMatkulSelects();
});

// ===== NAVIGATION =====
function showSection(section, btnEl) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    document.getElementById('section-' + section).classList.add('active');
    if (btnEl) btnEl.classList.add('active');
    switch (section) {
        case 'dashboard': loadDashboard(); break;
        case 'kelola-mahasiswa': loadMahasiswaTable(); break;
        case 'kelola-matakuliah': loadMatkulTable(5); break;
        case 'hasil-ujian': loadHasilUjian(); break;
        case 'tools': loadToolsSelects(); break;
    }
}

// ===== DASHBOARD =====
function loadDashboard() {
    let mhs = DB.getMahasiswa();
    let soal = DB.getSoal();
    let jaw = DB.getJawaban();
    let allMK = [...MATA_KULIAH_DATA.semester5, ...MATA_KULIAH_DATA.semester7];
    document.getElementById('total-mahasiswa').textContent = mhs.length;
    document.getElementById('total-matkul').textContent = allMK.length;
    document.getElementById('total-soal').textContent = Object.keys(soal).length;
    document.getElementById('total-submitted').textContent = jaw.length;
    let acts = DB.getActivity();
    let log = document.getElementById('activity-log');
    if (acts.length === 0) {
        log.innerHTML = '<p class="empty-state">Belum ada aktivitas</p>';
    } else {
        log.innerHTML = acts.slice(0, 10).map(a => `
            <div class="activity-item">
                <i class="fas fa-circle" style="font-size:6px;color:#2e86c1;"></i>
                <span>${escapeHtml(a.message)}</span>
                <span class="activity-time">${a.time}</span>
            </div>`).join('');
    }
}

// ===== KELOLA MAHASISWA =====
function loadMahasiswaTable() { renderMahasiswaTable(DB.getMahasiswa()); }

function renderMahasiswaTable(data) {
    let tb = document.getElementById('tbody-mahasiswa');
    if (!data.length) { tb.innerHTML = '<tr><td colspan="7" class="empty-state">Belum ada data mahasiswa</td></tr>'; return; }
    tb.innerHTML = data.map((m, i) => `<tr>
        <td>${i + 1}</td><td><strong>${escapeHtml(m.nim)}</strong></td><td>${escapeHtml(m.nama)}</td>
        <td>Semester ${m.semester}</td><td>${escapeHtml(m.kelas)}</td><td><code>${escapeHtml(m.password)}</code></td>
        <td style="white-space:nowrap;">
            <button class="btn-small btn-edit" onclick="editMahasiswa('${m.nim}')"><i class="fas fa-edit"></i></button>
            <button class="btn-small btn-delete" onclick="deleteMahasiswaRow('${m.nim}')"><i class="fas fa-trash"></i></button>
        </td></tr>`).join('');
}

function filterMahasiswa() {
    let sem = document.getElementById('filter-semester-mhs').value;
    let q = document.getElementById('search-mhs').value.toLowerCase();
    let d = DB.getMahasiswa().filter(m => (!sem || m.semester === sem) && (!q || m.nim.toLowerCase().includes(q) || m.nama.toLowerCase().includes(q)));
    renderMahasiswaTable(d);
}

function showAddMahasiswaModal() {
    ['add-nim', 'add-nama', 'add-password'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('add-semester').value = '5';
    document.getElementById('add-kelas').value = 'RPL';
    openModal('modal-add-mhs');
}
function showImportMahasiswaModal() { document.getElementById('import-data').value = ''; openModal('modal-import-mhs'); }

function addMahasiswa() {
    let nim = document.getElementById('add-nim').value.trim();
    let nama = document.getElementById('add-nama').value.trim();
    let semester = document.getElementById('add-semester').value;
    let kelas = document.getElementById('add-kelas').value.trim();
    let password = document.getElementById('add-password').value.trim();
    if (!nim || !nama || !password) { alert('Semua field harus diisi!'); return; }
    if (DB.addMahasiswa({ nim, nama, semester, kelas, password })) {
        DB.addActivity(`Admin menambahkan mahasiswa: ${nama} (${nim})`);
        closeModal('modal-add-mhs'); loadMahasiswaTable(); loadDashboard();
        alert('✅ Mahasiswa berhasil ditambahkan!');
    } else { alert('❌ NIM sudah terdaftar!'); }
}

function importMahasiswa() {
    let raw = document.getElementById('import-data').value.trim();
    if (!raw) { alert('Data kosong!'); return; }
    let lines = raw.split('\n').filter(l => l.trim()), s = 0, f = 0;
    lines.forEach(line => {
        let p = line.split('|').map(x => x.trim());
        if (p.length >= 5) { DB.addMahasiswa({ nim: p[0], nama: p[1], semester: p[2], kelas: p[3], password: p[4] }) ? s++ : f++; } else f++;
    });
    DB.addActivity(`Admin import batch: ${s} berhasil, ${f} gagal`);
    closeModal('modal-import-mhs'); loadMahasiswaTable(); loadDashboard();
    alert(`Import selesai!\nBerhasil: ${s}\nGagal/Duplikat: ${f}`);
}

function editMahasiswa(nim) {
    let m = DB.findMahasiswa(nim); if (!m) return;
    let nn = prompt('Nama:', m.nama); if (nn === null) return;
    let np = prompt('Password:', m.password); if (np === null) return;
    let ns = prompt('Semester (5/7):', m.semester); if (ns === null) return;
    DB.updateMahasiswa(nim, { nama: nn || m.nama, password: np || m.password, semester: ns || m.semester });
    DB.addActivity(`Admin edit mahasiswa: ${nim}`); loadMahasiswaTable(); alert('✅ Data diupdate!');
}

function deleteMahasiswaRow(nim) {
    let m = DB.findMahasiswa(nim); if (!m) return;
    let j = DB.getJawabanByNim(nim), n = DB.getNilaiByNim(nim);
    if (!confirm(`⚠️ HAPUS?\nNIM: ${nim}\nNama: ${m.nama}\n\n- ${j.length} jawaban\n- ${n.length} nilai\n\nLanjutkan?`)) return;
    DB.deleteMahasiswaComplete(nim);
    DB.addActivity(`Admin hapus mahasiswa: ${m.nama} (${nim})`);
    loadMahasiswaTable(); loadDashboard(); alert('✅ Dihapus!');
}

// ===== MATA KULIAH =====
function showSemesterMK(sem, btn) {
    document.querySelectorAll('.sem-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    loadMatkulTable(sem);
}

function loadMatkulTable(sem) {
    let mkd = sem === 5 ? MATA_KULIAH_DATA.semester5 : MATA_KULIAH_DATA.semester7;
    let sa = DB.getSoal();
    document.getElementById('tbody-matakuliah').innerHTML = mkd.map(mk => {
        let has = sa[mk.id] ? true : false;
        return `<tr><td>${mk.no}</td><td><strong>${escapeHtml(mk.nama)}</strong></td><td>${mk.sks}</td>
        <td>${escapeHtml(mk.dosen)}</td><td>${mk.noHp}</td><td>${mk.hari}</td><td>${mk.jam}</td>
        <td><span class="status-badge ${has ? 'status-lulus' : 'status-pending'}">${has ? '✓ Ada' : '✗ Belum'}</span></td></tr>`;
    }).join('');
}

// ===== POPULATE SELECTS =====
function populateMatkulSelects() {
    let opt = '<option value="">-- Pilih Mata Kuliah --</option><optgroup label="Semester 5">';
    MATA_KULIAH_DATA.semester5.forEach(mk => { opt += `<option value="${mk.id}">${mk.nama}</option>`; });
    opt += '</optgroup><optgroup label="Semester 7">';
    MATA_KULIAH_DATA.semester7.forEach(mk => { opt += `<option value="${mk.id}">${mk.nama}</option>`; });
    opt += '</optgroup>';
    ['select-matkul-soal', 'filter-matkul-nilai'].forEach(id => { let e = document.getElementById(id); if (e) e.innerHTML = opt; });
    let all = [...MATA_KULIAH_DATA.semester5, ...MATA_KULIAH_DATA.semester7];
    let o2 = '<option value="">-- Semua Mata Kuliah --</option>';
    all.forEach(mk => { o2 += `<option value="${mk.id}">${mk.nama}</option>`; });
    let e2 = document.getElementById('filter-matkul-hasil'); if (e2) e2.innerHTML = o2;
}

// ========================================
// ===== KELOLA SOAL - SOAL BUILDER =====
// ========================================

function loadSoalMatkul() {
    let matkulId = document.getElementById('select-matkul-soal').value;
    let editor = document.getElementById('soal-editor');
    if (!matkulId) { editor.style.display = 'none'; return; }
    editor.style.display = 'block';

    let mk = DB.getMatkulById(matkulId);
    document.getElementById('soal-matkul-name').textContent = mk.nama;
    document.getElementById('soal-dosen-name').textContent = 'Dosen: ' + mk.dosen;

    let existing = DB.getSoalMatkul(matkulId);
    soalBuilderData = [];

    if (existing) {
        document.getElementById('petunjuk-soal').value = existing.petunjuk || '';
        document.getElementById('durasi-ujian').value = existing.durasi || 90;
        document.getElementById('waktu-ujian').value = existing.waktuUjian || '';

        // Load blocks from existing data
        if (existing.blocks && existing.blocks.length > 0) {
            soalBuilderData = JSON.parse(JSON.stringify(existing.blocks));
        } else if (existing.soal && existing.soal.length > 0) {
            // Backward compatible: old format single soal
            existing.soal.forEach(s => {
                soalBuilderData.push({
                    type: 'biasa',
                    pertanyaan: s.pertanyaan,
                    bobot: s.bobot
                });
            });
        }
    } else {
        document.getElementById('petunjuk-soal').value = '';
        document.getElementById('durasi-ujian').value = 90;
        document.getElementById('waktu-ujian').value = '';
    }
    renderSoalBuilder();
}

function addSoalBiasa() {
    soalBuilderData.push({
        type: 'biasa',
        pertanyaan: '',
        bobot: 10
    });
    renderSoalBuilder();
    scrollToLastBlock();
}

function addSoalCerita() {
    soalBuilderData.push({
        type: 'cerita',
        cerita: '',
        subSoal: [
            { pertanyaan: '', bobot: 10 }
        ]
    });
    renderSoalBuilder();
    scrollToLastBlock();
}

function scrollToLastBlock() {
    setTimeout(() => {
        let container = document.getElementById('soal-builder-container');
        let blocks = container.querySelectorAll('.soal-block');
        if (blocks.length > 0) {
            blocks[blocks.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
}

function renderSoalBuilder() {
    let container = document.getElementById('soal-builder-container');
    if (soalBuilderData.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding:30px;"><i class="fas fa-info-circle"></i> Belum ada soal. Klik tombol di atas untuk menambahkan soal.</div>';
        return;
    }

    let globalNo = 0; // Global soal numbering
    let html = '';

    soalBuilderData.forEach((block, blockIdx) => {
        if (block.type === 'biasa') {
            globalNo++;
            html += renderSoalBiasaBlock(blockIdx, globalNo, block);
        } else if (block.type === 'cerita') {
            let startNo = globalNo + 1;
            let subCount = block.subSoal ? block.subSoal.length : 0;
            globalNo += subCount;
            let endNo = globalNo;
            html += renderSoalCeritaBlock(blockIdx, startNo, endNo, block);
        }
    });

    container.innerHTML = html;
}

function renderSoalBiasaBlock(blockIdx, soalNo, block) {
    return `
    <div class="soal-block soal-block-biasa" data-block="${blockIdx}">
        <div class="soal-block-header">
            <div class="soal-block-badge badge-biasa">
                <i class="fas fa-pen"></i> Soal ${soalNo} (Soal Biasa)
            </div>
            <div class="soal-block-actions">
                <button class="btn-small btn-edit" onclick="moveBlock(${blockIdx},-1)" title="Pindah Atas"><i class="fas fa-arrow-up"></i></button>
                <button class="btn-small btn-edit" onclick="moveBlock(${blockIdx},1)" title="Pindah Bawah"><i class="fas fa-arrow-down"></i></button>
                <button class="btn-small btn-delete" onclick="removeBlock(${blockIdx})" title="Hapus"><i class="fas fa-trash"></i></button>
            </div>
        </div>
        <div class="soal-block-body">
            <div class="form-group">
                <label>Pertanyaan</label>
                <textarea rows="4" placeholder="Tuliskan pertanyaan soal..." onchange="updateBiasa(${blockIdx},'pertanyaan',this.value)">${escapeHtml(block.pertanyaan || '')}</textarea>
            </div>
            <div class="form-group">
                <label>Bobot Nilai</label>
                <input type="number" value="${block.bobot || 10}" min="1" max="100" style="width:100px;" onchange="updateBiasa(${blockIdx},'bobot',this.value)">
            </div>
        </div>
    </div>`;
}

function renderSoalCeritaBlock(blockIdx, startNo, endNo, block) {
    let subCount = block.subSoal ? block.subSoal.length : 0;
    let rangeText = subCount > 0 ? `Soal ${startNo} - ${endNo}` : 'Belum ada sub-soal';

    let subHtml = '';
    if (block.subSoal) {
        block.subSoal.forEach((sub, subIdx) => {
            let subNo = startNo + subIdx;
            subHtml += `
            <div class="sub-soal-item">
                <div class="sub-soal-header">
                    <span class="sub-soal-number">Soal ${subNo}</span>
                    <button class="btn-small btn-delete" onclick="removeSubSoal(${blockIdx},${subIdx})" title="Hapus Sub-Soal"><i class="fas fa-times"></i></button>
                </div>
                <div class="form-group">
                    <label>Pertanyaan</label>
                    <textarea rows="3" placeholder="Pertanyaan berdasarkan cerita/kasus di atas..." onchange="updateSubSoal(${blockIdx},${subIdx},'pertanyaan',this.value)">${escapeHtml(sub.pertanyaan || '')}</textarea>
                </div>
                <div class="form-group">
                    <label>Bobot</label>
                    <input type="number" value="${sub.bobot || 10}" min="1" max="100" style="width:90px;" onchange="updateSubSoal(${blockIdx},${subIdx},'bobot',this.value)">
                </div>
            </div>`;
        });
    }

    return `
    <div class="soal-block soal-block-cerita" data-block="${blockIdx}">
        <div class="soal-block-header">
            <div class="soal-block-badge badge-cerita">
                <i class="fas fa-book-open"></i> Soal Cerita / Kasus — ${rangeText}
            </div>
            <div class="soal-block-actions">
                <button class="btn-small btn-edit" onclick="moveBlock(${blockIdx},-1)" title="Pindah Atas"><i class="fas fa-arrow-up"></i></button>
                <button class="btn-small btn-edit" onclick="moveBlock(${blockIdx},1)" title="Pindah Bawah"><i class="fas fa-arrow-down"></i></button>
                <button class="btn-small btn-delete" onclick="removeBlock(${blockIdx})" title="Hapus Blok"><i class="fas fa-trash"></i></button>
            </div>
        </div>
        <div class="soal-block-body">
            <div class="form-group">
                <label><i class="fas fa-book-reader"></i> Cerita / Narasi Kasus</label>
                <textarea rows="6" class="cerita-textarea" placeholder="Tuliskan cerita, narasi, atau kasus di sini...&#10;&#10;Contoh: Pak Ahmad adalah seorang pengusaha yang ingin mengajukan pembiayaan murabahah ke Bank Syariah Mandiri untuk membeli sebuah ruko seharga Rp 500.000.000. Bank menawarkan margin 10% per tahun dengan jangka waktu 5 tahun..." onchange="updateCerita(${blockIdx},this.value)">${escapeHtml(block.cerita || '')}</textarea>
            </div>

            <div class="sub-soal-container">
                <div class="sub-soal-title">
                    <h4><i class="fas fa-list-ol"></i> Pertanyaan berdasarkan cerita di atas:</h4>
                    <button class="btn-primary btn-sm" onclick="addSubSoal(${blockIdx})">
                        <i class="fas fa-plus"></i> Tambah Pertanyaan
                    </button>
                </div>
                <div class="sub-soal-list">
                    ${subHtml || '<p class="empty-state" style="padding:15px;">Klik "Tambah Pertanyaan" untuk menambahkan soal.</p>'}
                </div>
            </div>
        </div>
    </div>`;
}

// ===== SOAL BUILDER DATA FUNCTIONS =====
function updateBiasa(blockIdx, field, value) {
    if (field === 'bobot') value = parseInt(value) || 10;
    soalBuilderData[blockIdx][field] = value;
}

function updateCerita(blockIdx, value) {
    soalBuilderData[blockIdx].cerita = value;
}

function updateSubSoal(blockIdx, subIdx, field, value) {
    if (field === 'bobot') value = parseInt(value) || 10;
    soalBuilderData[blockIdx].subSoal[subIdx][field] = value;
}

function addSubSoal(blockIdx) {
    if (!soalBuilderData[blockIdx].subSoal) soalBuilderData[blockIdx].subSoal = [];
    soalBuilderData[blockIdx].subSoal.push({ pertanyaan: '', bobot: 10 });
    renderSoalBuilder();
}

function removeSubSoal(blockIdx, subIdx) {
    if (!confirm('Hapus pertanyaan ini?')) return;
    soalBuilderData[blockIdx].subSoal.splice(subIdx, 1);
    renderSoalBuilder();
}

function removeBlock(blockIdx) {
    let block = soalBuilderData[blockIdx];
    let label = block.type === 'cerita' ? 'blok soal cerita (beserta semua pertanyaannya)' : 'soal ini';
    if (!confirm(`Hapus ${label}?`)) return;
    soalBuilderData.splice(blockIdx, 1);
    renderSoalBuilder();
}

function moveBlock(blockIdx, direction) {
    let newIdx = blockIdx + direction;
    if (newIdx < 0 || newIdx >= soalBuilderData.length) return;
    let temp = soalBuilderData[blockIdx];
    soalBuilderData[blockIdx] = soalBuilderData[newIdx];
    soalBuilderData[newIdx] = temp;
    renderSoalBuilder();
}

// ===== SAVE SOAL =====
function saveSoal() {
    let matkulId = document.getElementById('select-matkul-soal').value;
    if (!matkulId) { alert('Pilih mata kuliah!'); return; }

    // Sync data from DOM before saving
    syncSoalBuilderFromDOM();

    if (soalBuilderData.length === 0) { alert('Tambahkan minimal 1 soal!'); return; }

    // Validate
    let totalSoal = 0;
    for (let b of soalBuilderData) {
        if (b.type === 'biasa') {
            if (!b.pertanyaan || !b.pertanyaan.trim()) { alert('Ada soal biasa yang pertanyaannya kosong!'); return; }
            totalSoal++;
        } else if (b.type === 'cerita') {
            if (!b.cerita || !b.cerita.trim()) { alert('Ada soal cerita yang narasinya kosong!'); return; }
            if (!b.subSoal || b.subSoal.length === 0) { alert('Ada soal cerita tanpa pertanyaan!'); return; }
            for (let s of b.subSoal) {
                if (!s.pertanyaan || !s.pertanyaan.trim()) { alert('Ada sub-pertanyaan yang kosong di soal cerita!'); return; }
                totalSoal++;
            }
        }
    }

    let petunjuk = document.getElementById('petunjuk-soal').value.trim();
    let durasi = parseInt(document.getElementById('durasi-ujian').value) || 90;
    let waktuUjian = document.getElementById('waktu-ujian').value;
    let mk = DB.getMatkulById(matkulId);

    // Build flat soal list (for backward compatibility & ujian page)
    let flatSoal = [];
    let no = 0;
    soalBuilderData.forEach(block => {
        if (block.type === 'biasa') {
            no++;
            flatSoal.push({
                no: no,
                pertanyaan: block.pertanyaan,
                bobot: block.bobot,
                ceritaRef: null
            });
        } else if (block.type === 'cerita') {
            block.subSoal.forEach(sub => {
                no++;
                flatSoal.push({
                    no: no,
                    pertanyaan: sub.pertanyaan,
                    bobot: sub.bobot,
                    ceritaRef: block.cerita
                });
            });
        }
    });

    DB.setSoalMatkul(matkulId, {
        matkulId, matkulNama: mk.nama, dosen: mk.dosen,
        petunjuk, durasi, waktuUjian,
        blocks: soalBuilderData,    // New format
        soal: flatSoal,              // Flat format for ujian page
        createdAt: new Date().toISOString()
    });

    DB.addActivity(`Admin membuat/update soal: ${mk.nama} (${totalSoal} soal)`);
    alert(`✅ Soal berhasil disimpan!\n\nMata Kuliah: ${mk.nama}\nTotal Pertanyaan: ${totalSoal}\nBlok Soal: ${soalBuilderData.length}`);
}

function syncSoalBuilderFromDOM() {
    let container = document.getElementById('soal-builder-container');
    let blocks = container.querySelectorAll('.soal-block');

    blocks.forEach((blockEl, i) => {
        let blockIdx = parseInt(blockEl.dataset.block);
        if (isNaN(blockIdx) || !soalBuilderData[blockIdx]) return;

        let block = soalBuilderData[blockIdx];

        if (block.type === 'biasa') {
            let ta = blockEl.querySelector('textarea');
            let inp = blockEl.querySelector('input[type="number"]');
            if (ta) block.pertanyaan = ta.value;
            if (inp) block.bobot = parseInt(inp.value) || 10;
        } else if (block.type === 'cerita') {
            let ceritaTa = blockEl.querySelector('.cerita-textarea');
            if (ceritaTa) block.cerita = ceritaTa.value;

            let subItems = blockEl.querySelectorAll('.sub-soal-item');
            subItems.forEach((subEl, si) => {
                if (block.subSoal && block.subSoal[si]) {
                    let ta = subEl.querySelector('textarea');
                    let inp = subEl.querySelector('input[type="number"]');
                    if (ta) block.subSoal[si].pertanyaan = ta.value;
                    if (inp) block.subSoal[si].bobot = parseInt(inp.value) || 10;
                }
            });
        }
    });
}

function deleteSoalCurrent() {
    let matkulId = document.getElementById('select-matkul-soal').value;
    if (!matkulId) { alert('Pilih mata kuliah!'); return; }
    let mk = DB.getMatkulById(matkulId);
    let soal = DB.getSoalMatkul(matkulId);
    if (!soal) { alert('Belum ada soal!'); return; }
    if (!confirm(`⚠️ Hapus semua soal untuk "${mk.nama}"?`)) return;
    DB.deleteSoalMatkul(matkulId);
    DB.addActivity(`Admin hapus soal: ${mk.nama}`);
    soalBuilderData = [];
    document.getElementById('soal-editor').style.display = 'none';
    document.getElementById('select-matkul-soal').value = '';
    loadDashboard();
    alert('✅ Soal dihapus!');
}

// ===== PREVIEW SOAL =====
function previewSoal() {
    syncSoalBuilderFromDOM();

    let area = document.getElementById('soal-preview-area');
    if (area.style.display === 'block') { area.style.display = 'none'; return; }

    if (soalBuilderData.length === 0) { alert('Belum ada soal!'); return; }

    let html = '<div class="soal-preview"><h3 style="color:#1a5276;margin-bottom:15px;"><i class="fas fa-eye"></i> Preview Soal (Tampilan Mahasiswa)</h3>';
    let globalNo = 0;

    soalBuilderData.forEach(block => {
        if (block.type === 'biasa') {
            globalNo++;
            html += `<div class="preview-item preview-biasa">
                <span class="soal-number">Soal ${globalNo}</span>
                <p class="soal-bobot">Bobot: ${block.bobot} poin</p>
                <div class="soal-text">${escapeHtml(block.pertanyaan || '(Belum diisi)')}</div>
                <div class="preview-answer-box"><i class="fas fa-pen-fancy"></i> Area jawaban mahasiswa</div>
            </div>`;
        } else if (block.type === 'cerita') {
            let startNo = globalNo + 1;
            html += `<div class="preview-item preview-cerita">
                <div class="preview-cerita-header">
                    <i class="fas fa-book-open"></i> Bacalah cerita/kasus berikut untuk menjawab pertanyaan di bawahnya:
                </div>
                <div class="preview-cerita-text">${escapeHtml(block.cerita || '(Belum diisi)')}</div>
                <div class="preview-cerita-questions">`;
            if (block.subSoal) {
                block.subSoal.forEach(sub => {
                    globalNo++;
                    html += `<div class="preview-sub-soal">
                        <span class="soal-number">Soal ${globalNo}</span>
                        <p class="soal-bobot">Bobot: ${sub.bobot} poin</p>
                        <div class="soal-text">${escapeHtml(sub.pertanyaan || '(Belum diisi)')}</div>
                        <div class="preview-answer-box"><i class="fas fa-pen-fancy"></i> Area jawaban mahasiswa</div>
                    </div>`;
                });
            }
            html += `</div></div>`;
        }
    });

    html += '</div>';
    area.innerHTML = html;
    area.style.display = 'block';
    area.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== HASIL UJIAN =====
function loadHasilUjian() { renderHasilTable(DB.getJawaban()); }

function filterHasilUjian() {
    let mk = document.getElementById('filter-matkul-hasil').value;
    let sem = document.getElementById('filter-semester-hasil').value;
    renderHasilTable(DB.getJawaban().filter(j => (!mk || j.matkulId === mk) && (!sem || j.semester === sem)));
}

function renderHasilTable(data) {
    let tb = document.getElementById('tbody-hasil');
    if (!data.length) { tb.innerHTML = '<tr><td colspan="8" class="empty-state">Belum ada jawaban</td></tr>'; return; }
    tb.innerHTML = data.map((j, i) => {
        let mk = DB.getMatkulById(j.matkulId);
        let mkN = mk ? mk.nama : j.matkulNama || '-';
        let n = DB.getNilai().find(x => x.nim === j.nim && x.matkulId === j.matkulId);
        let sc = n ? 'status-lulus' : 'status-submitted';
        let st = n ? `Dinilai (${n.nilai})` : 'Belum Dinilai';
        return `<tr>
            <td>${i + 1}</td><td><strong>${escapeHtml(j.nim)}</strong></td><td>${escapeHtml(j.namaMhs)}</td>
            <td>${escapeHtml(mkN)}</td><td>Sem ${j.semester || '-'}</td><td>${formatDateTime(j.submittedAt)}</td>
            <td><span class="status-badge ${sc}">${st}</span></td>
            <td style="white-space:nowrap;">
                <button class="btn-small btn-view" onclick="viewJawaban('${j.nim}','${j.matkulId}')"><i class="fas fa-eye"></i></button>
                <button class="btn-small btn-download" onclick="downloadJawabanSingle('${j.nim}','${j.matkulId}')"><i class="fas fa-download"></i></button>
                <button class="btn-small btn-delete" onclick="deleteJawabanRow('${j.nim}','${j.matkulId}')"><i class="fas fa-trash"></i></button>
            </td></tr>`;
    }).join('');
}

function deleteJawabanRow(nim, matkulId) {
    let mk = DB.getMatkulById(matkulId), mhs = DB.findMahasiswa(nim);
    if (!confirm(`⚠️ HAPUS JAWABAN?\n${mhs ? mhs.nama : nim} - ${mk ? mk.nama : matkulId}\n\nLanjutkan?`)) return;
    DB.deleteJawaban(nim, matkulId); DB.deleteNilai(nim, matkulId);
    DB.addActivity(`Admin hapus jawaban: ${mhs ? mhs.nama : nim} - ${mk ? mk.nama : matkulId}`);
    loadHasilUjian(); loadDashboard(); alert('✅ Dihapus!');
}

function viewJawaban(nim, matkulId) {
    let jaw = DB.getJawabanDetail(nim, matkulId);
    if (!jaw) { alert('Tidak ditemukan!'); return; }
    currentViewJawaban = jaw;
    let mk = DB.getMatkulById(matkulId);
    let soalData = DB.getSoalMatkul(matkulId);
    let content = document.getElementById('view-jawaban-content');

    let html = `<div class="jawaban-view">
        <div class="jawaban-header">
            <h3>LEMBAR JAWABAN UTS</h3>
            <p>STAI Al-Musdariyah Kota Cimahi</p>
        </div>
        <div class="nilai-info">
            <p><strong>Nama:</strong> ${escapeHtml(jaw.namaMhs)}</p>
            <p><strong>NIM:</strong> ${jaw.nim}</p>
            <p><strong>Mata Kuliah:</strong> ${mk ? mk.nama : jaw.matkulNama}</p>
            <p><strong>Dosen:</strong> ${mk ? mk.dosen : '-'}</p>
            <p><strong>Submit:</strong> ${formatDateTime(jaw.submittedAt)}</p>
        </div>`;

    // Check if soal has blocks (cerita support)
    let lastCerita = null;
    jaw.jawaban.forEach((j, i) => {
        // Show cerita text if this soal references one
        if (j.ceritaRef && j.ceritaRef !== lastCerita) {
            lastCerita = j.ceritaRef;
            html += `<div class="jawaban-cerita-box">
                <div class="jawaban-cerita-label"><i class="fas fa-book-open"></i> Cerita/Kasus:</div>
                <div class="jawaban-cerita-text">${escapeHtml(j.ceritaRef)}</div>
            </div>`;
        }
        if (j.ceritaRef === null || j.ceritaRef === undefined) lastCerita = null;

        html += `<div class="jawaban-item">
            <div class="soal-q">Soal ${i + 1}: ${escapeHtml(j.pertanyaan)}</div>
            <div class="jawaban-text">${escapeHtml(j.jawaban) || '<em style="color:#999;">Tidak dijawab</em>'}</div>
        </div>`;
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
    let jaw = DB.getJawabanDetail(nim, matkulId); if (!jaw) return;
    let mk = DB.getMatkulById(matkulId);
    let t = `====================================================\n`;
    t += `           LEMBAR JAWABAN UTS\n`;
    t += `    STAI Al-Musdariyah Kota Cimahi\n`;
    t += `   Program Studi Hukum Ekonomi Syariah\n`;
    t += `        Tahun Akademik 2025-2026\n`;
    t += `====================================================\n\n`;
    t += `Nama        : ${jaw.namaMhs}\nNIM         : ${jaw.nim}\n`;
    t += `Mata Kuliah : ${mk ? mk.nama : jaw.matkulNama}\n`;
    t += `Dosen       : ${mk ? mk.dosen : '-'}\nSemester    : ${jaw.semester}\n`;
    t += `Waktu Submit: ${formatDateTime(jaw.submittedAt)}\n`;
    t += `\n====================================================\n\n`;

    let lastCerita = null;
    jaw.jawaban.forEach((j, i) => {
        if (j.ceritaRef && j.ceritaRef !== lastCerita) {
            lastCerita = j.ceritaRef;
            t += `📖 CERITA/KASUS:\n${j.ceritaRef}\n\n`;
        }
        if (!j.ceritaRef) lastCerita = null;
        t += `SOAL ${i + 1}:\n${j.pertanyaan}\n\nJAWABAN:\n${j.jawaban || '(Tidak dijawab)'}\n`;
        t += `\n----------------------------------------------------\n\n`;
    });

    t += `====================================================\n            Tanda Tangan Dosen\n\n\n\n`;
    t += `        _________________________\n        ${mk ? mk.dosen : ''}\n====================================================\n`;

    let blob = new Blob([t], { type: 'text/plain;charset=utf-8' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a'); a.href = url;
    a.download = `Jawaban_UTS_${nim}_${matkulId}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    DB.addActivity(`Admin download jawaban: ${jaw.namaMhs}`);
}

// ===== INPUT NILAI =====
function loadNilaiMatkul() {
    let matkulId = document.getElementById('filter-matkul-nilai').value;
    let tb = document.getElementById('tbody-nilai');
    if (!matkulId) { tb.innerHTML = '<tr><td colspan="8" class="empty-state">Pilih mata kuliah</td></tr>'; return; }
    let mk = DB.getMatkulById(matkulId);
    let jaw = DB.getJawabanByMatkul(matkulId);
    let nilaiAll = DB.getNilai();
    if (!jaw.length) { tb.innerHTML = '<tr><td colspan="8" class="empty-state">Belum ada jawaban untuk mata kuliah ini</td></tr>'; return; }
    tb.innerHTML = jaw.map((j, i) => {
        let n = nilaiAll.find(x => x.nim === j.nim && x.matkulId === matkulId);
        let nv = n ? n.nilai : '', g = n ? n.grade : '-', s = n ? n.status : 'Belum Dinilai';
        let sc = !n ? 'status-pending' : (n.status === 'Lulus' ? 'status-lulus' : 'status-remedial');
        let gc = n ? 'grade-' + n.grade : '';
        return `<tr><td>${i + 1}</td><td><strong>${escapeHtml(j.nim)}</strong></td><td>${escapeHtml(j.namaMhs)}</td>
        <td>${escapeHtml(mk.nama)}</td>
        <td><input type="number" class="nilai-input" data-nim="${j.nim}" data-matkul="${matkulId}" value="${nv}" min="0" max="100" style="width:70px;padding:5px;border:1px solid #ddd;border-radius:4px;"></td>
        <td><span class="grade-badge ${gc}">${g}</span></td>
        <td><span class="status-badge ${sc}">${s}</span></td>
        <td style="white-space:nowrap;">
            <button class="btn-small btn-view" onclick="viewJawaban('${j.nim}','${matkulId}')"><i class="fas fa-eye"></i></button>
            ${n ? `<button class="btn-small btn-delete" onclick="deleteNilaiRow('${j.nim}','${matkulId}')"><i class="fas fa-trash"></i></button>` : ''}
        </td></tr>`;
    }).join('');
}

function saveAllNilai() {
    let inputs = document.querySelectorAll('.nilai-input'), c = 0;
    inputs.forEach(inp => {
        if (inp.value.trim() !== '') {
            DB.setNilai(inp.dataset.nim, inp.dataset.matkul, parseInt(inp.value), ''); c++;
        }
    });
    if (c > 0) { DB.addActivity(`Admin input ${c} nilai`); loadNilaiMatkul(); alert(`✅ ${c} nilai disimpan!`); }
    else alert('Tidak ada nilai diinput!');
}

function deleteNilaiRow(nim, matkulId) {
    let m = DB.findMahasiswa(nim);
    if (!confirm(`Hapus nilai ${m ? m.nama : nim}?`)) return;
    DB.deleteNilai(nim, matkulId); DB.addActivity(`Admin hapus nilai: ${nim}`);
    loadNilaiMatkul(); alert('✅ Nilai dihapus!');
}

// ===== JADWAL =====
function loadJadwal() {
    let t5 = document.getElementById('jadwal-sem5');
    if (t5) t5.innerHTML = MATA_KULIAH_DATA.semester5.map(mk => `<tr><td>${mk.no}</td><td>${escapeHtml(mk.nama)}</td><td>${mk.sks}</td><td>${escapeHtml(mk.dosen)}</td><td>${mk.noHp}</td><td>${mk.hari}</td><td>${mk.ke}</td><td>${mk.jam}</td></tr>`).join('');
    let t7 = document.getElementById('jadwal-sem7');
    if (t7) t7.innerHTML = MATA_KULIAH_DATA.semester7.map(mk => `<tr><td>${mk.no}</td><td>${escapeHtml(mk.nama)}</td><td>${mk.sks}</td><td>${escapeHtml(mk.dosen)}</td><td>${mk.noHp}</td><td>${mk.hari}</td><td>${mk.ke}</td><td>${mk.jam}</td></tr>`).join('');
}

// ========================================
// ===== TOOLS FUNCTIONS =====
// ========================================
function loadToolsSelects() {
    let opt = '<option value="">-- Pilih --</option><optgroup label="Semester 5">';
    MATA_KULIAH_DATA.semester5.forEach(mk => { opt += `<option value="${mk.id}">${mk.nama}</option>`; });
    opt += '</optgroup><optgroup label="Semester 7">';
    MATA_KULIAH_DATA.semester7.forEach(mk => { opt += `<option value="${mk.id}">${mk.nama}</option>`; });
    opt += '</optgroup>';
    ['tool-select-matkul-soal', 'tool-select-matkul-jawaban', 'tool-select-matkul-nilai'].forEach(id => {
        let e = document.getElementById(id); if (e) e.innerHTML = opt;
    });
}

function toolDeleteSoal() {
    let id = document.getElementById('tool-select-matkul-soal').value;
    if (!id) { alert('Pilih matkul!'); return; }
    let mk = DB.getMatkulById(id), s = DB.getSoalMatkul(id);
    if (!s) { alert('Belum ada soal!'); return; }
    if (!confirm(`⚠️ Hapus soal ${mk.nama}?`)) return;
    DB.deleteSoalMatkul(id); DB.addActivity(`Admin hapus soal: ${mk.nama}`);
    document.getElementById('tool-select-matkul-soal').value = ''; loadDashboard(); alert('✅ Dihapus!');
}
function toolDeleteJawabanMatkul() {
    let id = document.getElementById('tool-select-matkul-jawaban').value;
    if (!id) { alert('Pilih matkul!'); return; }
    let mk = DB.getMatkulById(id), j = DB.getJawabanByMatkul(id);
    if (!j.length) { alert('Tidak ada jawaban!'); return; }
    if (!confirm(`⚠️ Hapus ${j.length} jawaban ${mk.nama}? Nilai juga dihapus.`)) return;
    let c = DB.deleteJawabanByMatkul(id); DB.deleteNilaiByMatkul(id);
    DB.addActivity(`Admin hapus ${c} jawaban: ${mk.nama}`);
    document.getElementById('tool-select-matkul-jawaban').value = ''; loadDashboard(); alert(`✅ ${c} jawaban dihapus!`);
}
function toolDeleteNilaiMatkul() {
    let id = document.getElementById('tool-select-matkul-nilai').value;
    if (!id) { alert('Pilih matkul!'); return; }
    let mk = DB.getMatkulById(id), n = DB.getNilaiByMatkul(id);
    if (!n.length) { alert('Tidak ada nilai!'); return; }
    if (!confirm(`⚠️ Hapus ${n.length} nilai ${mk.nama}?`)) return;
    let c = DB.deleteNilaiByMatkul(id); DB.addActivity(`Admin hapus ${c} nilai: ${mk.nama}`);
    document.getElementById('tool-select-matkul-nilai').value = ''; alert(`✅ ${c} nilai dihapus!`);
}
function toolDeleteMahasiswa() {
    let nim = document.getElementById('tool-input-nim').value.trim();
    if (!nim) { alert('Masukkan NIM!'); return; }
    let m = DB.findMahasiswa(nim); if (!m) { alert('Tidak ditemukan!'); return; }
    if (!confirm(`⚠️ Hapus ${m.nama} (${nim}) + semua data?`)) return;
    DB.deleteMahasiswaComplete(nim); DB.addActivity(`Admin hapus: ${m.nama} (${nim})`);
    document.getElementById('tool-input-nim').value = ''; loadDashboard(); alert('✅ Dihapus!');
}
function toolDeleteAllSoal() {
    let c = Object.keys(DB.getSoal()).length; if (!c) { alert('Kosong!'); return; }
    if (prompt(`Ketik "HAPUS SEMUA SOAL":`) !== 'HAPUS SEMUA SOAL') { alert('Batal.'); return; }
    DB.deleteAllSoal(); DB.addActivity(`⚠️ Hapus SEMUA soal`); loadDashboard(); alert('✅ Dihapus!');
}
function toolDeleteAllJawaban() {
    let c = DB.getJawaban().length; if (!c) { alert('Kosong!'); return; }
    if (prompt(`Ketik "HAPUS SEMUA JAWABAN":`) !== 'HAPUS SEMUA JAWABAN') { alert('Batal.'); return; }
    DB.deleteAllJawaban(); DB.deleteAllNilai(); DB.addActivity(`⚠️ Hapus SEMUA jawaban`); loadDashboard(); alert('✅ Dihapus!');
}
function toolDeleteAllNilai() {
    let c = DB.getNilai().length; if (!c) { alert('Kosong!'); return; }
    if (prompt(`Ketik "HAPUS SEMUA NILAI":`) !== 'HAPUS SEMUA NILAI') { alert('Batal.'); return; }
    DB.deleteAllNilai(); DB.addActivity(`⚠️ Hapus SEMUA nilai`); alert('✅ Dihapus!');
}
function toolDeleteAllMahasiswa() {
    let c = DB.getMahasiswa().length; if (!c) { alert('Kosong!'); return; }
    if (prompt(`Ketik "HAPUS SEMUA MAHASISWA":`) !== 'HAPUS SEMUA MAHASISWA') { alert('Batal.'); return; }
    DB.deleteAllMahasiswa(); DB.deleteAllJawaban(); DB.deleteAllNilai();
    DB.addActivity(`⚠️ Hapus SEMUA mahasiswa`); loadDashboard(); alert('✅ Dihapus!');
}
function toolClearActivity() {
    if (!confirm('Bersihkan log?')) return;
    DB.clearActivity(); loadDashboard(); alert('✅ Dibersihkan!');
}
function toolResetAll() {
    if (prompt(`Ketik "RESET TOTAL":`) !== 'RESET TOTAL') { alert('Batal.'); return; }
    if (!confirm('⚠️ YAKIN RESET TOTAL?')) return;
    DB.resetAll(); alert('✅ Reset! Reload...'); setTimeout(() => location.reload(), 500);
}
function toolBackupAll() {
    let b = { version: '1.0', backupDate: new Date().toISOString(), institusi: 'STAI Al-Musdariyah',
        mahasiswa: DB.getMahasiswa(), soal: DB.getSoal(), jawaban: DB.getJawaban(), nilai: DB.getNilai(), activity: DB.getActivity() };
    let blob = new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' });
    let url = URL.createObjectURL(blob), a = document.createElement('a');
    let d = new Date(), ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    a.href = url; a.download = `BACKUP_UTS_${ds}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    DB.addActivity('Backup downloaded'); alert('✅ Backup downloaded!');
}
function toolRestoreBackup(e) {
    let f = e.target.files[0]; if (!f) return;
    if (!confirm('⚠️ Timpa semua data?')) { e.target.value = ''; return; }
    let r = new FileReader();
    r.onload = function (ev) {
        try {
            let b = JSON.parse(ev.target.result);
            if (!b.version) throw new Error('Invalid!');
            localStorage.setItem('uts_mahasiswa', JSON.stringify(b.mahasiswa || []));
            localStorage.setItem('uts_soal', JSON.stringify(b.soal || {}));
            localStorage.setItem('uts_jawaban', JSON.stringify(b.jawaban || []));
            localStorage.setItem('uts_nilai', JSON.stringify(b.nilai || []));
            localStorage.setItem('uts_activity', JSON.stringify(b.activity || []));
            alert('✅ Restored! Reload...'); setTimeout(() => location.reload(), 500);
        } catch (err) { alert('❌ Error: ' + err.message); }
    };
    r.readAsText(f); e.target.value = '';
}
