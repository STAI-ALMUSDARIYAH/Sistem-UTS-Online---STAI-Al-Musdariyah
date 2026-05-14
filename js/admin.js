// ========================================
// ADMIN.JS - FULL VERSION (CLEAN & TESTED)
// STAI Al-Musdariyah - UTS Online System
// ========================================

let currentViewJawaban = null;
let soalBuilderData = [];

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
    let allMK = MATA_KULIAH_DATA.semester5.concat(MATA_KULIAH_DATA.semester7);
    document.getElementById('total-mahasiswa').textContent = mhs.length;
    document.getElementById('total-matkul').textContent = allMK.length;
    document.getElementById('total-soal').textContent = Object.keys(soal).length;
    document.getElementById('total-submitted').textContent = jaw.length;

    let acts = DB.getActivity();
    let log = document.getElementById('activity-log');
    if (acts.length === 0) {
        log.innerHTML = '<p class="empty-state">Belum ada aktivitas</p>';
    } else {
        log.innerHTML = acts.slice(0, 10).map(a => 
            '<div class="activity-item"><i class="fas fa-circle" style="font-size:6px;color:#2e86c1;"></i><span>' + 
            escapeHtml(a.message) + '</span><span class="activity-time">' + a.time + '</span></div>'
        ).join('');
    }
}

// ===== MAHASISWA =====
function loadMahasiswaTable() { renderMahasiswaTable(DB.getMahasiswa()); }

function renderMahasiswaTable(data) {
    let tb = document.getElementById('tbody-mahasiswa');
    if (!data.length) {
        tb.innerHTML = '<tr><td colspan="7" class="empty-state">Belum ada data mahasiswa</td></tr>';
        return;
    }
    tb.innerHTML = data.map((m, i) => 
        '<tr><td>' + (i+1) + '</td>' +
        '<td><strong>' + escapeHtml(m.nim) + '</strong></td>' +
        '<td>' + escapeHtml(m.nama) + '</td>' +
        '<td>Semester ' + m.semester + '</td>' +
        '<td>' + escapeHtml(m.kelas || 'RPL') + '</td>' +
        '<td><code>' + escapeHtml(m.password) + '</code></td>' +
        '<td style="white-space:nowrap;">' +
        '<button class="btn-small btn-edit" onclick="editMahasiswa(\'' + m.nim + '\')"><i class="fas fa-edit"></i></button>' +
        '<button class="btn-small btn-delete" onclick="deleteMahasiswaRow(\'' + m.nim + '\')"><i class="fas fa-trash"></i></button>' +
        '</td></tr>'
    ).join('');
}

function filterMahasiswa() {
    let sem = document.getElementById('filter-semester-mhs').value;
    let q = document.getElementById('search-mhs').value.toLowerCase();
    let d = DB.getMahasiswa().filter(m => 
        (!sem || m.semester === sem) && 
        (!q || m.nim.toLowerCase().includes(q) || m.nama.toLowerCase().includes(q))
    );
    renderMahasiswaTable(d);
}

function showAddMahasiswaModal() {
    document.getElementById('add-nim').value = '';
    document.getElementById('add-nama').value = '';
    document.getElementById('add-password').value = '';
    document.getElementById('add-semester').value = '5';
    document.getElementById('add-kelas').value = 'RPL';
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
    if (!nim || !nama || !password) { alert('Semua field harus diisi!'); return; }
    if (DB.addMahasiswa({ nim: nim, nama: nama, semester: semester, kelas: kelas, password: password })) {
        DB.addActivity('Admin menambahkan mahasiswa: ' + nama + ' (' + nim + ')');
        closeModal('modal-add-mhs');
        loadMahasiswaTable();
        loadDashboard();
        alert('✅ Mahasiswa berhasil ditambahkan!');
    } else {
        alert('❌ NIM sudah terdaftar!');
    }
}

function importMahasiswa() {
    let raw = document.getElementById('import-data').value.trim();
    if (!raw) { alert('Data kosong!'); return; }
    let lines = raw.split('\n').filter(l => l.trim());
    let s = 0, f = 0;
    lines.forEach(line => {
        let p = line.split('|').map(x => x.trim());
        if (p.length >= 5) {
            if (DB.addMahasiswa({ nim: p[0], nama: p[1], semester: p[2], kelas: p[3], password: p[4] })) s++;
            else f++;
        } else f++;
    });
    DB.addActivity('Admin import: ' + s + ' berhasil, ' + f + ' gagal');
    closeModal('modal-import-mhs');
    loadMahasiswaTable();
    loadDashboard();
    alert('Import selesai!\nBerhasil: ' + s + '\nGagal: ' + f);
}

function editMahasiswa(nim) {
    let m = DB.findMahasiswa(nim);
    if (!m) return;
    let nn = prompt('Nama:', m.nama); if (nn === null) return;
    let np = prompt('Password:', m.password); if (np === null) return;
    let ns = prompt('Semester (5/7):', m.semester); if (ns === null) return;
    DB.updateMahasiswa(nim, { nama: nn || m.nama, password: np || m.password, semester: ns || m.semester });
    DB.addActivity('Edit mahasiswa: ' + nim);
    loadMahasiswaTable();
    alert('✅ Diupdate!');
}

function deleteMahasiswaRow(nim) {
    let m = DB.findMahasiswa(nim);
    if (!m) return;
    let j = DB.getJawabanByNim(nim), n = DB.getNilaiByNim(nim);
    if (!confirm('⚠️ HAPUS?\n' + m.nama + '\n\n- ' + j.length + ' jawaban\n- ' + n.length + ' nilai\n\nLanjutkan?')) return;
    DB.deleteMahasiswaComplete(nim);
    DB.addActivity('Hapus mahasiswa: ' + m.nama + ' (' + nim + ')');
    loadMahasiswaTable();
    loadDashboard();
    alert('✅ Dihapus!');
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
        return '<tr><td>' + mk.no + '</td><td><strong>' + escapeHtml(mk.nama) + '</strong></td>' +
               '<td>' + mk.sks + '</td><td>' + escapeHtml(mk.dosen) + '</td>' +
               '<td>' + mk.noHp + '</td><td>' + mk.hari + '</td><td>' + mk.jam + '</td>' +
               '<td><span class="status-badge ' + (has ? 'status-lulus' : 'status-pending') + '">' + 
               (has ? '✓ Sudah Ada' : '✗ Belum Ada') + '</span></td></tr>';
    }).join('');
}

