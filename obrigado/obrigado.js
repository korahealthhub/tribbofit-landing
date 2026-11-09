/*
 * /obrigado/: depois do pagamento na Cakto.
 * A Cakto devolve a pessoa em /obrigado/?acesso=<callback>, em que callback = "<lead_id>.<assinatura>"
 * (o quiz monta assim antes de ir para o checkout). Com isso, a pagina pergunta ao web-access-status
 * (endereco em /js/funil.js) a cada 3 s nos 2 primeiros minutos e depois a cada 10 s, ate 30 minutos:
 *   waiting  → "Confirmando seu pagamento..." (+ aviso do Pix depois de 10 s)
 *   ready com o codigo vencido → aviso com o WhatsApp para liberar o acesso
 *   ready    → e-mail da conta e os 2 passos (no 2: "Já instalei: abrir meu plano", koraapp://entrar?acesso=, e o codigo com "Copiar")
 *   refunded → aviso + suporte
 *   404 ou sem ?acesso → "o código chega no seu e-mail" + suporte
 * Nada guardado no navegador. Eventos (PostHog sem cookie): web_success_viewed, web_code_copied, web_store_clicked, web_app_open_clicked, web_whatsapp_clicked.
 */
(function () {
  'use strict';
  var F = window.TF_FUNIL;
  var raiz = document.getElementById('ob');
  var medir = function (ev, extra) { if (window.tribboMedida) window.tribboMedida(ev, extra); };
  medir('web_success_viewed');

  function h(tag, props) {
    var el = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v; // so SVG fixo deste arquivo
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      (Array.isArray(c) ? c : [c]).forEach(function (x) { if (x != null && x !== false) el.append(x.nodeType ? x : String(x)); });
    }
    return el;
  }
  var SUPORTE = F.suporte;
  var mailSuporte = function (assunto) { return 'mailto:' + SUPORTE + '?subject=' + encodeURIComponent(assunto); };
  var whats = function (texto) { return 'https://wa.me/' + F.whatsapp + '?text=' + encodeURIComponent(texto); };
  var MSG_AJUDA = 'Oi! Acabei de assinar o Tribbo Fit e preciso de ajuda com meu acesso';
  function pinta() { raiz.replaceChildren.apply(raiz, Array.prototype.slice.call(arguments)); var t = raiz.querySelector('h1'); if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); } }

  // ─── Estados ────────────────────────────────────────────────────────────────
  var pixEl = null;
  function aguardando() {
    pixEl = h('p', { class: 'ob-pix', hidden: true }, 'Assim que o Pix for confirmado, seu código aparece aqui e também chega no seu e-mail.');
    pinta(h('section', { class: 'ob-card ob-espera' },
      h('span', { class: 'ob-giro', 'aria-hidden': 'true' }),
      h('h1', null, 'Confirmando seu pagamento...'),
      h('p', { class: 'ob-sub' }, 'Isso leva só alguns segundos.'),
      pixEl));
  }
  function mostraPix() { if (pixEl) pixEl.hidden = false; }

  function semAcesso(titulo, texto) {
    pinta(h('section', { class: 'ob-card' },
      h('h1', null, titulo),
      h('p', { class: 'ob-sub' }, texto),
      h('p', { class: 'ob-sub' }, 'Não chegou? Confira o spam ou escreva para ', h('a', { href: mailSuporte('Meu código de acesso') }, SUPORTE), '.')));
  }

  function vencido() {
    pinta(h('section', { class: 'ob-card' },
      h('h1', null, 'Este código venceu.'),
      h('p', { class: 'ob-sub' }, 'Chame a gente no WhatsApp que liberamos seu acesso na hora.'),
      h('a', { class: 'btn ob-abrir', href: whats(MSG_AJUDA), target: '_blank', rel: 'noopener', onclick: function () { medir('web_whatsapp_clicked'); } }, 'Chamar no WhatsApp'),
      h('p', { class: 'ob-sub' }, 'Se preferir, escreva para ', h('a', { href: mailSuporte('Meu código de acesso venceu') }, SUPORTE), '.')));
  }

  function pronto(r) {
    var ua = navigator.userAgent;
    var ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    var android = /Android/.test(ua);
    var celular = ios || android;

    // A pessoa digita so as letras e os numeros, sem o TRB: o "Copiar" copia essa parte; o TRB aparece mais claro.
    var semTrb = String(r.code).replace(/^TRB-?/i, '');
    var btnCopiar = h('button', { type: 'button', class: 'ob-copiar' }, 'Copiar');
    var codigoEl = h('span', { class: 'ob-codigo', id: 'ob-codigo' }, /^TRB-?/i.test(r.code) && h('span', { class: 'ob-trb' }, 'TRB-'), h('span', { class: 'ob-cod-parte' }, semTrb));
    btnCopiar.addEventListener('click', function () {
      var feito = function () { btnCopiar.textContent = 'Copiado!'; setTimeout(function () { btnCopiar.textContent = 'Copiar'; }, 2200); };
      medir('web_code_copied');
      var plano = function () {
        var sel = window.getSelection(), rg = document.createRange();
        rg.selectNodeContents(codigoEl.querySelector('.ob-cod-parte')); sel.removeAllRanges(); sel.addRange(rg);
        try { document.execCommand('copy'); feito(); } catch (e) { btnCopiar.textContent = 'Selecionado: copie o código'; }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(semTrb).then(feito, plano); else plano();
    });

    var loja = function (tipo) {
      var apple = tipo === 'apple';
      var minha = apple ? ios : android;
      return h('a', {
        class: 'ob-loja' + (minha ? ' mine' : ''), href: apple ? F.lojas.apple : F.lojas.google, target: '_blank', rel: 'noopener',
        onclick: function () { medir('web_store_clicked', { store: apple ? 'app_store' : 'google_play' }); },
      },
        minha && h('span', { class: 'ob-tag' }, 'Para o seu celular'),
        h('img', { src: apple ? '/plano/assets/app-store.svg' : '/plano/assets/google-play.webp', alt: apple ? 'Baixar na App Store' : 'Disponível no Google Play' }));
    };
    var qr = function (tipo) {
      var apple = tipo === 'apple';
      return h('a', {
        class: 'ob-qr', href: apple ? F.lojas.apple : F.lojas.google, target: '_blank', rel: 'noopener',
        onclick: function () { medir('web_store_clicked', { store: apple ? 'app_store' : 'google_play' }); },
      },
        h('img', { class: 'qr', src: apple ? '/obrigado/assets/qr-app-store.svg' : '/obrigado/assets/qr-google-play.svg', alt: apple ? 'QR code da App Store' : 'QR code do Google Play', width: 150, height: 150 }),
        h('img', { class: 'selo', src: apple ? '/plano/assets/app-store.svg' : '/plano/assets/google-play.webp', alt: '' }));
    };
    var ordem = android ? ['google', 'apple'] : ['apple', 'google'];

    var dias = 7;
    if (r.expires_at) { var ms = Date.parse(r.expires_at) - Date.now(); if (ms > 0) dias = Math.max(1, Math.round(ms / 86400000)); }

    pinta(
      h('section', { class: 'ob-card' },
        h('div', { class: 'ob-feito' },
          h('span', { class: 'ob-ok', html: '<svg viewBox="0 0 24 24" fill="none" stroke="#0E1A1D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' }),
          h('h1', null, 'Pronto! Seu acesso está liberado.')),
        r.email && h('div', { class: 'ob-conta' },
          h('p', { class: 'ob-rot' }, 'Sua conta'),
          h('p', { class: 'ob-email' }, r.email.split('@')[0], r.email.includes('@') ? h('wbr') : null, r.email.includes('@') ? '@' + r.email.split('@').slice(1).join('@') : null),
          h('p', { class: 'ob-errado' }, 'Está errado? ',
            h('a', { href: whats(MSG_AJUDA), target: '_blank', rel: 'noopener', onclick: function () { medir('web_whatsapp_clicked'); } }, 'Fale com a gente no WhatsApp'),
            ' ou escreva para ', h('a', { href: mailSuporte('E-mail errado na compra') }, SUPORTE), '.'))),
      h('section', { class: 'ob-card ob-passo' },
        h('span', { class: 'ob-num', 'aria-hidden': 'true' }, '1'),
        h('div', { class: 'ob-passo-txt' },
          h('h2', null, 'Baixe o app'),
          celular
            ? h('div', { class: 'ob-lojas' }, ordem.map(loja))
            : [h('p', { class: 'ob-qr-dica' }, 'Aponte a câmera do celular para o QR code da sua loja.'), h('div', { class: 'ob-qrs' }, ordem.map(qr))])),
      h('section', { class: 'ob-card ob-passo' },
        h('span', { class: 'ob-num', 'aria-hidden': 'true' }, '2'),
        h('div', { class: 'ob-passo-txt' },
          h('h2', null, 'Abra o app e toque em ', h('b', null, 'Tenho um código de acesso'), '.'),
          h('p', { class: 'ob-sub' }, 'Você só digita as letras e os números, sem o TRB.'),
          // No celular: abre o app direto com o codigo (koraapp://entrar?acesso=...). O codigo e o Copiar ficam logo abaixo como alternativa.
          celular && h('a', { class: 'btn ob-abrir', href: 'koraapp://entrar?acesso=' + encodeURIComponent(r.code), onclick: function () { medir('web_app_open_clicked'); } }, 'Já instalei: abrir meu plano'),
          h('div', { class: 'ob-codigo-box' },
            h('p', { class: 'ob-rot' }, 'Seu código de acesso'),
            h('div', { class: 'ob-codigo-linha' }, codigoEl, btnCopiar)),
          h('p', { class: 'ob-semsenha' }, 'Você não precisa de senha.'),
          h('p', { class: 'ob-validade' }, 'O código vale por ' + dias + (dias === 1 ? ' dia' : ' dias') + ' e também foi para o seu e-mail.'))));
  }

  // ─── Consulta ───────────────────────────────────────────────────────────────
  var m = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([0-9a-f]{16,64})$/i.exec(new URLSearchParams(location.search).get('acesso') || '');
  if (!m) {
    semAcesso('Pagamento recebido!', 'Seu código de acesso chega no e-mail que você usou na compra, com o passo a passo para entrar no app.');
    return;
  }
  var corpo = JSON.stringify({ lead_id: m[1].toLowerCase(), token: m[2].toLowerCase() });
  var inicio = Date.now();
  var acabou = false;
  aguardando();
  setTimeout(mostraPix, 10000);

  function consulta() {
    if (acabou) return;
    fetch(F.acessoStatus, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corpo, credentials: 'omit', cache: 'no-store' })
      .then(function (res) { return res.json().then(function (j) { return { s: res.status, j: j }; }, function () { return { s: res.status, j: {} }; }); })
      .then(function (r) {
        if (r.s === 404) { acabou = true; semAcesso('Não achamos esse acesso', 'O link pode estar incompleto. Seu código de acesso também chega no e-mail que você usou na compra.'); return; }
        if (r.s === 200 && (r.j.status === 'expired' || (r.j.status === 'ready' && r.j.expires_at && Date.parse(r.j.expires_at) < Date.now()))) { acabou = true; vencido(); return; }
        if (r.s === 200 && r.j.status === 'ready' && r.j.code) { acabou = true; pronto(r.j); return; }
        if (r.s === 200 && r.j.status === 'refunded') { acabou = true; semAcesso('Este pagamento foi estornado', 'Se isso foi um engano, fale com a gente que resolvemos.'); return; }
        agenda();
      })
      .catch(agenda);
  }
  function agenda() {
    var passou = Date.now() - inicio;
    if (passou > 30 * 60000) { acabou = true; semAcesso('Seu código chega no seu e-mail', 'A confirmação está demorando mais do que o normal. Assim que o pagamento for confirmado, o código chega no e-mail que você usou na compra.'); return; }
    if (passou > 2 * 60000) mostraPix();
    setTimeout(consulta, passou < 2 * 60000 ? 3000 : 10000);
  }
  consulta();
})();
