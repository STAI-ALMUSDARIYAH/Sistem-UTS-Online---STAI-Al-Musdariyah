// ========================================
// ADMIN.JS - VERSI GOOGLE SHEETS CLOUD
// STAI Al-Musdariyah - UTS Online System
// ========================================

let currentViewJawaban = null;
let soalBuilderData = [];
let currentEditMode = null;
let currentEditMatkulId = null;

document.addEventListener('DOMContentLoaded', async function () {
    let session = checkAuth('admin');
    if (!session) return;
    
    showLoadingAdmin('Memuat data dari server...');
    await DB.syncFromCloud();
    hideLoadingAdmin();
    
    loadDashboard();
    loadJadwal();
    populateMatkulSelects();
});

// ===== LOADING INDICATOR =====
function showLoadingAdmin(msg) {
    let existing = document.getElementById('admin-loading');
    if (existing) existing.remove();
    let div = document.createElement('div');
    div.id = 'admin-loading';
    div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;';
    div.innerHTML = '<div style="background:white;padding:25px 40px;border-radius:12px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.3);">' +
        '<div style="width:40px;height:40px;border:4px solid #f3f3f3;border-top:4px solid #2e86c1;border-radius:50%;animation:adminSpin 1s linear infinite;margin:0 auto 12px;"></div>' +
        '<p style="margin:0;font-size:13px;color:#333;font-weight:500;">' + msg + '</p></div>';
    document.body.appendChild(div);
    if (!document.getElementById('admin-spinner-css')) {
        let s = document.createElement('style');
        s.id = 'admin-spinner-css';
        s.textContent = '@keyframes adminSpin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }';
        document.head.appendChild(s);
    }
}

function hideLoadingAdmin() {
    let el = document.getElementById('admin-loading');
    if (el) el.remove();
}

