// POST /api/auth  — Login
// Body: { username, password }
const supabase = require('./_supabase');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ error: 'Username dan password wajib diisi.' });

    // Cari akun
    const { data: user, error } = await supabase
        .from('users')
        .select('id, username, role, nama, email')
        .eq('username', username.toLowerCase().trim())
        .eq('password', password)
        .single();

    if (error || !user)
        return res.status(401).json({ error: 'Username atau kata sandi salah.' });

    // Ambil profil tambahan sesuai role
    let profil = null;
    if (user.role === 'siswa') {
        const { data } = await supabase
            .from('siswa')
            .select('*')
            .eq('username', user.username)
            .single();
        profil = data;
    } else if (user.role === 'guru') {
        const { data } = await supabase
            .from('guru')
            .select('*')
            .eq('username', user.username)
            .single();
        profil = data;
    } else if (user.role === 'admin') {
        profil = { username: user.username, nama: user.nama, email: user.email };
    }

    return res.status(200).json({ user, profil });
};
