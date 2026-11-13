// GET  /api/pengumuman         — semua pengumuman
// POST /api/pengumuman         — buat pengumuman baru
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
            .from('pengumuman').select('*').order('created_at', { ascending: false });
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    if (req.method === 'POST') {
        const { penulis, isi, tanggal } = req.body;
        if (!penulis || !isi) return res.status(400).json({ error: 'penulis dan isi wajib diisi.' });

        const { data, error } = await supabase.from('pengumuman').insert([{
            penulis, isi,
            tanggal: tanggal || new Date().toISOString().slice(0, 10)
        }]).select().single();

        if (error) return res.status(500).json({ error: error.message });
        return res.status(201).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