// ===== NAVIGATION =====
async function showSection(section, btnEl) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    document.getElementById('section-' + section).classList.add('active');
    if (btnEl) btnEl.classList.add('active');
    
    switch (section) {
        case 'dashboard': 
            await DB.syncFromCloud();
            loadDashboard(); 
            break;
        case 'kelola-mahasiswa': 
            await DB.syncFromCloud();
            loadMahasiswaTable(); 
            break;
        case 'kelola-matakuliah': 
            await DB.syncFromCloud();
            loadMatkulTable(5); 
            break;
        case 'hasil-ujian': 
            await DB.syncFromCloud();
            loadHasilUjian(); 
            break;
        case 'tools': 
            loadToolsSelects(); 
            break;
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

// ===== KELOLA MAHASISWA =====
function loadMahasiswaTable() { renderMahasiswaTable(DB.getMahasiswa()); }

function renderMahasiswaTable(data) {
    let tb = document.getElementById('tbody-mahasiswa');
    if (!data.length) {
        tb.innerHTML = '<tr><td colspan="7" class="empty-state">Belum ada data mahasiswa</td></tr>';
        return;
    }
    tb.innerHTML = data.map((m, i) =>
        '<tr><td>' + (i + 1) + '</td>' +
        '<td><strong>' + escapeHtml(m.nim) + '</strong></td>' +
        '<td>' + escapeHtml(m.nama) + '</td>' +
        '<td>Semester ' + m.semester + '</td>' +
        '<td>' + escapeHtml(m.kelas || 'RPL') + '</td>' +
        '<td><code>' + escapeHtml(m.password || '-') + '</code></td>' +
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
        (!q || String(m.nim).toLowerCase().includes(q) || m.nama.toLowerCase().includes(q))
    );
    renderMahasiswaTable(d);
}

function showAddMahasiswaModal() {
    document.getElementById('add-nim').value = '';
    document.getElementById('add-nama').value = '';
    let pwd = document.getElementById('add-password');
    if (pwd) pwd.value = '-';
    document.getElementById('add-semester').value = '5';
    document.getElementById('add-kelas').value = 'RPL';
    openModal('modal-add-mhs');
}

function showImportMahasiswaModal() {
    document.getElementById('import-data').value = '';
    openModal('modal-import-mhs');
}

async function addMahasiswa() {
    let nim = document.getElementById('add-nim').value.trim();
    let nama = document.getElementById('add-nama').value.trim();
    let semester = document.getElementById('add-semester').value;
    let kelas = document.getElementById('add-kelas').value.trim() || 'RPL';
    let pwdEl = document.getElementById('add-password');
    let password = pwdEl ? (pwdEl.value.trim() || '-') : '-';

    if (!nim || !nama) { alert('NIM dan Nama wajib diisi!'); return; }

    showLoadingAdmin('Menyimpan ke server...');
    let result = await DB.addMahasiswa({ nim, nama, semester, kelas, password });
    hideLoadingAdmin();

    if (result) {
        DB.addActivity('Admin menambahkan mahasiswa: ' + nama + ' (' + nim + ')');
        closeModal('modal-add-mhs');
        loadMahasiswaTable();
        loadDashboard();
        alert('✅ Mahasiswa berhasil ditambahkan ke server!\n\nNIM: ' + nim + '\nNama: ' + nama);
    } else {
        alert('❌ NIM sudah terdaftar!');
    }
}

async function importMahasiswa() {
    let raw = document.getElementById('import-data').value.trim();
    if (!raw) { alert('Data kosong!'); return; }
    let lines = raw.split('\n').filter(l => l.trim());
    
    showLoadingAdmin('Mengimport ' + lines.length + ' mahasiswa ke server...');
    
    let s = 0, f = 0;
    for (let line of lines) {
        let p = line.split('|').map(x => x.trim());
        if (p.length >= 3) {
            let kelas = p[3] || 'RPL';
            let pwd = p[4] || '-';
            let result = await DB.addMahasiswa({
                nim: p[0], nama: p[1], semester: p[2],
                kelas: kelas, password: pwd
            });
            if (result) s++; else f++;
        } else f++;
    }
    
    hideLoadingAdmin();
    DB.addActivity('Admin import: ' + s + ' berhasil, ' + f + ' gagal');
    closeModal('modal-import-mhs');
    loadMahasiswaTable();
    loadDashboard();
    alert('Import selesai!\n✅ Berhasil: ' + s + '\n❌ Gagal/Duplikat: ' + f);
}

async function editMahasiswa(nim) {
    let m = DB.findMahasiswa(nim);
    if (!m) return;
    let nn = prompt('Nama:', m.nama); if (nn === null) return;
    let ns = prompt('Semester (5/7):', m.semester); if (ns === null) return;
    let nk = prompt('Kelas:', m.kelas || 'RPL'); if (nk === null) return;
    
    showLoadingAdmin('Update ke server...');
    await DB.updateMahasiswa(nim, {
        nama: nn || m.nama,
        semester: ns || m.semester,
        kelas: nk || m.kelas
    });
    hideLoadingAdmin();
    
    DB.addActivity('Edit mahasiswa: ' + nim);
    loadMahasiswaTable();
    alert('✅ Diupdate!');
}

async function deleteMahasiswaRow(nim) {
    let m = DB.findMahasiswa(nim);
    if (!m) return;
    let j = DB.getJawabanByNim(nim), n = DB.getNilaiByNim(nim);
    if (!confirm('⚠️ HAPUS?\n' + m.nama + '\n\n- ' + j.length + ' jawaban\n- ' + n.length + ' nilai\n\nLanjutkan?')) return;
    
    showLoadingAdmin('Menghapus dari server...');
    await DB.deleteMahasiswaComplete(nim);
    hideLoadingAdmin();
    
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
// ===== KELOLA SOAL - MODE SELECTION =====
// ========================================

async function loadSoalMatkul() {
    let matkulId = document.getElementById('select-matkul-soal').value;
    hideAllEditors();
    if (!matkulId) return;

    currentEditMatkulId = matkulId;
    let mk = DB.getMatkulById(matkulId);
    
    showLoadingAdmin('Memuat soal dari server...');
    await DB.syncFromCloud();
    hideLoadingAdmin();
    
    let existing = DB.getSoalMatkul(matkulId);

    ['soal-matkul-name', 'kertas-matkul-name', 'gform-matkul-name'].forEach(id => {
        let el = document.getElementById(id);
        if (el) el.textContent = mk.nama;
    });
    ['soal-dosen-name', 'kertas-dosen-name', 'gform-dosen-name'].forEach(id => {
        let el = document.getElementById(id);
        if (el) el.textContent = 'Dosen: ' + mk.dosen;
    });

    if (existing && existing.mode) {
        showEditorByMode(existing.mode, existing);
    } else if (existing && existing.soal) {
        showEditorByMode('online', existing);
    } else {
        let modeArea = document.getElementById('mode-select-area');
        if (modeArea) modeArea.style.display = 'block';
        else showEditorByMode('online', null);
    }
}

function hideAllEditors() {
    let modeArea = document.getElementById('mode-select-area');
    if (modeArea) modeArea.style.display = 'none';
    document.getElementById('soal-editor').style.display = 'none';
    let kertas = document.getElementById('kertas-editor');
    if (kertas) kertas.style.display = 'none';
    let gform = document.getElementById('gform-editor');
    if (gform) gform.style.display = 'none';
}

function setMode(mode) {
    hideAllEditors();
    currentEditMode = mode;
    let existing = DB.getSoalMatkul(currentEditMatkulId);
    showEditorByMode(mode, existing);
}

async function changeMode() {
    if (!confirm('⚠️ Ganti mode ujian?\n\nJika soal sudah ada, data soal AKAN DIHAPUS untuk mata kuliah ini.\n\nLanjutkan?')) return;
    showLoadingAdmin('Menghapus soal lama...');
    await DB.deleteSoalMatkul(currentEditMatkulId);
    hideLoadingAdmin();
    soalBuilderData = [];
    hideAllEditors();
    let modeArea = document.getElementById('mode-select-area');
    if (modeArea) modeArea.style.display = 'block';
}

function showEditorByMode(mode, existing) {
    currentEditMode = mode;
    let mk = DB.getMatkulById(currentEditMatkulId);

    if (mode === 'online') {
        document.getElementById('soal-editor').style.display = 'block';
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
    } else if (mode === 'kertas') {
        let kertas = document.getElementById('kertas-editor');
        if (kertas) {
            kertas.style.display = 'block';
            if (existing && existing.mode === 'kertas') {
                document.getElementById('kertas-petunjuk').value = existing.petunjuk || '';
                document.getElementById('kertas-soal-text').value = existing.soalText || '';
                document.getElementById('kertas-durasi').value = existing.durasi || 90;
                document.getElementById('kertas-waktu').value = existing.waktuUjian || '';
                document.getElementById('kertas-max-foto').value = existing.maxFoto || 5;
            } else {
                document.getElementById('kertas-petunjuk').value = 'Kerjakan soal berikut di kertas polio. Tulis Nama, NIM, dan Mata Kuliah di bagian atas. Foto jawaban Anda lalu upload melalui sistem ini.';
                document.getElementById('kertas-soal-text').value = '';
                document.getElementById('kertas-durasi').value = 90;
                document.getElementById('kertas-waktu').value = '';
                document.getElementById('kertas-max-foto').value = 5;
            }
        }
    } else if (mode === 'gform') {
        let gform = document.getElementById('gform-editor');
        if (gform) {
            gform.style.display = 'block';
            if (existing && existing.mode === 'gform') {
                document.getElementById('gform-link').value = existing.gformLink || '';
                document.getElementById('gform-petunjuk').value = existing.petunjuk || '';
                document.getElementById('gform-durasi').value = existing.durasi || 90;
                document.getElementById('gform-waktu').value = existing.waktuUjian || '';
                updateGFormPreview();
            } else {
                document.getElementById('gform-link').value = '';
                document.getElementById('gform-petunjuk').value = 'Klik tombol "Buka Google Form" lalu jawab semua pertanyaan. Pastikan klik Submit setelah selesai.';
                document.getElementById('gform-durasi').value = 90;
                document.getElementById('gform-waktu').value = '';
            }
            let linkEl = document.getElementById('gform-link');
            if (linkEl) linkEl.addEventListener('input', updateGFormPreview);
        }
    }
}

function updateGFormPreview() {
    let link = document.getElementById('gform-link').value.trim();
    let preview = document.getElementById('gform-preview-link');
    if (preview) {
        if (link) {
            preview.href = link;
            preview.textContent = link;
            preview.style.color = '#27ae60';
        } else {
            preview.href = '#';
            preview.textContent = 'Belum ada link';
            preview.style.color = '#999';
        }
    }
}

// ===== SOAL BUILDER (MODE ONLINE) =====
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
        '<button class="btn-small btn-edit" onclick="moveBlock(' + blockIdx + ',-1)"><i class="fas fa-arrow-up"></i></button>' +
        '<button class="btn-small btn-edit" onclick="moveBlock(' + blockIdx + ',1)"><i class="fas fa-arrow-down"></i></button>' +
        '<button class="btn-small btn-delete" onclick="removeBlock(' + blockIdx + ')"><i class="fas fa-trash"></i></button>' +
        '</div></div>' +
        '<div class="soal-block-body">' +
        '<div class="form-group"><label>Pertanyaan</label>' +
        '<textarea rows="4" placeholder="Tuliskan pertanyaan..." onchange="updateBiasa(' + blockIdx + ',\'pertanyaan\',this.value)">' + escapeHtml(block.pertanyaan || '') + '</textarea></div>' +
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
        '<textarea rows="3" onchange="updatePilihan(' + blockIdx + ',\'pertanyaan\',this.value)">' + escapeHtml(block.pertanyaan || '') + '</textarea></div>' +
        '<div class="form-row">' +
        '<div class="form-group"><label>Mode Pilihan</label>' +
        '<select onchange="updatePilihan(' + blockIdx + ',\'modePilihan\',this.value)">' +
        '<option value="single"' + (block.modePilihan === 'single' ? ' selected' : '') + '>Pilih SATU (Radio)</option>' +
        '<option value="multi"' + (block.modePilihan === 'multi' ? ' selected' : '') + '>Pilih BEBERAPA (Checkbox)</option>' +
        '</select></div>' +
        '<div class="form-group"><label>Bobot</label>' +
        '<input type="number" value="' + (block.bobot || 10) + '" min="1" max="100" onchange="updatePilihan(' + blockIdx + ',\'bobot\',this.value)"></div>' +
        '<div class="form-group"><label>Wajib Alasan?</label>' +
        '<select onchange="updatePilihan(' + blockIdx + ',\'butuhAlasan\',this.value === \'true\')">' +
        '<option value="true"' + (block.butuhAlasan ? ' selected' : '') + '>Ya, Wajib</option>' +
        '<option value="false"' + (!block.butuhAlasan ? ' selected' : '') + '>Tidak Perlu</option>' +
        '</select></div></div>' +
        '<div class="opsi-container">' +
        '<div class="opsi-header"><h4><i class="fas fa-list"></i> Daftar Pilihan</h4>' +
        '<button class="btn-primary btn-sm" onclick="addOpsi(' + blockIdx + ')"><i class="fas fa-plus"></i> Tambah</button></div>' +
        '<div class="opsi-list">' + (opsiHtml || '<p class="empty-state" style="padding:10px;font-size:11px;">Belum ada pilihan</p>') + '</div>' +
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
        '<div class="soal-block-badge badge-cerita"><i class="fas fa-book-open"></i> Soal Cerita — ' + rangeText + '</div>' +
        '<div class="soal-block-actions">' +
        '<button class="btn-small btn-edit" onclick="moveBlock(' + blockIdx + ',-1)"><i class="fas fa-arrow-up"></i></button>' +
        '<button class="btn-small btn-edit" onclick="moveBlock(' + blockIdx + ',1)"><i class="fas fa-arrow-down"></i></button>' +
        '<button class="btn-small btn-delete" onclick="removeBlock(' + blockIdx + ')"><i class="fas fa-trash"></i></button>' +
        '</div></div>' +
        '<div class="soal-block-body">' +
        '<div class="form-group"><label><i class="fas fa-book-reader"></i> Cerita / Narasi Kasus</label>' +
        '<textarea rows="6" class="cerita-textarea" onchange="updateCerita(' + blockIdx + ',this.value)">' + escapeHtml(block.cerita || '') + '</textarea></div>' +
        '<div class="sub-soal-container">' +
        '<div class="sub-soal-title"><h4><i class="fas fa-list-ol"></i> Pertanyaan:</h4>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
        '<button class="btn-primary btn-sm" onclick="addSubSoalEsai(' + blockIdx + ')"><i class="fas fa-plus"></i> Esai</button>' +
        '<button class="btn-pilihan btn-sm" onclick="addSubSoalPilihan(' + blockIdx + ')"><i class="fas fa-plus"></i> Pilihan</button>' +
        '</div></div>' +
        '<div class="sub-soal-list">' + (subHtml || '<p class="empty-state" style="padding:15px;">Klik tombol untuk tambah pertanyaan</p>') + '</div>' +
        '</div></div></div>';
}

function renderSubSoal(blockIdx, subIdx, subNo, sub) {
    let tipe = sub.tipe || 'esai';
    let header = '<div class="sub-soal-item">' +
        '<div class="sub-soal-header"><span class="sub-soal-number">Soal ' + subNo + '</span>' +
        '<div style="display:flex;gap:5px;">' +
        '<select onchange="changeSubSoalTipe(' + blockIdx + ',' + subIdx + ',this.value)" style="padding:5px;border-radius:5px;border:1px solid #ddd;font-size:12px;">' +
        '<option value="esai"' + (tipe === 'esai' ? ' selected' : '') + '>Esai</option>' +
        '<option value="pilihan"' + (tipe === 'pilihan' ? ' selected' : '') + '>Pilihan</option>' +
        '</select>' +
        '<button class="btn-small btn-delete" onclick="removeSubSoal(' + blockIdx + ',' + subIdx + ')"><i class="fas fa-times"></i></button>' +
        '</div></div>';

    if (tipe === 'pilihan') {
        let opsiHtml = '';
        if (sub.opsi) {
            sub.opsi.forEach((opt, oi) => {
                opsiHtml += '<div class="opsi-item">' +
                    '<div class="opsi-label">' + opt.label + '</div>' +
                    '<textarea rows="2" onchange="updateSubOpsi(' + blockIdx + ',' + subIdx + ',' + oi + ',this.value)">' + escapeHtml(opt.teks || '') + '</textarea>' +
                    '<button class="btn-small btn-delete" onclick="removeSubOpsi(' + blockIdx + ',' + subIdx + ',' + oi + ')"><i class="fas fa-times"></i></button>' +
                    '</div>';
            });
        }
        return header +
            '<div class="form-group"><label>Pertanyaan</label>' +
            '<textarea rows="3" onchange="updateSubSoal(' + blockIdx + ',' + subIdx + ',\'pertanyaan\',this.value)">' + escapeHtml(sub.pertanyaan || '') + '</textarea></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>Mode</label>' +
            '<select onchange="updateSubSoal(' + blockIdx + ',' + subIdx + ',\'modePilihan\',this.value)">' +
            '<option value="single"' + (sub.modePilihan === 'single' ? ' selected' : '') + '>Satu</option>' +
            '<option value="multi"' + (sub.modePilihan === 'multi' ? ' selected' : '') + '>Beberapa</option>' +
            '</select></div>' +
            '<div class="form-group"><label>Bobot</label>' +
            '<input type="number" value="' + (sub.bobot || 10) + '" min="1" max="100" onchange="updateSubSoal(' + blockIdx + ',' + subIdx + ',\'bobot\',this.value)"></div>' +
            '<div class="form-group"><label>Alasan?</label>' +
            '<select onchange="updateSubSoal(' + blockIdx + ',' + subIdx + ',\'butuhAlasan\',this.value === \'true\')">' +
            '<option value="true"' + (sub.butuhAlasan ? ' selected' : '') + '>Ya</option>' +
            '<option value="false"' + (!sub.butuhAlasan ? ' selected' : '') + '>Tidak</option>' +
            '</select></div></div>' +
            '<div class="opsi-container">' +
            '<div class="opsi-header"><h4>Pilihan</h4>' +
            '<button class="btn-primary btn-sm" onclick="addSubOpsi(' + blockIdx + ',' + subIdx + ')"><i class="fas fa-plus"></i> Tambah</button></div>' +
            '<div class="opsi-list">' + (opsiHtml || '<p class="empty-state" style="padding:8px;">Belum ada pilihan</p>') + '</div>' +
            '</div></div>';
    } else {
        return header +
            '<div class="form-group"><label>Pertanyaan</label>' +
            '<textarea rows="3" onchange="updateSubSoal(' + blockIdx + ',' + subIdx + ',\'pertanyaan\',this.value)">' + escapeHtml(sub.pertanyaan || '') + '</textarea></div>' +
            '<div class="form-group"><label>Bobot</label>' +
            '<input type="number" value="' + (sub.bobot || 10) + '" min="1" max="100" style="width:90px;" onchange="updateSubSoal(' + blockIdx + ',' + subIdx + ',\'bobot\',this.value)"></div>' +
            '</div>';
    }
}

// Update functions
function updateBiasa(idx, field, val) { if (field === 'bobot') val = parseInt(val) || 10; soalBuilderData[idx][field] = val; }
function updateCerita(idx, val) { soalBuilderData[idx].cerita = val; }
function updatePilihan(idx, field, val) {
    if (field === 'bobot') val = parseInt(val) || 10;
    soalBuilderData[idx][field] = val;
    if (field === 'butuhAlasan') renderSoalBuilder();
}
function updateOpsi(bi, oi, val) { if (soalBuilderData[bi].opsi && soalBuilderData[bi].opsi[oi]) soalBuilderData[bi].opsi[oi].teks = val; }
function addOpsi(bi) {
    if (!soalBuilderData[bi].opsi) soalBuilderData[bi].opsi = [];
    soalBuilderData[bi].opsi.push({ label: String.fromCharCode(65 + soalBuilderData[bi].opsi.length), teks: '' });
    renderSoalBuilder();
}
function removeOpsi(bi, oi) {
    if (!confirm('Hapus pilihan?')) return;
    soalBuilderData[bi].opsi.splice(oi, 1);
    soalBuilderData[bi].opsi.forEach((o, i) => { o.label = String.fromCharCode(65 + i); });
    renderSoalBuilder();
}
function updateSubSoal(bi, si, f, v) { if (f === 'bobot') v = parseInt(v) || 10; soalBuilderData[bi].subSoal[si][f] = v; }
function changeSubSoalTipe(bi, si, t) {
    let s = soalBuilderData[bi].subSoal[si];
    s.tipe = t;
    if (t === 'pilihan') {
        if (!s.opsi) s.opsi = [{ label: 'A', teks: '' }, { label: 'B', teks: '' }];
        if (s.modePilihan === undefined) s.modePilihan = 'single';
        if (s.butuhAlasan === undefined) s.butuhAlasan = true;
    }
    renderSoalBuilder();
}
function updateSubOpsi(bi, si, oi, v) { let s = soalBuilderData[bi].subSoal[si]; if (s.opsi && s.opsi[oi]) s.opsi[oi].teks = v; }
function addSubOpsi(bi, si) {
    let s = soalBuilderData[bi].subSoal[si];
    if (!s.opsi) s.opsi = [];
    s.opsi.push({ label: String.fromCharCode(65 + s.opsi.length), teks: '' });
    renderSoalBuilder();
}
function removeSubOpsi(bi, si, oi) {
    if (!confirm('Hapus?')) return;
    let s = soalBuilderData[bi].subSoal[si];
    s.opsi.splice(oi, 1);
    s.opsi.forEach((o, i) => { o.label = String.fromCharCode(65 + i); });
    renderSoalBuilder();
}
function addSubSoalEsai(bi) {
    if (!soalBuilderData[bi].subSoal) soalBuilderData[bi].subSoal = [];
    soalBuilderData[bi].subSoal.push({ tipe: 'esai', pertanyaan: '', bobot: 10 });
    renderSoalBuilder();
}
function addSubSoalPilihan(bi) {
    if (!soalBuilderData[bi].subSoal) soalBuilderData[bi].subSoal = [];
    soalBuilderData[bi].subSoal.push({
        tipe: 'pilihan', pertanyaan: '', bobot: 10,
        modePilihan: 'single', butuhAlasan: true,
        opsi: [{ label: 'A', teks: '' }, { label: 'B', teks: '' }]
    });
    renderSoalBuilder();
}
function removeSubSoal(bi, si) {
    if (!confirm('Hapus?')) return;
    soalBuilderData[bi].subSoal.splice(si, 1);
    renderSoalBuilder();
}
function removeBlock(bi) {
    let b = soalBuilderData[bi];
    let label = b.type === 'cerita' ? 'blok soal cerita' : 'soal ini';
    if (!confirm('Hapus ' + label + '?')) return;
    soalBuilderData.splice(bi, 1);
    renderSoalBuilder();
}
function moveBlock(idx, dir) {
    let n = idx + dir;
    if (n < 0 || n >= soalBuilderData.length) return;
    let t = soalBuilderData[idx];
    soalBuilderData[idx] = soalBuilderData[n];
    soalBuilderData[n] = t;
    renderSoalBuilder();
}

// ===== SAVE SOAL ONLINE =====
async function saveSoal() {
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
            flatSoal.push({ no: no, tipe: 'esai', pertanyaan: block.pertanyaan, bobot: block.bobot, ceritaRef: null });
        } else if (block.type === 'pilihan') {
            no++;
            flatSoal.push({
                no: no, tipe: 'pilihan', pertanyaan: block.pertanyaan, bobot: block.bobot,
                modePilihan: block.modePilihan, butuhAlasan: block.butuhAlasan,
                opsi: block.opsi, ceritaRef: null
            });
        } else if (block.type === 'cerita') {
            block.subSoal.forEach(sub => {
                no++;
                let item = { no: no, tipe: sub.tipe || 'esai', pertanyaan: sub.pertanyaan, bobot: sub.bobot, ceritaRef: block.cerita };
                if (sub.tipe === 'pilihan') {
                    item.modePilihan = sub.modePilihan;
                    item.butuhAlasan = sub.butuhAlasan;
                    item.opsi = sub.opsi;
                }
                flatSoal.push(item);
            });
        }
    });

    showLoadingAdmin('Menyimpan soal ke server...');
    await DB.setSoalMatkul(matkulId, {
        matkulId: matkulId, matkulNama: mk.nama, dosen: mk.dosen,
        mode: 'online',
        petunjuk: petunjuk, durasi: durasi, waktuUjian: waktuUjian,
        blocks: soalBuilderData, soal: flatSoal,
        createdAt: new Date().toISOString()
    });
    hideLoadingAdmin();

    DB.addActivity('Admin buat/update soal: ' + mk.nama + ' (' + totalSoal + ' soal)');
    alert('✅ Soal berhasil disimpan ke server!\n\nMata Kuliah: ' + mk.nama + '\nTotal Pertanyaan: ' + totalSoal + '\n\n📡 Mahasiswa di perangkat manapun sekarang bisa lihat soal ini.');
}

