// Pagina /plano/: barra fixa do botao no celular e video que so baixa ao tocar.
// Sem cookie, sem armazenamento e sem chamada para fora.
(function () {
  'use strict';

  // Barra fixa: aparece depois do botao do topo e some quando a chamada final esta na tela.
  var barra = document.getElementById('barra');
  var topo = document.getElementById('cta-topo');
  var fim = document.getElementById('final');
  if (barra && topo && fim && 'IntersectionObserver' in window) {
    var passouTopo = false, noFim = false;
    var mostrar = function () {
      var on = passouTopo && !noFim;
      barra.classList.toggle('on', on);
      barra.setAttribute('aria-hidden', on ? 'false' : 'true');
      barra.querySelector('a').tabIndex = on ? 0 : -1;
    };
    new IntersectionObserver(function (e) {
      passouTopo = !e[0].isIntersecting && e[0].boundingClientRect.top < 0; mostrar();
    }).observe(topo);
    new IntersectionObserver(function (e) { noFim = e[0].isIntersecting; mostrar(); }, { rootMargin: '0px 0px -20% 0px' }).observe(fim);
  }

  // GIFs dos exercicios: so baixam quando estao a uma tela de distancia.
  var gifs = document.querySelectorAll('img[data-src]');
  var carrega = function (img) { img.src = img.getAttribute('data-src'); img.removeAttribute('data-src'); };
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { carrega(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '400px 0px' });
    gifs.forEach(function (g) { io.observe(g); });
  } else {
    gifs.forEach(carrega);
  }

  // Video: o arquivo so e pedido quando a pessoa toca (data-video vazio = ainda nao existe).
  var v = document.getElementById('video');
  if (v) v.addEventListener('click', function () {
    var src = v.getAttribute('data-video');
    if (!src || v.querySelector('video')) return;
    var el = document.createElement('video');
    el.src = src; el.controls = true; el.autoplay = true; el.playsInline = true;
    el.setAttribute('playsinline', '');
    v.appendChild(el);
  });
})();
