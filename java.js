// ============================================================
//  SISTEM MONITORING PKL — SMK IPTEK TANGSEL
//  Frontend — semua data dari Vercel API → Supabase PostgreSQL
// ============================================================

// ─── STATE ──────────────────────────────────────────────────
let currentUser  = null;   // { role, username, profil }
let currentView  = null;

// ─── API BASE (otomatis sesuai environment) ──────────────────
const API = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : '/api';

// ─── FETCH HELPER ───────────────────────────────────────────
async function api(path, method = 'GET', body = null) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);
    try {
        const res  = await fetch(API + path, opts);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Server error');
        return json;
    } catch (err) {
        throw err;
    }
}

// ─── HELPER: tanggal hari ini ────────────────────────────────
function today() {
    return new Date().toISOString().slice(0, 10);
}

// ============================================================
//  WELCOME ANIMATION
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
    let progress = 0;
    const bar = document.getElementById('welcome-progress');
    const interval = setInterval(() => {
        progress += 4;
        if (bar) bar.style.width = progress + '%';
        if (progress >= 100) {
            clearInterval(interval);
            skipWelcome();
        }
    }, 80);
});

function skipWelcome() {
    const welcome = document.getElementById('canvas-welcome');
    const login   = document.getElementById('canvas-login');
    if (welcome) {
        welcome.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => welcome.style.display = 'none', 500);
    }
    if (login) { login.classList.remove('hidden'); login.classList.add('fade-in'); }
}

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

    showLoading(true);
    try {
        const result = await api('/auth', 'POST', { username, password });
        currentUser = { role: result.user.role, username: result.user.username, profil: result.profil };

        document.getElementById('canvas-login').classList.add('hidden');
        const app = document.getElementById('canvas-app');
        app.classList.remove('hidden');
        app.classList.add('fade-in');
        initDashboard();
        showToast("Berhasil masuk sebagai " + result.user.role.toUpperCase());
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        showLoading(false);
    }
}

function logout() {
    currentUser = null;
    document.getElementById('canvas-app').classList.add('hidden');
    const login = document.getElementById('canvas-login');
    login.classList.remove('hidden');
    login.classList.add('fade-in');
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    showToast("Berhasil keluar dari sistem.");
}

// ============================================================
//  DASHBOARD INIT & SIDEBAR
// ============================================================
function initDashboard() {
    const p    = currentUser.profil;
    const role = currentUser.role;
    document.getElementById('user-role-badge').innerText   = role.toUpperCase();
    document.getElementById('sidebar-username').innerText  = p?.nama || currentUser.username;
    document.getElementById('sidebar-email').innerText     = p?.email || currentUser.username + '@smkiptek.sch.id';
    renderSidebar(role);
    const defaultView = { siswa: 'status', guru: 'kelompok', admin: 'master' };
    navigate(defaultView[role]);
}

// ─── IKON SVG ────────────────────────────────────────────────
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
    plus:       `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`,
    spinner:    `<svg class="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>`
};

function navBtn(target, label, active) {
    const isActive = target === active;
    const base = "w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-3";
    const cls  = isActive ? `${base} bg-[#111111] text-white` : `${base} hover:bg-gray-100 text-gray-700`;
    return `<button onclick="navigate('${target}')" class="${cls}" data-target="${target}">${ICONS[target] || ''}<span>${label}</span></button>`;
}

function renderSidebar(role) {
    const menu = document.getElementById('sidebar-menu');
    let html = '';
    if (role === 'siswa') {
        html = navBtn('status', 'Status PKL Saya', '')
             + navBtn('absen',  'Absensi Harian', '')
             + navBtn('jurnal', 'Jurnal Kegiatan', '')
             + navBtn('nilai',  'Nilai Akhir', '');
    } else if (role === 'guru') {
        html = navBtn('kelompok',   'Kelompok Siswa', '')
             + navBtn('validasi',   'Validasi Jurnal', '')
             + navBtn('pengumuman', 'Papan Pengumuman', '')
             + navBtn('usulan',     'Usulan Tempat PT', '');
    } else if (role === 'admin') {
        html = navBtn('master',   'Master Data & Akun', '')
             + navBtn('plotting', 'Manajemen Kelompok', '')
             + navBtn('dokumen',  'Cetak Berkas / PDF', '');
    }
    menu.innerHTML = html;
}

