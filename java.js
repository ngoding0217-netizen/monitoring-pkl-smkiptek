// ============================================================
//  SISTEM MONITORING PKL — SMK IPTEK TANGSEL
//  Koneksi langsung ke Supabase dari browser (publishable key + RLS)
// ============================================================

// ─── SUPABASE CONFIG ─────────────────────────────────────────
const SUPABASE_URL = 'https://zjrkeodntplvsojwfqkv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_0H7Ey4CD6xujggcY_AMexg_IE9qyzLW';

// ─── SUPABASE CLIENT (via REST API langsung) ─────────────────
const sb = {
    async query(table, options = {}) {
        let url = `${SUPABASE_URL}/rest/v1/${table}?`;
        if (options.select)  url += `select=${options.select}&`;
        if (options.eq)      Object.entries(options.eq).forEach(([k,v]) => url += `${k}=eq.${encodeURIComponent(v)}&`);
        if (options.order)   url += `order=${options.order}&`;
        if (options.single)  url += ``;
        const headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            ...(options.single ? { 'Accept': 'application/vnd.pgrst.object+json' } : {})
        };
        const res = await fetch(url, { headers });
        if (!res.ok) { const e = await res.json(); throw new Error(e.message || e.hint || 'Query error'); }
        return res.json();
    },
    async insert(table, data) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.message || e.hint || 'Insert error'); }
        const result = await res.json();
        return Array.isArray(result) ? result[0] : result;
    },
    async update(table, data, eq) {
        let url = `${SUPABASE_URL}/rest/v1/${table}?`;
        Object.entries(eq).forEach(([k,v]) => url += `${k}=eq.${encodeURIComponent(v)}&`);
        const res = await fetch(url, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.message || e.hint || 'Update error'); }
        const result = await res.json();
        return Array.isArray(result) ? result[0] : result;
    },
    async upsert(table, data, onConflict) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation,resolution=merge-duplicates'
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.message || e.hint || 'Upsert error'); }
        const result = await res.json();
        return Array.isArray(result) ? result[0] : result;
    }
};

// ─── STATE ───────────────────────────────────────────────────
let currentUser = null;
let currentView = null;

// ─── CACHE — simpan data agar tidak query ulang ──────────────
const cache = {};
function clearCache() { Object.keys(cache).forEach(k => delete cache[k]); }
async function cachedQuery(key, table, options) {
    if (cache[key]) return cache[key];
    const data = await sb.query(table, options);
    cache[key] = data;
    return data;
}
function invalidate(...keys) { keys.forEach(k => delete cache[k]); }

// ─── HELPER ──────────────────────────────────────────────────
function today() { return new Date().toISOString().slice(0, 10); }

// ─── Langsung tampilkan login (tidak ada welcome screen) ─────
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('canvas-login')?.classList.remove('hidden');
});

function fillDemo(user, pass) {
    document.getElementById('login-username').value = user;
    document.getElementById('login-password').value = pass;
}

// ============================================================
//  AUTENTIKASI
// ============================================================
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('btn-login');
    btn.disabled = true; btn.innerText = 'Memuat...';

    try {
        const users = await sb.query('users', { select:'id,username,role,nama,email', eq:{ username, password } });
        if (!users || users.length === 0) {
            showToast('Username atau kata sandi salah.', 'error');
            btn.disabled = false; btn.innerText = 'Masuk ke Sistem';
            return;
        }
        const user = users[0];
        let profil = null;
        if (user.role === 'siswa') {
            const data = await sb.query('siswa', { select:'*', eq:{ username: user.username } });
            profil = data[0] || { username: user.username, nama: user.nama };
        } else if (user.role === 'guru') {
            const data = await sb.query('guru', { select:'*', eq:{ username: user.username } });
            profil = data[0] || { username: user.username, nama: user.nama };
        } else {
            profil = { username: user.username, nama: user.nama, email: user.email };
        }
        currentUser = { role: user.role, username: user.username, profil };
        clearCache();
        document.getElementById('canvas-login').classList.add('hidden');
        const app = document.getElementById('canvas-app');
        app.classList.remove('hidden');
        initDashboard();
        showToast('Masuk sebagai ' + user.role.toUpperCase());
    } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false; btn.innerText = 'Masuk ke Sistem';
    }
}

function logout() {
    currentUser = null;
    clearCache();
    document.getElementById('canvas-app').classList.add('hidden');
    const login = document.getElementById('canvas-login');
    login.classList.remove('hidden');
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    const btn = document.getElementById('btn-login');
    if (btn) { btn.disabled = false; btn.innerText = 'Masuk ke Sistem'; }
    showToast('Berhasil keluar dari sistem.');
}

// ============================================================
//  DASHBOARD
// ============================================================
function initDashboard() {
    const p = currentUser.profil;
    document.getElementById('user-role-badge').innerText  = currentUser.role.toUpperCase();
    document.getElementById('sidebar-username').innerText = p?.nama || currentUser.username;
    document.getElementById('sidebar-email').innerText    = p?.email || currentUser.username + '@smkiptek.sch.id';
    renderSidebar(currentUser.role);
    const def = { siswa:'dashboard', guru:'dashboard', admin:'dashboard' };
    navigate(def[currentUser.role]);
}

// ─── ICONS ───────────────────────────────────────────────────
const ICONS = {
    status:     `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5.121 17.804A9 9 0 1118.88 6.196M15 11l-3 3-1.5-1.5"/></svg>`,
    absen:      `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
    jurnal:     `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
    nilai:      `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
    kelompok:   `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
    validasi:   `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9"/></svg>`,
    pengumuman: `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>`,
    usulan:     `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`,
    master:     `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2l9 4.5V12c0 5.25-3.75 9-9 10.5C6.75 21 3 17.25 3 12V6.5L12 2z"/></svg>`,
    plotting:   `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><path d="M7 10v4h4"/></svg>`,
    dokumen:    `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    usulan_admin: `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
    plus:       `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`,
    spinner:    `<svg class="w-5 h-5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>`
};

function navBtn(target, label, active) {
    const isActive = target === active;
    const base = "w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-3";
    const cls  = isActive ? `${base} bg-[#111111] text-white` : `${base} hover:bg-gray-100 text-gray-700`;
    return `<button onclick="navigate('${target}')" class="${cls}" data-target="${target}">${ICONS[target]||''}<span>${label}</span></button>`;
}

function renderSidebar(role) {
    const menu = document.getElementById('sidebar-menu');
    let html = '';
    if (role==='siswa')  html = navBtn('status','Status PKL Saya','')+navBtn('absen','Absensi Harian','')+navBtn('jurnal','Jurnal Kegiatan','')+navBtn('nilai','Nilai Akhir','')+navBtn('pengumuman','Papan Pengumuman','');
    if (role==='guru')   html = navBtn('kelompok','Kelompok Siswa','')+navBtn('validasi','Validasi Jurnal','')+navBtn('pengumuman','Papan Pengumuman','')+navBtn('usulan','Usulan Tempat PT','');
    if (role==='admin')  html = navBtn('master','Master Data & Akun','')+navBtn('plotting','Manajemen Kelompok','')+navBtn('usulan_admin','Kelola Usulan PT','')+navBtn('dokumen','Cetak Berkas / PDF','');
    menu.innerHTML = html;
}

