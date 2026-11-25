// Preco revelado no fim do quiz (tela 49B). UNICO lugar para trocar os valores.
// mensal e anual: os precos fixos do app na App Store (src/hooks/usePurchases.ts, FIXED_PRICES_APPLE, oferta
// precos_2026_10) e os da Cakto: mensal R$ 39,90 (so na web, desde 24/11/2026; no app, R$ 29,90); trimestral R$ 89,90, a cada 90 dias (so na web); anual R$ 229,90 (no Pix, e tambem a vista no cartao).
// O anual da Black (R$ 149,90) fica em BLACK, no app.js. A tela nao mostra parcelas. A economia (12 x R$ 39,90 = R$ 478,80), o preco
// por dia e os valores por mes saem destes numeros no app.js.
window.TF = window.TF || {};
TF.PRECO = { mensal: 39.90, trimestral: 89.90, anual: 229.90 };

// Pagamento na web. false (hoje): depois do preco revelado, o quiz pula o cadastro e mostra
// "Baixe o app e comece agora" com os botoes das lojas. true: volta o cadastro com os aceites.
TF.PAGAMENTO_ATIVO = true;
