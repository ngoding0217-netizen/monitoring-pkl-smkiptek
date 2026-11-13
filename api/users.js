// POST /api/users  — daftarkan akun baru (hanya admin)
// GET  /api/users  — semua akun
const supabase = require('./_supabase');

const CORS = (res) => {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

module.exports = async (req, res) => {
    CORS(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET') {
        const { data, error } = await supabase
            .from('users').select('id,username,role,nama,email,created_at').order('created_at');
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    if (req.method === 'POST') {
        const { username, password, role, nama, email } = req.body;
        if (!username || !password || !role || !nama)
            return res.status(400).json({ error: 'username, password, role, dan nama wajib diisi.' });

        // Cek duplikat
        const { data: exist } = await supabase
            .from('users').select('id').eq('username', username.toLowerCase()).single();
        if (exist) return res.status(409).json({ error: 'Username sudah digunakan.' });

        const { data: user, error } = await supabase.from('users').insert([{
            username: username.toLowerCase(), password, role, nama,
            email: email || username + '@smkiptek.sch.id'
        }]).select().single();

        if (error) return res.status(500).json({ error: error.message });

        // Buat profil sesuai role
        if (role === 'siswa') {
            await supabase.from('siswa').insert([{
                user_id: user.id, username: user.username, nama,
                status_penempatan: 'Belum Ditetapkan', pt: '-', alamat_pt: '-',
                pic_pt: '-', guru: '-', pembimbing_industri: '-'
            }]);
            const { data: s } = await supabase.from('siswa').select('id').eq('username', user.username).single();
            if (s) await supabase.from('nilai').insert([{ siswa_id: s.id, username: user.username }]);
        } else if (role === 'guru') {
            await supabase.from('guru').insert([{
                user_id: user.id, username: user.username, nama,
                email: email || username + '@smkiptek.sch.id'
            }]);
        }

        return res.status(201).json({ message: 'Akun berhasil dibuat.', user });
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