// ============================================================
//  ROUTER
// ============================================================
async function navigate(target) {
    currentView = target;
    document.querySelectorAll('#sidebar-menu button').forEach(b => {
        const a = b.getAttribute('data-target') === target;
        b.classList.toggle('bg-[#111111]',a); b.classList.toggle('text-white',a);
        b.classList.toggle('hover:bg-gray-100',!a); b.classList.toggle('text-gray-700',!a);
    });
    const titleEl=document.getElementById('page-title'), subEl=document.getElementById('page-subtitle');
    const content=document.getElementById('main-content-view'), actionSlot=document.getElementById('header-action-slot');
    actionSlot.innerHTML=''; content.innerHTML=loadingHTML(); content.classList.add('fade-in');
    const role=currentUser.role, u=currentUser.username;

    try {
        // ── SISWA ────────────────────────────────────────────
        if (role==='siswa') {
            if (target==='status') {
                titleEl.innerText="Status PKL Saya"; subEl.innerText="Informasi penempatan dan pembimbing magang";
                const data = await sb.query('siswa',{select:'*',eq:{username:u}});
                renderStatusSiswa(content, data[0]||{});
            }
            else if (target==='absen') {
                titleEl.innerText="Absensi Harian PKL"; subEl.innerText="Catat kehadiran harian";
                const siswaData = await sb.query('siswa',{select:'id',eq:{username:u}});
                const siswaId = siswaData[0]?.id;
                const riwayat = siswaId ? await sb.query('absensi',{select:'*',eq:{siswa_id:siswaId},order:'tanggal.desc'}) : [];
                renderAbsensi(content, riwayat, siswaId);
            }
            else if (target==='jurnal') {
                titleEl.innerText="Jurnal Aktivitas PKL"; subEl.innerText="Catat pekerjaan harian untuk dinilai guru";
                actionSlot.innerHTML=btnPrimary("openModalJurnal()",ICONS.plus+" Tulis Jurnal");
                const siswaData = await cachedQuery('siswa_'+u,'siswa',{select:'id',eq:{username:u}});
                const siswaId = siswaData[0]?.id;
                const data = siswaId ? await sb.query('jurnal',{select:'*',eq:{siswa_id:siswaId},order:'tanggal.desc'}) : [];
                renderJurnal(content, data);
            }
            else if (target==='nilai') {
                titleEl.innerText="Hasil Penilaian PKL"; subEl.innerText="Rekapitulasi nilai akhir dari pembimbing";
                const data = await sb.query('nilai',{select:'*',eq:{username:u}});
                renderNilai(content, data[0]||null);
            }
            else if (target==='pengumuman') {
                titleEl.innerText="Papan Pengumuman"; subEl.innerText="Informasi dan instruksi dari guru pembimbing";
                const data = await cachedQuery('pengumuman','pengumuman',{select:'*',order:'created_at.desc'});
                renderPengumumanSiswa(content, data);
            }
        }
        // ── GURU ─────────────────────────────────────────────
        else if (role==='guru') {
            if (target==='kelompok') {
                titleEl.innerText="Kelompok Siswa Bimbingan"; subEl.innerText="Pantau progres setiap kelompok";
                const namaGuru = currentUser.profil?.nama || u;
                const [kelompokList, semuaAnggota] = await Promise.all([
                    cachedQuery('kelompok_guru_'+namaGuru,'kelompok',{select:'*',eq:{guru:namaGuru},order:'created_at'}),
                    cachedQuery('kelompok_anggota_all','kelompok_anggota',{select:'*'})
                ]);
                kelompokList.forEach(k => {
                    k.kelompok_anggota = semuaAnggota.filter(a => a.kelompok_id === k.id);
                });
                renderKelompokGuru(content, kelompokList);
            }
            else if (target==='validasi') {
                titleEl.innerText="Validasi Jurnal Siswa"; subEl.innerText="Tinjau jurnal harian siswa bimbingan";
                const data = await sb.query('jurnal',{select:'*',eq:{status:'Pending'},order:'created_at'});
                invalidate('jurnal_pending');
                renderValidasiJurnal(content, data);
            }
            else if (target==='pengumuman') {
                titleEl.innerText="Papan Pengumuman"; subEl.innerText="Kelola pengumuman untuk siswa";
                actionSlot.innerHTML=btnPrimary("openModalPengumuman()",ICONS.pengumuman+" Buat Pengumuman");
                const data = await cachedQuery('pengumuman','pengumuman',{select:'*',order:'created_at.desc'});
                renderPengumuman(content, data);
            }
            else if (target==='usulan') {
                titleEl.innerText="Usulan Tempat Industri"; subEl.innerText="Ajukan mitra DUDI kepada Admin";
                actionSlot.innerHTML=btnPrimary("openModalUsulanPT()",ICONS.plus+" Ajukan Usulan");
                const namaGuru = currentUser.profil?.nama || u;
                const data = await sb.query('usulan_pt',{select:'*',eq:{guru:namaGuru},order:'created_at.desc'});
                renderUsulan(content, data);
            }
        }
        // ── ADMIN ─────────────────────────────────────────────
        else if (role==='admin') {
            if (target==='master') {
                titleEl.innerText="Master Data & Manajemen Akun"; subEl.innerText="Kelola data siswa, guru, dan mitra industri";
                actionSlot.innerHTML=`<div class="flex gap-2">
                    ${btnPrimary("openModalImportCSV()",'<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> Import CSV')}
                    ${btnPrimary("openModalTambahAkun()",ICONS.plus+" Tambah Akun")}
                </div>`;
                const [siswas,gurus] = await Promise.all([
                    cachedQuery('all_siswa','siswa',{select:'*',order:'nama'}),
                    cachedQuery('all_guru','guru',{select:'*',order:'nama'})
                ]);
                renderMasterData(content, siswas, gurus);
            }
            else if (target==='plotting') {
                titleEl.innerText="Manajemen Kelompok & Penempatan"; subEl.innerText="Tentukan kelompok siswa, guru, dan lokasi PT";
                actionSlot.innerHTML=btnPrimary("openModalBuatKelompok()",ICONS.plus+" Buat Kelompok");
                const [kelList, anggotaAll] = await Promise.all([
                    cachedQuery('all_kelompok','kelompok',{select:'*',order:'created_at'}),
                    cachedQuery('kelompok_anggota_all','kelompok_anggota',{select:'*'})
                ]);
                kelList.forEach(k => {
                    k.kelompok_anggota = anggotaAll.filter(a => a.kelompok_id === k.id);
                });
                renderPlotting(content, kelList);
            }
            else if (target==='dokumen') {
                titleEl.innerText="Pusat Cetak Berkas & Legalitas"; subEl.innerText="Cetak surat pengantar dan sertifikat";
                renderDokumen(content);
            }
            else if (target==='usulan_admin') {
                titleEl.innerText="Kelola Usulan Tempat PT"; subEl.innerText="Tinjau dan proses usulan mitra industri dari guru";
                const data = await sb.query('usulan_pt',{select:'*',order:'created_at.desc'});
                renderUsulanAdmin(content, data);
            }
        }
    } catch(err) { content.innerHTML=errHTML(err.message); }
}

// ============================================================
//  RENDER HELPERS
// ============================================================
function loadingHTML() { return `<div class="flex items-center justify-center py-20 text-gray-400 gap-3">${ICONS.spinner}<span class="text-sm">Memuat data...</span></div>`; }
function errHTML(msg)  { return `<div class="p-8 text-center border border-red-100 rounded-2xl text-red-500 text-sm bg-red-50">${msg}</div>`; }
function emptyHTML(msg){ return `<div class="p-10 text-center border border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm">${msg}</div>`; }
function btnPrimary(onclick,label){ return `<button onclick="${onclick}" class="inline-flex items-center gap-2 px-4 py-2.5 bg-[#111111] text-white text-xs uppercase tracking-wider rounded-xl hover:bg-gray-800 transition-all">${label}</button>`; }
function badge(text,color){ const m={green:'bg-green-50 text-green-700',red:'bg-red-50 text-red-700',yellow:'bg-yellow-50 text-yellow-700',gray:'bg-gray-100 text-gray-500'}; return `<span class="px-2.5 py-1 text-xs rounded-full font-medium ${m[color]||m.gray}">${text}</span>`; }
function predikat(n){ if(!n)return'-'; if(n>=90)return'Sangat Memuaskan (A)'; if(n>=80)return'Memuaskan (B)'; if(n>=70)return'Cukup (C)'; return'Perlu Perbaikan (D)'; }

// ── SISWA ────────────────────────────────────────────────────
function renderStatusSiswa(el, d) {
    const belum = !d.pt || d.pt==='-' || d.status_penempatan==='Belum Ditetapkan';
    el.innerHTML=`<div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-6 shadow-sm">
        <div class="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
            <h3 class="font-bold text-lg">Informasi Penempatan</h3>
            ${badge(d.status_penempatan||'Belum Ditetapkan', belum?'yellow':'green')}
        </div>
        ${belum?emptyHTML('Penempatan PKL belum ditetapkan. Hubungi admin.'):`
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div class="space-y-4">
                <div><span class="text-xs uppercase text-gray-400 block mb-0.5">Nama Lengkap</span><strong>${d.nama}</strong></div>
                <div><span class="text-xs uppercase text-gray-400 block mb-0.5">Kelas</span>${d.kelas||'-'}</div>
                <div><span class="text-xs uppercase text-gray-400 block mb-0.5">Tempat PKL</span><span class="font-semibold">${d.pt}</span></div>
                <div><span class="text-xs uppercase text-gray-400 block mb-0.5">Alamat Industri</span>${d.alamat_pt}</div>
            </div>
            <div class="space-y-4">
                <div><span class="text-xs uppercase text-gray-400 block mb-0.5">Kontak PIC DUDI</span>${d.pic_pt}</div>
                <div><span class="text-xs uppercase text-gray-400 block mb-0.5">Guru Pembimbing</span>${d.guru}</div>
                <div><span class="text-xs uppercase text-gray-400 block mb-0.5">Pembimbing Industri</span>${d.pembimbing_industri}</div>
            </div>
        </div>`}
    </div>`;
}

