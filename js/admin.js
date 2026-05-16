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

// ========================================
// ===== PDF DOWNLOAD - KERTAS POLIO =====
// Cover + Foto-foto jawaban (rapi & profesional)
// ========================================

// Override fungsi download PDF
function downloadJawabanPDF() {
    if (!currentViewJawaban) {
        alert('Tidak ada data jawaban!');
        return;
    }

    let jaw = currentViewJawaban;
    let mk = DB.getMatkulById(jaw.matkulId);
    let nilai = DB.getNilai().find(n => String(n.nim) === String(jaw.nim) && n.matkulId === jaw.matkulId);

    // Cek apakah ini mode kertas (foto) atau mode lain
    if (jaw.mode === 'kertas') {
        generatePDFKertas(jaw, mk, nilai);
    } else if (jaw.mode === 'gform') {
        generatePDFGForm(jaw, mk, nilai);
    } else {
        generatePDFOnline(jaw, mk, nilai);
    }
}

// Override download dari tombol di tabel
function downloadJawabanPDFById(nim, matkulId) {
    let jaw = DB.getJawabanDetail(nim, matkulId);
    if (!jaw) { alert('Tidak ditemukan!'); return; }
    let mk = DB.getMatkulById(matkulId);
    let nilai = DB.getNilai().find(n => String(n.nim) === String(nim) && n.matkulId === matkulId);

    if (jaw.mode === 'kertas') {
        generatePDFKertas(jaw, mk, nilai);
    } else if (jaw.mode === 'gform') {
        generatePDFGForm(jaw, mk, nilai);
    } else {
        generatePDFOnline(jaw, mk, nilai);
    }
}

