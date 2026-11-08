// Perguntas, opcoes e textos do quiz, num arquivo so, copiados do onboarding do app (repositorio Kora).
// Cada bloco diz de qual arquivo do app veio, para manter os dois iguais: mudou la, muda aqui.
// O layout fica em app.js; os calculos, em calculos.js.
// Dados de saude: nada deste arquivo nem das respostas sai da memoria da pagina.
window.TF = window.TF || {};

(function () {
  // ==== src/onboarding/steps.ts: secoes da barra de progresso ====
  TF.SECTIONS = [
    { id: 'voce', label: 'Você' },
    { id: 'corpo', label: 'Corpo' },
    { id: 'rotina', label: 'Rotina' },
    { id: 'treino', label: 'Treino' },
    { id: 'alimentacao', label: 'Alimentação' },
    { id: 'plano', label: 'Seu plano' },
  ];

  // ==== src/onboarding/steps.ts: ordem das telas e quando cada uma e pulada ====
  // Fora do quiz, de proposito: 48A (avaliacao na loja), 49 (jogo do preco, leva a paywall) e
  // 49A (rastreamento da Apple). "lead_form" so existe na web: vem depois da tela de resultado.
  TF.STEPS = [
    { id: 'welcome', code: '1', section: 'voce' },
    { id: 'name', code: '2', section: 'voce' },
    { id: 'consents', code: '3', section: 'voce' },
    { id: 'goal', code: '4', section: 'corpo' },
    { id: 'tried_before', code: '5', section: 'corpo' },
    { id: 'motivation', code: '5A', section: 'corpo' },
    { id: 'gender', code: '6', section: 'corpo' },
    { id: 'birth_date', code: '7', section: 'corpo' },
    { id: 'height', code: '8', section: 'corpo' },
    { id: 'weight', code: '9', section: 'corpo' },
    { id: 'target_weight', code: '10', section: 'corpo', skip: (a) => a.goal === 'maintain_weight' || TF.isNoDeficitPhase(a) },
    { id: 'pace', code: '11', section: 'corpo', skip: (a) => !TF.hasWeightChange(a) },
    { id: 'yo_yo', code: '11A', section: 'corpo', skip: (a) => a.goal !== 'lose_weight' || TF.isNoDeficitPhase(a) },
    { id: 'projection', code: '12', section: 'corpo' },
    { id: 'score', code: '13', section: 'corpo' },
    { id: 'reviews', code: '14', section: 'corpo' },
    { id: 'acquisition', code: '14A', section: 'corpo' },
    { id: 'before_after', code: '14B', section: 'corpo' },
    { id: 'activity', code: '15', section: 'rotina' },
    { id: 'sleep', code: '16', section: 'rotina' },
    { id: 'level', code: '17', section: 'treino' },
    { id: 'experience', code: '18', section: 'treino' },
    { id: 'equipment', code: '19', section: 'treino' },
    { id: 'bodyweight', code: '20', section: 'treino' },
    { id: 'days', code: '21', section: 'treino' },
    { id: 'duration', code: '22', section: 'treino' },
    { id: 'did_you_know_training', code: '23', section: 'treino' },
    { id: 'cardio', code: '24', section: 'treino' },
    { id: 'pain', code: '25', section: 'treino' },
    { id: 'health', code: '26', section: 'treino' },
    { id: 'focus', code: '27', section: 'treino' },
    { id: 'plan_setup', code: '28', section: 'treino' },
    { id: 'training_summary', code: '29', section: 'treino' },
    { id: 'meals', code: '30', section: 'alimentacao' },
    { id: 'diet', code: '31', section: 'alimentacao' },
    { id: 'allergies', code: '32', section: 'alimentacao' },
    { id: 'dislikes', code: '33', section: 'alimentacao' },
    { id: 'meal_places', code: '34', section: 'alimentacao' },
    { id: 'cooking', code: '35', section: 'alimentacao' },
    { id: 'did_you_know_food', code: '36', section: 'alimentacao' },
    { id: 'kitchen', code: '37', section: 'alimentacao', skip: (a) => a.cookingTime === 'none' },
    { id: 'household', code: '38', section: 'alimentacao' },
    { id: 'budget', code: '39', section: 'alimentacao' },
    { id: 'nutritionist', code: '40', section: 'alimentacao' },
    { id: 'supplements', code: '40A', section: 'alimentacao' },
    { id: 'energy', code: '41', section: 'alimentacao' },
    { id: 'energy_reveal', code: '41B', section: 'alimentacao' },
    { id: 'food_summary', code: '42', section: 'alimentacao' },
    { id: 'how_it_works', code: '43', section: 'plano' },
    { id: 'obstacle', code: '44', section: 'plano' },
    { id: 'notifications', code: '45', section: 'plano' },
    { id: 'commitment', code: '46', section: 'plano' },
    { id: 'building', code: '47', section: 'plano' },
    { id: 'plan_summary', code: '48', section: 'plano' },
    { id: 'lead_form', code: '49', section: 'plano' },
  ];

  // ==== src/onboarding/answers.ts: emptyAnswers ====
  TF.emptyAnswers = () => ({
    fullName: '', displayName: '', termsAcceptedAt: null, educationalConsentAt: null, healthDataConsentAt: null,
    goal: null, triedBefore: null, mainMotivation: null, acquisitionSource: null, gender: null, birthDate: '',
    heightCm: null, weightKg: null, targetWeightKg: null, pace: null, targetDate: null, activityLevel: null,
    sleepGoalHours: 8, sleepMode: 'same', sleepSchedules: [], fitnessLevel: null, trainingExperience: null,
    equipment: null, bodyweightMoves: [], workoutDays: null, workoutDuration: null, doesCardio: null, cardioTypes: [],
    hasPain: null, injuries: [], injuryNote: '', conditions: [], healthClearanceAckAt: null, muscleFocus: [],
    planSetupChoice: null, mealCount: null, dietType: null, foodRestrictions: [], foodDislikes: [], foodDislikesNote: '',
    mealLocations: [], cookingTime: null, kitchenEquipment: [], householdSize: null, foodBudget: null, hasNutritionist: null,
    mealSetupChoice: null, supplementsUsage: null, calorieKnowledge: null, mainObstacle: null, commitmentSignedAt: null,
    targets: null,
  });
  // src/onboarding/answers.ts: limites do nome
  TF.NAME_MIN = 2;
  TF.FULL_NAME_MAX = 60;
  TF.DISPLAY_NAME_MAX = 30;

  // ==== src/constants/profileOptions.ts: opcoes (mesmos codigos e mesmos textos) ====
  TF.GENDERS = [
    { value: 'female', label: 'Feminino' },
    { value: 'male', label: 'Masculino' },
    { value: 'prefer_not_to_say', label: 'Prefiro não informar' },
  ];
  TF.FITNESS_LEVELS = [
    { value: 'beginner', label: 'Iniciante', desc: 'Estou começando ou voltando depois de muito tempo' },
    { value: 'intermediate', label: 'Intermediário', desc: 'Treino com frequência e conheço os exercícios' },
    { value: 'advanced', label: 'Avançado', desc: 'Treino há anos e sigo uma rotina estruturada' },
  ];
  TF.EXPERIENCE_OPTIONS = [
    { value: 'never', label: 'Nunca treinei' },
    { value: 'less_6m', label: 'Menos de 6 meses' },
    { value: '6m_2y', label: 'De 6 meses a 2 anos' },
    { value: 'over_2y', label: 'Mais de 2 anos' },
  ];
  TF.EQUIPMENT_OPTIONS = [
    { value: 'full_gym', label: 'Academia completa', desc: 'Máquinas, halteres e barras' },
    { value: 'small_gym', label: 'Academia pequena ou de condomínio', desc: 'Alguns aparelhos e halteres' },
    { value: 'home', label: 'Em casa, com halteres ou elásticos', desc: 'Ou caneleiras e acessórios' },
    { value: 'bodyweight', label: 'Sem equipamento, só com o peso do corpo', desc: 'Em casa, no parque ou onde estiver' },
  ];
  TF.DAYS_OPTIONS = [
    { value: 2, label: '2 dias', desc: 'Ideal para começar' },
    { value: 3, label: '3 dias', desc: 'Frequência regular' },
    { value: 4, label: '4 dias', desc: 'Treino dedicado' },
    { value: 5, label: '5 dias', desc: 'Alta frequência' },
    { value: 6, label: '6 dias', desc: 'Máximo volume semanal' },
  ];
  TF.RESTRICTION_OPTIONS = [
    { value: 'none', label: 'Nenhuma' },
    { value: 'knee', label: 'Joelho' },
    { value: 'lower_back', label: 'Coluna lombar' },
    { value: 'shoulder', label: 'Ombro' },
    { value: 'hip', label: 'Quadril' },
    { value: 'surgery', label: 'Cirurgia nos últimos 6 meses' },
    { value: 'pregnant', label: 'Gestação' },
    { value: 'breastfeeding', label: 'Amamentação' },
    { value: 'heart_disease', label: 'Doença do coração' },
    { value: 'uncontrolled_hypertension', label: 'Pressão alta sem controle' },
    { value: 'acute_pain', label: 'Dor forte no momento' },
    { value: 'other', label: 'Outra' },
  ];
  TF.INJURY_CODES = ['knee', 'lower_back', 'shoulder', 'hip', 'other'];
  TF.HEALTH_CONDITION_CODES = ['surgery', 'heart_disease', 'uncontrolled_hypertension', 'acute_pain', 'pregnant', 'breastfeeding'];
  TF.restrictionLabel = (code) => TF.RESTRICTION_OPTIONS.find((o) => o.value === code)?.label ?? code;
  TF.FOCUS_OPTIONS = [
    { value: 'glutes_legs', label: 'Glúteos e pernas' },
    { value: 'core', label: 'Abdômen' },
    { value: 'back_biceps', label: 'Costas e bíceps' },
    { value: 'chest_triceps', label: 'Peito e tríceps' },
    { value: 'shoulders_arms', label: 'Ombros e braços' },
    { value: 'none', label: 'Corpo todo por igual' },
  ];
  TF.ACTIVITY_LEVEL_OPTIONS = [
    { value: 'sedentary', label: 'Pouco', desc: 'Passo a maior parte do dia sem me movimentar' },
    { value: 'light', label: 'Um pouco', desc: 'Caminho ou me exercito 1 a 2 vezes por semana' },
    { value: 'moderate', label: 'Bastante', desc: 'Me exercito de 3 a 5 vezes por semana' },
    { value: 'very_active', label: 'Muito', desc: 'Trabalho em pé ou me exercito quase todo dia' },
  ];
  TF.TRIED_BEFORE_OPTIONS = [
    { value: 'first', label: 'É a minha primeira vez', reaction: 'Ótimo começo. Com um plano feito para a sua rotina, fica muito mais fácil criar o hábito desde o início.' },
    { value: 'once_twice', label: 'Já tentei 1 ou 2 vezes', reaction: 'Isso é mais comum do que parece. Quase sempre o que faltou foi um plano que coubesse na sua rotina. Vamos montar o seu.' },
    { value: 'many', label: 'Já tentei várias vezes', reaction: 'Isso acontece com muita gente. Dietas e treinos genéricos raramente funcionam por muito tempo. Desta vez, o plano vai ser feito para você.' },
  ];
  TF.MOTIVATION_OPTIONS = [
    { value: 'energy', label: 'Ter mais disposição no dia a dia' },
    { value: 'body_confidence', label: 'Me sentir bem com o meu corpo' },
    { value: 'health', label: 'Cuidar da minha saúde' },
    { value: 'clothes', label: 'Usar as roupas que eu quero' },
    { value: 'self_confidence', label: 'Ter mais autoconfiança' },
    { value: 'special_occasion', label: 'Uma ocasião especial' },
  ];
  TF.PACE_OPTIONS = [
    { value: 'slow', label: 'Tranquilo', desc: 'Mais fácil de manter' },
    { value: 'recommended', label: 'Moderado', desc: 'Equilíbrio entre resultado e conforto' },
    { value: 'fast', label: 'Acelerado', desc: 'Exige mais disciplina' },
  ];
  TF.DOES_CARDIO_OPTIONS = [
    { value: 'no', label: 'Não faço' },
    { value: 'sometimes', label: 'Às vezes' },
    { value: 'regular', label: 'Regularmente' },
  ];
  TF.CARDIO_TYPE_OPTIONS = [
    { value: 'walk', label: 'Caminhada' },
    { value: 'run', label: 'Corrida' },
    { value: 'bike', label: 'Bike' },
    { value: 'dance', label: 'Dança ou aulas' },
    { value: 'swim', label: 'Natação' },
    { value: 'sports', label: 'Esportes' },
    { value: 'other', label: 'Outro' },
  ];
  TF.PLAN_SETUP_OPTIONS = [
    { value: 'ai', label: 'Monte para mim', desc: 'A IA cria um plano completo para o seu nível, sua rotina e seu objetivo' },
    { value: 'manual', label: 'Quero montar do meu jeito', desc: 'Escolha os exercícios na nossa biblioteca' },
    { value: 'pdf', label: 'Já tenho o treino do meu personal', desc: 'Você poderá importar o plano no app' },
  ];
  TF.MEAL_SETUP_OPTIONS = [
    { value: 'auto', label: 'Monte meu cardápio para mim', desc: 'Refeições prontas para o seu objetivo, com a comida do dia a dia' },
    { value: 'self', label: 'Eu mesmo monto', desc: 'Você escolhe o que come, e o app calcula a meta de cada refeição' },
    { value: 'nutritionist', label: 'Tenho o plano do meu nutricionista', desc: 'Envie o PDF ou a foto e acompanhe tudo no app' },
  ];
  TF.MEAL_COUNT_OPTIONS = [2, 3, 4, 5, 6, 7];
  TF.DIET_TYPE_OPTIONS = [
    { value: 'omnivore', label: 'Como de tudo' },
    { value: 'vegetarian', label: 'Vegetariana', desc: 'Sem carnes e peixes, com ovos e laticínios' },
    { value: 'vegan', label: 'Vegana', desc: 'Nenhum alimento de origem animal' },
    { value: 'pescatarian', label: 'Pescetariana', desc: 'Sem carnes, com peixes e frutos do mar' },
  ];
  TF.FOOD_RESTRICTION_OPTIONS = [
    { value: 'lactose', label: 'Lactose' },
    { value: 'gluten', label: 'Glúten' },
    { value: 'egg', label: 'Ovo' },
    { value: 'seafood', label: 'Frutos do mar' },
    { value: 'nuts', label: 'Amendoim e castanhas' },
    { value: 'none', label: 'Nenhuma' },
  ];
  TF.FOOD_DISLIKE_OPTIONS = [
    { value: 'fish', label: 'Peixe' },
    { value: 'pork', label: 'Carne de porco' },
    { value: 'offal', label: 'Fígado e miúdos' },
    { value: 'okra', label: 'Quiabo' },
    { value: 'jilo', label: 'Jiló' },
    { value: 'eggplant', label: 'Berinjela' },
    { value: 'cilantro', label: 'Coentro' },
    { value: 'beet', label: 'Beterraba' },
    { value: 'other', label: 'Outro' },
    { value: 'none', label: 'Nenhum' },
  ];
  TF.MEAL_LOCATION_OPTIONS = [
    { value: 'home', label: 'Em casa' },
    { value: 'packed', label: 'Levo marmita' },
    { value: 'restaurant', label: 'Restaurante ou por quilo' },
    { value: 'delivery', label: 'Lanchonete ou delivery' },
  ];
  TF.COOKING_TIME_OPTIONS = [
    { value: 'none', label: 'Não cozinho' },
    { value: '15', label: 'Até 15 minutos' },
    { value: '30', label: 'Até 30 minutos' },
    { value: 'no_rush', label: 'Gosto de cozinhar sem pressa' },
  ];
  TF.KITCHEN_OPTIONS = [
    { value: 'stove', label: 'Fogão' },
    { value: 'oven', label: 'Forno' },
    { value: 'air_fryer', label: 'Air fryer' },
    { value: 'microwave', label: 'Micro-ondas' },
    { value: 'blender', label: 'Liquidificador' },
  ];
  TF.HOUSEHOLD_OPTIONS = [
    { value: 1, label: 'Só para mim' },
    { value: 2, label: '2 pessoas' },
    { value: 3, label: '3 a 4 pessoas' },
    { value: 5, label: '5 ou mais' },
  ];
  TF.BUDGET_OPTIONS = [
    { value: 'economic', label: 'Econômico', desc: 'Prefiro opções mais baratas' },
    { value: 'moderate', label: 'Moderado' },
    { value: 'no_limit', label: 'Sem restrição' },
  ];
  TF.OBSTACLE_OPTIONS = [
    { value: 'time', label: 'Falta de tempo', reply: 'Seus treinos cabem no tempo que você tem, e o check-in leva 1 minuto.' },
    { value: 'motivation', label: 'Falta de motivação', reply: 'O Tribbo Score e os lembretes te ajudam a manter o ritmo, um dia de cada vez.' },
    { value: 'dont_know', label: 'Não saber o que fazer', reply: 'Seu plano mostra exatamente o que fazer em cada dia, com vídeo de cada exercício.' },
    { value: 'quit_before', label: 'Já desisti antes', reply: 'Desta vez o plano foi feito para a sua rotina, e o Coach te acompanha quando bater a vontade de parar.' },
    { value: 'money', label: 'Gastar muito', reply: 'Tudo o que você precisa em um só app, por menos de {daily} por dia.' },
    { value: 'forget', label: 'Esquecer ou deixar a rotina de lado', reply: 'Os lembretes te avisam na hora certa, e o check-in de 1 minuto mantém sua rotina no radar.' },
  ];
  TF.CALORIE_KNOWLEDGE_OPTIONS = [
    { value: 'yes', label: 'Sim' },
    { value: 'roughly', label: 'Mais ou menos' },
    { value: 'no_idea', label: 'Não faço ideia' },
  ];
  TF.optionLabel = (list, value) => list.find((o) => o.value === value)?.label ?? '';

  // ==== src/utils/goal.ts: GOAL_OPTIONS ====
  // (repetido em calculos.js, no bloco de goal.ts; este e o que a tela usa)
  TF.GOAL_CHOICES = [
    { value: 'lose_weight', label: 'Perder peso' },
    { value: 'gain_muscle', label: 'Ganhar massa muscular' },
    { value: 'maintain_weight', label: 'Manter meu peso' },
    { value: 'improve_health', label: 'Melhorar minha saúde e disposição' },
  ];

  // ==== src/onboarding/stepViewsExtra.tsx: ACQUISITION_OPTIONS (tela 14A) ====
  TF.ACQUISITION_OPTIONS = [
    { value: 'instagram', label: 'Instagram', icon: 'logo-instagram' },
    { value: 'tiktok', label: 'TikTok', icon: 'logo-tiktok' },
    { value: 'friend', label: 'Indicação de amigo ou familiar', icon: 'people-outline' },
    { value: 'ad', label: 'Anúncio', icon: 'megaphone-outline' },
    { value: 'store_search', label: 'Busca na App Store ou Google Play', icon: 'search-outline' },
    { value: 'youtube', label: 'YouTube', icon: 'logo-youtube' },
    { value: 'other', label: 'Outro', icon: 'ellipsis-horizontal-circle-outline' },
  ];

  // ==== Icones das opcoes ====
  TF.OPTION_ICONS = {
    // src/components/profileQuestions/questions.tsx
    goal: { lose_weight: 'trending-down-outline', gain_muscle: 'barbell-outline', maintain_weight: 'scale-outline', improve_health: 'heart-outline' },
    tried: { first: 'sparkles-outline', once_twice: 'repeat-outline', many: 'time-outline' },
    triedReaction: { first: 'flag-outline', once_twice: 'map-outline', many: 'shield-checkmark-outline' },
    motivation: { energy: 'flash-outline', body_confidence: 'body-outline', health: 'heart-outline', clothes: 'shirt-outline', self_confidence: 'sparkles-outline', special_occasion: 'gift-outline' },
    // src/components/profileQuestions/treinoQuestions.tsx
    level: { beginner: 'leaf-outline', intermediate: 'barbell-outline', advanced: 'trophy-outline' },
    equipment: { full_gym: 'barbell-outline', small_gym: 'business-outline', home: 'home-outline', bodyweight: 'body-outline' },
    cardio: { walk: 'mci:walk', run: 'mci:run', bike: 'mci:bike', dance: 'mci:music-note', swim: 'mci:swim', sports: 'mci:soccer', other: 'mci:dots-horizontal' },
    injury: { knee: 'mci:bone', lower_back: 'mci:human', shoulder: 'mci:arm-flex', hip: 'mci:human-handsdown', other: 'mci:dots-horizontal' },
    setup: { ai: 'sparkles-outline', manual: 'create-outline', pdf: 'document-text-outline' },
    // src/components/profileQuestions/alimentacaoQuestions.tsx
    diet: { omnivore: 'restaurant-outline', vegetarian: 'leaf-outline', vegan: 'flower-outline', pescatarian: 'fish-outline' },
    place: { home: 'home-outline', packed: 'bag-handle-outline', restaurant: 'storefront-outline', delivery: 'bicycle-outline' },
    cooking: { none: 'close-circle-outline', 15: 'timer-outline', 30: 'time-outline', no_rush: 'flame-outline' },
    kitchen: { stove: 'mci:stove', oven: 'mci:toaster-oven', air_fryer: 'mci:french-fries', microwave: 'mci:microwave', blender: 'mci:blender' },
    budget: { economic: 'wallet-outline', moderate: 'card-outline', no_limit: 'diamond-outline' },
    mealSetup: { auto: 'restaurant-outline', self: 'create-outline', nutritionist: 'document-text-outline' },
    // src/onboarding/stepViewsPlano.tsx
    obstacle: { time: 'time-outline', motivation: 'battery-half-outline', dont_know: 'help-circle-outline', quit_before: 'refresh-outline', money: 'wallet-outline', forget: 'notifications-off-outline' },
    obstacleReaction: { time: 'timer-outline', motivation: 'trending-up-outline', dont_know: 'list-outline', quit_before: 'chatbubbles-outline', money: 'pricetag-outline', forget: 'alarm-outline' },
  };

  // ==== Textos por tela ====
  TF.T = {
    // src/onboarding/stepViews.tsx
    welcome: { title: 'Queremos criar uma experiência personalizada para você!', subtitle: 'Responda as próximas perguntas para nos ajudar a criar seu plano.', button: 'Criar meu plano', cover: 'assets/foto_capa.webp' },
    consents: {
      title: 'Antes de começar', subtitle: 'O Tribbo Fit é um app de bem-estar. Para seguir, confirme:', button: 'Concordo e quero continuar', markAll: 'Marcar todos',
      terms: ['Li e aceito os', 'Termos de Uso', 'e a', 'Política de Privacidade'],
      educational: 'Entendo que o conteúdo é educativo e não substitui médico, nutricionista ou profissional de educação física. Sou responsável pelo uso que faço dele.',
      health: 'Autorizo o uso dos meus dados de saúde, como peso, sono e restrições, para personalizar meu plano.',
    },
    tried: { button: 'Vamos nessa', title: ['Você já tentou', 'antes?'] },
    yoYo: {
      title: 'Dietas restritivas costumam\ntrazer o peso de volta', subtitleMany: 'Por isso as outras tentativas não duraram. Desta vez é diferente.', button: 'Quero fazer diferente',
      legendRoutine: 'Com rotina', legendDiet: 'Dieta restritiva', body: 'Cortar demais funciona por pouco tempo. Mudanças graduais na rotina são as que ficam.',
      source: 'A variação frequente de peso foi associada a mais problemas no coração (Bangalore e colegas, New England Journal of Medicine, 2017).',
    },
    projection: {
      button: 'Quero ver meu plano', canReach: 'você pode chegar a', until: 'até', health: 'seu foco é mais saúde e disposição', maintain: ['Seu foco: manter', 'kg com mais energia e disposição'],
      banner1: 'Seu objetivo está ao seu alcance. Uma mudança gradual preserva a musculatura e melhora energia e humor.',
      banner2: 'Estimativa com base nas suas respostas. O resultado depende da sua rotina.',
    },
    score: {
      title: 'Você pode alcançar seus objetivos', button: 'Eu consigo', with: 'Com o Tribbo Fit', without: 'Sem rotina',
      item1: 'Desbloqueie suas conquistas', item2: 'Ative as notificações para lembrarmos você do que fazer', caption: 'Gráfico ilustrativo.', y: 'EVOLUÇÃO', x: 'SEMANAS',
    },
    reviews: { titleA: 'Mais de', titleB: 'pessoas', subtitle: 'já começaram com o Tribbo Fit', button: 'Quero começar também' },
    // Reservas de src/onboarding/peopleCount.ts: PEOPLE_COUNT_FALLBACK. O app busca o numero no servidor; o quiz usa a reserva.
    peopleCount: 4000,
    reviewList: [
      { name: 'Carol B.', photo: 'assets/reviews/carol_b.webp', text: 'Agora consigo acompanhar minha evolução na academia e não fico mais com dúvida do movimento dos exercícios.' },
      { name: 'Lais M.', photo: 'assets/reviews/lais_m.webp', text: 'Muito bom para treinar e fazer dieta.' },
      { name: 'Caio T.', photo: 'assets/reviews/caio_t.webp', text: 'Aplicativo excelente, consigo manter minha rotina com mais facilidade.' },
      { name: 'Andre C.', photo: 'assets/reviews/andre_c.webp', text: 'Excelente app! O melhor que usei até agora!' },
    ],
    // src/onboarding/stepViewsExtra.tsx e src/onboarding/beforeAfter.ts
    acquisition: { title: 'Como você conheceu o Tribbo?' },
    beforeAfter: {
      title: 'Olha o antes e depois com o Tribbo Fit', disclaimer: 'Com autorização. Resultados individuais variam.',
      people: [
        { id: 'antonio', name: 'Antonio Roberto', city: 'São Paulo', uf: 'SP' },
        { id: 'daniel', name: 'Daniel Silva', city: 'Curitiba', uf: 'PR' },
        { id: 'jessica', name: 'Jessica Pires', city: 'Salvador', uf: 'BA' },
      ],
    },
    // src/components/profileQuestions/questions.tsx
    name: { title: 'Qual é o seu nome?', label: 'Nome e sobrenome' },
    goal: { title: 'qual é o seu principal objetivo?' },
    triedTitle: { lose_weight: 'perder peso', gain_muscle: 'ganhar massa', maintain_weight: 'manter o peso', improve_health: 'cuidar da saúde' },
    motivation: { title: 'Qual é o seu principal motivo?' },
    gender: { title: 'Como você se identifica?', subtitle: 'Usamos isso para calcular quanta energia seu corpo precisa.', note: 'Vamos usar uma média nos cálculos.' },
    birth: { title: 'Qual é a sua data de nascimento?', subtitle: 'A idade muda o quanto seu corpo gasta de energia.', underage: 'Por enquanto, o Tribbo Fit é para pessoas a partir de 18 anos.' },
    height: { title: 'Qual é a sua altura?' },
    weight: { title: 'Qual é o seu peso atual?', subtitle: 'Sem julgamentos. É só o ponto de partida.', bmiTitle: 'Seu IMC é de' },
    bmiMessage: {
      below: 'Seu plano vai priorizar força e energia, no ritmo certo para você.',
      healthy: 'Você está numa faixa saudável. Agora é cuidar da rotina para ganhar ainda mais disposição.',
      above: 'Pequenas mudanças na rotina já fazem diferença. Vamos juntos, um passo de cada vez.',
      well_above: 'Cada passo conta. Seu plano começa no seu ritmo, sem pressa e sem cobrança.',
    },
    target: {
      title: 'Qual peso você quer alcançar?', keep: 'Quero manter meu peso atual', loseA: 'Você vai perder', loseB: 'do seu peso', gainA: 'Você vai ganhar', bmi: 'Seu IMC na meta:',
      gainMsg: 'Com treino e alimentação certos, esse ganho vem em músculo.', bigMsg: 'Uma meta ambiciosa. Vamos chegar lá em etapas.', okMsg: 'Uma meta realista, que já traz benefícios para a saúde.',
      belowA: 'Esse peso fica abaixo da faixa saudável para a sua altura. Escolha um valor a partir de', wrongLose: 'Para perder peso, a meta precisa ser menor que o peso atual.', wrongGain: 'Para ganhar massa, a meta precisa ser maior que o peso atual.',
    },
    pace: {
      title: 'Em que ritmo você quer chegar lá?', custom: 'Escolher minha data', badge: 'Recomendado', perWeek: 'kg por semana', inDays: 'em', days: 'dias',
      unsafeA: 'Essa data exige mais de 1% do seu peso por semana. A data segura mais próxima é', use: 'Usar', reference: 'Referência: Helms e colegas, 2014.',
    },
    activity: { title: 'Quanto você se movimenta no dia a dia?' },
    sleep: {
      title: 'Como é o seu sono?', goal: 'Quantas horas você quer dormir?', goalNote: 'A maioria dos adultos precisa de 7 a 9 horas.', weekdays: 'Segunda a sexta', weekend: 'Sábado e domingo', switch: 'Fim de semana diferente', custom: 'Personalizar por dia',
      tip: 'Dica: acordar em horários parecidos todos os dias ajuda seu corpo a descansar melhor.', tap: 'Toque em um dia para ajustar.', same: 'Usar o mesmo horário todos os dias',
      // src/components/profileQuestions/SleepWeekEditor.tsx
      bedtime: 'Dormir', waketime: 'Acordar', ofSleep: 'de sono', vs: { below: 'abaixo da meta', on_goal: 'na meta', above: 'acima da meta' }, uncovered: 'Sem horário:', add: 'Adicionar horário para esses dias',
      dayNames: ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'],
    },
    // src/components/profileQuestions/treinoQuestions.tsx
    level: { title: 'Como você descreve seu nível na musculação?', subtitle: 'Treino com pesos, aparelhos ou com o peso do corpo.' },
    experience: { title: 'Há quanto tempo você treina musculação?', reaction: 'Perfeito. Seu plano começa do básico, com exercícios simples e um vídeo de cada movimento.' },
    equipment: { title: 'Onde você vai treinar?' },
    bodyweight: {
      title: 'Quais destes exercícios você já consegue fazer?', subtitle: 'Pode marcar mais de um.', reaction: 'Sem problema. Vamos usar versões adaptadas, e você evolui no seu ritmo.',
      moves: [{ value: 'squat', label: 'Agachamento' }, { value: 'push_up', label: 'Flexão de braço', desc: 'Vale com os joelhos no chão' }, { value: 'pull_up', label: 'Barra fixa' }, { value: 'none', label: 'Nenhum ainda' }],
    },
    days: { title: 'Quantos dias por semana você consegue treinar?', subtitle: 'Pense na sua rotina real. Constância vale mais do que intensidade.', warning: 'Para quem está começando, 3 a 4 dias de musculação trazem o melhor resultado. Nos outros dias, incluímos cardio para acelerar seu progresso.' },
    duration: { title: 'Quanto tempo você tem para cada treino?', sub: ['Para o nível', 'recomendamos'], badge: 'Recomendado para você', desc: 'Ideal para o seu nível', options: [30, 45, 60, 90], levels: { beginner: 'iniciante', intermediate: 'intermediário', advanced: 'avançado' } },
    cardio: { title: 'Você faz algum exercício aeróbico?', subtitle: 'Como caminhada, corrida ou bike.', which: 'Qual?' },
    pain: {
      title: 'Você sente alguma dor ou tem alguma lesão?', no: 'Não', yes: 'Sim', where: 'Onde?', placeholder: 'Conte em poucas palavras',
      reaction: 'Vamos adaptar seu treino, não parar. Exercícios bem escolhidos ajudam na recuperação.', front: 'Frente', back: 'Costas',
    },
    health: {
      title: 'Alguma dessas situações se aplica a você hoje?', subtitle: 'Pode marcar mais de uma.',
      breastfeeding: 'Durante a amamentação, suas metas de alimentação não terão déficit de calorias. Converse com seu médico sobre o treino.',
      breastfeedingLose: 'Durante a amamentação, sua meta de calorias vai ficar igual ao que o seu corpo gasta, sem redução para perder peso. Quando essa fase passar, é só atualizar no Perfil. Converse com seu médico sobre o treino.',
      pregnantLose: 'Durante a gestação, sua meta de calorias vai ficar igual ao que o seu corpo gasta, sem redução para perder peso. Quando essa fase passar, é só atualizar no Perfil.',
    },
    focus: { title: 'Quer dar atenção especial a alguma parte do corpo?', subtitle: 'Pode marcar mais de uma.' },
    setup: { title: 'Como você quer montar seu treino?', locked: 'Indisponível para o seu quadro de saúde', badge: 'Recomendado' },
    // src/components/HealthClearanceSheets.tsx
    sheets: {
      ackTitle: 'Por segurança, fale com seu médico',
      ackBody: 'Com essa condição, o ideal é treinar com orientação de um médico ou profissional de educação física. Por isso, o plano de treino com IA fica indisponível para você. Você ainda pode montar seu treino ou importar o plano do seu profissional, e usar todo o restante do app.',
      ackButton: 'Entendi',
      lockedTitle: 'Plano com IA indisponível',
      lockedBody: 'Pelas suas respostas sobre saúde, o recomendado é treinar com orientação profissional. Você pode montar seu treino ou importar o plano do seu profissional. Se sua situação mudou, atualize suas respostas no Perfil.',
      lockedManual: 'Montar manualmente', lockedImport: 'Importar plano do profissional', lockedUpdate: 'Atualizar minhas respostas',
    },
    // src/onboarding/stepViews.tsx: confirmThen
    confirm: { fix: 'Corrigir', ok: 'Confirmar' },
    // src/onboarding/educational.ts
    edu: {
      button: 'Faz sentido',
      lose: { title: 'Musculação também emagrece', text: 'Músculo gasta energia até em repouso. Treinar força ajuda a perder gordura sem perder firmeza.', source: 'Fontes: Westcott, 2012; Colégio Americano de Medicina do Esporte (ACSM), 2026.', image: 'assets/edu/edu_perder_peso.webp', ratio: 1029 / 1372 },
      gain: { title: 'Não precisa treinar todo dia para crescer', text: 'Trabalhar cada músculo 2 vezes por semana já traz resultado. O descanso também faz o músculo crescer.', source: 'Fontes: Schoenfeld e colegas, 2016; Colégio Americano de Medicina do Esporte (ACSM), 2026.', image: 'assets/edu/edu_ganhar_massa.webp', ratio: 1029 / 1372 },
      health: { title: 'Poucos minutos já fazem diferença', text: 'Treinos curtos, feitos com constância, já melhoram força, disposição e saúde.', source: 'Fontes: Organização Mundial da Saúde, 2020; Colégio Americano de Medicina do Esporte (ACSM), 2026.', image: 'assets/edu/edu_saude.webp', ratio: 1029 / 1372 },
      muscle: { title: 'Comer pouco demais faz você perder músculo', text: 'A partir dos 30 anos, o corpo perde de 3% a 8% de músculo por década. Dietas muito restritivas aceleram essa perda e aumentam a flacidez. Para ganhar firmeza e definição, o corpo precisa de proteína ao longo do dia, sono de qualidade e treino. Uma única noite mal dormida já reduz em 18% a construção de músculo. É a rotina inteira que constrói o resultado.', source: 'Fontes: Volpi e colegas, 2004 · Morton e colegas, 2018 · Lamon e colegas, 2021 · ACSM, 2026.', image: 'assets/edu/edu_musculo.webp', ratio: 1029 / 823 },
    },
    // src/onboarding/stepViewsTreino.tsx
    trainingSummary: {
      title: 'Entendi seu treino', button: 'Esse é o meu treino', buttonManual: 'Continuar', perWeek: 'treinos por semana', locked: 'Ficha completa no seu plano', lockedManual: 'Exemplo de treino para o seu perfil',
      sets: 'séries', reps: 'repetições', protect: 'Adaptado para proteger seu', care: 'Cuidado com', noneInjury: 'Nenhuma', wholeBody: 'Corpo todo por igual', otherRegion: 'a região informada',
      rows: { level: 'Nível', place: 'Onde você treina', days: 'Dias por semana', duration: 'Duração do treino', focus: 'Foco', pain: 'Dores ou lesões' }, unanswered: 'Não respondido',
    },
    // src/onboarding/AdjustAnswers.tsx
    adjust: { button: 'Ajustar minhas respostas', title: 'Suas respostas' },
    // src/components/profileQuestions/alimentacaoQuestions.tsx
    meals: { title: 'Quantas refeições você costuma fazer por dia?', subtitle: 'Contando café da manhã, almoço, jantar e lanches.', unit: 'refeições' },
    diet: { title: 'Como é a sua alimentação?' },
    allergies: { title: 'Você tem alguma alergia ou intolerância alimentar?', subtitle: 'Pode marcar mais de uma.', note: 'Vamos evitar esses alimentos nas suas sugestões. Confira sempre o rótulo dos produtos.' },
    dislikes: { title: 'Tem algum alimento que você\nnão come de jeito nenhum?', subtitle: 'Pode marcar mais de um.', placeholder: 'Qual alimento?', skip: 'Pular' },
    places: { title: 'Onde você costuma fazer suas refeições?', subtitle: 'Pode marcar mais de um.' },
    cooking: { title: 'Quanto tempo você tem para cozinhar?' },
    kitchen: { title: 'O que você tem na sua cozinha?', subtitle: 'Pode marcar mais de um.', all: 'Tenho todos' },
    household: { title: 'Para quantas pessoas você cozinha?', subtitle: 'Ajuda a montar sua lista de compras.' },
    budget: { title: 'Como é o seu orçamento com comida?', reaction: 'Comer bem não precisa ser caro: arroz, feijão, ovo, frango, legumes e frutas da estação estão entre os alimentos mais completos e acessíveis.', source: 'Fonte: Guia Alimentar para a População Brasileira.' },
    mealSetup: { title: 'Como você quer montar suas refeições?', badge: 'Recomendado' },
    supplements: {
      title: 'Você toma algum suplemento ou\nmedicamento todos os dias?', reaction: 'Você poderá cadastrar e receber lembretes nos horários certos.',
      options: [{ value: 'supplements', label: 'Sim, suplementos', icon: 'flask-outline' }, { value: 'medications', label: 'Sim, medicamentos', icon: 'medkit-outline' }, { value: 'both', label: 'Os dois', icon: 'layers-outline' }, { value: 'none', label: 'Não', icon: 'close-circle-outline' }],
      short: { none: 'Não tomo', supplements: 'Suplementos', medications: 'Medicamentos', both: 'Suplementos e medicamentos' },
    },
    // src/onboarding/stepViewsAlimentacao.tsx
    energy: {
      title: 'Você sabe quantas calorias\nseu corpo gasta por dia?', button: 'Quero ver o meu', cardTitle: 'Seu corpo gasta energia o tempo todo', about: 'cerca de', caption: 'Médias para adultos.',
      parts: [
        { label: 'Em repouso', share: 0.7, note: 'respirar, pensar, o coração bater', color: '#8FD9AE' },
        { label: 'Digestão', share: 0.1, color: '#A78BFA' },
        { label: 'Movimento e treino', share: 0.2, color: '#3B82F6' },
      ],
      closing: {
        lose_weight: 'Comendo um pouco menos do que gasta, seu corpo usa a gordura guardada.',
        gain_muscle: 'Comendo um pouco mais, junto com o treino, a energia vira músculo.',
        maintain_weight: 'Comendo perto do que gasta, seu peso e sua energia ficam estáveis.',
        improve_health: 'Comendo perto do que gasta, seu peso e sua energia ficam estáveis.',
      },
      closingPregnant: 'Durante a gestação, comer o que seu corpo gasta mantém sua energia em dia.',
      closingBreastfeeding: 'Durante a amamentação, comer o que seu corpo gasta mantém sua energia em dia.',
    },
    reveal: {
      title: 'Suas metas de alimentação estão prontas', button: 'Quero essas metas', spend: 'Seu corpo gasta cerca de', basis: 'Com base no seu corpo e na sua rotina', goalPrefix: 'Sua meta:', water: 'Água', litersDay: 'L por dia',
      cups: 'copos de 250 ml', every: ['1 a cada', 'das', 'às'], how: 'Como calculamos', reach: 'Para chegar a', keep: 'Para manter', health: 'Para cuidar da sua saúde', pregnant: 'Durante a gestação', breast: 'Durante a amamentação',
      same: 'Igual ao seu gasto', samePhaseLose: 'Igual ao seu gasto. Nesta fase, não reduzimos calorias para perder peso.', samePhase: 'Igual ao seu gasto. Nessa fase, suas metas não terão redução de calorias.',
      lessA: 'kcal a menos que o seu gasto', moreA: 'kcal a mais que o seu gasto', below: 'abaixo', above: 'acima', protein: 'Proteína', carbs: 'Carboidratos', fat: 'Gorduras',
      howTitle: 'Como calculamos', howClose: 'Entendi',
      howItems: [
        ['flame-outline', 'Gasto do dia: fórmula de Mifflin-St Jeor, com o seu peso, altura, idade e sexo, multiplicada pelo seu nível de atividade. Numa revisão da Academy of Nutrition and Dietetics, foi a fórmula mais precisa para estimar o gasto em repouso (Frankenfield e colegas, 2005).'],
        ['locate-outline', 'Meta: parte do gasto e segue o ritmo que você escolheu. Nunca fica abaixo do que o seu corpo gasta em repouso.'],
        ['nutrition-outline', 'Macros: proteína de 1,6 g por kg (2,0 g para ganhar massa), gorduras em 25% das calorias e carboidratos no restante.'],
        ['water-outline', 'Água: 35 ml por kg, com mínimo de 2 L para mulheres e 2,5 L para homens (Autoridade Europeia de Segurança Alimentar, 2010), mais a reposição do treino recomendada pelo Colégio Americano de Medicina do Esporte (2007).'],
      ],
    },
    foodSummary: {
      button: 'Esse é o meu dia', titleAuto: 'Seu cardápio está pronto', subtitleAuto: 'Montado para o seu objetivo, com a comida que você já come', titleOther: 'Montamos o seu dia de alimentação',
      drink: ['Beber', 'L de água', 'por dia'], consume: ['Consumir', 'kcal', 'por dia'], yourMeals: 'Suas refeições', mealsNote: 'Horários sugeridos pela sua rotina de sono', plateTitle: 'Como montar seu prato', nutritionist: 'Você vai importar o plano do seu nutricionista.',
      lockedNote: 'Os outros dias ficam disponíveis quando você começar seu plano.', kcalProtein: ['kcal ·', 'g de proteína'],
      plateNames: ['Legumes e\nverduras', 'Carboidrato', 'Proteína'],
      placeShort: { home: 'em casa', packed: 'marmita', restaurant: 'restaurante ou por quilo', delivery: 'lanchonete ou delivery' },
      rows: { setup: 'Como montar as refeições', meals: 'Refeições por dia', diet: 'Tipo de alimentação', allergies: 'Alergias e intolerâncias', dislikes: 'Alimentos que não come', places: 'Onde come', cooking: 'Tempo para cozinhar', budget: 'Orçamento' },
      none: 'Nenhuma', noneM: 'Nenhum',
    },
    // Desenho e rotulos do prato: src/onboarding/stepViewsAlimentacao.tsx (PLATES); textos em calculos.js (plates.ts).
    plates: {
      standard: {
        meat: { src: 'assets/pratos/prato_padrao.webp', lines: [[53, 8, 42, 92], [47.8, 50, 93, 53]], labels: [{ left: '12%', top: '42%' }, { right: '9%', top: '28%' }, { right: '13%', top: '66%' }] },
        veg: { src: 'assets/pratos/prato_padrao_veg.webp', lines: [[51, 6, 48, 94], [49.5, 51, 94, 52]], labels: [{ left: '12%', top: '42%' }, { right: '9%', top: '26%' }, { right: '12%', top: '66%' }] },
      },
      athlete: {
        meat: { src: 'assets/pratos/prato_massa.webp', lines: [[48, 57, 51, 6], [48, 57, 8, 72], [48, 57, 94, 62]], labels: [{ left: '14%', top: '30%' }, { right: '12%', top: '28%' }, { left: '38%', top: '72%' }] },
        veg: { src: 'assets/pratos/prato_massa_veg.webp', lines: [[50, 52, 51, 6], [50, 52, 35, 92], [50, 52, 94, 55]], labels: [{ left: '10%', top: '45%' }, { right: '10%', top: '25%' }, { right: '14%', top: '68%' }] },
      },
    },
    // src/onboarding/stepViewsPlano.tsx
    howItWorks: {
      title: 'Como o Tribbo Fit funciona no seu dia', subtitle: 'Treino, alimentação, sono e hidratação, tudo junto', button: 'Vamos começar',
      moments: [
        { when: 'Manhã', text: 'Check-in do dia em 1 minuto', icon: 'sunny-outline' },
        { when: 'Nas refeições', text: 'Registre o que comeu com uma foto', image: 'assets/registro_cal.webp' },
        { when: 'No treino', text: 'Vídeo de cada exercício, no seu nível', icon: 'barbell-outline' },
        { when: 'À noite', text: 'Veja seu Tribbo Score e sua evolução', rise: true },
        { when: 'Lembretes inteligentes', text: 'Te avisamos na hora certa', icon: 'notifications-outline', reminders: true },
      ],
      reminders: [['checkmark-done-outline', 'Check-in'], ['water-outline', 'Água'], ['restaurant-outline', 'Refeições'], ['barbell-outline', 'Treino'], ['medkit-outline', 'Remédios']],
    },
    obstacle: { title: 'O que mais pode te atrapalhar desta vez?' },
    notifications: {
      titleForget: 'Vamos te lembrar na hora certa', title: 'Quer lembretes na hora certa?', subtitle: 'Constância é o que traz resultado, e os lembretes ajudam a manter sua rotina. Você escolhe o que recebe e muda quando quiser no Perfil.',
      activate: 'Ativar lembretes', later: 'Agora não', app: 'Tribbo Fit', now: 'agora', push: ['Hora da água: um copo agora e você fica mais perto da sua meta de', 'L'],
    },
    commitment: {
      title: 'Topa fazer o que for preciso pelo seu objetivo?', body: ['Eu', 'assumo um compromisso comigo: cuidar da minha rotina, um dia de cada vez, e fazer o que for preciso para chegar ao meu objetivo.'],
      hint: 'Toque e segure o logo do Tribbo Fit para assumir seu compromisso', hold: 'Segure firme', almost: 'Quase lá', done: 'Compromisso assumido',
    },
    building: {
      calc: 'Calculando suas metas de calorias', workoutSerious: 'Preparando seu treino', workout: 'Escolhendo exercícios para o seu nível', adapt: 'Adaptando ao cuidado com', meals: 'Preparando sugestões de refeições', day: 'Organizando o seu dia', ready: 'Tudo pronto!',
    },
    summary: {
      button: 'Quero meu plano', ready: 'seu plano está pronto', readyNoName: 'Seu plano está pronto', noPlan: 'tudo pronto para começar', noPlanNoName: 'Tudo pronto para começar',
      yourTraining: 'Seu treino', manual: 'Você vai montar seu treino na biblioteca de exercícios', other: 'Monte seu treino ou importe o do seu profissional', perWeek: 'x por semana', food: 'Alimentação', kcalDay: 'kcal por dia', todayMenu: 'Hoje no seu cardápio',
      waterLabel: 'de água por dia', sleepLabel: ['de sono, dormindo às'], benefits: 'Benefícios do seu plano', basis: 'Baseado nas diretrizes do ACSM (2026) e no Guia Alimentar para a População Brasileira.',
      wholeBody: 'Corpo inteiro', goalRow: 'Objetivo', goalReach: ['Chegar a', 'kg até'], goalHealth: 'Cuidar da saúde e da disposição', goalKeep: ['Manter', 'kg com mais energia'],
      rows: { weight: 'Peso atual', days: 'Dias por semana', duration: 'Duração do treino', focus: 'Foco', meals: 'Refeições por dia', supplements: 'Suplementos e remédios', sleep: 'Sono' },
    },
    // So na web: formulario depois do resultado. Visual apenas, nao envia nada.
    leadForm: {
      title: 'Falta pouco para começar', subtitle: 'Deixe seu contato para continuar.', name: 'Nome', email: 'E-mail', whatsapp: 'WhatsApp',
      button: 'Continuar para o pagamento', soon: 'Pagamento em breve', privacy: 'Nesta versão, nada é enviado nem guardado: suas respostas ficam só nesta página e somem ao fechar.',
    },
    // Termos e privacidade: mesmos enderecos de src/utils/legalLinks.ts, no proprio site.
    links: { terms: '/termos/', privacy: '/privacidade/' },
  };

  // ==== Graficos (src/onboarding/charts.tsx): curvas ilustrativas ====
  TF.CHART = {
    yoyoDiet: [100, 90, 102, 90.5, 105, 91, 108], yoyoBottoms: [1, 3, 5], yoyoPeaks: [2, 4, 6],
    yoyoRoutine: [100, 98, 96.4, 95.2, 94.4, 94, 93.8], yoyoRoutineDots: [0, 2, 4, 6], yoyoDomain: [85, 110],
    scoreWith: [30, 34, 33, 41, 49, 47, 55, 58, 67, 64, 76, 90], scoreWithout: [42, 41, 39, 36, 32, 27, 22, 17, 12, 7, 3, 0],
  };

  // ==== Boneco (src/components/profileQuestions/BodyMap.tsx) ====
  TF.INJURY_BODY_MAP = { knee: ['knees'], lower_back: ['lower-back'], shoulder: ['deltoids'], hip: ['gluteal', 'adductors'] };
  TF.FOCUS_BODY_MAP = {
    glutes_legs: ['gluteal', 'quadriceps', 'hamstring', 'calves', 'adductors'], core: ['abs', 'obliques'], back_biceps: ['upper-back', 'trapezius', 'biceps'],
    chest_triceps: ['chest', 'triceps'], shoulders_arms: ['deltoids', 'biceps', 'triceps', 'forearm'],
  };
  TF.FOCUS_TAP_OWNER = { biceps: 'back_biceps', triceps: 'chest_triceps', forearm: 'shoulders_arms', deltoids: 'shoulders_arms' };

  // ==== Tema (src/theme/colors.ts) usado nos desenhos em SVG; o resto esta em style.css ====
  TF.C = {
    bg: '#07161B', teal: '#E2F408', tealLt: '#EDFB6B', tealPale: '#F5FCB8', tealGrad: '#B5C904', onAccent: '#0A0A0A', t1: '#FFFFFF', t2: '#8A9A96', t3: '#6B8880',
    icon: 'rgba(255,255,255,0.85)', amber: '#F59E0B', bodyInjury: '#E88C8C', bodyFocus: '#86CF9E', macroProtein: '#A78BFA', macroCarbs: '#F59E0B', macroFat: '#FDE047', water: '#3B82F6',
    pastelGreen: '#8FD9AE', gold: '#F5B301', verified: '#1877F2', bmi: ['#4C8DF6', '#34C77B', '#F5C542', '#EF5350'], barGreen: '#34C77B', barBlue: '#4C8DF6', barYellow: '#F5C542',
  };
})();
