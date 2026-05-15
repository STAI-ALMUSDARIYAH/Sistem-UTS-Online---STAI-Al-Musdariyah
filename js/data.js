// ========================================
// DATA.JS - GOOGLE SHEETS DATABASE
// STAI Al-Musdariyah - UTS Online System
// ========================================

// ✅ URL APPS SCRIPT ANDA
const GOOGLE_SHEET_API = 'https://script.google.com/macros/s/AKfycbztCdrmwv34p3M7Qy0A6djAJg-G1UvvUjvxScTXOETUwkizSCMd__GoGHk2zcTRRMUQvw/exec';

const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin2025'
};

const MATA_KULIAH_DATA = {
    semester5: [
        { id: 'mk5-01', no: 1, nama: 'Kapita Selekta Hukum Ekonomi Syari\'ah', sks: 2, dosen: 'Dr. Prabu Sugiri Permana, S.H., M.H.', noHp: '089691736996', hari: 'Jumat', ke: 1, jam: '13.00 – 14.30', media: 'Zoom Meeting' },
        { id: 'mk5-02', no: 2, nama: 'Ushul Fiqh', sks: 3, dosen: 'H. Barli, S.E.I., M.Ag.', noHp: '081394737003', hari: 'Sabtu', ke: 2, jam: '08.00 – 09.30', media: 'Zoom Meeting' },
        { id: 'mk5-03', no: 3, nama: 'Pengantar Ilmu Hukum dan Tata Hukum Indonesia', sks: 3, dosen: 'Nandang Akhmad Kosasih, S.H., M.Si.', noHp: '081395244444', hari: 'Sabtu', ke: 3, jam: '09.30 – 11.00', media: 'Zoom Meeting' },
        { id: 'mk5-04', no: 4, nama: 'Hukum Perdata dan Hukum Dagang', sks: 3, dosen: 'Dea Jenal Mutakin, S.I.Kom., S.H., M.M.', noHp: '082247478078', hari: 'Sabtu', ke: 4, jam: '11.00 – 13.30', media: 'Zoom Meeting' },
        { id: 'mk5-05', no: 5, nama: 'Kaidah Fiqih Muamalah', sks: 2, dosen: 'H. Barli, S.E.I., M.Ag.', noHp: '081394737003', hari: 'Sabtu', ke: 5, jam: '13.30 – 15.00', media: 'Zoom Meeting' }
    ],
    semester7: [
        { id: 'mk7-01', no: 1, nama: 'Kapita Selekta Hukum Ekonomi Syari\'ah', sks: 2, dosen: 'Dr. Prabu Sugiri Permana, S.H., M.H.', noHp: '089691736996', hari: 'Jumat', ke: 1, jam: '13.00 – 14.30', media: 'Zoom Meeting' },
        { id: 'mk7-02', no: 2, nama: 'Metodologi Penelitian Hukum', sks: 3, dosen: 'Irma Nurlatifah, S.Pd., M.Pd.', noHp: '085317274342', hari: 'Sabtu', ke: 1, jam: '08.00 – 09.30', media: 'Zoom Meeting' },
        { id: 'mk7-03', no: 3, nama: 'Hukum Acara Peradilan Agama', sks: 3, dosen: 'Dr. Hj. Upi Komariah, SH., MH.', noHp: '082217405109', hari: 'Sabtu', ke: 2, jam: '09.30 – 11.00', media: 'Zoom Meeting' },
        { id: 'mk7-04', no: 4, nama: 'Hukum Perbankan Syariah', sks: 3, dosen: 'Dr. H. Bunyamin Alamsyah, SH., M.Hum.', noHp: '081222686737', hari: 'Sabtu', ke: 3, jam: '11.00 – 13.30', media: 'Zoom Meeting' },
        { id: 'mk7-05', no: 5, nama: 'Kaidah Fiqih Muamalah', sks: 2, dosen: 'H. Barli, S.E.I., M.Ag.', noHp: '081394737003', hari: 'Sabtu', ke: 4, jam: '13.30 – 15.00', media: 'Zoom Meeting' },
        { id: 'mk7-06', no: 6, nama: 'Seminar Proposal Skripsi', sks: 2, dosen: 'Cecep Hidayat, S.IP., M.M.', noHp: '081320635402', hari: 'Sabtu', ke: 5, jam: '', media: 'Zoom Meeting' }
    ]
};

// ========================================
// GOOGLE SHEETS API CLIENT
// ========================================
const GSheetAPI = {
    async call(action, sheet, data) {
        try {
            let res = await fetch(GOOGLE_SHEET_API, {
                method: 'POST',
                mode: 'cors',
                redirect: 'follow',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: action, sheet: sheet, data: data })
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return await res.json();
        } catch (err) {
            console.error('GSheet API error:', err);
            return { success: false, error: err.toString() };
        }
    }
};

