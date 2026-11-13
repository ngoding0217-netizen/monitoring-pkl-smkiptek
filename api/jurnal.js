// GET  /api/jurnal?u=x         — jurnal milik siswa
// GET  /api/jurnal?pending=1   — semua jurnal pending (untuk guru)
// POST /api/jurnal             — tambah jurnal baru
// PUT  /api/jurnal             — update status jurnal (validasi guru)
const supabase = require('./_supabase');

const CORS = (res) => {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

module.exports = async (req, res) => {
    CORS(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    // GET — semua jurnal pending
    if (req.method === 'GET' && req.query.pending) {
        const { data, error } = await supabase
            .from('jurnal').select('*').eq('status', 'Pending').order('created_at');
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    // GET — jurnal satu siswa
    if (req.method === 'GET' && req.query.u) {
        const { data, error } = await supabase
            .from('jurnal').select('*').eq('username', req.query.u).order('tanggal', { ascending: false });
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    // POST — tambah jurnal baru
    if (req.method === 'POST') {
        const { username, tanggal, durasi, kegiatan } = req.body;
        if (!username || !durasi || !kegiatan)
            return res.status(400).json({ error: 'username, durasi, dan kegiatan wajib diisi.' });

        const { data: s } = await supabase.from('siswa').select('id').eq('username', username).single();

        const { data, error } = await supabase.from('jurnal').insert([{
            siswa_id: s?.id || null,
            username,
            tanggal: tanggal || new Date().toISOString().slice(0, 10),
            durasi, kegiatan,
            status: 'Pending',
            catatan: 'Menunggu tinjauan guru'
        }]).select().single();

        if (error) return res.status(500).json({ error: error.message });
        return res.status(201).json(data);
    }

    // PUT — update status (Disetujui / Revisi)
    if (req.method === 'PUT') {
        const { id, status, catatan } = req.body;
        if (!id || !status) return res.status(400).json({ error: 'id dan status wajib diisi.' });

        const { data, error } = await supabase
            .from('jurnal')
            .update({ status, catatan: catatan || (status === 'Disetujui' ? 'Jurnal disetujui oleh guru.' : catatan) })
            .eq('id', id)
            .select().single();

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
