// Telas do quiz: desenho e comportamento copiados do onboarding do app, sem servidor.
// Textos e opcoes: perguntas.js. Calculos: calculos.js. Respostas: so na variavel "a", na memoria da pagina.
// Nao usa cookie nem localStorage. Rede: a medicao de uso (/js/medida.js, PostHog sem cookie),
// que recebe apenas o numero e o nome da tela, o palpite de preco e a loja; nunca as respostas.
// Com TF.PAGAMENTO_ATIVO, o cadastro (tela 48L) manda as respostas, o contato e os aceites para o
// Supabase (web-lead, js/funil.js), so quando a pessoa toca em "Continuar" (tela 48L); a revelacao do
// preco leva para a Cakto. ?retomar=<lead_id>.<assinatura> (ou o link curto do suporte, ?retomar=<token>&cupom=)
// le o lead de volta (web-lead-resume). Cada ida a Cakto e registrada no lead (web-lead-checkout).
(function () {
  'use strict';
  const { T, C } = TF;
  const AUTO_ADVANCE_MS = 220; // src/components/profileQuestions/ui.tsx
  const REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scrollEl = document.getElementById('scroll');
  const footEl = document.getElementById('foot');
  const topEl = document.getElementById('top');
  // Fim do funil (plano pronto e preco): "Passo n de 2" no topo e o nome ao lado do logo (so com body.fim, ver modoFim).
  const passoEl = document.createElement('span'); passoEl.id = 'passo'; topEl.append(passoEl);
  const marcaEl = document.createElement('span'); marcaEl.id = 'marca'; marcaEl.textContent = 'Tribbo Fit';
  { const lg = document.getElementById('logo'); if (lg) lg.after(marcaEl); }
  const backEl = document.getElementById('back');
  const barEl = document.getElementById('bar');
  const barFill = document.getElementById('bar-fill');

  // Parametros da URL vindos da /plano/ (utm_source, utm_medium, utm_campaign, utm_content e parecidos).
  // Ficam so na memoria da pagina (TF.utm) e voltam para a /plano/ se a pessoa sair pelo topo.
  const URL_PARAMS = new URLSearchParams(location.search);
  TF.utm = Object.fromEntries(URL_PARAMS);
  delete TF.utm.retomar; delete TF.utm.cupom; // link de volta (?retomar=, &cupom= do link curto): nao e UTM
  const PARAMS_SITE = new URLSearchParams(URL_PARAMS); PARAMS_SITE.delete('retomar'); PARAMS_SITE.delete('cupom');
  const SITE = T.exit.home + (PARAMS_SITE.toString() ? `?${PARAMS_SITE}` : '');

  let a = TF.emptyAnswers();
  let current = 'welcome';
  let nav = { returnTo: null, chain: [] };
  let timers = [];     // temporizadores da tela atual
  let cleanups = [];   // o que parar ao sair da tela
  let openSheetClose = null;
  let visit = 0;       // cada entrada numa tela
  let seen = new Set(); // animacoes que ja rodaram nesta visita

  // Medicao de uso (PostHog sem cookie). So o numero e o nome tecnico da tela, nunca respostas.
  const medir = (evento, extra) => { if (window.tribboMedida) window.tribboMedida(evento, extra); };
  const telaInfo = (id) => { const s = TF.STEPS.find((x) => x.id === id); return { step_number: s ? s.code : '', step_name: id }; };
  let comecou = false;
  let planoWeb = 'anual'; // plano escolhido na tela 49B (so com TF.PAGAMENTO_ATIVO)

  // ─── Ajudantes ──────────────────────────────────────────────────────────────

  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) for (const k of Object.keys(props)) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') Object.assign(el.style, v);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'value') el.value = v;
      else if (k === 'disabled') el.disabled = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    add(el, kids);
    return el;
  }
  function add(el, kids) {
    for (const c of kids.flat(Infinity)) {
      if (c == null || c === false || c === '') continue;
      el.append(c.nodeType ? c : String(c));
    }
    return el;
  }
  function svg(tag, attrs, ...kids) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) for (const k of Object.keys(attrs)) if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    kids.flat(Infinity).forEach((c) => c && el.append(c));
    return el;
  }
  function icon(name, size, color) {
    const d = TF.ICONS[name];
    const s = svg('svg', { width: size, height: size, viewBox: `0 0 ${d[1]} ${d[2]}`, 'aria-hidden': 'true', style: 'flex:none' },
      svg('path', { d: d[0], fill: color || C.icon }));
    return s;
  }
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  const once = (key) => { if (seen.has(key)) return false; seen.add(key); return true; };
  const joinPt = (items) => (items.length <= 1 ? items[0] ?? '' : `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`);
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const iconOf = (group, v) => TF.OPTION_ICONS[group][v];

  // Reduz a fonte ate caber (adjustsFontSizeToFit do app). lines: linhas maximas.
  function fitText(el, lines, minScale) {
    requestAnimationFrame(() => {
      const base = parseFloat(getComputedStyle(el).fontSize);
      const min = base * minScale;
      let size = base;
      const fits = () => {
        const lh = parseFloat(getComputedStyle(el).lineHeight) || size * 1.25;
        return el.scrollWidth <= el.clientWidth + 1 && el.getBoundingClientRect().height <= lh * lines + 2;
      };
      while (!fits() && size > min) { size -= 0.5; el.style.fontSize = `${size}px`; }
    });
  }

  // ─── Pecas (src/components/profileQuestions/ui.tsx) ─────────────────────────

  function header(title, subtitle, fixedLines) {
    const t = h('h1', { class: `q-title${fixedLines ? ' fixed' : ''}`, tabindex: '-1' }, title);
    if (fixedLines) fitText(t, fixedLines, 0.85);
    return h('div', { class: 'q-head' }, t, subtitle && h('p', { class: 'q-sub' }, subtitle));
  }
  function emojiBubble(ch, size = 42) {
    return h('span', { class: 'bubble emo-b', 'aria-hidden': 'true', style: { width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.5)}px` } }, ch);
  }
  // GIF do exercicio (exercicios.js), com fundo cinza claro enquanto carrega; sem GIF na lista, null.
  function gifThumb(nome, size) {
    const src = TF.gifDe && TF.gifDe(nome);
    if (!src) return null;
    return h('span', { class: 'ex-gif', style: { width: `${size}px`, height: `${size}px` } },
      h('img', { src, alt: '', loading: 'lazy', decoding: 'async', width: size, height: size }));
  }
  function bubble(name, size = 42) {
    return h('span', { class: 'bubble', style: { width: `${size}px`, height: `${size}px` } }, icon(name, Math.round(size * 0.5)));
  }
  function optionCard({ label, desc, ic, media, badge, highlight, selected, multi, locked, onPress, children }) {
    return h('button', {
      type: 'button', class: `opt${selected ? ' sel' : ''}${highlight ? ' hi' : ''}${locked ? ' locked' : ''}`,
      role: multi ? 'checkbox' : 'radio', 'aria-checked': selected ? 'true' : 'false', onclick: onPress,
    },
      badge && h('span', { class: 'tag' }, badge),
      media || (ic && bubble(ic)),
      h('span', { class: 'opt-txt' }, h('span', { class: 'opt-label' }, label), desc && h('span', { class: 'opt-desc' }, desc), children),
      h('span', { class: `radio${selected ? ' on' : ''}` }));
  }
  function opts(list) { return h('div', { class: 'opts' }, list); }
  function reactionCard(key, text, ic) {
    return h('div', { class: `reaction${once(`r:${key}`) ? ' fade-up' : ''}`, 'aria-live': 'polite' }, bubble(ic, 34), h('p', null, text));
  }
  function compact({ label, mci, selected, onPress }) {
    return h('button', { type: 'button', class: `compact${selected ? ' sel' : ''}`, role: 'checkbox', 'aria-checked': selected ? 'true' : 'false', onclick: onPress },
      mci && icon(mci, 16),
      h('span', { class: 'compact-txt' }, label),
      h('span', { class: `radio sm${selected ? ' on' : ''}` }));
  }
  function banner({ ic, title, text, children, key }) {
    const anim = key ? once(`b:${key}`) : true;
    return h('div', { class: `banner${anim ? ' fade' : ''}` }, bubble(ic, 36),
      h('div', { class: 'banner-body' }, title && h('div', { class: 'banner-title' }, title), text && h('div', { class: 'banner-txt' }, text), children));
  }
  function iconItem(ic, label) { return h('div', { class: 'icon-item' }, bubble(ic, 36), h('span', null, label)); }
  function primary(label, onPress, disabled) {
    const b = h('button', { type: 'button', class: 'btn', disabled: !!disabled, onclick: () => { if (!b.disabled) onPress(); } }, label);
    return b;
  }
  function textLink(label, onPress, opt = {}) {
    return h('button', { type: 'button', class: `link${opt.left ? ' left' : ''}${opt.soft ? ' soft' : ''}`, onclick: onPress }, label);
  }
  function checkbox(checked, onPress, kids) {
    const label = h('div', {
      class: 'cb', role: 'checkbox', tabindex: '0', 'aria-checked': checked ? 'true' : 'false',
      onclick: (e) => { if (e.target.tagName !== 'A') onPress(); },
      onkeydown: (e) => { if ((e.key === ' ' || e.key === 'Enter') && e.target.tagName !== 'A') { e.preventDefault(); onPress(); } },
    },
      h('span', { class: `cb-box${checked ? ' on' : ''}` }, checked && icon('checkmark', 16, C.onAccent)),
      h('div', { class: 'cb-txt' }, kids));
    return label;
  }
  function caption(text, cls) { return h('p', { class: `caption ${cls || ''}` }, text); }

  // ─── Folhas (src/components/HealthClearanceSheets.tsx e AdjustAnswers.tsx) ──

  function openSheet(build) {
    closeSheet();
    const wrap = h('div', { class: 'sheet-wrap', onclick: (e) => { if (e.target === wrap) close(); } });
    const close = () => { wrap.remove(); document.removeEventListener('keydown', esc); if (openSheetClose === close) openSheetClose = null; };
    const esc = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', esc);
    openSheetClose = close;
    wrap.append(h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' }, build(close)));
    document.body.append(wrap);
    return close;
  }
  function closeSheet() { if (openSheetClose) openSheetClose(); }
  function shellSheet({ ic, title, body, actions }) {
    return openSheet((close) => [
      h('div', { class: 'sheet-handle' }),
      h('div', { class: 'sheet-scroll' }, h('div', { class: 'sheet-icon' }, icon(ic, 28)), h('h2', { class: 'sheet-title' }, title), body && h('p', { class: 'sheet-body' }, body)),
      h('div', { class: 'sheet-actions' }, actions(close)),
    ]);
  }
  // confirmThen (src/onboarding/stepViews.tsx): valores incomuns pedem confirmacao.
  function confirmThen(question, go) {
    if (!question) { go(); return; }
    openSheet((close) => [
      h('div', { class: 'sheet-handle' }),
      h('h2', { class: 'sheet-title' }, question),
      h('div', { class: 'sheet-actions' }, primary(T.confirm.ok, () => { close(); go(); }), h('button', { type: 'button', class: 'btn-2', onclick: close }, T.confirm.fix)),
    ]);
  }
  function adjustAnswers(rows) {
    return h('button', {
      type: 'button', class: 'adjust-btn',
      onclick: () => openSheet((close) => [
        h('div', { class: 'sheet-handle' }),
        h('h2', { class: 'sheet-title', style: { marginBottom: '6px' } }, T.adjust.title),
        h('div', { class: 'sheet-scroll' }, rows.map((r) => h('button', { type: 'button', class: 'a-row', onclick: () => { close(); r.go(); } },
          h('span', { class: 'a-txt' }, h('span', { class: 'a-topic' }, r.topic), h('span', { class: 'a-value' }, r.value)), icon('chevron-forward', 18)))),
      ]),
    }, icon('options-outline', 17), T.adjust.button);
  }

  // ─── Navegacao (src/onboarding/steps.ts) ────────────────────────────────────

  function update(patch) { Object.assign(a, patch); }
  function next(patch) {
    if (patch) update(patch);
    if (nav.chain.length) {
      const follow = nav.chain.find((id) => TF.applies(TF.stepById(id), a));
      if (follow) { nav.chain = nav.chain.slice(nav.chain.indexOf(follow) + 1); show(follow, true); return; }
    }
    if (nav.returnTo) { const r = nav.returnTo; nav = { returnTo: null, chain: [] }; show(r, true); return; }
    const n = TF.nextStep(current, a);
    if (n) show(n.id, true);
  }
  function goTo(id, opts = {}) {
    const chain = (opts.chain || []).filter((s) => s !== id);
    nav = { returnTo: opts.returnTo || null, chain };
    show(id, true);
  }
  function goBack() {
    closeSheet();
    if (nav.returnTo) { const r = nav.returnTo; nav = { returnTo: null, chain: [] }; show(r, false); return; }
    if (!TF.canGoBack(current)) return;
    const p = TF.prevStep(current, a);
    if (p) show(p.id, false);
  }
  // Voltar do navegador ou do celular faz o mesmo que a seta (so memoria da aba).
  let hist = 0;
  history.replaceState({ i: 0 }, '');
  window.addEventListener('popstate', (e) => {
    const i = e.state?.i ?? 0;
    const forward = i > hist;
    hist = i;
    if (forward) return;
    if (openSheetClose) { closeSheet(); pushHist(); return; }
    if (!TF.canGoBack(current) && !nav.returnTo) { pushHist(); return; }
    goBack();
  });
  function pushHist() { hist += 1; history.pushState({ i: hist }, ''); }
  backEl.append(icon('chevron-back', 26, C.t1));
  backEl.addEventListener('click', () => { history.back(); });

  // Sair do quiz pelo topo (icone ou "Voltar ao site"): sem nenhuma resposta vai direto; com alguma, pergunta antes.
  function leaveQuiz(e) {
    if (e) e.preventDefault();
    medir('web_quiz_exit_clicked', telaInfo(current));
    const go = () => { location.href = SITE; };
    const answered = JSON.stringify(a) !== JSON.stringify(TF.emptyAnswers());
    if (!answered) { go(); return; }
    openSheet((close) => [
      h('div', { class: 'sheet-handle' }),
      h('h2', { class: 'sheet-title' }, T.exit.title),
      h('div', { class: 'sheet-actions' }, primary(T.exit.stay, close), h('button', { type: 'button', class: 'btn-2', onclick: go }, T.exit.leave)),
    ]);
  }
  for (const el of [document.getElementById('logo'), document.getElementById('exit')]) {
    if (!el) continue;
    el.href = SITE;
    el.addEventListener('click', leaveQuiz);
  }

  function resetScreen() {
    timers.forEach(clearTimeout); timers = [];
    cleanups.forEach((f) => f()); cleanups = [];
    closeSheet();
    seen = new Set();
    const c = document.getElementById('confetti');
    if (c) c.remove();
  }
  function show(id, forward) {
    resetScreen();
    visit += 1;
    current = id;
    if (!comecou && id !== 'welcome') { comecou = true; medir('web_quiz_started'); }
    medir('web_quiz_step_viewed', telaInfo(id));
    if (forward) pushHist();
    const progress = TF.showsProgress(id);
    const back = TF.canGoBack(id) || !!nav.returnTo;
    topEl.hidden = false;
    barEl.classList.toggle('off', !progress);
    backEl.classList.toggle('off', !back);
    const pct = TF.overallProgress(id, a);
    barFill.style.width = `${Math.round(pct * 1000) / 10}%`;
    barEl.setAttribute('aria-valuenow', Math.round(pct * 100));
    scrollEl.scrollTop = 0;
    if (!isReady(id)) { waitFor(id); return; }
    render(id);
  }
  function render(id) {
    VIEWS[id]();
    const title = scrollEl.querySelector('h1');
    if (title) title.focus({ preventScroll: true });
    scrollEl.scrollTop = 0;
    lookAhead(id);
  }

  // ─── Carregamento sob demanda (so na web) ───────────────────────────────────
  // Os arquivos pesados so baixam perto da tela que usa, para a primeira tela abrir rapido.
  const LAZY = { pain: ['corpo.js'], focus: ['corpo.js'], food_summary: ['alimentos.js', 'cardapio.js'], plan_summary: ['alimentos.js', 'cardapio.js', 'exercicios.js'],
    bodyweight: ['exercicios.js'], training_summary: ['exercicios.js'], how_it_works: ['exercicios.js'] };
  const scripts = {};
  function loadScript(src) {
    if (!scripts[src]) {
      scripts[src] = new Promise((ok, fail) => {
        const el = document.createElement('script');
        el.src = src;
        el.onload = () => { scripts[src].done = true; ok(); };
        el.onerror = () => { el.remove(); delete scripts[src]; fail(new Error(src)); };
        document.head.append(el);
      });
    }
    return scripts[src];
  }
  // Em ordem: cardapio.js usa a lista de alimentos.js.
  const loadAll = (list) => list.reduce((p, src) => p.then(() => loadScript(src)), Promise.resolve());
  const isReady = (id) => (LAZY[id] || []).every((src) => scripts[src] && scripts[src].done);
  function waitFor(id) {
    const v = visit;
    paint({ body: [h('p', { class: 'q-sub', role: 'status' }, 'Carregando...')] });
    loadAll(LAZY[id]).then(() => {
      if (visit !== v) return;
      enterVisit = -1;
      render(id);
    }, () => {
      if (visit !== v) return;
      paint({ body: [header('Sem conexão', 'Confira a internet e tente de novo.')], footer: [primary('Tentar de novo', () => show(id, false))] });
    });
  }
  // Imagens de cada tela, para baixar antes de a pessoa chegar nela.
  let baPerson = null;
  const beforeAfterPerson = () => baPerson || (baPerson = T.beforeAfter.people[Math.floor(Math.random() * T.beforeAfter.people.length)]);
  function imagesFor(id) {
    switch (id) {
      case 'reviews': return T.reviewList.map((r) => r.photo);
      case 'before_after': { const p = beforeAfterPerson(); return [`assets/antes-depois/${p.id}-antes.webp`, `assets/antes-depois/${p.id}-depois.webp`]; }
      case 'did_you_know_training': return [eduTraining().image];
      case 'did_you_know_food': return [T.edu.muscle.image];
      case 'energy': return ['assets/edu_calorias.webp'];
      case 'energy_reveal': return ['assets/copo_agua.webp'];
      case 'food_summary': { const k = TF.plateKind(a.goal, a.dietType); return [T.plates[k.model][k.veg ? 'veg' : 'meat'].src]; }
      case 'how_it_works': return T.howItWorks.moments.filter((m) => m.image).map((m) => m.image);
      default: return [];
    }
  }
  const fetched = new Set();
  function lookAhead(id) {
    let s = id;
    for (let i = 0; i < 3; i++) {
      let n = null;
      try { n = TF.nextStep(s, a); } catch (e) { n = null; }
      if (!n) return;
      s = n.id;
      loadAll(LAZY[s] || []).catch(() => { /* tenta de novo ao abrir a tela */ });
      let urls = [];
      try { urls = imagesFor(s); } catch (e) { urls = []; }
      urls.forEach((u) => { if (fetched.has(u)) return; fetched.add(u); const img = new Image(); img.decoding = 'async'; img.src = u; });
    }
  }
  let enterVisit = -1;
  // Desenha a tela; pode ser chamada de novo quando uma resposta muda.
  function paint({ body, footer, fill }) {
    const top = scrollEl.scrollTop;
    const first = enterVisit !== visit;
    enterVisit = visit;
    const content = h('div', { class: `content${fill ? ' fill' : ''}${first ? ' enter' : ''}` }, body);
    scrollEl.replaceChildren(content);
    footEl.replaceChildren(...(footer || []).flat().filter(Boolean));
    scrollEl.scrollTop = first ? 0 : top;
  }
  const scrollToEnd = () => later(() => scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: REDUCED ? 'auto' : 'smooth' }), 250);
  function autoNext(patch) { later(() => next(patch), AUTO_ADVANCE_MS); }

  // ─── Graficos (src/onboarding/charts.tsx) ───────────────────────────────────

  const DRAW_MS = 1300;
  function smoothPath(pts) {
    if (!pts.length) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
      d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6} ${p2.x} ${p2.y}`;
    }
    return d;
  }
  function drawLine(path, delay) {
    requestAnimationFrame(() => {
      const len = path.getTotalLength() + 2;
      path.style.strokeDasharray = `${len} ${len}`;
      path.style.strokeDashoffset = REDUCED ? 0 : len;
      if (REDUCED) return;
      path.getBoundingClientRect();
      path.style.transition = `stroke-dashoffset ${DRAW_MS}ms cubic-bezier(.33,1,.68,1) ${delay}ms`;
      path.style.strokeDashoffset = 0;
    });
  }
  function fadeIn(el, delay, to = 1) {
    el.style.opacity = REDUCED ? to : 0;
    if (REDUCED) return el;
    el.style.transition = `opacity 300ms ease-out ${delay}ms`;
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = to; }));
    return el;
  }
  function lineChart({ series, height = 200, yDomain, haloAt = [], startLabel, endBalloon, endIcon, yTitle, xTitle, label }) {
    const box = h('div', { class: 'chart', role: 'img', 'aria-label': label, style: { height: `${height}px` } });
    const wrap = h('div', null, box, xTitle && h('p', { class: 'axis x-title' }, xTitle));
    requestAnimationFrame(() => {
      const width = box.clientWidth;
      const hasAxes = !!(yTitle || xTitle);
      const pad = { l: hasAxes ? 26 : 16, r: 24, t: endBalloon || endIcon || startLabel ? 44 : 14, b: 16 };
      if (xTitle) wrap.lastChild.style.margin = `6px ${pad.r}px 0 ${pad.l}px`;
      const all = series.flatMap((s) => s.values);
      const [minY, maxY] = yDomain ?? [Math.min(...all), Math.max(...all)];
      const span = maxY - minY || 1;
      const innerW = Math.max(0, width - pad.l - pad.r);
      const innerH = height - pad.t - pad.b;
      const baseY = pad.t + innerH;
      const toPts = (values) => values.map((v, i) => ({ x: pad.l + (i / (values.length - 1)) * innerW, y: pad.t + (1 - (v - minY) / span) * innerH }));
      const s = svg('svg', { width, height });
      const defs = svg('defs');
      s.append(defs);
      [0.25, 0.5, 0.75].forEach((f) => s.append(svg('line', { x1: pad.l, x2: width - pad.r, y1: pad.t + innerH * f, y2: pad.t + innerH * f, stroke: 'rgba(14,26,29,0.06)' })));
      s.append(svg('line', { x1: pad.l, x2: width - pad.r, y1: baseY, y2: baseY, stroke: 'rgba(14,26,29,0.18)' }));
      if (hasAxes) s.append(svg('line', { x1: pad.l, x2: pad.l, y1: pad.t, y2: baseY, stroke: 'rgba(14,26,29,0.18)' }));
      series.forEach((sr, i) => {
        const pts = toPts(sr.values);
        const d = smoothPath(pts);
        const delay = sr.delay ?? 150;
        if (sr.fill) {
          const id = `area${i}`;
          defs.append(svg('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 },
            svg('stop', { offset: 0, 'stop-color': sr.fillColor ?? sr.color, 'stop-opacity': 0.26 }), svg('stop', { offset: 1, 'stop-color': sr.fillColor ?? sr.color, 'stop-opacity': 0.04 })));
          s.append(fadeIn(svg('path', { d: `${d} L ${pts[pts.length - 1].x} ${baseY} L ${pts[0].x} ${baseY} Z`, fill: `url(#${id})` }), delay));
        }
        if (sr.dashed) {
          const p = svg('path', { d, stroke: sr.color, 'stroke-width': sr.width ?? 3, 'stroke-linecap': 'round', fill: 'none', 'stroke-dasharray': '6 6' });
          s.append(fadeIn(p, delay, sr.opacity ?? 1));
        } else {
          if (sr.glow) [[14, 0.10], [8, 0.22]].forEach(([w, o]) => {
            const g = svg('path', { d, stroke: sr.color, 'stroke-opacity': o, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' });
            s.append(g); drawLine(g, delay);
          });
          const p = svg('path', { d, stroke: sr.color, 'stroke-opacity': sr.opacity ?? 1, 'stroke-width': sr.width ?? 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' });
          s.append(p); drawLine(p, delay);
        }
      });
      const main = toPts(series[0].values);
      const first = main[0], last = main[main.length - 1];
      const doneAt = (series[0].delay ?? 150) + DRAW_MS;
      haloAt.forEach((idx) => {
        const p = main[idx];
        if (!p) return;
        const when = (series[0].delay ?? 150) + DRAW_MS * (idx / Math.max(1, main.length - 1));
        s.append(fadeIn(svg('circle', { cx: p.x, cy: p.y, r: 11, fill: series[0].color }), when, 0.22));
        s.append(fadeIn(svg('circle', { cx: p.x, cy: p.y, r: 5, fill: series[0].color }), when));
      });
      if (yTitle) box.append(h('div', { class: 'y-title-box', style: { top: `${pad.t}px`, height: `${innerH}px` } }, h('span', { class: 'axis', style: { width: `${innerH}px` } }, yTitle)));
      box.append(s);
      if (startLabel) box.append(h('div', { class: 'start-label late', style: { left: `${first.x - 4}px`, top: `${first.y - 34}px`, animationDelay: '300ms' } }, startLabel));
      if (endBalloon) box.append(h('div', { class: 'balloon late', style: { left: `${Math.min(last.x - 34, width - 76)}px`, top: `${last.y - 42}px`, animationDelay: `${doneAt}ms` } }, endBalloon));
      if (endIcon) box.append(h('div', { class: 'end-icon late', style: { left: `${last.x - 18}px`, top: `${last.y - 40}px`, animationDelay: `${doneAt}ms` } }, icon(endIcon, 20, C.onAccent)));
    });
    return wrap;
  }
  function chartEnds(l, r) { return h('div', { class: 'chart-ends' }, h('span', null, l), h('span', null, r)); }
  function legend(items) {
    return h('div', { class: 'legend' }, items.map((it) => h('div', { class: 'legend-item' },
      svg('svg', { width: 22, height: 8 }, svg('line', { x1: 1, x2: 21, y1: 4, y2: 4, stroke: it.color, 'stroke-opacity': it.opacity ?? 1, 'stroke-width': it.line === 'solid' ? 3 : 2, 'stroke-linecap': 'round', 'stroke-dasharray': it.line === 'dashed' ? '4 4' : null })),
      h('span', null, it.label))));
  }
  function yoYoChart(label) {
    const height = 220;
    const pad = { l: 26, r: 18, t: 16, b: 30 };
    const routineColor = C.pastelGreen, dietColor = 'rgba(14,26,29,0.45)';
    const box = h('div', { class: 'chart', role: 'img', 'aria-label': label, style: { height: `${height}px` } });
    const xt = h('p', { class: 'axis x-title', style: { margin: `6px ${pad.r}px 0 ${pad.l}px` } }, 'TEMPO');
    requestAnimationFrame(() => {
      const width = box.clientWidth;
      const innerW = Math.max(0, width - pad.l - pad.r), innerH = height - pad.t - pad.b, baseY = pad.t + innerH;
      const [minY, maxY] = TF.CHART.yoyoDomain;
      const y = (v) => pad.t + (1 - (v - minY) / (maxY - minY)) * innerH;
      const toPts = (vals) => vals.map((v, i) => ({ x: pad.l + (i / (vals.length - 1)) * innerW, y: y(v) }));
      const diet = toPts(TF.CHART.yoyoDiet), routine = toPts(TF.CHART.yoyoRoutine);
      const startY = y(100);
      const dietPath = smoothPath(diet), routinePath = smoothPath(routine);
      const dietDelay = 150, routineDelay = 450;
      const at = (start, i, n) => start + DRAW_MS * (i / Math.max(1, n - 1));
      const s = svg('svg', { width, height },
        svg('defs', null, svg('clipPath', { id: 'aboveStart' }, svg('rect', { x: 0, y: 0, width, height: startY }))),
        svg('line', { x1: pad.l, x2: pad.l, y1: pad.t, y2: baseY, stroke: 'rgba(14,26,29,0.18)' }),
        svg('line', { x1: pad.l, x2: width - pad.r, y1: baseY, y2: baseY, stroke: 'rgba(14,26,29,0.18)' }),
        svg('line', { x1: pad.l, x2: width - pad.r, y1: startY, y2: startY, stroke: 'rgba(14,26,29,0.30)', 'stroke-dasharray': '5 5' }));
      s.append(fadeIn(svg('path', { d: `${dietPath} L ${diet[diet.length - 1].x} ${startY} L ${diet[0].x} ${startY} Z`, fill: 'rgba(232,140,140,0.18)', 'clip-path': 'url(#aboveStart)' }), dietDelay + DRAW_MS));
      const dp = svg('path', { d: dietPath, stroke: dietColor, 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' });
      s.append(dp); drawLine(dp, dietDelay);
      [...TF.CHART.yoyoBottoms, ...TF.CHART.yoyoPeaks].forEach((i) => s.append(fadeIn(svg('circle', { cx: diet[i].x, cy: diet[i].y, r: 3.5, fill: dietColor }), at(dietDelay, i, diet.length))));
      TF.CHART.yoyoBottoms.forEach((i, k) => {
        const tx = svg('text', { x: diet[i].x, y: diet[i].y + 18, 'font-size': 11, 'font-weight': 500, 'font-family': 'Inter', fill: dietColor, 'text-anchor': 'middle' });
        tx.textContent = `Dieta ${k + 1}`;
        s.append(fadeIn(tx, at(dietDelay, i, diet.length)));
      });
      const rp = svg('path', { d: routinePath, stroke: routineColor, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' });
      s.append(rp); drawLine(rp, routineDelay);
      TF.CHART.yoyoRoutineDots.forEach((i) => {
        const w = at(routineDelay, i, routine.length);
        [[12, 0.12], [8, 0.22], [4.5, 1]].forEach(([r, o]) => s.append(fadeIn(svg('circle', { cx: routine[i].x, cy: routine[i].y, r, fill: routineColor }), w, o)));
      });
      box.append(h('div', { class: 'y-title-box', style: { top: `${pad.t}px`, height: `${innerH}px` } }, h('span', { class: 'axis', style: { width: `${innerH}px` } }, 'PESO')));
      box.append(s);
    });
    return h('div', null, box, xt);
  }
  // src/onboarding/ProjectionChart.tsx
  function projectionKind() {
    const changing = TF.hasWeightChange(a) && a.targetWeightKg != null && !!a.targetDate;
    if (changing) return 'change';
    return a.goal === 'improve_health' ? 'health' : 'maintain';
  }
  function projectionChart() {
    const today = new Date();
    const w = a.weightKg ?? 0;
    const kind = projectionKind();
    if (kind === 'change') {
      const target = a.targetWeightKg;
      const date = TF.fromIsoDate(a.targetDate);
      const points = TF.projectionPoints(w, target, 12).map((p) => p.kg);
      const dom = weightDomain(w, target);
      return [lineChart({
        series: [{ values: points, color: C.t1, fill: true, fillColor: C.teal }], yDomain: dom, haloAt: [0, 4, 8, points.length - 1],
        startLabel: `${TF.formatKg(w)} kg`, endBalloon: `${TF.formatKg(target)} kg`,
        label: `Projeção de ${TF.formatKg(w)} kg hoje para ${TF.formatKg(target)} kg em ${TF.formatDateLong(date, today)}`,
      }), chartEnds('Hoje', TF.formatDateLong(date, today))];
    }
    if (kind === 'health') {
      return [lineChart({ series: [{ values: TF.CHART.scoreWith, color: C.teal, glow: true }], yDomain: [0, 100], endIcon: 'trophy', label: 'Tribbo Score subindo ao longo de 8 semanas' }),
        chartEnds('Tribbo Score hoje', 'Em 8 semanas')];
    }
    const points = TF.projectionPoints(w, null, 20).map((p) => p.kg);
    return [lineChart({ series: [{ values: points, color: C.t1, fill: true, fillColor: C.teal }], yDomain: [w - 3, w + 3], haloAt: [0, points.length - 1], label: `Peso estável em torno de ${TF.formatKg(w)} kg` }),
      chartEnds('Hoje', 'Próximos meses')];
  }
  function weightDomain(cur, target) {
    const lo = Math.min(cur, target), hi = Math.max(cur, target);
    const margin = Math.max(1, (hi - lo) * 0.35);
    return [lo - margin, hi + margin];
  }

  // Confete (no app: react-native-confetti-cannon), mesmas cores.
  function confetti(count, delay) {
    if (REDUCED) return;
    later(() => {
      const cv = h('canvas', { id: 'confetti' });
      document.body.append(cv);
      const ctx = cv.getContext('2d');
      const W = cv.width = innerWidth, H = cv.height = innerHeight;
      const colors = [C.teal, C.t1, C.barGreen];
      const parts = Array.from({ length: count }, () => ({
        x: W / 2, y: -20, vx: (Math.random() - 0.5) * 9, vy: 2 + Math.random() * 7, g: 0.09 + Math.random() * 0.05, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, w: 5 + Math.random() * 5, h: 8 + Math.random() * 6, c: colors[Math.floor(Math.random() * 3)],
      }));
      const start = performance.now();
      let raf = 0;
      const tick = (t) => {
        const age = t - start;
        ctx.clearRect(0, 0, W, H);
        ctx.globalAlpha = Math.max(0, 1 - Math.max(0, age - 1800) / 900);
        parts.forEach((p) => { p.vy += p.g; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); });
        if (age < 2700) raf = requestAnimationFrame(tick); else cv.remove();
      };
      raf = requestAnimationFrame(tick);
      cleanups.push(() => { cancelAnimationFrame(raf); cv.remove(); });
    }, delay);
  }

  // ─── Regua (src/components/profileQuestions/RulerPicker.tsx) ────────────────

  const TICK = 10;
  function ruler({ min, max, step, majorEvery, value, onChange, unit, highlight, label }) {
    const decimals = String(step).includes('.') ? String(step).split('.')[1].length : 0;
    const totalTicks = Math.round((max - min) / step);
    const fmt = (v) => v.toFixed(decimals).replace('.', ',');
    const valueAt = (i) => Number((min + Math.max(0, Math.min(totalTicks, i)) * step).toFixed(decimals));
    const indexOf = (v) => Math.round((Math.min(max, Math.max(min, v)) - min) / step);
    let shown = value;
    const num = h('span', { class: 'ruler-num' }, fmt(value));
    const track = h('div', { class: 'ruler-track' });
    const spacerL = h('div', { style: { flex: 'none' } });
    const spacerR = h('div', { style: { flex: 'none' } });
    const inner = h('div', { style: { position: 'relative', display: 'flex' } });
    for (let i = 0; i < totalTicks; i += majorEvery) {
      const count = Math.min(majorEvery, totalTicks - i);
      const half = majorEvery % 2 === 0 && count >= majorEvery / 2;
      const seg = h('div', { class: `seg${half ? ' half' : ''}${i + majorEvery >= totalTicks ? ' last' : ''}`, style: { width: `${count * TICK}px` } },
        h('span', null, String(Number(valueAt(i).toFixed(decimals))).replace('.', ',')));
      if (half) seg.style.setProperty('--half', `${(majorEvery / 2) * TICK}px`);
      inner.append(seg);
    }
    let hlEl = null;
    if (highlight) { hlEl = h('div', { class: 'ruler-hl' }); inner.append(hlEl); }
    const paintHl = () => {
      if (!hlEl) return;
      const lo = Math.min(highlight(), shown), hi = Math.max(highlight(), shown);
      hlEl.style.left = `${indexOf(lo) * TICK}px`;
      hlEl.style.width = `${(indexOf(hi) - indexOf(lo)) * TICK}px`;
    };
    track.append(spacerL, inner, spacerR);
    const sc = h('div', {
      class: 'ruler-scroll', tabindex: '0', role: 'slider', 'aria-label': label, 'aria-valuemin': min, 'aria-valuemax': max, 'aria-valuenow': value, 'aria-valuetext': `${fmt(value)} ${unit}`,
    }, track);
    const place = (v, smooth) => sc.scrollTo({ left: indexOf(v) * TICK, behavior: smooth ? 'smooth' : 'auto' });
    let settleT = null;
    const emit = (v) => {
      if (v === shown) return;
      shown = v;
      num.textContent = fmt(v);
      sc.setAttribute('aria-valuenow', v);
      sc.setAttribute('aria-valuetext', `${fmt(v)} ${unit}`);
      paintHl();
      onChange(v);
    };
    sc.addEventListener('scroll', () => {
      emit(valueAt(Math.round(sc.scrollLeft / TICK)));
      clearTimeout(settleT);
      if (!dragging) settleT = setTimeout(() => place(shown, true), 110);
    }, { passive: true });
    sc.addEventListener('keydown', (e) => {
      const dir = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
      if (!dir) return;
      e.preventDefault();
      const v = valueAt(indexOf(shown) + dir);
      place(v, false);
      emit(v);
    });
    // Arrastar com o mouse (no celular, a rolagem nativa ja faz isso).
    let dragging = false, sx = 0, sl = 0;
    sc.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; dragging = true; sx = e.clientX; sl = sc.scrollLeft; sc.classList.add('drag'); sc.setPointerCapture(e.pointerId); });
    sc.addEventListener('pointermove', (e) => { if (dragging) sc.scrollLeft = sl - (e.clientX - sx); });
    const up = () => { if (!dragging) return; dragging = false; sc.classList.remove('drag'); place(shown, true); };
    sc.addEventListener('pointerup', up);
    sc.addEventListener('pointercancel', up);
    requestAnimationFrame(() => {
      const w = sc.clientWidth;
      spacerL.style.width = `${w / 2}px`;
      spacerR.style.width = `${w / 2}px`;
      paintHl();
      place(shown, false);
    });
    return h('div', null,
      h('div', { class: 'ruler-value' }, num, h('span', { class: 'ruler-unit' }, unit)),
      h('div', { class: 'ruler-wrap' }, sc, h('div', { class: 'ruler-mark' })));
  }

  // ─── Telas 1 a 16 (src/onboarding/stepViews.tsx e questions.tsx) ────────────

  function Welcome() {
    const pre = document.getElementById('pre');
    if (pre) { // primeira visita: a tela ja veio pronta no index.html, so liga o botao
      pre.removeAttribute('id');
      enterVisit = visit;
      fitText(pre.querySelector('h1'), 2, 0.85);
      const b = document.getElementById('pre-btn');
      b.removeAttribute('id');
      b.disabled = false; // ?retomar= desliga o botao enquanto consulta; link vencido ou invalido cai aqui
      b.onclick = () => next();
      return;
    }
    paint({
      fill: true,
      body: [header(T.welcome.title, T.welcome.subtitle, 2), h('div', { class: 'cover fade-up', style: { animationDelay: '150ms' } }, h('img', { src: T.welcome.cover, alt: '' }))],
      footer: [primary(T.welcome.button, () => next())],
    });
  }

  const firstNameFrom = (n) => (n ?? '').trim().split(/\s+/)[0]?.slice(0, TF.DISPLAY_NAME_MAX) ?? '';
  const isValidFullName = (n) => n.trim().length <= TF.FULL_NAME_MAX && firstNameFrom(n).length >= TF.NAME_MIN;

  function Name() {
    const go = () => { if (!isValidFullName(a.fullName)) return; const fullName = a.fullName.trim(); next({ fullName, displayName: firstNameFrom(fullName) }); };
    const btn = primary('Continuar', go, !isValidFullName(a.fullName));
    const input = h('input', {
      class: 'input', id: 'nome', type: 'text', value: a.fullName, maxlength: TF.FULL_NAME_MAX, autocomplete: 'name', autocapitalize: 'words', enterkeyhint: 'done', 'aria-label': T.name.label,
      oninput: (e) => {
        const v = e.target.value.replace(/\s{2,}/g, ' ').slice(0, TF.FULL_NAME_MAX);
        if (v !== e.target.value) e.target.value = v;
        a.fullName = v; btn.disabled = !isValidFullName(v);
      },
      onkeydown: (e) => { if (e.key === 'Enter') go(); },
    });
    paint({ body: [header(T.name.title), h('label', { class: 'field-label', for: 'nome' }, T.name.label), input], footer: [btn] });
  }

  function Consents() {
    const accepted = !!a.termsAcceptedAt;
    const st = { terms: accepted, educational: accepted, health: accepted };
    const stop = (e) => e.stopPropagation();
    const draw = () => {
      const all = st.terms && st.educational && st.health;
      const [t1, t2, t3, t4] = T.consents.terms;
      paint({
        body: [
          header(T.consents.title, T.consents.subtitle),
          checkbox(st.terms, () => { st.terms = !st.terms; draw(); }, [`${t1} `, h('a', { href: T.links.terms, target: '_blank', rel: 'noopener noreferrer', onclick: stop }, t2), ` ${t3} `, h('a', { href: T.links.privacy, target: '_blank', rel: 'noopener noreferrer', onclick: stop }, t4)]),
          checkbox(st.educational, () => { st.educational = !st.educational; draw(); }, T.consents.educational),
          checkbox(st.health, () => { st.health = !st.health; draw(); }, T.consents.health),
          !all && textLink(T.consents.markAll, () => { st.terms = st.educational = st.health = true; draw(); }, { left: true }),
        ],
        footer: [primary(T.consents.button, () => { const now = new Date().toISOString(); next({ termsAcceptedAt: a.termsAcceptedAt ?? now, educationalConsentAt: a.educationalConsentAt ?? now, healthDataConsentAt: a.healthDataConsentAt ?? now }); }, !all)],
      });
    };
    draw();
  }

  function Goal() {
    const draw = () => paint({
      body: [header(a.displayName ? `${a.displayName}, ${T.goal.title}` : cap(T.goal.title)), opts(TF.GOAL_CHOICES.map((g) => optionCard({
        label: g.label, ic: iconOf('goal', g.value), selected: a.goal === g.value,
        onPress: () => { if (g.value !== a.goal) update({ goal: g.value, targetWeightKg: null, pace: null, targetDate: null }); draw(); autoNext(); },
      })))],
    });
    draw();
  }

  function TriedBefore() {
    const draw = () => {
      const r = TF.TRIED_BEFORE_OPTIONS.find((o) => o.value === a.triedBefore);
      paint({
        body: [
          header(`${T.tried.title[0]} ${T.triedTitle[a.goal ?? 'improve_health']} ${T.tried.title[1]}`),
          opts(TF.TRIED_BEFORE_OPTIONS.map((o) => optionCard({ label: o.label, ic: iconOf('tried', o.value), selected: a.triedBefore === o.value, onPress: () => { a.triedBefore = o.value; draw(); } }))),
          r && reactionCard(a.triedBefore, r.reaction, iconOf('triedReaction', a.triedBefore)),
        ],
        footer: [primary(T.tried.button, () => next(), !a.triedBefore)],
      });
    };
    draw();
  }

  function singleChoice({ title, subtitle, list, field, iconGroup, descs }) {
    const draw = () => paint({
      body: [header(title, subtitle), opts(list.map((o) => optionCard({
        label: o.label, desc: descs ? o.desc : undefined, ic: iconGroup ? iconOf(iconGroup, o.value) : undefined, selected: a[field] === o.value,
        onPress: () => { a[field] = o.value; draw(); autoNext(); },
      })))],
    });
    draw();
  }
  const Motivation = () => singleChoice({ title: T.motivation.title, list: TF.MOTIVATION_OPTIONS, field: 'mainMotivation', iconGroup: 'motivation' });

  function Gender() {
    const draw = () => paint({
      body: [
        header(T.gender.title, T.gender.subtitle),
        opts(TF.GENDERS.map((g) => optionCard({ label: g.label, selected: a.gender === g.value, onPress: () => { a.gender = g.value; draw(); if (g.value !== 'prefer_not_to_say') autoNext(); } }))),
        a.gender === 'prefer_not_to_say' && h('p', { class: 'note fade' }, T.gender.note),
      ],
      footer: a.gender === 'prefer_not_to_say' ? [primary('Continuar', () => next())] : [],
    });
    draw();
  }

  // birthDateProblem (src/components/profileQuestions/questions.tsx)
  function birthDateProblem(input, today = new Date()) {
    if (input.length < 10) return null;
    const err = TF.birthDateError(input);
    if (err === TF.UNDER_AGE_ERROR) return T.birth.underage;
    if (err) return err;
    const iso = TF.birthDateToISO(input);
    if (iso && !TF.isAdult(iso, today)) return T.birth.underage;
    return null;
  }
  function BirthDate() {
    const valid = () => a.birthDate.length === 10 && !birthDateProblem(a.birthDate);
    const go = () => { if (valid()) next(); };
    const btn = primary('Continuar', go, !valid());
    const err = h('p', { class: 'error', 'aria-live': 'polite', hidden: true });
    const refresh = () => {
      const p = birthDateProblem(a.birthDate);
      err.hidden = !p; err.textContent = p || '';
      btn.disabled = !valid();
    };
    const input = h('input', {
      class: 'input date', type: 'text', inputmode: 'numeric', autocomplete: 'bday', value: a.birthDate, maxlength: 10, placeholder: 'dd/mm/aaaa', 'aria-label': 'Data de nascimento, dia, mês e ano', enterkeyhint: 'done',
      oninput: (e) => { a.birthDate = TF.formatBirthDate(e.target.value); e.target.value = a.birthDate; refresh(); },
      onkeydown: (e) => { if (e.key === 'Enter') go(); },
    });
    paint({ body: [header(T.birth.title, T.birth.subtitle), input, err], footer: [btn] });
    refresh();
  }

  const defaultHeightCm = (g) => (g === 'male' ? 175 : g === 'female' ? 162 : 168);
  const defaultWeightKg = (g) => (g === 'male' ? 80 : g === 'female' ? 66 : 72);

  function Height() {
    if (a.heightCm == null) a.heightCm = defaultHeightCm(a.gender);
    paint({
      fill: true,
      body: [header(T.height.title), h('div', { class: 'middle' }, ruler({ min: TF.MIN_HEIGHT_CM, max: TF.MAX_HEIGHT_CM, step: 1, majorEvery: 10, value: a.heightCm, unit: 'cm', label: 'Altura em centímetros', onChange: (v) => { a.heightCm = v; } }))],
      footer: [primary('Continuar', () => confirmThen(TF.bodyDataConfirmation({ height: a.heightCm }), () => next()))],
    });
  }

  function bmiBar(value) {
    const pos = Math.min(1, Math.max(0, (value - 15) / 25));
    const widths = [18.5 - 15, 25 - 18.5, 30 - 25, 40 - 30];
    return h('div', { class: 'bmi-scale', 'aria-hidden': 'true' },
      h('div', { class: 'bmi-bar' }, widths.map((w, i) => h('div', { style: { flex: `${w}`, background: C.bmi[i] } }))),
      h('div', { class: 'bmi-mark', style: { left: `${pos * 100}%` } }));
  }
  function bmiBanner(ic, title, value, lines) {
    return banner({ ic, title, key: 'bmi', children: [bmiBar(value), lines.map((l) => h('p', { class: 'banner-txt', style: { marginTop: '4px' } }, l))] });
  }
  // So na web: trava de dados impossiveis. IMC (peso atual ou meta) fora de 13 a 70 nao avanca.
  const IMC_MIN = 13, IMC_MAX = 70;
  const imcPossivel = (kg, cm) => { if (kg == null || cm == null) return true; const b = TF.bmi(kg, cm); return b >= IMC_MIN && b <= IMC_MAX; };
  function Weight() {
    if (a.weightKg == null) a.weightKg = defaultWeightKg(a.gender);
    const slot = h('div', { class: 'gap16' });
    const btn = primary('Continuar', () => { if (imcPossivel(a.weightKg, a.heightCm)) confirmThen(TF.bodyDataConfirmation({ weight: a.weightKg }), () => next()); });
    const drawSlot = () => {
      if (a.heightCm == null) return;
      const b = TF.bmi(a.weightKg, a.heightCm);
      const ok = imcPossivel(a.weightKg, a.heightCm);
      btn.disabled = !ok;
      slot.replaceChildren(ok
        ? bmiBanner('body-outline', [`${T.weight.bmiTitle} `, h('span', { class: 'hl' }, TF.formatBmi(b))], b, [T.bmiMessage[TF.bmiBand(b)]])
        : h('p', { class: 'error', 'aria-live': 'polite' }, T.weight.impossible));
    };
    drawSlot();
    paint({
      fill: true,
      body: [header(T.weight.title, T.weight.subtitle), h('div', { class: 'middle' },
        ruler({ min: TF.MIN_WEIGHT_KG, max: TF.MAX_WEIGHT_KG, step: 0.1, majorEvery: 10, value: a.weightKg, unit: 'kg', label: 'Peso atual em quilos', onChange: (v) => { a.weightKg = v; drawSlot(); } }), slot)],
      footer: [btn],
    });
  }

  // paceFor e suggestedTarget (src/onboarding/stepViews.tsx); targetWeightProblem (questions.tsx)
  function paceFor(targetKg, today = new Date()) {
    if (a.weightKg == null || targetKg == null || !a.pace) return { pace: null, targetDate: null };
    const dir = TF.weightDirection(a.weightKg, targetKg);
    if (dir === 'maintain') return { pace: null, targetDate: null };
    if (a.pace === 'custom') {
      return a.targetDate && TF.checkCustomDate(today, TF.fromIsoDate(a.targetDate), a.weightKg, targetKg).ok ? { pace: 'custom', targetDate: a.targetDate } : { pace: null, targetDate: null };
    }
    return { pace: a.pace, targetDate: TF.toIsoDate(TF.targetDateFor(today, a.weightKg, targetKg, TF.paceRate(dir, a.pace))) };
  }
  function suggestedTarget(goal, currentKg, heightCm) {
    const round1 = (n) => Math.round(n * 10) / 10;
    if (goal === 'lose_weight') return round1(Math.max(heightCm ? TF.minHealthyWeight(heightCm) : 0, currentKg * 0.92));
    if (goal === 'gain_muscle') return round1(currentKg * 1.05);
    return currentKg;
  }
  function targetWeightProblem(goal, currentKg, targetKg, heightCm) {
    if (targetKg == null || currentKg == null || heightCm == null || !goal) return null;
    if (!TF.isPlausibleWeight(targetKg)) return TF.WEIGHT_ERROR;
    if (!imcPossivel(targetKg, heightCm)) return T.target.impossible;
    const issue = TF.targetWeightIssue({ goal, currentKg, targetKg, heightCm });
    if (!issue) return null;
    if (issue.kind === 'below_healthy') return `${T.target.belowA} ${issue.minKg} kg.`;
    return issue.goal === 'lose_weight' ? T.target.wrongLose : T.target.wrongGain;
  }
  function targetBanner(currentKg, targetKg, heightCm) {
    const dir = TF.weightDirection(currentKg, targetKg);
    if (dir === 'maintain') return null;
    const big = dir === 'lose' && (currentKg - targetKg) / currentKg > TF.BIG_LOSS_FRACTION;
    const title = dir === 'lose'
      ? [`${T.target.loseA} `, h('span', { class: 'hl' }, `${TF.lossPercent(currentKg, targetKg)}%`), ` ${T.target.loseB}`]
      : [`${T.target.gainA} `, h('span', { class: 'hl' }, `${TF.formatKg(targetKg - currentKg)} kg`)];
    const message = dir === 'gain' ? T.target.gainMsg : big ? T.target.bigMsg : T.target.okMsg;
    const tb = TF.bmi(targetKg, heightCm);
    return bmiBanner('flag-outline', title, tb, [[`${T.target.bmi} `, h('span', { class: 'strong' }, TF.formatBmi(tb))], message]);
  }
  function TargetWeight() {
    const current = a.weightKg ?? defaultWeightKg(a.gender);
    if (a.targetWeightKg == null) a.targetWeightKg = suggestedTarget(a.goal, current, a.heightCm);
    const slot = h('div');
    const btn = primary('Continuar', () => confirmThen(TF.bodyDataConfirmation({ targetWeight: a.targetWeightKg }), () => next({ ...paceFor(a.targetWeightKg) })));
    const drawSlot = () => {
      const problem = targetWeightProblem(a.goal, current, a.targetWeightKg, a.heightCm);
      btn.disabled = !!problem;
      slot.replaceChildren(...[
        problem ? h('p', { class: 'error', 'aria-live': 'polite' }, problem)
          : a.heightCm != null ? (() => { const b = targetBanner(current, a.targetWeightKg, a.heightCm); return b && h('div', { class: 'gap16' }, b); })() : null,
      ].filter(Boolean));
    };
    drawSlot();
    paint({
      fill: true,
      body: [header(T.target.title), h('div', { class: 'middle' },
        ruler({ min: TF.MIN_WEIGHT_KG, max: TF.MAX_WEIGHT_KG, step: 0.1, majorEvery: 10, value: a.targetWeightKg, unit: 'kg', highlight: () => current, label: 'Meta de peso em quilos', onChange: (v) => { a.targetWeightKg = v; drawSlot(); } }),
        slot,
        a.goal === 'improve_health' && h('div', { class: 'gap12' }, textLink(T.target.keep, () => next({ targetWeightKg: null, pace: null, targetDate: null }))))],
      footer: [btn],
    });
  }

  function paceLines(kgPerWeek, date, days, today) {
    return h('span', { class: 'pace-lines' },
      kgPerWeek != null && h('span', { class: 'pace-line' }, icon('locate-outline', 16, C.t2), `${TF.formatKg(kgPerWeek)} ${T.pace.perWeek}`),
      h('span', { class: 'pace-line' }, icon('calendar-outline', 16, C.t2), `${TF.formatDateLong(date, today)} · ${T.pace.inDays} ${days} ${T.pace.days}`));
  }
  function Pace() {
    const today = new Date();
    const currentKg = a.weightKg, targetKg = a.targetWeightKg;
    const dir = TF.weightDirection(currentKg, targetKg);
    const minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 12);
    const maxDate = new Date(today.getFullYear() + 3, today.getMonth(), today.getDate(), 12); // so na web: ate 3 anos
    let picking = false, unsafe = null, tooFar = false;
    const pickDate = (picked) => {
      tooFar = picked.getTime() > maxDate.getTime();
      if (tooFar) { unsafe = null; draw(); scrollToEnd(); return; }
      const date = picked.getTime() < minDate.getTime() ? minDate : picked;
      const check = TF.checkCustomDate(today, date, currentKg, targetKg);
      if (check.ok) { unsafe = null; update({ pace: 'custom', targetDate: TF.toIsoDate(date) }); draw(); return; }
      unsafe = check.safeDate;
      draw();
      scrollToEnd();
    };
    const draw = () => {
      const customDate = a.pace === 'custom' && a.targetDate ? TF.fromIsoDate(a.targetDate) : null;
      const suggested = TF.targetDateFor(today, currentKg, targetKg, TF.paceRate(dir, 'recommended'));
      const pickerValue = new Date(Math.min(Math.max((customDate ?? suggested).getTime(), minDate.getTime()), maxDate.getTime()));
      paint({
        body: [
          header(T.pace.title),
          opts([
            ...TF.PACE_OPTIONS.map((o) => {
              const rate = TF.paceRate(dir, o.value);
              const date = TF.targetDateFor(today, currentKg, targetKg, rate);
              return optionCard({
                label: o.label, desc: o.desc, badge: o.value === 'recommended' ? T.pace.badge : null, selected: a.pace === o.value,
                onPress: () => { unsafe = null; tooFar = false; picking = false; update({ pace: o.value, targetDate: TF.toIsoDate(date) }); draw(); },
                children: paceLines(TF.weeklyKg(currentKg, rate), date, TF.daysUntil(today, date), today),
              });
            }),
            optionCard({ label: T.pace.custom, selected: a.pace === 'custom', onPress: () => { picking = true; draw(); const i = scrollEl.querySelector('.date-native'); if (i) { i.focus(); try { i.showPicker?.(); } catch (e) { /* sem seletor: segue o campo */ } } }, children: customDate ? paceLines(null, customDate, TF.daysUntil(today, customDate), today) : null }),
          ]),
          picking && h('input', {
            class: 'date-native', type: 'date', value: TF.toIsoDate(pickerValue), min: TF.toIsoDate(minDate), max: TF.toIsoDate(maxDate), 'aria-label': T.pace.custom,
            onchange: (e) => { if (e.target.value) pickDate(TF.fromIsoDate(e.target.value)); },
          }),
          tooFar && h('p', { class: 'error', 'aria-live': 'polite' }, T.pace.tooFar),
          unsafe && h('div', { class: 'gap16' }, banner({
            ic: 'information-circle-outline', key: 'unsafe',
            text: [`${T.pace.unsafeA} `, h('span', { class: 'strong' }, TF.formatDateLong(unsafe, today)), '.'],
            children: textLink(`${T.pace.use} ${TF.formatDateLong(unsafe, today)}`, () => { update({ pace: 'custom', targetDate: TF.toIsoDate(unsafe) }); unsafe = null; picking = false; draw(); }, { left: true }),
          })),
          caption(T.pace.reference, 'gap16'),
        ],
        footer: [primary('Continuar', () => next(), !a.pace || !a.targetDate)],
      });
    };
    draw();
  }

  function YoYo() {
    paint({
      body: [
        header(T.yoYo.title, a.triedBefore === 'many' ? T.yoYo.subtitleMany : null, 2),
        h('div', { class: 'card chart-card' }, yoYoChart('Com dieta restritiva o peso cai e volta acima do inicial três vezes, cada vez mais alto; com rotina cai aos poucos e se mantém'),
          legend([{ label: T.yoYo.legendRoutine, color: C.pastelGreen, line: 'solid' }, { label: T.yoYo.legendDiet, color: 'rgba(14,26,29,0.45)', line: 'solid' }])),
        h('p', { class: 'body gap18' }, T.yoYo.body),
        h('div', { class: 'banners' }, banner({ ic: 'document-text-outline', text: T.yoYo.source })),
      ],
      footer: [primary(T.yoYo.button, () => next())],
    });
  }

  function Projection() {
    const today = new Date();
    const w = a.weightKg ?? 0;
    const kind = projectionKind();
    const title = kind === 'change'
      ? [`${a.displayName}, ${T.projection.canReach} `, h('span', { class: 'hl' }, `${TF.formatKg(a.targetWeightKg)} kg`), ` ${T.projection.until} `, h('span', { class: 'hl' }, TF.formatDateLong(TF.fromIsoDate(a.targetDate), today))]
      : kind === 'health' ? `${a.displayName}, ${T.projection.health}` : `${T.projection.maintain[0]} ${TF.formatKg(w)} ${T.projection.maintain[1]}`;
    paint({
      body: [
        header(title),
        h('div', { class: 'card chart-card' }, projectionChart()),
        h('div', { class: 'banners' }, banner({ ic: 'sparkles-outline', text: T.projection.banner1 }), banner({ ic: 'information-circle-outline', text: T.projection.banner2 })),
      ],
      footer: [primary(T.projection.button, () => next())],
    });
    confetti(60, 1300);
  }

  function Score() {
    paint({
      body: [
        header(T.score.title),
        h('div', { class: 'card chart-card' },
          lineChart({
            series: [{ values: TF.CHART.scoreWith, color: C.teal, glow: true, delay: 400 }, { values: TF.CHART.scoreWithout, color: C.t2, width: 2, opacity: 0.6, dashed: true }],
            height: 220, yDomain: [0, 100], endIcon: 'trophy', yTitle: T.score.y, xTitle: T.score.x, label: 'Com o Tribbo Fit a evolução sobe até o troféu; sem rotina cai até zero',
          }),
          legend([{ label: T.score.with, color: C.teal, line: 'solid' }, { label: T.score.without, color: C.t2, opacity: 0.6, line: 'dashed' }])),
        h('div', { class: 'checks' }, iconItem('trophy-outline', T.score.item1), iconItem('notifications-outline', T.score.item2)),
        caption(T.score.caption, 'gap18'),
      ],
      footer: [primary(T.score.button, () => next())],
    });
  }

  function stars(size) {
    return h('div', { class: 'stars', 'aria-label': '5 estrelas' }, Array.from({ length: 5 }, () => icon('star', size, C.gold)));
  }
  function Reviews() {
    paint({
      body: [
        header(`${T.reviews.titleA} ${T.reviews.peopleLabel} ${T.reviews.titleB}`, T.reviews.subtitle),
        h('div', { class: 'reviews' }, T.reviewList.map((r) => h('div', { class: 'card' },
          h('div', { class: 'rev-head' }, h('img', { class: 'avatar', src: r.photo, alt: '' }), h('div', { class: 'rev-who' }, h('div', { class: 'rev-name' }, r.name), stars(13))),
          h('p', { class: 'rev-txt' }, `"${r.text}"`)))),
      ],
      footer: [primary(T.reviews.button, () => next())],
    });
  }

  function Acquisition() {
    const draw = () => paint({
      body: [header(T.acquisition.title), opts(TF.ACQUISITION_OPTIONS.map((o) => optionCard({
        label: o.label, ic: o.icon, selected: a.acquisitionSource === o.value, onPress: () => { a.acquisitionSource = o.value; draw(); autoNext(); },
      })))],
    });
    draw();
  }

  function BeforeAfter() {
    const p = beforeAfterPerson();
    paint({
      body: [
        header(T.beforeAfter.title),
        h('div', { class: 'photos' }, h('img', { src: `assets/antes-depois/${p.id}-antes.webp`, alt: `${p.name}, antes` }), h('i'), h('img', { src: `assets/antes-depois/${p.id}-depois.webp`, alt: `${p.name}, depois` })),
        h('div', { class: 'who' },
          h('div', { class: 'name-row' }, h('div', { class: 'name-group' }, h('b', null, p.name), icon('checkmark-circle', 18, C.verified)), h('span', null, `· ${p.city}, ${p.uf}`)),
          caption(T.beforeAfter.disclaimer, 'disclaimer')),
      ],
      footer: [primary('Continuar', () => next())],
    });
  }

  const Activity = () => singleChoice({ title: T.activity.title, list: TF.ACTIVITY_LEVEL_OPTIONS, field: 'activityLevel', descs: true });

  // Sono: src/components/profileQuestions/questions.tsx, SleepWeekEditor.tsx e SleepGoalStepper.tsx
  const DAY_SHORT = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
  const DAY_DATA = [1, 2, 3, 4, 5, 6, 0];
  const WEEKDAYS = [1, 2, 3, 4, 5];
  const WEEKEND = [6, 0];
  const DEFAULT_TIMES = { bedtime: '23:00', waketime: '07:00' };
  const schedulesFor = (mode, week, weekend) => (mode === 'same'
    ? [{ id: 'all', days: [...DAY_DATA], ...week }]
    : [{ id: 'weekdays', days: WEEKDAYS, ...week }, { id: 'weekend', days: WEEKEND, ...(weekend ?? week) }]);
  const timesOf = (s) => (s ? { bedtime: s.bedtime, waketime: s.waketime } : DEFAULT_TIMES);
  const formatGoal = (v) => { const hi = Math.floor(v); const mi = Math.round((v - hi) * 60); return mi > 0 ? `${hi}h${String(mi).padStart(2, '0')}` : `${hi}h`; };
  const formatSleepHours = (v) => { const w = Math.floor(v); const m = Math.round((v - w) * 60); return m > 0 ? `${w} h ${String(m).padStart(2, '0')}` : `${w} h`; };
  const VS_GOAL = { below: { color: C.barYellow, ic: 'arrow-down-circle' }, on_goal: { color: C.barGreen, ic: 'checkmark-circle' }, above: { color: C.barBlue, ic: 'arrow-up-circle' } };

  function sleepDuration(bedtime, waketime, goal) {
    const hours = TF.sleepHours(bedtime, waketime);
    const vs = TF.sleepVsGoal(hours, goal);
    return h('div', { class: 'duration' }, icon(VS_GOAL[vs].ic, 18, VS_GOAL[vs].color),
      h('span', null, `${formatSleepHours(Math.round(hours * 4) / 4)} ${T.sleep.ofSleep} · `, h('span', { style: { color: VS_GOAL[vs].color } }, T.sleep.vs[vs])));
  }
  function timeRows(bedtime, waketime, onChange, refresh) {
    return h('div', { class: 'rows' }, [['bedtime', bedtime, 'moon-outline', T.sleep.bedtime], ['waketime', waketime, 'sunny-outline', T.sleep.waketime]].map(([kind, val, ic, lb]) => h('div', { class: 'row' },
      bubble(ic, 36), h('span', { class: 'row-label' }, lb),
      // O numero fica em texto, sempre em 24 h como no app; o campo nativo so abre o seletor do aparelho.
      h('label', { class: 'time-box' }, h('b', null, val), h('input', {
        class: 'time-input', type: 'time', value: val, 'aria-label': lb,
        oninput: (e) => { if (e.target.value) { e.target.previousSibling.textContent = e.target.value; onChange(kind, e.target.value); refresh(); } },
        onclick: (e) => { try { e.target.showPicker?.(); } catch (err) { /* segue o campo */ } },
      })))));
  }
  function Sleep() {
    if (a.sleepSchedules.length === 0) a.sleepSchedules = schedulesFor('same', DEFAULT_TIMES);
    const draw = () => {
      const schedules = a.sleepSchedules;
      const mode = a.sleepMode;
      const week = timesOf(schedules[0]);
      const weekend = timesOf(schedules.find((s) => s.id === 'weekend') ?? schedules[1]);
      const setMode = (m, list) => { a.sleepMode = m; a.sleepSchedules = list; draw(); };
      // Trocar um horario atualiza a duracao e a dica no lugar: redesenhar a tela ao sair do campo
      // engolia o toque seguinte no celular.
      const live = [];
      const refresh = () => live.forEach((f) => f());
      const durationSlot = (getTimes) => {
        const el = h('div');
        const up = () => { const t = getTimes(); el.replaceChildren(sleepDuration(t.bedtime, t.waketime, a.sleepGoalHours)); };
        up(); live.push(up);
        return el;
      };
      const setTime = (which, kind, t) => {
        const w2 = which === 'week' ? { ...week, [kind]: t } : week;
        const e2 = which === 'weekend' ? { ...weekend, [kind]: t } : weekend;
        a.sleepSchedules = schedulesFor(mode === 'weekend' ? 'weekend' : 'same', w2, e2);
        week.bedtime = w2.bedtime; week.waketime = w2.waketime; weekend.bedtime = e2.bedtime; weekend.waketime = e2.waketime;
      };
      const goalCard = h('div', { class: 'card' },
        h('p', { class: 'card-title' }, T.sleep.goal),
        h('div', { class: 'stepper' },
          h('button', { type: 'button', 'aria-label': 'Diminuir meta de sono', onclick: () => { a.sleepGoalHours = Math.max(4, Math.round((a.sleepGoalHours - 0.5) * 2) / 2); draw(); } }, icon('remove', 18, C.t1)),
          h('b', null, formatGoal(a.sleepGoalHours)),
          h('button', { type: 'button', 'aria-label': 'Aumentar meta de sono', onclick: () => { a.sleepGoalHours = Math.min(12, Math.round((a.sleepGoalHours + 0.5) * 2) / 2); draw(); } }, icon('add', 18, C.t1))),
        caption(T.sleep.goalNote, 'center-cap'));
      let rest;
      if (mode === 'custom') {
        const covered = new Set(schedules.flatMap((s) => s.days));
        const uncovered = DAY_DATA.filter((d) => !covered.has(d));
        const toggleDay = (id, day) => {
          const target = a.sleepSchedules.find((s) => s.id === id);
          if (!target) return;
          const has = target.days.includes(day);
          a.sleepSchedules = a.sleepSchedules
            .map((s) => (s.id === id ? { ...s, days: has ? s.days.filter((d) => d !== day) : [...s.days, day] } : has ? s : { ...s, days: s.days.filter((d) => d !== day) }))
            .filter((s) => s.days.length > 0);
          draw();
        };
        rest = h('div', { class: 'card gap12' },
          caption(T.sleep.tap),
          h('div', { style: { marginTop: '10px' } }, schedules.map((s) => h('div', { class: 'sw-card' },
            h('div', { class: 'sw-days' }, DAY_DATA.map((day, vi) => h('button', { type: 'button', class: `sw-day${s.days.includes(day) ? ' on' : ''}`, role: 'checkbox', 'aria-checked': s.days.includes(day) ? 'true' : 'false', 'aria-label': T.sleep.dayNames[vi], onclick: () => toggleDay(s.id, day) }, DAY_SHORT[vi]))),
            timeRows(s.bedtime, s.waketime, (k, t) => { a.sleepSchedules = a.sleepSchedules.map((x) => (x.id === s.id ? { ...x, [k]: t } : x)); }, refresh),
            durationSlot(() => a.sleepSchedules.find((x) => x.id === s.id) ?? s)))),
          uncovered.length > 0 && h('div', { class: 'sw-uncovered' },
            h('span', null, `${T.sleep.uncovered} ${uncovered.map((d) => T.sleep.dayNames[DAY_DATA.indexOf(d)]).join(', ')}`),
            h('button', { type: 'button', class: 'add-btn', onclick: () => { a.sleepSchedules = [...a.sleepSchedules, { id: `s${Date.now()}`, days: uncovered, bedtime: '23:00', waketime: '07:00' }]; draw(); } }, icon('add-circle-outline', 18, C.t1), T.sleep.add)),
          textLink(T.sleep.same, () => setMode('same', schedulesFor('same', timesOf(a.sleepSchedules[0])))));
      } else {
        const tipSlot = h('div');
        const upTip = () => tipSlot.replaceChildren(...(mode === 'weekend' && TF.wakeDiffMinutes(week.waketime, weekend.waketime) > TF.WAKE_REGULARITY_LIMIT_MIN ? [h('div', { class: 'gap12' }, banner({ ic: 'bulb-outline', text: T.sleep.tip, key: 'tip' }))] : []));
        upTip(); live.push(upTip);
        rest = [
          h('div', { class: 'card gap12' },
            mode === 'weekend' && h('p', { class: 'card-title' }, T.sleep.weekdays),
            timeRows(week.bedtime, week.waketime, (k, t) => setTime('week', k, t), refresh),
            durationSlot(() => week)),
          h('div', { class: 'card gap12 switch-row' }, h('span', null, T.sleep.switch),
            h('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': mode === 'weekend' ? 'true' : 'false', 'aria-label': T.sleep.switch, onclick: () => { const on = mode !== 'weekend'; setMode(on ? 'weekend' : 'same', schedulesFor(on ? 'weekend' : 'same', week, week)); } })),
          mode === 'weekend' && h('div', { class: 'card gap12' },
            h('p', { class: 'card-title' }, T.sleep.weekend),
            timeRows(weekend.bedtime, weekend.waketime, (k, t) => setTime('weekend', k, t), refresh),
            durationSlot(() => weekend)),
          mode === 'weekend' && tipSlot,
          textLink(T.sleep.custom, () => setMode('custom', a.sleepSchedules)),
        ];
      }
      paint({ body: [header(T.sleep.title), goalCard, rest], footer: [primary('Continuar', () => next())] });
    };
    draw();
  }

  // ─── Telas 17 a 29 (stepViewsTreino.tsx e treinoQuestions.tsx) ──────────────

  const Level = () => singleChoice({ title: T.level.title, subtitle: T.level.subtitle, list: TF.FITNESS_LEVELS, field: 'fitnessLevel', iconGroup: 'level', descs: true });
  function Experience() {
    const draw = () => paint({
      body: [
        header(T.experience.title),
        opts(TF.EXPERIENCE_OPTIONS.map((o) => optionCard({ label: o.label, selected: a.trainingExperience === o.value, onPress: () => { a.trainingExperience = o.value; draw(); if (o.value !== 'never') autoNext(); } }))),
        a.trainingExperience === 'never' && reactionCard('never', T.experience.reaction, 'play-circle-outline'),
      ],
      footer: a.trainingExperience === 'never' ? [primary('Continuar', () => next())] : [],
    });
    draw();
  }
  const Equipment = () => singleChoice({ title: T.equipment.title, list: TF.EQUIPMENT_OPTIONS, field: 'equipment', iconGroup: 'equipment', descs: true });
  function Bodyweight() {
    const MOVE_ICONS = { squat: 'body-outline', push_up: 'barbell-outline', pull_up: 'barbell-outline', none: 'remove-circle-outline' };
    const MOVE_GIFS = { squat: 'Agachamento livre (peso do corpo)', push_up: 'Flexão de braço', pull_up: 'Barra fixa' };
    const draw = () => paint({
      body: [
        header(T.bodyweight.title, T.bodyweight.subtitle),
        opts(T.bodyweight.moves.map((o) => optionCard({
          label: o.label, desc: o.desc, multi: true, selected: a.bodyweightMoves.includes(o.value), ic: o.value === 'none' ? MOVE_ICONS.none : undefined,
          media: o.value !== 'none' ? (gifThumb(MOVE_GIFS[o.value], 56) || bubble(MOVE_ICONS[o.value], 56)) : undefined,
          onPress: () => { a.bodyweightMoves = TF.toggleExclusive(a.bodyweightMoves, o.value); draw(); },
        }))),
        a.bodyweightMoves.includes('none') && reactionCard('none', T.bodyweight.reaction, 'trending-up-outline'),
      ],
      footer: [primary('Continuar', () => next(), a.bodyweightMoves.length === 0)],
    });
    draw();
  }
  function Days() {
    const draw = () => {
      const warn = TF.daysWarning(a.fitnessLevel, a.workoutDays);
      paint({
        body: [
          header(T.days.title, T.days.subtitle),
          opts(TF.DAYS_OPTIONS.map((o) => optionCard({ label: o.label, selected: a.workoutDays === o.value, onPress: () => { a.workoutDays = o.value; draw(); if (!TF.daysWarning(a.fitnessLevel, o.value)) autoNext(); } }))),
          warn && h('div', { class: 'gap16' }, banner({ ic: 'calendar-outline', text: T.days.warning, key: 'days' })),
        ],
        footer: warn ? [primary('Continuar', () => next())] : [],
      });
    };
    draw();
  }
  function Duration() {
    const rec = TF.recommendedDuration(a.fitnessLevel);
    const lv = T.duration.levels[a.fitnessLevel ?? ''];
    const draw = () => paint({
      body: [
        header(T.duration.title, lv ? `${T.duration.sub[0]} ${lv}, ${T.duration.sub[1]} ${rec} min.` : null),
        opts(T.duration.options.map((m) => optionCard({
          label: `${m} min`, ic: 'time-outline', badge: m === rec ? T.duration.badge : null, desc: m === rec ? T.duration.desc : undefined, highlight: m === rec, selected: a.workoutDuration === m,
          onPress: () => { a.workoutDuration = m; draw(); autoNext(); },
        }))),
      ],
    });
    draw();
  }
  function educational(content) {
    paint({
      body: [
        h('img', { class: 'edu-img', src: content.image, alt: content.title, style: { aspectRatio: `${content.ratio}` } }),
        h('h1', { class: 'body gap18', style: { fontWeight: 400, margin: '18px 0 0', fontSize: '16px' }, tabindex: '-1' }, content.text),
        caption(content.source, 'gap8'),
      ],
      footer: [primary(T.edu.button, () => next())],
    });
  }
  const eduTraining = () => (a.goal === 'lose_weight' ? T.edu.lose : a.goal === 'gain_muscle' ? T.edu.gain : T.edu.health);
  const DidYouKnowTraining = () => educational(eduTraining());
  const DidYouKnowMuscle = () => educational(T.edu.muscle);

  function Cardio() {
    const draw = () => {
      const needs = a.doesCardio === 'sometimes' || a.doesCardio === 'regular';
      paint({
        body: [
          header(T.cardio.title, T.cardio.subtitle),
          opts(TF.DOES_CARDIO_OPTIONS.map((o) => optionCard({ label: o.label, selected: a.doesCardio === o.value, onPress: () => { a.doesCardio = o.value; draw(); if (o.value === 'no') autoNext({ cardioTypes: [] }); } }))),
          needs && h('div', { class: 'sub-q' }, h('p', { class: 'sub-title' }, T.cardio.which), h('div', { class: 'compact-grid' }, TF.CARDIO_TYPE_OPTIONS.map((o) => compact({
            label: o.label, mci: iconOf('cardio', o.value), selected: a.cardioTypes.includes(o.value),
            onPress: () => { a.cardioTypes = a.cardioTypes.includes(o.value) ? a.cardioTypes.filter((t) => t !== o.value) : [...a.cardioTypes, o.value]; draw(); },
          })))),
        ],
        footer: needs ? [primary('Continuar', () => next(), a.cardioTypes.length === 0)] : [],
      });
    };
    draw();
  }

  // Boneco: src/components/profileQuestions/BodyMap.tsx
  function bodyMap({ map, selected, onToggle, tapOwner, highlight, allOn }) {
    const colWidth = Math.min(scrollEl.clientWidth, 480);
    const scale = Math.min(0.9, (colWidth - 32 - 16) / 2 / 200);
    const on = new Set(allOn ? Object.values(map).flat() : selected.flatMap((c) => map[c] ?? []));
    const tappable = new Set(Object.values(map).flat());
    const owner = (slug) => tapOwner?.[slug] ?? Object.keys(map).find((c) => map[c].includes(slug)) ?? null;
    const gender = a.gender === 'female' ? 'female' : 'male';
    return h('div', { class: 'body-row' }, ['front', 'back'].map((side) => {
      const d = TF.BODY[gender][side];
      const s = svg('svg', { viewBox: d.box, width: 200 * scale, height: 400 * scale, role: 'img', 'aria-label': side === 'front' ? T.pain.front : T.pain.back });
      d.parts.forEach((p) => {
        const hit = tappable.has(p.s);
        const fill = hit ? (on.has(p.s) ? highlight : 'rgba(14,26,29,0.22)') : 'rgba(14,26,29,0.10)';
        p.d.forEach((path) => {
          const el = svg('path', { d: path, fill });
          if (hit) { el.style.cursor = 'pointer'; el.addEventListener('click', () => { const c = owner(p.s); if (c) onToggle(c); }); }
          s.append(el);
        });
      });
      return h('div', { class: 'body-col' }, s, h('span', null, side === 'front' ? T.pain.front : T.pain.back));
    }));
  }

  function Pain() {
    const toggleRegion = (c) => { a.injuries = a.injuries.includes(c) ? a.injuries.filter((r) => r !== c) : [...a.injuries, c]; };
    const draw = () => {
      const ok = a.hasPain === false || (a.hasPain === true && a.injuries.length > 0);
      paint({
        body: [
          header(T.pain.title),
          opts([
            optionCard({ label: T.pain.no, selected: a.hasPain === false, onPress: () => { a.hasPain = false; draw(); } }),
            optionCard({ label: T.pain.yes, selected: a.hasPain === true, onPress: () => { a.hasPain = true; draw(); } }),
          ]),
          a.hasPain === true && h('div', { class: 'sub-q' },
            h('p', { class: 'sub-title' }, T.pain.where),
            h('div', { class: 'compact-grid' }, TF.INJURY_CODES.map((c) => compact({
              label: TF.restrictionLabel(c), mci: iconOf('injury', c), selected: a.injuries.includes(c),
              onPress: () => { const adding = !a.injuries.includes(c); toggleRegion(c); draw(); if (adding && c === 'other') scrollToEnd(); },
            }))),
            bodyMap({ map: TF.INJURY_BODY_MAP, selected: a.injuries, highlight: C.bodyInjury, onToggle: (c) => { toggleRegion(c); draw(); } }),
            a.injuries.includes('other') && h('input', { class: 'input note-input', style: { marginTop: 0 }, type: 'text', maxlength: 80, value: a.injuryNote, placeholder: T.pain.placeholder, 'aria-label': 'Outra dor ou lesão, em poucas palavras', oninput: (e) => { a.injuryNote = e.target.value.slice(0, 80); } }),
            a.injuries.length > 0 && reactionCard('pain', T.pain.reaction, 'bandage-outline')),
        ],
        footer: [primary('Continuar', () => next(a.hasPain ? null : { injuries: [], injuryNote: '' }), !ok)],
      });
    };
    draw();
  }

  function conditionsNote(value, goal) {
    const lose = goal === 'lose_weight';
    if (lose && value.includes('pregnant')) return T.health.pregnantLose;
    if (value.includes('breastfeeding')) return lose ? T.health.breastfeedingLose : T.health.breastfeeding;
    return null;
  }
  function Health() {
    const draw = () => {
      const note = conditionsNote(a.conditions, a.goal);
      paint({
        body: [
          header(T.health.title, T.health.subtitle),
          opts([...TF.HEALTH_CONDITION_CODES, 'none'].map((c) => optionCard({
            label: TF.restrictionLabel(c), multi: true, selected: a.conditions.includes(c),
            onPress: () => {
              const nextList = TF.toggleExclusive(a.conditions, c);
              const newlySerious = nextList.some((x) => TF.isSeriousCondition(x) && !a.conditions.includes(x));
              a.conditions = nextList;
              draw();
              if (newlySerious) {
                shellSheet({ ic: 'medkit-outline', title: T.sheets.ackTitle, body: T.sheets.ackBody, actions: (close) => primary(T.sheets.ackButton, () => { close(); a.healthClearanceAckAt = new Date().toISOString(); }) });
              }
            },
          }))),
          note && h('div', { class: 'gap16' }, banner({ ic: 'nutrition-outline', text: note, key: 'note' })),
        ],
        footer: [primary('Continuar', () => next(), a.conditions.length === 0)],
      });
    };
    draw();
  }
  function Focus() {
    if (a.muscleFocus.length === 0) a.muscleFocus = ['none'];
    const set = (code) => { const n = TF.toggleExclusive(a.muscleFocus, code); a.muscleFocus = n.length === 0 ? ['none'] : n; draw(); };
    const draw = () => {
      const whole = a.muscleFocus.length === 0 || a.muscleFocus.includes('none');
      paint({
        body: [
          header(T.focus.title, T.focus.subtitle),
          opts(TF.FOCUS_OPTIONS.map((o) => optionCard({ label: o.label, multi: true, selected: o.value === 'none' ? whole : a.muscleFocus.includes(o.value), onPress: () => set(o.value) }))),
          h('div', { class: 'gap20' }, bodyMap({ map: TF.FOCUS_BODY_MAP, tapOwner: TF.FOCUS_TAP_OWNER, selected: a.muscleFocus, allOn: whole, highlight: C.bodyFocus, onToggle: set })),
        ],
        footer: [primary('Continuar', () => next(), a.muscleFocus.length === 0)],
      });
    };
    draw();
  }
  function PlanSetup() {
    const aiLocked = a.conditions.some(TF.isSeriousCondition);
    const draw = () => paint({
      body: [
        header(T.setup.title),
        opts(TF.PLAN_SETUP_OPTIONS.map((o) => {
          const locked = o.value === 'ai' && aiLocked;
          return optionCard({
            label: o.label, desc: locked ? T.setup.locked : o.desc, ic: locked ? 'lock-closed-outline' : iconOf('setup', o.value), badge: o.value === 'ai' && !locked ? T.setup.badge : null, locked, selected: a.planSetupChoice === o.value,
            onPress: () => {
              if (locked) {
                shellSheet({
                  ic: 'lock-closed-outline', title: T.sheets.lockedTitle, body: T.sheets.lockedBody,
                  actions: (close) => [
                    primary(T.sheets.lockedManual, () => { close(); next({ planSetupChoice: 'manual' }); }),
                    h('button', { type: 'button', class: 'btn-2', onclick: () => { close(); next({ planSetupChoice: 'pdf' }); } }, T.sheets.lockedImport),
                    h('button', { type: 'button', class: 'link-plain', onclick: () => { close(); goTo('health'); } }, T.sheets.lockedUpdate),
                  ],
                });
                return;
              }
              a.planSetupChoice = o.value; draw(); autoNext();
            },
          });
        })),
      ],
    });
    draw();
  }

  function weekStrip(days) {
    return h('div', { class: 'week-row', 'aria-hidden': 'true' }, DAY_SHORT.map((d, i) => h('div', { class: 'week-day' },
      h('div', { class: `week-dot${days.includes(i) ? ' on' : ''}` }, days.includes(i) && icon('barbell-outline', 13, C.bg)), h('span', null, d))));
  }
  // withGif: so as linhas visiveis (as borradas ficam com o icone, para nao baixar GIF escondido).
  function exerciseRow(x, withGif) {
    return h('div', { class: 'ex-row' }, (withGif && gifThumb(x.name, 52)) || bubble('barbell-outline', 52),
      h('div', { class: 'ex-txt' }, h('div', { class: 'ex-name' }, x.name), h('div', { class: 'ex-meta' }, `${x.sets} ${T.trainingSummary.sets} · ${x.reps} ${T.trainingSummary.reps}`)));
  }
  function TrainingSummary() {
    const S = T.trainingSummary;
    const preview = TF.localPreview(a); // regra local: ver calculos.js
    const edit = (id) => goTo(id, { returnTo: 'training_summary' });
    const level = TF.optionLabel(TF.FITNESS_LEVELS, a.fitnessLevel);
    const place = TF.optionLabel(TF.EQUIPMENT_OPTIONS, a.equipment);
    const focus = a.muscleFocus.filter((f) => f !== 'none');
    const focusLabel = focus.length === 0 ? S.wholeBody : joinPt(focus.map((f) => TF.optionLabel(TF.FOCUS_OPTIONS, f) || f));
    const injuries = a.hasPain ? a.injuries.map((c) => (c === 'other' ? (a.injuryNote.trim() || S.otherRegion) : TF.restrictionLabel(c).toLowerCase())) : [];
    const count = preview.week.length;
    const minutes = a.workoutDuration ?? preview.session.minutes;
    const manual = a.planSetupChoice === 'manual';
    paint({
      body: [
        header(S.title),
        h('div', { class: 'card week-card' },
          h('p', { class: 'week-title' }, `${count} ${S.perWeek} · ${TF.weekFocusLabel(preview.week)} · ${minutes} min`),
          weekStrip(TF.trainingWeekDays(count))),
        h('div', { class: 'folder' },
          h('div', { class: 'folder-tab' }, icon('folder-open-outline', 15), `Treino ${preview.session.letter} · ${preview.session.label}`),
          h('div', { class: 'folder-body' },
            preview.exercises.slice(0, 3).map((x) => exerciseRow(x, true)),
            preview.exercises.length > 3 && h('div', { class: 'locked-wrap' },
              h('div', { class: 'locked-inner', 'aria-hidden': 'true' }, preview.exercises.slice(3).map((x) => exerciseRow(x, false))),
              h('div', { class: 'locked-over' }, icon('lock-closed-outline', 16), manual ? S.lockedManual : S.locked))),
          preview.week.filter((w) => w.letter !== preview.session.letter).map((w) => h('div', { class: 'closed-tab' }, icon('folder-outline', 15), `Treino ${w.letter} · ${w.label}`))),
        injuries.length > 0 && h('div', { class: 'gap18' }, iconItem('shield-checkmark-outline', `${S.protect} ${joinPt(injuries)}`)),
        adjustAnswers([
          { topic: S.rows.level, value: level || S.unanswered, go: () => edit('level') },
          { topic: S.rows.place, value: place || S.unanswered, go: () => edit('equipment') },
          { topic: S.rows.days, value: `${a.workoutDays ?? count} dias`, go: () => edit('days') },
          { topic: S.rows.duration, value: `${minutes} min`, go: () => edit('duration') },
          { topic: S.rows.focus, value: focusLabel, go: () => edit('focus') },
          { topic: S.rows.pain, value: injuries.length > 0 ? `${S.care} ${joinPt(injuries)}` : S.noneInjury, go: () => edit('pain') },
        ]),
      ],
      footer: [primary(manual ? S.buttonManual : S.button, () => next())],
    });
  }

  // ─── Telas 30 a 42 (stepViewsAlimentacao.tsx e alimentacaoQuestions.tsx) ────

  function MealCount() {
    const draw = () => paint({
      body: [header(T.meals.title, T.meals.subtitle), opts(TF.MEAL_COUNT_OPTIONS.map((n) => optionCard({ label: `${n} ${T.meals.unit}`, ic: 'restaurant-outline', selected: a.mealCount === n, onPress: () => { a.mealCount = n; draw(); autoNext(); } })))],
    });
    draw();
  }
  const DietType = () => singleChoice({ title: T.diet.title, list: TF.DIET_TYPE_OPTIONS, field: 'dietType', iconGroup: 'diet', descs: true });
  function Allergies() {
    const draw = () => paint({
      body: [
        header(T.allergies.title, T.allergies.subtitle),
        opts(TF.FOOD_RESTRICTION_OPTIONS.map((o) => optionCard({ label: o.label, multi: true, selected: a.foodRestrictions.includes(o.value), onPress: () => { a.foodRestrictions = TF.toggleExclusive(a.foodRestrictions, o.value); draw(); } }))),
        a.foodRestrictions.some((v) => v !== 'none') && h('div', { class: 'gap16' }, banner({ ic: 'pricetag-outline', text: T.allergies.note, key: 'allergy' })),
      ],
      footer: [primary('Continuar', () => next(), a.foodRestrictions.length === 0)],
    });
    draw();
  }
  function Dislikes() {
    const draw = () => paint({
      body: [
        header(T.dislikes.title, T.dislikes.subtitle, 2),
        opts(TF.FOOD_DISLIKE_OPTIONS.map((o) => optionCard({ label: o.label, multi: true, selected: a.foodDislikes.includes(o.value), onPress: () => { a.foodDislikes = TF.toggleExclusive(a.foodDislikes, o.value); draw(); } }))),
        a.foodDislikes.includes('other') && h('input', { class: 'input note-input', type: 'text', maxlength: 80, value: a.foodDislikesNote, placeholder: T.dislikes.placeholder, 'aria-label': 'Outro alimento que você não come', oninput: (e) => { a.foodDislikesNote = e.target.value.slice(0, 80); } }),
      ],
      footer: [primary('Continuar', () => next()), textLink(T.dislikes.skip, () => next({ foodDislikes: [], foodDislikesNote: '' }))],
    });
    draw();
  }
  const toggle = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  function MealLocations() {
    const draw = () => paint({
      body: [header(T.places.title, T.places.subtitle), opts(TF.MEAL_LOCATION_OPTIONS.map((o) => optionCard({ label: o.label, ic: iconOf('place', o.value), multi: true, selected: a.mealLocations.includes(o.value), onPress: () => { a.mealLocations = toggle(a.mealLocations, o.value); draw(); } })))],
      footer: [primary('Continuar', () => next(), a.mealLocations.length === 0)],
    });
    draw();
  }
  const CookingTime = () => singleChoice({ title: T.cooking.title, list: TF.COOKING_TIME_OPTIONS, field: 'cookingTime', iconGroup: 'cooking' });
  function Kitchen() {
    const draw = () => {
      const all = TF.KITCHEN_OPTIONS.every((o) => a.kitchenEquipment.includes(o.value));
      paint({
        body: [
          header(T.kitchen.title, T.kitchen.subtitle),
          opts([
            optionCard({ label: T.kitchen.all, multi: true, selected: all, media: bubble('mci:check-all'), onPress: () => { a.kitchenEquipment = all ? [] : TF.KITCHEN_OPTIONS.map((o) => o.value); draw(); } }),
            ...TF.KITCHEN_OPTIONS.map((o) => optionCard({ label: o.label, multi: true, selected: a.kitchenEquipment.includes(o.value), media: bubble(iconOf('kitchen', o.value)), onPress: () => { a.kitchenEquipment = toggle(a.kitchenEquipment, o.value); draw(); } })),
          ]),
        ],
        footer: [primary('Continuar', () => next(), a.kitchenEquipment.length === 0)],
      });
    };
    draw();
  }
  function Household() {
    const draw = () => paint({
      body: [header(T.household.title, T.household.subtitle), opts(TF.HOUSEHOLD_OPTIONS.map((o) => optionCard({ label: o.label, ic: o.value === 1 ? 'person-outline' : 'people-outline', selected: a.householdSize === o.value, onPress: () => { a.householdSize = o.value; draw(); autoNext(); } })))],
    });
    draw();
  }
  function Budget() {
    const draw = () => paint({
      body: [
        header(T.budget.title),
        opts(TF.BUDGET_OPTIONS.map((o) => optionCard({ label: o.label, desc: o.desc, ic: iconOf('budget', o.value), selected: a.foodBudget === o.value, onPress: () => { a.foodBudget = o.value; draw(); if (o.value !== 'economic') autoNext(); } }))),
        a.foodBudget === 'economic' && [reactionCard('economic', T.budget.reaction, 'basket-outline'), caption(T.budget.source, 'gap8')],
      ],
      footer: a.foodBudget === 'economic' ? [primary('Continuar', () => next())] : [],
    });
    draw();
  }
  function Nutritionist() {
    const draw = () => paint({
      body: [header(T.mealSetup.title), opts(TF.MEAL_SETUP_OPTIONS.map((o) => optionCard({
        label: o.label, desc: o.desc, ic: iconOf('mealSetup', o.value), badge: o.value === 'auto' ? T.mealSetup.badge : null, selected: a.mealSetupChoice === o.value,
        onPress: () => { update({ mealSetupChoice: o.value, hasNutritionist: o.value === 'nutritionist' }); draw(); autoNext(); },
      })))],
    });
    draw();
  }
  function Supplements() {
    const draw = () => paint({
      body: [
        header(T.supplements.title, null, 2),
        opts(T.supplements.options.map((o) => optionCard({ label: o.label, ic: o.icon, selected: a.supplementsUsage === o.value, onPress: () => { a.supplementsUsage = o.value; draw(); if (o.value === 'none') autoNext(); } }))),
        !!a.supplementsUsage && a.supplementsUsage !== 'none' && reactionCard('yes', T.supplements.reaction, 'alarm-outline'),
      ],
      footer: [primary('Continuar', () => next(), a.supplementsUsage == null)],
    });
    draw();
  }

  function energyClosing() {
    if (a.goal === 'lose_weight' && a.conditions.includes('pregnant')) return T.energy.closingPregnant;
    if (a.goal === 'lose_weight' && a.conditions.includes('breastfeeding')) return T.energy.closingBreastfeeding;
    return T.energy.closing[a.goal ?? 'improve_health'];
  }
  function Energy() {
    const draw = () => {
      const knows = a.calorieKnowledge;
      const explain = knows === 'roughly' || knows === 'no_idea';
      const animate = explain && once('energy-card');
      let start = 0;
      const segs = T.energy.parts.map((p) => {
        const seg = h('div', { class: 'energy-seg', style: { left: `${start * 100}%`, background: p.color, width: animate && !REDUCED ? '0' : `${p.share * 100}%` } });
        if (animate && !REDUCED) {
          const delay = 350 + start * 1400;
          requestAnimationFrame(() => requestAnimationFrame(() => { seg.style.transitionDuration = `${p.share * 1400}ms`; seg.style.transitionDelay = `${delay}ms`; seg.style.width = `${p.share * 100}%`; }));
        }
        start += p.share;
        return seg;
      });
      paint({
        body: [
          header(T.energy.title, null, 2),
          opts(TF.CALORIE_KNOWLEDGE_OPTIONS.map((o) => optionCard({
            label: o.label, selected: knows === o.value,
            onPress: () => { a.calorieKnowledge = o.value; draw(); if (o.value === 'yes') autoNext(); else scrollToEnd(); },
          }))),
          explain && h('div', { class: `card edu-card${animate ? ' fade-up' : ''}`, 'aria-live': 'polite' },
            h('div', { class: 'edu-head' }, h('img', { src: 'assets/edu_calorias.webp', alt: '' }), h('b', null, T.energy.cardTitle)),
            h('div', { class: 'energy-track', 'aria-hidden': 'true' }, segs),
            h('div', { class: 'edu-legend' }, T.energy.parts.map((p) => h('div', { class: 'edu-row' }, h('span', { class: 'edu-dot', style: { background: p.color } }),
              h('span', { class: 'edu-txt' }, `${p.label} · ${T.energy.about} ${Math.round(p.share * 100)}%`, p.note && h('span', { class: 'edu-note' }, p.note))))),
            h('div', { class: 'divider' }),
            h('div', { class: 'edu-row' }, icon('locate-outline', 20), h('span', { class: 'edu-txt' }, energyClosing())),
            caption(T.energy.caption)),
        ],
        footer: explain ? [primary(T.energy.button, () => next())] : [],
      });
    };
    draw();
  }

  function countUp(el, value, format, delay = 0) {
    el.textContent = format(0);
    if (REDUCED) { el.textContent = format(value); return; }
    let raf = 0;
    const start = performance.now() + delay;
    const tick = (t) => {
      const k = Math.min(1, Math.max(0, (t - start) / 1100));
      el.textContent = format(value * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    cleanups.push(() => cancelAnimationFrame(raf));
  }
  const kcalDay = (n) => `${TF.formatKcal(Math.round(n / 10) * 10)} kcal/dia`;

  function macroBar(label, grams, share, color, delay) {
    const fill = h('div', { class: 'macro-fill', style: { background: color, boxShadow: `0 0 6px ${color}` } });
    requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.transitionDelay = `${delay}ms`; fill.style.width = `${Math.min(1, share) * 100}%`; }));
    return h('div', { class: 'macro' },
      h('div', { class: 'macro-head' }, h('span', { class: 'macro-name' }, h('span', { class: 'macro-dot', style: { background: color } }), label), h('span', null, `${grams} g`)),
      h('div', { class: 'macro-track' }, fill));
  }
  function macros(e, base) {
    return [
      macroBar(T.reveal.protein, e.proteinG, (e.proteinG * 4) / e.kcal, C.macroProtein, base),
      macroBar(T.reveal.carbs, e.carbsG, (e.carbsG * 4) / e.kcal, C.macroCarbs, base + 150),
      macroBar(T.reveal.fat, e.fatG, (e.fatG * 9) / e.kcal, C.macroFat, base + 300),
    ];
  }

  // Copo (src/onboarding/WaterCup.tsx): mesma foto e mesma agua desenhada por tras.
  function waterCup(level, height, delay) {
    const W = 974, H = 1478, AXIS = 473.5, TOP = 412, BOTTOM = 1372, X0 = 230, X1 = 718;
    const LEFT = [[236, TOP], [242, 700], [250, 955], [262, 990], [282, 1025], [294, 1050], [309, BOTTOM]];
    const inside = `M ${[...LEFT, ...[...LEFT].reverse().map(([x, y]) => [2 * AXIS - x, y])].map(([x, y]) => `${x} ${y}`).join(' L ')} Z`;
    const surface = (fill, tilt, phase, closed) => {
      const top = BOTTOM - fill * (BOTTOM - TOP);
      let d = '';
      for (let x = X0; x <= X1; x += 16) {
        const y = top + tilt * 0.22 * (x - AXIS) + Math.sin((x / W) * Math.PI * 5 + phase * Math.PI * 2) * 5;
        d += `${d ? ' L' : 'M'} ${x} ${y}`;
      }
      return closed ? `${d} L ${X1} ${H} L ${X0} ${H} Z` : d;
    };
    const uid = `c${visit}`;
    const water = svg('path', { fill: `url(#deep${uid})`, 'clip-path': `url(#inside${uid})` });
    const gleam = svg('path', { fill: `url(#gleam${uid})`, 'clip-path': `url(#inside${uid})` });
    const shine = svg('path', { fill: 'none', stroke: '#DDF1FF', 'stroke-opacity': 0.8, 'stroke-width': 9, 'clip-path': `url(#inside${uid})` });
    const stops = (list) => list.map(([o, c, op]) => svg('stop', { offset: o, 'stop-color': c, 'stop-opacity': op }));
    const s = svg('svg', { viewBox: `0 0 ${W} ${H}` },
      svg('defs', null,
        svg('clipPath', { id: `inside${uid}` }, svg('path', { d: inside })),
        svg('linearGradient', { id: `deep${uid}`, x1: 0, y1: TOP, x2: 0, y2: BOTTOM, gradientUnits: 'userSpaceOnUse' }, stops([[0, '#7CC4FF'], [0.45, '#3B8BF0'], [1, '#1E4FC2']])),
        svg('linearGradient', { id: `gleam${uid}`, x1: X0, y1: 0, x2: X1, y2: 0, gradientUnits: 'userSpaceOnUse' }, stops([[0.06, '#FFFFFF', 0], [0.16, '#FFFFFF', 0.28], [0.28, '#FFFFFF', 0], [0.8, '#000000', 0], [1, '#000000', 0.22]]))),
      water, gleam, shine);
    const target = Math.min(1, Math.max(0, level));
    let tilt = 1, vel = 0, last = performance.now(), raf = 0;
    const t0 = last + delay;
    const frame = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      const k = REDUCED ? 1 : Math.min(1, Math.max(0, (t - t0) / 1400));
      const fill = target * (1 - Math.pow(1 - k, 3));
      if (t >= t0 && !REDUCED) { const acc = -28 * tilt - 2.2 * vel; vel += acc * dt; tilt += vel * dt; }
      if (REDUCED) tilt = 0;
      const phase = REDUCED ? 0 : ((t % 2600) / 2600);
      const d = surface(fill, tilt, phase, true);
      water.setAttribute('d', d); gleam.setAttribute('d', d); shine.setAttribute('d', surface(fill, tilt, phase, false));
      if (!REDUCED) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    cleanups.push(() => cancelAnimationFrame(raf));
    return h('div', { class: 'cup', style: { width: `${height * (W / H)}px`, height: `${height}px` }, 'aria-hidden': 'true' }, s, h('img', { src: 'assets/copo_agua.webp', alt: '' }));
  }

  function EnergyReveal() {
    const R = T.reveal;
    const t = TF.targetsOf(a);
    const e = t.energy;
    a.targets = { kcal: e.kcal, proteinG: e.proteinG, carbsG: e.carbsG, fatG: e.fatG, waterMl: t.waterMl };
    const hasTarget = a.goal !== 'maintain_weight' && a.targetWeightKg != null && TF.weeklyRateOf(a) > 0;
    const phaseLose = t.noDeficit && a.goal === 'lose_weight';
    const heading = phaseLose
      ? [a.conditions.includes('pregnant') ? R.pregnant : R.breast, null]
      : hasTarget ? [`${R.reach} `, `${TF.formatKg(a.targetWeightKg)} kg`]
        : a.goal === 'improve_health' && !t.noDeficit ? [R.health, null] : [`${R.keep} `, `${TF.formatKg(a.weightKg ?? 0)} kg`];
    const diff = e.kcal - e.tdee;
    const pct = e.tdee > 0 ? Math.round((Math.abs(diff) / e.tdee) * 100) : 0;
    const diffLine = Math.abs(diff) < 10
      ? (phaseLose ? R.samePhaseLose : t.noDeficit ? R.samePhase : R.same)
      : diff < 0 ? `${TF.formatKcal(-diff)} ${R.lessA} (${pct}% ${R.below})` : `${TF.formatKcal(diff)} ${R.moreA} (${pct}% ${R.above})`;
    const plan = t.plan;
    const CARD = 450;
    const n1 = h('p', { class: 'reveal-num' });
    const n2 = h('p', { class: 'reveal-num' });
    countUp(n1, e.tdee, kcalDay);
    countUp(n2, e.kcal, (n) => `${R.goalPrefix} ${kcalDay(n)}`, CARD);
    const openHow = () => openSheet((close) => [
      h('div', { class: 'sheet-handle' }),
      h('div', { class: 'sheet-scroll' }, h('h2', { class: 'sheet-title' }, R.howTitle), h('div', { class: 'how-list' }, R.howItems.map(([ic, text]) => h('div', { class: 'how-item' }, bubble(ic, 36), h('span', null, text))))),
      h('div', { class: 'sheet-actions' }, primary(R.howClose, close)),
    ]);
    const card = (cls, delay, kids) => h('div', { class: `card ${cls} fade-up`, style: { animationDelay: `${delay}ms` } }, kids);
    paint({
      body: [
        header(R.title),
        card('reveal', 0, [emojiBubble('🔥', 44), h('div', { class: 'reveal-body' }, h('p', { class: 'reveal-lead' }, R.spend), n1, h('p', { class: 'reveal-small' }, R.basis))]),
        card('reveal gap12', CARD, [bubble('locate-outline', 44), h('div', { class: 'reveal-body' }, h('p', { class: 'reveal-lead white' }, heading[0], heading[1] && h('b', null, heading[1])), n2, h('p', { class: 'reveal-small' }, diffLine))]),
        card('macros gap12', CARD * 2, macros(e, CARD * 2 + 200)),
        card('reveal gap12', CARD * 3, [
          waterCup(t.waterMl / 4000, 112, CARD * 3 + 200),
          h('div', { class: 'reveal-body' }, h('p', { class: 'reveal-lead' }, h('span', { class: 'emo-i', 'aria-hidden': 'true' }, '💧'), R.water), h('p', { class: 'reveal-num' }, `${TF.formatLiters(t.waterMl)} ${R.litersDay}`),
            plan.cups > 1 && [h('p', { class: 'reveal-small' }, `${plan.cups} ${R.cups}`), h('p', { class: 'reveal-small' }, `${R.every[0]} ${TF.formatInterval(plan.intervalMin)}, ${R.every[1]} ${TF.formatClock(plan.firstMin)} ${R.every[2]} ${TF.formatClock(plan.lastMin)}`)]),
        ]),
        h('div', { class: 'gap8' }, textLink(R.how, openHow, { soft: true })),
      ],
      footer: [primary(R.button, () => next())],
    });
    // Linha unica: em tela estreita a fonte encolhe ate 78% (mesma regra do app).
    const longest = (el, text) => { el.textContent = text; fitWidth(el, 0.78); };
    requestAnimationFrame(() => { longest(n1, kcalDay(e.tdee)); longest(n2, `${R.goalPrefix} ${kcalDay(e.kcal)}`); });
  }
  function fitWidth(el, minScale) {
    const base = parseFloat(getComputedStyle(el).fontSize);
    let size = base;
    while (el.scrollWidth > el.clientWidth + 0.5 && size > base * minScale) { size -= 0.5; el.style.fontSize = `${size}px`; }
  }

  // Tela 42
  const menuSeed = 'tribbo-web'; // no app a semente e o id da conta; aqui nao ha conta
  const todayIso = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function goalRow(ic, verb, value, rest) {
    return h('div', { class: 'card goal-row' }, bubble(ic, 38), h('p', { class: 'goal-txt' }, `${verb} `, h('b', null, value), ` ${rest}`));
  }
  function timelineRow({ time, name, kcal, proteinG, items, last }) {
    const F = T.foodSummary.kcalProtein;
    return h('div', { class: 'tl-row' },
      h('div', { class: 'tl-time' }, time),
      h('div', { class: 'tl-rail' }, h('div', { class: 'tl-dot' }), !last && [h('div', { class: 'tl-line' }), (() => { const i = icon('water', 13, C.water); i.classList.add('tl-drop'); return i; })(), h('div', { class: 'tl-line' })]),
      h('div', { class: `tl-body${last ? '' : ' pad'}` },
        h('div', { class: 'tl-name' }, name),
        h('div', { class: 'tl-meta' }, `${Math.round(kcal).toLocaleString('pt-BR')} ${F[0]} ${Math.round(proteinG)} ${F[1]}`),
        items?.length > 0 && h('div', { class: 'tl-items' }, items.map((it) => h('div', null, it.amount ? `${it.name} · ${it.amount}` : it.name)))));
  }
  function platePhoto(kind) {
    const def = T.plates[kind.model][kind.veg ? 'veg' : 'meat'];
    const parts = TF.PLATE_TEXT[kind.model].parts;
    const s = svg('svg', { viewBox: '0 0 100 100' }, def.lines.map(([x1, y1, x2, y2]) => svg('line', { x1, y1, x2, y2, stroke: '#FFFFFF', 'stroke-opacity': 0.85, 'stroke-width': 0.6 })));
    return h('div', { class: 'plate', role: 'img', 'aria-label': 'Prato dividido em legumes e verduras, carboidrato e proteína' },
      h('img', { src: def.src, alt: '' }), s,
      def.labels.map((pos, i) => h('div', { class: 'plate-label', style: pos }, h('b', null, parts[i]), h('span', null, T.foodSummary.plateNames[i]))));
  }
  function FoodSummary() {
    const F = T.foodSummary;
    const edit = (id) => goTo(id, { returnTo: 'food_summary' });
    const t = TF.targetsOf(a);
    const schedule = a.sleepSchedules.find((s) => s.days.includes(1)) ?? a.sleepSchedules[0];
    const meals = TF.mealPlan(t.energy.kcal, t.energy.proteinG, a.mealCount, schedule?.waketime ?? '07:00', schedule?.bedtime ?? '23:00');
    const setup = TF.mealSetupOf(a) ?? 'auto';
    const todayIndex = TF.menuDayOf(todayIso());
    const draft = setup === 'auto' ? TF.suggestedPlanOf(a, menuSeed) : null;
    const days = draft ? TF.weekFolderDays(draft.meals, todayIndex) : null;
    let note = null;
    const diet = TF.optionLabel(TF.DIET_TYPE_OPTIONS, a.dietType);
    const allergies = a.foodRestrictions.filter((c) => c !== 'none').map((c) => TF.optionLabel(TF.FOOD_RESTRICTION_OPTIONS, c).toLowerCase());
    const dislikes = a.foodDislikes.filter((c) => c !== 'none').map((c) => (c === 'other' ? a.foodDislikesNote.trim().toLowerCase() : TF.optionLabel(TF.FOOD_DISLIKE_OPTIONS, c).toLowerCase())).filter(Boolean);
    const places = a.mealLocations.map((c) => F.placeShort[c] ?? c);
    const plate = TF.plateKind(a.goal, a.dietType);
    const rows = adjustAnswers([
      { topic: F.rows.setup, value: TF.optionLabel(TF.MEAL_SETUP_OPTIONS, setup), go: () => edit('nutritionist') },
      { topic: F.rows.meals, value: `${meals.length} ${T.meals.unit}`, go: () => edit('meals') },
      { topic: F.rows.diet, value: diet || T.trainingSummary.unanswered, go: () => edit('diet') },
      { topic: F.rows.allergies, value: allergies.length ? cap(joinPt(allergies)) : F.none, go: () => edit('allergies') },
      { topic: F.rows.dislikes, value: dislikes.length ? cap(joinPt(dislikes)) : F.noneM, go: () => edit('dislikes') },
      { topic: F.rows.places, value: places.length ? cap(joinPt(places)) : T.trainingSummary.unanswered, go: () => edit('meal_places') },
      { topic: F.rows.cooking, value: TF.optionLabel(TF.COOKING_TIME_OPTIONS, a.cookingTime) || T.trainingSummary.unanswered, go: () => edit('cooking') },
      { topic: F.rows.budget, value: TF.optionLabel(TF.BUDGET_OPTIONS, a.foodBudget) || T.trainingSummary.unanswered, go: () => edit('budget') },
    ]);
    const draw = () => {
      const open = days && days.find((d) => d.index === todayIndex);
      paint({
        body: [
          setup === 'auto' ? header(F.titleAuto, F.subtitleAuto) : header(F.titleOther),
          h('div', { class: 'goal-rows' },
            goalRow('flame-outline', F.consume[0], `${TF.formatKcal(t.energy.kcal)} ${F.consume[1]}`, F.consume[2]),
            goalRow('water-outline', F.drink[0], `${TF.formatLiters(t.waterMl)} ${F.drink[1]}`, F.drink[2])),
          setup === 'auto' && days && h('div', { class: 'gap18' },
            h('div', { class: 'tabs', role: 'tablist' }, days.map((d) => {
              const active = d.index === todayIndex;
              return h('button', { type: 'button', role: 'tab', class: `tab${active ? ' on' : ''}`, 'aria-selected': active ? 'true' : 'false', 'aria-label': active ? d.title : `${d.title}, bloqueado`, onclick: () => { if (!active) { note = F.lockedNote; draw(); } } }, d.short, !active && icon('lock-closed', 10, C.t3));
            })),
            h('div', { class: 'week-body' }, open.meals.map((m, i) => timelineRow({ time: m.time, name: m.name, kcal: m.kcal, proteinG: m.proteinG, items: m.items, last: i === open.meals.length - 1 }))),
            note && h('p', { class: 'week-note' }, note)),
          setup === 'self' && h('div', { class: 'card gap12' },
            h('p', { class: 'card-title', style: { marginBottom: '14px' } }, F.yourMeals),
            meals.map((m, i) => timelineRow({ time: TF.formatClock(m.atMin), name: m.name, kcal: m.kcal, proteinG: m.proteinG, last: i === meals.length - 1 })),
            caption(F.mealsNote, 'gap12')),
          (setup === 'auto' || setup === 'self') && h('div', { class: 'card gap12 plate-card' },
            h('p', { class: 'card-title', style: { marginBottom: 0 } }, F.plateTitle),
            platePhoto(plate),
            h('p', { class: 'plate-txt' }, TF.PLATE_TEXT[plate.model].text),
            caption(TF.PLATE_TEXT[plate.model].source)),
          setup === 'nutritionist' && h('div', { class: 'card gap12 notice' }, bubble('document-text-outline', 38), h('span', null, F.nutritionist)),
          rows,
        ],
        footer: [primary(F.button, () => next())],
      });
    };
    draw();
  }

  // ─── Telas 43 a 48 (stepViewsPlano.tsx) ─────────────────────────────────────

  function miniRise() {
    return svg('svg', { width: 64, height: 48, viewBox: '0 0 64 48', 'aria-hidden': 'true' },
      svg('defs', null, svg('linearGradient', { id: 'rise', x1: 0, y1: 0, x2: 0, y2: 1 }, svg('stop', { offset: 0, 'stop-color': C.teal, 'stop-opacity': 0.35 }), svg('stop', { offset: 1, 'stop-color': C.teal, 'stop-opacity': 0 }))),
      svg('path', { d: 'M 4 40 L 18 34 L 30 36 L 42 22 L 60 8 L 60 46 L 4 46 Z', fill: 'url(#rise)' }),
      svg('path', { d: 'M 4 40 L 18 34 L 30 36 L 42 22 L 60 8', stroke: C.teal, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
      svg('circle', { cx: 60, cy: 8, r: 4, fill: C.teal }));
  }
  function HowItWorks() {
    const H = T.howItWorks;
    paint({
      body: [
        header(H.title, H.subtitle),
        h('div', null, H.moments.map((m, i) => h('div', { class: 'day-row fade-up', style: { animationDelay: `${150 + i * 260}ms` } },
          h('div', { class: 'day-rail' }, h('div', { class: `day-dot${i === 0 ? ' first' : ''}` }), i < H.moments.length - 1 && h('div', { class: 'day-line' })),
          h('div', { class: `card day-card${i < H.moments.length - 1 ? ' mb' : ''}` },
            h('div', { class: `media${m.image ? ' tall' : ''}${m.reminders ? ' small' : ''}` }, m.image ? h('img', { src: m.image, alt: '' }) : m.gif && TF.gifDe && TF.gifDe(m.gif) ? gifThumb(m.gif, 64) : m.rise ? miniRise() : bubble(m.icon, m.reminders ? 44 : 56)),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { class: 'day-when' }, m.when), h('div', { class: 'feature' }, m.text),
              m.reminders && h('div', { class: 'rem-row' }, H.reminders.map(([ic, label]) => h('div', { class: 'rem-item' }, icon(ic, 18), h('span', null, label))))))))),
      ],
      footer: [primary(H.button, () => next())],
    });
  }
  function Obstacle() {
    const draw = () => {
      // No app, {daily} vem do preco da loja; sem preco, a frase termina no "app" (objectionReply).
      const reply = TF.objectionReply(a.mainObstacle, null);
      paint({
        body: [
          header(T.obstacle.title),
          opts(TF.OBSTACLE_OPTIONS.map((o) => optionCard({ label: o.label, ic: iconOf('obstacle', o.value), selected: a.mainObstacle === o.value, onPress: () => { a.mainObstacle = o.value; draw(); scrollToEnd(); } }))),
          reply && reactionCard(a.mainObstacle, reply, iconOf('obstacleReaction', a.mainObstacle)),
        ],
        footer: [primary('Continuar', () => next(), !a.mainObstacle)],
      });
    };
    draw();
  }
  function Notifications() {
    const N = T.notifications;
    const waterL = TF.formatLiters(TF.targetsOf(a).waterMl);
    paint({
      body: [
        header(a.mainObstacle === 'forget' ? N.titleForget : N.title, N.subtitle),
        h('div', { class: 'push fade-up', style: { animationDelay: '200ms' } },
          h('div', { class: 'push-icon' }, h('img', { src: 'assets/logo-preto.png', alt: '' })),
          h('div', { class: 'push-body' }, h('div', { class: 'push-head' }, h('span', null, N.app), h('span', null, N.now)), h('p', { class: 'push-txt' }, `${N.push[0]} ${waterL} ${N.push[1]}`))),
      ],
      // Na web, nenhum dos botoes pede permissao de notificacao: os dois so seguem.
      footer: [primary(N.activate, () => next()), textLink(N.later, () => next())],
    });
  }

  function Commitment() {
    const M = T.commitment;
    const HOLD_MS = 2500, CIRCLE = 132, SCALES = [1, 1.22, 1.45];
    const name = a.displayName.trim();
    let progress = 0, raf = 0, holding = false, done = false, stage = 0, lastT = 0;
    const ring = h('div', { class: 'hold-ring' });
    const hint = h('p', { class: 'hold-hint', 'aria-live': 'polite' }, M.hint);
    const logo = h('img', { src: 'assets/logo-escuro.png', alt: '', draggable: 'false' });
    const circle = h('div', { class: 'hold-circle', role: 'button', tabindex: '0', 'aria-label': 'Assumir compromisso. Toque e segure por 2 segundos e meio' }, logo);
    const render = () => {
      const s = progress <= 0.02 ? 0 : progress < 0.55 ? 1 : 2;
      if (s !== stage) {
        stage = s;
        if (!done) circle.style.transform = `scale(${SCALES[s]})`;
        hint.textContent = s === 0 ? M.hint : s === 1 ? M.hold : M.almost;
        hint.classList.toggle('big', s > 0);
      }
      ring.style.opacity = 0.25 + progress * 0.5;
      ring.style.transform = `scale(${1 + progress * 0.55})`;
    };
    const complete = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      update({ commitmentSignedAt: new Date().toISOString() });
      logo.remove(); hint.remove();
      circle.style.transition = 'transform 520ms ease-in';
      circle.style.transform = `scale(${(Math.hypot(innerWidth, innerHeight) / CIRCLE) * 1.1})`;
      const fill = h('div', { class: 'done-fill' }, icon('checkmark-circle', 56, C.onAccent), h('p', { 'aria-live': 'polite' }, name ? `${M.done}, ${name}!` : `${M.done}!`));
      document.body.append(fill);
      cleanups.push(() => fill.remove());
      later(() => next(), 1700);
    };
    const tick = (t) => {
      const dt = t - lastT; lastT = t;
      progress = holding ? Math.min(1, progress + dt / HOLD_MS) : Math.max(0, progress - dt / 250);
      render();
      if (holding && progress >= 1) { complete(); return; }
      if (holding || progress > 0) raf = requestAnimationFrame(tick);
    };
    const press = () => { if (done || holding) return; holding = true; cancelAnimationFrame(raf); lastT = performance.now(); raf = requestAnimationFrame(tick); };
    const release = () => { if (done || !holding) return; holding = false; cancelAnimationFrame(raf); lastT = performance.now(); raf = requestAnimationFrame(tick); };
    circle.addEventListener('pointerdown', (e) => { e.preventDefault(); try { circle.setPointerCapture(e.pointerId); } catch (err) { /* sem captura: segue */ } press(); });
    circle.addEventListener('pointerup', release);
    circle.addEventListener('pointercancel', release);
    circle.addEventListener('lostpointercapture', release);
    circle.addEventListener('contextmenu', (e) => e.preventDefault());
    circle.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(); } });
    circle.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') release(); });
    cleanups.push(() => cancelAnimationFrame(raf));
    paint({
      body: [
        header(M.title),
        h('div', { class: 'card' }, h('p', { class: 'body' }, `${M.body[0]}${name ? `, ${name},` : ''} ${M.body[1]}`)),
        h('div', { class: 'hold-area' }, ring, circle, hint),
      ],
    });
  }

  function progressRing(pct) {
    const RING = 176, STROKE = 10;
    const r = (RING - STROKE) / 2;
    const c = 2 * Math.PI * r;
    const fg = svg('circle', { cx: RING / 2, cy: RING / 2, r, stroke: 'url(#build)', 'stroke-width': STROKE, fill: 'none', 'stroke-linecap': 'round', 'stroke-dasharray': `${c} ${c}`, 'stroke-dashoffset': c * (1 - pct / 100), transform: `rotate(-90 ${RING / 2} ${RING / 2})` });
    const label = h('b', null, `${Math.round(pct)}%`);
    const el = h('div', { class: 'ring', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(pct) },
      svg('svg', { width: RING, height: RING },
        svg('defs', null, svg('linearGradient', { id: 'build', x1: 0, y1: 0, x2: 1, y2: 1 }, svg('stop', { offset: 0, 'stop-color': C.tealPale ?? '#F5FCB8' }), svg('stop', { offset: 1, 'stop-color': C.teal }))),
        svg('circle', { cx: RING / 2, cy: RING / 2, r, stroke: 'rgba(14,26,29,0.08)', 'stroke-width': STROKE, fill: 'none' }), fg),
      h('img', { src: 'assets/logo-escuro.png', alt: '' }), label);
    el.set = (p) => { fg.setAttribute('stroke-dashoffset', c * (1 - p / 100)); label.textContent = `${Math.round(p)}%`; el.setAttribute('aria-valuenow', Math.round(p)); };
    return el;
  }
  function Building() {
    const B = T.building;
    const injury = TF.injuryPhrase(a);
    const items = [B.calc, TF.hasSerious(a) ? B.workoutSerious : B.workout, ...(injury ? [`${B.adapt} ${injury}`] : []), B.meals, B.day];
    const TOTAL = 7000;
    const ring = progressRing(0);
    const msg = h('p', { class: 'build-msg', 'aria-live': 'polite' }, items[0]);
    let shown = 0;
    let msg2 = msg;
    const start = performance.now();
    paint({ fill: true, body: [h('div', { class: 'center' }, ring, msg)] });
    let raf = 0;
    const tick = (t) => {
      const e = t - start;
      ring.set(Math.min(1, e / TOTAL) * 100);
      const cur = Math.min(items.length - 1, Math.floor((e / TOTAL) * items.length));
      if (cur !== shown) { shown = cur; const m = h('p', { class: 'build-msg', 'aria-live': 'polite' }, items[cur]); msg2.replaceWith(m); msg2 = m; }
      if (e >= TOTAL) {
        paint({ fill: true, body: [h('div', { class: 'center' }, h('div', { class: 'done-badge' }, icon('checkmark', 44, C.onAccent)), h('h1', { class: 'ready', tabindex: '-1' }, B.ready))] });
        confetti(70, 0);
        later(() => next(), 2600);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    cleanups.push(() => cancelAnimationFrame(raf));
  }

  function bedtimeOf() {
    const s = a.sleepSchedules.find((x) => x.days.includes(1)) ?? a.sleepSchedules[0];
    const [hh, m] = (s?.bedtime ?? '23:00').split(':').map(Number);
    return TF.formatClock(hh * 60 + m);
  }
  // ─── Fim do funil na web (48 e 49B): fala do resultado que a pessoa quer, com o plano real dela ──
  // Meta para os titulos: 'lose' / 'gain' (com meta de peso e data), 'maintain' ou 'health'. kg = quanto falta.
  function metaFim() {
    let kind = projectionKind();
    if (kind === 'maintain' && !(a.weightKg > 0)) kind = 'health'; // sem peso nas respostas: nada de "manter 0 kg"
    if (kind === 'change') kind = a.targetWeightKg < a.weightKg ? 'lose' : 'gain';
    const diff = kind === 'lose' || kind === 'gain' ? Math.abs(a.weightKg - a.targetWeightKg) : 0;
    const nome = (a.displayName || '').trim() || (a.fullName || '').trim().split(/\s+/)[0] || '';
    const date = (kind === 'lose' || kind === 'gain') && a.targetDate ? TF.fromIsoDate(a.targetDate) : null;
    const mes = date ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date) : null;
    return { kind, kg: TF.formatKg(Math.round(diff * 10) / 10), alvo: a.targetWeightKg != null ? TF.formatKg(a.targetWeightKg) : null, nome, mes };
  }
  // "Roberto, seu plano..." ou, sem nome, "Seu plano...".
  const comNome = (txt, nome) => (nome ? txt.replace('{nome}', nome) : txt.replace('{nome}, s', 'S'));
  const tituloMeta = (m, textos) => ({ lose: textos.lose, gain: textos.gain, maintain: textos.keep, health: textos.health })[m.kind].replace('{kg}', m.kg);

  // Cardapio real de hoje (o mesmo motor e a mesma semente que o app usa no primeiro dia): refeicoes e itens.
  // Refeicoes que podem ir no prato da foto (no mesmo dia, o almoco tem preferencia). O selo mostra a refeicao certa
  // ("Almoço · 12h30" ou "Jantar · 19h30"), e o cardapio abaixo traz as outras refeicoes do dia.
  const PRATO_REFEICOES = ['lunch', 'dinner'];
  // A refeicao combina com a foto do prato quando tem a proteina da foto (frango; nos pratos sem carne, grao-de-bico
  // ou tofu), arroz e feijao.
  function combinaComFoto(m, kind) {
    const tem = (re) => m.items.some((it) => re.test(it.name));
    const proteina = kind.veg ? tem(/gr[aã]o-de-bico|tofu/i) : m.items.some((it) => it.group === 'protein' && /frango/i.test(it.name));
    return proteina && tem(/^arroz/i) && tem(/^feij[aã]o/i);
  }
  // Proteinas comuns (as que podem aparecer abertas no plano pronto): frango, patinho, carne moida, file bovino, ovo
  // e peixe. Miudos, musculo, lombo etc. ficam so no app (assustam no primeiro contato).
  const PROTEINA_COMUM = /frango|patinho|carne mo[ií]da|fil[eé] (bovino|mignon)|^ovo|ovos|peixe|til[aá]pia|merluza|pescada|salm[aã]o|atum|sardinha/i;
  const proteinaComum = (m) => m.items.some((it) => it.group === 'protein' && PROTEINA_COMUM.test(it.name));
  // Cardapio de exemplo (o mesmo motor que o app usa). Prato: das refeicoes almoco e jantar dos 7 dias, a partir de
  // hoje, a primeira com proteina comum que combina com a foto (frango, arroz e feijao); senao a primeira com
  // proteina comum; senao a primeira que combina com a foto; senao o almoco de hoje.
  function cardapioDeHoje() {
    if ((TF.mealSetupOf(a) ?? 'auto') !== 'auto') return null;
    const draft = TF.suggestedPlanOf(a, menuSeed);
    const kind = TF.plateKind(a.goal, a.dietType);
    const clock = (m) => TF.formatClock(Number(m.scheduled_time.slice(0, 2)) * 60 + Number(m.scheduled_time.slice(3, 5)));
    const doDia = (di) => {
      const day = draft.week[di];
      const meals = draft.meals.map((m, i) => ({ name: m.name, time: clock(m), code: day[i]?.code, items: day[i]?.items ?? [], kcal: day[i]?.kcal ?? m.total_kcal, proteinG: day[i]?.proteinG ?? 0, carbsG: day[i]?.carbsG ?? 0, fatG: day[i]?.fatG ?? 0 }));
      return { meals };
    };
    const hoje = TF.menuDayOf(todayIso());
    const candidatas = [];
    for (let k = 0; k < 7; k++) {
      const di = (hoje + k) % 7;
      const d = doDia(di);
      for (const m of d.meals) if (PRATO_REFEICOES.includes(m.code)) candidatas.push({ d, m });
    }
    const achou = candidatas.find((c) => proteinaComum(c.m) && combinaComFoto(c.m, kind))
      ?? candidatas.find((c) => proteinaComum(c.m))
      ?? candidatas.find((c) => combinaComFoto(c.m, kind));
    if (achou) return { meals: achou.d.meals, lunch: achou.m, doDia, hoje };
    const d = doDia(hoje);
    return { meals: d.meals, lunch: d.meals.find((m) => m.code === 'lunch') ?? [...d.meals].sort((x, y) => y.kcal - x.kcal)[0], doDia, hoje };
  }

  const gramas = (it) => (it.grams ? `${Math.round(it.grams)} g` : it.amount);
  // Visual do fim do funil (prototipo aprovado): fundo, botao e "Passo n de 2" no topo no lugar da barra.
  // passo 1 = plano pronto (logo e nome), 2 = preco (seta de voltar), 0 = so o visual (contato). Sai ao trocar de tela.
  function modoFim(passo) {
    const b = document.body.classList;
    b.add('fim'); b.toggle('fim-1', passo === 1); b.toggle('fim-2', passo === 2);
    passoEl.textContent = passo ? T.fim.step.replace('{n}', passo) : '';
    cleanups.push(() => { b.remove('fim', 'fim-1', 'fim-2'); passoEl.textContent = ''; });
  }
  const fxCard = (cls, kids) => h('div', { class: `fx-card${cls ? ` ${cls}` : ''}` }, kids);
  const fxCap = (txt) => h('span', { class: 'fx-cap' }, txt);
  // "Um prato do seu plano": a foto do prato do modelo (ilustrativa), os numeros da refeicao real (almoco ou jantar)
  // e os alimentos com as gramas. O plano tem calorias, proteina, carboidrato e gordura (sem fibra).
  function pratoDoPlano(ref) {
    const F = T.fim.food;
    const kind = TF.plateKind(a.goal, a.dietType);
    const def = T.plates[kind.model][kind.veg ? 'veg' : 'meat'];
    const g = (n) => `${Math.round(n || 0)} g`;
    const num = (valor, rot) => h('div', { class: 'fx-num' }, h('b', null, valor), h('span', null, rot));
    return [
      h('div', { class: 'fx-linha' }, fxCap(F.plateTitle), h('span', { class: 'fx-chip' }, ref.name)),
      h('div', { class: 'fx-prato', role: 'img', 'aria-label': `${F.plateTitle}, ${ref.name}. ${F.photoNote}` },
        h('div', { class: 'fx-prato-foto' }, h('img', { src: def.src, alt: '', width: 600, height: 600, decoding: 'async' })),
        h('span', { class: 'fx-ilustra' }, F.photoNote)),
      h('div', { class: 'fx-nums' },
        num(TF.formatKcal(ref.kcal), F.macros.kcal), num(g(ref.proteinG), F.macros.protein),
        num(g(ref.carbsG), F.macros.carbs), num(g(ref.fatG), F.macros.fat)),
      h('ul', { class: 'fx-alimentos' }, ref.items.map((it) => h('li', null, h('span', null, it.name), h('b', null, gramas(it))))),
      h('p', { class: 'fx-troca' }, `🔄 ${F.swap}`),
    ];
  }
  // Cadeado discreto dos cards guardados no app.
  const cadeado = () => svg('svg', { class: 'fx-cadeado', width: 16, height: 16, viewBox: '0 0 24 24', 'aria-hidden': 'true' },
    svg('rect', { x: 5, y: 11, width: 14, height: 10, rx: 2.5, fill: 'currentColor' }),
    svg('path', { d: 'M8 11V8a4 4 0 0 1 8 0v3', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round' }));
  const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  // "Sua semana": dos 7 dias a partir de hoje, abertos so os 3 primeiros que tem almoco ou jantar com proteina comum
  // (mostra essa refeicao); os outros 4 em cards desfocados com cadeado (o cardapio real, guardado no app).
  function semanaDoPlano(menu) {
    const F = T.fim.food;
    const resumo = (ref) => {
      const nomes = ref.items.filter((it) => ['carb', 'legume', 'bread', 'protein'].includes(it.group)).slice(0, 3).map((it) => it.name);
      return joinPt(nomes.map((n, i) => (i ? n.toLowerCase() : n)));
    };
    const dias = [0, 1, 2, 3, 4, 5, 6].map((k) => {
      const di = (menu.hoje + k) % 7;
      const { meals } = menu.doDia(di);
      const lunch = meals.find((x) => x.code === 'lunch'), dinner = meals.find((x) => x.code === 'dinner');
      const comum = [lunch, dinner].find((x) => x && proteinaComum(x));
      const ref = comum ?? lunch ?? [...meals].sort((x, y) => y.kcal - x.kcal)[0];
      return { dia: DIAS_SEMANA[di], txt: resumo(ref), comum: !!comum };
    });
    const abertos = dias.filter((x) => x.comum).slice(0, 3);
    const fechados = dias.filter((x) => !abertos.includes(x)).slice(0, 4);
    return [
      fxCap(F.weekTitle),
      abertos.map((x) => h('div', { class: 'fx-dia' }, h('span', null, x.dia), h('span', null, x.txt))),
      h('div', { class: 'fx-guardados', role: 'img', 'aria-label': F.weekLocked.replace('{n}', fechados.length) },
        fechados.map((x) => h('div', { class: 'fx-guardado', 'aria-hidden': 'true' },
          h('div', { class: 'fx-guardado-top' }, h('b', null, x.dia), cadeado()),
          h('span', { class: 'fx-borrado' }, x.txt)))),
    ];
  }
  // Dias de treino na semana (o app sugere estes; a pessoa muda no app).
  const DIAS_TREINO = { 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };

  // ─── Tela 48: plano pronto (prototipo Main): previsao, alimentacao (metas, um prato do plano, semana) e treino ──
  function PlanSummary() {
    const S = T.summary, F = T.fim;
    medir('web_quiz_plan_ready_viewed');
    modoFim(1);
    const t = TF.targetsOf(a);
    const e = t.energy;
    const m = metaFim();
    const serious = TF.hasSerious(a);
    const noAiPlan = !(a.planSetupChoice === 'ai' && !serious); // wantsGeneratedPlan (workoutGeneration.ts)
    const edit = (id, chain) => goTo(id, { returnTo: 'plan_summary', chain });
    const preview = noAiPlan ? null : TF.localPreview(a);
    const weight = a.weightKg ?? 0;
    const change = TF.hasWeightChange(a);
    const goalValue = change && a.targetWeightKg != null && a.targetDate
      ? `${S.goalReach[0]} ${TF.formatKg(a.targetWeightKg)} ${S.goalReach[1]} ${TF.formatDateLong(TF.fromIsoDate(a.targetDate), new Date())}`
      : a.goal === 'improve_health' && !t.noDeficit ? S.goalHealth : `${S.goalKeep[0]} ${TF.formatKg(weight)} ${S.goalKeep[1]}`;
    const focus = a.muscleFocus.filter((f) => f !== 'none');
    const focusLabel = focus.length === 0 ? S.wholeBody : joinPt(focus.map((f) => TF.optionLabel(TF.FOCUS_OPTIONS, f) || f));
    const minutes = preview?.session.minutes ?? a.workoutDuration ?? 45;
    const sleepGoal = String(a.sleepGoalHours).replace('.', ',');
    const desire = a.mainMotivation === 'clothes' && a.goal === 'lose_weight' ? F.desire.clothesLose : F.desire[a.mainMotivation] || null;
    const menu = cardapioDeHoje();
    const setup = TF.mealSetupOf(a) ?? 'auto';
    const up = (d, el) => { el.classList.add('fade-up'); el.style.animationDelay = `${d}ms`; return el; };

    // Previsao: o grafico do onboarding do app (linha branca, area amarela, balao da meta), em card escuro.
    // So com meta de peso e data. Mesmos pontos da tela de previsao do quiz (TF.projectionPoints).
    let previsao = null;
    if ((m.kind === 'lose' || m.kind === 'gain') && m.mes && m.alvo) {
      const P = F.forecast;
      const target = a.targetWeightKg;
      const data = TF.fromIsoDate(a.targetDate);
      const points = TF.projectionPoints(weight, target, 12).map((p) => p.kg);
      previsao = up(60, fxCard('fx-escuro fx-graf fx-gap12', [
        h('span', { class: 'fx-cap' }, P.title),
        lineChart({
          series: [{ values: points, color: '#FFFFFF', fill: true, fillColor: '#E2F408' }], yDomain: weightDomain(weight, target), haloAt: [0, 4, 8, points.length - 1],
          startLabel: `${TF.formatKg(weight)} kg`, endBalloon: `${TF.formatKg(target)} kg`,
          label: `${P.now} ${TF.formatKg(weight)} kg, ${m.alvo} kg ${P.reachB} ${m.mes}`,
        }),
        chartEnds(P.now, TF.formatDateLong(data, new Date())),
        h('p', { class: 'fx-txt15' }, `${P.reachA} `, h('b', null, `${m.alvo} kg ${P.reachB} ${m.mes}`), '.'),
        h('span', { class: 'fx-pequeno' }, P.estimate),
      ]));
    }

    const FD = F.food;
    const stat = (emo, valor, sub) => h('div', { class: 'fx-stat' }, h('div', { class: 'fx-emo' }, emo), h('b', null, valor), h('span', null, sub));
    const alimentacao = up(140, fxCard('fx-gap16', [
      h('h2', { class: 'fx-h2' }, `${FD.emoji} ${FD.title}`),
      // Metas do dia (TF.targetsOf, o mesmo calculo do app em nutritionCalc.ts): calorias em cima; proteina, carboidrato
      // e gordura numa linha; agua e refeicoes embaixo.
      h('div', { class: 'fx-stats' },
        h('div', { class: 'fx-stat fx-stat-largo' }, h('div', { class: 'fx-emo' }, '🔥'), h('b', null, `${TF.formatKcal(e.kcal)} kcal`), h('span', null, FD.stats.kcal)),
        h('div', { class: 'fx-stats3' },
          stat('🥩', `${Math.round(e.proteinG)} g`, FD.stats.protein),
          stat('🍚', `${Math.round(e.carbsG)} g`, FD.stats.carbs),
          stat('🥑', `${Math.round(e.fatG)} g`, FD.stats.fat)),
        stat('💧', `${TF.formatLiters(t.waterMl)} L`, FD.stats.water),
        stat('🍽️', `${a.mealCount ?? 3} ${FD.stats.meals}`, FD.stats.mealsSub)),
      menu && h('div', { class: 'fx-secao' }, pratoDoPlano(menu.lunch)),
      menu && h('div', { class: 'fx-secao fx-gap8' }, semanaDoPlano(menu)),
      !menu && h('p', { class: 'fx-secao fx-txt14' }, setup === 'nutritionist' ? FD.nutritionist : FD.self),
    ]));

    const FT = F.training;
    let treino;
    if (noAiPlan) {
      treino = up(220, fxCard('fx-gap14', [h('h2', { class: 'fx-h2' }, `${FT.emoji} ${FT.title}`), h('p', { class: 'fx-txt14' }, FT.own)]));
    } else {
      const dias = Math.min(7, Math.max(1, a.workoutDays ?? 3));
      const marcados = DIAS_TREINO[dias];
      const mostra = dias <= 5 ? 5 : dias;
      // Gasto estimado: a conta do app (utils/workoutKcal.ts, estimatedKcal): MET x peso x minutos / 60, de 10 em 10,
      // sem peso 70 kg. MET 5: o padrao do app quando o exercicio nao tem MET (o site nao tem o MET de cada um).
      const kg = a.weightKg > 0 ? a.weightKg : 70;
      const kcalTreino = Math.round((5 * kg * (minutes / 60)) / 10) * 10;
      // Outros treinos da semana (B, C...): nome real; os exercicios ficam guardados no app (barras desfocadas).
      const outros = [];
      for (const s of preview.week) if (s.letter && s.letter !== preview.session.letter && !outros.some((o) => o.letter === s.letter)) outros.push(s);
      const ex = preview.exercises.slice(0, 3);
      treino = up(220, fxCard('fx-gap14', [
        h('h2', { class: 'fx-h2' }, `${FT.emoji} ${FT.title}`),
        h('div', { class: 'fx-dias' }, DIAS_SEMANA.slice(0, mostra).map((d, i) => h('span', { class: marcados.includes(i) ? 'on' : null }, d))),
        h('div', { class: 'fx-txt15' }, h('b', null, `${FT.name} ${preview.session.letter}`), ` · ${preview.session.label}`),
        h('p', { class: 'fx-txt14 fx-gasto' }, `${minutes} min · ${FT.kcal.replace('{kcal}', TF.formatKcal(kcalTreino))}`),
        h('div', { class: 'fx-exs' }, ex.map((x) => {
          const src = TF.gifDe && TF.gifDe(x.name);
          return h('div', { class: 'fx-ex' },
            h('div', { class: 'fx-gif' }, src ? h('img', { src, alt: '', loading: 'lazy', decoding: 'async', width: 120, height: 120 }) : icon('barbell-outline', 28, '#6B6F76')),
            h('span', null, `${x.name} · ${x.sets}×${x.reps}`));
        })),
        outros.length > 0 && h('div', { class: 'fx-guardados' }, outros.map((o) => h('div', { class: 'fx-guardado', 'aria-label': `${FT.name} ${o.letter} · ${o.label}. ${FT.locked}` },
          h('div', { class: 'fx-guardado-top' }, h('b', null, `${FT.name} ${o.letter} · ${o.label}`), cadeado()),
          h('div', { class: 'fx-barras', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'))))),
      ]));
    }

    const ajustar = adjustAnswers([
      { topic: S.goalRow, value: goalValue, go: () => edit('goal', ['target_weight', 'pace']) },
      { topic: S.rows.weight, value: `${TF.formatKg(weight)} kg`, go: () => edit('weight') },
      ...(serious ? [] : [
        { topic: S.rows.days, value: `${a.workoutDays ?? 3} dias`, go: () => edit('days') },
        { topic: S.rows.duration, value: `${a.workoutDuration ?? 45} min`, go: () => edit('duration') },
        { topic: S.rows.focus, value: focusLabel, go: () => edit('focus') },
      ]),
      { topic: S.rows.meals, value: `${a.mealCount ?? 3} ${T.meals.unit}`, go: () => edit('meals') },
      ...(a.supplementsUsage ? [{ topic: S.rows.supplements, value: T.supplements.short[a.supplementsUsage], go: () => edit('supplements') }] : []),
      { topic: S.rows.sleep, value: `${sleepGoal} h, ${S.sleepLabel[0].replace('de sono, ', '')} ${bedtimeOf()}`, go: () => edit('sleep') },
    ]);
    ajustar.className = 'fx-link';
    ajustar.replaceChildren(F.adjust);

    paint({
      body: [
        h('div', { class: 'fx-topo' },
          h('span', { class: 'fx-selo' }, F.badge),
          h('h1', { class: 'fx-h1', tabindex: '-1' }, comNome(tituloMeta(m, F.title), m.nome)),
          desire && h('p', { class: 'fx-sub' }, desire)),
        previsao,
        alimentacao,
        treino,
        ajustar,
      ],
      footer: [primary(F.button, () => next())],
    });
  }

  // ─── Tela 49: jogo do preco (src/onboarding/stepViewsPlano.tsx, ValueStep) ──
  // 3 apps separados entram um por um, o total sobe, e depois o palpite na regua (comeca vazia).
  function Value() {
    const V = T.value;
    medir('web_quiz_price_game_viewed');
    const monthlyOf = (y) => Math.round(y / 12); // monthlyOfYearly (src/onboarding/planValue.ts)
    const total = V.apps.reduce((s, x) => s + monthlyOf(x.yearly), 0);
    let guess = a.priceGuess ?? V.ruler.initial;
    let moved = a.priceGuess != null;
    const btn = primary(V.button, () => { if (moved) { medir('web_quiz_price_guess_done', { guess }); next({ priceGuess: guess }); } }, !moved);
    const totalNum = h('span', { class: 'apps-total-num' });
    countUp(totalNum, total, (n) => `R$${Math.round(n)}`, 1100);
    const game = h('div', { class: 'game' });
    paint({
      body: [
        header(V.title),
        h('div', { class: 'card apps-card' },
          h('div', { class: 'apps-row' }, V.apps.map((x, i) => h('div', { class: 'app-col fade-up', style: { animationDelay: `${200 + i * 300}ms` } },
            h('span', { class: 'app-tile', style: { background: x.color } }, icon(x.icon, 26, '#FFFFFF')),
            h('span', { class: 'app-name' }, x.name),
            h('span', { class: 'app-price' }, `R$${monthlyOf(x.yearly)}${V.perMonth}`)))),
          h('p', { class: 'apps-total late', style: { animationDelay: '1000ms' } }, `${V.totalA} `, totalNum, ` ${V.totalB}`),
          h('p', { class: 'apps-caption' }, V.caption)),
        game,
      ],
      footer: [btn],
    });
    later(() => {
      const unitOf = (v) => (v >= V.ruler.max ? `${V.maxSuffix} ${V.unit}` : V.unit);
      const rl = ruler({
        min: V.ruler.min, max: V.ruler.max, step: V.ruler.step, majorEvery: 4, value: guess, unit: V.unit, label: V.rulerLabel,
        onChange: (v) => { guess = v; moved = true; btn.disabled = false; num.classList.remove('empty'); unitEl.textContent = unitOf(v); },
      });
      const num = rl.querySelector('.ruler-num');
      const unitEl = rl.querySelector('.ruler-unit');
      num.before(h('span', { class: 'ruler-unit pre' }, 'R$'));
      if (!moved) { num.textContent = '?'; num.classList.add('empty'); } else unitEl.textContent = unitOf(guess);
      game.append(h('div', { class: 'fade-up' },
        h('div', { class: 'tribbo-head' }, h('img', { class: 'tribbo-tile', src: '/plano/assets/icones/icone-192.png', alt: '', width: 52, height: 52 }), h('p', { class: 'game-q' }, V.question)),
        rl));
    }, REDUCED ? 0 : V.stepMs);
  }

  // Prazo do cupom em pt-BR, no horario de Brasilia: "hoje, 23h59", "amanha, 23h59", "sexta, 23h59" ou "23/11, 23h59".
  function prazoCupom(iso) {
    const d = new Date(iso);
    if (!iso || isNaN(d)) return null;
    const tz = { timeZone: 'America/Sao_Paulo' };
    const dia = (x) => new Intl.DateTimeFormat('en-CA', { ...tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(x);
    const dif = Math.round((Date.parse(dia(d)) - Date.parse(dia(new Date()))) / 86400000);
    const p = Object.fromEntries(new Intl.DateTimeFormat('pt-BR', { ...tz, weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(d).map((x) => [x.type, x.value]));
    const hora = `${p.hour}h${p.minute === '00' ? '' : p.minute}`;
    const quando = dif === 0 ? 'hoje' : dif === 1 ? 'amanhã' : dif > 1 && dif < 7 ? p.weekday.split('-')[0] : `${p.day}/${p.month}`;
    return `${quando}, ${hora}`;
  }


  // Celular com o video do topo do site (/plano/): mudo, em loop, sem controles. A capa fica por baixo
  // (sem video, com "reduzir movimento" ou enquanto carrega). O video para ao sair da tela.
  function celularApp() {
    const base = '/plano/assets/midia/topo';
    const tela = h('div', { class: 'cel-tela' }, h('img', { src: `${base}-capa.webp`, alt: '', width: 540, height: 1170, fetchpriority: 'high' }));
    if (!REDUCED) {
      const v = document.createElement('video');
      v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true; v.autoplay = true; v.preload = 'auto';
      for (const at of ['muted', 'playsinline', 'autoplay', 'loop']) v.setAttribute(at, '');
      v.setAttribute('aria-hidden', 'true');
      for (const [ext, type] of [['webm', 'video/webm'], ['mp4', 'video/mp4']]) { const s = document.createElement('source'); s.src = `${base}.${ext}`; s.type = type; v.append(s); }
      v.addEventListener('playing', () => v.classList.add('on'));
      tela.append(v);
      const p = v.play(); if (p && p.catch) p.catch(() => {});
      cleanups.push(() => { try { v.pause(); v.removeAttribute('src'); } catch (e) { /* nada */ } });
    }
    return h('div', { class: 'fx-cel', role: 'img', 'aria-label': T.fim.price.phoneAlt }, tela);
  }
  // Valor em reais de um texto como "R$ 14,99" (preco do cupom vindo do servidor), ou null.
  const reaisDe = (s) => { const x = /(\d+)[,.](\d{2})/.exec(String(s || '')); return x ? Number(`${x[1]}.${x[2]}`) : null; };
  // "Feito pro que voce contou": ate 3 linhas com as respostas da pessoa (ja tentou, maior dificuldade, motivo + meta).
  function feitoPraVoce(m, oferta, porDia, min) {
    const X = T.fim.price.told;
    const linhas = [];
    if (a.triedBefore === 'many' || a.triedBefore === 'once_twice') linhas.push(X.tried.again);
    else if (a.triedBefore === 'first') linhas.push(X.tried.first);
    const ob = a.mainObstacle === 'quit_before' ? 'motivation' : a.mainObstacle === 'money' && oferta ? 'moneyOffer' : a.mainObstacle;
    if (X.obstacle[ob]) linhas.push(X.obstacle[ob].map((s) => s.replace('{dia}', porDia).replace('{oferta}', oferta || '').replace('{min}', String(min))));
    const mot = X.motivation[a.mainMotivation];
    if (mot) linhas.push([mot, m.mes && m.alvo && (m.kind === 'lose' || m.kind === 'gain') ? X.goal.replace('{kg}', m.alvo).replace('{mes}', m.mes) : X.noGoal]);
    return linhas;
  }

  // ─── Tela 49B, so na web: o preco (prototipos Preco e PrecoOferta). Um destaque por tela, Anual sempre em cima.
  // Sem oferta: Anual pre-selecionado com "Economize". Com oferta (so a confirmada pelo servidor no link curto,
  // lead.cupom): faixa com o prazo e o Mensal pre-selecionado com o 1o mes em destaque. Valores de preco.js (TF.PRECO).
  function PriceReveal() {
    const F = T.fim, X = F.price, R = T.priceReveal, P = TF.PRECO;
    const oferta = !!(TF.PAGAMENTO_ATIVO && lead && lead.cupom && lead.cupom.preco);
    medir('web_quiz_price_revealed', { offer: oferta });
    modoFim(2);
    const brl = (n) => `R$ ${n.toFixed(2).replace('.', ',')}`;
    const m = metaFim();
    const escolhe = !!TF.PAGAMENTO_ATIVO;
    const min = a.workoutDuration ?? 45;
    const precoOferta = oferta ? lead.cupom.preco : null;
    const valorOferta = oferta ? reaisDe(precoOferta) : null;
    const pctOferta = valorOferta ? Math.floor((1 - valorOferta / P.mensal) * 100) : null;
    const pctAnual = Math.floor((1 - P.anualPorMes / P.mensal) * 100);
    // Menos de R$ 0,70 por dia: o anual dividido por 365, arredondado para cima nos 10 centavos.
    const porDia = brl(Math.ceil((P.anual / 365) * 10) / 10);
    planoWeb = oferta ? 'mensal' : 'anual';

    // Faixa do topo, so com a oferta confirmada pelo servidor: "Oferta especial pra voce" em destaque e o prazo embaixo.
    if (oferta) {
      const prazo = prazoCupom(lead.cupom.ate);
      const faixa = h('div', { class: 'fx-faixa', role: 'note' },
        h('b', null, X.offerTitle),
        prazo && h('span', null, X.offerUntil.replace('{prazo}', prazo)));
      topEl.before(faixa);
      cleanups.push(() => faixa.remove());
    }

    // Escolha de plano (Anual em cima): aparece logo depois do titulo e de novo no fim, completa e com o botao.
    // As duas ficam sincronizadas: marcar em uma marca na outra (planoWeb e um so).
    const comprar = () => (escolhe ? irParaCakto() : next());
    const escolhas = [];
    function escolha() {
      const plano = (key, badge, titulo, sub, preco) => h(escolhe ? 'button' : 'div', {
        type: escolhe ? 'button' : null, role: escolhe ? 'radio' : null, class: 'fx-plano', 'data-plano': key,
        onclick: escolhe ? () => { if (planoWeb !== key) { planoWeb = key; medir('web_quiz_plan_selected', { plan: key }); atualiza(); } } : null,
      }, badge, escolhe && h('span', { class: 'fx-radio' }), h('span', { class: 'fx-plano-txt' }, h('b', null, titulo), h('span', null, sub)), h('span', { class: 'fx-plano-preco' }, preco));
      const cartoes = [
        plano('anual', !oferta && h('span', { class: 'fx-selo-eco' }, X.save.replace('{pct}', pctAnual)),
          X.annual, `${brl(P.anual)} ${X.perYear}`, [h('b', null, brl(P.anualPorMes)), h('span', null, X.perMonth)]),
        oferta
          ? plano('mensal', h('span', { class: 'fx-selo-off' }, pctOferta ? X.offerTag.replace('{pct}', pctOferta) : X.firstMonth),
            X.monthly, `${X.then} ${brl(P.mensal)}${X.perMonthShort}`,
            [h('s', null, brl(P.mensal)), h('b', { class: 'fx-grande' }, precoOferta), h('span', { class: 'fx-roxo-forte' }, X.firstMonth)])
          : plano('mensal', null, X.monthly, X.noCommitment, [h('b', null, brl(P.mensal)), h('span', null, X.perMonth)]),
      ];
      const btn = primary(F.buttonPay, comprar);
      const hoje = h('p', { class: 'fx-hoje' });
      const e = { cartoes, btn, hoje, el: [h('div', { class: 'fx-planos', role: escolhe ? 'radiogroup' : null, 'aria-label': X.choose }, cartoes), h('div', { class: 'fx-cta' }, btn, hoje)] };
      escolhas.push(e);
      return e.el;
    }
    function atualiza() {
      const ofertaNoMensal = oferta && planoWeb === 'mensal';
      const rotulo = !escolhe ? R.button : ofertaNoMensal ? X.buttonOffer.replace('{preco}', precoOferta) : F.buttonPay;
      const linha = !escolhe ? '' : planoWeb === 'anual' ? X.todayAnnual.replace('{anual}', brl(P.anual))
        : ofertaNoMensal ? X.todayOffer.replace('{oferta}', precoOferta).replace('{mensal}', brl(P.mensal))
          : X.todayMonthly.replace('{mensal}', brl(P.mensal));
      for (const e of escolhas) {
        for (const c of e.cartoes) {
          const sel = escolhe && c.dataset.plano === planoWeb;
          c.classList.toggle('sel', sel);
          if (escolhe) c.setAttribute('aria-checked', sel ? 'true' : 'false');
        }
        e.btn.textContent = rotulo;
        e.hoje.textContent = linha;
      }
    }
    const escolhaTopo = escolha();
    const escolhaFim = escolha();
    atualiza();

    const linhas = feitoPraVoce(m, precoOferta, porDia, min);
    const faq = h('div', { class: 'fx-card fx-faq' }, X.faq.map(([q, r], i) => {
      const resp = h('p', { class: 'fx-faq-r', id: `faq-${i}` }, r);
      const sinal = h('span', { 'aria-hidden': 'true' }, i === 0 ? '−' : '+');
      resp.hidden = i !== 0;
      const btn = h('button', { type: 'button', class: 'fx-faq-q', 'aria-expanded': i === 0 ? 'true' : 'false', 'aria-controls': `faq-${i}`,
        onclick: () => { const abre = resp.hidden; resp.hidden = !abre; sinal.textContent = abre ? '−' : '+'; btn.setAttribute('aria-expanded', abre ? 'true' : 'false'); } }, h('span', null, q), sinal);
      return h('div', { class: 'fx-faq-item' }, btn, resp);
    }));

    paint({
      body: [
        h('div', { class: 'fx-hero' }, celularApp(),
          h('div', { class: 'fx-hero-txt' }, h('h1', { class: 'fx-h1 fx-h1-preco', tabindex: '-1' }, tituloMeta(m, X.title)), h('p', null, X.subtitle))),
        escolhaTopo,
        h('div', { class: 'fx-card fx-gap14 fx-mt24' }, h('h2', { class: 'fx-h2b' }, X.get.title),
          X.get.items.map(([emo, t1, t2]) => h('div', { class: 'fx-item' }, h('span', { class: 'fx-item-emo', 'aria-hidden': 'true' }, emo), h('div', null, h('b', null, t1), h('span', null, t2))))),
        h('div', { class: 'fx-card fx-gap12' }, h('h2', { class: 'fx-h2b' }, X.never.title),
          X.never.items.map((t1) => h('div', { class: 'fx-nunca' }, h('span', { 'aria-hidden': 'true' }, '✕'), t1))),
        linhas.length > 0 && h('div', { class: 'fx-card fx-escuro fx-feito fx-gap14' }, h('h2', { class: 'fx-h2b' }, X.told.title),
          linhas.map(([t1, t2]) => h('div', null, h('b', null, t1), h('span', null, t2)))),
        h('div', { class: 'fx-card fx-garantia' }, h('span', { class: 'fx-garantia-emo', 'aria-hidden': 'true' }, X.guarantee.emoji),
          h('div', null, h('b', null, X.guarantee.title), h('span', null, X.guarantee.txt))),
        faq,
        h('div', { class: 'fx-fim' }, escolhaFim, h('p', { class: 'fx-prova' }, X.proof)),
      ],
      footer: [],
    });
    const v = scrollEl.querySelector('.fx-cel video');
    if (v && v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
  }

  // ─── So na web: cadastro (tela 48L) e ida para a Cakto ─────────────────────
  // E-mail valido: sem espacos, um @, parte antes do @ sem ponto no inicio ou no fim e sem dois pontos seguidos,
  // dominio com pelo menos um ponto e terminacao so de letras (.com, .com.br, .io). Qualquer dominio real passa.
  function emailValido(e) {
    if (!e || e.length > 254 || /\s/.test(e)) return false;
    const m = /^([^@]{1,64})@([^@]{1,253})$/.exec(e);
    if (!m) return false;
    const [, local, dom] = m;
    if (!/^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/i.test(local) || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
    const partes = dom.split('.');
    if (partes.length < 2) return false;
    if (!partes.every((x) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(x))) return false;
    return /^[a-z]{2,24}$/i.test(partes[partes.length - 1]);
  }
  const DOMINIOS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.com.br', 'icloud.com', 'live.com', 'msn.com', 'me.com',
    'hotmail.com.br', 'outlook.com.br', 'uol.com.br', 'bol.com.br', 'terra.com.br', 'ig.com.br', 'globo.com', 'globomail.com'];
  // Erros que a distancia de letras nao pega bem (dominio de outro pais que nao existe para esses provedores).
  const DOMINIO_FIXO = { 'gmail.com.br': 'gmail.com', 'gmail.br': 'gmail.com', 'icloud.com.br': 'icloud.com', 'yahoo.br': 'yahoo.com.br' };
  // Terminacao errada em qualquer dominio: empresa.con → empresa.com. (.co fica: e terminacao real.)
  const FIM_ERRADO = { con: 'com', cmo: 'com', ocm: 'com', vom: 'com', xom: 'com', comm: 'com', coom: 'com', cpm: 'com', cim: 'com' };
  function distancia(x, y) {
    const d = Array.from({ length: x.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= y.length; j++) d[0][j] = j;
    for (let i = 1; i <= x.length; i++) for (let j = 1; j <= y.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && x[i - 1] === y[j - 2] && x[i - 2] === y[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[x.length][y.length];
  }
  // gmail.con → gmail.com, hotmial.com → hotmail.com. Sem sugestao quando o dominio ja e conhecido ou esta longe de todos.
  function sugestaoEmail(email) {
    const m = /^([^\s@]+)@([^\s@]+)$/.exec(email.trim().toLowerCase());
    if (!m) return null;
    let dom = m[2].replace(/^\.+|\.+$/g, '').replace(/\.{2,}/g, '.');
    if (DOMINIOS.includes(dom)) return dom === m[2] ? null : `${m[1]}@${dom}`;
    if (DOMINIO_FIXO[dom]) return `${m[1]}@${DOMINIO_FIXO[dom]}`;
    // Ate 2 letras de diferenca so em dominios longos; nos curtos (b.com, me.com) so 1, para nao sugerir errado.
    const limite = dom.length >= 8 ? 2 : 1;
    let melhor = null, menor = limite + 1;
    for (const d of DOMINIOS) { const n = distancia(dom, d); if (n < menor) { menor = n; melhor = d; } }
    if (!melhor && !dom.includes('.')) melhor = DOMINIOS.find((d) => d.split('.')[0] === dom) || null;
    if (!melhor) {
      // Terminacao errada num dominio qualquer (minhaempresa.con). Se o resto for um provedor conhecido com erro, ja sugere ele.
      const pts = dom.split('.'), fim = FIM_ERRADO[pts[pts.length - 1]];
      if (fim && pts.length > 1) { pts[pts.length - 1] = fim; const novo = pts.join('.'); melhor = sugestaoEmail(`${m[1]}@${novo}`)?.split('@')[1] || novo; }
    }
    return melhor ? `${m[1]}@${melhor}` : null;
  }
  const soDigitos = (v) => String(v || '').replace(/\D/g, '');
  function mascaraWhats(v) {
    const d = soDigitos(v).replace(/^55(?=\d{10,11}$)/, '').slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : '';
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  // Lead ja enviado nesta pagina (ou recuperado pelo link ?retomar=). So na memoria.
  // { id, token, name, email, whatsapp }
  let lead = null;
  const utmDoQuiz = () => {
    const utm = {};
    for (const [k, val] of Object.entries(TF.utm || {})) if (/^utm_[a-z]+$/.test(k) || k === 'fbclid') utm[k] = String(val).slice(0, 500);
    return utm;
  };
  // Cookie _fbp da Meta (criado pelo pixel na pagina inicial ou na /plano/), so com o aceite de cookies
  // ('tribbo_consent' = 'accepted', a mesma chave do consent.js). Sem aceite, nao manda nada.
  const fbpComAceite = () => {
    try {
      if (localStorage.getItem('tribbo_consent') !== 'accepted') return null;
      const m = document.cookie.match(/(?:^|;\s*)_fbp=([^;]+)/);
      return m && /^fb\.\d\.\d+\.\d+$/.test(m[1]) ? m[1] : null;
    } catch (e) { return null; }
  };
  // Checkout da Cakto ja preenchido. callback = lead_id.assinatura (so letras, numeros, - e .; 69 caracteres).
  // Cupom (so do link curto, validado pelo servidor): vai so no Mensal, em &coupon=.
  function irParaCakto() {
    const F = window.TF_FUNIL;
    if (!lead) { goTo('lead_form'); return; }
    const plano = F.cakto[planoWeb] ? planoWeb : 'anual';
    const cupom = plano === 'mensal' && lead.cupom ? lead.cupom.codigo : null;
    medir('web_quiz_checkout_started', { plan: plano, offer: !!cupom });
    const callback = lead.id ? (lead.token ? `${lead.id}.${lead.token}` : lead.id) : null;
    // Registra a ida a Cakto no lead (web-lead-checkout), sem esperar a resposta. sendBeacon primeiro: o navegador
    // entrega o pedido mesmo depois de trocar de pagina (no Safari do iPhone, o fetch logo antes de sair pode se perder).
    // Sem sendBeacon ou se ele recusar: fetch com keepalive. Corpo em text/plain (sem consulta previa de CORS).
    // Falha aqui nunca trava a compra.
    if (lead.id && lead.token && F.leadCheckout) {
      const corpo = JSON.stringify({ callback, plan: plano, coupon: cupom });
      let foi = false;
      try { if (navigator.sendBeacon) foi = navigator.sendBeacon(F.leadCheckout, corpo); } catch (e) { foi = false; }
      if (!foi) {
        try {
          fetch(F.leadCheckout, { method: 'POST', keepalive: true, credentials: 'omit', headers: { 'Content-Type': 'text/plain' }, body: corpo }).catch(() => {});
        } catch (e) { /* segue para a Cakto */ }
      }
    }
    const q = new URLSearchParams({ name: lead.name, email: lead.email, confirmEmail: lead.email, phone: lead.whatsapp });
    // Sem lead gravado (servidor fora ou limite de IP), vai sem callback: o webhook cria a conta pelo e-mail.
    if (callback) q.set('callback', callback);
    for (const [k, val] of Object.entries(utmDoQuiz())) q.set(k, val);
    if (cupom) q.set('coupon', cupom);
    // Voltar da Cakto: se o navegador recarregar o quiz, ele abre direto na revelacao do preco (web-lead-resume).
    // So troca o endereco da pagina atual; nada fica guardado no navegador. Sem lead, fica como esta.
    // Link curto: volta pelo proprio token curto (e o cupom da URL, que o servidor confere de novo).
    const sig = lead.id && (lead.resumeSig || lead.token);
    if (lead.curto || sig) {
      try {
        const volta = new URLSearchParams(lead.curto ? { retomar: lead.curto } : { retomar: `${lead.id}.${sig}` });
        if (lead.curto && lead.cupomUrl) volta.set('cupom', lead.cupomUrl);
        for (const [k, val] of Object.entries(utmDoQuiz())) volta.set(k, val);
        history.replaceState(history.state, '', `${location.pathname}?${volta}`);
      } catch (e) { /* sem troca de endereco, segue normal */ }
    }
    location.href = `${F.cakto[plano]}?${q}`;
  }

  // Tela 48L, so na web com TF.PAGAMENTO_ATIVO: logo depois do resultado do plano e antes do jogo do preco.
  // Nome, e-mail (com sugestao de dominio) e WhatsApp, os 2 aceites obrigatorios e a caixa opcional de ofertas.
  // Ao enviar: web-lead (Supabase, js/funil.js) com as respostas, o plano (o anual por padrao; a escolha final
  // vai para a Cakto), as UTMs, o fbclid e os aceites. Sem verificacao visivel: so o campo isca "tf_hp_campo",
  // escondido fora da tela. Se a pessoa voltar e nao mudar nada, segue sem mandar de novo.
  function LeadForm() {
    const L = T.leadForm, F = window.TF_FUNIL;
    modoFim(0);
    const st = { terms: !!a.termsAcceptedAt, health: !!a.healthDataConsentAt, ofertas: !!a.ofertasAceitasEm, enviando: false };
    const erroDe = {};
    const field = (id, label, attrs) => {
      const input = h('input', { class: 'input form', id, 'aria-describedby': `${id}-erro`, ...attrs });
      erroDe[id] = h('p', { class: 'field-erro', id: `${id}-erro`, 'aria-live': 'polite' });
      return { input, el: h('div', null, h('label', { class: 'field-label', for: id }, label), input, erroDe[id]) };
    };
    const nome = field('f-nome', L.name, { type: 'text', autocomplete: 'name', autocapitalize: 'words', enterkeyhint: 'next', maxlength: 120, value: lead ? lead.name : a.fullName });
    const email = field('f-email', L.email, { type: 'email', inputmode: 'email', autocomplete: 'email', autocapitalize: 'none', spellcheck: 'false', enterkeyhint: 'next', maxlength: 254, value: lead ? lead.email : '' });
    const whats = field('f-whats', L.whatsapp, { type: 'tel', inputmode: 'tel', autocomplete: 'tel-national', enterkeyhint: 'done', placeholder: L.whatsappPh, maxlength: 16, value: lead ? mascaraWhats(lead.whatsapp) : '' });
    const dica = h('div', { class: 'email-dica', 'aria-live': 'polite' });
    email.el.append(dica);
    const mostraErro = (f, msg) => { erroDe[f.input.id].textContent = msg || ''; f.input.setAttribute('aria-invalid', msg ? 'true' : 'false'); };

    // So recria o botao quando a sugestao muda: ao tocar nele o campo perde o foco, e recriar ali perderia o toque.
    let dicaAtual = null;
    function atualizaDica() {
      const s = sugestaoEmail(email.input.value);
      if (s === dicaAtual) return;
      dicaAtual = s;
      dica.replaceChildren(...(s ? [h('button', { type: 'button', class: 'dica-btn', onclick: () => { email.input.value = s; mostraErro(email, ''); atualizaDica(); } },
        `${L.suggest} `, h('b', null, s), '?')] : []));
    }
    // Sugestao ja mostrada no envio: no segundo toque segue com o e-mail como esta (nao bloqueia dominio real).
    let sugestaoVista = null;
    email.input.addEventListener('input', () => { mostraErro(email, ''); atualizaDica(); });
    email.input.addEventListener('blur', () => {
      const e = email.input.value.trim().toLowerCase();
      if (e && !emailValido(e)) mostraErro(email, L.errors.email);
      atualizaDica();
    });
    nome.input.addEventListener('input', () => mostraErro(nome, ''));
    whats.input.addEventListener('input', () => {
      const fim = whats.input.selectionStart === whats.input.value.length;
      whats.input.value = mascaraWhats(whats.input.value);
      if (fim) whats.input.setSelectionRange(whats.input.value.length, whats.input.value.length);
      mostraErro(whats, '');
    });
    // Isca para robos: escondida por CSS fora da tela, fora do Tab e sem autocomplete. Gente nao preenche.
    const isca = h('div', { class: 'isca', 'aria-hidden': 'true' },
      h('label', { for: 'tf_hp_campo' }, 'Deixe em branco'),
      h('input', { type: 'text', id: 'tf_hp_campo', name: 'tf_hp_campo', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' }));
    const iscaInput = isca.querySelector('input');

    const btn = h('button', { type: 'button', class: 'btn', disabled: true, onclick: () => enviar() }, L.button);
    const erroGeral = h('p', { class: 'error lead-erro', role: 'alert' });
    // O botao fica sempre ligado: em tela baixa os aceites ficam abaixo da dobra, e um botao apagado sem motivo visivel trava a pessoa.
    // Sem os dois aceites, o toque leva ate eles e mostra o aviso.
    const refresh = () => { btn.disabled = st.enviando; if (st.terms && st.health) erroAceites.textContent = ''; };
    const erroAceites = h('p', { class: 'field-erro', 'aria-live': 'polite' });
    const stop = (e) => e.stopPropagation();
    const check = (key, kids) => {
      const box = h('span', { class: 'cb-box' });
      const row = h('div', {
        class: 'cb lead-cb', role: 'checkbox', tabindex: '0',
        onclick: (e) => { if (e.target.tagName !== 'A') toggle(); },
        onkeydown: (e) => { if ((e.key === ' ' || e.key === 'Enter') && e.target.tagName !== 'A') { e.preventDefault(); toggle(); } },
      }, box, h('div', { class: 'cb-txt' }, kids));
      const draw = () => {
        row.setAttribute('aria-checked', st[key] ? 'true' : 'false');
        box.classList.toggle('on', st[key]);
        box.replaceChildren(...(st[key] ? [icon('checkmark', 14, C.onAccent)] : []));
      };
      function toggle() {
        if (st.enviando) return;
        st[key] = !st[key];
        const now = new Date().toISOString();
        if (key === 'terms') a.termsAcceptedAt = st.terms ? now : null;
        else if (key === 'health') a.healthDataConsentAt = st.health ? now : null;
        else a.ofertasAceitasEm = st.ofertas ? now : null;
        draw(); refresh();
      }
      draw();
      return row;
    };

    function valida() {
      let ok = true;
      const n = nome.input.value.trim().replace(/\s+/g, ' ');
      const e = email.input.value.trim().toLowerCase();
      const w = soDigitos(whats.input.value).replace(/^55(?=\d{10,11}$)/, '');
      if (n.length < 2) { mostraErro(nome, L.errors.name); ok = false; }
      const sug = sugestaoEmail(e);
      if (!emailValido(e)) { mostraErro(email, L.errors.email); atualizaDica(); ok = false; }
      else if (sug && sugestaoVista !== e) { sugestaoVista = e; mostraErro(email, L.errors.email); atualizaDica(); ok = false; }
      if (w.length < 10 || w.length > 11) { mostraErro(whats, L.errors.whatsapp); ok = false; }
      if (!ok) { const f = scrollEl.querySelector('[aria-invalid="true"]'); if (f) f.focus(); return null; }
      return { n, e, w };
    }

    async function enviar() {
      if (st.enviando) return;
      erroGeral.textContent = '';
      const v = valida();
      if (!v) return;
      if (!(st.terms && st.health)) {
        erroAceites.textContent = L.errors.consents;
        erroAceites.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' });
        return;
      }
      // Voltou do preco sem mudar nada: nao cria outro lead.
      if (lead && lead.name === v.n && lead.email === v.e && lead.whatsapp === v.w) { next({ fullName: v.n }); return; }
      st.enviando = true; refresh(); btn.textContent = L.sending;
      const falhou = (msg) => { st.enviando = false; btn.textContent = L.button; refresh(); erroGeral.textContent = msg; };

      // Respostas com as chaves do app; o palpite de preco (se ja houver) vai como priceExpectationValue.
      const respostas = { ...a, fullName: v.n };
      if (a.priceGuess != null) respostas.priceExpectationValue = a.priceGuess;
      for (const k of ['priceGuess', 'termsAcceptedAt', 'healthDataConsentAt', 'educationalConsentAt', 'ofertasAceitasEm']) delete respostas[k];
      const utm = utmDoQuiz();
      const corpo = {
        name: v.n, email: v.e, whatsapp: v.w, plan: planoWeb, answers: respostas, utm, fbclid: utm.fbclid || null, fbp: fbpComAceite(),
        consents: {
          terms_accepted_at: a.termsAcceptedAt, terms_version: F.termosVersao, health_data_consent_at: a.healthDataConsentAt,
          marketing_opt_in: st.ofertas, marketing_opt_in_at: st.ofertas ? a.ofertasAceitasEm : null,
        },
        // Isca: nome que o preenchimento automatico nao reconhece. O web-lead precisa conferir "tf_hp_campo".
        tf_hp_campo: iscaInput.value,
      };
      let res = null, dados = {};
      // Uma nova tentativa automatica se a rede falhar (comum no 4G).
      for (let tentativa = 0; tentativa < 2 && !res; tentativa++) {
        try {
          res = await fetch(F.webLead, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo), credentials: 'omit' });
          dados = await res.json().catch(() => ({}));
        } catch (err) { res = null; if (tentativa === 0) await new Promise((ok) => setTimeout(ok, 1200)); }
      }
      const erro = res && !res.ok ? (dados && dados.error) : null;
      if (erro === 'invalid_email') { falhou(''); mostraErro(email, L.errors.email); email.input.focus(); return; }
      if (erro === 'invalid_whatsapp') { falhou(''); mostraErro(whats, L.errors.whatsapp); whats.input.focus(); return; }
      if (res && res.ok && dados.lead_id) {
        const rt = typeof dados.resume_token === 'string' ? dados.resume_token.split('.').pop() : null;
        lead = { id: dados.lead_id, token: dados.handoff_token || null, resumeSig: rt && /^[0-9a-f]{16,64}$/i.test(rt) ? rt.toLowerCase() : null, name: v.n, email: v.e, whatsapp: v.w };
        medir('web_quiz_lead_sent');
      } else {
        // Servidor fora, limite de IP (muita gente divide o mesmo IP na rede da operadora) ou rede: a pessoa nao fica presa.
        // Segue para o preco e para a Cakto sem o lead; a conta e criada pelo e-mail da compra.
        lead = { id: null, token: null, name: v.n, email: v.e, whatsapp: v.w };
        medir('web_quiz_lead_fallback');
      }
      st.enviando = false;
      update({ fullName: v.n });
      if (!lead.id) { next(); return; } // sem lead gravado, nada de "Seu plano foi salvo"
      // Confirmacao rapida (1,5 s), sem botao: check animado e o primeiro nome; depois segue sozinha para o preco.
      const primeiro = v.n.split(' ')[0];
      paint({ fill: true, body: [h('div', { class: 'center lead-ok' },
        h('div', { class: 'done-badge pop' }, icon('checkmark', 44, C.onAccent)),
        h('h1', { class: 'ready', tabindex: '-1' }, L.saved.replace('{nome}', primeiro)))], footer: [] });
      const t = scrollEl.querySelector('h1'); if (t) t.focus({ preventScroll: true });
      later(() => next(), 1500);
    }

    const [t1, t2, t3, t4] = L.terms;
    refresh();
    paint({
      body: [
        header(L.title, L.subtitle),
        h('div', { class: 'card lead-card form-fields' }, nome.el, email.el, whats.el, isca),
        h('div', { class: 'card lead-checks' },
          check('terms', [`${t1} `, h('a', { href: T.links.terms, target: '_blank', rel: 'noopener noreferrer', onclick: stop }, t2), ` ${t3} `, h('a', { href: T.links.privacy, target: '_blank', rel: 'noopener noreferrer', onclick: stop }, t4), '.']),
          check('health', L.health),
          check('ofertas', L.marketing)),
        erroAceites,
        h('p', { class: 'lead-aviso gap8' }, L.wellbeing),
        caption(L.privacy, 'gap8'),
      ],
      footer: [erroGeral, btn],
    });
  }

  // Link de volta: /quiz/?retomar=<lead_id>.<assinatura> abre direto na revelacao do preco com as respostas
  // daquele lead (funcao web-lead-resume do Supabase). Link invalido, vencido ou sem resposta: quiz do comeco.
  // Contrato: POST { lead_id, token } → 200 { name, email, whatsapp, plan, answers, handoff_token? } | 404/410.
  // Link curto do suporte: ?retomar=<token de 12 letras, sem ponto>[&cupom=<codigo>] → POST { token, cupom? };
  // a resposta traz tambem lead_id, coupon, coupon_price e coupon_until. O cupom da tela vem SO da resposta.
  async function retomar() {
    const F = window.TF_FUNIL;
    const bruto = (URL_PARAMS.get('retomar') || '').trim();
    const curto = !bruto.includes('.') && /^[A-Za-z0-9_-]{12}$/.test(bruto) ? bruto : null;
    const m = curto ? null : /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([0-9a-f]{16,64})$/i.exec(bruto);
    if ((!m && !curto) || !TF.PAGAMENTO_ATIVO || !F) return false;
    const cupomUrl = curto ? (URL_PARAMS.get('cupom') || '').trim().slice(0, 40) || null : null;
    const pedido = curto ? { token: curto, ...(cupomUrl ? { cupom: cupomUrl } : {}) } : { lead_id: m[1].toLowerCase(), token: m[2].toLowerCase() };
    try {
      // O retomar.js (no topo da pagina) ja fez este mesmo pedido enquanto o quiz baixava: usa a resposta dele.
      const cedo = window.TF_RETOMADA && window.TF_RETOMADA.bruto === bruto ? window.TF_RETOMADA.resposta : null;
      let res;
      if (cedo) res = await cedo;
      else {
        const ctl = new AbortController();
        const limite = setTimeout(() => ctl.abort(), 8000);
        res = await fetch(F.leadResume, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pedido), credentials: 'omit', signal: ctl.signal });
        clearTimeout(limite);
      }
      if (!res || !res.ok) return false;
      const d = await res.json();
      if (!d || !d.answers || typeof d.answers !== 'object' || !d.email) return false;
      const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (curto && !(typeof d.lead_id === 'string' && UUID.test(d.lead_id))) return false;
      const base = TF.emptyAnswers();
      for (const k of Object.keys(base)) if (d.answers[k] !== undefined && d.answers[k] !== null) base[k] = d.answers[k];
      if (d.answers.priceExpectationValue != null) base.priceGuess = d.answers.priceExpectationValue;
      a = base;
      if (d.plan === 'mensal' || d.plan === 'anual') planoWeb = d.plan;
      // A assinatura do link do e-mail (resume) nao vale na /obrigado/: usa o handoff_token se o servidor mandar;
      // sem ele, o callback leva so o lead_id (a /obrigado/ entao avisa que o codigo chega por e-mail).
      lead = { id: curto ? d.lead_id.toLowerCase() : m[1].toLowerCase(), resumeSig: curto ? null : m[2].toLowerCase(),
        token: typeof d.handoff_token === 'string' && /^[0-9a-f]{16,64}$/i.test(d.handoff_token) ? d.handoff_token.toLowerCase() : null,
        name: d.name || a.fullName || '', email: d.email, whatsapp: soDigitos(d.whatsapp || ''), curto, cupomUrl };
      // Cupom aceito pelo servidor: abre no Mensal. Sem cupom na resposta (mesmo com cupom na URL): preco normal, sem aviso.
      if (curto && typeof d.coupon === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(d.coupon)) {
        lead.cupom = { codigo: d.coupon, preco: typeof d.coupon_price === 'string' ? d.coupon_price.slice(0, 20) : null, ate: typeof d.coupon_until === 'string' ? d.coupon_until : null };
        planoWeb = 'mensal';
      }
      medir('web_quiz_resumed');
      return true;
    } catch (e) { return false; }
  }

  // ─── So na web, enquanto TF.PAGAMENTO_ATIVO e falso: baixar o app ───────────
  // Os dois botoes aparecem; o da loja do aparelho da pessoa vem primeiro e em destaque.
  function Download() {
    const D = T.download;
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const android = /Android/.test(ua);
    const store = (kind) => {
      const apple = kind === 'apple';
      const mine = apple ? ios : android;
      return h('a', { class: `store-card${mine ? ' mine' : ''}`, href: apple ? D.appStore : D.googlePlay, target: '_blank', rel: 'noopener',
        onclick: () => medir('web_quiz_store_clicked', { store: apple ? 'app_store' : 'google_play' }) },
        mine && h('span', { class: 'tag' }, D.yourPhone),
        h('img', { src: apple ? '/plano/assets/app-store.svg' : '/plano/assets/google-play.webp', alt: apple ? D.appStoreAlt : D.googlePlayAlt, height: 52 }));
    };
    const order = android ? ['google', 'apple'] : ['apple', 'google'];
    paint({
      body: [
        h('div', { class: 'download-top fade-up' }, h('img', { class: 'download-icon', src: '/plano/assets/icones/icone-192.png', alt: '', width: 88, height: 88 })),
        header(D.title, D.subtitle),
        h('div', { class: 'stores' }, order.map(store)),
      ],
      footer: [h('a', { class: 'link-plain', href: SITE, onclick: leaveQuiz }, T.leadForm.backToSite)],
    });
  }

  const VIEWS = {
    welcome: Welcome, name: Name, consents: Consents, goal: Goal, tried_before: TriedBefore, motivation: Motivation, gender: Gender, birth_date: BirthDate,
    height: Height, weight: Weight, target_weight: TargetWeight, pace: Pace, yo_yo: YoYo, projection: Projection, score: Score, reviews: Reviews, acquisition: Acquisition,
    before_after: BeforeAfter, activity: Activity, sleep: Sleep, level: Level, experience: Experience, equipment: Equipment, bodyweight: Bodyweight, days: Days, duration: Duration,
    did_you_know_training: DidYouKnowTraining, cardio: Cardio, pain: Pain, health: Health, focus: Focus, plan_setup: PlanSetup, training_summary: TrainingSummary,
    meals: MealCount, diet: DietType, allergies: Allergies, dislikes: Dislikes, meal_places: MealLocations, cooking: CookingTime, did_you_know_food: DidYouKnowMuscle, kitchen: Kitchen,
    household: Household, budget: Budget, nutritionist: Nutritionist, supplements: Supplements, energy: Energy, energy_reveal: EnergyReveal, food_summary: FoodSummary,
    how_it_works: HowItWorks, obstacle: Obstacle, notifications: Notifications, commitment: Commitment, building: Building, plan_summary: PlanSummary,
    value: Value, price_reveal: PriceReveal, lead_form: LeadForm, download: Download,
  };

  // Com ?retomar= valido, abre direto na revelacao do preco; senao, o quiz do comeco.
  // A tela de carregamento (retomar.js) sai no mesmo quadro em que o preco ou a tela inicial aparece.
  const fimCarregando = () => { document.documentElement.classList.remove('retomando'); const c = document.getElementById('carregando'); if (c) c.remove(); };
  if (URL_PARAMS.has('retomar') && TF.PAGAMENTO_ATIVO) {
    const pre = document.getElementById('pre-btn'); if (pre) pre.disabled = true;
    retomar().then((ok) => { fimCarregando(); show(ok ? 'price_reveal' : 'welcome', false); });
  } else { fimCarregando(); show('welcome', false); }
})();