function renderAbsensi(el, riwayat, siswaId) {
    const rows = riwayat.length ? riwayat.map(a=>`
        <div class="flex justify-between items-center py-2.5 border-b border-gray-100 text-sm">
            <span class="text-gray-600">${a.tanggal}</span>
            ${badge(a.status, a.status==='Hadir'?'green':a.status==='Sakit'?'red':'yellow')}
        </div>`).join('') : '<p class="text-gray-400 text-sm py-4 text-center">Belum ada riwayat kehadiran.</p>';
    el.innerHTML=`<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-6 shadow-sm">
            <h3 class="font-bold text-lg mb-5">Check-in Hari Ini</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-xs uppercase tracking-wider text-gray-500 mb-2">Status Kehadiran</label>
                    <select id="absen-status" class="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">
                        <option value="Hadir">Hadir (Masuk Kerja)</option>
                        <option value="Sakit">Sakit (Lampirkan Surat)</option>
                        <option value="Izin">Izin (Keperluan Mendesak)</option>
                    </select>
                </div>
                <div class="p-4 border border-dashed border-gray-300 rounded-xl text-center bg-gray-50 text-xs text-gray-400">Lokasi & Waktu Terverifikasi</div>
                <button onclick="submitAbsen('${siswaId}')" class="w-full py-3 bg-[#111111] text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2">${ICONS.absen} Kirim Absensi Sekarang</button>
            </div>
        </div>
        <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-6 shadow-sm">
            <h3 class="font-bold text-lg mb-4">Riwayat Kehadiran</h3>${rows}
        </div>
    </div>`;
}

function renderJurnal(el, data) {
    const rows = data.length ? data.map(j=>`
        <tr class="border-b border-gray-100 hover:bg-gray-50/50">
            <td class="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">${j.tanggal}</td>
            <td class="py-3 px-4 text-sm whitespace-nowrap">${j.durasi}</td>
            <td class="py-3 px-4 text-sm">${j.kegiatan}</td>
            <td class="py-3 px-4 whitespace-nowrap">${badge(j.status, j.status==='Disetujui'?'green':j.status==='Revisi'?'red':'yellow')}</td>
            <td class="py-3 px-4 text-sm text-gray-500">${j.catatan}</td>
        </tr>`).join('') : `<tr><td colspan="5" class="py-8 text-center text-gray-400 text-sm">Belum ada jurnal.</td></tr>`;
    el.innerHTML=`<div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto"><table class="w-full text-left">
            <thead class="bg-gray-50/80 border-b border-gray-200"><tr class="text-xs uppercase text-gray-400">
                <th class="py-3 px-4 font-semibold">Tanggal</th><th class="py-3 px-4 font-semibold">Durasi</th>
                <th class="py-3 px-4 font-semibold">Rincian Aktivitas</th><th class="py-3 px-4 font-semibold">Status</th>
                <th class="py-3 px-4 font-semibold">Catatan Guru</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table></div>
    </div>`;
}

function renderNilai(el, n) {
    if (!n || n.nilai_sekolah===null) { el.innerHTML=emptyHTML('Nilai belum diinput oleh Guru Pembimbing.'); return; }
    el.innerHTML=`<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-6 shadow-sm text-center">
            <div class="text-xs uppercase text-gray-400 mb-2">Nilai Pembimbing Sekolah</div>
            <div class="text-5xl font-bold my-3">${n.nilai_sekolah??'-'}</div>
            <div class="text-xs text-gray-500">Skala 0 – 100</div>
        </div>
        <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-6 shadow-sm text-center">
            <div class="text-xs uppercase text-gray-400 mb-2">Nilai Pembimbing Industri</div>
            <div class="text-5xl font-bold my-3">${n.nilai_industri??'-'}</div>
            <div class="text-xs text-gray-500">Skala 0 – 100</div>
        </div>
        <div class="bg-[#111111] text-white rounded-2xl p-6 shadow-sm text-center">
            <div class="text-xs uppercase text-gray-300 mb-2">Nilai Akhir Final</div>
            <div class="text-5xl font-bold my-3">${n.nilai_akhir??'-'}</div>
            <div class="text-xs text-gray-300">${predikat(n.nilai_akhir)}</div>
        </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-6 shadow-sm">
            <div class="text-xs uppercase text-gray-400 mb-2">Ulasan Guru Sekolah</div>
            <p class="text-sm text-gray-700">${n.catatan_sekolah||'-'}</p>
        </div>
        <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-6 shadow-sm">
            <div class="text-xs uppercase text-gray-400 mb-2">Ulasan Pembimbing Industri</div>
            <p class="text-sm text-gray-700">${n.catatan_industri||'-'}</p>
        </div>
    </div>`;
}

// ── GURU ─────────────────────────────────────────────────────
function renderKelompokGuru(el, data) {
    if (!data.length) { el.innerHTML=emptyHTML('Belum ada kelompok yang ditugaskan.'); return; }
    el.innerHTML=`<div class="grid grid-cols-1 md:grid-cols-2 gap-6">${data.map(k=>`
        <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-6 shadow-sm">
            <div class="flex justify-between items-start mb-3">
                <div><h3 class="font-bold text-base">${k.pt}</h3><p class="text-xs text-gray-400 mt-0.5">${k.alamat||'-'}</p></div>
                <span class="text-xs bg-gray-100 px-2 py-1 rounded-full">${(k.kelompok_anggota||[]).length} Siswa</span>
            </div>
            <div class="text-xs text-gray-500 mb-4">Ketua: <span class="font-medium text-gray-700">${k.ketua}</span></div>
            <button onclick="bukaDetailKelompok('${k.id}')" class="inline-flex items-center gap-1.5 px-3 py-2 bg-[#111111] text-white text-xs rounded-xl hover:bg-gray-800">
                ${ICONS.kelompok} Buka Kelompok
            </button>
        </div>`).join('')}</div>`;
}

function renderValidasiJurnal(el, data) {
    const rows = data.length ? data.map(j=>`
        <tr class="border-b border-gray-100 hover:bg-gray-50/50">
            <td class="py-3 px-4 text-sm font-medium">${j.username}</td>
            <td class="py-3 px-4 text-sm text-gray-600">${j.tanggal}</td>
            <td class="py-3 px-4 text-sm">${j.kegiatan}</td>
            <td class="py-3 px-4 whitespace-nowrap"><div class="flex gap-2">
                <button onclick="validasiJurnal('${j.id}','Disetujui')" class="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700">Setujui</button>
                <button onclick="openModalRevisi('${j.id}','${j.username}')" class="px-3 py-1.5 border border-red-300 text-red-600 text-xs rounded-lg hover:bg-red-50">Revisi</button>
            </div></td>
        </tr>`).join('') : `<tr><td colspan="4" class="py-8 text-center text-gray-400 text-sm">Tidak ada jurnal yang perlu ditinjau.</td></tr>`;
    el.innerHTML=`<div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto"><table class="w-full text-left">
            <thead class="bg-gray-50/80 border-b border-gray-200"><tr class="text-xs uppercase text-gray-400">
                <th class="py-3 px-4 font-semibold">Siswa</th><th class="py-3 px-4 font-semibold">Tanggal</th>
                <th class="py-3 px-4 font-semibold">Rincian Aktivitas</th><th class="py-3 px-4 font-semibold">Aksi</th>
            </tr></thead><tbody>${rows}</tbody>
        </table></div>
    </div>`;
}

function renderPengumuman(el, data) {
    if (!data.length) { el.innerHTML=emptyHTML('Belum ada pengumuman.'); return; }
    el.innerHTML=`<div class="space-y-4">${data.map(p=>`
        <div class="p-5 bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl shadow-sm">
            <div class="flex justify-between items-center mb-2">
                <span class="text-xs text-gray-400">${p.tanggal}</span>
                <span class="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">${p.penulis}</span>
            </div>
            <p class="text-sm text-gray-700">${p.isi}</p>
        </div>`).join('')}</div>`;
}