// ========================================
// PDF KERTAS POLIO (Cover + Foto Full Page)
// ========================================
async function generatePDFKertas(jaw, mk, nilai) {
    if (!window.jspdf) {
        alert('❌ Library jsPDF belum dimuat. Refresh halaman lalu coba lagi.');
        return;
    }

    showLoadingAdmin('📄 Membuat PDF...');

    try {
        const { jsPDF } = window.jspdf;
        let pdf = new jsPDF('p', 'mm', 'a4');
        let pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
        let pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
        let margin = 15;

        // ===== HALAMAN 1: COVER =====
        let y = margin;

        // Header Border
        pdf.setDrawColor(26, 82, 118);
        pdf.setLineWidth(1);
        pdf.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);

        // Logo area (icon university - kita pakai text)
        y = margin + 15;
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(26, 82, 118);
        pdf.text('PROGRAM STUDI HUKUM EKONOMI SYARIAH', pageWidth / 2, y, { align: 'center' });

        y += 6;
        pdf.setFontSize(10);
        pdf.text('JURUSAN SYARIAH', pageWidth / 2, y, { align: 'center' });

        y += 6;
        pdf.setFontSize(13);
        pdf.text('SEKOLAH TINGGI AGAMA ISLAM AL-MUSDARIYAH', pageWidth / 2, y, { align: 'center' });

        y += 5;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(80, 80, 80);
        pdf.text('Jl. K.H. Usman Dhomiri No. 156, Cimahi Tengah - Kota Cimahi', pageWidth / 2, y, { align: 'center' });

        y += 4;
        pdf.text('Telp: (022) 6633113 | www.stai-almusdariyah.ac.id', pageWidth / 2, y, { align: 'center' });

        // Garis pemisah double
        y += 5;
        pdf.setDrawColor(26, 82, 118);
        pdf.setLineWidth(0.8);
        pdf.line(margin + 5, y, pageWidth - margin - 5, y);
        pdf.setLineWidth(0.3);
        pdf.line(margin + 5, y + 1.5, pageWidth - margin - 5, y + 1.5);

        // Title
        y += 18;
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('LEMBAR JAWABAN', pageWidth / 2, y, { align: 'center' });

        y += 8;
        pdf.text('UJIAN TENGAH SEMESTER (UTS)', pageWidth / 2, y, { align: 'center' });

        y += 7;
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'italic');
        pdf.text('Tahun Akademik 2025 / 2026', pageWidth / 2, y, { align: 'center' });

        // Mode Badge
        y += 12;
        pdf.setFillColor(230, 126, 34);
        pdf.roundedRect(pageWidth / 2 - 35, y - 5, 70, 8, 2, 2, 'F');
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text('📝 KERTAS POLIO (UPLOAD FOTO)', pageWidth / 2, y, { align: 'center' });

        // ===== INFO MAHASISWA TABLE =====
        y += 20;
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('IDENTITAS MAHASISWA', pageWidth / 2, y, { align: 'center' });

        y += 5;
        pdf.setDrawColor(26, 82, 118);
        pdf.line(pageWidth / 2 - 30, y, pageWidth / 2 + 30, y);

        y += 10;
        let labelX = margin + 10;
        let colonX = margin + 50;
        let valueX = margin + 55;
        let lineHeight = 9;

        pdf.setFontSize(10);
        let infoData = [
            ['Nama Mahasiswa', jaw.namaMhs || '-'],
            ['NIM', jaw.nim || '-'],
            ['Semester', jaw.semester ? 'Semester ' + jaw.semester : '-'],
            ['Kelas', 'RPL (Non Reguler)'],
            ['Mata Kuliah', mk ? mk.nama : (jaw.matkulNama || '-')],
            ['Dosen Pengampu', mk ? mk.dosen : '-'],
            ['Hari/Tanggal Submit', formatDateLongPDF(jaw.submittedAt)],
            ['Waktu Submit', formatTimeOnlyPDF(jaw.submittedAt)],
            ['Jumlah Halaman', (jaw.jawaban ? jaw.jawaban.length : 0) + ' foto']
        ];

        infoData.forEach(([label, value]) => {
            pdf.setFont('helvetica', 'bold');
            pdf.text(label, labelX, y);
            pdf.text(':', colonX, y);
            pdf.setFont('helvetica', 'normal');
            
            // Multi-line text untuk value yang panjang
            let lines = pdf.splitTextToSize(String(value), pageWidth - valueX - margin - 5);
            pdf.text(lines, valueX, y);
            y += lineHeight + (lines.length - 1) * 5;
        });

        // Box untuk nilai dosen
        y += 10;
        pdf.setDrawColor(26, 82, 118);
        pdf.setLineWidth(0.5);
        let nilaiBoxY = y;
        let nilaiBoxHeight = 35;
        pdf.rect(margin + 10, nilaiBoxY, pageWidth - 2 * margin - 20, nilaiBoxHeight);

        // Header nilai box
        pdf.setFillColor(26, 82, 118);
        pdf.rect(margin + 10, nilaiBoxY, pageWidth - 2 * margin - 20, 7, 'F');
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text('PENILAIAN DOSEN', pageWidth / 2, nilaiBoxY + 5, { align: 'center' });

        // Isi nilai box
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(10);
        let yNilai = nilaiBoxY + 14;
        pdf.setFont('helvetica', 'bold');
        pdf.text('Nilai Akhir UTS:', margin + 15, yNilai);
        pdf.setFont('helvetica', 'normal');
        pdf.text(': ' + (nilai ? nilai.nilai : '..............................'), margin + 65, yNilai);

        yNilai += 7;
        pdf.setFont('helvetica', 'bold');
        pdf.text('Grade:', margin + 15, yNilai);
        pdf.setFont('helvetica', 'normal');
        pdf.text(': ' + (nilai ? nilai.grade : '....'), margin + 65, yNilai);

        // Tanda Tangan area
        y = nilaiBoxY + nilaiBoxHeight + 15;
        if (y < pageHeight - 60) {
            let ttdX = pageWidth - margin - 70;
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text('Cimahi, ' + formatDateLongPDF(new Date().toISOString()), ttdX, y, { align: 'center' });
            
            y += 6;
            pdf.setFont('helvetica', 'bold');
            pdf.text('Dosen Pengampu,', ttdX, y, { align: 'center' });
            
            y += 25; // ruang ttd
            pdf.line(ttdX - 30, y, ttdX + 30, y);
            
            y += 5;
            pdf.setFont('helvetica', 'bold');
            let dosenName = mk ? mk.dosen : '_____________________';
            let dosenLines = pdf.splitTextToSize(dosenName, 70);
            pdf.text(dosenLines, ttdX, y, { align: 'center' });
        }

        // Footer halaman 1
        let footerY = pageHeight - margin - 5;
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(150, 150, 150);
        pdf.text('Sistem UTS Online STAI Al-Musdariyah | Halaman 1', pageWidth / 2, footerY, { align: 'center' });

        // ===== HALAMAN 2+: FOTO JAWABAN =====
        if (jaw.jawaban && jaw.jawaban.length > 0) {
            for (let i = 0; i < jaw.jawaban.length; i++) {
                let fotoItem = jaw.jawaban[i];
                if (!fotoItem.fotoData) continue;

                pdf.addPage();

                // Header tiap halaman foto
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(80, 80, 80);
                pdf.text(jaw.namaMhs + ' (' + jaw.nim + ')', margin, margin);
                pdf.text(mk ? mk.nama : jaw.matkulNama, pageWidth - margin, margin, { align: 'right' });

                // Garis bawah header
                pdf.setDrawColor(200, 200, 200);
                pdf.setLineWidth(0.3);
                pdf.line(margin, margin + 3, pageWidth - margin, margin + 3);

                // Title halaman foto
                pdf.setFontSize(11);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(26, 82, 118);
                pdf.text('LEMBAR JAWABAN - HALAMAN ' + (i + 1) + ' DARI ' + jaw.jawaban.length, 
                        pageWidth / 2, margin + 12, { align: 'center' });

                // Tampilkan foto - calculate size to fit
                try {
                    let imgY = margin + 18;
                    let availableWidth = pageWidth - 2 * margin;
                    let availableHeight = pageHeight - imgY - margin - 8; // sisain footer

                    // Get image dimensions
                    let imgProps = pdf.getImageProperties(fotoItem.fotoData);
                    let imgRatio = imgProps.width / imgProps.height;

                    let imgWidth, imgHeight;
                    
                    if (imgRatio > availableWidth / availableHeight) {
                        // Image lebih landscape, fit by width
                        imgWidth = availableWidth;
                        imgHeight = imgWidth / imgRatio;
                    } else {
                        // Image lebih portrait, fit by height
                        imgHeight = availableHeight;
                        imgWidth = imgHeight * imgRatio;
                    }

                    // Center the image
                    let imgX = (pageWidth - imgWidth) / 2;
                    let imgYCentered = imgY + (availableHeight - imgHeight) / 2;

                    // Border untuk foto
                    pdf.setDrawColor(150, 150, 150);
                    pdf.setLineWidth(0.5);
                    pdf.rect(imgX - 1, imgYCentered - 1, imgWidth + 2, imgHeight + 2);

                    // Insert image
                    pdf.addImage(fotoItem.fotoData, 'JPEG', imgX, imgYCentered, imgWidth, imgHeight);
                } catch (imgErr) {
                    console.error('Error inserting image:', imgErr);
                    pdf.setFontSize(10);
                    pdf.setTextColor(231, 76, 60);
                    pdf.text('❌ Gagal memuat foto halaman ' + (i + 1), pageWidth / 2, pageHeight / 2, { align: 'center' });
                }

                // Footer
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'italic');
                pdf.setTextColor(150, 150, 150);
                pdf.text('Halaman ' + (i + 2) + ' (Foto Jawaban ' + (i + 1) + '/' + jaw.jawaban.length + ')', 
                        pageWidth / 2, pageHeight - margin + 3, { align: 'center' });
            }
        }

        // ===== SAVE PDF =====
        let nameSafe = (jaw.namaMhs || 'Mahasiswa').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
        let mkSafe = (mk ? mk.nama : 'Matkul').replace(/[^a-zA-Z0-9]/g, '_');
        let filename = 'UTS_' + jaw.nim + '_' + nameSafe + '_' + mkSafe + '.pdf';

        pdf.save(filename);
        DB.addActivity('Download PDF UTS: ' + jaw.namaMhs + ' - ' + (mk ? mk.nama : ''));

        hideLoadingAdmin();
        setTimeout(() => {
            alert('✅ PDF berhasil di-download!\n\nFile: ' + filename);
        }, 300);

    } catch (err) {
        hideLoadingAdmin();
        console.error('PDF Error:', err);
        alert('❌ Gagal membuat PDF: ' + err.message);
    }
}

