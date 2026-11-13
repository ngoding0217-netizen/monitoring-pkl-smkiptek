// GET  /api/kelompok          — semua kelompok
// GET  /api/kelompok?guru=x   — kelompok milik guru tertentu
// POST /api/kelompok          — buat kelompok baru
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
        let query = supabase
            .from('kelompok')
            .select('*, kelompok_anggota(*)')
            .order('created_at');

        if (req.query.guru)
            query = query.eq('guru', req.query.guru);

        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    if (req.method === 'POST') {
        const { pt, alamat, guru, ketua, anggota } = req.body;
        // anggota: [{ nama, kelas }]
        if (!pt || !guru || !ketua)
            return res.status(400).json({ error: 'pt, guru, dan ketua wajib diisi.' });

        // Insert kelompok
        const { data: k, error: ke } = await supabase.from('kelompok').insert([{
            pt, alamat: alamat || '', guru, ketua
        }]).select().single();

        if (ke) return res.status(500).json({ error: ke.message });

        // Insert anggota
        if (anggota && anggota.length > 0) {
            const rows = anggota.map(a => ({
                kelompok_id: k.id,
                siswa_nama:  a.nama,
                siswa_kelas: a.kelas || '',
                status_absen: '-'
            }));
            await supabase.from('kelompok_anggota').insert(rows);

            // Update status penempatan siswa
            for (const a of anggota) {
                await supabase.from('siswa')
                    .update({ status_penempatan: 'Ditetapkan', pt, alamat_pt: alamat || '', guru })
                    .eq('nama', a.nama);
            }
        }

        return res.status(201).json(k);
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
