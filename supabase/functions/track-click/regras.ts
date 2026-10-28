// Regras da contagem, separadas para testar sem banco: limpeza dos nomes, apelidos de origem
// e detecção de robôs. Mesmas regras de /js/origem.js.
import { BOT_V4, BOT_V6 } from './redes-robos.ts';

// Minúsculas, sem acento, só [a-z0-9_-], até 40.
export function clean(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
    .replace(/[\s.]+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 40);
  return s || null;
}

// O Instagram, o Facebook e os anúncios da Meta mandam utm_source=ig / fb / l.instagram.com
// e utm_medium=social: um nome só por rede, e social = organic.
const SOURCE_ALIAS: Record<string, string> = {
  'ig': 'instagram', 'instagram-com': 'instagram', 'l-instagram-com': 'instagram', 'www-instagram-com': 'instagram',
  'fb': 'facebook', 'facebook-com': 'facebook', 'm-facebook-com': 'facebook', 'l-facebook-com': 'facebook',
  'lm-facebook-com': 'facebook', 'www-facebook-com': 'facebook',
  'tt': 'tiktok', 'tiktok-com': 'tiktok', 'www-tiktok-com': 'tiktok',
};
const MEDIUM_ALIAS: Record<string, string> = { 'social': 'organic' };

export function normSource(v: unknown): string | null {
  const s = clean(v);
  return s && (SOURCE_ALIAS[s] ?? s);
}
export function normMedium(v: unknown): string | null {
  const s = clean(v);
  return s && (MEDIUM_ALIAS[s] ?? s);
}

// Robôs de pré-visualização e buscadores. BytedanceWebview é o navegador interno do TikTok
// (gente de verdade), por isso o "bytedance(?!webview)".
const BOT_UA = new RegExp([
  'facebookexternalhit', 'facebot', 'facebookcatalog', 'meta-externalagent', 'meta-externalfetcher',
  'whatsapp', 'telegrambot', 'twitterbot', 'slackbot', 'slack-imgproxy', 'discordbot', 'linkedinbot',
  'pinterestbot', 'redditbot', 'skypeuripreview', 'embedly', 'vkshare',
  'bytespider', 'tiktokspider', 'bytedance(?!webview)',
  'googlebot', 'google-inspectiontool', 'googleother', 'adsbot-google', 'mediapartners-google',
  'apis-google', 'google-read-aloud', 'feedfetcher-google', 'bingbot', 'bingpreview', 'adidxbot',
  'applebot', 'yandex', 'baiduspider', 'duckduckbot', 'petalbot', 'semrushbot', 'ahrefsbot', 'mj12bot',
  'headlesschrome', 'lighthouse', 'chrome-lighthouse', 'phantomjs', 'python-requests', 'curl/', 'wget/',
  '[a-z]bot/', '\\b(bot|crawler|spider|preview)\\b',
].join('|'), 'i');

export function isBotUa(ua: string | null): boolean {
  return !ua || BOT_UA.test(ua);
}

// Página aberta em segundo plano pelo navegador (prefetch / prerender), sem a pessoa tocar.
export function isPrefetch(h: Headers): boolean {
  const p = [h.get('sec-purpose'), h.get('purpose'), h.get('x-purpose'), h.get('x-moz')].join(' ').toLowerCase();
  return /prefetch|prerender|preview/.test(p);
}

function v4ToInt(ip: string): number | null {
  const p = ip.split('.');
  if (p.length !== 4) return null;
  let n = 0;
  for (const x of p) {
    const b = Number(x);
    if (!/^\d{1,3}$/.test(x) || b > 255) return null;
    n = n * 256 + b;
  }
  return n;
}

function v6ToBig(ip: string): bigint | null {
  if (ip.includes('.')) return null; // IPv4 embutido: não aparece nesses robôs
  const [head, tail] = ip.split('::');
  if (ip.split('::').length > 2) return null;
  const h = head ? head.split(':') : [];
  const t = tail !== undefined && tail ? tail.split(':') : [];
  const fill = ip.includes('::') ? 8 - h.length - t.length : 0;
  const parts = [...h, ...Array(fill).fill('0'), ...t];
  if (parts.length !== 8) return null;
  let n = 0n;
  for (const x of parts) {
    if (!/^[0-9a-f]{1,4}$/i.test(x)) return null;
    n = (n << 16n) + BigInt(parseInt(x, 16));
  }
  return n;
}

const NETS_V4 = BOT_V4.map((c) => {
  const [a, bits] = c.split('/');
  const size = 2 ** (32 - Number(bits));
  return [v4ToInt(a)!, size] as const;
});
const NETS_V6 = BOT_V6.map((c) => {
  const [a, bits] = c.split('/');
  return [v6ToBig(a)!, BigInt(128 - Number(bits))] as const;
});

// O IP só é comparado aqui, na memória: não é gravado nem registrado em log.
export function isBotNetwork(ip: string | null): boolean {
  if (!ip) return false;
  ip = ip.trim();
  const n4 = v4ToInt(ip);
  if (n4 !== null) return NETS_V4.some(([net, size]) => n4 >= net && n4 < net + size);
  const n6 = v6ToBig(ip.toLowerCase());
  if (n6 !== null) return NETS_V6.some(([net, shift]) => (n6 >> shift) === (net >> shift));
  return false;
}

export function clientIp(h: Headers): string | null {
  return h.get('cf-connecting-ip') || h.get('x-real-ip') ||
    (h.get('x-forwarded-for') || '').split(',')[0].trim() || null;
}

// Motivo para não contar, ou null para contar.
export function motivoRobo(h: Headers): string | null {
  if (isBotUa(h.get('user-agent'))) return 'ua';
  if (isPrefetch(h)) return 'prefetch';
  if (isBotNetwork(clientIp(h))) return 'rede';
  return null;
}
