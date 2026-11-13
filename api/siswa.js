// GET  /api/siswa          — semua siswa (admin)
// GET  /api/siswa?u=x      — satu siswa by username
// POST /api/siswa          — tambah siswa baru
// PUT  /api/siswa          — update data siswa
const supabase = require('./_supabase');

const CORS = (res) => {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

module.exports = async (req, res) => {
    CORS(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    // GET — satu siswa
    if (req.method === 'GET' && req.query.u) {
        const { data, error } = await supabase
            .from('siswa').select('*').eq('username', req.query.u).single();
        if (error) return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
        return res.status(200).json(data);
    }

    // GET — semua siswa
    if (req.method === 'GET') {
        const { data, error } = await supabase.from('siswa').select('*').order('nama');
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    // POST — tambah siswa baru
    if (req.method === 'POST') {
        const { username, nama, kelas, nis } = req.body;
        if (!username || !nama) return res.status(400).json({ error: 'Username dan nama wajib diisi.' });

        const { data, error } = await supabase.from('siswa').insert([{
            username, nama, nis: nis || '', kelas: kelas || '',
            status_penempatan: 'Belum Ditetapkan', pt: '-', alamat_pt: '-',
            pic_pt: '-', guru: '-', pembimbing_industri: '-'
        }]).select().single();

        if (error) return res.status(500).json({ error: error.message });

        // Buat record nilai kosong
        await supabase.from('nilai').insert([{ username, siswa_id: data.id }]);

        return res.status(201).json(data);
    }

    // PUT — update data siswa
    if (req.method === 'PUT') {
        const { username, ...updateData } = req.body;
        if (!username) return res.status(400).json({ error: 'Username wajib diisi.' });

        const { data, error } = await supabase
            .from('siswa').update(updateData).eq('username', username).select().single();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