// ========================================
// DB OBJECT - HYBRID (Cloud + Local Cache)
// ========================================
const DB = {
    _cache: {
        mahasiswa: [], soal: {}, jawaban: [], nilai: [],
        lastSync: null, syncing: false
    },

    async init() {
        this._loadFromLocalCache();
        await this.syncFromCloud();
    },

    _loadFromLocalCache() {
        try {
            this._cache.mahasiswa = JSON.parse(localStorage.getItem('uts_cache_mahasiswa') || '[]');
            this._cache.soal = JSON.parse(localStorage.getItem('uts_cache_soal') || '{}');
            this._cache.jawaban = JSON.parse(localStorage.getItem('uts_cache_jawaban') || '[]');
            this._cache.nilai = JSON.parse(localStorage.getItem('uts_cache_nilai') || '[]');
        } catch (e) { console.error('Local cache load error:', e); }
    },

    _saveCacheLocal() {
        try {
            localStorage.setItem('uts_cache_mahasiswa', JSON.stringify(this._cache.mahasiswa));
            localStorage.setItem('uts_cache_soal', JSON.stringify(this._cache.soal));
            localStorage.setItem('uts_cache_jawaban', JSON.stringify(this._cache.jawaban));
            localStorage.setItem('uts_cache_nilai', JSON.stringify(this._cache.nilai));
        } catch (e) { console.error('Cache save error:', e); }
    },

    async syncFromCloud() {
        if (this._cache.syncing) return;
        this._cache.syncing = true;
        console.log('🔄 Syncing from Google Sheets...');
        try {
            let [mhsRes, soalRes, jawRes, nilaiRes] = await Promise.all([
                GSheetAPI.call('getAll', 'mahasiswa'),
                GSheetAPI.call('getAll', 'soal'),
                GSheetAPI.call('getAll', 'jawaban'),
                GSheetAPI.call('getAll', 'nilai')
            ]);

            if (mhsRes && mhsRes.success) {
                this._cache.mahasiswa = mhsRes.data.map(r => ({
                    nim: String(r.nim),
                    nama: r.nama,
                    semester: String(r.semester),
                    kelas: r.kelas || 'RPL',
                    password: r.password || '-'
                }));
            }

            if (soalRes && soalRes.success) {
                let soalObj = {};
                soalRes.data.forEach(r => {
                    if (r.matkulId && r.data) soalObj[r.matkulId] = r.data;
                });
                this._cache.soal = soalObj;
            }

            if (jawRes && jawRes.success) {
                this._cache.jawaban = jawRes.data.map(r => {
                    let item = (r.data && typeof r.data === 'object') ? r.data : {};
                    return Object.assign({
                        nim: String(r.nim),
                        matkulId: r.matkulId,
                        submittedAt: r.submittedAt
                    }, item);
                });
            }

            if (nilaiRes && nilaiRes.success) {
                this._cache.nilai = nilaiRes.data.map(r => ({
                    nim: String(r.nim),
                    matkulId: r.matkulId,
                    nilai: parseInt(r.nilai) || 0,
                    grade: r.grade,
                    status: r.status,
                    catatan: r.catatan || '',
                    updatedAt: r.updatedAt
                }));
            }

            this._cache.lastSync = new Date().toISOString();
            this._saveCacheLocal();
            console.log('✅ Sync OK:', {
                mhs: this._cache.mahasiswa.length,
                soal: Object.keys(this._cache.soal).length,
                jaw: this._cache.jawaban.length,
                nilai: this._cache.nilai.length
            });
        } catch (err) {
            console.error('❌ Sync error:', err);
        } finally {
            this._cache.syncing = false;
        }
    },

    // ===== MAHASISWA =====
    getMahasiswa() { return this._cache.mahasiswa || []; },

    async addMahasiswa(mhs) {
        let data = this.getMahasiswa();
        if (data.find(m => String(m.nim) === String(mhs.nim))) return false;
        data.push(mhs);
        this._cache.mahasiswa = data;
        this._saveCacheLocal();
        await GSheetAPI.call('addRow', 'mahasiswa', mhs);
        return true;
    },

    async updateMahasiswa(nim, updates) {
        let data = this.getMahasiswa();
        let idx = data.findIndex(m => String(m.nim) === String(nim));
        if (idx === -1) return false;
        data[idx] = Object.assign({}, data[idx], updates);
        this._cache.mahasiswa = data;
        this._saveCacheLocal();
        await GSheetAPI.call('updateRow', 'mahasiswa', {
            keyCol: 'nim', keyVal: nim, data: data[idx]
        });
        return true;
    },

    async deleteMahasiswa(nim) {
        this._cache.mahasiswa = this._cache.mahasiswa.filter(m => String(m.nim) !== String(nim));
        this._saveCacheLocal();
        await GSheetAPI.call('deleteRow', 'mahasiswa', { keyCol: 'nim', keyVal: nim });
        return true;
    },

    findMahasiswa(nim) {
        return this.getMahasiswa().find(m => String(m.nim) === String(nim));
    },

    // ===== SOAL =====
    getSoal() { return this._cache.soal || {}; },

    async setSoalMatkul(matkulId, soalData) {
        this._cache.soal[matkulId] = soalData;
        this._saveCacheLocal();
        await GSheetAPI.call('updateRow', 'soal', {
            keyCol: 'matkulId', keyVal: matkulId,
            data: { matkulId: matkulId, data: soalData }
        });
    },

    getSoalMatkul(matkulId) { return this.getSoal()[matkulId] || null; },

    async deleteSoalMatkul(matkulId) {
        if (this._cache.soal[matkulId]) {
            delete this._cache.soal[matkulId];
            this._saveCacheLocal();
            await GSheetAPI.call('deleteRow', 'soal', { keyCol: 'matkulId', keyVal: matkulId });
            return true;
        }
        return false;
    },

    // ===== JAWABAN =====
    getJawaban() { return this._cache.jawaban || []; },

    async addJawaban(jawaban) {
        let data = this.getJawaban();
        let existing = data.findIndex(j => String(j.nim) === String(jawaban.nim) && j.matkulId === jawaban.matkulId);
        if (existing !== -1) return false;
        data.push(jawaban);
        this._cache.jawaban = data;
        this._saveCacheLocal();
        await GSheetAPI.call('addRow', 'jawaban', {
            nim: jawaban.nim,
            matkulId: jawaban.matkulId,
            data: jawaban,
            submittedAt: jawaban.submittedAt
        });
        return true;
    },

    getJawabanByNim(nim) { return this.getJawaban().filter(j => String(j.nim) === String(nim)); },
    getJawabanByMatkul(matkulId) { return this.getJawaban().filter(j => j.matkulId === matkulId); },
    getJawabanDetail(nim, matkulId) {
        return this.getJawaban().find(j => String(j.nim) === String(nim) && j.matkulId === matkulId);
    },

    async deleteJawaban(nim, matkulId) {
        this._cache.jawaban = this._cache.jawaban.filter(j => !(String(j.nim) === String(nim) && j.matkulId === matkulId));
        this._saveCacheLocal();
        await GSheetAPI.call('deleteRow', 'jawaban', {
            keyCol: 'nim', keyVal: nim,
            secondKeyCol: 'matkulId', secondKeyVal: matkulId
        });
        return true;
    },

    async deleteJawabanByMatkul(matkulId) {
        let initial = this._cache.jawaban.length;
        this._cache.jawaban = this._cache.jawaban.filter(j => j.matkulId !== matkulId);
        this._saveCacheLocal();
        await GSheetAPI.call('deleteRow', 'jawaban', { keyCol: 'matkulId', keyVal: matkulId });
        return initial - this._cache.jawaban.length;
    },

    async deleteJawabanByNim(nim) {
        let initial = this._cache.jawaban.length;
        this._cache.jawaban = this._cache.jawaban.filter(j => String(j.nim) !== String(nim));
        this._saveCacheLocal();
        await GSheetAPI.call('deleteRow', 'jawaban', { keyCol: 'nim', keyVal: nim });
        return initial - this._cache.jawaban.length;
    },

    // ===== NILAI =====
    getNilai() { return this._cache.nilai || []; },

    async setNilai(nim, matkulId, nilai, catatan) {
        let grade = this.calculateGrade(nilai);
        let status = nilai >= 60 ? 'Lulus' : 'Remedial';
        let nilaiObj = {
            nim: String(nim), matkulId: matkulId,
            nilai: parseInt(nilai), grade: grade, status: status,
            catatan: catatan || '', updatedAt: new Date().toISOString()
        };
        let existing = this._cache.nilai.findIndex(n => String(n.nim) === String(nim) && n.matkulId === matkulId);
        if (existing !== -1) this._cache.nilai[existing] = nilaiObj;
        else this._cache.nilai.push(nilaiObj);
        this._saveCacheLocal();
        await GSheetAPI.call('updateRow', 'nilai', {
            keyCol: 'nim', keyVal: nim,
            secondKeyCol: 'matkulId', secondKeyVal: matkulId,
            data: nilaiObj
        });
    },

    getNilaiByNim(nim) { return this.getNilai().filter(n => String(n.nim) === String(nim)); },
    getNilaiByMatkul(matkulId) { return this.getNilai().filter(n => n.matkulId === matkulId); },
    calculateGrade(nilai) {
        if (nilai >= 85) return 'A';
        if (nilai >= 75) return 'B';
        if (nilai >= 65) return 'C';
        if (nilai >= 55) return 'D';
        return 'E';
    },

    async deleteNilai(nim, matkulId) {
        this._cache.nilai = this._cache.nilai.filter(n => !(String(n.nim) === String(nim) && n.matkulId === matkulId));
        this._saveCacheLocal();
        await GSheetAPI.call('deleteRow', 'nilai', {
            keyCol: 'nim', keyVal: nim,
            secondKeyCol: 'matkulId', secondKeyVal: matkulId
        });
        return true;
    },

    async deleteNilaiByMatkul(matkulId) {
        let initial = this._cache.nilai.length;
        this._cache.nilai = this._cache.nilai.filter(n => n.matkulId !== matkulId);
        this._saveCacheLocal();
        await GSheetAPI.call('deleteRow', 'nilai', { keyCol: 'matkulId', keyVal: matkulId });
        return initial - this._cache.nilai.length;
    },

    async deleteNilaiByNim(nim) {
        let initial = this._cache.nilai.length;
        this._cache.nilai = this._cache.nilai.filter(n => String(n.nim) !== String(nim));
        this._saveCacheLocal();
        await GSheetAPI.call('deleteRow', 'nilai', { keyCol: 'nim', keyVal: nim });
        return initial - this._cache.nilai.length;
    },

    async deleteMahasiswaComplete(nim) {
        await this.deleteMahasiswa(nim);
        await this.deleteJawabanByNim(nim);
        await this.deleteNilaiByNim(nim);
        return true;
    },

    async deleteAllMahasiswa() {
        this._cache.mahasiswa = [];
        this._saveCacheLocal();
        await GSheetAPI.call('deleteAll', 'mahasiswa');
    },
    async deleteAllSoal() {
        this._cache.soal = {};
        this._saveCacheLocal();
        await GSheetAPI.call('deleteAll', 'soal');
    },
    async deleteAllJawaban() {
        this._cache.jawaban = [];
        this._saveCacheLocal();
        await GSheetAPI.call('deleteAll', 'jawaban');
    },
    async deleteAllNilai() {
        this._cache.nilai = [];
        this._saveCacheLocal();
        await GSheetAPI.call('deleteAll', 'nilai');
    },
    async resetAll() {
        await Promise.all([
            this.deleteAllMahasiswa(),
            this.deleteAllSoal(),
            this.deleteAllJawaban(),
            this.deleteAllNilai()
        ]);
        this.clearActivity();
    },

    // ===== ACTIVITY (LOCAL ONLY) =====
    getActivity() { return JSON.parse(localStorage.getItem('uts_activity') || '[]'); },
    addActivity(message) {
        let data = this.getActivity();
        data.unshift({ message: message, time: new Date().toLocaleString('id-ID') });
        if (data.length > 50) data = data.slice(0, 50);
        localStorage.setItem('uts_activity', JSON.stringify(data));
    },
    clearActivity() { localStorage.setItem('uts_activity', JSON.stringify([])); },

    // ===== SESSION =====
    setSession(role, userData) {
        sessionStorage.setItem('uts_role', role);
        sessionStorage.setItem('uts_user', JSON.stringify(userData));
    },
    getSession() {
        return {
            role: sessionStorage.getItem('uts_role'),
            user: JSON.parse(sessionStorage.getItem('uts_user') || 'null')
        };
    },
    clearSession() {
        sessionStorage.removeItem('uts_role');
        sessionStorage.removeItem('uts_user');
    },
    setUjianSession(data) { sessionStorage.setItem('uts_ujian_active', JSON.stringify(data)); },
    getUjianSession() { return JSON.parse(sessionStorage.getItem('uts_ujian_active') || 'null'); },
    clearUjianSession() { sessionStorage.removeItem('uts_ujian_active'); },

    // ===== HELPERS =====
    getMatkulById(id) {
        let all = MATA_KULIAH_DATA.semester5.concat(MATA_KULIAH_DATA.semester7);
        return all.find(mk => mk.id === id);
    },
    getMatkulSemester(id) {
        if (MATA_KULIAH_DATA.semester5.find(mk => mk.id === id)) return '5';
        if (MATA_KULIAH_DATA.semester7.find(mk => mk.id === id)) return '7';
        return null;
    }
};

// AUTO INIT pada page load
(async function () {
    await DB.init();
})();
