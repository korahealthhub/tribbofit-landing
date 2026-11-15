// GIFs dos exercicios do quiz e da previa do plano da /plano/: lista fixa (nome em portugues -> arquivo).
// Os GIFs ficam no bucket publico exercise-gifs do Supabase de producao; a URL e direta, sem chave.
// Os arquivos sao os da coluna gif_url da tabela exercise_library (consultada so para leitura em 11/2026).
// Quando o nome do quiz nao existe igual na biblioteca, o comentario diz qual exercicio da biblioteca foi usado.
// Sem GIF equivalente na biblioteca (ficam com o icone): Prancha e Superman.
window.TF = window.TF || {};
TF.GIF_BASE = 'https://jllkcglzajmzqywyuswq.supabase.co/storage/v1/object/public/exercise-gifs/';
TF.EXERCICIOS = {
  // Tela 20 (os mesmos do app: src/onboarding/libraryGifs.ts, BODYWEIGHT_GIF_IDS)
  'Agachamento livre (peso do corpo)': '1685.gif',
  'Flexão de braço': '0662.gif',
  'Barra fixa': '0652.gif',
  // Ficha de exemplo da tela 29 (calculos.js, POOL): com aparelhos
  'Leg press': '0739.gif',                       // Leg Press 45°
  'Cadeira flexora': '0599.gif',
  'Elevação pélvica': '1409.gif',                // Elevação de Glúteo com Barra
  'Supino reto com halteres': '0289.gif',        // Supino com Halteres
  'Crucifixo na máquina': '0596.gif',            // Peck Deck
  'Puxada na frente': '0579.gif',                // Puxada Frontal na Máquina
  'Remada baixa': '0180.gif',                    // Remada Baixa Sentado no Cabo
  'Elevação lateral com halteres': '0334.gif',
  // Em casa, com halteres ou elasticos
  'Agachamento com halteres': '0413.gif',        // Agachamento com Haltere
  'Levantamento terra romeno com halteres': '1459.gif', // Terra Romeno com Haltere
  'Elevação pélvica com halter': '3013.gif',     // Ponte de Glúteo Baixa no Chão
  'Supino com halteres': '0289.gif',
  'Crucifixo com halteres': '0308.gif',
  'Remada curvada com halteres': '0293.gif',     // Remada com Halteres
  'Remada unilateral com halter': '0292.gif',    // Remada Unilateral com Haltere
  // So com o peso do corpo
  'Ponte de glúteos': '3013.gif',                // Ponte de Glúteo Baixa no Chão
  'Flexão com os joelhos no chão': '3211.gif',   // Flexão de Braço de Joelhos
  'Remada invertida': '0499.gif',
  'Prancha com toque no ombro': '3699.gif',      // Toque no Ombro em Prancha
  // Previa do plano da /plano/ (nomes da biblioteca do app)
  'Puxada Frontal na Máquina': '0579.gif',
  'Remada Baixa Sentado no Cabo': '0180.gif',
  'Remada com Halteres': '0293.gif',
  'Rosca Direta com Barra': '0031.gif',
  'Rosca Martelo com Halteres': '0313.gif',
  'Barra Fixa Assistida': '0017.gif',
  'Remada com Barra Inclinado': '0027.gif',
};
TF.gifDe = (nome) => (TF.EXERCICIOS[nome] ? TF.GIF_BASE + TF.EXERCICIOS[nome] : null);
