/*
 * Anuncio do Meta direto na primeira pergunta do quiz. Roda no topo do <head> da /plano/, antes do CSS, do pixel
 * (consent.js) e do plano.js: com utm_source=FB (sem diferenciar maiuscula) e a chave ligada (/js/funil.js,
 * entradaObjetivo), troca a pagina por /quiz/?entrada=objetivo com TODOS os parametros da URL (utm_*, fbclid e outros).
 * location.replace: a /plano/ nao fica no historico, entao o Voltar do quiz nao cai aqui de novo.
 * fbclid sozinho NAO redireciona (o Facebook e o Instagram poem fbclid em qualquer link, inclusive organico).
 * site=1 (logo e "Voltar ao site" do quiz) desliga o redirecionamento.
 */
(function () {
  'use strict';
  var F = window.TF_FUNIL;
  if (!F || !F.entradaObjetivo) return;
  var q;
  try { q = new URLSearchParams(location.search); } catch (e) { return; }
  if (q.get('site') === '1') return;
  if (String(q.get('utm_source') || '').toLowerCase() !== 'fb') return;
  // plano.js e consent.js nao rodam (nem web_plano_viewed nem pixel) e a pagina nao pisca enquanto troca.
  window.TF_REDIRECIONANDO = true;
  document.documentElement.style.visibility = 'hidden';
  q.set('entrada', 'objetivo');
  if (window.tribboMedida) window.tribboMedida('web_plano_redirect_quiz', { page: 'plano' });
  location.replace('/quiz/?' + q.toString());
})();
