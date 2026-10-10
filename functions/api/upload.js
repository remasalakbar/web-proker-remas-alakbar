// Cloudflare Pages Function: Upload Foto ke Cloudflare R2
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 1. Verifikasi binding R2
    if (!env.REMAS_BUCKET) {
      return new Response(JSON.stringify({ 
        error: 'R2 bucket belum terhubung di Cloudflare Pages. Pastikan binding R2 bernama "REMAS_BUCKET" sudah ditambahkan di Settings > Functions > R2 bucket bindings.' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const slug = (url.searchParams.get('slug') || 'umum').replace(/[^a-z0-9-]/gi, '').slice(0, 60) || 'umum';
    const contentType = request.headers.get('content-type') || 'image/jpeg';

    // 2. Baca isi file binary
    const arrayBuffer = await request.arrayBuffer();
    if (arrayBuffer.byteLength > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Ukuran file foto maksimal 5 MB' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Generate path file di Cloudflare R2
    const key = `proker/${slug}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;

    // 4. Simpan ke R2 bucket
    await env.REMAS_BUCKET.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: contentType,
        cacheControl: 'public, max-age=31536000, immutable'
      }
    });

    // 5. Buat URL publik
    // Jika R2_PUBLIC_DOMAIN di-set (misal https://pub-xxx.r2.dev atau cdn.alakbar.or.id), gunakan itu
    // Jika belum ada custom domain, gunakan router proxy bawaan /api/r2/...
    const publicDomain = env.R2_PUBLIC_DOMAIN ? env.R2_PUBLIC_DOMAIN.replace(/\/$/, '') : '';
    const fileUrl = publicDomain ? `${publicDomain}/${key}` : `${url.origin}/api/r2/${key}`;

    return new Response(JSON.stringify({ url: fileUrl, path: key }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
