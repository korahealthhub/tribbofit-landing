/*
 * /tutoriais/ (27/11/2026): abre o vídeo do card num player por cima da lista, com Anterior e Próximo.
 * Endereço #video-N: o Voltar do celular fecha o player, e o link com #video-3 já abre no vídeo 3.
 * PostHog sem cookie (/js/medida.js): tutorial_page_viewed ao abrir a página e tutorial_video_played
 * na primeira vez que o vídeo toca depois de aberto (video = número do vídeo).
 */
(function () {
  'use strict';
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card[data-n]'));
  var player = document.getElementById('player');
  var video = document.getElementById('video');
  var numEl = document.getElementById('player-num');
  var nomeEl = document.getElementById('player-nome');
  var ant = document.getElementById('anterior');
  var prox = document.getElementById('proximo');
  var fechar = document.getElementById('fechar');
  var atual = 0;          // índice do card aberto (0 = nenhum aberto quando player.hidden)
  var empurrou = false;   // abrimos com pushState (o fechar volta o histórico)
  var contou = false;     // tutorial_video_played já enviado nesta abertura
  var cardFoco = null;

  function medir(evento, extra) {
    try { if (typeof window.tribboMedida === 'function') window.tribboMedida(evento, extra); } catch (e) {}
  }

  function mostrar(i, tocar) {
    var c = cards[i];
    atual = i;
    contou = false;
    numEl.textContent = 'Vídeo ' + c.dataset.n + ' de ' + cards.length;
    nomeEl.textContent = c.querySelector('.nome').textContent;
    video.poster = c.dataset.capa;
    video.src = c.dataset.src;
    ant.disabled = i === 0;
    prox.disabled = i === cards.length - 1;
    if (tocar) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
  }

  function abrir(i, tocar, comHistorico) {
    if (player.hidden) {
      cardFoco = cards[i];
      player.hidden = false;
      document.body.classList.add('travado');
    }
    mostrar(i, tocar);
    var hash = '#video-' + cards[i].dataset.n;
    if (comHistorico && location.hash !== hash) {
      if (empurrou) history.replaceState(null, '', hash);
      else { history.pushState(null, '', hash); empurrou = true; }
    }
    fechar.focus({ preventScroll: true });
  }

  function fecharPlayer() {
    if (player.hidden) return;
    video.pause();
    video.removeAttribute('src');
    video.load();
    player.hidden = true;
    document.body.classList.remove('travado');
    if (cardFoco) cardFoco.focus({ preventScroll: true });
  }

  function pedirFechar() {
    if (empurrou) { history.back(); return; } // o popstate fecha
    fecharPlayer();
    if (/^#video-\d+$/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
  }

  function indicePeloHash() {
    var m = /^#video-(\d+)$/.exec(location.hash);
    if (!m) return -1;
    for (var i = 0; i < cards.length; i++) if (cards[i].dataset.n === m[1]) return i;
    return -1;
  }

  cards.forEach(function (c, i) {
    c.addEventListener('click', function () { abrir(i, true, true); });
  });
  ant.addEventListener('click', function () { if (atual > 0) abrir(atual - 1, true, true); });
  prox.addEventListener('click', function () { if (atual < cards.length - 1) abrir(atual + 1, true, true); });
  fechar.addEventListener('click', pedirFechar);
  document.addEventListener('keydown', function (e) {
    if (player.hidden) return;
    if (e.key === 'Escape') pedirFechar();
  });
  window.addEventListener('popstate', function () {
    var i = indicePeloHash();
    if (i === -1) { empurrou = false; fecharPlayer(); }
    else abrir(i, false, false);
  });

  video.addEventListener('play', function () {
    if (contou) return;
    contou = true;
    medir('tutorial_video_played', { page: 'tutoriais', video: Number(cards[atual].dataset.n) });
  });

  medir('tutorial_page_viewed', { page: 'tutoriais' });
  var inicial = indicePeloHash();
  if (inicial !== -1) abrir(inicial, false, false);
})();
