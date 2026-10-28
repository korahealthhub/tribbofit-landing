// Registra um clique nos links de download do site (tribbofit.com.br).
// Grava só origem, mídia, campanha, conteúdo, aparelho, entrada e data/hora.
// Não grava IP, user-agent, cookie nem qualquer identificador. O user-agent e o IP só são
// olhados na memória para descartar robôs de pré-visualização (regras.ts).
// Chamado por navigator.sendBeacon (text/plain, sem preflight) a partir de /js/origem.js.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { clean, clientIp, motivoRobo, normMedium, normSource } from './regras.ts';

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

  // Sem o IP no cabeçalho o filtro por rede não funciona: avisa no log (sem o IP).
  if (!clientIp(req.headers)) console.warn('track-click: requisição sem IP no cabeçalho');
  // Robô ou prefetch: responde como se tivesse contado, sem gravar.
  const robo = motivoRobo(req.headers);
  if (robo) return new Response(null, { status: 204, headers: { ...cors(origin), 'x-contado': '0', 'x-motivo': robo } });

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
    source: normSource(body.source) ?? 'site',
    medium: normMedium(body.medium) ?? 'direto',
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
  return new Response(null, { status: 204, headers: { ...cors(origin), 'x-contado': '1' } });
});