// ===== POPULATE SELECTS =====
function populateMatkulSelects() {
    let opt = '<option value="">-- Pilih Mata Kuliah --</option><optgroup label="Semester 5">';
    MATA_KULIAH_DATA.semester5.forEach(mk => { opt += '<option value="' + mk.id + '">' + mk.nama + '</option>'; });
    opt += '</optgroup><optgroup label="Semester 7">';
    MATA_KULIAH_DATA.semester7.forEach(mk => { opt += '<option value="' + mk.id + '">' + mk.nama + '</option>'; });
    opt += '</optgroup>';

    ['select-matkul-soal', 'filter-matkul-nilai'].forEach(id => {
        let e = document.getElementById(id);
        if (e) e.innerHTML = opt;
    });

    let all = MATA_KULIAH_DATA.semester5.concat(MATA_KULIAH_DATA.semester7);
    let o2 = '<option value="">-- Semua Mata Kuliah --</option>';
    all.forEach(mk => { o2 += '<option value="' + mk.id + '">' + mk.nama + '</option>'; });
    let e2 = document.getElementById('filter-matkul-hasil');
    if (e2) e2.innerHTML = o2;
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
        if (existing.blocks && existing.blocks.length > 0) {
            soalBuilderData = JSON.parse(JSON.stringify(existing.blocks));
        } else if (existing.soal && existing.soal.length > 0) {
            existing.soal.forEach(s => {
                soalBuilderData.push({ type: 'biasa', pertanyaan: s.pertanyaan, bobot: s.bobot });
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
    soalBuilderData.push({ type: 'biasa', pertanyaan: '', bobot: 10 });
    renderSoalBuilder();
    scrollToLastBlock();
}

function addSoalPilihan() {
    soalBuilderData.push({
        type: 'pilihan', pertanyaan: '', bobot: 10,
        modePilihan: 'single', butuhAlasan: true,
        opsi: [{ label: 'A', teks: '' }, { label: 'B', teks: '' }]
    });
    renderSoalBuilder();
    scrollToLastBlock();
}

function addSoalCerita() {
    soalBuilderData.push({
        type: 'cerita', cerita: '',
        subSoal: [{ tipe: 'esai', pertanyaan: '', bobot: 10 }]
    });
    renderSoalBuilder();
    scrollToLastBlock();
}

function scrollToLastBlock() {
    setTimeout(() => {
        let blocks = document.querySelectorAll('#soal-builder-container .soal-block');
        if (blocks.length > 0) blocks[blocks.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

function renderSoalBuilder() {
    let container = document.getElementById('soal-builder-container');
    if (soalBuilderData.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding:30px;"><i class="fas fa-info-circle"></i> Belum ada soal. Klik tombol di atas untuk menambah.</div>';
        return;
    }
    let globalNo = 0, html = '';
    soalBuilderData.forEach((block, blockIdx) => {
        if (block.type === 'biasa') {
            globalNo++;
            html += renderSoalBiasaBlock(blockIdx, globalNo, block);
        } else if (block.type === 'pilihan') {
            globalNo++;
            html += renderSoalPilihanBlock(blockIdx, globalNo, block);
        } else if (block.type === 'cerita') {
            let startNo = globalNo + 1;
            let subCount = block.subSoal ? block.subSoal.length : 0;
            globalNo += subCount;
            html += renderSoalCeritaBlock(blockIdx, startNo, globalNo, block);
        }
    });
    container.innerHTML = html;
}

function renderSoalBiasaBlock(blockIdx, soalNo, block) {
    return '<div class="soal-block soal-block-biasa" data-block="' + blockIdx + '">' +
        '<div class="soal-block-header">' +
        '<div class="soal-block-badge badge-biasa"><i class="fas fa-pen"></i> Soal ' + soalNo + ' (Esai)</div>' +
        '<div class="soal-block-actions">' +
        '<button class="btn-small btn-edit" onclick="moveBlock(' + blockIdx + ',-1)" title="Atas"><i class="fas fa-arrow-up"></i></button>' +
        '<button class="btn-small btn-edit" onclick="moveBlock(' + blockIdx + ',1)" title="Bawah"><i class="fas fa-arrow-down"></i></button>' +
        '<button class="btn-small btn-delete" onclick="removeBlock(' + blockIdx + ')" title="Hapus"><i class="fas fa-trash"></i></button>' +
        '</div></div>' +
        '<div class="soal-block-body">' +
        '<div class="form-group"><label>Pertanyaan</label>' +
        '<textarea rows="4" placeholder="Tuliskan pertanyaan..." onchange="updateBiasa(' + blockIdx + ',\'pertanyaan\',this.value)">' + escapeHtml(block.pertanyaan || '') + '</textarea>' +
        '</div>' +
        '<div class="form-group"><label>Bobot Nilai</label>' +
        '<input type="number" value="' + (block.bobot || 10) + '" min="1" max="100" style="width:100px;" onchange="updateBiasa(' + blockIdx + ',\'bobot\',this.value)">' +
        '</div></div></div>';
}

function renderSoalPilihanBlock(blockIdx, soalNo, block) {
    let opsiHtml = '';
    if (block.opsi) {
        block.opsi.forEach((opt, i) => {
            opsiHtml += '<div class="opsi-item">' +
                '<div class="opsi-label">' + opt.label + '</div>' +
                '<textarea rows="2" placeholder="Isi pilihan ' + opt.label + '..." onchange="updateOpsi(' + blockIdx + ',' + i + ',this.value)">' + escapeHtml(opt.teks || '') + '</textarea>' +
                '<button class="btn-small btn-delete" onclick="removeOpsi(' + blockIdx + ',' + i + ')"><i class="fas fa-times"></i></button>' +
                '</div>';
        });
    }
    return '<div class="soal-block soal-block-pilihan" data-block="' + blockIdx + '">' +
        '<div class="soal-block-header">' +
        '<div class="soal-block-badge badge-pilihan"><i class="fas fa-list-ul"></i> Soal ' + soalNo + ' (Pilihan' + (block.butuhAlasan ? ' + Alasan' : '') + ')</div>' +
        '<div class="soal-block-actions">' +
        '<button class="btn-small btn-edit" onclick="moveBlock(' + blockIdx + ',-1)"><i class="fas fa-arrow-up"></i></button>' +
        '<button class="btn-small btn-edit" onclick="moveBlock(' + blockIdx + ',1)"><i class="fas fa-arrow-down"></i></button>' +
        '<button class="btn-small btn-delete" onclick="removeBlock(' + blockIdx + ')"><i class="fas fa-trash"></i></button>' +
        '</div></div>' +
        '<div class="soal-block-body">' +
        '<div class="form-group"><label>Pertanyaan</label>' +
        '<textarea rows="3" placeholder="Tuliskan pertanyaan..." onchange="updatePilihan(' + blockIdx + ',\'pertanyaan\',this.value)">' + escapeHtml(block.pertanyaan || '') + '</textarea>' +
        '</div>' +
        '<div class="form-row">' +
        '<div class="form-group"><label>Mode Pilihan</label>' +
        '<select onchange="updatePilihan(' + blockIdx + ',\'modePilihan\',this.value)">' +
        '<option value="single"' + (block.modePilihan === 'single' ? ' selected' : '') + '>Pilih SATU (Radio)</option>' +
        '<option value="multi"' + (block.modePilihan === 'multi' ? ' selected' : '') + '>Pilih BEBERAPA (Checkbox)</option>' +
        '</select></div>' +
        '<div class="form-group"><label>Bobot</label>' +
        '<input type="number" value="' + (block.bobot || 10) + '" min="1" max="100" onchange="updatePilihan(' + blockIdx + ',\'bobot\',this.value)">' +
        '</div>' +
        '<div class="form-group"><label>Wajib Alasan?</label>' +
        '<select onchange="updatePilihan(' + blockIdx + ',\'butuhAlasan\',this.value === \'true\')">' +
        '<option value="true"' + (block.butuhAlasan ? ' selected' : '') + '>Ya, Wajib</option>' +
        '<option value="false"' + (!block.butuhAlasan ? ' selected' : '') + '>Tidak Perlu</option>' +
        '</select></div>' +
        '</div>' +
        '<div class="opsi-container">' +
        '<div class="opsi-header"><h4><i class="fas fa-list"></i> Daftar Pilihan</h4>' +
        '<button class="btn-primary btn-sm" onclick="addOpsi(' + blockIdx + ')"><i class="fas fa-plus"></i> Tambah Pilihan</button></div>' +
        '<div class="opsi-list">' + (opsiHtml || '<p class="empty-state" style="padding:10px;font-size:11px;">Belum ada pilihan</p>') + '</div>' +
        '<p class="opsi-hint"><i class="fas fa-info-circle"></i> Untuk teks Arab, langsung paste/ketik di textarea.</p>' +
        '</div></div></div>';
}

function renderSoalCeritaBlock(blockIdx, startNo, endNo, block) {
    let subCount = block.subSoal ? block.subSoal.length : 0;
    let rangeText = subCount > 0 ? 'Soal ' + startNo + ' - ' + endNo : 'Belum ada sub-soal';
    let subHtml = '';
    if (block.subSoal) {
        block.subSoal.forEach((sub, subIdx) => {
            let subNo = startNo + subIdx;
            subHtml += renderSubSoal(blockIdx, subIdx, subNo, sub);
        });
    }
    return '<div class="soal-block soal-block-cerita" data-block="' + blockIdx + '">' +
        '<div class="soal-block-header">' +
        '<div class="soal-block-badge badge-cerita"><i class="fas fa-book-open"></i> Soal Cerita / Kasus — ' + rangeText + '</div>' +
        '<div class="soal-block-actions">' +
        '<button class="btn-small btn-edit" onclick="moveBlock(' + blockIdx + ',-1)"><i class="fas fa-arrow-up"></i></button>' +
        '<button class="btn-small btn-edit" onclick="moveBlock(' + blockIdx + ',1)"><i class="fas fa-arrow-down"></i></button>' +
        '<button class="btn-small btn-delete" onclick="removeBlock(' + blockIdx + ')"><i class="fas fa-trash"></i></button>' +
        '</div></div>' +
        '<div class="soal-block-body">' +
        '<div class="form-group"><label><i class="fas fa-book-reader"></i> Cerita / Narasi Kasus</label>' +
        '<textarea rows="6" class="cerita-textarea" placeholder="Tuliskan narasi/kasus..." onchange="updateCerita(' + blockIdx + ',this.value)">' + escapeHtml(block.cerita || '') + '</textarea>' +
        '</div>' +
        '<div class="sub-soal-container">' +
        '<div class="sub-soal-title"><h4><i class="fas fa-list-ol"></i> Pertanyaan berdasarkan cerita:</h4>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
        '<button class="btn-primary btn-sm" onclick="addSubSoalEsai(' + blockIdx + ')"><i class="fas fa-plus"></i> Tambah Esai</button>' +
        '<button class="btn-pilihan btn-sm" onclick="addSubSoalPilihan(' + blockIdx + ')"><i class="fas fa-plus"></i> Tambah Pilihan</button>' +
        '</div></div>' +
        '<div class="sub-soal-list">' + (subHtml || '<p class="empty-state" style="padding:15px;">Klik tombol untuk tambah pertanyaan</p>') + '</div>' +
        '</div></div></div>';
}

function renderSubSoal(blockIdx, subIdx, subNo, sub) {
    let tipe = sub.tipe || 'esai';
    let header = '<div class="sub-soal-item" data-sub="' + subIdx + '">' +
        '<div class="sub-soal-header"><span class="sub-soal-number">Soal ' + subNo + '</span>' +
        '<div style="display:flex;gap:5px;align-items:center;">' +
        '<select onchange="changeSubSoalTipe(' + blockIdx + ',' + subIdx + ',this.value)" style="padding:5px;border-radius:5px;border:1px solid #ddd;font-size:12px;">' +
        '<option value="esai"' + (tipe === 'esai' ? ' selected' : '') + '>Esai</option>' +
        '<option value="pilihan"' + (tipe === 'pilihan' ? ' selected' : '') + '>Pilihan + Alasan</option>' +
        '</select>' +
        '<button class="btn-small btn-delete" onclick="removeSubSoal(' + blockIdx + ',' + subIdx + ')"><i class="fas fa-times"></i></button>' +
        '</div></div>';

    if (tipe === 'pilihan') {
        let opsiHtml = '';
        if (sub.opsi) {
            sub.opsi.forEach((opt, oi) => {
                opsiHtml += '<div class="opsi-item">' +
                    '<div class="opsi-label">' + opt.label + '</div>' +
                    '<textarea rows="2" placeholder="Pilihan ' + opt.label + '" onchange="updateSubOpsi(' + blockIdx + ',' + subIdx + ',' + oi + ',this.value)">' + escapeHtml(opt.teks || '') + '</textarea>' +
                    '<button class="btn-small btn-delete" onclick="removeSubOpsi(' + blockIdx + ',' + subIdx + ',' + oi + ')"><i class="fas fa-times"></i></button>' +
                    '</div>';
            });
        }
        return header +
            '<div class="form-group"><label>Pertanyaan</label>' +
            '<textarea rows="3" placeholder="Pertanyaan..." onchange="updateSubSoal(' + blockIdx + ',' + subIdx + ',\'pertanyaan\',this.value)">' + escapeHtml(sub.pertanyaan || '') + '</textarea>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>Mode</label>' +
            '<select onchange="updateSubSoal(' + blockIdx + ',' + subIdx + ',\'modePilihan\',this.value)">' +
            '<option value="single"' + (sub.modePilihan === 'single' ? ' selected' : '') + '>Pilih SATU</option>' +
            '<option value="multi"' + (sub.modePilihan === 'multi' ? ' selected' : '') + '>Pilih BEBERAPA</option>' +
            '</select></div>' +
            '<div class="form-group"><label>Bobot</label>' +
            '<input type="number" value="' + (sub.bobot || 10) + '" min="1" max="100" onchange="updateSubSoal(' + blockIdx + ',' + subIdx + ',\'bobot\',this.value)">' +
            '</div>' +
            '<div class="form-group"><label>Wajib Alasan?</label>' +
            '<select onchange="updateSubSoal(' + blockIdx + ',' + subIdx + ',\'butuhAlasan\',this.value === \'true\')">' +
            '<option value="true"' + (sub.butuhAlasan ? ' selected' : '') + '>Ya</option>' +
            '<option value="false"' + (!sub.butuhAlasan ? ' selected' : '') + '>Tidak</option>' +
            '</select></div>' +
            '</div>' +
            '<div class="opsi-container">' +
            '<div class="opsi-header"><h4>Pilihan</h4>' +
            '<button class="btn-primary btn-sm" onclick="addSubOpsi(' + blockIdx + ',' + subIdx + ')"><i class="fas fa-plus"></i> Tambah Pilihan</button></div>' +
            '<div class="opsi-list">' + (opsiHtml || '<p class="empty-state" style="padding:8px;">Belum ada pilihan</p>') + '</div>' +
            '</div></div>';
    } else {
        return header +
            '<div class="form-group"><label>Pertanyaan</label>' +
            '<textarea rows="3" placeholder="Pertanyaan..." onchange="updateSubSoal(' + blockIdx + ',' + subIdx + ',\'pertanyaan\',this.value)">' + escapeHtml(sub.pertanyaan || '') + '</textarea>' +
            '</div>' +
            '<div class="form-group"><label>Bobot</label>' +
            '<input type="number" value="' + (sub.bobot || 10) + '" min="1" max="100" style="width:90px;" onchange="updateSubSoal(' + blockIdx + ',' + subIdx + ',\'bobot\',this.value)">' +
            '</div></div>';
    }
}

// ===== UPDATE FUNCTIONS =====
function updateBiasa(idx, field, val) {
    if (field === 'bobot') val = parseInt(val) || 10;
    soalBuilderData[idx][field] = val;
}

function updateCerita(idx, val) { soalBuilderData[idx].cerita = val; }

function updatePilihan(idx, field, val) {
    if (field === 'bobot') val = parseInt(val) || 10;
    soalBuilderData[idx][field] = val;
    if (field === 'butuhAlasan') renderSoalBuilder();
}

function updateOpsi(blockIdx, opsiIdx, val) {
    if (soalBuilderData[blockIdx].opsi && soalBuilderData[blockIdx].opsi[opsiIdx]) {
        soalBuilderData[blockIdx].opsi[opsiIdx].teks = val;
    }
}

function addOpsi(blockIdx) {
    if (!soalBuilderData[blockIdx].opsi) soalBuilderData[blockIdx].opsi = [];
    let nextLabel = String.fromCharCode(65 + soalBuilderData[blockIdx].opsi.length);
    soalBuilderData[blockIdx].opsi.push({ label: nextLabel, teks: '' });
    renderSoalBuilder();
}

function removeOpsi(blockIdx, opsiIdx) {
    if (!confirm('Hapus pilihan ini?')) return;
    soalBuilderData[blockIdx].opsi.splice(opsiIdx, 1);
    soalBuilderData[blockIdx].opsi.forEach((o, i) => { o.label = String.fromCharCode(65 + i); });
    renderSoalBuilder();
}

function updateSubSoal(blockIdx, subIdx, field, val) {
    if (field === 'bobot') val = parseInt(val) || 10;
    soalBuilderData[blockIdx].subSoal[subIdx][field] = val;
}

function changeSubSoalTipe(blockIdx, subIdx, newTipe) {
    let sub = soalBuilderData[blockIdx].subSoal[subIdx];
    sub.tipe = newTipe;
    if (newTipe === 'pilihan') {
        if (!sub.opsi) sub.opsi = [{ label: 'A', teks: '' }, { label: 'B', teks: '' }];
        if (sub.modePilihan === undefined) sub.modePilihan = 'single';
        if (sub.butuhAlasan === undefined) sub.butuhAlasan = true;
    }
    renderSoalBuilder();
}

function updateSubOpsi(blockIdx, subIdx, opsiIdx, val) {
    let sub = soalBuilderData[blockIdx].subSoal[subIdx];
    if (sub.opsi && sub.opsi[opsiIdx]) sub.opsi[opsiIdx].teks = val;
}

function addSubOpsi(blockIdx, subIdx) {
    let sub = soalBuilderData[blockIdx].subSoal[subIdx];
    if (!sub.opsi) sub.opsi = [];
    let nextLabel = String.fromCharCode(65 + sub.opsi.length);
    sub.opsi.push({ label: nextLabel, teks: '' });
    renderSoalBuilder();
}

function removeSubOpsi(blockIdx, subIdx, opsiIdx) {
    if (!confirm('Hapus pilihan?')) return;
    let sub = soalBuilderData[blockIdx].subSoal[subIdx];
    sub.opsi.splice(opsiIdx, 1);
    sub.opsi.forEach((o, i) => { o.label = String.fromCharCode(65 + i); });
    renderSoalBuilder();
}

function addSubSoalEsai(blockIdx) {
    if (!soalBuilderData[blockIdx].subSoal) soalBuilderData[blockIdx].subSoal = [];
    soalBuilderData[blockIdx].subSoal.push({ tipe: 'esai', pertanyaan: '', bobot: 10 });
    renderSoalBuilder();
}

function addSubSoalPilihan(blockIdx) {
    if (!soalBuilderData[blockIdx].subSoal) soalBuilderData[blockIdx].subSoal = [];
    soalBuilderData[blockIdx].subSoal.push({
        tipe: 'pilihan', pertanyaan: '', bobot: 10,
        modePilihan: 'single', butuhAlasan: true,
        opsi: [{ label: 'A', teks: '' }, { label: 'B', teks: '' }]
    });
    renderSoalBuilder();
}

function removeSubSoal(blockIdx, subIdx) {
    if (!confirm('Hapus pertanyaan ini?')) return;
    soalBuilderData[blockIdx].subSoal.splice(subIdx, 1);
    renderSoalBuilder();
}

function removeBlock(blockIdx) {
    let block = soalBuilderData[blockIdx];
    let label = block.type === 'cerita' ? 'blok soal cerita (beserta semua pertanyaan)' : 'soal ini';
    if (!confirm('Hapus ' + label + '?')) return;
    soalBuilderData.splice(blockIdx, 1);
    renderSoalBuilder();
}

function moveBlock(idx, dir) {
    let newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= soalBuilderData.length) return;
    let temp = soalBuilderData[idx];
    soalBuilderData[idx] = soalBuilderData[newIdx];
    soalBuilderData[newIdx] = temp;
    renderSoalBuilder();
}

// ===== SAVE SOAL =====
function saveSoal() {
    let matkulId = document.getElementById('select-matkul-soal').value;
    if (!matkulId) { alert('Pilih mata kuliah!'); return; }
    if (soalBuilderData.length === 0) { alert('Tambahkan minimal 1 soal!'); return; }

    let totalSoal = 0;
    for (let b of soalBuilderData) {
        if (b.type === 'biasa') {
            if (!b.pertanyaan || !b.pertanyaan.trim()) { alert('Ada soal esai kosong!'); return; }
            totalSoal++;
        } else if (b.type === 'pilihan') {
            if (!b.pertanyaan || !b.pertanyaan.trim()) { alert('Ada soal pilihan kosong!'); return; }
            if (!b.opsi || b.opsi.length < 2) { alert('Soal pilihan minimal 2 opsi!'); return; }
            for (let o of b.opsi) {
                if (!o.teks || !o.teks.trim()) { alert('Ada opsi kosong!'); return; }
            }
            totalSoal++;
        } else if (b.type === 'cerita') {
            if (!b.cerita || !b.cerita.trim()) { alert('Ada cerita kosong!'); return; }
            if (!b.subSoal || b.subSoal.length === 0) { alert('Soal cerita harus punya pertanyaan!'); return; }
            for (let s of b.subSoal) {
                if (!s.pertanyaan || !s.pertanyaan.trim()) { alert('Ada sub-pertanyaan kosong!'); return; }
                if (s.tipe === 'pilihan') {
                    if (!s.opsi || s.opsi.length < 2) { alert('Sub-soal pilihan minimal 2 opsi!'); return; }
                    for (let o of s.opsi) {
                        if (!o.teks || !o.teks.trim()) { alert('Ada opsi sub-soal kosong!'); return; }
                    }
                }
                totalSoal++;
            }
        }
    }

    let petunjuk = document.getElementById('petunjuk-soal').value.trim();
    let durasi = parseInt(document.getElementById('durasi-ujian').value) || 90;
    let waktuUjian = document.getElementById('waktu-ujian').value;
    let mk = DB.getMatkulById(matkulId);

    let flatSoal = [];
    let no = 0;
    soalBuilderData.forEach(block => {
        if (block.type === 'biasa') {
            no++;
            flatSoal.push({
                no: no, tipe: 'esai', pertanyaan: block.pertanyaan,
                bobot: block.bobot, ceritaRef: null
            });
        } else if (block.type === 'pilihan') {
            no++;
            flatSoal.push({
                no: no, tipe: 'pilihan', pertanyaan: block.pertanyaan,
                bobot: block.bobot, modePilihan: block.modePilihan,
                butuhAlasan: block.butuhAlasan, opsi: block.opsi, ceritaRef: null
            });
        } else if (block.type === 'cerita') {
            block.subSoal.forEach(sub => {
                no++;
                let item = {
                    no: no, tipe: sub.tipe || 'esai',
                    pertanyaan: sub.pertanyaan, bobot: sub.bobot,
                    ceritaRef: block.cerita
                };
                if (sub.tipe === 'pilihan') {
                    item.modePilihan = sub.modePilihan;
                    item.butuhAlasan = sub.butuhAlasan;
                    item.opsi = sub.opsi;
                }
                flatSoal.push(item);
            });
        }
    });

    DB.setSoalMatkul(matkulId, {
        matkulId: matkulId, matkulNama: mk.nama, dosen: mk.dosen,
        petunjuk: petunjuk, durasi: durasi, waktuUjian: waktuUjian,
        blocks: soalBuilderData, soal: flatSoal,
        createdAt: new Date().toISOString()
    });

    DB.addActivity('Admin buat/update soal: ' + mk.nama + ' (' + totalSoal + ' soal)');
    alert('✅ Soal berhasil disimpan!\n\nMata Kuliah: ' + mk.nama + '\nTotal Pertanyaan: ' + totalSoal);
}

function deleteSoalCurrent() {
    let matkulId = document.getElementById('select-matkul-soal').value;
    if (!matkulId) { alert('Pilih mata kuliah!'); return; }
    let mk = DB.getMatkulById(matkulId);
    let soal = DB.getSoalMatkul(matkulId);
    if (!soal) { alert('Belum ada soal!'); return; }
    if (!confirm('⚠️ Hapus semua soal "' + mk.nama + '"?')) return;
    DB.deleteSoalMatkul(matkulId);
    DB.addActivity('Admin hapus soal: ' + mk.nama);
    soalBuilderData = [];
    document.getElementById('soal-editor').style.display = 'none';
    document.getElementById('select-matkul-soal').value = '';
    loadDashboard();
    alert('✅ Soal dihapus!');
}

function previewSoal() {
    let area = document.getElementById('soal-preview-area');
    if (area.style.display === 'block') { area.style.display = 'none'; return; }
    if (soalBuilderData.length === 0) { alert('Belum ada soal!'); return; }

    let html = '<div class="soal-preview"><h3 style="color:#1a5276;margin-bottom:15px;"><i class="fas fa-eye"></i> Preview (Tampilan Mahasiswa)</h3>';
    let globalNo = 0;

    soalBuilderData.forEach(block => {
        if (block.type === 'biasa') {
            globalNo++;
            html += '<div class="preview-item preview-biasa">' +
                '<span class="soal-number">Soal ' + globalNo + '</span>' +
                '<p class="soal-bobot">Bobot: ' + block.bobot + ' poin</p>' +
                '<div class="soal-text">' + escapeHtml(block.pertanyaan || '(Belum diisi)') + '</div>' +
                '<div class="preview-answer-box"><i class="fas fa-pen-fancy"></i> Area jawaban esai</div>' +
                '</div>';
        } else if (block.type === 'pilihan') {
            globalNo++;
            html += renderPreviewPilihan(globalNo, block, false);
        } else if (block.type === 'cerita') {
            html += '<div class="preview-item preview-cerita">' +
                '<div class="preview-cerita-header"><i class="fas fa-book-open"></i> Bacalah cerita berikut:</div>' +
                '<div class="preview-cerita-text">' + escapeHtml(block.cerita || '(Belum diisi)') + '</div>' +
                '<div class="preview-cerita-questions">';
            if (block.subSoal) {
                block.subSoal.forEach(sub => {
                    globalNo++;
                    if (sub.tipe === 'pilihan') {
                        html += renderPreviewPilihan(globalNo, sub, true);
                    } else {
                        html += '<div class="preview-sub-soal">' +
                            '<span class="soal-number">Soal ' + globalNo + '</span>' +
                            '<p class="soal-bobot">Bobot: ' + sub.bobot + ' poin</p>' +
                            '<div class="soal-text">' + escapeHtml(sub.pertanyaan || '') + '</div>' +
                            '<div class="preview-answer-box">Area jawaban</div>' +
                            '</div>';
                    }
                });
            }
            html += '</div></div>';
        }
    });
    html += '</div>';
    area.innerHTML = html;
    area.style.display = 'block';
    area.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderPreviewPilihan(no, block, isSub) {
    let opsiHtml = '';
    if (block.opsi) {
        block.opsi.forEach(opt => {
            let inputType = block.modePilihan === 'multi' ? 'checkbox' : 'radio';
            opsiHtml += '<label class="preview-opsi-label">' +
                '<input type="' + inputType + '" disabled> ' +
                '<span class="opsi-letter">' + opt.label + '.</span> ' +
                '<span class="opsi-isi">' + escapeHtml(opt.teks || '(kosong)') + '</span>' +
                '</label>';
        });
    }
    return '<div class="preview-item ' + (isSub ? 'preview-sub-soal' : 'preview-pilihan') + '">' +
        '<span class="soal-number">Soal ' + no + '</span>' +
        '<p class="soal-bobot">Bobot: ' + block.bobot + ' poin</p>' +
        '<div class="soal-text">' + escapeHtml(block.pertanyaan || '') + '</div>' +
        '<div class="preview-opsi-list">' +
        '<p class="opsi-instruksi"><i class="fas fa-' + (block.modePilihan === 'multi' ? 'check-square' : 'dot-circle') + '"></i> ' +
        (block.modePilihan === 'multi' ? 'Pilih satu/beberapa:' : 'Pilih salah satu:') + '</p>' +
        opsiHtml + '</div>' +
        (block.butuhAlasan ? '<div class="preview-alasan-box"><label><i class="fas fa-pen"></i> Berikan Alasan:</label><div class="preview-answer-box">Area alasan mahasiswa</div></div>' : '') +
        '</div>';
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
        let st = n ? 'Dinilai (' + n.nilai + ')' : 'Belum Dinilai';
        return '<tr>' +
            '<td>' + (i + 1) + '</td>' +
            '<td><strong>' + escapeHtml(j.nim) + '</strong></td>' +
            '<td>' + escapeHtml(j.namaMhs) + '</td>' +
            '<td>' + escapeHtml(mkN) + '</td>' +
            '<td>Sem ' + (j.semester || '-') + '</td>' +
            '<td>' + formatDateTime(j.submittedAt) + '</td>' +
            '<td><span class="status-badge ' + sc + '">' + st + '</span></td>' +
            '<td style="white-space:nowrap;">' +
            '<button class="btn-small btn-view" onclick="viewJawaban(\'' + j.nim + '\',\'' + j.matkulId + '\')" title="Lihat"><i class="fas fa-eye"></i></button>' +
            '<button class="btn-small btn-download" onclick="downloadJawabanTXT(\'' + j.nim + '\',\'' + j.matkulId + '\')" title="Download TXT"><i class="fas fa-file-alt"></i></button>' +
            '<button class="btn-small btn-delete" onclick="deleteJawabanRow(\'' + j.nim + '\',\'' + j.matkulId + '\')" title="Hapus"><i class="fas fa-trash"></i></button>' +
            '</td></tr>';
    }).join('');
}

function deleteJawabanRow(nim, matkulId) {
    let mk = DB.getMatkulById(matkulId), mhs = DB.findMahasiswa(nim);
    if (!confirm('⚠️ HAPUS JAWABAN?\n' + (mhs ? mhs.nama : nim) + ' - ' + (mk ? mk.nama : matkulId) + '\n\nLanjutkan?')) return;
    DB.deleteJawaban(nim, matkulId);
    DB.deleteNilai(nim, matkulId);
    DB.addActivity('Hapus jawaban: ' + (mhs ? mhs.nama : nim) + ' - ' + (mk ? mk.nama : matkulId));
    loadHasilUjian();
    loadDashboard();
    alert('✅ Dihapus!');
}

// ===== VIEW JAWABAN =====
function viewJawaban(nim, matkulId) {
    let jaw = DB.getJawabanDetail(nim, matkulId);
    if (!jaw) { alert('Tidak ditemukan!'); return; }
    currentViewJawaban = jaw;
    let mk = DB.getMatkulById(matkulId);
    let nilai = DB.getNilai().find(n => n.nim === nim && n.matkulId === matkulId);
    document.getElementById('view-jawaban-content').innerHTML = generateJawabanHTML(jaw, mk, nilai);
    openModal('modal-view-jawaban');
}

function generateJawabanHTML(jaw, mk, nilai) {
    let html = '<div class="lembar-jawaban" id="lembar-pdf-content">' +
        '<div class="lj-header">' +
        '<div class="lj-logo-area"><i class="fas fa-mosque" style="font-size:50px;color:#1a5276;"></i></div>' +
        '<div class="lj-header-text">' +
        '<h2>SEKOLAH TINGGI AGAMA ISLAM AL-MUSDARIYAH</h2>' +
        '<h3>JURUSAN SYARIAH</h3>' +
        '<h3>PROGRAM STUDI HUKUM EKONOMI SYARIAH</h3>' +
        '<p>Jl. Kamarung NO.25A,Kel. Citeureup, Kec. Cimahi Utara, Kota Cimahi - Jawa Barat</p>' +
        '<p>Telp: (022) 86001421 | Email: staialmusdariyah@gmail.com</p>' +
        '</div></div>' +
        '<div class="lj-divider"></div>' +
        '<div class="lj-title"><h2>LEMBAR JAWABAN UJIAN TENGAH SEMESTER (UTS)</h2><p>Tahun Akademik 2025 / 2026</p></div>' +
        '<table class="lj-info-table">' +
        '<tr><td class="lj-label">Nama</td><td class="lj-colon">:</td><td class="lj-value"><strong>' + escapeHtml(jaw.namaMhs) + '</strong></td>' +
        '<td class="lj-label">Mata Kuliah</td><td class="lj-colon">:</td><td class="lj-value">' + escapeHtml(mk ? mk.nama : jaw.matkulNama) + '</td></tr>' +
        '<tr><td class="lj-label">NIM</td><td class="lj-colon">:</td><td class="lj-value"><strong>' + escapeHtml(jaw.nim) + '</strong></td>' +
        '<td class="lj-label">Dosen</td><td class="lj-colon">:</td><td class="lj-value">' + escapeHtml(mk ? mk.dosen : '-') + '</td></tr>' +
        '<tr><td class="lj-label">Semester</td><td class="lj-colon">:</td><td class="lj-value">' + jaw.semester + '</td>' +
        '<td class="lj-label">Tanggal</td><td class="lj-colon">:</td><td class="lj-value">' + formatDateLong(jaw.submittedAt) + '</td></tr>' +
        '<tr><td class="lj-label">Kelas</td><td class="lj-colon">:</td><td class="lj-value">RPL (Non Reguler)</td>' +
        '<td class="lj-label">Waktu Submit</td><td class="lj-colon">:</td><td class="lj-value">' + formatTimeOnly(jaw.submittedAt) + '</td></tr>' +
        '</table>' +
        '<div class="lj-instruksi"><strong>Petunjuk:</strong> Lembar jawaban ini dikumpulkan secara online melalui Sistem UTS Online STAI Al-Musdariyah</div>' +
        '<div class="lj-content-area">';

    let lastCerita = null;
    jaw.jawaban.forEach((j, i) => {
        if (j.ceritaRef && j.ceritaRef !== lastCerita) {
            lastCerita = j.ceritaRef;
            html += '<div class="lj-cerita">' +
                '<div class="lj-cerita-label">📖 CERITA / KASUS:</div>' +
                '<div class="lj-cerita-text">' + escapeHtml(j.ceritaRef) + '</div>' +
                '</div>';
        }
        if (!j.ceritaRef) lastCerita = null;

        html += '<div class="lj-soal-block">' +
            '<div class="lj-soal-header">' +
            '<span class="lj-soal-no">Soal No. ' + (i + 1) + '</span>' +
            '<span class="lj-soal-bobot">Bobot: ' + j.bobot + ' poin</span>' +
            '</div>' +
            '<div class="lj-soal-pertanyaan">' + escapeHtml(j.pertanyaan) + '</div>';

        if (j.tipe === 'pilihan') {
            html += '<div class="lj-pilihan-area">' +
                '<p class="lj-pilihan-instruksi"><strong>Pilihan yang tersedia:</strong></p>';
            if (j.opsi) {
                j.opsi.forEach(opt => {
                    let isPicked = j.pilihan && j.pilihan.indexOf(opt.label) !== -1;
                    html += '<div class="lj-opsi-item ' + (isPicked ? 'lj-opsi-dipilih' : '') + '">' +
                        '<span class="lj-opsi-mark">' + (isPicked ? '☑' : '☐') + '</span>' +
                        '<span class="lj-opsi-label">' + opt.label + '.</span>' +
                        '<span class="lj-opsi-text">' + escapeHtml(opt.teks) + '</span>' +
                        '</div>';
                });
            }
            html += '<div class="lj-jawaban-pilihan">' +
                '<strong>📌 Pilihan Mahasiswa:</strong> <span class="lj-pilihan-mhs">' +
                (j.pilihan && j.pilihan.length ? j.pilihan.join(', ') : '(Tidak memilih)') +
                '</span></div>';
            if (j.butuhAlasan) {
                html += '<div class="lj-alasan-area">' +
                    '<div class="lj-alasan-label">📝 Alasan / Penjelasan:</div>' +
                    '<div class="lj-jawaban-text">' + (escapeHtml(j.alasan) || '<em style="color:#999;">(Tidak diisi)</em>') + '</div>' +
                    '</div>';
            }
            html += '</div>';
        } else {
            html += '<div class="lj-jawaban-area">' +
                '<div class="lj-jawaban-label">JAWABAN:</div>' +
                '<div class="lj-jawaban-text">' + (escapeHtml(j.jawaban) || '<em style="color:#999;">(Tidak dijawab)</em>') + '</div>' +
                '</div>';
        }
        html += '</div>';
    });

    html += '</div>' +
        '<div class="lj-nilai-box">' +
        '<h3>LEMBAR PENILAIAN DOSEN</h3>' +
        '<table class="lj-nilai-table">' +
        '<tr><th>No. Soal</th><th>Bobot</th><th>Nilai (Diisi Dosen)</th><th>Keterangan</th></tr>';
    jaw.jawaban.forEach((j, i) => {
        html += '<tr><td>' + (i + 1) + '</td><td>' + j.bobot + '</td><td class="lj-nilai-empty">................</td><td>&nbsp;</td></tr>';
    });
    html += '<tr class="lj-total-row"><td colspan="2"><strong>TOTAL NILAI</strong></td>' +
        '<td class="lj-nilai-total">' + (nilai ? nilai.nilai : '................') + '</td>' +
        '<td><strong>Grade: ' + (nilai ? nilai.grade : '......') + '</strong></td></tr>' +
        '</table></div>' +
        '<div class="lj-ttd-area">' +
        '<div class="lj-ttd-box"><p>Catatan Dosen:</p>' +
        '<div class="lj-catatan-box">' + (nilai && nilai.catatan ? escapeHtml(nilai.catatan) : '') + '</div>' +
        '</div>' +
        '<div class="lj-ttd-box lj-ttd-dosen">' +
        '<p>Cimahi, ' + formatDateLong(new Date().toISOString()) + '</p>' +
        '<p><strong>Dosen Pengampu,</strong></p>' +
        '<div class="lj-ttd-space"></div>' +
        '<p class="lj-ttd-name"><strong>' + escapeHtml(mk ? mk.dosen : '_____________________') + '</strong></p>' +
        '<p class="lj-ttd-line">_____________________________</p>' +
        '</div></div>' +
        '<div class="lj-footer">' +
        '<p>Dokumen dibuat otomatis oleh Sistem UTS Online STAI Al-Musdariyah</p>' +
        '<p>Dicetak: ' + formatDateLong(new Date().toISOString()) + ' ' + formatTimeOnly(new Date().toISOString()) + '</p>' +
        '</div></div>';
    return html;
}

function formatDateLong(iso) {
    if (!iso) return '-';
    let d = new Date(iso);
    let bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    let hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return hari[d.getDay()] + ', ' + d.getDate() + ' ' + bulan[d.getMonth()] + ' ' + d.getFullYear();
}

function formatTimeOnly(iso) {
    if (!iso) return '-';
    let d = new Date(iso);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ' WIB';
}

// ===== DOWNLOAD PDF =====
async function downloadJawabanPDF() {
    if (!currentViewJawaban) { alert('Tidak ada data!'); return; }
    let loading = showLoading('Membuat PDF...');
    try {
        let mk = DB.getMatkulById(currentViewJawaban.matkulId);
        let nilai = DB.getNilai().find(n => n.nim === currentViewJawaban.nim && n.matkulId === currentViewJawaban.matkulId);
        await generatePDFFromData(currentViewJawaban, mk, nilai);
        DB.addActivity('Download PDF: ' + currentViewJawaban.namaMhs);
    } catch (err) {
        console.error(err);
        alert('❌ Gagal: ' + err.message);
    } finally {
        hideLoading(loading);
    }
}

async function generatePDFFromData(jaw, mk, nilai) {
    if (!window.jspdf || !window.html2canvas) {
        throw new Error('Library jsPDF/html2canvas belum dimuat. Refresh halaman.');
    }
    let jsPDF = window.jspdf.jsPDF;
    let temp = document.createElement('div');
    temp.style.position = 'absolute';
    temp.style.left = '-99999px';
    temp.style.top = '0';
    temp.style.width = '210mm';
    temp.style.background = 'white';
    temp.innerHTML = generateJawabanHTML(jaw, mk, nilai);
    document.body.appendChild(temp);

    try {
        let element = temp.querySelector('.lembar-jawaban');
        let canvas = await html2canvas(element, {
            scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff'
        });
        let imgData = canvas.toDataURL('image/png');
        let pdf = new jsPDF('p', 'mm', 'a4');
        let pdfWidth = pdf.internal.pageSize.getWidth();
        let pdfHeight = pdf.internal.pageSize.getHeight();
        let imgWidth = pdfWidth;
        let imgHeight = (canvas.height * pdfWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
        }
        let mkSafe = (mk ? mk.nama : 'Matkul').replace(/[^a-zA-Z0-9]/g, '_');
        let nameSafe = jaw.namaMhs.replace(/[^a-zA-Z0-9]/g, '_');
        pdf.save('UTS_' + jaw.nim + '_' + nameSafe + '_' + mkSafe + '.pdf');
    } finally {
        document.body.removeChild(temp);
    }
}

async function downloadAllPDF() {
    let mk = document.getElementById('filter-matkul-hasil').value;
    let sem = document.getElementById('filter-semester-hasil').value;
    let jawaban = DB.getJawaban().filter(j => (!mk || j.matkulId === mk) && (!sem || j.semester === sem));
    if (jawaban.length === 0) { alert('Tidak ada jawaban!'); return; }
    if (!confirm('Download ' + jawaban.length + ' lembar PDF?\n\nProses ini memakan waktu.')) return;

    let loading = showLoading('Membuat PDF... 0/' + jawaban.length);
    let success = 0;
    for (let i = 0; i < jawaban.length; i++) {
        try {
            updateLoadingMsg(loading, 'Memproses... (' + (i + 1) + '/' + jawaban.length + ')');
            let mk2 = DB.getMatkulById(jawaban[i].matkulId);
            let nilai = DB.getNilai().find(n => n.nim === jawaban[i].nim && n.matkulId === jawaban[i].matkulId);
            await generatePDFFromData(jawaban[i], mk2, nilai);
            success++;
            await sleep(500);
        } catch (err) { console.error(err); }
    }
    hideLoading(loading);
    DB.addActivity('Download ' + success + ' PDF');
    alert('✅ Selesai! ' + success + ' PDF berhasil di-download.');
}

async function downloadRekapNilai() {
    if (!window.jspdf) { alert('Library belum dimuat!'); return; }
    let mk = document.getElementById('filter-matkul-hasil').value;
    let sem = document.getElementById('filter-semester-hasil').value;
    let jawaban = DB.getJawaban().filter(j => (!mk || j.matkulId === mk) && (!sem || j.semester === sem));
    if (jawaban.length === 0) { alert('Tidak ada data!'); return; }

    let loading = showLoading('Membuat Rekap PDF...');
    try {
        let jsPDF = window.jspdf.jsPDF;
        let pdf = new jsPDF('p', 'mm', 'a4');
        let nilaiAll = DB.getNilai();

        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'bold');
        pdf.text('SEKOLAH TINGGI AGAMA ISLAM AL-MUSDARIYAH', 105, 15, { align: 'center' });
        pdf.setFontSize(11);
        pdf.text('PROGRAM STUDI HUKUM EKONOMI SYARIAH', 105, 21, { align: 'center' });
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Jl. K.H. Usman Dhomiri No. 156, Cimahi Tengah - Jawa Barat', 105, 27, { align: 'center' });
        pdf.line(15, 31, 195, 31);

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('REKAP NILAI UJIAN TENGAH SEMESTER (UTS)', 105, 39, { align: 'center' });
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Tahun Akademik 2025 / 2026', 105, 45, { align: 'center' });

        let infoY = 54;
        if (mk) {
            let mkObj = DB.getMatkulById(mk);
            pdf.setFontSize(10);
            pdf.text('Mata Kuliah : ' + mkObj.nama, 15, infoY);
            pdf.text('Dosen          : ' + mkObj.dosen, 15, infoY + 5);
            if (sem) pdf.text('Semester    : ' + sem, 15, infoY + 10);
            infoY += 15;
        } else {
            pdf.text('Mata Kuliah : SEMUA', 15, infoY);
            infoY += 8;
        }

        let startY = infoY + 5;
        pdf.setFillColor(26, 82, 118);
        pdf.rect(15, startY - 5, 180, 7, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('No', 18, startY);
        pdf.text('NIM', 28, startY);
        pdf.text('Nama', 60, startY);
        if (!mk) pdf.text('Mata Kuliah', 110, startY);
        pdf.text('Nilai', 160, startY);
        pdf.text('Grade', 175, startY);
        pdf.text('Status', 188, startY);

        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        let y = startY + 7;

        jawaban.forEach((j, i) => {
            if (y > 270) { pdf.addPage(); y = 20; }
            let mkObj = DB.getMatkulById(j.matkulId);
            let n = nilaiAll.find(x => x.nim === j.nim && x.matkulId === j.matkulId);
            pdf.text(String(i + 1), 18, y);
            pdf.text(j.nim, 28, y);
            pdf.text(truncate(j.namaMhs, 22), 60, y);
            if (!mk) pdf.text(truncate(mkObj ? mkObj.nama : '-', 22), 110, y);
            pdf.text(n ? String(n.nilai) : '-', 160, y);
            pdf.text(n ? n.grade : '-', 175, y);
            pdf.text(n ? n.status : 'Pending', 188, y);
            y += 6;
        });

        y += 15;
        if (y > 250) { pdf.addPage(); y = 30; }
        pdf.setFontSize(10);
        pdf.text('Cimahi, ' + formatDateLong(new Date().toISOString()), 130, y);
        pdf.text('Mengetahui,', 130, y + 6);
        pdf.text('Kaprodi HES,', 130, y + 12);
        pdf.text('_________________________', 130, y + 35);

        let now = new Date();
        let ds = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
        pdf.save('REKAP_NILAI_UTS_' + ds + '.pdf');
        DB.addActivity('Download rekap nilai PDF');
    } catch (err) {
        alert('❌ Gagal: ' + err.message);
    } finally {
        hideLoading(loading);
    }
}

function truncate(str, n) { return str.length > n ? str.substring(0, n - 1) + '…' : str; }

// ===== DOWNLOAD TXT =====
function downloadJawabanTXT(nim, matkulId) {
    let jaw = DB.getJawabanDetail(nim, matkulId);
    if (!jaw) return;
    let mk = DB.getMatkulById(matkulId);
    let t = '====================================================\n';
    t += '           LEMBAR JAWABAN UTS\n';
    t += '    STAI Al-Musdariyah Kota Cimahi\n';
    t += '   Program Studi Hukum Ekonomi Syariah\n';
    t += '        Tahun Akademik 2025-2026\n';
    t += '====================================================\n\n';
    t += 'Nama        : ' + jaw.namaMhs + '\n';
    t += 'NIM         : ' + jaw.nim + '\n';
    t += 'Mata Kuliah : ' + (mk ? mk.nama : jaw.matkulNama) + '\n';
    t += 'Dosen       : ' + (mk ? mk.dosen : '-') + '\n';
    t += 'Semester    : ' + jaw.semester + '\n';
    t += 'Submit      : ' + formatDateTime(jaw.submittedAt) + '\n\n';
    t += '====================================================\n\n';
    let lastCerita = null;
    jaw.jawaban.forEach((j, i) => {
        if (j.ceritaRef && j.ceritaRef !== lastCerita) {
            lastCerita = j.ceritaRef;
            t += '📖 CERITA/KASUS:\n' + j.ceritaRef + '\n\n';
        }
        if (!j.ceritaRef) lastCerita = null;
        t += 'SOAL ' + (i + 1) + ': (Bobot ' + j.bobot + ')\n' + j.pertanyaan + '\n\n';
        if (j.tipe === 'pilihan') {
            t += 'PILIHAN:\n';
            if (j.opsi) {
                j.opsi.forEach(opt => {
                    let mark = (j.pilihan && j.pilihan.indexOf(opt.label) !== -1) ? '[✓]' : '[ ]';
                    t += '  ' + mark + ' ' + opt.label + '. ' + opt.teks + '\n';
                });
            }
            t += '\nPILIHAN MAHASISWA: ' + (j.pilihan && j.pilihan.length ? j.pilihan.join(', ') : '(tidak memilih)') + '\n';
            if (j.butuhAlasan) t += '\nALASAN:\n' + (j.alasan || '(tidak diisi)') + '\n';
        } else {
            t += 'JAWABAN:\n' + (j.jawaban || '(Tidak dijawab)') + '\n';
        }
        t += '\n----------------------------------------------------\n\n';
    });
    t += '\n====================================================\n            Tanda Tangan Dosen\n\n\n\n';
    t += '        _________________________\n        ' + (mk ? mk.dosen : '') + '\n====================================================\n';
    let blob = new Blob([t], { type: 'text/plain;charset=utf-8' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = 'Jawaban_UTS_' + nim + '_' + matkulId + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ===== PRINT =====
function printJawaban() {
    if (!currentViewJawaban) return;
    let mk = DB.getMatkulById(currentViewJawaban.matkulId);
    let nilai = DB.getNilai().find(n => n.nim === currentViewJawaban.nim && n.matkulId === currentViewJawaban.matkulId);
    let w = window.open('', '_blank', 'width=900,height=700');
    let printCSS = '<link rel="stylesheet" href="css/style.css"><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">';
    w.document.write('<html><head><title>UTS - ' + currentViewJawaban.namaMhs + '</title>' + printCSS + '<style>body{font-family:Times New Roman,serif;padding:0;margin:0;}</style></head><body>' + generateJawabanHTML(currentViewJawaban, mk, nilai) + '<script>setTimeout(function(){window.print();},800);</script></body></html>');
    w.document.close();
}

// ===== INPUT NILAI =====
function loadNilaiMatkul() {
    let matkulId = document.getElementById('filter-matkul-nilai').value;
    let tb = document.getElementById('tbody-nilai');
    if (!matkulId) { tb.innerHTML = '<tr><td colspan="8" class="empty-state">Pilih mata kuliah</td></tr>'; return; }
    let mk = DB.getMatkulById(matkulId);
    let jaw = DB.getJawabanByMatkul(matkulId);
    let nilaiAll = DB.getNilai();
    if (!jaw.length) { tb.innerHTML = '<tr><td colspan="8" class="empty-state">Belum ada jawaban</td></tr>'; return; }
    tb.innerHTML = jaw.map((j, i) => {
        let n = nilaiAll.find(x => x.nim === j.nim && x.matkulId === matkulId);
        let nv = n ? n.nilai : '', g = n ? n.grade : '-', s = n ? n.status : 'Belum Dinilai';
        let sc = !n ? 'status-pending' : (n.status === 'Lulus' ? 'status-lulus' : 'status-remedial');
        let gc = n ? 'grade-' + n.grade : '';
        return '<tr><td>' + (i + 1) + '</td><td><strong>' + escapeHtml(j.nim) + '</strong></td>' +
            '<td>' + escapeHtml(j.namaMhs) + '</td><td>' + escapeHtml(mk.nama) + '</td>' +
            '<td><input type="number" class="nilai-input" data-nim="' + j.nim + '" data-matkul="' + matkulId + '" value="' + nv + '" min="0" max="100" style="width:70px;padding:5px;border:1px solid #ddd;border-radius:4px;"></td>' +
            '<td><span class="grade-badge ' + gc + '">' + g + '</span></td>' +
            '<td><span class="status-badge ' + sc + '">' + s + '</span></td>' +
            '<td style="white-space:nowrap;">' +
            '<button class="btn-small btn-view" onclick="viewJawaban(\'' + j.nim + '\',\'' + matkulId + '\')"><i class="fas fa-eye"></i></button>' +
            (n ? '<button class="btn-small btn-delete" onclick="deleteNilaiRow(\'' + j.nim + '\',\'' + matkulId + '\')"><i class="fas fa-trash"></i></button>' : '') +
            '</td></tr>';
    }).join('');
}

function saveAllNilai() {
    let inputs = document.querySelectorAll('.nilai-input');
    let count = 0;
    inputs.forEach(inp => {
        if (inp.value.trim() !== '') {
            DB.setNilai(inp.dataset.nim, inp.dataset.matkul, parseInt(inp.value), '');
            count++;
        }
    });
    if (count > 0) {
        DB.addActivity('Admin input ' + count + ' nilai');
        loadNilaiMatkul();
        alert('✅ ' + count + ' nilai disimpan!');
    } else { alert('Tidak ada nilai diinput!'); }
}

function deleteNilaiRow(nim, matkulId) {
    let m = DB.findMahasiswa(nim);
    if (!confirm('Hapus nilai ' + (m ? m.nama : nim) + '?')) return;
    DB.deleteNilai(nim, matkulId);
    DB.addActivity('Hapus nilai: ' + nim);
    loadNilaiMatkul();
    alert('✅ Dihapus!');
}

// ===== JADWAL =====
function loadJadwal() {
    let t5 = document.getElementById('jadwal-sem5');
    if (t5) t5.innerHTML = MATA_KULIAH_DATA.semester5.map(mk =>
        '<tr><td>' + mk.no + '</td><td>' + escapeHtml(mk.nama) + '</td><td>' + mk.sks + '</td>' +
        '<td>' + escapeHtml(mk.dosen) + '</td><td>' + mk.noHp + '</td>' +
        '<td>' + mk.hari + '</td><td>' + mk.ke + '</td><td>' + mk.jam + '</td></tr>'
    ).join('');
    let t7 = document.getElementById('jadwal-sem7');
    if (t7) t7.innerHTML = MATA_KULIAH_DATA.semester7.map(mk =>
        '<tr><td>' + mk.no + '</td><td>' + escapeHtml(mk.nama) + '</td><td>' + mk.sks + '</td>' +
        '<td>' + escapeHtml(mk.dosen) + '</td><td>' + mk.noHp + '</td>' +
        '<td>' + mk.hari + '</td><td>' + mk.ke + '</td><td>' + mk.jam + '</td></tr>'
    ).join('');
}

// ========================================
// ===== TOOLS FUNCTIONS =====
// ========================================
function loadToolsSelects() {
    let opt = '<option value="">-- Pilih Mata Kuliah --</option><optgroup label="Semester 5">';
    MATA_KULIAH_DATA.semester5.forEach(mk => { opt += '<option value="' + mk.id + '">' + mk.nama + '</option>'; });
    opt += '</optgroup><optgroup label="Semester 7">';
    MATA_KULIAH_DATA.semester7.forEach(mk => { opt += '<option value="' + mk.id + '">' + mk.nama + '</option>'; });
    opt += '</optgroup>';
    ['tool-select-matkul-soal', 'tool-select-matkul-jawaban', 'tool-select-matkul-nilai'].forEach(id => {
        let e = document.getElementById(id);
        if (e) e.innerHTML = opt;
    });
}

function toolDeleteSoal() {
    let sel = document.getElementById('tool-select-matkul-soal');
    if (!sel.value) { alert('Pilih matkul!'); return; }
    let mk = DB.getMatkulById(sel.value);
    let soal = DB.getSoalMatkul(sel.value);
    if (!soal) { alert('Belum ada soal!'); return; }
    if (!confirm('⚠️ Hapus soal "' + mk.nama + '"?')) return;
    DB.deleteSoalMatkul(sel.value);
    DB.addActivity('Hapus soal: ' + mk.nama);
    sel.value = '';
    loadDashboard();
    alert('✅ Dihapus!');
}

function toolDeleteJawabanMatkul() {
    let sel = document.getElementById('tool-select-matkul-jawaban');
    if (!sel.value) { alert('Pilih matkul!'); return; }
    let mk = DB.getMatkulById(sel.value);
    let jaw = DB.getJawabanByMatkul(sel.value);
    if (!jaw.length) { alert('Tidak ada jawaban!'); return; }
    if (!confirm('⚠️ Hapus ' + jaw.length + ' jawaban "' + mk.nama + '"? Nilai juga dihapus.')) return;
    let c = DB.deleteJawabanByMatkul(sel.value);
    DB.deleteNilaiByMatkul(sel.value);
    DB.addActivity('Hapus ' + c + ' jawaban: ' + mk.nama);
    sel.value = '';
    loadDashboard();
    alert('✅ ' + c + ' jawaban dihapus!');
}

function toolDeleteNilaiMatkul() {
    let sel = document.getElementById('tool-select-matkul-nilai');
    if (!sel.value) { alert('Pilih matkul!'); return; }
    let mk = DB.getMatkulById(sel.value);
    let n = DB.getNilaiByMatkul(sel.value);
    if (!n.length) { alert('Tidak ada nilai!'); return; }
    if (!confirm('⚠️ Hapus ' + n.length + ' nilai "' + mk.nama + '"?')) return;
    let c = DB.deleteNilaiByMatkul(sel.value);
    DB.addActivity('Hapus ' + c + ' nilai: ' + mk.nama);
    sel.value = '';
    alert('✅ ' + c + ' nilai dihapus!');
}

function toolDeleteMahasiswa() {
    let inp = document.getElementById('tool-input-nim');
    let nim = inp.value.trim();
    if (!nim) { alert('Masukkan NIM!'); return; }
    let m = DB.findMahasiswa(nim);
    if (!m) { alert('Tidak ditemukan!'); return; }
    if (!confirm('⚠️ Hapus ' + m.nama + ' (' + nim + ') + semua data?')) return;
    DB.deleteMahasiswaComplete(nim);
    DB.addActivity('Hapus mahasiswa: ' + m.nama + ' (' + nim + ')');
    inp.value = '';
    loadDashboard();
    alert('✅ Dihapus!');
}

function toolDeleteAllSoal() {
    let c = Object.keys(DB.getSoal()).length;
    if (!c) { alert('Kosong!'); return; }
    if (prompt('Ketik "HAPUS SEMUA SOAL":') !== 'HAPUS SEMUA SOAL') { alert('Batal.'); return; }
    DB.deleteAllSoal();
    DB.addActivity('⚠️ Hapus SEMUA soal');
    loadDashboard();
    alert('✅ Semua soal dihapus!');
}

function toolDeleteAllJawaban() {
    let c = DB.getJawaban().length;
    if (!c) { alert('Kosong!'); return; }
    if (prompt('Ketik "HAPUS SEMUA JAWABAN":') !== 'HAPUS SEMUA JAWABAN') { alert('Batal.'); return; }
    DB.deleteAllJawaban();
    DB.deleteAllNilai();
    DB.addActivity('⚠️ Hapus SEMUA jawaban');
    loadDashboard();
    alert('✅ Semua jawaban dihapus!');
}

function toolDeleteAllNilai() {
    let c = DB.getNilai().length;
    if (!c) { alert('Kosong!'); return; }
    if (prompt('Ketik "HAPUS SEMUA NILAI":') !== 'HAPUS SEMUA NILAI') { alert('Batal.'); return; }
    DB.deleteAllNilai();
    DB.addActivity('⚠️ Hapus SEMUA nilai');
    alert('✅ Semua nilai dihapus!');
}

function toolDeleteAllMahasiswa() {
    let c = DB.getMahasiswa().length;
    if (!c) { alert('Kosong!'); return; }
    if (prompt('Ketik "HAPUS SEMUA MAHASISWA":') !== 'HAPUS SEMUA MAHASISWA') { alert('Batal.'); return; }
    DB.deleteAllMahasiswa();
    DB.deleteAllJawaban();
    DB.deleteAllNilai();
    DB.addActivity('⚠️ Hapus SEMUA mahasiswa');
    loadDashboard();
    alert('✅ Semua dihapus!');
}

function toolClearActivity() {
    if (!confirm('Bersihkan log?')) return;
    DB.clearActivity();
    loadDashboard();
    alert('✅ Log dibersihkan!');
}

function toolResetAll() {
    if (prompt('Ketik "RESET TOTAL":') !== 'RESET TOTAL') { alert('Batal.'); return; }
    if (!confirm('⚠️ YAKIN RESET TOTAL?')) return;
    DB.resetAll();
    alert('✅ Reset! Reload...');
    setTimeout(() => location.reload(), 800);
}

function toolBackupAll() {
    let b = {
        version: '1.0', backupDate: new Date().toISOString(),
        institusi: 'STAI Al-Musdariyah',
        mahasiswa: DB.getMahasiswa(), soal: DB.getSoal(),
        jawaban: DB.getJawaban(), nilai: DB.getNilai(), activity: DB.getActivity()
    };
    let blob = new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    let d = new Date();
    let ds = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    a.href = url;
    a.download = 'BACKUP_UTS_' + ds + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    DB.addActivity('Backup downloaded');
    alert('✅ Backup downloaded!');
}

function toolRestoreBackup(e) {
    let f = e.target.files[0];
    if (!f) return;
    if (!confirm('⚠️ Timpa semua data?')) { e.target.value = ''; return; }
    let r = new FileReader();
    r.onload = function (ev) {
        try {
            let b = JSON.parse(ev.target.result);
            if (!b.version) throw new Error('File tidak valid!');
            localStorage.setItem('uts_mahasiswa', JSON.stringify(b.mahasiswa || []));
            localStorage.setItem('uts_soal', JSON.stringify(b.soal || {}));
            localStorage.setItem('uts_jawaban', JSON.stringify(b.jawaban || []));
            localStorage.setItem('uts_nilai', JSON.stringify(b.nilai || []));
            localStorage.setItem('uts_activity', JSON.stringify(b.activity || []));
            alert('✅ Restored!');
            setTimeout(() => location.reload(), 500);
        } catch (err) {
            alert('❌ Error: ' + err.message);
        }
    };
    r.readAsText(f);
    e.target.value = '';
}

// ===== LOADING HELPERS =====
function showLoading(msg) {
    let div = document.createElement('div');
    div.id = 'global-loading';
    div.innerHTML = '<div class="loading-overlay"><div class="loading-content"><div class="loading-spinner"></div><p id="loading-msg">' + (msg || 'Loading...') + '</p></div></div>';
    document.body.appendChild(div);
    return div;
}

function updateLoadingMsg(loadingEl, msg) {
    let p = loadingEl.querySelector('#loading-msg');
    if (p) p.textContent = msg;
}

function hideLoading(loadingEl) {
    if (loadingEl && loadingEl.parentNode) loadingEl.parentNode.removeChild(loadingEl);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