// ===== SAVE SOAL KERTAS =====
async function saveKertas() {
    let matkulId = currentEditMatkulId;
    if (!matkulId) { alert('Pilih mata kuliah!'); return; }
    let soalText = document.getElementById('kertas-soal-text').value.trim();
    if (!soalText) { alert('Tulis soal yang akan dikerjakan di kertas!'); return; }

    let mk = DB.getMatkulById(matkulId);
    let petunjuk = document.getElementById('kertas-petunjuk').value.trim();
    let durasi = parseInt(document.getElementById('kertas-durasi').value) || 90;
    let waktuUjian = document.getElementById('kertas-waktu').value;
    let maxFoto = parseInt(document.getElementById('kertas-max-foto').value) || 5;

    showLoadingAdmin('Menyimpan ke server...');
    await DB.setSoalMatkul(matkulId, {
        matkulId: matkulId, matkulNama: mk.nama, dosen: mk.dosen,
        mode: 'kertas',
        petunjuk: petunjuk, soalText: soalText,
        durasi: durasi, waktuUjian: waktuUjian, maxFoto: maxFoto,
        soal: [], blocks: [],
        createdAt: new Date().toISOString()
    });
    hideLoadingAdmin();

    DB.addActivity('Admin buat soal kertas: ' + mk.nama);
    alert('✅ Soal Kertas Polio berhasil disimpan ke server!\n\nMata Kuliah: ' + mk.nama);
}

