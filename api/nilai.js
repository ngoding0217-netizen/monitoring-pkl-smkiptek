// GET /api/nilai?u=x   — nilai siswa
// PUT /api/nilai       — input / update nilai
const supabase = require('./_supabase');

const CORS = (res) => {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

module.exports = async (req, res) => {
    CORS(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET') {
        const { u } = req.query;
        if (!u) return res.status(400).json({ error: 'Parameter u (username) wajib.' });
        const { data, error } = await supabase
            .from('nilai').select('*').eq('username', u).single();
        if (error) return res.status(404).json({ error: 'Data nilai tidak ditemukan.' });
        return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
        const { username, nilai_sekolah, nilai_industri, nilai_akhir, catatan_sekolah, catatan_industri } = req.body;
        if (!username) return res.status(400).json({ error: 'username wajib diisi.' });

        const { data, error } = await supabase.from('nilai')
            .upsert({
                username,
                nilai_sekolah:    nilai_sekolah    ?? null,
                nilai_industri:   nilai_industri   ?? null,
                nilai_akhir:      nilai_akhir      ?? null,
                catatan_sekolah:  catatan_sekolah  || '',
                catatan_industri: catatan_industri || '',
                updated_at: new Date().toISOString()
            }, { onConflict: 'username' })
            .select().single();

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
