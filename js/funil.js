/*
 * Configuração ÚNICA do funil web (quiz → Cakto → /obrigado/).
 * Para ir para o PROD, troque só AMBIENTE (e confira a URL do PROD abaixo)
 * e acrescente a URL do Supabase do PROD no connect-src da CSP de
 * /quiz/index.html e /obrigado/index.html.
 *
 * O pagamento só aparece no quiz com TF.PAGAMENTO_ATIVO = true (quiz/preco.js).
 */
(function () {
  'use strict';
  var AMBIENTE = 'prod'; // 'dev' ou 'prod'

  var SUPABASE = {
    dev: 'https://wqdxxdwplaoyirdirjif.supabase.co',
    prod: 'https://jllkcglzajmzqywyuswq.supabase.co'
  };

  window.TF_FUNIL = {
    ambiente: AMBIENTE,
    supabase: SUPABASE[AMBIENTE],
    webLead: SUPABASE[AMBIENTE] + '/functions/v1/web-lead',
    acessoStatus: SUPABASE[AMBIENTE] + '/functions/v1/web-access-status',
    // Link de volta (?retomar=): lê o lead pelo lead_id e a assinatura.
    leadResume: SUPABASE[AMBIENTE] + '/functions/v1/web-lead-resume',
    // Ida à Cakto (toque no botão de comprar): registra no lead, sem esperar a resposta.
    leadCheckout: SUPABASE[AMBIENTE] + '/functions/v1/web-lead-checkout',
    cakto: {
      mensal: 'https://pay.cakto.com.br/vck2kfj_1298134',
      anual: 'https://pay.cakto.com.br/cons8xz_1298173'
    },
    // Versão dos Termos publicada em /termos/ (gravada junto do aceite).
    termosVersao: '1.2',
    suporte: 'suporte@tribbofit.com.br',
    // WhatsApp do Tribbo Fit (+55 11 94926-8402), só dígitos.
    whatsapp: '5511949268402',
    lojas: {
      apple: 'https://apps.apple.com/br/app/id6769632514',
      google: 'https://play.google.com/store/apps/details?id=com.usekoraapp.health'
    }
  };
})();