// ========================================
// PDF GOOGLE FORM
// ========================================
async function generatePDFGForm(jaw, mk, nilai) {
    if (!window.jspdf) { alert('Library belum dimuat'); return; }
    showLoadingAdmin('Membuat PDF...');

    try {
        const { jsPDF } = window.jspdf;
        let pdf = new jsPDF('p', 'mm', 'a4');
        let pageWidth = pdf.internal.pageSize.getWidth();
        let pageHeight = pdf.internal.pageSize.getHeight();
        let margin = 15;

        // Border halaman
        pdf.setDrawColor(26, 82, 118);
        pdf.setLineWidth(1);
        pdf.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);

        // Header
        let y = margin + 15;
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(26, 82, 118);
        pdf.text('PROGRAM STUDI HUKUM EKONOMI SYARIAH', pageWidth / 2, y, { align: 'center' });

        y += 6;
        pdf.text('JURUSAN SYARIAH', pageWidth / 2, y, { align: 'center' });

        y += 6;
        pdf.setFontSize(13);
        pdf.text('SEKOLAH TINGGI AGAMA ISLAM AL-MUSDARIYAH', pageWidth / 2, y, { align: 'center' });

        y += 5;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(80, 80, 80);
        pdf.text('Jl. K.H. Usman Dhomiri No. 156, Cimahi Tengah', pageWidth / 2, y, { align: 'center' });

        y += 5;
        pdf.setDrawColor(26, 82, 118);
        pdf.line(margin + 5, y, pageWidth - margin - 5, y);
        pdf.line(margin + 5, y + 1.5, pageWidth - margin - 5, y + 1.5);

        // Title
        y += 18;
        pdf.setFontSize(15);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('BUKTI PENGERJAAN UTS', pageWidth / 2, y, { align: 'center' });

        y += 7;
        pdf.text('VIA GOOGLE FORM', pageWidth / 2, y, { align: 'center' });

        y += 7;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        pdf.text('Tahun Akademik 2025 / 2026', pageWidth / 2, y, { align: 'center' });

        // Mode badge
        y += 12;
        pdf.setFillColor(39, 174, 96);
        pdf.roundedRect(pageWidth / 2 - 30, y - 5, 60, 8, 2, 2, 'F');
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text('📋 GOOGLE FORM', pageWidth / 2, y, { align: 'center' });

        // Identitas
        y += 18;
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('IDENTITAS MAHASISWA', pageWidth / 2, y, { align: 'center' });

        y += 5;
        pdf.line(pageWidth / 2 - 30, y, pageWidth / 2 + 30, y);

        y += 10;
        pdf.setFontSize(10);
        let infoData = [
            ['Nama', jaw.namaMhs],
            ['NIM', jaw.nim],
            ['Semester', 'Semester ' + jaw.semester],
            ['Mata Kuliah', mk ? mk.nama : jaw.matkulNama],
            ['Dosen', mk ? mk.dosen : '-'],
            ['Tanggal Akses', formatDateLongPDF(jaw.submittedAt)],
            ['Waktu Akses', formatTimeOnlyPDF(jaw.submittedAt)]
        ];
        infoData.forEach(([l, v]) => {
            pdf.setFont('helvetica', 'bold');
            pdf.text(l, margin + 10, y);
            pdf.text(':', margin + 50, y);
            pdf.setFont('helvetica', 'normal');
            pdf.text(String(v), margin + 55, y);
            y += 8;
        });

        // Info Google Form
        y += 8;
        pdf.setFillColor(213, 245, 227);
        pdf.roundedRect(margin + 10, y, pageWidth - 2 * margin - 20, 30, 2, 2, 'F');
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 132, 73);
        pdf.text('Mahasiswa telah membuka & mengerjakan Google Form pada:', pageWidth / 2, y + 8, { align: 'center' });
        pdf.setFontSize(11);
        pdf.text(formatDateLongPDF(jaw.submittedAt) + ' ' + formatTimeOnlyPDF(jaw.submittedAt), pageWidth / 2, y + 16, { align: 'center' });
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(80, 80, 80);
        pdf.text('Jawaban tersimpan di Google Form milik dosen.', pageWidth / 2, y + 23, { align: 'center' });

        // Nilai Box
        y += 40;
        pdf.setTextColor(0, 0, 0);
        pdf.setDrawColor(26, 82, 118);
        pdf.rect(margin + 10, y, pageWidth - 2 * margin - 20, 30);
        pdf.setFillColor(26, 82, 118);
        pdf.rect(margin + 10, y, pageWidth - 2 * margin - 20, 7, 'F');
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text('PENILAIAN DOSEN', pageWidth / 2, y + 5, { align: 'center' });
        
        pdf.setTextColor(0, 0, 0);
        pdf.text('Nilai:', margin + 15, y + 14);
        pdf.setFont('helvetica', 'normal');
        pdf.text(': ' + (nilai ? nilai.nilai : '...........'), margin + 50, y + 14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Grade:', margin + 15, y + 22);
        pdf.setFont('helvetica', 'normal');
        pdf.text(': ' + (nilai ? nilai.grade : '....'), margin + 50, y + 22);

        // TTD
        y += 45;
        let ttdX = pageWidth - margin - 70;
        pdf.setFontSize(10);
        pdf.text('Cimahi, ' + formatDateLongPDF(new Date().toISOString()), ttdX, y, { align: 'center' });
        y += 6;
        pdf.setFont('helvetica', 'bold');
        pdf.text('Dosen Pengampu,', ttdX, y, { align: 'center' });
        y += 25;
        pdf.line(ttdX - 30, y, ttdX + 30, y);
        y += 5;
        pdf.text(mk ? mk.dosen : '_____________________', ttdX, y, { align: 'center' });

        // Footer
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(150, 150, 150);
        pdf.text('Sistem UTS Online STAI Al-Musdariyah', pageWidth / 2, pageHeight - margin - 5, { align: 'center' });

        let nameSafe = (jaw.namaMhs || 'Mhs').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
        let mkSafe = (mk ? mk.nama : 'Matkul').replace(/[^a-zA-Z0-9]/g, '_');
        pdf.save('UTS_' + jaw.nim + '_' + nameSafe + '_' + mkSafe + '.pdf');
        
        hideLoadingAdmin();
        DB.addActivity('Download PDF: ' + jaw.namaMhs);
        alert('✅ PDF berhasil!');
    } catch (err) {
        hideLoadingAdmin();
        alert('❌ Error: ' + err.message);
    }
}

