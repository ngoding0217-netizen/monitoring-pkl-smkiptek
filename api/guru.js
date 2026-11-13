// GET  /api/guru           — semua guru
// GET  /api/guru?u=x       — satu guru by username
// POST /api/guru           — tambah guru baru
const supabase = require('./_supabase');

const CORS = (res) => {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

module.exports = async (req, res) => {
    CORS(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET' && req.query.u) {
        const { data, error } = await supabase
            .from('guru').select('*').eq('username', req.query.u).single();
        if (error) return res.status(404).json({ error: 'Guru tidak ditemukan.' });
        return res.status(200).json(data);
    }

    if (req.method === 'GET') {
        const { data, error } = await supabase.from('guru').select('*').order('nama');
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    if (req.method === 'POST') {
        const { username, nama, nip, email } = req.body;
        if (!username || !nama) return res.status(400).json({ error: 'Username dan nama wajib diisi.' });

        const { data, error } = await supabase.from('guru').insert([{
            username, nama, nip: nip || '', email: email || username + '@smkiptek.sch.id'
        }]).select().single();

        if (error) return res.status(500).json({ error: error.message });
        return res.status(201).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