// ============================================================
//  ROUTER
// ============================================================
async function navigate(target) {
    currentView = target;

    document.querySelectorAll('#sidebar-menu button').forEach(b => {
        const a = b.getAttribute('data-target') === target;
        b.classList.toggle('bg-[#111111]', a);
        b.classList.toggle('text-white',   a);
        b.classList.toggle('hover:bg-gray-100', !a);
        b.classList.toggle('text-gray-700', !a);
    });

    const titleEl    = document.getElementById('page-title');
    const subEl      = document.getElementById('page-subtitle');
    const content    = document.getElementById('main-content-view');
    const actionSlot = document.getElementById('header-action-slot');
    actionSlot.innerHTML = '';
    content.innerHTML    = loadingHTML();
    content.classList.add('fade-in');

    const role = currentUser.role;
    const u    = currentUser.username;

    try {
        // ── SISWA ────────────────────────────────────────────
        if (role === 'siswa') {
            if (target === 'status') {
                titleEl.innerText = "Status PKL Saya";
                subEl.innerText   = "Informasi penempatan dan pembimbing magang";
                const d = await api('/siswa?u=' + u);
                renderStatusSiswa(content, d);
            }
            else if (target === 'absen') {
                titleEl.innerText = "Absensi Harian PKL";
                subEl.innerText   = "Catat kehadiran atau ajukan izin / sakit";
                const riwayat = await api('/absensi?u=' + u);
                renderAbsensi(content, riwayat);
            }
            else if (target === 'jurnal') {
                titleEl.innerText = "Jurnal Aktivitas PKL";
                subEl.innerText   = "Catat rincian pekerjaan harian untuk dinilai guru";
                actionSlot.innerHTML = btnPrimary("openModalJurnal()", ICONS.plus + " Tulis Jurnal");
                const data = await api('/jurnal?u=' + u);
                renderJurnal(content, data);
            }
            else if (target === 'nilai') {
                titleEl.innerText = "Hasil Penilaian PKL";
                subEl.innerText   = "Rekapitulasi nilai akhir dari pembimbing";
                const data = await api('/nilai?u=' + u);
                renderNilai(content, data);
            }
        }

        // ── GURU ─────────────────────────────────────────────
        else if (role === 'guru') {
            if (target === 'kelompok') {
                titleEl.innerText = "Kelompok Siswa Bimbingan";
                subEl.innerText   = "Pantau kehadiran dan progres setiap kelompok";
                const data = await api('/kelompok?guru=' + encodeURIComponent(currentUser.profil?.nama || u));
                renderKelompokGuru(content, data);
            }
            else if (target === 'validasi') {
                titleEl.innerText = "Validasi Jurnal Siswa";
                subEl.innerText   = "Tinjau dan berikan feedback pada jurnal harian siswa";
                const data = await api('/jurnal?pending=1');
                renderValidasiJurnal(content, data);
            }
            else if (target === 'pengumuman') {
                titleEl.innerText = "Papan Pengumuman";
                subEl.innerText   = "Kelola pengumuman untuk siswa bimbingan";
                actionSlot.innerHTML = btnPrimary("openModalPengumuman()", ICONS.pengumuman + " Buat Pengumuman");
                const data = await api('/pengumuman');
                renderPengumuman(content, data);
            }
            else if (target === 'usulan') {
                titleEl.innerText = "Usulan Tempat Industri";
                subEl.innerText   = "Ajukan rekomendasi mitra DUDI kepada Admin";
                actionSlot.innerHTML = btnPrimary("openModalUsulanPT()", ICONS.plus + " Ajukan Usulan");
                const data = await api('/usulan?guru=' + encodeURIComponent(currentUser.profil?.nama || u));
                renderUsulan(content, data);
            }
        }

        // ── ADMIN ─────────────────────────────────────────────
        else if (role === 'admin') {
            if (target === 'master') {
                titleEl.innerText = "Master Data & Manajemen Akun";
                subEl.innerText   = "Kelola data siswa, guru, dan mitra industri";
                actionSlot.innerHTML = btnPrimary("openModalTambahAkun()", ICONS.plus + " Tambah Akun");
                const [siswas, gurus] = await Promise.all([api('/siswa'), api('/guru')]);
                renderMasterData(content, siswas, gurus);
            }
            else if (target === 'plotting') {
                titleEl.innerText = "Manajemen Kelompok & Penempatan";
                subEl.innerText   = "Tentukan kelompok siswa, guru, dan lokasi PT";
                actionSlot.innerHTML = btnPrimary("openModalBuatKelompok()", ICONS.plus + " Buat Kelompok");
                const data = await api('/kelompok');
                renderPlotting(content, data);
            }
            else if (target === 'dokumen') {
                titleEl.innerText = "Pusat Cetak Berkas & Legalitas";
                subEl.innerText   = "Cetak surat pengantar dan sertifikat";
                renderDokumen(content);
            }
        }
    } catch (err) {
        content.innerHTML = errHTML(err.message);
    }
}

// ============================================================
//  RENDER HELPERS
// ============================================================
function loadingHTML() {
    return `<div class="flex items-center justify-center py-20 text-gray-400 gap-3">${ICONS.spinner}<span class="text-sm">Memuat data...</span></div>`;
}
function errHTML(msg) {
    return `<div class="p-8 text-center border border-red-100 rounded-2xl text-red-400 text-sm bg-red-50">${msg}</div>`;
}
function emptyHTML(msg) {
    return `<div class="p-10 text-center border border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm">${msg}</div>`;
}
function btnPrimary(onclick, label) {
    return `<button onclick="${onclick}" class="inline-flex items-center gap-2 px-4 py-2.5 bg-[#111111] text-white text-xs uppercase tracking-wider rounded-xl hover:bg-gray-800 transition-all">${label}</button>`;
}
function badge(text, color) {
    const map = { green: 'bg-green-50 text-green-700', red: 'bg-red-50 text-red-700', yellow: 'bg-yellow-50 text-yellow-700', gray: 'bg-gray-100 text-gray-500' };
    return `<span class="px-2.5 py-1 text-xs rounded-full font-medium ${map[color] || map.gray}">${text}</span>`;
}

// ── SISWA VIEWS ──────────────────────────────────────────────
function renderStatusSiswa(el, d) {
    const belum = d.status_penempatan === 'Belum Ditetapkan' || d.pt === '-';
    el.innerHTML = `
        <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-6 shadow-sm">
            <div class="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                <h3 class="font-bold text-lg">Informasi Penempatan</h3>
                ${badge(d.status_penempatan, belum ? 'yellow' : 'green')}
            </div>
            ${belum ? emptyHTML('Penempatan PKL belum ditetapkan. Hubungi guru atau admin.') : `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div class="space-y-4">
                    <div><span class="text-xs uppercase text-gray-400 block mb-0.5">Nama Lengkap</span><strong>${d.nama}</strong></div>
                    <div><span class="text-xs uppercase text-gray-400 block mb-0.5">Kelas</span>${d.kelas || '-'}</div>
                    <div><span class="text-xs uppercase text-gray-400 block mb-0.5">Tempat PKL</span><span class="font-semibold">${d.pt}</span></div>
                    <div><span class="text-xs uppercase text-gray-400 block mb-0.5">Alamat Industri</span><span class="text-gray-600">${d.alamat_pt}</span></div>
                </div>
                <div class="space-y-4">
                    <div><span class="text-xs uppercase text-gray-400 block mb-0.5">Kontak PIC DUDI</span>${d.pic_pt}</div>
                    <div><span class="text-xs uppercase text-gray-400 block mb-0.5">Guru Pembimbing Sekolah</span>${d.guru}</div>
                    <div><span class="text-xs uppercase text-gray-400 block mb-0.5">Pembimbing Lapangan (DUDI)</span>${d.pembimbing_industri}</div>
                </div>
            </div>`}
        </div>`;
}

