// Pagina /plano/: barra fixa do botao no celular, menu, exemplo do plano e video que so baixa ao tocar.
// Sem cookie e sem armazenamento. Fora daqui: so a medicao de uso (/js/medida.js, PostHog sem cookie).
(function () {
  'use strict';

  // Medicao de uso: pagina vista e qual botao "Criar meu plano gratis" foi tocado.
  var medir = function (ev, extra) { if (window.tribboMedida) window.tribboMedida(ev, extra); };
  var pagina = /comunidade/.test(location.pathname) ? 'comunidade' : 'plano';
  medir('web_plano_viewed', { page: pagina });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="/quiz/"]');
    if (!a) return;
    var sec = a.closest('section');
    var botao = a.id ? a.id.replace(/^cta-/, '') : a.closest('.barra') ? 'barra' : a.classList.contains('btn-mini') ? 'menu' : sec && sec.id ? sec.id : 'outro';
    medir('web_plano_cta_clicked', { page: pagina, button: botao });
  }, true);

  // Botoes "Criar meu plano gratis": levam para o /quiz/ os parametros da URL (utm_source, utm_medium,
  // utm_campaign, utm_content e parecidos), para sabermos de qual anuncio veio cada pessoa.
  if (location.search.length > 1) {
    document.querySelectorAll('a[href="/quiz/"]').forEach(function (l) { l.setAttribute('href', '/quiz/' + location.search); });
  }

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
      // A faixa de cookies (consent.js) sobe para ficar acima da barra e nunca cobrir o botão.
      document.documentElement.style.setProperty('--tc-acima', on && getComputedStyle(barra).display !== 'none' ? barra.offsetHeight + 'px' : '0px');
    };
    new IntersectionObserver(function (e) {
      passouTopo = !e[0].isIntersecting && e[0].boundingClientRect.top < 0; mostrar();
    }).observe(topo);
    new IntersectionObserver(function (e) { noFim = e[0].isIntersecting; mostrar(); }, { rootMargin: '0px 0px -20% 0px' }).observe(fim);
  }

  // Faixa de cookies (consent.js): em tela baixa, se o botão do topo cairia embaixo dela, ela vai para o alto.
  var ctaTopo = document.getElementById('cta-topo');
  if (ctaTopo) {
    var checaFaixa = function () {
      var f = document.querySelector('.tc-banner');
      var raiz = document.documentElement;
      if (!f) { raiz.classList.remove('tc-alto'); return; }
      var c = ctaTopo.getBoundingClientRect();
      var alturaFaixa = f.offsetHeight + 24;
      raiz.classList.toggle('tc-alto', c.bottom > innerHeight - alturaFaixa && c.top < innerHeight);
    };
    var pedido = 0;
    var agenda = function () { if (!pedido) pedido = requestAnimationFrame(function () { pedido = 0; checaFaixa(); }); };
    addEventListener('scroll', agenda, { passive: true });
    addEventListener('resize', agenda);
    document.addEventListener('click', function () { setTimeout(checaFaixa, 0); });
    if ('MutationObserver' in window) new MutationObserver(agenda).observe(document.body, { childList: true });
    agenda();
  }

  // Menu do celular: abre a lista e fecha ao tocar num item, ao tocar fora ou no Esc.
  var botaoMenu = document.getElementById('abre-menu');
  var lista = document.getElementById('menu-lista');
  if (botaoMenu && lista) {
    var fechar = function () { lista.hidden = true; botaoMenu.setAttribute('aria-expanded', 'false'); botaoMenu.setAttribute('aria-label', 'Abrir menu'); };
    botaoMenu.addEventListener('click', function () {
      var abrir = lista.hidden;
      lista.hidden = !abrir;
      botaoMenu.setAttribute('aria-expanded', abrir ? 'true' : 'false');
      botaoMenu.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu');
    });
    lista.addEventListener('click', function (e) { if (e.target.closest('a')) fechar(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !lista.hidden) { fechar(); botaoMenu.focus(); } });
    document.addEventListener('click', function (e) { if (!lista.hidden && !e.target.closest('.menu')) fechar(); });
  }

  // Movimento leve: cards e blocos sobem um pouco ao entrar na tela. Nada no topo e nada com "reduzir movimento".
  var calmo = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!calmo && 'IntersectionObserver' in window) {
    var itens = document.querySelectorAll('.revela');
    document.documentElement.classList.add('anima');
    var ve = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visto'); ve.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    itens.forEach(function (el) { ve.observe(el); });
  }

  // Seu plano: previa pronta com dois objetivos. O HTML ja vem com Emagrecer (vale sem JS e com "reduzir movimento").
  // Barras: parte das calorias do dia que vem de cada macro (proteina e carboidrato 4 kcal/g, gordura 9 kcal/g).
  var PLANOS = {
    emagrecer: {
      n: { kcal: 1850, agua: 2.5, prot: 130, carb: 190, gord: 60, min: 50, gasto: 300 },
      dias: ['Seg', 'Qua', 'Sex'],
      exemplo: 'Exemplo de treino · Quarta, costas e bíceps',
      exercicios: [['Puxada Frontal na Máquina', '3 × 12'], ['Remada Baixa Sentado no Cabo', '3 × 12'], ['Remada com Halteres', '3 × 10'], ['Rosca Direta com Barra', '3 × 12'], ['Rosca Martelo com Halteres', '3 × 12']],
      treino: [['Seg', 'Peito, ombro e tríceps'], ['Qua', 'Costas e bíceps'], ['Sex', 'Pernas e glúteos']],
      cardapio: [['Seg', 'Arroz, feijão e frango grelhado'], ['Ter', 'Omelete com legumes e pão integral'], ['Qua', 'Carne moída com purê e salada'], ['Qui', 'Peixe com batata-doce'], ['Sex', 'Macarrão com frango e salada']]
    },
    massa: {
      n: { kcal: 2600, agua: 3, prot: 150, carb: 330, gord: 75, min: 60, gasto: 350 },
      dias: ['Seg', 'Ter', 'Qui', 'Sex'],
      exemplo: 'Exemplo de treino · Terça, costas e bíceps',
      exercicios: [['Barra Fixa Assistida', '4 × 8'], ['Remada com Barra Inclinado', '4 × 8'], ['Puxada Frontal na Máquina', '4 × 10'], ['Rosca Direta com Barra', '4 × 10'], ['Rosca Martelo com Halteres', '3 × 12']],
      treino: [['Seg', 'Peito e tríceps'], ['Ter', 'Costas e bíceps'], ['Qui', 'Pernas e glúteos'], ['Sex', 'Ombro e braços']],
      cardapio: [['Seg', 'Arroz, feijão, carne e ovo'], ['Ter', 'Macarrão com frango e queijo'], ['Qua', 'Escondidinho de carne com salada'], ['Qui', 'Arroz, feijão e peixe com batata'], ['Sex', 'Strogonoff de frango com arroz']]
    }
  };
  var cards = document.getElementById('plano-cards');
  if (cards) {
    var anima = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) && 'IntersectionObserver' in window && 'requestAnimationFrame' in window;
    var atual = PLANOS.emagrecer, visto = !anima;
    var fmt = function (k, v) {
      var casas = k === 'agua' && v % 1 ? 1 : 0;
      return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
    };
    var pct = function (n) {
      return { prot: Math.round(n.prot * 400 / n.kcal), carb: Math.round(n.carb * 400 / n.kcal), gord: Math.round(n.gord * 900 / n.kcal) };
    };
    var escreve = function (n) {
      for (var k in n) { var el = cards.querySelector('[data-n="' + k + '"]'); if (el) el.textContent = fmt(k, n[k]); }
    };
    var barras = function (n) {
      var w = pct(n);
      for (var k in w) { var el = cards.querySelector('[data-w="' + k + '"]'); if (el) el.style.width = w[k] + '%'; }
    };
    var preenche = function (nome, itens) {
      cards.querySelector('[data-lista="' + nome + '"]').innerHTML = itens.map(function (i) { return '<li><b>' + i[0] + '</b><span>' + i[1] + '</span></li>'; }).join('');
    };
    var conta = function (de, para) {
      var t0 = null, dur = 900;
      var passo = function (t) {
        if (t0 === null) t0 = t;
        var x = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - x, 3), n = {};
        for (var k in para) {
          var v = de[k] + (para[k] - de[k]) * e;
          n[k] = k === 'agua' ? Math.round(v * 10) / 10 : Math.round(v);
        }
        escreve(n);
        if (x < 1) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    };
    // Lista do treino de exemplo com o GIF de cada exercicio (/quiz/exercicios.js). No maximo 4 GIFs na tela:
    // o 5o fica com o icone. Os GIFs so baixam perto da tela (loading="lazy").
    var exercicios = function (lista) {
      var gif = window.TF && TF.gifDe;
      cards.querySelector('[data-lista="exercicios"]').innerHTML = lista.map(function (i, n) {
        var src = n < 4 && gif ? TF.gifDe(i[0]) : null;
        var media = src
          ? '<span class="exg"><img src="' + src + '" alt="" width="44" height="44" loading="lazy" decoding="async"></span>'
          : '<span class="exg ico-ex" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/></svg></span>';
        return '<li>' + media + '<span>' + i[0] + '</span><b>' + i[1] + '</b></li>';
      }).join('');
    };
    exercicios(atual.exercicios);
    var aplica = function (p) {
      cards.querySelectorAll('[data-lista="dias"] span').forEach(function (s) { s.classList.toggle('on', p.dias.indexOf(s.textContent) > -1); });
      preenche('treino', p.treino);
      preenche('cardapio', p.cardapio);
      cards.querySelector('[data-t="exemplo"]').textContent = p.exemplo;
      exercicios(p.exercicios);
      barras(p.n);
    };
    var zero = { kcal: 0, agua: 0, prot: 0, carb: 0, gord: 0, min: 0, gasto: 0 };
    if (anima) {
      escreve(zero); barras(zero);
      var obs = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        obs.disconnect(); visto = true;
        barras(atual.n); conta(zero, atual.n);
      }, { rootMargin: '0px 0px -15% 0px' });
      obs.observe(cards);
    }
    document.querySelectorAll('.seletor button').forEach(function (b) {
      b.addEventListener('click', function () {
        var novo = PLANOS[b.getAttribute('data-obj')];
        if (!novo || novo === atual) return;
        document.querySelectorAll('.seletor button').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        var antes = atual; atual = novo;
        if (!anima) { aplica(novo); escreve(novo.n); return; }
        if (!visto) { aplica(novo); barras(zero); return; }
        cards.classList.add('troca');
        setTimeout(function () {
          aplica(novo); cards.classList.remove('troca');
          conta(antes.n, novo.n);
        }, 180);
      });
    });
  }

  // Videos dos celulares: so baixam quando chegam perto da tela (e depois do load da pagina), tocam mudos e em loop
  // e pausam fora da tela. Com "reduzir movimento" ou sem JS, fica so a capa (a imagem dentro da .tela).
  var telas = document.querySelectorAll('.tela[data-video]');
  if (telas.length && !calmo && 'IntersectionObserver' in window) {
    var criaVideo = function (t) {
      var base = t.getAttribute('data-video'), vid = document.createElement('video');
      vid.muted = true; vid.defaultMuted = true; vid.loop = true; vid.playsInline = true; vid.preload = 'auto';
      vid.setAttribute('muted', ''); vid.setAttribute('playsinline', ''); vid.setAttribute('aria-hidden', 'true');
      [['webm', 'video/webm'], ['mp4', 'video/mp4']].forEach(function (x) {
        var s = document.createElement('source'); s.src = base + '.' + x[0]; s.type = x[1]; vid.appendChild(s);
      });
      vid.addEventListener('playing', function () { vid.classList.add('on'); });
      t.appendChild(vid);
      return vid;
    };
    var perto = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var vid = e.target.querySelector('video');
        if (e.isIntersecting) {
          vid = vid || criaVideo(e.target);
          var p = vid.play(); if (p && p.catch) p.catch(function () {});
        } else if (vid) vid.pause();
      });
    }, { rootMargin: '300px 0px' });
    var observaTelas = function () { telas.forEach(function (t) { perto.observe(t); }); };
    if (document.readyState === 'complete') observaTelas(); else window.addEventListener('load', observaTelas);
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
