/*
 * Medição de uso no PostHog (mesmo projeto do app: região US, projeto 523653).
 * Usada na /plano/, na /plano/comunidade/ e no /quiz/.
 *
 * Sem a biblioteca posthog-js: os eventos vão direto para a API pública de captura,
 * com o mesmo efeito da configuração
 *   persistence 'memory', autocapture desligado, sem gravação de sessão,
 *   person_profiles 'identified_only' e capture_pageview false.
 * Ou seja:
 *   - sem cookie, sem localStorage e sem sessionStorage: o identificador anônimo
 *     vive só na memória da página e some ao fechar ou trocar de página;
 *   - nenhum clique ou texto é capturado sozinho: só os eventos chamados no código;
 *   - $process_person_profile: false, sem perfil de pessoa;
 *   - a URL vai sem os parâmetros (só origem e caminho); os utm_* vão como propriedades.
 * Não depende da faixa de cookies.
 *
 * NUNCA mandar por aqui respostas do quiz (objetivo, peso, altura, idade, saúde,
 * treino), nome, e-mail ou WhatsApp. O filtro abaixo só deixa passar as
 * propriedades listadas em PERMITIDAS.
 *
 * Uso: window.tribboMedida('web_plano_viewed', { page: 'plano' })
 */
(function () {
  'use strict';
  var KEY = 'phc_kUMmnj2VXm86CNuUUAx56gY74qkYoczupVb4frwhdryV';
  var URL_CAPTURA = 'https://us.i.posthog.com/i/v0/e/';
  var PERMITIDAS = ['page', 'button', 'step_number', 'step_name', 'guess', 'store', 'plan', 'offer']; // plan: mensal ou anual; offer: oferta do link curto (sim ou nao)

  function novoId() {
    try { if (crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  }
  var distinctId = novoId();

  var utm = {};
  try {
    new URLSearchParams(location.search).forEach(function (v, k) {
      if (/^utm_[a-z]+$/.test(k)) utm[k] = String(v).slice(0, 200);
    });
  } catch (e) {}

  window.tribboMedida = function (evento, extra) {
    try {
      var props = {
        distinct_id: distinctId,
        $process_person_profile: false,
        $lib: 'tribbo-web',
        $current_url: location.origin + location.pathname,
        $host: location.host,
        $pathname: location.pathname,
        $screen_width: window.screen ? screen.width : undefined
      };
      for (var k in utm) props[k] = utm[k];
      if (extra) PERMITIDAS.forEach(function (p) { if (extra[p] != null) props[p] = extra[p]; });
      var corpo = JSON.stringify({ api_key: KEY, event: evento, distinct_id: distinctId, properties: props, timestamp: new Date().toISOString() });
      // text/plain evita a checagem prévia (CORS); keepalive deixa o envio terminar mesmo se a página trocar.
      fetch(URL_CAPTURA, { method: 'POST', body: corpo, headers: { 'Content-Type': 'text/plain' }, keepalive: true, credentials: 'omit', mode: 'cors' })
        .catch(function () {});
    } catch (e) {}
  };
})();