function renderAbsensi(el, riwayat) {
    const rows = riwayat.length
        ? riwayat.map(a => `
            <div class="flex justify-between items-center py-2.5 border-b border-gray-100 text-sm">
                <span class="text-gray-600">${a.tanggal}</span>
                ${badge(a.status, a.status === 'Hadir' ? 'green' : a.status === 'Sakit' ? 'red' : 'yellow')}
            </div>`).join('')
        : '<p class="text-gray-400 text-sm py-4 text-center">Belum ada riwayat kehadiran.</p>';

    el.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <div class="p-4 border border-dashed border-gray-300 rounded-xl text-center bg-gray-50 text-xs text-gray-400">
                        ${ICONS.absen} &nbsp; Lokasi & Waktu Terverifikasi
                    </div>
                    <button onclick="submitAbsen()" class="w-full py-3 bg-[#111111] text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2">
                        ${ICONS.absen} Kirim Absensi Sekarang
                    </button>
                </div>
            </div>
            <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-6 shadow-sm">
                <h3 class="font-bold text-lg mb-4">Riwayat Kehadiran</h3>
                ${rows}
            </div>
        </div>`;
}

function renderJurnal(el, data) {
    const rows = data.length
        ? data.map(j => `
            <tr class="border-b border-gray-100 hover:bg-gray-50/50">
                <td class="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">${j.tanggal}</td>
                <td class="py-3 px-4 text-sm whitespace-nowrap">${j.durasi}</td>
                <td class="py-3 px-4 text-sm">${j.kegiatan}</td>
                <td class="py-3 px-4 whitespace-nowrap">${badge(j.status, j.status === 'Disetujui' ? 'green' : j.status === 'Revisi' ? 'red' : 'yellow')}</td>
                <td class="py-3 px-4 text-sm text-gray-500">${j.catatan}</td>
            </tr>`).join('')
        : `<tr><td colspan="5" class="py-8 text-center text-gray-400 text-sm">Belum ada jurnal. Tekan Tulis Jurnal untuk mulai mencatat.</td></tr>`;
    el.innerHTML = `
        <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead class="bg-gray-50/80 border-b border-gray-200">
                        <tr class="text-xs uppercase text-gray-400">
                            <th class="py-3 px-4 font-semibold">Tanggal</th>
                            <th class="py-3 px-4 font-semibold">Durasi</th>
                            <th class="py-3 px-4 font-semibold">Rincian Aktivitas</th>
                            <th class="py-3 px-4 font-semibold">Status</th>
                            <th class="py-3 px-4 font-semibold">Catatan Guru</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
}

function renderNilai(el, n) {
    if (!n || n.nilai_sekolah === null) {
        el.innerHTML = emptyHTML('Nilai belum diinput oleh Guru Pembimbing.');
        return;
    }
    el.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-6 shadow-sm text-center">
                <div class="text-xs uppercase text-gray-400 mb-2">Nilai Pembimbing Sekolah</div>
                <div class="text-5xl font-bold my-3">${n.nilai_sekolah ?? '-'}</div>
                <div class="text-xs text-gray-500">Skala 0 – 100</div>
            </div>
            <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-6 shadow-sm text-center">
                <div class="text-xs uppercase text-gray-400 mb-2">Nilai Pembimbing Industri</div>
                <div class="text-5xl font-bold my-3">${n.nilai_industri ?? '-'}</div>
                <div class="text-xs text-gray-500">Skala 0 – 100</div>
            </div>
            <div class="bg-[#111111] text-white rounded-2xl p-6 shadow-sm text-center">
                <div class="text-xs uppercase text-gray-300 mb-2">Nilai Akhir Final</div>
                <div class="text-5xl font-bold my-3">${n.nilai_akhir ?? '-'}</div>
                <div class="text-xs text-gray-300">${predikat(n.nilai_akhir)}</div>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-6 shadow-sm">
                <div class="text-xs uppercase text-gray-400 mb-2">Ulasan Guru Pembimbing Sekolah</div>
                <p class="text-sm text-gray-700">${n.catatan_sekolah || '-'}</p>
            </div>
            <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-6 shadow-sm">
                <div class="text-xs uppercase text-gray-400 mb-2">Ulasan Pembimbing Industri</div>
                <p class="text-sm text-gray-700">${n.catatan_industri || '-'}</p>
            </div>
        </div>`;
}

// ── GURU VIEWS ───────────────────────────────────────────────
function renderKelompokGuru(el, data) {
    if (!data.length) { el.innerHTML = emptyHTML('Belum ada kelompok yang ditugaskan. Hubungi Admin untuk melakukan plotting.'); return; }
    el.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6">${data.map(k => `
        <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-6 shadow-sm">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <h3 class="font-bold text-base">${k.pt}</h3>
                    <p class="text-xs text-gray-400 mt-0.5">${k.alamat || '-'}</p>
                </div>
                <span class="text-xs bg-gray-100 px-2 py-1 rounded-full">${(k.kelompok_anggota || []).length} Siswa</span>
            </div>
            <div class="text-xs text-gray-500 mb-4">Ketua: <span class="font-medium text-gray-700">${k.ketua}</span></div>
            <div class="flex gap-2">
                <button onclick="bukaDetailKelompok('${k.id}')" class="inline-flex items-center gap-1.5 px-3 py-2 bg-[#111111] text-white text-xs rounded-xl hover:bg-gray-800">
                    ${ICONS.kelompok} Buka Kelompok
                </button>
            </div>
        </div>`).join('')}</div>`;
}