// ===== SAVE GOOGLE FORM =====
async function saveGForm() {
    let matkulId = currentEditMatkulId;
    if (!matkulId) { alert('Pilih mata kuliah!'); return; }
    let gformLink = document.getElementById('gform-link').value.trim();
    if (!gformLink) { alert('Masukkan link Google Form!'); return; }
    if (!gformLink.startsWith('http')) { alert('Link harus dimulai dengan http:// atau https://'); return; }

    let mk = DB.getMatkulById(matkulId);
    let petunjuk = document.getElementById('gform-petunjuk').value.trim();
    let durasi = parseInt(document.getElementById('gform-durasi').value) || 90;
    let waktuUjian = document.getElementById('gform-waktu').value;

    showLoadingAdmin('Menyimpan ke server...');
    await DB.setSoalMatkul(matkulId, {
        matkulId: matkulId, matkulNama: mk.nama, dosen: mk.dosen,
        mode: 'gform', gformLink: gformLink,
        petunjuk: petunjuk, durasi: durasi, waktuUjian: waktuUjian,
        soal: [], blocks: [],
        createdAt: new Date().toISOString()
    });
    hideLoadingAdmin();

    DB.addActivity('Admin buat soal Google Form: ' + mk.nama);
    alert('✅ Google Form berhasil disimpan ke server!\n\nMata Kuliah: ' + mk.nama);
}

