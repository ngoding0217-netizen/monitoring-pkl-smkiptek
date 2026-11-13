// GET  /api/usulan             — semua usulan PT
// GET  /api/usulan?guru=x      — usulan milik guru tertentu
// POST /api/usulan             — ajukan usulan baru
// PUT  /api/usulan             — update status (admin: Diterima/Ditolak)
const supabase = require('./_supabase');

const CORS = (res) => {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

module.exports = async (req, res) => {
    CORS(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET') {
        let query = supabase.from('usulan_pt').select('*').order('created_at', { ascending: false });
        if (req.query.guru) query = query.eq('guru', req.query.guru);
        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    if (req.method === 'POST') {
        const { guru, nama_pt, alamat, bidang, tanggal } = req.body;
        if (!guru || !nama_pt || !alamat || !bidang)
            return res.status(400).json({ error: 'guru, nama_pt, alamat, dan bidang wajib diisi.' });

        const { data, error } = await supabase.from('usulan_pt').insert([{
            guru, nama_pt, alamat, bidang,
            tanggal: tanggal || new Date().toISOString().slice(0, 10),
            status: 'Menunggu'
        }]).select().single();

        if (error) return res.status(500).json({ error: error.message });
        return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
        const { id, status } = req.body;
        if (!id || !status) return res.status(400).json({ error: 'id dan status wajib diisi.' });

        const { data, error } = await supabase
            .from('usulan_pt').update({ status }).eq('id', id).select().single();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