function renderValidasiJurnal(el, data) {
    const rows = data.length
        ? data.map(j => `
            <tr class="border-b border-gray-100 hover:bg-gray-50/50">
                <td class="py-3 px-4 text-sm font-medium">${j.username}</td>
                <td class="py-3 px-4 text-sm text-gray-600">${j.tanggal}</td>
                <td class="py-3 px-4 text-sm">${j.kegiatan}</td>
                <td class="py-3 px-4 whitespace-nowrap">
                    <div class="flex gap-2">
                        <button onclick="validasiJurnal('${j.id}','Disetujui')" class="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700">Setujui</button>
                        <button onclick="openModalRevisi('${j.id}','${j.username}')" class="px-3 py-1.5 border border-red-300 text-red-600 text-xs rounded-lg hover:bg-red-50">Revisi</button>
                    </div>
                </td>
            </tr>`).join('')
        : `<tr><td colspan="4" class="py-8 text-center text-gray-400 text-sm">Tidak ada jurnal yang perlu ditinjau.</td></tr>`;
    el.innerHTML = `
        <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead class="bg-gray-50/80 border-b border-gray-200">
                        <tr class="text-xs uppercase text-gray-400">
                            <th class="py-3 px-4 font-semibold">Siswa</th>
                            <th class="py-3 px-4 font-semibold">Tanggal</th>
                            <th class="py-3 px-4 font-semibold">Rincian Aktivitas</th>
                            <th class="py-3 px-4 font-semibold">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
}

function renderPengumuman(el, data) {
    if (!data.length) { el.innerHTML = emptyHTML('Belum ada pengumuman. Tekan Buat Pengumuman untuk memulai.'); return; }
    el.innerHTML = `<div class="space-y-4">${data.map(p => `
        <div class="p-5 bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl shadow-sm">
            <div class="flex justify-between items-center mb-2">
                <span class="text-xs text-gray-400">${p.tanggal}</span>
                <span class="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">${p.penulis}</span>
            </div>
            <p class="text-sm text-gray-700">${p.isi}</p>
        </div>`).join('')}</div>`;
}

function renderUsulan(el, data) {
    if (!data.length) { el.innerHTML = emptyHTML('Belum ada usulan yang diajukan.'); return; }
    el.innerHTML = `<div class="space-y-4">${data.map(u => `
        <div class="p-5 bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl shadow-sm flex justify-between items-start">
            <div>
                <div class="font-semibold text-sm">${u.nama_pt}</div>
                <div class="text-xs text-gray-500 mt-0.5">${u.alamat} · ${u.bidang}</div>
                <div class="text-xs text-gray-400 mt-1">${u.tanggal}</div>
            </div>
            ${badge(u.status, u.status === 'Diterima' ? 'green' : u.status === 'Ditolak' ? 'red' : 'yellow')}
        </div>`).join('')}</div>`;
}

// ── ADMIN VIEWS ──────────────────────────────────────────────
function renderMasterData(el, siswas, gurus) {
    const totalPT = [...new Set(siswas.map(s => s.pt).filter(p => p !== '-'))].length;
    const siswaRows = siswas.length
        ? siswas.map(s => `
            <tr class="border-b border-gray-100 hover:bg-gray-50/50 text-sm">
                <td class="py-3 px-4 font-medium">${s.nama}</td>
                <td class="py-3 px-4 text-gray-500">${s.kelas || '-'}</td>
                <td class="py-3 px-4">${s.pt}</td>
                <td class="py-3 px-4">${badge(s.status_penempatan, s.status_penempatan === 'Ditetapkan' ? 'green' : 'yellow')}</td>
                <td class="py-3 px-4">
                    <button onclick="openModalEditSiswa('${s.username}')" class="text-xs text-blue-600 hover:underline">Edit</button>
                </td>
            </tr>`).join('')
        : `<tr><td colspan="5" class="py-8 text-center text-gray-400 text-sm">Belum ada data siswa.</td></tr>`;

    el.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-6 shadow-sm">
                <div class="text-xs uppercase text-gray-400 mb-1">Total Siswa</div>
                <div class="text-4xl font-bold">${siswas.length}</div>
            </div>
            <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-6 shadow-sm">
                <div class="text-xs uppercase text-gray-400 mb-1">Guru Pembimbing</div>
                <div class="text-4xl font-bold">${gurus.length}</div>
            </div>
            <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-6 shadow-sm">
                <div class="text-xs uppercase text-gray-400 mb-1">Mitra Industri (DUDI)</div>
                <div class="text-4xl font-bold">${totalPT}</div>
            </div>
        </div>
        <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div class="p-5 border-b border-gray-100 flex justify-between items-center">
                <h3 class="font-bold">Daftar Siswa</h3>
                <input type="text" oninput="filterSiswa(this.value)" placeholder="Cari nama siswa..." class="px-3 py-2 border border-gray-200 rounded-xl text-xs w-52 focus:outline-none focus:border-black">
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left" id="tabel-siswa">
                    <thead class="bg-gray-50/80 border-b border-gray-200">
                        <tr class="text-xs uppercase text-gray-400">
                            <th class="py-3 px-4 font-semibold">Nama</th>
                            <th class="py-3 px-4 font-semibold">Kelas</th>
                            <th class="py-3 px-4 font-semibold">Tempat PKL</th>
                            <th class="py-3 px-4 font-semibold">Status</th>
                            <th class="py-3 px-4 font-semibold">Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-siswa">${siswaRows}</tbody>
                </table>
            </div>
        </div>`;
}

function renderPlotting(el, data) {
    if (!data.length) { el.innerHTML = emptyHTML('Belum ada kelompok. Tekan Buat Kelompok untuk memulai plotting.'); return; }
    el.innerHTML = `<div class="space-y-4">${data.map(k => `
        <div class="p-5 bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl shadow-sm flex justify-between items-center">
            <div>
                <div class="font-bold text-base">${k.pt}</div>
                <div class="text-xs text-gray-500 mt-1">Guru: ${k.guru} · Ketua: ${k.ketua} · ${(k.kelompok_anggota || []).length} Siswa</div>
            </div>
            <button onclick="showToast('Surat pengantar kelompok dicetak.')" class="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-xs rounded-xl hover:border-black">
                ${ICONS.dokumen} Cetak Surat
            </button>
        </div>`).join('')}</div>`;
}

