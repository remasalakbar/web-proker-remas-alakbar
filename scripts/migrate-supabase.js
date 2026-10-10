import pg from 'pg';
import fs from 'fs';
const { Client } = pg;

const connectionString = 'postgresql://postgres:VmDnTg7QxfI2puCh@db.xtykpnqznccwolrlqmxa.supabase.co:5432/postgres';

const schemaSql = `
-- 1. Divisi Table
CREATE TABLE IF NOT EXISTS public.divisi (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  ket TEXT,
  urutan INTEGER DEFAULT 0
);

-- 2. Program Kerja Table
CREATE TABLE IF NOT EXISTS public.program_kerja (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  divisi_id TEXT REFERENCES public.divisi(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  deskripsi TEXT,
  tujuan TEXT,
  sasaran TEXT,
  waktu TEXT,
  album_url TEXT DEFAULT '',
  video_url TEXT DEFAULT '',
  urutan INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Dokumentasi Foto Table
CREATE TABLE IF NOT EXISTS public.dokumentasi_foto (
  id SERIAL PRIMARY KEY,
  program_id INTEGER REFERENCES public.program_kerja(id) ON DELETE CASCADE,
  src TEXT NOT NULL,
  caption TEXT DEFAULT '',
  tanggal TEXT DEFAULT '',
  urutan INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Profil Organisasi Table
CREATE TABLE IF NOT EXISTS public.profil_organisasi (
  id INTEGER PRIMARY KEY DEFAULT 1,
  nama TEXT NOT NULL,
  singkatan TEXT,
  periode TEXT,
  semboyan TEXT,
  sk_legalitas TEXT,
  visi TEXT NOT NULL,
  misi JSONB NOT NULL DEFAULT '[]'::jsonb,
  sejarah JSONB NOT NULL DEFAULT '[]'::jsonb,
  sekretariat JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Struktur Organisasi Table
CREATE TABLE IF NOT EXISTS public.struktur_organisasi (
  id INTEGER PRIMARY KEY DEFAULT 1,
  pembina JSONB NOT NULL DEFAULT '[]'::jsonb,
  penanggung_jawab JSONB NOT NULL DEFAULT '{}'::jsonb,
  dewan_pakar JSONB NOT NULL DEFAULT '[]'::jsonb,
  bph JSONB NOT NULL DEFAULT '[]'::jsonb,
  bidang JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.divisi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_kerja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dokumentasi_foto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profil_organisasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.struktur_organisasi ENABLE ROW LEVEL SECURITY;

-- Allow public read (anon key)
DROP POLICY IF EXISTS "Public read divisi" ON public.divisi;
CREATE POLICY "Public read divisi" ON public.divisi FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read program_kerja" ON public.program_kerja;
CREATE POLICY "Public read program_kerja" ON public.program_kerja FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read dokumentasi_foto" ON public.dokumentasi_foto;
CREATE POLICY "Public read dokumentasi_foto" ON public.dokumentasi_foto FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read profil_organisasi" ON public.profil_organisasi;
CREATE POLICY "Public read profil_organisasi" ON public.profil_organisasi FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read struktur_organisasi" ON public.struktur_organisasi;
CREATE POLICY "Public read struktur_organisasi" ON public.struktur_organisasi FOR SELECT USING (true);

-- Allow all writes for now (or via service role / authenticated)
DROP POLICY IF EXISTS "Allow all modification divisi" ON public.divisi;
CREATE POLICY "Allow all modification divisi" ON public.divisi FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all modification program_kerja" ON public.program_kerja;
CREATE POLICY "Allow all modification program_kerja" ON public.program_kerja FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all modification dokumentasi_foto" ON public.dokumentasi_foto;
CREATE POLICY "Allow all modification dokumentasi_foto" ON public.dokumentasi_foto FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all modification profil_organisasi" ON public.profil_organisasi;
CREATE POLICY "Allow all modification profil_organisasi" ON public.profil_organisasi FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all modification struktur_organisasi" ON public.struktur_organisasi;
CREATE POLICY "Allow all modification struktur_organisasi" ON public.struktur_organisasi FOR ALL USING (true) WITH CHECK (true);

-- Storage Bucket for Dokumentasi
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('dokumentasi', 'dokumentasi', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read buckets" ON storage.buckets;
CREATE POLICY "Public read buckets" ON storage.buckets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read dokumentasi" ON storage.objects;
CREATE POLICY "Public read dokumentasi" ON storage.objects FOR SELECT USING (bucket_id = 'dokumentasi');

DROP POLICY IF EXISTS "Public insert dokumentasi" ON storage.objects;
CREATE POLICY "Public insert dokumentasi" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'dokumentasi');

DROP POLICY IF EXISTS "Public update dokumentasi" ON storage.objects;
CREATE POLICY "Public update dokumentasi" ON storage.objects FOR UPDATE USING (bucket_id = 'dokumentasi');

DROP POLICY IF EXISTS "Public delete dokumentasi" ON storage.objects;
CREATE POLICY "Public delete dokumentasi" ON storage.objects FOR DELETE USING (bucket_id = 'dokumentasi');

-- Admin Configuration Table
CREATE TABLE IF NOT EXISTS public.admin_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;

INSERT INTO public.admin_config (key, value)
VALUES ('admin_password', 'remas2026')
ON CONFLICT (key) DO NOTHING;

-- Verification RPC
CREATE OR REPLACE FUNCTION public.verify_admin_password(pass TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stored TEXT;
BEGIN
  SELECT value INTO stored FROM public.admin_config WHERE key = 'admin_password';
  IF stored IS NULL THEN
    RETURN pass = 'remas2026';
  END IF;
  RETURN pass = stored;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_admin_password(TEXT) TO anon, authenticated;
`;

