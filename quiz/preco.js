// Preco revelado no fim do quiz (tela 49B). UNICO lugar para trocar os valores.
// mensal e anual: os precos fixos do app na App Store (src/hooks/usePurchases.ts, FIXED_PRICES_APPLE, oferta
// precos_2026_10) e os da Cakto: mensal R$ 29,90; anual R$ 229,90 (no Pix, e tambem a vista no cartao).
// parcelas e parcelaAnual: o parcelamento que a Cakto mostra no anual (12x de R$ 23,65, com os juros que ela repassa
// ao comprador; conferido no checkout em 13/11/2026). Se a Cakto mudar, troque aqui.
// O preco por dia (R$ 0,63 no anual, R$ 1,00 no mensal) e o "35%" saem destes valores no app.js.
window.TF = window.TF || {};
TF.PRECO = { mensal: 29.90, anual: 229.90, parcelas: 12, parcelaAnual: 23.65 };

// Pagamento na web. false (hoje): depois do preco revelado, o quiz pula o cadastro e mostra
// "Baixe o app e comece agora" com os botoes das lojas. true: volta o cadastro com os aceites.
TF.PAGAMENTO_ATIVO = true;