function renderDokumen(el) {
    el.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                <div class="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">${ICONS.dokumen}</div>
                <h3 class="font-bold text-lg">Surat Pengantar PKL</h3>
                <p class="text-xs text-gray-500">Cetak surat resmi sekolah untuk diserahkan ke HRD perusahaan mitra.</p>
                <button onclick="showToast('Fitur PDF akan aktif setelah integrasi backend.')" class="inline-flex items-center gap-2 px-4 py-2.5 bg-[#111111] text-white text-xs uppercase tracking-wider rounded-xl hover:bg-gray-800">
                    ${ICONS.dokumen} Unduh PDF Pengantar
                </button>
            </div>
            <div class="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                <div class="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">${ICONS.nilai}</div>
                <h3 class="font-bold text-lg">Sertifikat Kelulusan PKL</h3>
                <p class="text-xs text-gray-500">Generate sertifikat magang massal untuk seluruh siswa yang telah lulus evaluasi.</p>
                <button onclick="showToast('Sertifikat akan digenerate setelah semua nilai diinput.')" class="inline-flex items-center gap-2 px-4 py-2.5 bg-[#111111] text-white text-xs uppercase tracking-wider rounded-xl hover:bg-gray-800">
                    ${ICONS.nilai} Generate Sertifikat
                </button>
            </div>
        </div>`;
}

// ============================================================
//  AKSI SISWA
// ============================================================
async function submitAbsen() {
    const status = document.getElementById('absen-status').value;
    showLoading(true);
    try {
        await api('/absensi', 'POST', { username: currentUser.username, status });
        showToast("Absensi " + status + " berhasil dicatat.");
        navigate('absen');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        showLoading(false);
    }
}

function openModalJurnal() {
    openModal(`
        <div class="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 border border-gray-200">
            <h3 class="font-bold text-lg flex items-center gap-2">${ICONS.jurnal} Tulis Jurnal Aktivitas</h3>
            <div>
                <label class="block text-xs uppercase text-gray-500 mb-1.5">Tanggal</label>
                <input type="date" id="j-tgl" value="${today()}" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">
            </div>
            <div>
                <label class="block text-xs uppercase text-gray-500 mb-1.5">Durasi Kerja</label>
                <input type="text" id="j-durasi" placeholder="Contoh: 8 Jam" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">
            </div>
            <div>
                <label class="block text-xs uppercase text-gray-500 mb-1.5">Rincian Aktivitas</label>
                <textarea id="j-kegiatan" placeholder="Deskripsikan kegiatan hari ini..." class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm h-24 focus:outline-none focus:border-black resize-none"></textarea>
            </div>
            <div class="flex justify-end gap-2 pt-2">
                <button onclick="closeModal()" class="px-4 py-2 border border-gray-200 text-sm rounded-xl hover:border-black">Batal</button>
                <button onclick="saveJurnal()" class="px-4 py-2 bg-[#111111] text-white text-sm rounded-xl hover:bg-gray-800">Simpan Jurnal</button>
            </div>
        </div>`);
}

async function saveJurnal() {
    const tgl      = document.getElementById('j-tgl').value;
    const durasi   = document.getElementById('j-durasi').value.trim();
    const kegiatan = document.getElementById('j-kegiatan').value.trim();
    if (!durasi || !kegiatan) { showToast("Semua kolom wajib diisi.", "error"); return; }
    try {
        await api('/jurnal', 'POST', { username: currentUser.username, tanggal: tgl, durasi, kegiatan });
        closeModal();
        showToast("Jurnal berhasil ditambahkan.");
        navigate('jurnal');
    } catch (err) { showToast(err.message, 'error'); }
}

// ============================================================
//  AKSI GURU
// ============================================================
async function validasiJurnal(id, status) {
    try {
        await api('/jurnal', 'PUT', { id, status });
        showToast("Jurnal → " + status);
        navigate('validasi');
    } catch (err) { showToast(err.message, 'error'); }
}

function openModalRevisi(id, siswa) {
    openModal(`
        <div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 border border-gray-200">
            <h3 class="font-bold text-lg">Berikan Catatan Revisi</h3>
            <p class="text-sm text-gray-500">Siswa: <strong>${siswa}</strong></p>
            <div>
                <label class="block text-xs uppercase text-gray-500 mb-1.5">Catatan untuk Siswa</label>
                <textarea id="rev-catatan" placeholder="Tulis instruksi perbaikan..." class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm h-24 focus:outline-none focus:border-black resize-none"></textarea>
            </div>
            <div class="flex justify-end gap-2">
                <button onclick="closeModal()" class="px-4 py-2 border border-gray-200 text-sm rounded-xl hover:border-black">Batal</button>
                <button onclick="simpanRevisi('${id}')" class="px-4 py-2 bg-red-600 text-white text-sm rounded-xl hover:bg-red-700">Kirim Revisi</button>
            </div>
        </div>`);
}

async function simpanRevisi(id) {
    const catatan = document.getElementById('rev-catatan').value.trim();
    if (!catatan) { showToast("Catatan revisi wajib diisi.", "error"); return; }
    try {
        await api('/jurnal', 'PUT', { id, status: 'Revisi', catatan });
        closeModal();
        showToast("Catatan revisi berhasil dikirim.");
        navigate('validasi');
    } catch (err) { showToast(err.message, 'error'); }
}

function openModalPengumuman() {
    openModal(`
        <div class="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 border border-gray-200">
            <h3 class="font-bold text-lg flex items-center gap-2">${ICONS.pengumuman} Buat Pengumuman</h3>
            <div>
                <label class="block text-xs uppercase text-gray-500 mb-1.5">Isi Pengumuman</label>
                <textarea id="p-isi" placeholder="Tulis instruksi untuk kelompok bimbingan..." class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm h-28 focus:outline-none focus:border-black resize-none"></textarea>
            </div>
            <div class="flex justify-end gap-2">
                <button onclick="closeModal()" class="px-4 py-2 border border-gray-200 text-sm rounded-xl hover:border-black">Batal</button>
                <button onclick="savePengumuman()" class="px-4 py-2 bg-[#111111] text-white text-sm rounded-xl hover:bg-gray-800">Publikasikan</button>
            </div>
        </div>`);
}

async function savePengumuman() {
    const isi = document.getElementById('p-isi').value.trim();
    if (!isi) return;
    try {
        await api('/pengumuman', 'POST', { penulis: currentUser.profil?.nama || currentUser.username, isi });
        closeModal();
        showToast("Pengumuman berhasil dipublikasikan.");
        navigate('pengumuman');
    } catch (err) { showToast(err.message, 'error'); }
}

function openModalUsulanPT() {
    openModal(`
        <div class="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 border border-gray-200">
            <h3 class="font-bold text-lg flex items-center gap-2">${ICONS.usulan} Usulan Tempat Industri</h3>
            <div>
                <label class="block text-xs uppercase text-gray-500 mb-1.5">Nama Perusahaan / Instansi</label>
                <input type="text" id="u-nama" placeholder="PT / CV / Instansi..." class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">
            </div>
            <div>
                <label class="block text-xs uppercase text-gray-500 mb-1.5">Alamat</label>
                <input type="text" id="u-alamat" placeholder="Jl. ..." class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">
            </div>
            <div>
                <label class="block text-xs uppercase text-gray-500 mb-1.5">Bidang Kerja</label>
                <input type="text" id="u-bidang" placeholder="Teknologi Informasi, Otomotif, dll." class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">
            </div>
            <div class="flex justify-end gap-2">
                <button onclick="closeModal()" class="px-4 py-2 border border-gray-200 text-sm rounded-xl hover:border-black">Batal</button>
                <button onclick="saveUsulanPT()" class="px-4 py-2 bg-[#111111] text-white text-sm rounded-xl hover:bg-gray-800">Ajukan</button>
            </div>
        </div>`);
}

async function saveUsulanPT() {
    const nama   = document.getElementById('u-nama').value.trim();
    const alamat = document.getElementById('u-alamat').value.trim();
    const bidang = document.getElementById('u-bidang').value.trim();
    if (!nama || !alamat || !bidang) { showToast("Semua kolom wajib diisi.", "error"); return; }
    try {
        await api('/usulan', 'POST', { guru: currentUser.profil?.nama || currentUser.username, nama_pt: nama, alamat, bidang });
        closeModal();
        showToast("Usulan PT " + nama + " berhasil diajukan.");
        navigate('usulan');
    } catch (err) { showToast(err.message, 'error'); }
}

// ============================================================
//  AKSI ADMIN
// ============================================================
function openModalTambahAkun() {
    openModal(`
        <div class="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 border border-gray-200">
            <h3 class="font-bold text-lg">Tambah Akun Baru</h3>
            <div>
                <label class="block text-xs uppercase text-gray-500 mb-1.5">Peran (Role)</label>
                <select id="a-role" onchange="toggleFormAkun(this.value)" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">
                    <option value="siswa">Siswa</option>
                    <option value="guru">Guru Pembimbing</option>
                </select>
            </div>
            <div>
                <label class="block text-xs uppercase text-gray-500 mb-1.5">Nama Lengkap</label>
                <input type="text" id="a-nama" placeholder="Nama lengkap" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">
            </div>
            <div id="form-siswa-extra" class="space-y-3">
                <div>
                    <label class="block text-xs uppercase text-gray-500 mb-1.5">Kelas</label>
                    <input type="text" id="a-kelas" placeholder="Contoh: XI TKJ 1" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">
                </div>
                <div>
                    <label class="block text-xs uppercase text-gray-500 mb-1.5">NIS</label>
                    <input type="text" id="a-nis" placeholder="Nomor Induk Siswa" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">
                </div>
            </div>
            <div id="form-guru-extra" class="hidden space-y-3">
                <div>
                    <label class="block text-xs uppercase text-gray-500 mb-1.5">NIP</label>
                    <input type="text" id="a-nip" placeholder="Nomor Induk Pegawai" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">
                </div>
                <div>
                    <label class="block text-xs uppercase text-gray-500 mb-1.5">Email</label>
                    <input type="email" id="a-email" placeholder="email@sekolah.id" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs uppercase text-gray-500 mb-1.5">Username</label>
                    <input type="text" id="a-username" placeholder="username unik" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">
                </div>
                <div>
                    <label class="block text-xs uppercase text-gray-500 mb-1.5">Password</label>
                    <input type="text" id="a-password" placeholder="password" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">
                </div>
            </div>
            <div class="flex justify-end gap-2 pt-2">
                <button onclick="closeModal()" class="px-4 py-2 border border-gray-200 text-sm rounded-xl hover:border-black">Batal</button>
                <button onclick="saveAkunBaru()" class="px-4 py-2 bg-[#111111] text-white text-sm rounded-xl hover:bg-gray-800">Simpan Akun</button>
            </div>
        </div>`);
}

function toggleFormAkun(role) {
    document.getElementById('form-siswa-extra').classList.toggle('hidden', role !== 'siswa');
    document.getElementById('form-guru-extra').classList.toggle('hidden',  role !== 'guru');
}

async function saveAkunBaru() {
    const role     = document.getElementById('a-role').value;
    const nama     = document.getElementById('a-nama').value.trim();
    const username = document.getElementById('a-username').value.trim().toLowerCase();
    const password = document.getElementById('a-password').value.trim();
    if (!nama || !username || !password) { showToast("Nama, username, dan password wajib diisi.", "error"); return; }

    const body = { role, nama, username, password };
    if (role === 'siswa') {
        body.kelas = document.getElementById('a-kelas').value.trim();
        body.nis   = document.getElementById('a-nis').value.trim();
    } else {
        body.nip   = document.getElementById('a-nip').value.trim();
        body.email = document.getElementById('a-email').value.trim();
    }

    try {
        await api('/users', 'POST', body);
        closeModal();
        showToast("Akun " + nama + " (" + role + ") berhasil dibuat.");
        navigate('master');
    } catch (err) { showToast(err.message, 'error'); }
}

async function openModalEditSiswa(username) {
    try {
        const s = await api('/siswa?u=' + username);
        const n = await api('/nilai?u=' + username).catch(() => ({}));
        openModal(`
            <div class="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 border border-gray-200 max-h-[85vh] overflow-y-auto">
                <h3 class="font-bold text-lg">Edit Data Siswa: ${s.nama}</h3>
                <div class="grid grid-cols-2 gap-4">
                    <div class="col-span-2">
                        <label class="block text-xs uppercase text-gray-500 mb-1.5">Nama Lengkap</label>
                        <input type="text" id="e-nama" value="${s.nama}" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">
                    </div>
                    <div>
                        <label class="block text-xs uppercase text-gray-500 mb-1.5">Kelas</label>
                        <input type="text" id="e-kelas" value="${s.kelas || ''}" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">
                    </div>
                    <div>
                        <label class="block text-xs uppercase text-gray-500 mb-1.5">Status Penempatan</label>
                        <select id="e-status" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">
                            <option ${s.status_penempatan === 'Belum Ditetapkan' ? 'selected' : ''}>Belum Ditetapkan</option>
                            <option ${s.status_penempatan === 'Ditetapkan' ? 'selected' : ''}>Ditetapkan</option>
                        </select>
                    </div>
                    <div class="col-span-2">
                        <label class="block text-xs uppercase text-gray-500 mb-1.5">Nama PT / Mitra Industri</label>
                        <input type="text" id="e-pt" value="${s.pt}" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">
                    </div>
                    <div class="col-span-2">
                        <label class="block text-xs uppercase text-gray-500 mb-1.5">Alamat Industri</label>
                        <input type="text" id="e-alamat" value="${s.alamat_pt}" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">
                    </div>
                    <div>
                        <label class="block text-xs uppercase text-gray-500 mb-1.5">Kontak PIC DUDI</label>
                        <input type="text" id="e-pic" value="${s.pic_pt}" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">
                    </div>
                    <div>
                        <label class="block text-xs uppercase text-gray-500 mb-1.5">Guru Pembimbing</label>
                        <input type="text" id="e-guru" value="${s.guru}" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">
                    </div>
                    <div class="col-span-2">
                        <label class="block text-xs uppercase text-gray-500 mb-1.5">Pembimbing Lapangan (DUDI)</label>
                        <input type="text" id="e-pembimbing" value="${s.pembimbing_industri}" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">
                    </div>
                </div>
                <div class="border-t border-gray-100 pt-4">
                    <h4 class="text-xs uppercase text-gray-400 mb-3">Input Nilai Akhir</h4>
                    <div class="grid grid-cols-3 gap-3">
                        <div><label class="block text-xs text-gray-500 mb-1">Nilai Sekolah</label><input type="number" id="e-n-sekolah" min="0" max="100" value="${n.nilai_sekolah ?? ''}" placeholder="0-100" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">Nilai Industri</label><input type="number" id="e-n-industri" min="0" max="100" value="${n.nilai_industri ?? ''}" placeholder="0-100" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
                        <div><label class="block text-xs text-gray-500 mb-1">Nilai Akhir</label><input type="number" id="e-n-akhir" min="0" max="100" value="${n.nilai_akhir ?? ''}" placeholder="0-100" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
                    </div>
                    <div class="mt-3 grid grid-cols-2 gap-3">
                        <div><label class="block text-xs text-gray-500 mb-1">Catatan Sekolah</label><textarea id="e-cat-sekolah" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs h-16 focus:outline-none focus:border-black resize-none">${n.catatan_sekolah || ''}</textarea></div>
                        <div><label class="block text-xs text-gray-500 mb-1">Catatan Industri</label><textarea id="e-cat-industri" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs h-16 focus:outline-none focus:border-black resize-none">${n.catatan_industri || ''}</textarea></div>
                    </div>
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button onclick="closeModal()" class="px-4 py-2 border border-gray-200 text-sm rounded-xl hover:border-black">Batal</button>
                    <button onclick="saveEditSiswa('${username}')" class="px-4 py-2 bg-[#111111] text-white text-sm rounded-xl hover:bg-gray-800">Simpan Perubahan</button>
                </div>
            </div>`);
    } catch (err) { showToast(err.message, 'error'); }
}

async function saveEditSiswa(username) {
    const updateSiswa = {
        username,
        nama:                document.getElementById('e-nama').value.trim(),
        kelas:               document.getElementById('e-kelas').value.trim(),
        status_penempatan:   document.getElementById('e-status').value,
        pt:                  document.getElementById('e-pt').value.trim(),
        alamat_pt:           document.getElementById('e-alamat').value.trim(),
        pic_pt:              document.getElementById('e-pic').value.trim(),
        guru:                document.getElementById('e-guru').value.trim(),
        pembimbing_industri: document.getElementById('e-pembimbing').value.trim()
    };
    const updateNilai = {
        username,
        nilai_sekolah:    parseInt(document.getElementById('e-n-sekolah').value) || null,
        nilai_industri:   parseInt(document.getElementById('e-n-industri').value) || null,
        nilai_akhir:      parseInt(document.getElementById('e-n-akhir').value) || null,
        catatan_sekolah:  document.getElementById('e-cat-sekolah').value.trim(),
        catatan_industri: document.getElementById('e-cat-industri').value.trim()
    };
    try {
        await Promise.all([
            api('/siswa', 'PUT', updateSiswa),
            api('/nilai', 'PUT', updateNilai)
        ]);
        closeModal();
        showToast("Data siswa berhasil diperbarui.");
        navigate('master');
    } catch (err) { showToast(err.message, 'error'); }
}

async function openModalBuatKelompok() {
    const [siswas, gurus] = await Promise.all([api('/siswa'), api('/guru')]);
    const opsiGuru  = gurus.length  ? gurus.map(g  => `<option value="${g.nama}">${g.nama}</option>`).join('')  : '<option value="">Belum ada guru</option>';
    const opsiSiswa = siswas.length ? siswas.map(s => `<option value="${s.nama}">${s.nama} (${s.kelas || '-'})</option>`).join('') : '<option value="">Belum ada siswa</option>';
    openModal(`
        <div class="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 border border-gray-200 max-h-[85vh] overflow-y-auto">
            <h3 class="font-bold text-lg">Buat Kelompok PKL Baru</h3>
            <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Nama PT / Mitra Industri</label><input type="text" id="k-pt" placeholder="Nama perusahaan" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
            <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Alamat PT</label><input type="text" id="k-alamat" placeholder="Alamat lengkap" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
            <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Guru Pembimbing</label><select id="k-guru" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">${opsiGuru}</select></div>
            <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Ketua Kelompok</label><select id="k-ketua" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black">${opsiSiswa}</select></div>
            <div><label class="block text-xs uppercase text-gray-500 mb-1.5">Anggota Kelompok (tahan Ctrl / Cmd untuk pilih banyak)</label><select id="k-anggota" multiple class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black h-28">${opsiSiswa}</select></div>
            <div class="flex justify-end gap-2 pt-2">
                <button onclick="closeModal()" class="px-4 py-2 border border-gray-200 text-sm rounded-xl hover:border-black">Batal</button>
                <button onclick="saveKelompok()" class="px-4 py-2 bg-[#111111] text-white text-sm rounded-xl hover:bg-gray-800">Buat Kelompok</button>
            </div>
        </div>`);
}

async function saveKelompok() {
    const pt     = document.getElementById('k-pt').value.trim();
    const alamat = document.getElementById('k-alamat').value.trim();
    const guru   = document.getElementById('k-guru').value;
    const ketua  = document.getElementById('k-ketua').value;
    const sel    = document.getElementById('k-anggota');
    const anggota = Array.from(sel.selectedOptions).map(o => ({ nama: o.value }));
    if (!pt || !guru || !ketua) { showToast("PT, Guru, dan Ketua wajib dipilih.", "error"); return; }
    try {
        await api('/kelompok', 'POST', { pt, alamat, guru, ketua, anggota });
        closeModal();
        showToast("Kelompok di " + pt + " berhasil dibuat.");
        navigate('plotting');
    } catch (err) { showToast(err.message, 'error'); }
}

async function bukaDetailKelompok(id) {
    try {
        const data = await api('/kelompok');
        const k = data.find(x => String(x.id) === String(id));
        if (!k) return;
        const rows = (k.kelompok_anggota || []).map(a => `
            <div class="p-3.5 border border-gray-100 rounded-xl flex justify-between items-center text-sm hover:bg-gray-50">
                <div>
                    <div class="font-medium">${a.siswa_nama}</div>
                    <div class="text-xs text-gray-400">${a.siswa_kelas || '-'}</div>
                </div>
                <div class="flex items-center gap-2">
                    ${badge('Absen: ' + a.status_absen, a.status_absen === 'Hadir' ? 'green' : a.status_absen === 'Sakit' ? 'red' : 'gray')}
                    <button onclick="openInputNilaiModal('${a.siswa_nama}')" class="px-3 py-1.5 bg-[#111111] text-white text-xs rounded-lg hover:bg-gray-800">Input Nilai</button>
                </div>
            </div>`).join('');
        openModal(`
            <div class="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-gray-200 max-h-[85vh] overflow-y-auto">
                <div class="flex justify-between items-center pb-4 mb-4 border-b border-gray-100">
                    <div><h3 class="font-bold text-lg">${k.pt}</h3><p class="text-xs text-gray-400 mt-0.5">Guru: ${k.guru} · Ketua: ${k.ketua}</p></div>
                    <button onclick="closeModal()" class="text-xs uppercase px-3 py-1.5 border border-gray-200 rounded-xl hover:border-black">Tutup</button>
                </div>
                <div class="space-y-2">${rows || '<p class="text-center text-sm text-gray-400 py-4">Belum ada anggota.</p>'}</div>
            </div>`);
    } catch (err) { showToast(err.message, 'error'); }
}

async function openInputNilaiModal(namaSiswa) {
    try {
        const siswas = await api('/siswa');
        const s = siswas.find(x => x.nama === namaSiswa);
        if (!s) { showToast("Data siswa tidak ditemukan."); return; }
        const n = await api('/nilai?u=' + s.username).catch(() => ({}));
        openModal(`
            <div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 border border-gray-200">
                <h3 class="font-bold text-lg">Input Nilai: ${namaSiswa}</h3>
                <div class="grid grid-cols-3 gap-3">
                    <div><label class="block text-xs text-gray-500 mb-1">Nilai Sekolah</label><input type="number" id="in-sekolah" min="0" max="100" value="${n.nilai_sekolah ?? ''}" placeholder="0-100" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
                    <div><label class="block text-xs text-gray-500 mb-1">Nilai Industri</label><input type="number" id="in-industri" min="0" max="100" value="${n.nilai_industri ?? ''}" placeholder="0-100" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
                    <div><label class="block text-xs text-gray-500 mb-1">Nilai Akhir</label><input type="number" id="in-akhir" min="0" max="100" value="${n.nilai_akhir ?? ''}" placeholder="0-100" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"></div>
                </div>
                <div><label class="block text-xs text-gray-500 mb-1">Catatan Guru Sekolah</label><textarea id="in-cat-sekolah" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs h-16 focus:outline-none focus:border-black resize-none">${n.catatan_sekolah || ''}</textarea></div>
                <div><label class="block text-xs text-gray-500 mb-1">Catatan Industri</label><textarea id="in-cat-industri" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs h-16 focus:outline-none focus:border-black resize-none">${n.catatan_industri || ''}</textarea></div>
                <div class="flex justify-end gap-2 pt-2">
                    <button onclick="closeModal()" class="px-4 py-2 border border-gray-200 text-sm rounded-xl hover:border-black">Batal</button>
                    <button onclick="saveInputNilai('${s.username}')" class="px-4 py-2 bg-[#111111] text-white text-sm rounded-xl hover:bg-gray-800">Simpan Nilai</button>
                </div>
            </div>`);
    } catch (err) { showToast(err.message, 'error'); }
}

async function saveInputNilai(username) {
    try {
        await api('/nilai', 'PUT', {
            username,
            nilai_sekolah:    parseInt(document.getElementById('in-sekolah').value)   || null,
            nilai_industri:   parseInt(document.getElementById('in-industri').value)  || null,
            nilai_akhir:      parseInt(document.getElementById('in-akhir').value)     || null,
            catatan_sekolah:  document.getElementById('in-cat-sekolah').value.trim(),
            catatan_industri: document.getElementById('in-cat-industri').value.trim()
        });
        closeModal();
        showToast("Nilai berhasil disimpan.");
    } catch (err) { showToast(err.message, 'error'); }
}

function filterSiswa(query) {
    const q = query.toLowerCase();
    document.querySelectorAll('#tbody-siswa tr').forEach(tr => {
        tr.style.display = tr.innerText.toLowerCase().includes(q) ? '' : 'none';
    });
}

// ============================================================
//  HELPERS
// ============================================================
function predikat(nilai) {
    if (!nilai) return '-';
    if (nilai >= 90) return 'Sangat Memuaskan (A)';
    if (nilai >= 80) return 'Memuaskan (B)';
    if (nilai >= 70) return 'Cukup (C)';
    return 'Perlu Perbaikan (D)';
}

function showLoading(show) {
    // Disable / enable submit button saat loading
    const btn = document.querySelector('button[type="submit"]');
    if (btn) btn.disabled = show;
}

// ============================================================
//  MODAL MANAGER
// ============================================================
function openModal(html) {
    const modal = document.getElementById('modal-container');
    modal.innerHTML = html;
    modal.classList.remove('hidden');
}
function closeModal() {
    const modal = document.getElementById('modal-container');
    modal.classList.add('hidden');
    modal.innerHTML = '';
}
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('modal-container')?.addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
});

// ============================================================
//  TOAST NOTIFICATION
// ============================================================
function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast     = document.createElement('div');
    const bg        = type === 'error' ? 'bg-red-600' : 'bg-[#111111]';
    toast.className = `${bg} text-white px-5 py-3 rounded-xl text-xs font-medium shadow-xl backdrop-blur-md flex items-center gap-3 fade-in`;
    toast.innerHTML = `<span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.transition = 'opacity 0.3s';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
