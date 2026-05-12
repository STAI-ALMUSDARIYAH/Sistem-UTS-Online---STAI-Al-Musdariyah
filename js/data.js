// ========================================
// DATA.JS - Initial Data & Database Layer
// STAI Al-Musdariyah - UTS Online System
// ========================================

// Admin credentials
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin2025'
};

// Mata Kuliah Data
const MATA_KULIAH_DATA = {
    semester5: [
        {
            id: 'mk5-01',
            no: 1,
            nama: 'Kapita Selekta Hukum Ekonomi Syari\'ah',
            sks: 2,
            dosen: 'Dr. Prabu Sugiri Permana, S.H., M.H.',
            noHp: '089691736996',
            hari: 'Jumat',
            ke: 1,
            jam: '13.00 – 14.30',
            media: 'Zoom Meeting'
        },
        {
            id: 'mk5-02',
            no: 2,
            nama: 'Ushul Fiqh',
            sks: 3,
            dosen: 'H. Barli, S.E.I., M.Ag.',
            noHp: '081394737003',
            hari: 'Sabtu',
            ke: 2,
            jam: '08.00 – 09.30',
            media: 'Zoom Meeting'
        },
        {
            id: 'mk5-03',
            no: 3,
            nama: 'Pengantar Ilmu Hukum dan Tata Hukum Indonesia',
            sks: 3,
            dosen: 'Nandang Akhmad Kosasih, S.H., M.Si.',
            noHp: '081395244444',
            hari: 'Sabtu',
            ke: 3,
            jam: '09.30 – 11.00',
            media: 'Zoom Meeting'
        },
        {
            id: 'mk5-04',
            no: 4,
            nama: 'Hukum Perdata dan Hukum Dagang',
            sks: 3,
            dosen: 'Dea Jenal Mutakin, S.I.Kom., S.H., M.M.',
            noHp: '082247478078',
            hari: 'Sabtu',
            ke: 4,
            jam: '11.00 – 13.30',
            media: 'Zoom Meeting'
        },
        {
            id: 'mk5-05',
            no: 5,
            nama: 'Kaidah Fiqih Muamalah',
            sks: 2,
            dosen: 'H. Barli, S.E.I., M.Ag.',
            noHp: '081394737003',
            hari: 'Sabtu',
            ke: 5,
            jam: '13.30 – 15.00',
            media: 'Zoom Meeting'
        }
    ],
    semester7: [
        {
            id: 'mk7-01',
            no: 1,
            nama: 'Kapita Selekta Hukum Ekonomi Syari\'ah',
            sks: 2,
            dosen: 'Dr. Prabu Sugiri Permana, S.H., M.H.',
            noHp: '089691736996',
            hari: 'Jumat',
            ke: 1,
            jam: '13.00 – 14.30',
            media: 'Zoom Meeting'
        },
        {
            id: 'mk7-02',
            no: 2,
            nama: 'Metodologi Penelitian Hukum',
            sks: 3,
            dosen: 'Irma Nurlatifah, S.Pd., M.Pd.',
            noHp: '085317274342',
            hari: 'Sabtu',
            ke: 1,
            jam: '08.00 – 09.30',
            media: 'Zoom Meeting'
        },
        {
            id: 'mk7-03',
            no: 3,
            nama: 'Hukum Acara Peradilan Agama',
            sks: 3,
            dosen: 'Dr. Hj. Upi Komariah, SH., MH.',
            noHp: '082217405109',
            hari: 'Sabtu',
            ke: 2,
            jam: '09.30 – 11.00',
            media: 'Zoom Meeting'
        },
        {
            id: 'mk7-04',
            no: 4,
            nama: 'Hukum Perbankan Syariah',
            sks: 3,
            dosen: 'Dr. H. Bunyamin Alamsyah, SH., M.Hum.',
            noHp: '081222686737',
            hari: 'Sabtu',
            ke: 3,
            jam: '11.00 – 13.30',
            media: 'Zoom Meeting'
        },
        {
            id: 'mk7-05',
            no: 5,
            nama: 'Kaidah Fiqih Muamalah',
            sks: 2,
            dosen: 'H. Barli, S.E.I., M.Ag.',
            noHp: '081394737003',
            hari: 'Sabtu',
            ke: 4,
            jam: '13.30 – 15.00',
            media: 'Zoom Meeting'
        },
        {
            id: 'mk7-06',
            no: 6,
            nama: 'Seminar Proposal Skripsi',
            sks: 2,
            dosen: 'Cecep Hidayat, S.IP., M.M.',
            noHp: '081320635402',
            hari: 'Sabtu',
            ke: 5,
            jam: '',
            media: 'Zoom Meeting'
        }
    ]
};

