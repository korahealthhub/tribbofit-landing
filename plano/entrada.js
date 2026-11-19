/*
 * A /plano/ nao e mais mostrada: roda no topo do <head>, antes do CSS, do pixel (consent.js) e do plano.js, e troca a
 * pagina pelo quiz com TODA a query e o hash (utm_*, fbclid, retomar, cupom e outros), igual ao /quiz/.
 *  - Chave REDIRECIONAR_QUIZ2 ligada (/js/funil.js): todo mundo vai para o /quiz2/; ?v=1 vai para o /quiz/ antigo.
 *  - Anuncio do Meta (utm_source=FB, sem diferenciar maiuscula) ganha entrada=objetivo, como antes.
 *  - site=1 (logo, "Voltar ao site" e "Sair" do quiz) desliga o redirecionamento e mostra a /plano/ (sem volta infinita).
 *  - Chave desligada: so o anuncio (com entradaObjetivo) vai para o /quiz/; o resto fica na /plano/ como antes.
 * location.replace: a /plano/ nao fica no historico, entao o Voltar do quiz nao cai aqui de novo.
 */
(function () {
  'use strict';
  var F = window.TF_FUNIL;
  if (!F) return;
  var q;
  try { q = new URLSearchParams(location.search); } catch (e) { return; }
  if (q.get('site') === '1') return;
  var anuncio = !!F.entradaObjetivo && String(q.get('utm_source') || '').toLowerCase() === 'fb';
  if (!F.redirecionarQuiz2 && !anuncio) return;
  // plano.js e consent.js nao rodam (nem web_plano_viewed nem pixel) e a pagina nao pisca enquanto troca.
  window.TF_REDIRECIONANDO = true;
  document.documentElement.style.visibility = 'hidden';
  if (anuncio) q.set('entrada', 'objetivo');
  var destino = F.redirecionarQuiz2 && q.get('v') !== '1' ? '/quiz2/' : '/quiz/';
  if (window.tribboMedida) window.tribboMedida('web_plano_redirect_quiz', { page: 'plano', motivo: anuncio ? 'anuncio' : 'direto' });
  var busca = q.toString();
  location.replace(destino + (busca ? '?' + busca : '') + location.hash);
})();
