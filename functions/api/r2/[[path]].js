// Cloudflare Pages Function: Serve Foto dari R2 secara publik & di-cache di Cloudflare Edge
export async function onRequestGet(context) {
  const { params, env } = context;

  if (!env.REMAS_BUCKET) {
    return new Response('R2 bucket binding not found', { status: 500 });
  }

  const rawPath = params.path;
  const key = Array.isArray(rawPath) ? rawPath.join('/') : String(rawPath || '');

  if (!key) {
    return new Response('File path missing', { status: 400 });
  }

  try {
    const object = await env.REMAS_BUCKET.get(key);
    if (!object) {
      return new Response('File tidak ditemukan di R2', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(object.body, { headers });
  } catch (err) {
    return new Response('Error loading image from R2: ' + err.message, { status: 500 });
  }
}