// ========================================
// PDF UJIAN ONLINE
// ========================================
async function generatePDFOnline(jaw, mk, nilai) {
    if (!window.jspdf) { alert('Library belum dimuat'); return; }
    showLoadingAdmin('Membuat PDF...');

    try {
        const { jsPDF } = window.jspdf;
        let pdf = new jsPDF('p', 'mm', 'a4');
        let pageWidth = pdf.internal.pageSize.getWidth();
        let pageHeight = pdf.internal.pageSize.getHeight();
        let margin = 15;
        let y = margin;

        // Header
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(26, 82, 118);
        pdf.text('PROGRAM STUDI HUKUM EKONOMI SYARIAH', pageWidth / 2, y + 5, { align: 'center' });
        pdf.text('SEKOLAH TINGGI AGAMA ISLAM AL-MUSDARIYAH', pageWidth / 2, y + 11, { align: 'center' });
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(80, 80, 80);
        pdf.text('Jl. K.H. Usman Dhomiri No. 156, Cimahi Tengah', pageWidth / 2, y + 16, { align: 'center' });

        y += 21;
        pdf.setDrawColor(26, 82, 118);
        pdf.setLineWidth(0.5);
        pdf.line(margin, y, pageWidth - margin, y);

        y += 8;
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'bold');
        pdf.text('LEMBAR JAWABAN UTS', pageWidth / 2, y, { align: 'center' });

        // Info
        y += 10;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Nama: ' + jaw.namaMhs + ' | NIM: ' + jaw.nim + ' | Semester: ' + jaw.semester, margin, y);
        y += 5;
        pdf.text('Mata Kuliah: ' + (mk ? mk.nama : jaw.matkulNama), margin, y);
        y += 5;
        pdf.text('Dosen: ' + (mk ? mk.dosen : '-') + ' | Submit: ' + formatDateLongPDF(jaw.submittedAt), margin, y);

        y += 8;
        pdf.line(margin, y, pageWidth - margin, y);

        // Soal & Jawaban
        if (jaw.jawaban) {
            jaw.jawaban.forEach((j, i) => {
                if (y > pageHeight - 30) { pdf.addPage(); y = margin; }

                y += 6;
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(10);
                pdf.setTextColor(26, 82, 118);
                pdf.text('Soal ' + (i + 1) + ' (Bobot: ' + (j.bobot || 10) + ')', margin, y);

                y += 5;
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(9);
                pdf.setTextColor(0, 0, 0);
                let qLines = pdf.splitTextToSize(j.pertanyaan || '', pageWidth - 2 * margin);
                qLines.forEach(line => {
                    if (y > pageHeight - 15) { pdf.addPage(); y = margin; }
                    pdf.text(line, margin, y);
                    y += 4.5;
                });

                y += 3;
                pdf.setFont('helvetica', 'bold');
                pdf.text('Jawaban:', margin, y);
                y += 4;
                pdf.setFont('helvetica', 'normal');

                let ansText = '';
                if (j.tipe === 'pilihan') {
                    ansText = 'Pilihan: ' + (j.pilihan ? j.pilihan.join(', ') : '-');
                    if (j.alasan) ansText += '\nAlasan: ' + j.alasan;
                } else {
                    ansText = j.jawaban || '(Tidak dijawab)';
                }
                let aLines = pdf.splitTextToSize(ansText, pageWidth - 2 * margin - 5);
                aLines.forEach(line => {
                    if (y > pageHeight - 15) { pdf.addPage(); y = margin; }
                    pdf.text(line, margin + 5, y);
                    y += 4.5;
                });

                y += 3;
                pdf.setDrawColor(220, 220, 220);
                pdf.line(margin, y, pageWidth - margin, y);
            });
        }

        // Nilai
        if (y > pageHeight - 50) { pdf.addPage(); y = margin; }
        y += 10;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text('Nilai: ' + (nilai ? nilai.nilai : '....') + ' | Grade: ' + (nilai ? nilai.grade : '....'), margin, y);

        y += 15;
        pdf.text('Cimahi, ' + formatDateLongPDF(new Date().toISOString()), pageWidth - margin - 70, y, { align: 'center' });
        y += 6;
        pdf.text('Dosen Pengampu,', pageWidth - margin - 70, y, { align: 'center' });
        y += 22;
        pdf.line(pageWidth - margin - 95, y, pageWidth - margin - 45, y);
        y += 5;
        pdf.text(mk ? mk.dosen : '____________', pageWidth - margin - 70, y, { align: 'center' });

        let nameSafe = (jaw.namaMhs || 'Mhs').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
        let mkSafe = (mk ? mk.nama : 'Matkul').replace(/[^a-zA-Z0-9]/g, '_');
        pdf.save('UTS_' + jaw.nim + '_' + nameSafe + '_' + mkSafe + '.pdf');
        
        hideLoadingAdmin();
        DB.addActivity('Download PDF: ' + jaw.namaMhs);
        alert('✅ PDF berhasil!');
    } catch (err) {
        hideLoadingAdmin();
        alert('❌ Error: ' + err.message);
    }
}

