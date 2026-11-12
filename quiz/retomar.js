/*
 * Link de volta (?retomar=...): roda no <head>, antes do resto do quiz.
 * 1. Troca a tela inicial pela de carregamento ("Carregando o seu plano…"): a classe "retomando" no <html>
 *    esconde a tela inicial e mostra #carregando (style.css). O app.js tira a classe ao mostrar o preco,
 *    ou a tela inicial se o link nao valer (comportamento de sempre).
 * 2. Ja faz o pedido ao web-lead-resume (endereco em /js/funil.js, carregado antes), em paralelo com o
 *    download do resto do quiz. O app.js usa esta resposta (window.TF_RETOMADA) em vez de pedir de novo.
 * Mesmo pedido e mesmas regras do retomar() do app.js: token curto (12 letras, sem ponto) com o cupom da
 * URL, ou lead_id.assinatura. Nada fica guardado no navegador.
 */
(function () {
  'use strict';
  var F = window.TF_FUNIL;
  var q;
  try { q = new URLSearchParams(location.search); } catch (e) { return; }
  if (!q.has('retomar')) return;
  var raiz = document.documentElement;
  raiz.classList.add('retomando');
  // Se o quiz nao carregar (rede caiu), a tela de carregamento nao fica para sempre.
  setTimeout(function () { raiz.classList.remove('retomando'); }, 15000);

  var bruto = (q.get('retomar') || '').trim();
  var curto = bruto.indexOf('.') < 0 && /^[A-Za-z0-9_-]{12}$/.test(bruto) ? bruto : null;
  var m = curto ? null : /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([0-9a-f]{16,64})$/i.exec(bruto);
  if ((!m && !curto) || !F || !F.leadResume || !window.fetch) return;
  var cupom = curto ? ((q.get('cupom') || '').trim().slice(0, 40) || null) : null;
  var pedido = curto ? (cupom ? { token: curto, cupom: cupom } : { token: curto }) : { lead_id: m[1].toLowerCase(), token: m[2].toLowerCase() };
  var ctl = window.AbortController ? new AbortController() : null;
  var limite = ctl ? setTimeout(function () { ctl.abort(); }, 8000) : null;
  window.TF_RETOMADA = {
    bruto: bruto,
    // Resolve com a resposta (Response) ou null em erro de rede ou tempo esgotado.
    resposta: fetch(F.leadResume, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pedido), credentials: 'omit', signal: ctl ? ctl.signal : undefined })
      .then(function (res) { if (limite) clearTimeout(limite); return res; }, function () { if (limite) clearTimeout(limite); return null; }),
  };
})();