// ========================================
// DATABASE HELPER FUNCTIONS (localStorage)
// ========================================

const DB = {
    // Initialize database
    init: function() {
        if (!localStorage.getItem('uts_initialized')) {
            localStorage.setItem('uts_mahasiswa', JSON.stringify([]));
            localStorage.setItem('uts_soal', JSON.stringify({}));
            localStorage.setItem('uts_jawaban', JSON.stringify([]));
            localStorage.setItem('uts_nilai', JSON.stringify([]));
            localStorage.setItem('uts_activity', JSON.stringify([]));
            localStorage.setItem('uts_initialized', 'true');
        }
    },

    // ===== MAHASISWA =====
    getMahasiswa: function() {
        return JSON.parse(localStorage.getItem('uts_mahasiswa') || '[]');
    },

    saveMahasiswa: function(data) {
        localStorage.setItem('uts_mahasiswa', JSON.stringify(data));
    },

    addMahasiswa: function(mhs) {
        let data = this.getMahasiswa();
        // Check if NIM already exists
        if (data.find(m => m.nim === mhs.nim)) {
            return false;
        }
        data.push(mhs);
        this.saveMahasiswa(data);
        return true;
    },

    updateMahasiswa: function(nim, updates) {
        let data = this.getMahasiswa();
        let idx = data.findIndex(m => m.nim === nim);
        if (idx !== -1) {
            data[idx] = { ...data[idx], ...updates };
            this.saveMahasiswa(data);
            return true;
        }
        return false;
    },

    deleteMahasiswa: function(nim) {
        let data = this.getMahasiswa();
        data = data.filter(m => m.nim !== nim);
        this.saveMahasiswa(data);
    },

    findMahasiswa: function(nim) {
        let data = this.getMahasiswa();
        return data.find(m => m.nim === nim);
    },

    // ===== SOAL =====
    getSoal: function() {
        return JSON.parse(localStorage.getItem('uts_soal') || '{}');
    },

    saveSoal: function(data) {
        localStorage.setItem('uts_soal', JSON.stringify(data));
    },

    setSoalMatkul: function(matkulId, soalData) {
        let data = this.getSoal();
        data[matkulId] = soalData;
        this.saveSoal(data);
    },

    getSoalMatkul: function(matkulId) {
        let data = this.getSoal();
        return data[matkulId] || null;
    },

    // ===== JAWABAN =====
    getJawaban: function() {
        return JSON.parse(localStorage.getItem('uts_jawaban') || '[]');
    },

    saveJawaban: function(data) {
        localStorage.setItem('uts_jawaban', JSON.stringify(data));
    },

    addJawaban: function(jawaban) {
        let data = this.getJawaban();
        // Check if already submitted
        let existing = data.findIndex(j => j.nim === jawaban.nim && j.matkulId === jawaban.matkulId);
        if (existing !== -1) {
            return false; // Already submitted
        }
        data.push(jawaban);
        this.saveJawaban(data);
        return true;
    },

    getJawabanByNim: function(nim) {
        let data = this.getJawaban();
        return data.filter(j => j.nim === nim);
    },

    getJawabanByMatkul: function(matkulId) {
        let data = this.getJawaban();
        return data.filter(j => j.matkulId === matkulId);
    },

    getJawabanDetail: function(nim, matkulId) {
        let data = this.getJawaban();
        return data.find(j => j.nim === nim && j.matkulId === matkulId);
    },

    // ===== NILAI =====
    getNilai: function() {
        return JSON.parse(localStorage.getItem('uts_nilai') || '[]');
    },

    saveNilai: function(data) {
        localStorage.setItem('uts_nilai', JSON.stringify(data));
    },

    setNilai: function(nim, matkulId, nilai, catatan) {
        let data = this.getNilai();
        let existing = data.findIndex(n => n.nim === nim && n.matkulId === matkulId);
        
        let grade = this.calculateGrade(nilai);
        let status = nilai >= 60 ? 'Lulus' : 'Remedial';
        
        let nilaiObj = {
            nim: nim,
            matkulId: matkulId,
            nilai: parseInt(nilai),
            grade: grade,
            status: status,
            catatan: catatan || '',
            updatedAt: new Date().toISOString()
        };

        if (existing !== -1) {
            data[existing] = nilaiObj;
        } else {
            data.push(nilaiObj);
        }
        this.saveNilai(data);
    },

    getNilaiByNim: function(nim) {
        let data = this.getNilai();
        return data.filter(n => n.nim === nim);
    },

    getNilaiByMatkul: function(matkulId) {
        let data = this.getNilai();
        return data.filter(n => n.matkulId === matkulId);
    },

    calculateGrade: function(nilai) {
        if (nilai >= 85) return 'A';
        if (nilai >= 75) return 'B';
        if (nilai >= 65) return 'C';
        if (nilai >= 55) return 'D';
        return 'E';
    },

    // ===== ACTIVITY LOG =====
    getActivity: function() {
        return JSON.parse(localStorage.getItem('uts_activity') || '[]');
    },

    addActivity: function(message) {
        let data = this.getActivity();
        data.unshift({
            message: message,
            time: new Date().toLocaleString('id-ID')
        });
        // Keep only last 50 activities
        if (data.length > 50) data = data.slice(0, 50);
        localStorage.setItem('uts_activity', JSON.stringify(data));
    },

    // ===== SESSION =====
    setSession: function(role, userData) {
        sessionStorage.setItem('uts_role', role);
        sessionStorage.setItem('uts_user', JSON.stringify(userData));
    },

    getSession: function() {
        let role = sessionStorage.getItem('uts_role');
        let user = JSON.parse(sessionStorage.getItem('uts_user') || 'null');
        return { role, user };
    },

    clearSession: function() {
        sessionStorage.removeItem('uts_role');
        sessionStorage.removeItem('uts_user');
    },

    // ===== UJIAN SESSION =====
    setUjianSession: function(data) {
        sessionStorage.setItem('uts_ujian_active', JSON.stringify(data));
    },

    getUjianSession: function() {
        return JSON.parse(sessionStorage.getItem('uts_ujian_active') || 'null');
    },

    clearUjianSession: function() {
        sessionStorage.removeItem('uts_ujian_active');
    },

    // ===== HELPERS =====
    getMatkulById: function(id) {
        let all = [...MATA_KULIAH_DATA.semester5, ...MATA_KULIAH_DATA.semester7];
        return all.find(mk => mk.id === id);
    },

    getMatkulSemester: function(id) {
        if (MATA_KULIAH_DATA.semester5.find(mk => mk.id === id)) return '5';
        if (MATA_KULIAH_DATA.semester7.find(mk => mk.id === id)) return '7';
        return null;
    },

    // Reset all data (for testing)
    resetAll: function() {
        localStorage.removeItem('uts_initialized');
        localStorage.removeItem('uts_mahasiswa');
        localStorage.removeItem('uts_soal');
        localStorage.removeItem('uts_jawaban');
        localStorage.removeItem('uts_nilai');
        localStorage.removeItem('uts_activity');
        this.init();
    }
};

// Initialize database on load
DB.init();