async function deleteSoalCurrent() {
    let matkulId = document.getElementById('select-matkul-soal').value || currentEditMatkulId;
    if (!matkulId) { alert('Pilih mata kuliah!'); return; }
    let mk = DB.getMatkulById(matkulId);
    let soal = DB.getSoalMatkul(matkulId);
    if (!soal) { alert('Belum ada soal!'); return; }
    if (!confirm('⚠️ Hapus semua soal "' + mk.nama + '" dari server?')) return;
    
    showLoadingAdmin('Menghapus dari server...');
    await DB.deleteSoalMatkul(matkulId);
    hideLoadingAdmin();
    
    DB.addActivity('Admin hapus soal: ' + mk.nama);
    soalBuilderData = [];
    hideAllEditors();
    document.getElementById('select-matkul-soal').value = '';
    loadDashboard();
    alert('✅ Soal dihapus dari server!');
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
        let n = DB.getNilai().find(x => String(x.nim) === String(j.nim) && x.matkulId === j.matkulId);
        let sc = n ? 'status-lulus' : 'status-submitted';
        let st = n ? 'Dinilai (' + n.nilai + ')' : 'Belum Dinilai';
        return '<tr><td>' + (i + 1) + '</td>' +
            '<td><strong>' + escapeHtml(j.nim) + '</strong></td>' +
            '<td>' + escapeHtml(j.namaMhs) + '</td>' +
            '<td>' + escapeHtml(mkN) + '</td>' +
            '<td>Sem ' + (j.semester || '-') + '</td>' +
            '<td>' + formatDateTime(j.submittedAt) + '</td>' +
            '<td><span class="status-badge ' + sc + '">' + st + '</span></td>' +
            '<td style="white-space:nowrap;">' +
            '<button class="btn-small btn-view" onclick="viewJawaban(\'' + j.nim + '\',\'' + j.matkulId + '\')"><i class="fas fa-eye"></i></button>' +
            '<button class="btn-small btn-delete" onclick="deleteJawabanRow(\'' + j.nim + '\',\'' + j.matkulId + '\')"><i class="fas fa-trash"></i></button>' +
            '</td></tr>';
    }).join('');
}

