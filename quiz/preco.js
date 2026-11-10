// Preco revelado no fim do quiz (tela 49B). UNICO lugar para trocar quando definirmos o preco da web.
// Padrao: os precos fixos atuais do app na App Store (src/hooks/usePurchases.ts, FIXED_PRICES_APPLE,
// oferta precos_2026_10): mensal R$ 29,90; anual R$ 229,90, que da R$ 19,16 por mes.
window.TF = window.TF || {};
TF.PRECO = { mensal: 29.90, anual: 229.90, anualPorMes: 19.16 };

// Pagamento na web. false (hoje): depois do preco revelado, o quiz pula o cadastro e mostra
// "Baixe o app e comece agora" com os botoes das lojas. true: volta o cadastro com os aceites.
TF.PAGAMENTO_ATIVO = true;
