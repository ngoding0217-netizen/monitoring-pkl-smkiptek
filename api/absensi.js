// GET  /api/absensi?u=x    — riwayat absensi siswa
// POST /api/absensi        — kirim absensi baru
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
        const { u } = req.query;
        if (!u) return res.status(400).json({ error: 'Parameter u (username) wajib.' });
        const { data, error } = await supabase
            .from('absensi').select('*').eq('username', u).order('tanggal', { ascending: false });
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    if (req.method === 'POST') {
        const { username, status, tanggal } = req.body;
        if (!username || !status) return res.status(400).json({ error: 'username dan status wajib diisi.' });

        // Ambil siswa_id
        const { data: s } = await supabase.from('siswa').select('id').eq('username', username).single();

        const { data, error } = await supabase.from('absensi').insert([{
            siswa_id: s?.id || null,
            username,
            tanggal: tanggal || new Date().toISOString().slice(0, 10),
            status
        }]).select().single();

        if (error) return res.status(500).json({ error: error.message });
        return res.status(201).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