async function deleteJawabanRow(nim, matkulId) {
    let mk = DB.getMatkulById(matkulId), mhs = DB.findMahasiswa(nim);
    if (!confirm('⚠️ HAPUS JAWABAN?\n' + (mhs ? mhs.nama : nim) + ' - ' + (mk ? mk.nama : matkulId))) return;
    showLoadingAdmin('Menghapus...');
    await DB.deleteJawaban(nim, matkulId);
    await DB.deleteNilai(nim, matkulId);
    hideLoadingAdmin();
    DB.addActivity('Hapus jawaban: ' + (mhs ? mhs.nama : nim));
    loadHasilUjian();
    loadDashboard();
    alert('✅ Dihapus!');
}

function viewJawaban(nim, matkulId) {
    let jaw = DB.getJawabanDetail(nim, matkulId);
    if (!jaw) { alert('Tidak ditemukan!'); return; }
    currentViewJawaban = jaw;
    let mk = DB.getMatkulById(matkulId);
    let nilai = DB.getNilai().find(n => String(n.nim) === String(nim) && n.matkulId === matkulId);
    let content = document.getElementById('view-jawaban-content');

    let html = '<div style="background:white;padding:25px;border-radius:8px;">' +
        '<div style="background:#1a5276;color:white;padding:15px;border-radius:6px;margin-bottom:15px;text-align:center;">' +
        '<h3>LEMBAR JAWABAN UTS</h3><p>STAI Al-Musdariyah Kota Cimahi</p></div>' +
        '<div style="background:#f0f4ff;padding:12px;border-radius:6px;margin-bottom:15px;">' +
        '<p><strong>Nama:</strong> ' + escapeHtml(jaw.namaMhs) + '</p>' +
        '<p><strong>NIM:</strong> ' + jaw.nim + '</p>' +
        '<p><strong>Mata Kuliah:</strong> ' + (mk ? mk.nama : jaw.matkulNama) + '</p>' +
        '<p><strong>Dosen:</strong> ' + (mk ? mk.dosen : '-') + '</p>' +
        '<p><strong>Submit:</strong> ' + formatDateTime(jaw.submittedAt) + '</p>' +
        (jaw.mode ? '<p><strong>Mode:</strong> ' + jaw.mode + '</p>' : '') +
        '</div>';

    if (jaw.jawaban) {
        jaw.jawaban.forEach((j, i) => {
            html += '<div style="border:1px solid #ddd;border-radius:6px;padding:12px;margin-bottom:10px;">' +
                '<div style="font-weight:600;color:#1a5276;margin-bottom:8px;">Soal ' + (i + 1) + ': ' + escapeHtml(j.pertanyaan) + '</div>';
            
            if (j.tipe === 'foto' && j.fotoData) {
                html += '<img src="' + j.fotoData + '" style="max-width:100%;border:1px solid #ccc;border-radius:4px;">';
            } else if (j.tipe === 'pilihan') {
                if (j.opsi) {
                    j.opsi.forEach(opt => {
                        let isPicked = j.pilihan && j.pilihan.indexOf(opt.label) !== -1;
                        html += '<div style="padding:6px 10px;margin:3px 0;border-radius:4px;' + (isPicked ? 'background:#d4edda;font-weight:600;' : 'background:#f8f9fa;') + '">' +
                            (isPicked ? '☑' : '☐') + ' ' + opt.label + '. ' + escapeHtml(opt.teks) + '</div>';
                    });
                }
                html += '<div style="background:#cfe2ff;padding:8px;margin-top:8px;border-radius:4px;"><strong>Pilihan:</strong> ' +
                    (j.pilihan && j.pilihan.length ? j.pilihan.join(', ') : '(Tidak memilih)') + '</div>';
                if (j.alasan) {
                    html += '<div style="background:#fff8dc;padding:8px;margin-top:5px;border-radius:4px;"><strong>Alasan:</strong> ' + escapeHtml(j.alasan) + '</div>';
                }
            } else {
                html += '<div style="background:#fff;border:1px dashed #999;padding:10px;border-radius:4px;white-space:pre-wrap;">' +
                    (escapeHtml(j.jawaban) || '<em style="color:#999;">(Tidak dijawab)</em>') + '</div>';
            }
            html += '</div>';
        });
    }
    
    html += '</div>';
    content.innerHTML = html;
    openModal('modal-view-jawaban');
}