const slugify = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function run() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('1. Connected to Supabase DB.');

    // Execute schema creation
    console.log('2. Applying schema & RLS policies...');
    await client.query(schemaSql);
    console.log('Schema created successfully.');

    // Load data from data.js
    const dataJsContent = fs.readFileSync('./data.js', 'utf8');
    const DATA = (new Function(dataJsContent + '; return DATA;'))();

    console.log('3. Seeding Divisi...');
    for (let i = 0; i < DATA.divisi.length; i++) {
      const d = DATA.divisi[i];
      await client.query(`
        INSERT INTO public.divisi (id, nama, ket, urutan)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET nama = EXCLUDED.nama, ket = EXCLUDED.ket, urutan = EXCLUDED.urutan
      `, [d.id, d.nama, d.ket, i + 1]);
    }

    console.log('4. Seeding Program Kerja...');
    for (let i = 0; i < DATA.program.length; i++) {
      const p = DATA.program[i];
      const s = slugify(p.n);
      const dok = p.dok || {};
      const res = await client.query(`
        INSERT INTO public.program_kerja (slug, divisi_id, nama, deskripsi, tujuan, sasaran, waktu, album_url, video_url, urutan)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (slug) DO UPDATE SET
          divisi_id = EXCLUDED.divisi_id,
          nama = EXCLUDED.nama,
          deskripsi = EXCLUDED.deskripsi,
          tujuan = EXCLUDED.tujuan,
          sasaran = EXCLUDED.sasaran,
          waktu = EXCLUDED.waktu,
          album_url = EXCLUDED.album_url,
          video_url = EXCLUDED.video_url,
          urutan = EXCLUDED.urutan,
          updated_at = NOW()
        RETURNING id
      `, [s, p.d, p.n, p.desk, p.tujuan, p.sasaran, p.waktu, dok.album || '', dok.video || '', i + 1]);

      const progId = res.rows[0].id;
      if (dok.foto && Array.isArray(dok.foto)) {
        for (let j = 0; j < dok.foto.length; j++) {
          const f = dok.foto[j];
          await client.query(`
            INSERT INTO public.dokumentasi_foto (program_id, src, caption, tanggal, urutan)
            VALUES ($1, $2, $3, $4, $5)
          `, [progId, f.src, f.cap || '', f.tgl || '', j + 1]);
        }
      }
    }

    console.log('5. Seeding Profil Organisasi...');
    if (DATA.profil) {
      await client.query(`
        INSERT INTO public.profil_organisasi (id, nama, singkatan, periode, semboyan, sk_legalitas, visi, misi, sejarah, sekretariat, updated_at)
        VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (id) DO UPDATE SET
          nama = EXCLUDED.nama,
          singkatan = EXCLUDED.singkatan,
          periode = EXCLUDED.periode,
          semboyan = EXCLUDED.semboyan,
          sk_legalitas = EXCLUDED.sk_legalitas,
          visi = EXCLUDED.visi,
          misi = EXCLUDED.misi,
          sejarah = EXCLUDED.sejarah,
          sekretariat = EXCLUDED.sekretariat,
          updated_at = NOW()
      `, [
        DATA.profil.nama,
        DATA.profil.singkatan,
        DATA.profil.periode,
        DATA.profil.semboyan,
        DATA.profil.sk,
        DATA.profil.visi,
        JSON.stringify(DATA.profil.misi),
        JSON.stringify(DATA.profil.sejarah),
        JSON.stringify(DATA.profil.sekretariat)
      ]);
    }

    console.log('6. Seeding Struktur Organisasi...');
    if (DATA.struktur) {
      await client.query(`
        INSERT INTO public.struktur_organisasi (id, pembina, penanggung_jawab, dewan_pakar, bph, bidang, updated_at)
        VALUES (1, $1, $2, $3, $4, $5, NOW())
        ON CONFLICT (id) DO UPDATE SET
          pembina = EXCLUDED.pembina,
          penanggung_jawab = EXCLUDED.penanggung_jawab,
          dewan_pakar = EXCLUDED.dewan_pakar,
          bph = EXCLUDED.bph,
          bidang = EXCLUDED.bidang,
          updated_at = NOW()
      `, [
        JSON.stringify(DATA.struktur.pembina),
        JSON.stringify(DATA.struktur.penanggungJawab),
        JSON.stringify(DATA.struktur.dewanPakar),
        JSON.stringify(DATA.struktur.bph),
        JSON.stringify(DATA.struktur.bidang)
      ]);
    }

    console.log('=== SEEDING COMPLETED SUCCESSFULLY! ===');
    const counts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM public.divisi) AS divisi_count,
        (SELECT COUNT(*) FROM public.program_kerja) AS proker_count,
        (SELECT COUNT(*) FROM public.profil_organisasi) AS profil_count,
        (SELECT COUNT(*) FROM public.struktur_organisasi) AS struktur_count
    `);
    console.log('Counts in Supabase:', counts.rows[0]);

    await client.end();
  } catch (err) {
    console.error('Migration error:', err);
    await client.end();
    process.exit(1);
  }
}

run();