function renderUsulan(el, data) {
    if (!data.length) { el.innerHTML=emptyHTML('Belum ada usulan yang diajukan.'); return; }
    el.innerHTML=`<div class="space-y-4">${data.map(u=>`
        <div class="p-5 bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl shadow-sm flex justify-between items-start">
            <div>
                <div class="font-semibold text-sm">${u.nama_pt}</div>
                <div class="text-xs text-gray-500 mt-0.5">${u.alamat} · ${u.bidang}</div>
                <div class="text-xs text-gray-400 mt-1">${u.tanggal}</div>
            </div>
            ${badge(u.status, u.status==='Diterima'?'green':u.status==='Ditolak'?'red':'yellow')}
        </div>`).join('')}</div>`;
}

// ── ADMIN ─────────────────────────────────────────────────────
function renderMasterData(el, siswas, gurus) {
    const totalPT = [...new Set(siswas.map(s=>s.pt).filter(p=>p&&p!=='-'))].length;
    const siswaRows = siswas.length ? siswas.map(s=>`
        <tr class="border-b border-gray-100 hover:bg-gray-50/50 text-sm">
            <td class="py-3 px-4 font-medium">${s.nama}</td>
            <td class="py-3 px-4 text-gray-500">${s.kelas||'-'}</td>
            <td class="py-3 px-4">${s.pt}</td>
            <td class="py-3 px-4">${badge(s.status_penempatan, s.status_penempatan==='Ditetapkan'?'green':'yellow')}</td>
            <td class="py-3 px-4"><button onclick="openModalEditSiswa('${s.username}')" class="text-xs text-blue-600 hover:underline">Edit</button></td>
        </tr>`).join('') : `<tr><td colspan="5" class="py-8 text-center text-gray-400 text-sm">Belum ada data siswa.</td></tr>`;
    el.innerHTML=`
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-6 shadow-sm"><div class="text-xs uppercase text-gray-400 mb-1">Total Siswa</div><div class="text-4xl font-bold">${siswas.length}</div></div>
            <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-6 shadow-sm"><div class="text-xs uppercase text-gray-400 mb-1">Guru Pembimbing</div><div class="text-4xl font-bold">${gurus.length}</div></div>
            <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-6 shadow-sm"><div class="text-xs uppercase text-gray-400 mb-1">Mitra Industri (DUDI)</div><div class="text-4xl font-bold">${totalPT}</div></div>
        </div>
        <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div class="p-5 border-b border-gray-100 flex justify-between items-center">
                <h3 class="font-bold">Daftar Siswa</h3>
                <input type="text" oninput="filterSiswa(this.value)" placeholder="Cari nama siswa..." class="px-3 py-2 border border-gray-200 rounded-xl text-xs w-52 focus:outline-none focus:border-black">
            </div>
            <div class="overflow-x-auto"><table class="w-full text-left">
                <thead class="bg-gray-50/80 border-b border-gray-200"><tr class="text-xs uppercase text-gray-400">
                    <th class="py-3 px-4 font-semibold">Nama</th><th class="py-3 px-4 font-semibold">Kelas</th>
                    <th class="py-3 px-4 font-semibold">Tempat PKL</th><th class="py-3 px-4 font-semibold">Status</th><th class="py-3 px-4 font-semibold">Aksi</th>
                </tr></thead>
                <tbody id="tbody-siswa">${siswaRows}</tbody>
            </table></div>
        </div>`;
}

function renderPlotting(el, data) {
    if (!data.length) { el.innerHTML=emptyHTML('Belum ada kelompok. Tekan Buat Kelompok untuk mulai.'); return; }
    el.innerHTML=`<div class="space-y-4">${data.map(k=>`
        <div class="p-5 bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl shadow-sm flex justify-between items-center">
            <div>
                <div class="font-bold text-base">${k.pt}</div>
                <div class="text-xs text-gray-500 mt-1">Guru: ${k.guru} · Ketua: ${k.ketua} · ${(k.kelompok_anggota||[]).length} Siswa</div>
            </div>
            <button onclick="showToast('Surat pengantar kelompok dicetak.')" class="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-xs rounded-xl hover:border-black">
                ${ICONS.dokumen} Cetak Surat
            </button>
        </div>`).join('')}</div>`;
}