// ========================================
// HELPER FUNCTIONS
// ========================================
function formatDateLongPDF(iso) {
    if (!iso) return '-';
    let d = new Date(iso);
    let bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    let hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return hari[d.getDay()] + ', ' + d.getDate() + ' ' + bulan[d.getMonth()] + ' ' + d.getFullYear();
}

function formatTimeOnlyPDF(iso) {
    if (!iso) return '-';
    let d = new Date(iso);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ' WIB';
}

// ========================================
// DOWNLOAD ALL PDF (per matkul, dengan filter)
// ========================================
async function downloadAllPDF() {
    let mk = document.getElementById('filter-matkul-hasil').value;
    let sem = document.getElementById('filter-semester-hasil').value;
    let jawaban = DB.getJawaban().filter(j => (!mk || j.matkulId === mk) && (!sem || j.semester === sem));

    if (jawaban.length === 0) {
        alert('Tidak ada jawaban untuk di-download!');
        return;
    }

    if (!confirm('📥 Download ' + jawaban.length + ' file PDF?\n\nSetiap mahasiswa akan punya 1 file PDF.\nProses memakan waktu beberapa detik per file.\n\nLanjutkan?')) return;

    for (let i = 0; i < jawaban.length; i++) {
        let jaw = jawaban[i];
        let mkObj = DB.getMatkulById(jaw.matkulId);
        let nilai = DB.getNilai().find(n => String(n.nim) === String(jaw.nim) && n.matkulId === jaw.matkulId);

        showLoadingAdmin('Membuat PDF ' + (i + 1) + ' / ' + jawaban.length + '...\n' + jaw.namaMhs);

        try {
            if (jaw.mode === 'kertas') {
                await generatePDFKertas(jaw, mkObj, nilai);
            } else if (jaw.mode === 'gform') {
                await generatePDFGForm(jaw, mkObj, nilai);
            } else {
                await generatePDFOnline(jaw, mkObj, nilai);
            }
            await sleepAdmin(800); // delay biar gak overload
        } catch (err) {
            console.error('Failed for', jaw.namaMhs, err);
        }
    }

    hideLoadingAdmin();
    alert('✅ Selesai download ' + jawaban.length + ' PDF!');
}