function downloadJawabanPDF() {
    if (!currentViewJawaban) return;
    alert('Fitur PDF: gunakan Print (Ctrl+P) lalu Save as PDF');
    printJawaban();
}

function downloadJawabanTXT(nim, matkulId) {
    nim = nim || (currentViewJawaban && currentViewJawaban.nim);
    matkulId = matkulId || (currentViewJawaban && currentViewJawaban.matkulId);
    if (!nim || !matkulId) return;
    
    let jaw = DB.getJawabanDetail(nim, matkulId);
    if (!jaw) return;
    let mk = DB.getMatkulById(matkulId);
    
    let t = '====================================================\n';
    t += '         LEMBAR JAWABAN UTS\n';
    t += '   STAI Al-Musdariyah Kota Cimahi\n';
    t += '====================================================\n\n';
    t += 'Nama  : ' + jaw.namaMhs + '\n';
    t += 'NIM   : ' + jaw.nim + '\n';
    t += 'MK    : ' + (mk ? mk.nama : jaw.matkulNama) + '\n';
    t += 'Submit: ' + formatDateTime(jaw.submittedAt) + '\n\n';
    
    if (jaw.jawaban) {
        jaw.jawaban.forEach((j, i) => {
            t += 'SOAL ' + (i + 1) + ': ' + j.pertanyaan + '\n';
            if (j.tipe === 'pilihan') {
                t += 'Pilihan: ' + (j.pilihan ? j.pilihan.join(',') : '-') + '\n';
                if (j.alasan) t += 'Alasan: ' + j.alasan + '\n';
            } else {
                t += 'JAWABAN: ' + (j.jawaban || '(kosong)') + '\n';
            }
            t += '\n----------------------\n\n';
        });
    }
    
    let blob = new Blob([t], { type: 'text/plain;charset=utf-8' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = 'Jawaban_' + nim + '_' + matkulId + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function printJawaban() {
    if (!currentViewJawaban) return;
    let content = document.getElementById('view-jawaban-content').innerHTML;
    let w = window.open('', '_blank', 'width=900,height=700');
    w.document.write('<html><head><title>UTS</title><style>body{font-family:Arial;padding:20px;}</style></head><body>' + content + '<script>setTimeout(()=>window.print(),500);</script></body></html>');
    w.document.close();
}

async function downloadAllPDF() {
    alert('Fitur dalam pengembangan. Gunakan tombol View per mahasiswa.');
}

async function downloadRekapNilai() {
    alert('Fitur dalam pengembangan.');
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
        let n = nilaiAll.find(x => String(x.nim) === String(j.nim) && x.matkulId === matkulId);
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

async function saveAllNilai() {
    let inputs = document.querySelectorAll('.nilai-input');
    let count = 0;
    let toSave = [];
    inputs.forEach(inp => {
        if (inp.value.trim() !== '') {
            toSave.push({ nim: inp.dataset.nim, matkul: inp.dataset.matkul, nilai: parseInt(inp.value) });
            count++;
        }
    });
    if (count === 0) { alert('Tidak ada nilai diinput!'); return; }
    
    showLoadingAdmin('Menyimpan ' + count + ' nilai ke server...');
    for (let item of toSave) {
        await DB.setNilai(item.nim, item.matkul, item.nilai, '');
    }
    hideLoadingAdmin();
    
    DB.addActivity('Admin input ' + count + ' nilai');
    loadNilaiMatkul();
    alert('✅ ' + count + ' nilai disimpan ke server!');
}

async function deleteNilaiRow(nim, matkulId) {
    let m = DB.findMahasiswa(nim);
    if (!confirm('Hapus nilai ' + (m ? m.nama : nim) + '?')) return;
    showLoadingAdmin('Menghapus...');
    await DB.deleteNilai(nim, matkulId);
    hideLoadingAdmin();
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

// ===== TOOLS =====
function loadToolsSelects() {
    let opt = '<option value="">-- Pilih --</option><optgroup label="Semester 5">';
    MATA_KULIAH_DATA.semester5.forEach(mk => { opt += '<option value="' + mk.id + '">' + mk.nama + '</option>'; });
    opt += '</optgroup><optgroup label="Semester 7">';
    MATA_KULIAH_DATA.semester7.forEach(mk => { opt += '<option value="' + mk.id + '">' + mk.nama + '</option>'; });
    opt += '</optgroup>';
    ['tool-select-matkul-soal', 'tool-select-matkul-jawaban', 'tool-select-matkul-nilai'].forEach(id => {
        let e = document.getElementById(id);
        if (e) e.innerHTML = opt;
    });
}

async function toolDeleteSoal() {
    let sel = document.getElementById('tool-select-matkul-soal');
    if (!sel.value) { alert('Pilih matkul!'); return; }
    let mk = DB.getMatkulById(sel.value);
    if (!DB.getSoalMatkul(sel.value)) { alert('Belum ada soal!'); return; }
    if (!confirm('⚠️ Hapus soal "' + mk.nama + '"?')) return;
    showLoadingAdmin('Menghapus...');
    await DB.deleteSoalMatkul(sel.value);
    hideLoadingAdmin();
    DB.addActivity('Hapus soal: ' + mk.nama);
    sel.value = '';
    loadDashboard();
    alert('✅ Dihapus!');
}

async function toolDeleteJawabanMatkul() {
    let sel = document.getElementById('tool-select-matkul-jawaban');
    if (!sel.value) { alert('Pilih matkul!'); return; }
    let mk = DB.getMatkulById(sel.value);
    let jaw = DB.getJawabanByMatkul(sel.value);
    if (!jaw.length) { alert('Tidak ada jawaban!'); return; }
    if (!confirm('⚠️ Hapus ' + jaw.length + ' jawaban?')) return;
    showLoadingAdmin('Menghapus...');
    let c = await DB.deleteJawabanByMatkul(sel.value);
    await DB.deleteNilaiByMatkul(sel.value);
    hideLoadingAdmin();
    DB.addActivity('Hapus ' + c + ' jawaban: ' + mk.nama);
    sel.value = '';
    loadDashboard();
    alert('✅ ' + c + ' jawaban dihapus!');
}

async function toolDeleteNilaiMatkul() {
    let sel = document.getElementById('tool-select-matkul-nilai');
    if (!sel.value) { alert('Pilih matkul!'); return; }
    let mk = DB.getMatkulById(sel.value);
    let n = DB.getNilaiByMatkul(sel.value);
    if (!n.length) { alert('Tidak ada nilai!'); return; }
    if (!confirm('⚠️ Hapus ' + n.length + ' nilai?')) return;
    showLoadingAdmin('Menghapus...');
    let c = await DB.deleteNilaiByMatkul(sel.value);
    hideLoadingAdmin();
    DB.addActivity('Hapus ' + c + ' nilai: ' + mk.nama);
    sel.value = '';
    alert('✅ ' + c + ' nilai dihapus!');
}

async function toolDeleteMahasiswa() {
    let inp = document.getElementById('tool-input-nim');
    let nim = inp.value.trim();
    if (!nim) { alert('Masukkan NIM!'); return; }
    let m = DB.findMahasiswa(nim);
    if (!m) { alert('Tidak ditemukan!'); return; }
    if (!confirm('⚠️ Hapus ' + m.nama + '?')) return;
    showLoadingAdmin('Menghapus...');
    await DB.deleteMahasiswaComplete(nim);
    hideLoadingAdmin();
    DB.addActivity('Hapus mahasiswa: ' + m.nama);
    inp.value = '';
    loadDashboard();
    alert('✅ Dihapus!');
}

async function toolDeleteAllSoal() {
    let c = Object.keys(DB.getSoal()).length;
    if (!c) { alert('Kosong!'); return; }
    if (prompt('Ketik "HAPUS SEMUA SOAL":') !== 'HAPUS SEMUA SOAL') { alert('Batal.'); return; }
    showLoadingAdmin('Menghapus semua soal...');
    await DB.deleteAllSoal();
    hideLoadingAdmin();
    DB.addActivity('Hapus SEMUA soal');
    loadDashboard();
    alert('✅ Dihapus!');
}

async function toolDeleteAllJawaban() {
    let c = DB.getJawaban().length;
    if (!c) { alert('Kosong!'); return; }
    if (prompt('Ketik "HAPUS SEMUA JAWABAN":') !== 'HAPUS SEMUA JAWABAN') { alert('Batal.'); return; }
    showLoadingAdmin('Menghapus...');
    await DB.deleteAllJawaban();
    await DB.deleteAllNilai();
    hideLoadingAdmin();
    DB.addActivity('Hapus SEMUA jawaban');
    loadDashboard();
    alert('✅ Dihapus!');
}

async function toolDeleteAllNilai() {
    let c = DB.getNilai().length;
    if (!c) { alert('Kosong!'); return; }
    if (prompt('Ketik "HAPUS SEMUA NILAI":') !== 'HAPUS SEMUA NILAI') { alert('Batal.'); return; }
    showLoadingAdmin('Menghapus...');
    await DB.deleteAllNilai();
    hideLoadingAdmin();
    DB.addActivity('Hapus SEMUA nilai');
    alert('✅ Dihapus!');
}

async function toolDeleteAllMahasiswa() {
    let c = DB.getMahasiswa().length;
    if (!c) { alert('Kosong!'); return; }
    if (prompt('Ketik "HAPUS SEMUA MAHASISWA":') !== 'HAPUS SEMUA MAHASISWA') { alert('Batal.'); return; }
    showLoadingAdmin('Menghapus semua...');
    await DB.deleteAllMahasiswa();
    await DB.deleteAllJawaban();
    await DB.deleteAllNilai();
    hideLoadingAdmin();
    DB.addActivity('Hapus SEMUA mahasiswa');
    loadDashboard();
    alert('✅ Dihapus!');
}

function toolClearActivity() {
    if (!confirm('Bersihkan log?')) return;
    DB.clearActivity();
    loadDashboard();
    alert('✅ Dibersihkan!');
}

async function toolResetAll() {
    if (prompt('Ketik "RESET TOTAL":') !== 'RESET TOTAL') { alert('Batal.'); return; }
    if (!confirm('⚠️ YAKIN RESET TOTAL?')) return;
    showLoadingAdmin('Reset semua data...');
    await DB.resetAll();
    hideLoadingAdmin();
    alert('✅ Reset!');
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

async function toolRestoreBackup(e) {
    let f = e.target.files[0];
    if (!f) return;
    if (!confirm('⚠️ Timpa semua data di server?')) { e.target.value = ''; return; }
    let r = new FileReader();
    r.onload = async function (ev) {
        try {
            let b = JSON.parse(ev.target.result);
            if (!b.version) throw new Error('File tidak valid!');
            
            showLoadingAdmin('Restore data ke server...');
            await DB.deleteAllMahasiswa();
            await DB.deleteAllSoal();
            await DB.deleteAllJawaban();
            await DB.deleteAllNilai();
            
            for (let m of (b.mahasiswa || [])) await DB.addMahasiswa(m);
            for (let mkId in (b.soal || {})) await DB.setSoalMatkul(mkId, b.soal[mkId]);
            for (let j of (b.jawaban || [])) await DB.addJawaban(j);
            for (let n of (b.nilai || [])) await DB.setNilai(n.nim, n.matkulId, n.nilai, n.catatan);
            hideLoadingAdmin();
            
            alert('✅ Restored!');
            setTimeout(() => location.reload(), 500);
        } catch (err) {
            hideLoadingAdmin();
            alert('❌ Error: ' + err.message);
        }
    };
    r.readAsText(f);
    e.target.value = '';
}
