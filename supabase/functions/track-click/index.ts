// Registra um clique nos links de download do site (tribbofit.com.br).
// Grava só origem, mídia, campanha, conteúdo, aparelho, entrada e data/hora.
// Não lê nem grava IP, user-agent, cookie ou qualquer identificador.
// Chamado por navigator.sendBeacon (text/plain, sem preflight) a partir de /js/origem.js.
import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = new Set([
  'https://tribbofit.com.br',
  'https://www.tribbofit.com.br',
  'https://korahealthhub.com.br',
  'https://www.korahealthhub.com.br',
]);
const DEVICES = new Set(['ios', 'android', 'desktop']);

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

// Mesma regra de /js/origem.js: minúsculas, sem acento, só [a-z0-9_-], até 40.
function clean(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/[\s.]+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 40);
  return s || null;
}

function cors(origin: string | null): HeadersInit {
  return origin && ALLOWED_ORIGINS.has(origin)
    ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' }
    : {};
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { ...cors(origin), 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'content-type' },
    });
  }
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return new Response('origin', { status: 403 });

  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > 1000) return new Response('size', { status: 413, headers: cors(origin) });
    body = JSON.parse(text);
  } catch {
    return new Response('json', { status: 400, headers: cors(origin) });
  }

  const device = typeof body.device === 'string' && DEVICES.has(body.device) ? body.device : null;
  const row = {
    source: clean(body.source) ?? 'site',
    medium: clean(body.medium) ?? 'direto',
    campaign: clean(body.campaign) ?? 'nenhuma',
    content: clean(body.content),
    device,
    entrada: clean(body.entrada) ?? 'desconhecida',
    in_app: body.in_app === true,
    reaberto: body.reaberto === true,
  };
  if (!row.device) return new Response('device', { status: 400, headers: cors(origin) });

  const { error } = await supabase.from('link_clicks').insert(row);
  if (error) {
    console.error('track-click insert', error.message);
    return new Response('db', { status: 500, headers: cors(origin) });
  }
  return new Response(null, { status: 204, headers: cors(origin) });
});