function sleepAdmin(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// ========================================
// REKAP NILAI PDF
// ========================================
async function downloadRekapNilai() {
    if (!window.jspdf) { alert('Library belum dimuat!'); return; }
    let mk = document.getElementById('filter-matkul-hasil').value;
    let sem = document.getElementById('filter-semester-hasil').value;
    let jawaban = DB.getJawaban().filter(j => (!mk || j.matkulId === mk) && (!sem || j.semester === sem));
    if (jawaban.length === 0) { alert('Tidak ada data!'); return; }

    showLoadingAdmin('Membuat rekap nilai...');

    try {
        const { jsPDF } = window.jspdf;
        let pdf = new jsPDF('p', 'mm', 'a4');
        let nilaiAll = DB.getNilai();
        let pageWidth = pdf.internal.pageSize.getWidth();

        // Header
        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(26, 82, 118);
        pdf.text('STAI AL-MUSDARIYAH KOTA CIMAHI', pageWidth / 2, 15, { align: 'center' });
        pdf.setFontSize(11);
        pdf.text('PROGRAM STUDI HUKUM EKONOMI SYARIAH', pageWidth / 2, 21, { align: 'center' });
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(80, 80, 80);
        pdf.text('Jl. K.H. Usman Dhomiri No. 156, Cimahi Tengah', pageWidth / 2, 27, { align: 'center' });
        pdf.setDrawColor(26, 82, 118);
        pdf.line(15, 31, pageWidth - 15, 31);

        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('REKAP NILAI UJIAN TENGAH SEMESTER (UTS)', pageWidth / 2, 40, { align: 'center' });
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Tahun Akademik 2025 / 2026', pageWidth / 2, 46, { align: 'center' });

        let infoY = 54;
        if (mk) {
            let mkObj = DB.getMatkulById(mk);
            pdf.text('Mata Kuliah : ' + mkObj.nama, 15, infoY);
            pdf.text('Dosen          : ' + mkObj.dosen, 15, infoY + 5);
            infoY += 12;
        } else {
            pdf.text('Mata Kuliah : SEMUA MATA KULIAH', 15, infoY);
            infoY += 8;
        }

        // Header Tabel
        let startY = infoY + 5;
        pdf.setFillColor(26, 82, 118);
        pdf.rect(15, startY - 5, pageWidth - 30, 7, 'F');
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
            let n = nilaiAll.find(x => String(x.nim) === String(j.nim) && x.matkulId === j.matkulId);
            pdf.text(String(i + 1), 18, y);
            pdf.text(j.nim, 28, y);
            pdf.text(truncatePDF(j.namaMhs, 22), 60, y);
            if (!mk) pdf.text(truncatePDF(mkObj ? mkObj.nama : '-', 22), 110, y);
            pdf.text(n ? String(n.nilai) : '-', 160, y);
            pdf.text(n ? n.grade : '-', 175, y);
            pdf.text(n ? n.status : 'Pending', 188, y);
            y += 6;
        });

        y += 15;
        if (y > 250) { pdf.addPage(); y = 30; }
        pdf.text('Cimahi, ' + formatDateLongPDF(new Date().toISOString()), 130, y);
        pdf.text('Mengetahui,', 130, y + 6);
        pdf.text('Kaprodi HES,', 130, y + 12);
        pdf.text('_________________________', 130, y + 35);

        let now = new Date();
        let ds = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
        pdf.save('REKAP_NILAI_UTS_' + ds + '.pdf');

        hideLoadingAdmin();
        DB.addActivity('Download rekap nilai PDF');
        alert('✅ Rekap nilai berhasil di-download!');
    } catch (err) {
        hideLoadingAdmin();
        alert('❌ Gagal: ' + err.message);
    }
}

function truncatePDF(str, n) {
    return str.length > n ? str.substring(0, n - 1) + '…' : str;
}
