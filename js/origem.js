/*
 * Origem dos downloads: links curtos (/ig, /tt, /download...) e botões das lojas.
 *
 * - Lê utm_source / utm_medium / utm_campaign / utm_content da URL (ou dos
 *   atributos data-* do <script>, nos links curtos) e guarda no sessionStorage
 *   da aba ('tribbo_origem'). Sem cookie e sem identificador.
 * - Sem origem: site / direto / nenhuma.
 * - App Store: link de campanha da Apple (pt + ct, até 40 caracteres).
 *   Google Play: &referrer= com as UTMs codificadas.
 * - Conta o clique na função track-click do Supabase (só origem, mídia,
 *   campanha, conteúdo, aparelho, entrada, in_app, reaberto).
 * - GA4 / TikTok / Meta continuam no /consent.js, só depois do aceite.
 *
 * Uso:
 *   Página com botões:  <script src="/js/origem.js" defer></script>
 *   Link curto:         <script src="/js/origem.js" defer data-redirect data-entrada="ig"
 *                         data-source="instagram" data-medium="organic" data-campaign="perfil"></script>
 * Botão de loja que não deve contar clique: data-origem-sem-contagem.
 * Convenção dos nomes: docs/links-de-campanha.md
 */
(function () {
  // Provider token da Apple: App Store Connect → Analytics → Aquisição → Campanhas →
  // "Gerar link de campanha" (o número depois de pt=). Vazio: App Store sem campanha.
  var APPLE_PT = '';
  var APPLE_ID = '6769632514';
  var PLAY_ID = 'com.usekoraapp.health';
  var TRACK_URL = 'https://jllkcglzajmzqywyuswq.supabase.co/functions/v1/track-click';
  var KEY = 'tribbo_origem';
  var DEFAULT = { source: 'site', medium: 'direto', campaign: 'nenhuma', content: '' };

  var script = document.currentScript;
  var params = new URLSearchParams(location.search);

  // Mesma regra da função track-click: minúsculas, sem acento, só [a-z0-9_-], até 40.
  function clean(v) {
    if (typeof v !== 'string') return '';
    return v.normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().trim()
      .replace(/[\s.]+/g, '-')
      .replace(/[^a-z0-9_-]/g, '')
      .slice(0, 40);
  }

  function device() {
    var ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return 'ios'; // iPadOS
    if (/Android/i.test(ua)) return 'android';
    return 'desktop';
  }

  function isInApp() {
    return /Instagram|FBAN|FBAV|musical_ly|TikTok|BytedanceWebview|Snapchat|Threads/i.test(navigator.userAgent || '');
  }

  function readStored() {
    try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }
  function store(o) {
    try { sessionStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {}
  }

  // Origem desta visita: data-* do link curto, sobrescritos pelos utm_* da URL.
  function resolve() {
    var preset = {};
    ['source', 'medium', 'campaign', 'content'].forEach(function (k) {
      var fromUrl = clean(params.get('utm_' + k));
      var fromTag = script ? clean(script.getAttribute('data-' + k)) : '';
      if (fromUrl || fromTag) preset[k] = fromUrl || fromTag;
    });
    if (preset.source) {
      var o = {
        source: preset.source,
        medium: preset.medium || 'nenhuma',
        campaign: preset.campaign || 'nenhuma',
        content: preset.content || '',
      };
      store(o);
      return o;
    }
    return readStored() || DEFAULT;
  }

  var origem = resolve();

  function utmQuery(o) {
    var q = 'utm_source=' + o.source + '&utm_medium=' + o.medium + '&utm_campaign=' + o.campaign;
    return o.content ? q + '&utm_content=' + o.content : q;
  }

  function appleCampaign(o) {
    return [o.source, o.medium, o.campaign, o.content].filter(Boolean).join('_').slice(0, 40);
  }

  function appleUrl(o) {
    if (!APPLE_PT) return 'https://apps.apple.com/br/app/id' + APPLE_ID;
    return 'https://apps.apple.com/app/apple-store/id' + APPLE_ID +
      '?pt=' + APPLE_PT + '&ct=' + encodeURIComponent(appleCampaign(o)) + '&mt=8';
  }

  function playUrl(o) {
    return 'https://play.google.com/store/apps/details?id=' + PLAY_ID +
      '&referrer=' + encodeURIComponent(utmQuery(o));
  }

  // via=qr / via=site / via=kh: por onde a pessoa chegou ao link curto.
  function entrada(base) {
    var via = clean(params.get('via'));
    return via ? base + '-' + via : base;
  }

  function track(entradaNome, extra) {
    var body = JSON.stringify({
      source: origem.source,
      medium: origem.medium,
      campaign: origem.campaign,
      content: origem.content || null,
      device: device(),
      entrada: entradaNome,
      in_app: isInApp(),
      reaberto: !!(extra && extra.reaberto),
    });
    try {
      // text/plain não dispara preflight de CORS e o envio sobrevive à troca de página.
      if (navigator.sendBeacon && navigator.sendBeacon(TRACK_URL, new Blob([body], { type: 'text/plain' }))) return;
    } catch (e) {}
    try {
      fetch(TRACK_URL, { method: 'POST', body: body, keepalive: true, mode: 'no-cors', headers: { 'Content-Type': 'text/plain' } });
    } catch (e) {}
  }

  function consentAccepted() {
    try { return localStorage.getItem('tribbo_consent') === 'accepted'; } catch (e) { return false; }
  }

  function navigate(url) {
    (window.__tribboNavigate || function (u) { location.replace(u); })(url);
  }

  function gaEvent(name, extra) {
    if (typeof window.gtag !== 'function') return;
    var p = { utm_source: origem.source, utm_medium: origem.medium, utm_campaign: origem.campaign, utm_content: origem.content || '(none)' };
    for (var k in extra) p[k] = extra[k];
    window.gtag('event', name, p);
  }

  // ─── Botões das lojas em qualquer página ─────────────────────────
  function kindOf(a) {
    var href = a.getAttribute('href') || '';
    if (href.indexOf('write-review') !== -1) return null;
    if (href.indexOf('apps.apple.com') !== -1) return 'ios';
    if (href.indexOf('play.google.com') !== -1) return 'android';
    var url;
    try { url = new URL(href, location.href); } catch (e) { return null; }
    if (url.origin !== location.origin) return null;
    if (/^\/android\/?$/.test(url.pathname)) return 'android';
    if (/^\/download\/?$/.test(url.pathname)) return 'download';
    return null;
  }

  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a') : null;
    if (!a) return;
    var kind = kindOf(a);
    if (!kind) return;

    if (kind === 'download') {
      // No navegador interno os botões viram /download/: leva a origem junto, e a
      // própria /download/ conta o clique.
      a.setAttribute('href', '/download/?' + utmQuery(origem) + '&via=site');
      return;
    }
    a.setAttribute('href', kind === 'ios' ? appleUrl(origem) : playUrl(origem));
    if (a.hasAttribute('data-origem-sem-contagem')) return;
    track(a.getAttribute('data-entrada') || 'botao-site');
    gaEvent('click_store', { store: kind });
  }, true);

  // ─── API para as páginas (/download/, página inicial) ────────────
  window.TribboOrigem = {
    origem: origem,
    device: device,
    isInApp: isInApp,
    utmQuery: function () { return utmQuery(origem); },
    appleUrl: function () { return appleUrl(origem); },
    playUrl: function () { return playUrl(origem); },
    storeUrl: function () {
      var d = device();
      return d === 'ios' ? appleUrl(origem) : d === 'android' ? playUrl(origem) : '/?' + utmQuery(origem);
    },
    entrada: entrada,
    track: track,
    gaEvent: gaEvent,
    consentAccepted: consentAccepted,
    navigate: navigate,
  };

  // ─── Link curto: conta, e manda para a loja certa ────────────────
  if (script && script.hasAttribute('data-redirect')) {
    var nome = entrada(script.getAttribute('data-entrada') || 'link');
    var reaberto = params.get('r') === '1';
    var destino = window.TribboOrigem.storeUrl();
    track(nome, { reaberto: reaberto });
    gaEvent('smart_link_redirect', { entrada: nome, device: device() });
    if (window.ttq && typeof window.ttq.track === 'function') {
      window.ttq.track('ClickButton', { contents: [{ content_id: nome + '_' + device(), content_type: 'app', content_name: 'Tribbo Smart Link - ' + nome }] });
    }
    // Com aceite, dá tempo para GA4 / TikTok / Meta enviarem o evento.
    if (consentAccepted()) setTimeout(function () { navigate(destino); }, 300);
    else navigate(destino);
  }
})();
