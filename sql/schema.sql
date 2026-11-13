-- ============================================================
--  SISTEM MONITORING PKL SMK IPTEK TANGSEL
--  Jalankan di: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. TABEL USERS (semua akun login)
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username    TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    role        TEXT NOT NULL CHECK (role IN ('admin','guru','siswa')),
    nama        TEXT NOT NULL,
    email       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL SISWA (profil & penempatan)
CREATE TABLE IF NOT EXISTS siswa (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID REFERENCES users(id) ON DELETE CASCADE,
    username             TEXT UNIQUE NOT NULL,
    nama                 TEXT NOT NULL,
    nis                  TEXT,
    kelas                TEXT,
    status_penempatan    TEXT DEFAULT 'Belum Ditetapkan',
    pt                   TEXT DEFAULT '-',
    alamat_pt            TEXT DEFAULT '-',
    pic_pt               TEXT DEFAULT '-',
    guru                 TEXT DEFAULT '-',
    pembimbing_industri  TEXT DEFAULT '-',
    created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL GURU (profil guru pembimbing)
CREATE TABLE IF NOT EXISTS guru (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    username    TEXT UNIQUE NOT NULL,
    nama        TEXT NOT NULL,
    nip         TEXT,
    email       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL KELOMPOK PKL
CREATE TABLE IF NOT EXISTS kelompok (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pt          TEXT NOT NULL,
    alamat      TEXT,
    guru        TEXT NOT NULL,
    ketua       TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL ANGGOTA KELOMPOK (relasi siswa ↔ kelompok)
CREATE TABLE IF NOT EXISTS kelompok_anggota (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kelompok_id   UUID REFERENCES kelompok(id) ON DELETE CASCADE,
    siswa_nama    TEXT NOT NULL,
    siswa_kelas   TEXT,
    status_absen  TEXT DEFAULT '-',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL ABSENSI HARIAN
CREATE TABLE IF NOT EXISTS absensi (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id    UUID REFERENCES siswa(id) ON DELETE CASCADE,
    username    TEXT NOT NULL,
    tanggal     DATE NOT NULL DEFAULT CURRENT_DATE,
    status      TEXT NOT NULL CHECK (status IN ('Hadir','Sakit','Izin')),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABEL JURNAL KEGIATAN
CREATE TABLE IF NOT EXISTS jurnal (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id    UUID REFERENCES siswa(id) ON DELETE CASCADE,
    username    TEXT NOT NULL,
    tanggal     DATE NOT NULL DEFAULT CURRENT_DATE,
    durasi      TEXT NOT NULL,
    kegiatan    TEXT NOT NULL,
    status      TEXT DEFAULT 'Pending' CHECK (status IN ('Pending','Disetujui','Revisi')),
    catatan     TEXT DEFAULT 'Menunggu tinjauan guru',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABEL NILAI AKHIR
CREATE TABLE IF NOT EXISTS nilai (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id         UUID REFERENCES siswa(id) ON DELETE CASCADE,
    username         TEXT UNIQUE NOT NULL,
    nilai_sekolah    INTEGER,
    nilai_industri   INTEGER,
    nilai_akhir      INTEGER,
    catatan_sekolah  TEXT DEFAULT '',
    catatan_industri TEXT DEFAULT '',
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABEL PENGUMUMAN
CREATE TABLE IF NOT EXISTS pengumuman (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    penulis     TEXT NOT NULL,
    tanggal     DATE NOT NULL DEFAULT CURRENT_DATE,
    isi         TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABEL USULAN PT
CREATE TABLE IF NOT EXISTS usulan_pt (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guru        TEXT NOT NULL,
    nama_pt     TEXT NOT NULL,
    alamat      TEXT NOT NULL,
    bidang      TEXT NOT NULL,
    tanggal     DATE NOT NULL DEFAULT CURRENT_DATE,
    status      TEXT DEFAULT 'Menunggu' CHECK (status IN ('Menunggu','Diterima','Ditolak')),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  AKUN DEFAULT (admin, guru demo, siswa demo)
--  GANTI PASSWORD setelah pertama login!
-- ============================================================
INSERT INTO users (username, password, role, nama, email) VALUES
    ('admin',  'admin123',  'admin', 'Super Administrator',   'admin@smkiptek.sch.id'),
    ('guru',   'guru123',   'guru',  'Guru Pembimbing Demo',  'guru@smkiptek.sch.id'),
    ('siswa',  'siswa123',  'siswa', 'Siswa Demo',            'siswa@smkiptek.sch.id')
ON CONFLICT (username) DO NOTHING;

-- Profil guru demo
INSERT INTO guru (user_id, username, nama, email)
SELECT id, username, nama, email FROM users WHERE username = 'guru'
ON CONFLICT (username) DO NOTHING;

-- Profil siswa demo
INSERT INTO siswa (user_id, username, nama)
SELECT id, username, nama FROM users WHERE username = 'siswa'
ON CONFLICT (username) DO NOTHING;

-- Nilai awal siswa demo
INSERT INTO nilai (siswa_id, username)
SELECT id, username FROM siswa WHERE username = 'siswa'
ON CONFLICT (username) DO NOTHING;

-- ============================================================
--  ROW LEVEL SECURITY (RLS) — Aktifkan akses via anon key
-- ============================================================
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE siswa            ENABLE ROW LEVEL SECURITY;
ALTER TABLE guru             ENABLE ROW LEVEL SECURITY;
ALTER TABLE kelompok         ENABLE ROW LEVEL SECURITY;
ALTER TABLE kelompok_anggota ENABLE ROW LEVEL SECURITY;
ALTER TABLE absensi          ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurnal           ENABLE ROW LEVEL SECURITY;
ALTER TABLE nilai            ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengumuman       ENABLE ROW LEVEL SECURITY;
ALTER TABLE usulan_pt        ENABLE ROW LEVEL SECURITY;

-- Policy: izinkan semua operasi via anon key (untuk prototipe)
-- Di produksi: ganti dengan policy berbasis JWT
CREATE POLICY "allow_all_users"            ON users            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_siswa"            ON siswa            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_guru"             ON guru             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_kelompok"         ON kelompok         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_kelompok_anggota" ON kelompok_anggota FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_absensi"          ON absensi          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_jurnal"           ON jurnal           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_nilai"            ON nilai            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_pengumuman"       ON pengumuman       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_usulan_pt"        ON usulan_pt        FOR ALL USING (true) WITH CHECK (true);
