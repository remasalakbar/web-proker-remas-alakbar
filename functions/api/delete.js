// Cloudflare Pages Function: Hapus Foto dari Cloudflare R2
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    if (!env.REMAS_BUCKET) {
      return new Response(JSON.stringify({ ok: true, notice: 'No R2 binding' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { paths } = await request.json().catch(() => ({}));
    if (Array.isArray(paths) && paths.length > 0) {
      for (const p of paths) {
        if (typeof p === 'string' && p.startsWith('proker/')) {
          await env.REMAS_BUCKET.delete(p);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