// ── RENDER KHUSUS SISWA: Pengumuman (read-only) ──────────────
function renderPengumumanSiswa(el, data) {
    if (!data.length) { el.innerHTML=emptyHTML('Belum ada pengumuman dari guru pembimbing.'); return; }
    el.innerHTML=`<div class="space-y-4">${data.map(p=>`
        <div class="p-5 bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl shadow-sm">
            <div class="flex justify-between items-center mb-3">
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 bg-[#111111] rounded-full flex items-center justify-center text-white">${ICONS.pengumuman}</div>
                    <span class="text-sm font-semibold">${p.penulis}</span>
                </div>
                <span class="text-xs text-gray-400">${p.tanggal}</span>
            </div>
            <p class="text-sm text-gray-700 leading-relaxed">${p.isi}</p>
        </div>`).join('')}</div>`;
}

// ── RENDER ADMIN: Kelola Usulan PT ───────────────────────────
function renderUsulanAdmin(el, data) {
    if (!data.length) { el.innerHTML=emptyHTML('Belum ada usulan PT dari guru.'); return; }
    const rows = data.map(u=>`
        <tr class="border-b border-gray-100 hover:bg-gray-50/50 text-sm">
            <td class="py-3 px-4 font-medium">${u.nama_pt}</td>
            <td class="py-3 px-4 text-gray-600">${u.guru}</td>
            <td class="py-3 px-4 text-gray-500">${u.alamat}</td>
            <td class="py-3 px-4">${u.bidang}</td>
            <td class="py-3 px-4">${u.tanggal}</td>
            <td class="py-3 px-4">${badge(u.status, u.status==='Diterima'?'green':u.status==='Ditolak'?'red':'yellow')}</td>
            <td class="py-3 px-4 whitespace-nowrap">
                ${u.status==='Menunggu'?`
                <div class="flex gap-2">
                    <button onclick="prosesUsulan('${u.id}','Diterima')" class="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700">Terima</button>
                    <button onclick="prosesUsulan('${u.id}','Ditolak')" class="px-3 py-1.5 border border-red-300 text-red-600 text-xs rounded-lg hover:bg-red-50">Tolak</button>
                </div>`:'<span class="text-xs text-gray-400">Sudah diproses</span>'}
            </td>
        </tr>`).join('');
    el.innerHTML=`<div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto"><table class="w-full text-left">
            <thead class="bg-gray-50/80 border-b border-gray-200"><tr class="text-xs uppercase text-gray-400">
                <th class="py-3 px-4 font-semibold">Nama PT</th>
                <th class="py-3 px-4 font-semibold">Diajukan Guru</th>
                <th class="py-3 px-4 font-semibold">Alamat</th>
                <th class="py-3 px-4 font-semibold">Bidang</th>
                <th class="py-3 px-4 font-semibold">Tanggal</th>
                <th class="py-3 px-4 font-semibold">Status</th>
                <th class="py-3 px-4 font-semibold">Aksi</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table></div>
    </div>`;
}

function renderDokumen(el) {
    el.innerHTML=`<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div class="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">${ICONS.dokumen}</div>
            <h3 class="font-bold text-lg">Surat Pengantar PKL</h3>
            <p class="text-xs text-gray-500">Cetak surat resmi sekolah untuk diserahkan ke HRD perusahaan mitra.</p>
            <button onclick="showToast('Fitur PDF aktif setelah integrasi penuh.')" class="inline-flex items-center gap-2 px-4 py-2.5 bg-[#111111] text-white text-xs uppercase tracking-wider rounded-xl hover:bg-gray-800">${ICONS.dokumen} Unduh PDF</button>
        </div>
        <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div class="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">${ICONS.nilai}</div>
            <h3 class="font-bold text-lg">Sertifikat Kelulusan PKL</h3>
            <p class="text-xs text-gray-500">Generate sertifikat magang massal untuk seluruh siswa yang lulus evaluasi.</p>
            <button onclick="showToast('Sertifikat digenerate setelah nilai diinput.')" class="inline-flex items-center gap-2 px-4 py-2.5 bg-[#111111] text-white text-xs uppercase tracking-wider rounded-xl hover:bg-gray-800">${ICONS.nilai} Generate Sertifikat</button>
        </div>
    </div>`;
}

// ============================================================
//  AKSI SISWA
// ============================================================
async function submitAbsen(siswaId) {
    const status = document.getElementById('absen-status').value;
    try {
        await sb.insert('absensi', { siswa_id: siswaId, username: currentUser.username, tanggal: today(), status });
        showToast('Absensi ' + status + ' berhasil dicatat.');
        navigate('absen');
    } catch(err) { showToast(err.message,'error'); }
}

function openModalJurnal() {
    openModal(`<div class="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 border border-gray-200">
        <h3 class="font-bold text-lg flex items-center gap-2">${ICONS.jurnal} Tulis Jurnal Aktivitas</h3>
        <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Tanggal</label>
        <input type="date" id="j-tgl" value="${today()}" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
        <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Durasi Kerja</label>
        <input type="text" id="j-durasi" placeholder="Contoh: 8 Jam" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
        <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Rincian Aktivitas</label>
        <textarea id="j-kegiatan" placeholder="Deskripsikan kegiatan hari ini..." class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm h-24 focus:outline-none focus:border-black resize-none"></textarea></div>
        <div class="flex justify-end gap-2 pt-2">
            <button onclick="closeModal()" class="px-4 py-2 border border-gray-200 text-sm rounded-xl hover:border-black">Batal</button>
            <button onclick="saveJurnal()" class="px-4 py-2 bg-[#111111] text-white text-sm rounded-xl hover:bg-gray-800">Simpan Jurnal</button>
        </div>
    </div>`);
}

async function saveJurnal() {
    const tgl=document.getElementById('j-tgl').value, durasi=document.getElementById('j-durasi').value.trim(), kegiatan=document.getElementById('j-kegiatan').value.trim();
    if (!durasi||!kegiatan) { showToast('Semua kolom wajib diisi.','error'); return; }
    try {
        const siswaData = await cachedQuery('siswa_'+currentUser.username,'siswa',{select:'id',eq:{username:currentUser.username}});
        const siswaId = siswaData[0]?.id;
        await sb.insert('jurnal',{siswa_id:siswaId, username:currentUser.username, tanggal:tgl||today(), durasi, kegiatan, status:'Pending', catatan:'Menunggu tinjauan guru'});
        closeModal(); showToast('Jurnal berhasil ditambahkan.'); navigate('jurnal');
    } catch(err) { showToast(err.message,'error'); }
}

// ============================================================
//  AKSI GURU
// ============================================================
async function validasiJurnal(id, status) {
    try {
        await sb.update('jurnal',{status, catatan: status==='Disetujui'?'Jurnal disetujui oleh guru.':undefined},{id});
        showToast('Jurnal → '+status); navigate('validasi');
    } catch(err) { showToast(err.message,'error'); }
}

function openModalRevisi(id, siswa) {
    openModal(`<div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 border border-gray-200">
        <h3 class="font-bold text-lg">Berikan Catatan Revisi</h3>
        <p class="text-sm text-gray-500">Siswa: <strong>${siswa}</strong></p>
        <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Catatan untuk Siswa</label>
        <textarea id="rev-catatan" placeholder="Tulis instruksi perbaikan..." class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm h-24 focus:outline-none focus:border-black resize-none"></textarea></div>
        <div class="flex justify-end gap-2">
            <button onclick="closeModal()" class="px-4 py-2 border border-gray-200 text-sm rounded-xl hover:border-black">Batal</button>
            <button onclick="simpanRevisi('${id}')" class="px-4 py-2 bg-red-600 text-white text-sm rounded-xl hover:bg-red-700">Kirim Revisi</button>
        </div>
    </div>`);
}

async function simpanRevisi(id) {
    const catatan=document.getElementById('rev-catatan').value.trim();
    if (!catatan) { showToast('Catatan revisi wajib diisi.','error'); return; }
    try {
        await sb.update('jurnal',{status:'Revisi',catatan},{id});
        closeModal(); showToast('Catatan revisi berhasil dikirim.'); navigate('validasi');
    } catch(err) { showToast(err.message,'error'); }
}

function openModalPengumuman() {
    openModal(`<div class="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 border border-gray-200">
        <h3 class="font-bold text-lg flex items-center gap-2">${ICONS.pengumuman} Buat Pengumuman</h3>
        <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Isi Pengumuman</label>
        <textarea id="p-isi" placeholder="Tulis instruksi untuk kelompok..." class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm h-28 focus:outline-none focus:border-black resize-none"></textarea></div>
        <div class="flex justify-end gap-2">
            <button onclick="closeModal()" class="px-4 py-2 border border-gray-200 text-sm rounded-xl hover:border-black">Batal</button>
            <button onclick="savePengumuman()" class="px-4 py-2 bg-[#111111] text-white text-sm rounded-xl hover:bg-gray-800">Publikasikan</button>
        </div>
    </div>`);
}

async function savePengumuman() {
    const isi=document.getElementById('p-isi').value.trim();
    if (!isi) return;
    try {
        await sb.insert('pengumuman',{penulis:currentUser.profil?.nama||currentUser.username, isi, tanggal:today()});
        invalidate('pengumuman');
        closeModal(); showToast('Pengumuman berhasil dipublikasikan.'); navigate('pengumuman');
    } catch(err) { showToast(err.message,'error'); }
}

function openModalUsulanPT() {
    openModal(`<div class="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 border border-gray-200">
        <h3 class="font-bold text-lg flex items-center gap-2">${ICONS.usulan} Usulan Tempat Industri</h3>
        <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Nama Perusahaan</label><input type="text" id="u-nama" placeholder="PT / CV ..." class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
        <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Alamat</label><input type="text" id="u-alamat" placeholder="Jl. ..." class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
        <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Bidang Kerja</label><input type="text" id="u-bidang" placeholder="TI, Otomotif, dll." class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
        <div class="flex justify-end gap-2">
            <button onclick="closeModal()" class="px-4 py-2 border border-gray-200 text-sm rounded-xl hover:border-black">Batal</button>
            <button onclick="saveUsulanPT()" class="px-4 py-2 bg-[#111111] text-white text-sm rounded-xl hover:bg-gray-800">Ajukan</button>
        </div>
    </div>`);
}

async function saveUsulanPT() {
    const nama=document.getElementById('u-nama').value.trim(), alamat=document.getElementById('u-alamat').value.trim(), bidang=document.getElementById('u-bidang').value.trim();
    if (!nama||!alamat||!bidang) { showToast('Semua kolom wajib diisi.','error'); return; }
    try {
        await sb.insert('usulan_pt',{guru:currentUser.profil?.nama||currentUser.username, nama_pt:nama, alamat, bidang, tanggal:today(), status:'Menunggu'});
        closeModal(); showToast('Usulan PT '+nama+' berhasil diajukan.'); navigate('usulan');
    } catch(err) { showToast(err.message,'error'); }
}

// ============================================================
//  AKSI ADMIN
// ============================================================
function openModalTambahAkun() {
    openModal(`<div class="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 border border-gray-200">
        <h3 class="font-bold text-lg">Tambah Akun Baru</h3>
        <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Peran (Role)</label>
        <select id="a-role" onchange="toggleFormAkun(this.value)" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">
            <option value="siswa">Siswa</option><option value="guru">Guru Pembimbing</option>
        </select></div>
        <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Nama Lengkap</label><input type="text" id="a-nama" placeholder="Nama lengkap" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
        <div id="form-siswa-extra" class="space-y-3">
            <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Kelas</label><input type="text" id="a-kelas" placeholder="XI TKJ 1" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
            <div><label class="block text-xs uppercase text-gray-500 mb-1.5">NIS</label><input type="text" id="a-nis" placeholder="Nomor Induk Siswa" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
        </div>
        <div id="form-guru-extra" class="hidden space-y-3">
            <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Email</label><input type="email" id="a-email" placeholder="email@sekolah.id" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
        </div>
        <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Username</label><input type="text" id="a-username" placeholder="username unik" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
            <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Password</label><input type="text" id="a-password" placeholder="password" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
        </div>
        <div class="flex justify-end gap-2 pt-2">
            <button onclick="closeModal()" class="px-4 py-2 border border-gray-200 text-sm rounded-xl hover:border-black">Batal</button>
            <button onclick="saveAkunBaru()" class="px-4 py-2 bg-[#111111] text-white text-sm rounded-xl hover:bg-gray-800">Simpan Akun</button>
        </div>
    </div>`);
}

function toggleFormAkun(role) {
    document.getElementById('form-siswa-extra').classList.toggle('hidden', role!=='siswa');
    document.getElementById('form-guru-extra').classList.toggle('hidden',  role!=='guru');
}

async function saveAkunBaru() {
    const role=document.getElementById('a-role').value, nama=document.getElementById('a-nama').value.trim();
    const username=document.getElementById('a-username').value.trim().toLowerCase(), password=document.getElementById('a-password').value.trim();
    if (!nama||!username||!password) { showToast('Nama, username, dan password wajib diisi.','error'); return; }
    try {
        await sb.insert('users',{username,password,role,nama, email:username+'@smkiptek.sch.id'});
        if (role==='siswa') {
            const kelas=document.getElementById('a-kelas').value.trim(), nis=document.getElementById('a-nis').value.trim();
            const u=await sb.query('users',{select:'id',eq:{username},single:true});
            const s=await sb.insert('siswa',{user_id:u?.id, username, nama, kelas, nis, status_penempatan:'Belum Ditetapkan', pt:'-', alamat_pt:'-', pic_pt:'-', guru:'-', pembimbing_industri:'-'});
            await sb.insert('nilai',{siswa_id:s?.id, username});
        } else {
            const email=document.getElementById('a-email').value.trim();
            const u=await sb.query('users',{select:'id',eq:{username},single:true});
            await sb.insert('guru',{user_id:u?.id, username, nama, email:email||username+'@smkiptek.sch.id'});
        }
        invalidate('all_siswa','all_guru');
        closeModal(); showToast('Akun '+nama+' ('+role+') berhasil dibuat.'); navigate('master');
    } catch(err) { showToast(err.message,'error'); }
}

async function openModalEditSiswa(username) {
    try {
        const data=await sb.query('siswa',{select:'*',eq:{username}});
        const s=data[0]||{}; const nData=await sb.query('nilai',{select:'*',eq:{username}}); const n=nData[0]||{};
        openModal(`<div class="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 border border-gray-200 max-h-[85vh] overflow-y-auto">
            <h3 class="font-bold text-lg">Edit Data Siswa: ${s.nama}</h3>
            <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2"><label class="block text-xs uppercase text-gray-500 mb-1.5">Nama Lengkap</label><input type="text" id="e-nama" value="${s.nama||''}" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
                <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Kelas</label><input type="text" id="e-kelas" value="${s.kelas||''}" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
                <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Status</label>
                    <select id="e-status" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">
                        <option ${s.status_penempatan==='Belum Ditetapkan'?'selected':''}>Belum Ditetapkan</option>
                        <option ${s.status_penempatan==='Ditetapkan'?'selected':''}>Ditetapkan</option>
                    </select>
                </div>
                <div class="col-span-2"><label class="block text-xs uppercase text-gray-500 mb-1.5">Nama PT</label><input type="text" id="e-pt" value="${s.pt||''}" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
                <div class="col-span-2"><label class="block text-xs uppercase text-gray-500 mb-1.5">Alamat Industri</label><input type="text" id="e-alamat" value="${s.alamat_pt||''}" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
                <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Kontak PIC DUDI</label><input type="text" id="e-pic" value="${s.pic_pt||''}" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
                <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Guru Pembimbing</label><input type="text" id="e-guru" value="${s.guru||''}" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
                <div class="col-span-2"><label class="block text-xs uppercase text-gray-500 mb-1.5">Pembimbing Industri</label><input type="text" id="e-pembimbing" value="${s.pembimbing_industri||''}" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
            </div>
            <div class="border-t border-gray-100 pt-4">
                <h4 class="text-xs uppercase text-gray-400 mb-3">Input Nilai Akhir</h4>
                <div class="grid grid-cols-3 gap-3">
                    <div><label class="block text-xs text-gray-500 mb-1">Nilai Sekolah</label><input type="number" id="e-n-sekolah" min="0" max="100" value="${n.nilai_sekolah??''}" placeholder="0-100" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
                    <div><label class="block text-xs text-gray-500 mb-1">Nilai Industri</label><input type="number" id="e-n-industri" min="0" max="100" value="${n.nilai_industri??''}" placeholder="0-100" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
                    <div><label class="block text-xs text-gray-500 mb-1">Nilai Akhir</label><input type="number" id="e-n-akhir" min="0" max="100" value="${n.nilai_akhir??''}" placeholder="0-100" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
                </div>
                <div class="mt-3 grid grid-cols-2 gap-3">
                    <div><label class="block text-xs text-gray-500 mb-1">Catatan Sekolah</label><textarea id="e-cat-sekolah" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs h-16 focus:outline-none focus:border-black resize-none">${n.catatan_sekolah||''}</textarea></div>
                    <div><label class="block text-xs text-gray-500 mb-1">Catatan Industri</label><textarea id="e-cat-industri" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs h-16 focus:outline-none focus:border-black resize-none">${n.catatan_industri||''}</textarea></div>
                </div>
            </div>
            <div class="flex justify-end gap-2 pt-2">
                <button onclick="closeModal()" class="px-4 py-2 border border-gray-200 text-sm rounded-xl hover:border-black">Batal</button>
                <button onclick="saveEditSiswa('${username}')" class="px-4 py-2 bg-[#111111] text-white text-sm rounded-xl hover:bg-gray-800">Simpan Perubahan</button>
            </div>
        </div>`);
    } catch(err) { showToast(err.message,'error'); }
}

async function saveEditSiswa(username) {
    try {
        await sb.update('siswa',{
            nama:document.getElementById('e-nama').value.trim(),
            kelas:document.getElementById('e-kelas').value.trim(),
            status_penempatan:document.getElementById('e-status').value,
            pt:document.getElementById('e-pt').value.trim(),
            alamat_pt:document.getElementById('e-alamat').value.trim(),
            pic_pt:document.getElementById('e-pic').value.trim(),
            guru:document.getElementById('e-guru').value.trim(),
            pembimbing_industri:document.getElementById('e-pembimbing').value.trim()
        },{username});
        await sb.upsert('nilai',{
            username,
            nilai_sekolah:   parseInt(document.getElementById('e-n-sekolah').value)||null,
            nilai_industri:  parseInt(document.getElementById('e-n-industri').value)||null,
            nilai_akhir:     parseInt(document.getElementById('e-n-akhir').value)||null,
            catatan_sekolah: document.getElementById('e-cat-sekolah').value.trim(),
            catatan_industri:document.getElementById('e-cat-industri').value.trim()
        },'username');
        invalidate('all_siswa','siswa_'+username);
        closeModal(); showToast('Data siswa berhasil diperbarui.'); navigate('master');
    } catch(err) { showToast(err.message,'error'); }
}

async function openModalBuatKelompok() {
    const [siswas,gurus] = await Promise.all([sb.query('siswa',{select:'nama,kelas',order:'nama'}), sb.query('guru',{select:'nama',order:'nama'})]);
    const opsiGuru  = gurus.length  ? gurus.map(g=>`<option value="${g.nama}">${g.nama}</option>`).join('')  : '<option value="">Belum ada guru</option>';
    const opsiSiswa = siswas.length ? siswas.map(s=>`<option value="${s.nama}">${s.nama} (${s.kelas||'-'})</option>`).join('') : '<option value="">Belum ada siswa</option>';
    openModal(`<div class="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 border border-gray-200 max-h-[85vh] overflow-y-auto">
        <h3 class="font-bold text-lg">Buat Kelompok PKL Baru</h3>
        <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Nama PT</label><input type="text" id="k-pt" placeholder="Nama perusahaan" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
        <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Alamat PT</label><input type="text" id="k-alamat" placeholder="Alamat lengkap" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
        <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Guru Pembimbing</label><select id="k-guru" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">${opsiGuru}</select></div>
        <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Ketua Kelompok</label><select id="k-ketua" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">${opsiSiswa}</select></div>
        <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Anggota (Ctrl/Cmd untuk pilih banyak)</label><select id="k-anggota" multiple class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black h-28">${opsiSiswa}</select></div>
        <div class="flex justify-end gap-2 pt-2">
            <button onclick="closeModal()" class="px-4 py-2 border border-gray-200 text-sm rounded-xl hover:border-black">Batal</button>
            <button onclick="saveKelompok()" class="px-4 py-2 bg-[#111111] text-white text-sm rounded-xl hover:bg-gray-800">Buat Kelompok</button>
        </div>
    </div>`);
}

async function saveKelompok() {
    const pt=document.getElementById('k-pt').value.trim(), alamat=document.getElementById('k-alamat').value.trim();
    const guru=document.getElementById('k-guru').value, ketua=document.getElementById('k-ketua').value;
    const anggota=Array.from(document.getElementById('k-anggota').selectedOptions).map(o=>o.value);
    if (!pt||!guru||!ketua) { showToast('PT, Guru, dan Ketua wajib dipilih.','error'); return; }
    try {
        const k = await sb.insert('kelompok',{pt, alamat, guru, ketua});
        for (const nama of anggota) {
            const siswaData = await sb.query('siswa',{select:'kelas',eq:{nama}});
            await sb.insert('kelompok_anggota',{kelompok_id:k.id, siswa_nama:nama, siswa_kelas:siswaData[0]?.kelas||'-', status_absen:'-'});
            await sb.update('siswa',{status_penempatan:'Ditetapkan', pt, alamat_pt:alamat, guru},{nama});
        }
        invalidate('all_kelompok','kelompok_anggota_all','all_siswa',
            'kelompok_guru_'+(currentUser.profil?.nama||currentUser.username));
        closeModal(); showToast('Kelompok di '+pt+' berhasil dibuat.'); navigate('plotting');
    } catch(err) { showToast(err.message,'error'); }
}

async function bukaDetailKelompok(id) {
    try {
        const anggota = await sb.query('kelompok_anggota',{select:'*',eq:{kelompok_id:id}});
        const kelData = await sb.query('kelompok',{select:'*',eq:{id}});
        const k = kelData[0]||{};

        // Ambil absensi hari ini untuk setiap anggota kelompok
        const absensiHariIni = await sb.query('absensi',{select:'username,status',eq:{tanggal:today()}});
        const absenMap = {};
        absensiHariIni.forEach(a => { absenMap[a.username] = a.status; });

        // Ambil username siswa berdasarkan nama
        const namaList = anggota.map(a=>a.siswa_nama);
        const siswaProfiles = namaList.length ? await sb.query('siswa',{select:'nama,username',order:'nama'}) : [];
        const namaToUsername = {};
        siswaProfiles.forEach(s => { namaToUsername[s.nama] = s.username; });

        const rows = anggota.map(a=>{
            const username = namaToUsername[a.siswa_nama] || '';
            const statusAbsen = absenMap[username] || '-';
            const absenColor = statusAbsen==='Hadir'?'green':statusAbsen==='Sakit'?'red':statusAbsen==='Izin'?'yellow':'gray';
            return `
            <div class="p-3.5 border border-gray-100 rounded-xl flex justify-between items-center text-sm hover:bg-gray-50">
                <div><div class="font-medium">${a.siswa_nama}</div><div class="text-xs text-gray-400">${a.siswa_kelas||'-'}</div></div>
                <div class="flex items-center gap-2">
                    ${badge('Absen: '+statusAbsen, absenColor)}
                    <button onclick="openInputNilaiModal('${a.siswa_nama}')" class="px-3 py-1.5 bg-[#111111] text-white text-xs rounded-lg hover:bg-gray-800">Input Nilai</button>
                </div>
            </div>`;
        }).join('');
        openModal(`<div class="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-gray-200 max-h-[85vh] overflow-y-auto">
            <div class="flex justify-between items-center pb-4 mb-4 border-b border-gray-100">
                <div><h3 class="font-bold text-lg">${k.pt}</h3><p class="text-xs text-gray-400 mt-0.5">Guru: ${k.guru} · Ketua: ${k.ketua}</p></div>
                <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-400">Absensi: ${today()}</span>
                    <button onclick="closeModal()" class="text-xs uppercase px-3 py-1.5 border border-gray-200 rounded-xl hover:border-black">Tutup</button>
                </div>
            </div>
            <div class="space-y-2">${rows||'<p class="text-center text-sm text-gray-400 py-4">Belum ada anggota.</p>'}</div>
        </div>`);
    } catch(err) { showToast(err.message,'error'); }
}

async function openInputNilaiModal(namaSiswa) {
    try {
        const sData=await sb.query('siswa',{select:'username',eq:{nama:namaSiswa}});
        const username=sData[0]?.username;
        if (!username) { showToast('Data siswa tidak ditemukan.'); return; }
        const nData=await sb.query('nilai',{select:'*',eq:{username}}); const n=nData[0]||{};
        openModal(`<div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 border border-gray-200">
            <h3 class="font-bold text-lg">Input Nilai: ${namaSiswa}</h3>
            <div class="grid grid-cols-3 gap-3">
                <div><label class="block text-xs text-gray-500 mb-1">Nilai Sekolah</label><input type="number" id="in-sekolah" min="0" max="100" value="${n.nilai_sekolah??''}" placeholder="0-100" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
                <div><label class="block text-xs text-gray-500 mb-1">Nilai Industri</label><input type="number" id="in-industri" min="0" max="100" value="${n.nilai_industri??''}" placeholder="0-100" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
                <div><label class="block text-xs text-gray-500 mb-1">Nilai Akhir</label><input type="number" id="in-akhir" min="0" max="100" value="${n.nilai_akhir??''}" placeholder="0-100" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
            </div>
            <div><label class="block text-xs text-gray-500 mb-1">Catatan Guru Sekolah</label><textarea id="in-cat-sekolah" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs h-16 focus:outline-none focus:border-black resize-none">${n.catatan_sekolah||''}</textarea></div>
            <div><label class="block text-xs text-gray-500 mb-1">Catatan Industri</label><textarea id="in-cat-industri" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs h-16 focus:outline-none focus:border-black resize-none">${n.catatan_industri||''}</textarea></div>
            <div class="flex justify-end gap-2 pt-2">
                <button onclick="closeModal()" class="px-4 py-2 border border-gray-200 text-sm rounded-xl hover:border-black">Batal</button>
                <button onclick="saveInputNilai('${username}')" class="px-4 py-2 bg-[#111111] text-white text-sm rounded-xl hover:bg-gray-800">Simpan Nilai</button>
            </div>
        </div>`);
    } catch(err) { showToast(err.message,'error'); }
}

async function saveInputNilai(username) {
    try {
        await sb.upsert('nilai',{
            username,
            nilai_sekolah:   parseInt(document.getElementById('in-sekolah').value)||null,
            nilai_industri:  parseInt(document.getElementById('in-industri').value)||null,
            nilai_akhir:     parseInt(document.getElementById('in-akhir').value)||null,
            catatan_sekolah: document.getElementById('in-cat-sekolah').value.trim(),
            catatan_industri:document.getElementById('in-cat-industri').value.trim()
        },'username');
        closeModal(); showToast('Nilai berhasil disimpan.');
    } catch(err) { showToast(err.message,'error'); }
}

// Proses usulan PT dari guru (admin)
async function prosesUsulan(id, status) {
    try {
        await sb.update('usulan_pt', {status}, {id});
        showToast('Usulan PT ' + status + '.');
        navigate('usulan_admin');
    } catch(err) { showToast(err.message,'error'); }
}

// ============================================================
//  IMPORT CSV MASSAL SISWA
// ============================================================

// Download template CSV
function downloadTemplateCSV() {
    const header = 'NAMA,KELAS,NIS,USERNAME';
    const contoh = [
        'Ahmad Fauzi,XI TKJ 1,23101,ahmad01',
        'Siti Rahma,XI TKJ 1,23102,siti02',
        'Dimas Anggara,XI TKJ 2,23103,dimas03'
    ].join('\n');
    const blob = new Blob([header + '\n' + contoh], {type:'text/csv;charset=utf-8;'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'template_import_siswa.csv';
    a.click(); URL.revokeObjectURL(url);
    showToast('Template CSV berhasil diunduh.');
}

// Buka modal import CSV
function openModalImportCSV() {
    openModal(`
    <div class="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto space-y-5">
        <div>
            <h3 class="font-bold text-lg">Import Siswa dari CSV</h3>
            <p class="text-xs text-gray-500 mt-1">Upload file CSV berisi data siswa. Password otomatis diisi dari NIS masing-masing siswa.</p>
        </div>

        <!-- Info format -->
        <div class="bg-gray-50 rounded-xl p-4 text-xs space-y-1 border border-gray-200">
            <div class="font-semibold text-gray-600 mb-2">Format kolom CSV yang diperlukan:</div>
            <div class="grid grid-cols-4 gap-2 text-center">
                <div class="bg-white border border-gray-200 rounded-lg py-2 font-mono font-bold">NAMA</div>
                <div class="bg-white border border-gray-200 rounded-lg py-2 font-mono font-bold">KELAS</div>
                <div class="bg-white border border-gray-200 rounded-lg py-2 font-mono font-bold">NIS</div>
                <div class="bg-white border border-gray-200 rounded-lg py-2 font-mono font-bold">USERNAME</div>
            </div>
            <p class="text-gray-400 mt-2">Password otomatis = NIS siswa. Contoh: NIS 23101 → password: 23101</p>
        </div>

        <!-- Download template -->
        <button onclick="downloadTemplateCSV()" class="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-black hover:text-black transition-all flex items-center justify-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Download Template CSV
        </button>

        <!-- Upload area -->
        <div>
            <label class="block text-xs uppercase text-gray-500 mb-2">Upload File CSV</label>
            <div class="relative">
                <input type="file" id="csv-file" accept=".csv" onchange="previewCSV(this)"
                    class="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 cursor-pointer hover:border-black transition-all file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-black file:text-white">
            </div>
        </div>

        <!-- Preview area -->
        <div id="csv-preview" class="hidden">
            <div class="flex justify-between items-center mb-3">
                <div class="text-sm font-semibold">Preview Data <span id="csv-count" class="text-xs font-normal text-gray-500"></span></div>
                <div id="csv-warning" class="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-lg hidden"></div>
            </div>
            <div class="border border-gray-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table class="w-full text-left text-xs">
                    <thead class="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <tr class="text-gray-400 uppercase">
                            <th class="py-2 px-3">Nama</th>
                            <th class="py-2 px-3">Kelas</th>
                            <th class="py-2 px-3">NIS</th>
                            <th class="py-2 px-3">Username</th>
                            <th class="py-2 px-3">Password</th>
                            <th class="py-2 px-3">Status</th>
                        </tr>
                    </thead>
                    <tbody id="csv-preview-tbody"></tbody>
                </table>
            </div>
        </div>

        <!-- Progress bar -->
        <div id="import-progress-wrap" class="hidden">
            <div class="flex justify-between text-xs text-gray-500 mb-1">
                <span>Mengimpor data...</span>
                <span id="import-progress-text">0%</span>
            </div>
            <div class="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div id="import-progress-bar" class="bg-[#111111] h-full transition-all duration-300" style="width:0%"></div>
            </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
            <button onclick="closeModal()" id="csv-btn-batal" class="px-4 py-2 border border-gray-200 text-sm rounded-xl hover:border-black">Batal</button>
            <button onclick="jalankanImportCSV()" id="csv-btn-import" class="hidden px-4 py-2 bg-[#111111] text-white text-sm rounded-xl hover:bg-gray-800 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                Import Semua
            </button>
        </div>
    </div>`);
}

// Variabel global untuk menyimpan data CSV yang sudah di-parse
let csvDataParsed = [];

// Parse dan preview CSV
function previewCSV(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);

        if (lines.length < 2) {
            showToast('File CSV kosong atau tidak valid.', 'error');
            return;
        }

        // Deteksi header (baris pertama)
        const header = lines[0].toLowerCase().replace(/\s/g,'');
        const isValidHeader = header.includes('nama') && header.includes('nis');
        const dataLines = isValidHeader ? lines.slice(1) : lines;

        csvDataParsed = [];
        const tbody = document.getElementById('csv-preview-tbody');
        tbody.innerHTML = '';

        // Ambil username yang sudah ada di database untuk cek duplikat
        sb.query('users', {select:'username'}).then(existingUsers => {
            const existingUsernames = new Set(existingUsers.map(u => u.username.toLowerCase()));
            let dupCount = 0;

            dataLines.forEach((line, i) => {
                if (!line) return;
                const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g,''));
                if (cols.length < 3) return;

                const nama     = cols[0] || '';
                const kelas    = cols[1] || '';
                const nis      = cols[2] || '';
                const username = (cols[3] || nis || 'siswa' + (i+1)).toLowerCase().replace(/\s/g,'');
                const password = nis || 'pkl2026';

                if (!nama || !nis) return;

                const isDuplikat = existingUsernames.has(username);
                if (isDuplikat) dupCount++;

                csvDataParsed.push({ nama, kelas, nis, username, password, isDuplikat });

                const tr = document.createElement('tr');
                tr.className = 'border-b border-gray-100 ' + (isDuplikat ? 'bg-yellow-50' : '');
                tr.innerHTML = `
                    <td class="py-2 px-3 font-medium">${nama}</td>
                    <td class="py-2 px-3 text-gray-500">${kelas}</td>
                    <td class="py-2 px-3">${nis}</td>
                    <td class="py-2 px-3 font-mono text-xs">${username}</td>
                    <td class="py-2 px-3 font-mono text-xs text-gray-400">${password}</td>
                    <td class="py-2 px-3">${isDuplikat
                        ? '<span class="text-yellow-600 text-xs">⚠ Username ada</span>'
                        : '<span class="text-green-600 text-xs">✓ Siap import</span>'}</td>`;
                tbody.appendChild(tr);
            });

            // Tampilkan preview
            document.getElementById('csv-preview').classList.remove('hidden');
            const totalBaru = csvDataParsed.filter(d => !d.isDuplikat).length;
            document.getElementById('csv-count').innerText =
                `${csvDataParsed.length} baris ditemukan · ${totalBaru} siap diimpor · ${dupCount} duplikat dilewati`;

            if (dupCount > 0) {
                const warn = document.getElementById('csv-warning');
                warn.innerText = `${dupCount} username sudah ada, akan dilewati`;
                warn.classList.remove('hidden');
            }

            if (totalBaru > 0) {
                document.getElementById('csv-btn-import').classList.remove('hidden');
            }
        }).catch(err => showToast(err.message, 'error'));
    };
    reader.readAsText(file, 'UTF-8');
}

