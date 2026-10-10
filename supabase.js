// Supabase Integration for Remaja Masjid Al-Akbar
const SUPABASE_CONFIG = {
  url: 'https://xtykpnqznccwolrlqmxa.supabase.co',
  anonKey: 'sb_publishable_sa2icdvGN2kidRQjnPd1zw_MabunM4y'
};

let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  if (typeof supabase !== 'undefined' && supabase.createClient) {
    _supabase = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    return _supabase;
  }
  return null;
}

// Fetch all data from Supabase and synchronize with local DATA object
async function syncFromSupabase() {
  const sb = getSupabase();
  if (!sb) return false;

  try {
    const [
      { data: divisiData, error: errDiv },
      { data: prokerData, error: errProk },
      { data: fotoData, error: errFoto },
      { data: profilData, error: errProf },
      { data: strukturData, error: errStruk }
    ] = await Promise.all([
      sb.from('divisi').select('*').order('urutan', { ascending: true }),
      sb.from('program_kerja').select('*').order('urutan', { ascending: true }),
      sb.from('dokumentasi_foto').select('*').order('urutan', { ascending: true }),
      sb.from('profil_organisasi').select('*').single(),
      sb.from('struktur_organisasi').select('*').single()
    ]);

    if (errDiv || errProk) {
      console.warn('Gagal memuat data dari Supabase, menggunakan data lokal:', errDiv || errProk);
      return false;
    }

    if (divisiData && divisiData.length) {
      DATA.divisi = divisiData.map(d => ({
        id: d.id,
        nama: d.nama,
        ket: d.ket || ''
      }));
    }

    if (prokerData && prokerData.length) {
      const fotoByProgramId = {};
      (fotoData || []).forEach(f => {
        if (!fotoByProgramId[f.program_id]) fotoByProgramId[f.program_id] = [];
        fotoByProgramId[f.program_id].push({
          id: f.id,
          src: f.src,
          cap: f.caption || '',
          tgl: f.tanggal || ''
        });
      });

      DATA.program = prokerData.map(p => ({
        id: p.id,
        d: p.divisi_id,
        n: p.nama,
        desk: p.deskripsi || '',
        tujuan: p.tujuan || '',
        sasaran: p.sasaran || '',
        waktu: p.waktu || '',
        dok: {
          album: p.album_url || '',
          video: p.video_url || '',
          foto: fotoByProgramId[p.id] || []
        }
      }));
    }

    if (profilData) {
      DATA.profil = {
        nama: profilData.nama,
        singkatan: profilData.singkatan,
        periode: profilData.periode,
        semboyan: profilData.semboyan,
        sk: profilData.sk_legalitas,
        visi: profilData.visi,
        misi: profilData.misi || [],
        sejarah: profilData.sejarah || [],
        sekretariat: profilData.sekretariat || {}
      };
    }

    if (strukturData) {
      DATA.struktur = {
        pembina: strukturData.pembina || [],
        penanggungJawab: strukturData.penanggung_jawab || {},
        dewanPakar: strukturData.dewan_pakar || [],
        bph: strukturData.bph || [],
        bidang: strukturData.bidang || []
      };
    }

    return true;
  } catch (err) {
    console.error('Error saat sinkronisasi dengan Supabase:', err);
    return false;
  }
}
