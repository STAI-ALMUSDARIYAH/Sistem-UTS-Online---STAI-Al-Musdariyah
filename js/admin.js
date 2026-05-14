// ========================================
// ADMIN.JS - FULL VERSION WITH ALL FEATURES
// Support: Esai + Cerita + Pilihan+Alasan + PDF + Print + Tools
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

// ========== DASHBOARD ==========
function loadDashboard() {
    let m = DB.getMahasiswa(), s = DB.getSoal(), j = DB.getJawaban();
    document.getElementById('total-mahasiswa').textContent = m.length;
    document.getElementById('total-matkul').textContent = MATA_KULIAH_DATA.semester5.concat(MATA_KULIAH_DATA.semester7).length;
    document.getElementById('total-soal').textContent = Object.keys(s).length;
    document.getElementById('total-submitted').textContent = j.length;
    let a = DB.getActivity(), l = document.getElementById('activity-log');
    l.innerHTML = a.length ? a.slice(0,10).map(x => `<div class="activity-item"><i class="fas fa-circle" style="font-size:6px;color:#2e86c1;"></i><span>${escapeHtml(x.message)}</span><span class="activity-time">${x.time}</span></div>`).join('') : '<p class="empty-state">Belum ada aktivitas</p>';
}

// ========== MAHASISWA ==========
function loadMahasiswaTable() { renderMHS(DB.getMahasiswa()); }
function renderMHS(d) {
    let t = document.getElementById('tbody-mahasiswa'); if (!d.length) { t.innerHTML='<tr><td colspan=7 class=empty-state>Kosong</td></tr>'; return; }
    t.innerHTML=d.map((m,i)=>`<tr><td>${i+1}</td><td><b>${escapeHtml(m.nim)}</b></td><td>${escapeHtml(m.nama)}</td><td>Sem ${m.semester}</td><td>${escapeHtml(m.kelas||'RPL')}</td><td><code>${escapeHtml(m.password)}</code></td><td nowrap><button class="btn-small btn-edit" onclick="editMHS('${m.nim}')"><i class="fas fa-edit"></i></button><button class="btn-small btn-delete" onclick="deleteMHS('${m.nim}')"><i class="fas fa-trash"></i></button></td></tr>`).join('');
}
function filterMHS(){let s=document.getElementById('filter-semester-mhs').value,q=document.getElementById('search-mhs').value.toLowerCase();renderMHS(DB.getMahasiswa().filter(m=>(!s||m.semester==s)&&(!q||m.nim.toLowerCase().includes(q)||m.nombre.toLowerCase().includes(q))))}
function showAddMahasiswaModal(){['add-nim','add-nama','add-password'].forEach(id=>document.getElementById(id).value='');document.getElementById('add-semester').value='5';openModal('modal-add-mhs')}
function showImportMahasiswaModal(){document.getElementById('import-data').value='';openModal('modal-import-mhs')}
function addMahasiswa(){let n=$('#add-nim').value,nam=$('#add-namavalue,s=$('#add-semester).value,k=$('#add-kelas').value,p=$('#add-password').value;if(!n||!nam||!p){alert('Isi semua field!')}else if(DB.addMahasiswa({nim:n,nama:nam,semester:s,kelas:k,password:p})){DB.addActivity(`Tambah mahasiswa ${nam}`);closeModal('modal-add-mhs');loadDashboard();alert('✅ Berhasil!')}else alert('❌ NIM sudah ada!')}
function importMHS(){let raw=$('#import-data').value;if(!raw){alert('Kosong!')}let l=raw.split('\n').filter(x=>x.trim()),s=0,f=0;l.forEach(line=>{let p=line.split('|').map(x=>x.trim());if(p.length>=5){DB.addMahasiswa({nim:p[0],nama:p[1],semester:p[2],kelas:p[3],password:p[4]})?s++:f++}});DB.addActivity(`Import: ${s} berhasil, ${f} gagal`);closeModal('modal-import-mhs');loadDashboard();alert(`✅${s} berhasil,\n❌${f} gagal/duplikat`)}
function editMHS(nim){let m=DB.findMahasiswa(nim);if(!m)return;let n=prompt('Nama:',m.nama),np=passwordrompt('Password:',m.password),ns=prompt('Sem(5/7):',m.semester);if(n===null||np===null||ns===null)return;DB.updateMahasiswa(nim,{nama:n||m.nombre,password:np||m.password,semester:ns||m.semester});DB.addActivity('Edit mahasiswa '+nim)}deleteMHS(nim){let m=DB.findMahasiswa(nim);if(!m)return;let j=DB.getJawabanByNim(nim),n2=DB.getNilaiByNim(nim);if(!confirm(`⚠️ HAPUS?\n${m.nama}\n\n-${j.length} jawaban\n-${n2.length} nilai?Lanjutkan?`))return;DB.deleteMahasiswaComplete(nim);DB.addActivity(`Hapus ${m.nama}`);loadDashboard();alert('✅ Dihapus!')}

// ========== MATA KULIAH ==========
function showSemesterMK(sem,b){document.querySelectorAll('.sem-tab').forEach(t=>t.classList.remove('active'));b.classList.add('active');loadMatkulTable(sem)}
function loadMatkulTable(sem){let mkd=sem===5?MATA_KULIAH_DATA.semester5:MATA_KULIAH_DATA.semester7;document.getElementById('tbody-matakuliah').innerHTML=mkd.map(mk=>{let h=DB.getSoal()[mk.id]?'✓ Ada':'✗ Belum';return`<tr><td>${mk.no}</td><td><b>${escapeHtml(mk.nama)}</b></td><td>${mk.sks}</td><td>${escapeHtml(mk.dosen)}</td><td>${mk.noHp}</td><td>${mk.hari}</td><td>${mk.jam}</td><td><span class="status-badge ${h?'status-lulus':'status-pending'}">${h}</span></td></tr>`}).join('')}

// ========== SOAL BUILDER ==========
function loadSoalMatkul(){let id=document.getElementById('select-matkul-soal').value,e=document.getElementById('soal-editor');if(!id){e.style.display='none';return};e.style.display='block';let mk=DB.getMatkulById(id);document.getElementById('soal-matkul-name').textContent=mk.nama;document.getElementById('soal-dosen-name').textContent='Dosen: '+mk.dosen;let ex=DB.getSoalMatkul(id);soalBuilderData=[];ex?(document.getElementById('petunjuk-soal').value=ex.petunjuk||'',document.getElementById('durasi-ujian').value=ex.durasi||90,document.getElementById('waktu-ujian').value=ex.waktuUjian||'',ex.blocks&&ex.blocks.length?soalBuilderData=JSON.parse(JSON.stringify(ex.blocks)):ex.soal&&ex.soal.length?ex.soal.forEach(s=>{soalBuilderData.push({type:'biasa',pertanyaan:s.pertanyaan,bobot:s.bobot}):})):(document.getElementById('petunjuk-soal').value='',document.getElementById('durasi-ujian').value=90,document.getElementById('waktu-ujian').value=''));renderSB()}
function addSoalBiasa(){soalBuilderData.push({type:'biasa',pertanyaan:'',bobot:10});renderSB();scrollToLast()}
function addSoalPilihan(){soalBuilderData.push({type:'pilihan',pertanyaan:'',bobot:10,modePilihan:'single',butuhAlasan:true,opsi:[{label:'A',teks:''},{label:'B',teks:''}]});renderSB();scrollToLast()}
function addSoalCerita(){soalBuilderData.push({type:'cerita',cerita:'',subSoal:[{tipe:'esai',pertanyaan:'',bobot:10}]});renderSB();scrollToLast()}
function scrollToLast(){setTimeout(()=>{let b=document.querySelectorAll('#soal-builder-container .soal-block');if(b.length)b[b.length-1].scrollIntoView({behavior:'smooth',block:'center'})},100)}

function renderSB(){
    let c=document.getElementById('soal-builder-container');if(soalBuilderData.length===0){c.innerHTML='<div class=empty-state style="padding:30px;">Belum ada soal</div>';return}
    let html='',gn=0;
    soalBuilderData.forEach((blk,bi)=>{
        if(blk.type==='biasa'){
            gn++;html+=renderBlockBiasa(bi,gn,blk);
        }else if(blk.type==='pilihan'){
            gn++;html+=renderBlockPilihan(bi,gn,blk);
        }else if(blk.type==='cerita'){
            let s=gn+1,e=(blk.subSoal?blk.subSoal.length:0)+gn-1;
            gn=e+(blk.subSoal?blk.subSoal.length:0);
            html+=renderBlockCerita(bi,s,e,blk)
        }
    });c.innerHTML=html;
}

function renderBlockBiasa(i,no,b){return `<div class="soal-block soal-block-biasa" data-blk="${i}">
<div class="soal-block-header"><div class="soal-block-badge badge-biasa"><i class="fas fa-pen"></i> Soal ${no} (Esai)</div><div class="soal-block-actions"><button class="btn-small btn-edit" onclick="moveBlk(${i},-1)">↑</button><button class="btn-small btn-edit" onclick="moveBlk(${i},1)">↓</button><button class="btn-small btn-delete" onclick="rmBlk(${i})">🗑️</button></div></div><div class="soal-block-body"><div class="form-group"><label>Pertanyaan</label><textarea rows=4 placeholder="Pertanyaan..." onchange="updBiasa(${i},'pertanyaan',this.value)">${escapeHtml(b.pertanyaan||'')}</textarea></div><div class="form-group"><label>Bobot</label><input type=number value=${b.bobot||10} min=1 max=100 style=width:80px onchange="updBiasa(${i},'bobot',this.value)"></div></div></div></div>`}

function renderBlockPilihan(i,no,b){
    let opsHTML=b.opsi?b.opsi.map((o,j)=>`
<div class="opsi-item">
    <div class="opsi-label">${o.label}</div>
    <textarea rows=2 placeholder="Pilihan ${o.label}..." onchange="updOpsi(${i},${j},this.value)">${escapeHtml(o.teks||'')}</textarea>
    <button class="btn-small btn-delete" onclick="rmOpsi(${i},${j})">×</button>
</div>`):'';
    return `<div class="soal-block soal-block-pilihan" data-blk="${i}">
<div class="soal-block-header"><div class="soal-block-badge badge-pilihan"><i class="fas fa-list-ul"></i> Soal ${no} (Pilihan+Alasan)</div><div class="soal-block-actions"><button class="btn-small btn-edit" onclick="moveBlk(${i},-1)">↑</button><button class="btn-small btn-edit" onclick="moveBlk(${i},1)">↓</button><button class="btn-small btn-delete" onclick="rmBlk(${i})">🗑️</button></div></div><div class="soal-block-body">
<div class="form-group"><label>Pertanyaan</label><textarea rows=3 placeholder="Pertanyaan..." onchange="updPilihan(${i},'pertanyaan',this.value)">${escapeHtml(b.pertanyaan||'')}</textarea></div>
<div class=form-row>
<select onchange="updPilihan(${i},'modePilihan',this.value)"><option value=single ${b.modePilihan==='selected'?selected:''}>☐ Pilih SATU (Radio)</option><option value=multi ${b.modePilihan==='multi'?selected:''}>☑ Pilih BEBERAPA (Checkbox)</option></select>
<input type=number value=${b.bobot||10} min=1 max=100 style=width:70px placeholder=Bobot onchange="updPilihan(${i},'bobot',this.value)">
<select onchange="updPilihan(${i},'butuhAlasan',this.value==='true')"><option value=true ${b.butuhAlasan?'selected':''}>Ya,Wajib Alasan</option><option value=false ${!b.butuhAlasan?'selected':''}>Tidak Perlu Alasan</option></select>
</div>
<div class=opsi-container>
    <div class=opsi-header><h4>Daftar Pilihan</h4><button class="btn-primary btn-sm" onclick=addOpsi(${i})>+ Tambah Pilihan</button></div>
    <div class=opsi-list>${opsHTML||'<p class=empty-state style=padding:8px;font-size:11px;">Belum ada pilihan</p>'}</div>
    <p class=opsi-hint><i class="fas fa-info-circle"></i> Untuk teks Arab/Arab, langsung paste di textarea</p>
</div></div></div>`
}

function renderBlockCerita(i,start,end,b){
    let subHTML='';
    if(b.subSoal)b.subSoal.forEach((sub,si)=>{
        let no=start+si;
        subHTML+=renderSubSoal(i,si,no,sub)
    });
    return `<div class="soal-block soal-block-cerita" data-blk="${i}">
<div class="soal-block-header"><div class="soal-block-badge badge-cerita"><i class="fas fa-book-open"></i> Soal Cerita — ${start}-${end}</div><div class="soal-block-actions"><button class="btn-small btn-edit" onclick="moveBlk(${i},-1)">↑</button><button class="btn-small btn-edit" onclick="moveBlk(${i},1)">↓</button><button class="btn-small btn-delete" onclick="rmBlk(${i})">🗑️</button></div></div><div class="soal-block-body">
<div class="form-group"><label><i class="fas fa-book-reader"></i>Cerita / Narasi Kasus</label>
<textarea rows=6 class=cerita-textarea placeholder="Narasi..." onchange="updCerita(${i},this.value)">${escapeHtml(b.cerita||'')}</textarea></div>
<div class=sub-soal-container>
    <div class=sub-soal-title><h4>Pertanyaan berdasarkan cerita:</h4>
    <div style="display:flex;gap:6px;flex-wrap:wrap;"><button class="btn-primary btn-sm" onclick="addSubEsai(${i})">+ Esai</button><button class="btn-pilihan btn-sm" onClick="addSubPilihan(${i})">+ Pilihan</button></div>
</div>
    <div class=sub-soal-list>${subHTML||'<p class=empty-state style="padding:12px">Tambah pertanyaan</p>'}</div>
</div></div></div>`
}

function renderSubSoal(bi,si,no,sub){
    if(sub.tipe==='esai')return `<div class=sub-soal-item data-sub="${si}"><div class=sub-soal-header>
<span class=sub-soal-number>Soal ${no}</span>
<div style="display:flex;gap:6px;align-items:center;">
    <select onchange="changeSubType(${bi},${si},this.value)" style="padding:5px;border-radius:5px;border:1px solid #ddd;font-size:12px;"><option value=esai selected>Esai</option><option value=pilihan>Pilihan</option></select>
    <button class="btn-small btn-delete" onclick="rmSubSoal(${bi},${si})">×</button></div></div>
<div class=form-group><label>Pertanyaan</label><textarea rows=3 placeholder="..." onchange="updSubSoal(${bi},${si},'pertanyaan',this.value)">${escapeHtml(sub.pertanyaan||'')}</textarea></div>
<div class=form-group><label>Bobot</label><input type=number value=${sub.bobot||10} min=1 max=100 style=width:80px onchange="updSubSoal(${bi},${si},'bobot',this.value)"></div>
</div>`
    else{
        let opHTML='';
        if(sub.opsi)sub.opsi.forEach((o,oi)=>opHTML+=`<div class=opsi-item>
<div class=opsi-label>${o.label}</div>
<textarea rows=2 placeholder="Pilihan ${o.label}" onchange="updSubOpsi(${bi},${si},${oi},this.value)">${escapeHtml(o.teks||'')}</textarea>
<button class="btn-small btn-delete" onclick="rmSubOpsi(${bi},${si},${oi})">×</button>
</div>`);
        return `<div class=sub-soal-item data-sub="${si}">
<div class=sub-soal-header><span class=sub-soal-number>Soal ${no}</span>
<div style="display:flex;gap:6px;align-items:center;">
    <select onchange="changeSubType(${bi},${si},this.value)" style="padding:5px;border-radius:5px;border:1px solid #ddd;font-size:12px;"><option value=esai selected>Esai</option><option value=pilihan>Pilihan</option></select>
    <button class="btn-small btn-delete" onclick="rmSubSoal(${bi},${si})">×</button></div></div>
<div class=form-group><label>Pertanyaan</label><textarea rows=3 placeholder="..." onchange="updSubSoal(${bi},${si},'pertanyaan',this.value)">${escapeHtml(sub.pertanyaan||'')}</textarea></div>
<div class=form-row><select onchange="updSubSoal(${bi},${si},'modePilihan',this.value)"><option value=single ${sub.modePilihan==='single'?'selected':''}>☐ Satu</option><option value=multi ${sub.modePilihan==='multi'?'selected':''}>Beberapa</option></select>
<input type=number value=${sub.bobot||10} min=1 max=100 style=width:60px placeholder=Bobot onchange="updSubSoal(${bi},${si},'bobot',this.value)">
<select onchange="updSubSoal(${bi},${si},'butuhAlasan',this.value==='true')"><option value=true ${sub.butuhAlasan?'selected':''}>Ya</option><option value=false ${!sub.butuhAlasan?'selected':''}>Tidak</option></select></div>
<div class=opsi-container><div class=opsi-header><h4>Pilihan</h4><button class="btn-primary btn-sm" onclick="addSubOpsi(${bi},${si})">+ Opsi</button></div>
<div class=opsi-list>${opHTML||'<p style="padding:6px;font-size:11px;color:#888;">Belum ada pilihan</p>'}</div>
</div>
</div>`
}

// Update Functions for Soal Builder
function updBiasa(i,f,v){if(f==='bobot')v=parseInt(v)||10;soalBuilderData[i][f]=v}
function updCerita(i,v){soalBuilderData[i].cerita=v}
function updPilihan(i,f,v){if(f==='bobot')v=parseInt(v)||10;soalBuilderData[i][f]=v;renderSB()} // Refresh if alasan toggle changed
function updOpsi(bi,oi,v){soalBuilderData[bi].opsi[oi].teks=v}
function addOpsi(bi){if(!soalBuilderData[bi].opsi)soalBuilderData[bi].opsi=[];soalBuilderData[bi].opsi.push({label:String.fromCharCode(65+soalBuilderData[bi].opsi.length),teks:''});renderSB()}
function rmOpsi(bi,oi){confirm('Hapus pilihan?')&&(soalBuilderData[bi].opsi.splice(oi,1),soalBuilderData[bi].opsi.forEach((x,i)=>x.label=String.fromCharCode(65+i)),renderSB())}
function rmBlk(i){if(!confirm('Hapus blok ini?'))return;soalBuilderData.splice(i,1);renderSB()}
function moveBlk(i,d){let n=i+d;if(n<0||n>=soalBuilderData.length)return;let t=soalBuilderData[i];soalBuilderData[i]=soalBuilderData[n];soalBuilderData[n]=t;renderSB()}
function addSubEsai(bi){if(!soalBuilderData[bi].subSoal)soalBuilderData[bi].subSoal=[];soalBuilderData[bi].subSoal.push({tipe:'esai',pertanyaan:'',bobot:10});renderSB()}
function addSubPilihan(bi){if(!soalBuilderData[bi].subSoal)soalBuilderData[bi].subSoal=[];soalBuilderData[bi].subSoal.push({tipe:'pilihan',pertanyaan:'',bobot:10,modePilihan:'single',butuhAlasan:true,opsi:[{label:'A',teks:''},{label:'B',teks:''}]});renderSB()}
function changeSubType(bi,si,tipe){soalBuilderData[bi].subSoal[si].tipe=tipe;if(tipe==='pilihan'){if(!soalBuilderData[bi].subSoal[si].opsi)soalBuilderData[bi].subSoal[si].opsi=[{label:'A',teks:''},{label:'B',teks:''}];if(soalBuilderData[bi].subSoal[si].modePilihan===undefined)soalBuilderData[bi].subSoal[si].modePilihan='single';if(soalBuilderData[bi].subSoal[si].butuhAlasan===undefined)soalBuilderData[bi].subSoal[si].butuhAlasan=true}renderSB()}
function updSubSoal(bi,si,f,v){if(f==='bobot')v=parseInt(v)||10;soalBuilderData[bi].subSoal[si][f]=v}
function updSubOpsi(bi,si,oi,v){if(soalBuilderData[bi].subSoal[si].opsi&&soalBuilderData[bi].subSoal[si].opsi[oi])soalBuilderData[bi].subSoal[si].opsi[oi].teks=v}
function addSubOpsi(bi,si){let sub=soalBuilderData[bi].subSoal[si];if(!sub.opsi)sub.opsi=[];sub.opsi.push({label:String.fromCharCode(65+sub.opsi.length),teks:''});renderSB()}
function rmSubOpsi(bi,si,oi){if(!confirm('Hapus pilihan?'))return;soalBuilderData[bi].subSoal[si].opsi.splice(oi,1);soalBuilderData[bi].subSoal[si].opsi.forEach((x,i)=>x.label=String.fromCharCode(65+i));renderSB()}
function rmSubSoal(bi,si){if(!confirm('Hapus pertanyaan?'))return;soalBuilderData[bi].subSoal.splice(si,1);renderSB()}
// Save Soal
function saveSoal(){
    let mkId=document.getElementById('select-matkul-soal').value;if(!mkId){alert('Pilih matkul!')}if(soalBuilderData.length===0){alert('Tambahkan minimal 1 soal!')}for(let b of soalBuilderData){if(b.type==='biasa'){if(!b.pertanyaan||!b.pertanyaan.trim()){alert('Soal esai kosong!')}}else if(b.type==='pilihan'){if(!b.pertanyaan||!b.pertanyaan.trim()){alert('Soal pilihan kosong')}if(!b.opsi||b.opsi.length<2){alert('Minimal 2 pilihan');return}else{for(let o of b.opsi){if(!o.teks||!o.teks.trim()){alert('Opsi kosong');return}}}}else if(b.type==='cerita'){if(!b.cerita||!b.cerita.trim()){alert('Narasi kosong')}if(!b.subSoal||!b.subSoal.length){alert('Butuh pertanyaan')}}}
    let flat=[],no=0;soalBuilderData.forEach(b=>{
        if(b.type==='biasa'){no++;flat.push({no,type:'esai',pertanyaan:b.pertanyaan,bobot:b.bobot,ceritaRef:null})}
        else if(b.type==='pilihan'){no++;flat.push({no,type:'pilihan',pertanyaan:b.pertanyaan,bobot:b.bobot,modePilihan:b.modePilihan,butuhAlasan:b.butuhAlasan,opsi:b.opsi,ceritaRef:null})}
        else if(b.type==='cerita'){b.subSoal.forEach(sub=>{
            no++;let item={no,tipe:sub.tipe,pertanya:sub.pertanyaan,bobot:sub.bobot,ceritaRef:b.cerita};if(sub.tipe==='pilihan'){item.modePilihan=sub.modePilihan;item.butuhAlasan=sub.butuhAlasan;item.opsi=sub.opsi}flat.push(item)})
    }});
    let mk=DB.getMatkulById(mkId);
    DB.setSoalMatkul(mkId,{matkulId,mkNama:mk.nama,dosen:mk.dosen,petunjuk:$('#petunjuk-soal').value.trim(),durasi:parseInt($('#durasi-ujian').value)||90,waktuUjian:$('#waktu-ujian').value,blocks:soalBuilderData,soal:flat});
    DB.addActivity(`Admin buat/update soal: ${mk.nama}`);
    alert(`✅ Disimpan!\nTotal: ${flat.length} soal`)
}
function deleteSoalCurrent(){let id=$('#select-matkul-soal').value;if(!id){alert('Pilih matkul')}let mk=DB.getMatkulById(id);if(!DB.getSoalMatkul(id)){alert('Belum ada soal')}if(!confirm(`Hapus soal "${mk.nama}"?`))return;DB.deleteSoalMatkul(id);DB.addActivity(`Hapus soal ${mk.nama}`);soalBuilderData=[];$('soal-editor').hide();$('#select-matkul-soal').val('');loadDashboard();alert('✅ Hapus')}
function previewSoal(){let a=document.getElementById('soal-preview-area'),visible=a.style.display!=='block';a.style.display=visible?'none':'block';if(visible)return;if(soalBuilderData.length===0){alert('Belum ada soal')}let html='<div class=soal-preview><h3 style=color:#1a5276;margin-bottom:15px><i class=fas fa-eye></i> Preview</h3>';let gn=0;soalBuilderData.forEach(b=>{if(b.type==='biasa'){gn++;html+=`<div class=preview-item preview-biasa><span class=soal-number>Soal ${gn}</span><p>Bobot: ${b.bobot}pt</p><div class=soal-text>${b.pertanyaan||'(kosong)'}</div><div class=preview-answer-box>Mahasiswa menjawab di sini</div></div>`}else if(b.type==='pilihan'){gn++;html+=renderPreviewP(gn,b,false)}else if(b.type==='cerita'){html+=`<div class=preview-item preview-cerita><div class=preview-cerita-header>Bacalah cerita:</div><div class=preview-cerita-text>${b.cerita||'(kosong)'}</div><div class=preview-cerita-questions>`;if(b.subSoal)b.subSoal.forEach(sub=>{
if(sub.tipe==='esai'){gn++;html+=`<div class=preview-sub-soal><span class=soal-number>Soal ${gn}</span><p>Bobot: ${sub.bobot}pt</p><div class=soal-text>${sub.pertanya||''}</div><div class=preview-answer-box>Mahasiswa menjawab</div></div>`}else{gn++;html+=renderPreviewP(gn_sub,true)}}html+='</div></div>`}});a.innerHTML=html;a.scrollIntoView({behavior:'smooth',block:'start'})}
function renderPreviewPilihan(no,isSub){
    let opsHTML='';if(isSub.modePilihan==='multi'){isSub.opsi.forEach(o=>opsHTML+=`<label class=preview-opsi-label><input type=checkbox disabled ${isSub.pilihan.includes(o.label)?'checked':''}><span class=opsi-letter>${o.label}. </span><span class=opsi-isi>${o.teks||'(kosong)'}</label>`)}}}else{isSub.opsi.forEach(o=>opsHTML+=`<label class=preview-opsi-label><input type=radio disabled name=p_${no}_${Date.now()}_${Math.random()} ${isSub.pilihan.includes(o.label)?'checked':''}><span class=opsi-letter>${o.label}. </span><span class=opsi-isi>${o.teks||'(kosong)'}</label>`)})
    let alasHtml=isSub.butuhAlasan?'<div class=preview-alasan-box><label>Alasan dari pilihan:</label><div class=preview-answer-box>Mahasiswa tuliskan alasan di sini</div></div>':'';
    return`<div class=preview-item ${isSub?'preview-sub-soal':'preview-pilihan'}><span class=soal-number>Soal ${no}</span><p>Bobot: ${isSub.bobot}pt</p><div class=soal-text>${isSub.pertanyaan||''}</div>
<div class=preview-opsi-list><p style=color:#16a085;font-size:12px;margin-bottom:8px><i class="fas fa-${isSub.modePilihan==='multi'?'check-square':'dot-circle'}"></i> ${isSub.modePilihan==='multi'?'Pilih SATU':'Pilih Beberapa'}:</p>${opsHTML}</div>${alasHtml}`
}

// ========== HASIL UJIAN ==========
function loadHasilUjian(){renderHasil(DB.getJawaban())}
function filterHasilUjian(){let mk=$('#filter-matkul-hasil').val(),s=$('#filter-semester-hasil').val();renderHasil(DB.getJawaban().filter(j=>(!mk||j.matkulId==mk)&&(!s||j.semester==s)))}
function renderHasil(d){let t=$('#tbody-hasil');if(!d.length){t.innerHTML='<tr><td colspan=8 class=empty-state> Kosong</td></tr>';return}t.innerHTML=d.map((j,i)=>{
    let mk=DB.getMatkulById(j.matkulId),n=DB.getNilai().find(x=>x.nim==j.nim&&x.matkulId==j.matkulId);
    return`<tr><td>${i+1}</td><td><b>${escapeHtml(j.nim)}</b></td><td>${escapeHtml(j.namaMhs)}</td><td>${escapeHtml(mk?mk.nama:j.matkulNama)}</td><td>Sem ${j.semester||'-'}</td><td>${formatDT(j.submittedAt)}</td><td><span class=status-badge ${n?'status-lulus':'status-submitted'}>${n?"Dinilai("+n.nilai+")":"Pending"}</span></td><td nowrap><button class=btn-small btn-view onclick=viewJawaban('${j.nim}','${j.matkulId}')>👁</button><button class=btn-small btn-download onclick=downloadJawabanTXT('${j.nim}','${j.matkulId}')⬇</button><button class=btn-small btn-delete onclick=deleteJawaban('${j.nim}','${j.matkulId}')🗑️</button></td></tr>`}).join('')}
function deleteJawaban(nim,mkId){let m=DB.findMahasiswa(nim),mk=DB.getMatkulById(mkId);if(!confirm("⚠️ HAPUS?\n"+m?.name+" - "+mk?.nama+"?\nLanjutkan?"))return;DB.deleteJawaban(nim,mkId);DB.deleteNilai(nim,mkId);DB.addActivity(`Hapus jawaban: ${m?.name} - ${mk?.nama}`);loadHasilUjian();loadDashboard();alert('✅ Dihapus!')}

// ========== NILAI ==========
function loadNilaiMatkul(){let id=$('#filter-matkul-nilai').val();let t=$('#tbody-nilai');if(!id){t.innerHTML='<tr><td colspan=8 class=empty-state>Pilih matkul</td></tr>';return}let mk=DB.getMatkulById(id),jaw=DB.getJawabanByMatkul(id),na=DB.getNilai();if(!jaw.length){t.innerHTML='<tr><td colspan=8 class=empty-state>Belum ada jawaban untuk matkul ini</td></tr>';return}t.innerHTML=jaw.map((j,i)=>{
    let n=na.find(x=>x.nim==j.nim&&x.matkulId==j.matkulId),nv=n?.nilai||'',
    g=n?.grade||'-',s=n?.status||'Belum Dinilai',sc=!n?'status-pending':(n.status=='Lulus'?'status-lulus':'status-remedial'),
    gc=n?'grade-'+n.grade:'';
    return`<tr><td>${i+1}</td><td><b>${escapeHtml(j.nim)}</b></td><td>${escapeHtml(j.namaMhs)}</td><td>${escapeHtml(mk.nama)}</td>
<td><input class=nilai-input data-nim="${j.nim}" data-mk="${j.matkulId}" value="${nv}" min=0 max=100 style="width:65px;padding:4px;border:1px solid #ddd;border-radius:4px;"></td>
<td><span class=grade-badge ${gc}>${g}</span></td><td><span class=status-badge ${sc}>${s}</span></td>
<td nowrap><button class=btn-small btn-view onclick=viewJawaban('${j.nim}','${j.matkulId}')>👁</button>
${n?`<button class=btn-small btn-delete onclick=deleteNilaiRow('${j.nim}','${j.matkulId}')🗑️</button>`:''}</td></tr>`}).join('');
}
function saveAllNilai(){let inputs=$('.nilai-input'),c=0;inputs.each(function(){if($(this).val().trim()!=''){DB.setNilai($(this).data('nim'),$(this).data('mk'),$(this).val(),'';c++}});if(c>0){DB.addActivity(`Input ${c} nilai`);loadNilaiMatkul();alert(`✅ ${c} nilai disimpan!`) }else alert('Tidak ada nilai input')}
function deleteNilaiRow(nim,mkId){let m=DB.findMahasiswa(nim);if(!confirm(`Hapus nilai ${m?.name}?`))return;DB.deleteNilai(nim,mkId);DB.addActivity(`Hapus nilai: ${nim}`);loadNilaiMatkul();alert('✅ Nilai dihapus')}

// ========== VIEW / DOWNLOAD JAWABAN (PDF/TXT/PRINT) ==========
function viewJawaban(nim,mkId){
    let j=DB.getJawabanDetail(nim,mkId);if(!j){alert('Tidak ditemukan')}currentViewJawaban=j
    let mk=DB.getMatkulById(mkId),nilai=DB.getNilai().find(n=>n.nim===nim&&n.matkulId===mkId);
    $('#view-jawaban-content').html=generateJawabanHTML(j,m,nilai)
    openModal('modal-view-jawaban')
}

// Generate HTML untuk Lembar Jawaban Profesional
function generateJawabanHTML(jaw,mk,nilai){
    let totalBobot=0;jaw.jawaban.forEach(j=>totalBobot+=(j.bobot||0))
    return `
<div class="lembar-jawaban" id="lembar-pdf-content">
<div class="lj-header">
    <div class="lj-logo-area"><i class="fas fa-mosque" style="font-size:50px;color:#1a5276;"></div></div>
    <div class="lj-header-text">
        <h2>SEKOLAH TINGGI AGAMA ISLAM AL-MUSDARIYAH</h2>
        <h3>JURUSAN SYARIAH</h3>
        <h3>PROGRAM STUDI HUKUM EKONOMI SYARIAH</h3>
        <p>Jl. K.H. Usman Dhomiri No. 156, Cimahi Tengah, Kota Cimahi</p>
        <p>Telp: (022) 6633113 | info@stai-almusdariyah.ac.id</p>
    </div>
</div>
<div class="lj-divider"></div>
<div class="lj-title">
    <h2>LEMBAR JAWABAN UJIAN TENGAH SEMESTER (UTS)</h2>
    <p>Tahun Akademik 2025 / 2026</p>
</div>
<table class="lj-info-table">
<tr><td class=lj-label>Nama Mahasiswa</td><td class=lj-colon>:</td><td class=lj-value><strong>${escapeHtml(jaw.namaMhs)}</strong></td><td class=lj-label>Mata Kuliah</td><td class=lj-colon>:</td><td class=lj-value>${escapeHtml(mk?mk.name:jaw.matkulNama)}</td></tr>
<tr><td class=lj-label>NIM</td><td class=lj-colon>:</td><td class=lj-value><strong>${escapeHtml(jaw.nim)}</strong></td><td class=lj-label>Dosen Pengampu</td><td class=lj-colon>:</td><td class=lj-value>${escapeHtml(mk?mk.dosen:'')}</td></tr>
<tr><td class=lj-label>Semester</td><td class=lj-colon>:</td><td class=lj-value>${jaw.semester}</td><td class=lj-label>Hari/Tanggal</td><td class=lj-colon>:</td><td class=lj-value>${formatDTLong(jaw.submittedAt)}</td></tr>
<tr><td class=lj-label>Kelas</td><td class=lj-colon>:</td><td class=lj-value>RPL (Non Reguler)</td><td class=lj-label>Waktu Submit</td><td class=lj-colon>:</td><td class=lj-value>${formatTimeOnly(jaw.submittedAt)}</td></tr>
</table>
<div class="lj-instruksi"><strong>Petunjuk:</strong> Lembar ini dikumpulkan melalui Sistem UTS Online STAI Al-Musdariyah</div>
<div class="lj-content-area">`
    
    // Render soal dan jawaban
    let lastCerita=null;
    jaw.jawaban.forEach((j,i)=>{
        if(j.ceritaRef && j.ceritaRef!==lastCerita){
            lastCerita=j.ceritaRef;
            html+=`<div class="lj-cerita"><div class="lj-cerita-label">📖 CERITA/KASUS:</div><div class="lj-cerita-text">${escapeHtml(j.ceritaRef)}</div></div>`;
        }
        if(!j.ceritaRef)lastCerita=null;

        if(j.tipe==='pilihan'){
            html+=renderJawabanPilihan(i,j,true)
        } else {
            html+=`<div class="lj-soal-block">
<div class="lj-soal-header"><span class="lj-soal-no">Soal No. ${i+1}</span><span class="lj-soal-bobot">Bobot: ${j.bobot} pt</span></div>
<div class="lj-soal-pertanyaan">${escapeHtml(j.pertanyaan)}</div>
<div class="lj-jawaban-area"><div class="lj-jawaban-label">JAWABAN:</div><div class="lj-jawaban-text">${escapeHtml(j.jawaban||'(tidak dijawab)')}</div></div></div>`
        }
    });
    html+=`
</div>

<!-- Nilai Box -->
<div class="lj-nilai-box">
<h3>LEMBAR PENILAIAN DOSEN</h3>
<table class="lj-nilai-table">
<tr><th>No.Soal</th><th>Bobot</th><th>Nilai(Dosen)</th><th>Ket.</th></tr>
`;
    jaw.jawaban.forEach((j,i)=>{
        html+=`<tr><td>${i+1}</td><td>${j.bobot}</td><td class=lj-nilai-empty>................</td><td>&nbsp;</td></tr>
    });
    html+=`<tr class="lj-total-row"><td colspan=2><strong>TOTAL NILAI</strong></td><td class=lj-nilai-total>${nilai?nilai.itemVal:'................'}</td><td><strong>Grade: ${nilai?.grade:'......'}</strong></td></tr>
</table>
</div>

<!-- TTD -->
<div class="lj-ttd-area">
    <div class="lj-ttd-box"><p>Catatan Dosen:</p><div class="lj-catatan-box">${nilai?.catatan||''}</div></div>
    <div class="lj-ttd-box lj-ttd-dosen">
        <p>Cimahi, ${formatDateLong(new Date().toISOString())}</p>
        <p><strong>Dosen Pengampu,</strong></p>
        <div class="lj-ttd-space"></div>
        <p class="lj-ttd-name"><strong>${escapeHtml(mk?.dosen:'_____________________')}</strong></p>
        <p class="lj-ttd-line">___________________________</p>
    </div>
</div>

<!-- Footer -->
<div class="lj-footer">
    <p>Dokumen dibuat otomatis oleh Sistem UTS Online STAI Al-Musdariyah</p>
    <p>Dicetak: ${formatDateLong(new Date().toISOString())} ${formatTimeOnly(new Date().toISOString())}</p>
</div>
</div>`
}

function renderJawabanPilihan(idx,fromPreview){
    let s=fromPreview?s=fromPreview:jaw.jawaban[idx];
    let savedP=s.pilihan?s.pilihan:[];
    let savedA=s.alasan?s.alasan:''
    let opsHTML='';s.opsi.forEach(opt=>{
        let isChecked=savedP&&savedP.includes(opt.label)?'checked':''
        opsHTML+=`<div class=ujian-opsi-label>
<input type=${s.modePilihan==='multi'?'checkbox':'radio'} name=ujian-pilihan-${idx}-${Date.now()} disabled ${isChecked}>
<span class=ujs-opsi-letter>${opt.label}. </span>
<span class=ujs-opsi-text>${opt.teks||'(kosong)'}</span>
</div>`
    })
    let alasanHTML=s.butuhAlasan?`
<div class=ujian-alasan-box>
<label><i class="fas fa-pen"></i> Alasan dari pilihan:</label>
<textarea id=alasan-${idx} class="ujian-alasan-txt" placeholder="Alasan..." oninput="saveAlasanPilihan(${idx},this.value)">${savedA}</textarea>
</div>`:''

    return `<div class="soal-card soal-card-pilihan" id="soal-card-${idx}">
<div class="soal-card-header">
    <span class=soal-number>Soal ${idx+1}</span>
    <span class=badge-mode>${s.modePilihan==='multi'?'☑ Pilih Beberapa':'◉ Pilih Satu'}</span>
    <span class=soal-bobot>Bobot: ${s.bobot} pt</span>
</div>
<div class=soal-text>${s.pertanyaan}</div>
<div class=ujian-opsi-list>
<p class=opsi-instruksi><i class="fas fa-${s.modePilihan==='multi'?'check-square':'dot-circle'}"></i> ${s.modePilihan==='multi'?'Pilih satu/beberapa tepat':'Pilih salah satu tepat'}:</p>
${opsHTML}
</div>
${alasanHTML}
</div>`
}

// ========== DOWNLOAD FUNCTIONS ==========

// TXT
function downloadJawabanTXT(nim,mkJd){
    let j=DB.getJawabanDetail(nim,mkJd);if(!j)return;let mk=DB.getMatkulById(mkJd),t=`====================================================\n           LEMBAR JAWABAN UTS\n    STAI Al-Musdariyah Kota Cimahi\n   Program Studi Hukum Ekonomi Syariah\n        TA 2025-2026\n====================================================\nNama:${j.namaMhs}|NIM:${j.nim}|MK:${mk?mk.name:mJdmatkulName}|Dosen:${mk?mk.dosen:'-'}|Sem:${j.semester}|Submit:${formatDT(j.submittedAt)}\n====================================================\n`;let lastC=null;j.jawaban.forEach((j,i)=>{if(j.ceritaRef&&j.ceritaRef!==lastC){lastC=j.ceritaRef;t+=`\n📖 CERITA:\n${j.ceritaRef}\n`}if(!j.ceritaRef)lastC=null;
    if(j.tipe==='pilihan'){t+=`SOAL ${i+1} (${j.bobot}pt)\n${j.pertanyaan}\nPilihan:`;if(j.opsi)j.opsi.forEach(o=>{t+=` ${(j.pilihan&&j.pilihan.includes(o.label)?'[✓]':'[ ]')} ${o.label}. ${o.teks}\n`});t+=`\nPilihan Mhs: ${j.pilihan?.length?j.pilihan.join(', '):'(belum memilih)'}`;
    if(j.butuhAlasan)t+=`\nAlasan:\n${j.alasan||(tidak diisi)`}\n}else{t+=`SOAL ${i+1} (${j.bobot}pt)\n${j.pertanyaan}\nJAWABAN:\n${j.jawaban||(tidak dijabab)}\n`};
    t+="\n====================================================\nTanda Tangan Dosen\n\n\n\n\t_______________________\t\t"+(mk?.dosen:'')+"\n====================================================";let blob=new Blob([t],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`JawabanUTS_${nim}_${mjId}.txt`;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);DB.addActivity(`Download TXT: ${j.namaMhs}`)
}

// PDF Generation using jsPDF + html2canvas
async function downloadJawabanPDF(){
    if(!currentViewJawaban){alert('Tidak ada data');return}
    try{
        const{jsPDF}=window.jspdf;
        let el=document.getElementById('lembar-pdf-content')
        el.style.position='absolute';el.style.left='-99999px';el.style.top='0';el.style.width='210mm';el.style.background='white';
        document.body.appendChild(el)
        
        let canvas=await html2canvas(el,{scale:2,useCORS:true,logging:false,backgroundColor:'#fff'})
        let imgData=canvas.toDataURL('image/png'),pdf=new jsPDF('p','mm','a4'),pw=pdf.internal.pageSize.getWidth()
        ph=pdf.internal.getPageHeight(),imgW=pw,imgH=(canvas.height*pw)/canvas.width
        pdf.addImage(imgData,'PNG',0,0,imgW,imgH)
        el.parentNode.removeChild(el)
        let fname=`UTS_${currentViewJawaban.nim}_${currentViewJawaban.namaMhs.replace(/[^a-zA-Z0-9]/g,'_')}_${(currentViewJawaban.mkId?DB.getMatkulById(currentViewJawaban.matkulId)?.name||'').replace(/[^a-zA-Z0-9]/g,'_')}.pdf`
        pdf.save(fname)
        DB.addActivity(`Download PDF: ${currentViewJawaban.namaMhs}`)
    catch(err){console.error(err);alert('Gagal membuat PDF: '+err.message)}
}

// Batch Download All PDF
async function downloadAllPDF(){
    let mk=$('#filter-matkul-hasil').val(),sem=$('#filter-semester-hasil').val()
    let jw=DB.getJawaban().filter(j=>(!mk||j.matkulId==mk)&&(!sem||j.semester==sem))
    if(!jw.length){alert('Tidak ada jawaban');return}
    if(!confirm(`Download ${jw.length} lembar PDF?`))return
    
    let loading=showLoading(`Membuat PDF... 0/${jw.length}`)
    let success=0
    for(let i=0;i<jw.length;i++){
        updateLoadingMsg(loading, `Memproses... (${i+1}/${jw.length})`)
        try{
            let {jsPDF}=window.jspdf,mk=DB.getMatkulById(j[i].matkulId),nilai=DB.getNilai().find(n=>n.nim==j[i].nim&&n.matkulId==j[i].matkulId)
            let div=document.createElement('div');div.id='temp-pdf';div.style.position='absolute';div.style.left='-99999px';div.style.top='0';div.style.width='210mm';div.style.background='white';document.body.appendChild(div)
            div.innerHTML=generateJawabanHTML(j[i],mk,nilai)
            let el=div.querySelector('.lembar-jawaban')
            let canvas=await html2canvas(el,{scale:2,useCORS:true,logging:false,backgroundColor:'#fff'})
            let imgData=canvas.toDataURL('image/png'),pdf=new jsPDF('p','mm','a4'),pw2=pdf.internal.pageSize.getWidth(),ph2=pdf.internal.getPageHeight(),imgW2=pw2,imgH2=(canvas.height*pw2)/canvas.width
            pdf.addImage(imgData,'PNG',0,0,imgW2,imgH2)
            let f=`UTS_${j[i].nim}_${j[i].namaMhs.replace(/[^a-zA-Z0-9]/g,'_')}_${j[i].matkulId ?DB.getMatkulById(j[i].matkulId)?.name?.replace(/[^a-zA-Z0-9]/g,'_'):''}.pdf`
            pdf.save(f)
            document.body.removeChild(div)
            success++
            await sleep(300)
        }catch(e){console.error(e)}
    }
    hideLoading(loading)
    DB.addActivity(`Download ${success} PDF`)
    alert(`✅ Selesai! ${success} PDF didownload.`)
}

// Rekap Nilai PDF
async function downloadRekapNilai(){
    let mk=$('#filter-matkul-hasil').val(),sem=$('#filter-semester-hasil').val()
    let jw=DB.getJawaban().filter(j=>(!mk||j.matkulId==mk)&&(!sem||j.semester==sem))
    if(!jw.length){alert('Tidak ada data');return}
    
    try{
        const{jsPDF}=window.jspdf,allNilai=DB.getNilai()
        let pdf=new jsPDF('p','mm','a4')
        
        // Header
        pdf.setFontSize(14);pdf.setFont('helvetica','bold')
        pdf.text('SEKOLAH TINGGI AGAMA ISLAM AL-MUSDARIYAH',105,15,{align:'center'})
        pdf.setFontSize(11);pdf.text('PROGRAM STUDI HUKUM EKONOMI SYARIAH',105,21,{align:'center'})
        pdf.setFontSize(10);pdf.text('Jl. K.H. Usman Dhomiri No. 156, Cimahi Tengah',105,27,{align:'center'})
        pdf.line(15,32,195,32)
        
        pdf.setFontSize(13);pdf.setFont('helvetica','bold')
        pdf.text('REKAP NILAI UJIAN TENGAH SEMESTER (UTS)',105,40,{align:'center'})
        pdf.setFontSize(10);pdf.text('TA 2025/2026',105,46,{align:'center'})
        
        let startY=55
        pdf.setFontSize(11);pdf.setFont('helvetica','normal')
        pdf.text(`Mata Kuliah: ${mk||'SEMUA'}`,15,startY);pdf.text(`Dosen:`,110,startY)
        
        // Table header
        startY+=8
        let colNo=15,colNim=25,colNama=55,colMk=115,colNilai=160,colGr=175,statusCol=188
        pdf.setFillColor(26,82,118);pdf.rect(colNo,startY-5,180,6,'F')
        pdf.setTextColor(255,255,255);pdf.setFontSize(9);pdf.setFont('helvetica','bold')
        ['No','NIM','Nama',!mk?'Mata Kuliah':'','Nilai','Grade','Status'].forEach(h=>pdf.text(h,colNo+5+(Array.indexOf(h)*35),startY))
        pdf.setTextColor(0,0,0);pdf.setFont('helvetica','normal')
        
        let y=startY
        jw.forEach((j,i)=>{
            if(y>270){pdf.addPage();y=20;startY=y}
            let m=DB.getMatkulById(j.matkulId),n=allNilai.find(n=>n.nim==j.nim&&n.matkulId==j.matkulId)
            pdf.text(String(i+1),colNo,y);pdf.text(j.nim,colNim,y)
            pdf.text(truncate(j.namaMhs,20),colNama,y)
            if(!mk)pdf.text(truncate(m?.name||'-',20),colMk,y)
            pdf.text(n?String(n.nilai):'...',colNilai,y)
            pdf.text(n?.grade?:'...',colGr,y)
            y+=6
        })
        
        // TTD
        y+=15;if(y>250){pdf.addPage();y=30}
        pdf.text(`Cimahi, ${formatDateLong(new Date().toISOString())}`,130,y)
        pdf.fontStyle='normal';pdf.text('Mengetahui,',130,y+6)
        pdf.fontStyle='bold';pdf.text('Kaprodi HES,',130,y+12)
        pdf.setDrawColor(0,0,0);pdf.line(130,y+38,80,0)
        let ds=`${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}${String(new Date()).getDate().padStart(2,'0')}`
        pdf.save(`REKAP_NILAI_UTS_${ds}.pdf`)
        DB.addActivity('Download rekap nilai PDF')
    }catch(e){alert('Error: '+e.message)}
}

// Print
function printJawaban(){
    if(!currentViewJawaban)return
    let mk=DB.getMatkulById(currentViewJawaban.matkulId),nilai=DB.getNilai().find(n=>n.nim===currentViewJawaban.nim&&n.matkulId===currentViewJawaban.matkulId)
    let w=window.open('','','width=900,height=700','toolbar=0,menubar=0')
    w.document.write(`
<!DOCTYPE html><head><title>Lembar Jawaban UTS - ${currentViewJawaban.namaMhs}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>
body{font-family:'Times New Roman',serif;padding:20px;line-height:1.5;font-size:12px;color:#000}
.lembar-jawaban{background:#fff;padding:40px;max-width:800px;margin:0 auto;}
.lj-header{display:flex;align-items:center;gap:20px;padding-bottom:10px;border-bottom:3px double #1a5276}
.lj-logo-area{width:80px;text-align:center}
.lj-logo-area i{font-size:50px;color:#1a5276}
.lj-header-text{text-align:center;flex:1}
.lj-header-text h2{font-size:16px;color:#1a5276;margin:0;font-weight:bold}
.lj-header-text h3{font-size:13px;color:#1a5276;margin:2px 0;font-weight:bold}
.lj-header-text p{font-size:10px;color:#555;margin:1px 0}
.lj-divider{border-top:2px solid #1a5276;margin-top:3px}
.lj-title{text-align:center;margin-bottom:15px}
.lj-title h2{text-decoration:underline;text-transform:uppercase;font-size:14px}
.lj-title p{font-style:italic;margin:3px 0}
.lj-info-table{width:100%;border-collapse:collapse;margin-bottom:15px}
.lj-info-table td{padding:4px 6px;font-size:11px;border:1px solid #ccc}
.lj-label{font-weight:500;width:18%}
.lj-colon{width:2%;text-align:center}
.lj-value{width:30%}
.lj-instruksi{background:#fff8dc;border-left:4px solid #f39c12;padding:8px 12px;font-size:11px;font-style:italic;margin-bottom:15px}
.lj-content-area{margin-bottom:20px}
.lj-cerita{background:#f8f4ff;border:1px solid #d2b4de;border-left:4px solid #8e44ad;padding:10px 15px;border-radius:3px;margin-bottom:12px}
.lj-cerita-label{color:#8e44ad;font-weight:bold;font-size:11px;margin-bottom:5px}
.lj-cerita-text{line-height:1.6;white-space:pre-wrap}
.lj-soal-block{border:1px solid #ddd;border-radius:4px;padding:12px;background:#fafafa;margin-bottom:12px}
.lj-soal-header{background:#1a5276;color:white;padding:5px 10px;border-radius:3px;display:flex;justify-content:space-between;font-size:11px;margin-bottom:8px}
.lj-soal-no{font-weight:bold}
.lj-soal-bobot{background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:10px}
.lj-soal-pertanya{font-weight:500;padding:5px 0;line-height:1.6;margin-bottom:10px;text-align:justify}
.lj-jawaban-area{border:1px dashed #999;padding:10px;min-height:60px;background:white}
.lj-jawaban-label{font-weight:bold;color:#1a5276;font-size:11px;text-decoration:underline;display:block;margin-bottom:5px}
.lj-jawaban-text{line-height:1.7;white-space:pre-wrap}
.lj-pilihan-area{margin-top:8px;background:#fff;padding:10px;border:1px solid #d1f0e6;border-radius:6px}
.lj-alasan-area{background:#fff8dc;border:1px solid #ffd700;padding:10px;margin-top:8px;border-radius:6px}
.lj-alasan-label{color:#b8860b;font-weight:600;font-size:11px;display:block;margin-bottom:5px}
.ujian-opsi-label{display:flex;align-items:flex-start;gap:12px;padding:10px;border:2px solid #d1f0e6;border-radius:6px;background:white;margin-bottom:5px;cursor:pointer}
.ujian-opsi-label:hover{background:#f0fdf9;border-color:#16a085}
.ujian-opsi-label input[type=checkbox],.ujian-opsi-label input[type=radio]{accent-color:#16a085;width:18px;height:18px;cursor:pointer}
.ujs-opsi-letter{background:#16a085;color:white;width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0}
.ujs-opsi-text{flex:1;font-size:13px;line-height:1.6;color:#333;unicode-bidi:plaintext}
.ujian-alasan-box{margin-top:12px;background:#fff8dc;border:2px solid #ffd700;border-radius:6px;padding:12px}
.ujian-alasan-box label{color:#b8860b;font-weight:600;display:block;margin-bottom:8px}
.ujian-alasen-txt{width:100%;min-height:80px;padding:8px;border:2px solid #f0e68c;border-radius:6px;font-family:'Poppins',sans-serif;font-size:13px;resize:vertical;background:white}
.opsi-display{padding:6px 10px;margin:4px 0;border-radius:4px;border-left:3px solid #28a745;color:#155724;font-size:12px}
.opsi-dipilih{background:#d4edda;border-left:3px solid #28a745}
@media print{.lembar-jawaban *{visibility:visible!important}}
</style></head><body>${generateJawabanHTML(currentViewJawaban,mk,nilai)}
<script>setTimeout(()=>{window.print()},500)</script></body></html>`)
    w.document.close()
}

// Utilities
function formatDT(iso){if(!iso)return'-';let d=new Date(iso);return d.getDate()+' '+(d.getMonth()+1)+'.padStart(2,'0')+d.getFullYear()}
function formatDateLong(iso){if(!iso)return'-';let d=new Date(iso);const B=['Januari','Febru','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];return B[d.getDay()]+' '+d.getDate()+' '+B[d.getMonth()]+' '+d.getFullYear()}
function formatTimeOnly(iso){if(!iso)return'-';let d=new Date(iso);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'))+' WIB'}
function escapeHtml(str){return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}(${"src":str}")}

// Loading helpers
function showLoading(msg){
    let d=document.createElement('div');d.id='global-loading';d.innerHTML=`<div class="loading-overlay"><div class="loading-content"><div class="loading-spinner"></div><p id="lmsg">${msg||'Loading...'}</p></div></div>`;document.body.appendChild(d);return d}
function updateLoadingMsg(el,msg){el.querySelector('#lmsg)?el.querySelector('#lmsg').innerHTML=msg:null}
function hideLoading(el){if(el&&el.parentNode)el.parentNode.removeChild(el)}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
