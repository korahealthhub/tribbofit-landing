/*
 * Faixa de cookies + Meta Pixel (Pixel Tribbofit).
 * O pixel só carrega depois que a pessoa toca em "Aceitar".
 * A escolha fica no localStorage ('tribbo_consent': 'accepted' | 'declined').
 *
 * Eventos enviados à Meta:
 *   - PageView em cada página
 *   - Lead { store: 'ios' | 'android' } no clique em App Store / Google Play
 * Nada de saúde, e-mail ou telefone: sem advanced matching e sem autoConfig
 * (que leria textos de botões e campos de formulário).
 *
 * Uso: <script src="/consent.js" defer></script>
 * Em /download/: data-banner="inapp-only" (fora do in-app a página só redireciona).
 */
(function () {
  var PIXEL_ID = '975639901668813';
  var KEY = 'tribbo_consent';
  var script = document.currentScript;
  var bannerMode = (script && script.getAttribute('data-banner')) || 'on';

  function getChoice() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function setChoice(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }

  // ─── Meta Pixel ──────────────────────────────────────────────────
  var pixelLoaded = false;
  function loadPixel() {
    if (pixelLoaded) return;
    pixelLoaded = true;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('set', 'autoConfig', false, PIXEL_ID);
    fbq('init', PIXEL_ID);
    fbq('track', 'PageView');
  }

  // Apaga os cookies da Meta (_fbp/_fbc) ao recusar depois de ter aceitado.
  function clearMetaCookies() {
    var host = location.hostname.replace(/^www\./, '');
    ['_fbp', '_fbc'].forEach(function (name) {
      [host, '.' + host, ''].forEach(function (d) {
        document.cookie = name + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : '');
      });
    });
  }

  // ─── Lead nos botões das lojas ───────────────────────────────────
  function storeFor(a) {
    var href = a.getAttribute('href') || '';
    if (href.indexOf('apps.apple.com') !== -1) return 'ios';
    if (href.indexOf('play.google.com') !== -1 || /\/android\/?$/.test(href)) return 'android';
    // No in-app browser os links da App Store viram /download/ (ou "#" no
    // botão iOS da própria /download/): continuam sendo o botão da loja.
    if (a.id === 'btn-ios' || /\/download\/?(\?|$)/.test(href)) {
      var ua = navigator.userAgent || '';
      return /Android/i.test(ua) ? 'android' : 'ios';
    }
    return null;
  }

  document.addEventListener('click', function (ev) {
    if (!pixelLoaded || !ev.target.closest) return;
    var a = ev.target.closest('a');
    if (!a) return;
    var store = storeFor(a);
    if (store) fbq('track', 'Lead', { store: store });
  }, true);

  // ─── Faixa de cookies ────────────────────────────────────────────
  var CSS =
    '.tc-banner{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;' +
    'max-width:560px;margin:0 auto;padding:16px 18px;border-radius:18px;' +
    'background:rgba(10,26,24,0.97);border:1px solid rgba(237,251,107,0.22);' +
    'box-shadow:0 12px 40px rgba(0,0,0,0.45);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);' +
    'font-family:Manrope,Inter,system-ui,-apple-system,sans-serif;color:#F5F0E6;' +
    'display:flex;align-items:center;gap:16px;flex-wrap:wrap;' +
    'animation:tcUp .3s ease}' +
    '@keyframes tcUp{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}' +
    '.tc-text{flex:1 1 240px;margin:0;font-size:14px;line-height:1.5;color:rgba(245,240,230,0.8)}' +
    '.tc-text a{color:#EDFB6B;text-decoration:underline;text-underline-offset:3px}' +
    '.tc-actions{display:flex;gap:8px;flex:0 0 auto}' +
    '.tc-btn{font:inherit;font-size:14px;font-weight:700;padding:10px 18px;border-radius:50px;' +
    'cursor:pointer;border:1px solid transparent;transition:transform .18s,background .18s}' +
    '.tc-btn:hover{transform:translateY(-1px)}' +
    '.tc-btn:focus-visible{outline:2px solid #EDFB6B;outline-offset:2px}' +
    '.tc-accept{background:linear-gradient(135deg,#B5C904,#EDFB6B);color:#0A0A0A}' +
    '.tc-decline{background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.14);color:#F5F0E6}' +
    '.tc-decline:hover{background:rgba(255,255,255,0.1)}' +
    '@media(max-width:480px){.tc-actions{width:100%}.tc-btn{flex:1}}';

  var banner = null;
  function showBanner() {
    if (banner) return;
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    banner = document.createElement('div');
    banner.className = 'tc-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Aviso de cookies');
    banner.innerHTML =
      '<p class="tc-text">Usamos cookies para medir de onde vêm as visitas e melhorar nossos anúncios. ' +
      '<a href="/privacidade/#pt-3">Política de Privacidade</a></p>' +
      '<div class="tc-actions">' +
      '<button type="button" class="tc-btn tc-decline">Recusar</button>' +
      '<button type="button" class="tc-btn tc-accept">Aceitar</button>' +
      '</div>';
    banner.querySelector('.tc-accept').addEventListener('click', function () {
      setChoice('accepted');
      hideBanner();
      loadPixel();
    });
    banner.querySelector('.tc-decline').addEventListener('click', function () {
      setChoice('declined');
      hideBanner();
    });
    document.body.appendChild(banner);
  }
  function hideBanner() {
    if (banner) { banner.remove(); banner = null; }
  }

  // Usado pelo botão "Mudar minha escolha" da Política de Privacidade.
  window.tribboConsent = {
    reset: function () {
      var wasAccepted = getChoice() === 'accepted';
      try { localStorage.removeItem(KEY); } catch (e) {}
      if (wasAccepted) {
        clearMetaCookies();
        location.reload(); // descarrega o pixel desta página
        return;
      }
      showBanner();
    }
  };

  // ─── Início ──────────────────────────────────────────────────────
  var choice = getChoice();
  if (choice === 'accepted') {
    loadPixel();
  } else if (choice !== 'declined') {
    var wantBanner = bannerMode === 'on' ||
      (bannerMode === 'inapp-only' && document.body.classList.contains('is-inapp'));
    if (wantBanner) showBanner();
  }
})();