// Jalankan import ke Supabase
async function jalankanImportCSV() {
    const dataBaru = csvDataParsed.filter(d => !d.isDuplikat);
    if (!dataBaru.length) { showToast('Tidak ada data baru untuk diimpor.', 'error'); return; }

    // Sembunyikan tombol, tampilkan progress
    document.getElementById('csv-btn-import').classList.add('hidden');
    document.getElementById('csv-btn-batal').disabled = true;
    document.getElementById('import-progress-wrap').classList.remove('hidden');

    const bar  = document.getElementById('import-progress-bar');
    const text = document.getElementById('import-progress-text');

    let berhasil = 0, gagal = 0;

    for (let i = 0; i < dataBaru.length; i++) {
        const d = dataBaru[i];
        try {
            // 1. Insert ke tabel users
            await sb.insert('users', {
                username: d.username,
                password: d.password,
                role:     'siswa',
                nama:     d.nama,
                email:    d.username + '@smkiptek.sch.id'
            });

            // 2. Insert ke tabel siswa
            const userRes = await sb.query('users', {select:'id', eq:{username: d.username}});
            const userId  = userRes[0]?.id;

            const siswaRes = await sb.insert('siswa', {
                user_id:           userId,
                username:          d.username,
                nama:              d.nama,
                kelas:             d.kelas,
                nis:               d.nis,
                status_penempatan: 'Belum Ditetapkan',
                pt:                '-',
                alamat_pt:         '-',
                pic_pt:            '-',
                guru:              '-',
                pembimbing_industri: '-'
            });

            // 3. Insert record nilai kosong
            await sb.insert('nilai', {
                siswa_id: siswaRes?.id,
                username: d.username
            });

            berhasil++;
        } catch(err) {
            gagal++;
            console.warn('Gagal import:', d.nama, err.message);
        }

        // Update progress bar
        const pct = Math.round(((i + 1) / dataBaru.length) * 100);
        bar.style.width  = pct + '%';
        text.innerText   = pct + '%';
    }

    // Selesai
    setTimeout(() => {
        closeModal();
        showToast(`Import selesai: ${berhasil} berhasil${gagal > 0 ? `, ${gagal} gagal` : ''}.`);
        navigate('master');
    }, 500);
}

function filterSiswa(q) {
    document.querySelectorAll('#tbody-siswa tr').forEach(tr => {
        tr.style.display = tr.innerText.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
    });
}

// ============================================================
//  MODAL & TOAST
// ============================================================
function openModal(html) {
    const m=document.getElementById('modal-container');
    m.innerHTML=html; m.classList.remove('hidden');
}
function closeModal() {
    const m=document.getElementById('modal-container');
    m.classList.add('hidden'); m.innerHTML='';
}
document.addEventListener('DOMContentLoaded',()=>{
    document.getElementById('modal-container')?.addEventListener('click',function(e){ if(e.target===this)closeModal(); });
});

function showToast(msg, type='info') {
    const c=document.getElementById('toast-container');
    const t=document.createElement('div');
    t.className=`${type==='error'?'bg-red-600':'bg-[#111111]'} text-white px-5 py-3 rounded-xl text-xs font-medium shadow-xl backdrop-blur-md flex items-center gap-3 fade-in`;
    t.innerHTML=`<span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(()=>{ t.style.transition='opacity 0.3s'; t.style.opacity='0'; setTimeout(()=>t.remove(),300); },3500);
}
