// Calculos do quiz. Funcoes puras copiadas do app (repositorio Kora), sem alteracao de logica:
// cada bloco diz de qual arquivo veio. Nada aqui chama servidor, IA ou servico externo.
// Para manter igual ao app: se o arquivo citado mudar la, copie a mudanca para o bloco correspondente.
window.TF = window.TF || {};

// ==== Copiado de src/utils/energy.ts ====
(function () {
// Gasto de energia: taxa basal (Mifflin-St Jeor) e fator de atividade.
// Fonte única para utils/nutrition.ts (sugestão do plano manual) e para as
// metas do onboarding v2 (onboarding/nutritionCalc.ts). Funções puras, sem
// import, testadas no Deno (supabase/tests/onboardingCalc.test.ts).

/** 'male' e 'female' como no perfil; qualquer outro valor vira 'unknown'. */
function sexOf(gender) {
  return gender === 'male' ? 'male' : gender === 'female' ? 'female' : 'unknown';
}

/**
 * Taxa metabólica basal, Mifflin-St Jeor (1990). "Prefiro não informar" usa a
 * média das duas equações (+5 e -161 → -78).
 */
function mifflinStJeor(sex, weightKg, heightCm, age) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return base + (sex === 'male' ? 5 : sex === 'female' ? -161 : -78);
}

/** Fator de atividade por profiles.activity_level (e o activity_type antigo 'active'). */
const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const DEFAULT_ACTIVITY_FACTOR = 1.375;

function activityFactor(level) {
  return (level && ACTIVITY_FACTORS[level]) || DEFAULT_ACTIVITY_FACTOR;
}

/** IMC acima do qual a proteína usa o peso ajustado (decisão de 28/09/2026). */
const ADJUSTED_WEIGHT_BMI = 30;
/** Parte do excesso sobre o peso de IMC 25 que entra no peso ajustado. */
const ADJUSTED_WEIGHT_EXCESS_SHARE = 0.4;

/**
 * Peso para a meta de proteína: o atual até IMC 30; acima disso, o peso
 * ajustado (peso de IMC 25 + 40% do excesso), para a proteína não passar de
 * um terço das calorias em quem tem mais peso. Regra em docs/ciencia/metas.md.
 */
function proteinWeightKg(weightKg, heightCm) {
  if (!heightCm || heightCm <= 0) return weightKg;
  const h = heightCm / 100;
  if (weightKg / (h * h) <= ADJUSTED_WEIGHT_BMI) return weightKg;
  const ref = 25 * h * h;
  return ref + ADJUSTED_WEIGHT_EXCESS_SHARE * (weightKg - ref);
}
Object.assign(TF, { sexOf, mifflinStJeor, ACTIVITY_FACTORS, DEFAULT_ACTIVITY_FACTOR, activityFactor, ADJUSTED_WEIGHT_BMI, ADJUSTED_WEIGHT_EXCESS_SHARE, proteinWeightKg });
})();

// ==== Copiado de src/constants/meals.ts ====
(function () {
// Mapa único das refeições (28/09/2026): códigos, nomes, ordem, horário padrão
// e divisão da meta do dia. Usado pela tela 42 (nutritionCalc.mealPlan), pelo
// Montar refeições, pelo modelo de refeições, pela busca de alimentos e pelas
// refeições automáticas do fim do onboarding. Regra da divisão e dos horários
// em docs/ciencia/metas.md. Puro, sem import (testado em
// supabase/tests/onboardingCalc.test.ts).

const MEAL_TYPE_INFO = {
  breakfast: { label: 'Café da manhã',     time: '07:00', icon: 'sunny-outline' },
  morning_snack: { label: 'Lanche da manhã',   time: '10:00', icon: 'cafe-outline' },
  lunch: { label: 'Almoço',            time: '12:30', icon: 'restaurant-outline' },
  afternoon_snack: { label: 'Lanche da tarde',   time: '15:00', icon: 'nutrition-outline' },
  afternoon_snack2: { label: 'Lanche da tarde 2', time: '17:00', icon: 'nutrition-outline' },
  dinner: { label: 'Jantar',            time: '19:00', icon: 'moon-outline' },
  supper: { label: 'Ceia',              time: '21:30', icon: 'bed-outline' },
};

/** Refeições do dia por quantidade (tela 30), em ordem de horário. */
const MEAL_TYPES_BY_COUNT = {
  2: ['lunch', 'dinner'],
  3: ['breakfast', 'lunch', 'dinner'],
  4: ['breakfast', 'lunch', 'afternoon_snack', 'dinner'],
  5: ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner'],
  6: ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'supper'],
  7: ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'afternoon_snack2', 'dinner', 'supper'],
};

/**
 * Parte da meta do dia (kcal e proteína) de cada refeição, na mesma ordem.
 * O almoço é a maior (hábito brasileiro); lanches entre 10% e 15%.
 */
const MEAL_SHARES = {
  2: [0.55, 0.45],
  3: [0.25, 0.40, 0.35],
  4: [0.25, 0.35, 0.15, 0.25],
  5: [0.20, 0.10, 0.30, 0.15, 0.25],
  6: [0.20, 0.10, 0.30, 0.10, 0.20, 0.10],
  7: [0.15, 0.10, 0.25, 0.10, 0.10, 0.20, 0.10],
};

const MEAL_OPTIONS = [2, 3, 4, 5, 6, 7];

/** Quantidade de 2 a 7; fora disso, 3. */
function mealCodesFor(count) {
  return MEAL_TYPES_BY_COUNT[count ?? 3] ?? MEAL_TYPES_BY_COUNT[3];
}

function mealSharesFor(count) {
  return MEAL_SHARES[count ?? 3] ?? MEAL_SHARES[3];
}

/** Nomes por quantidade (derivado dos códigos). */
const MEAL_NAMES = Object.fromEntries(
  MEAL_OPTIONS.map((n) => [n, MEAL_TYPES_BY_COUNT[n].map((c) => MEAL_TYPE_INFO[c].label)]),
);

/** Horário padrão por nome (sem os horários de sono da tela 16). */
const DEFAULT_MEAL_TIMES = Object.fromEntries(
  (Object.keys(MEAL_TYPE_INFO)).map((c) => [MEAL_TYPE_INFO[c].label, MEAL_TYPE_INFO[c].time]),
);

const MEAL_COUNT_LABELS = {
  2: { label: '2 refeições', desc: 'Almoço e jantar' },
  3: { label: '3 refeições', desc: 'Café da manhã, almoço e jantar' },
  4: { label: '4 refeições', desc: '+ lanche da tarde' },
  5: { label: '5 refeições', desc: '+ lanche da manhã e lanche da tarde' },
  6: { label: '6 refeições', desc: '+ lanche da manhã, lanche da tarde e ceia' },
  7: { label: '7 refeições', desc: '+ lanche da manhã, dois lanches da tarde e ceia' },
};

const strip = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/**
 * Código da refeição pelo nome: os nomes do app e os antigos ("Café"), e os
 * que vêm do PDF do nutricionista (texto livre: "Desjejum", "Colação",
 * "Lanche", "Merenda"...). null quando não dá para saber.
 */
function mealCodeFromName(name) {
  const n = strip(name ?? '');
  if (!n) return null;
  const exact = (Object.keys(MEAL_TYPE_INFO)).find((c) => strip(MEAL_TYPE_INFO[c].label) === n);
  if (exact) return exact;
  if (/ceia/.test(n)) return 'supper';
  if (/jantar|janta/.test(n)) return 'dinner';
  if (/almoco/.test(n)) return 'lunch';
  if (/cafe|desjejum/.test(n)) return 'breakfast';
  if (/colacao|lanche da manha|lanche manha|meio da manha/.test(n)) return 'morning_snack';
  if (/lanche|merenda|pre[- ]?treino|pos[- ]?treino/.test(n)) return 'afternoon_snack';
  return null;
}

/**
 * Marca de refeição dos alimentos (foods.meal_tags, meal_templates) para um
 * código: o segundo lanche da tarde usa a do lanche da tarde.
 */
function mealTagFor(code) {
  if (!code) return null;
  return code === 'afternoon_snack2' ? 'afternoon_snack' : code;
}
Object.assign(TF, { MEAL_TYPE_INFO, MEAL_TYPES_BY_COUNT, MEAL_SHARES, MEAL_OPTIONS, mealCodesFor, mealSharesFor, MEAL_NAMES, DEFAULT_MEAL_TIMES, MEAL_COUNT_LABELS, mealCodeFromName, mealTagFor });
})();

// ==== Copiado de src/onboarding/calc.ts ====
(function () {
// Cálculos do onboarding v2 (docs/onboarding/SPEC_ONBOARDING_V2.md, seção 3):
// IMC, meta de peso, ritmo, data da meta e projeção. Funções puras, sem
// import nenhum, para rodar também no Deno (supabase/tests/onboardingCalc.test.ts).
// Pesos em kg, alturas em cm, taxas como fração do peso por semana (0,005 = 0,5%).

/** IMC abaixo disso fica fora da faixa saudável (OMS). */
const MIN_HEALTHY_BMI = 18.5;
/** Teto de perda ou ganho por semana, inclusive na data escolhida. */
const MAX_WEEKLY_RATE = 0.01;
/** Perda acima disso do peso atual: frase de meta ambiciosa. */
const BIG_LOSS_FRACTION = 0.15;
/** Na manutenção, a projeção oscila dentro desta faixa. */
const MAINTAIN_BAND_KG = 1;

// Helms e colegas, 2014: perda de 0,5% a 1% do peso por semana preserva massa magra.
const PACE_RATES = {
  lose: { slow: 0.0025, recommended: 0.005, fast: 0.0075 },
  gain: { slow: 0.0015, recommended: 0.0025, fast: 0.005 },
};

const DAY_MS = 24 * 60 * 60 * 1000;

function bmi(weightKg, heightCm) {
  if (!(weightKg > 0) || !(heightCm > 0)) return 0;
  return weightKg / Math.pow(heightCm / 100, 2);
}

/** 27.43 → "27,4". */
function formatBmi(value) {
  return value.toFixed(1).replace('.', ',');
}

/** Menor peso inteiro com IMC de 18,5 ou mais para a altura. */
function minHealthyWeight(heightCm) {
  return Math.ceil(MIN_HEALTHY_BMI * Math.pow(heightCm / 100, 2));
}

/** Direção da meta de peso. Sem meta, ou meta igual ao peso atual, é manutenção. */
function weightDirection(currentKg, targetKg) {
  if (targetKg == null || !(targetKg > 0)) return 'maintain';
  if (targetKg < currentKg) return 'lose';
  if (targetKg > currentKg) return 'gain';
  return 'maintain';
}

/**
 * Problema que bloqueia a meta de peso, ou null. Perder peso pede meta menor
 * que o peso atual; ganhar massa, maior. Qualquer objetivo bloqueia meta com
 * IMC abaixo de 18,5.
 */
function targetWeightIssue(p

 ) {
  if (p.goal === 'lose_weight' && !(p.targetKg < p.currentKg)) return { kind: 'wrong_direction', goal: 'lose_weight' };
  if (p.goal === 'gain_muscle' && !(p.targetKg > p.currentKg)) return { kind: 'wrong_direction', goal: 'gain_muscle' };
  const minKg = minHealthyWeight(p.heightCm);
  if (p.targetKg < minKg) return { kind: 'below_healthy', minKg };
  return null;
}

/** Percentual inteiro do peso atual que a meta representa (8 = 8%). */
function lossPercent(currentKg, targetKg) {
  return Math.round(((currentKg - targetKg) / currentKg) * 100);
}

/** Taxa semanal (fração do peso atual) de um ritmo pronto. */
function paceRate(direction, pace) {
  if (direction === 'maintain') return 0;
  return PACE_RATES[direction][pace];
}

/** kg por semana no ritmo, com uma casa decimal. */
function weeklyKg(currentKg, rate) {
  return Math.round(currentKg * rate * 10) / 10;
}

/** Semanas até a meta: diferença de peso ÷ (peso × % semanal). */
function weeksToGoal(currentKg, targetKg, rate) {
  if (!(rate > 0)) return 0;
  return Math.abs(currentKg - targetKg) / (currentKg * rate);
}

/** Data da meta no ritmo, a partir de `start` (dia inteiro, arredondado para cima). */
function targetDateFor(start, currentKg, targetKg, rate) {
  // Arredonda o ruído de ponto flutuante antes do teto (140,0000001 não vira 141).
  const days = Math.ceil(Math.round(weeksToGoal(currentKg, targetKg, rate) * 7 * 1e6) / 1e6);
  return addDays(start, days);
}

/** Taxa semanal que uma data escolhida exige. Data de hoje ou passada: infinito. */
function requiredRate(start, date, currentKg, targetKg) {
  const weeks = daysBetween(start, date) / 7;
  if (weeks <= 0) return Infinity;
  return Math.abs(currentKg - targetKg) / currentKg / weeks;
}

/**
 * Data escolhida pela pessoa. Acima de 1% por semana não vale: devolve a data
 * segura mais próxima (a do teto de 1%).
 */
function checkCustomDate(start, date, currentKg, targetKg)
 {
  if (requiredRate(start, date, currentKg, targetKg) <= MAX_WEEKLY_RATE) return { ok: true };
  return { ok: false, safeDate: targetDateFor(start, currentKg, targetKg, MAX_WEEKLY_RATE) };
}

/**
 * Pontos da linha da projeção, de `count` pontos (t de 0 a 1). Perda e ganho
 * andam mais rápido no começo e desaceleram perto da meta. Manutenção fica
 * dentro de ±1 kg, com uma oscilação leve.
 */
function projectionPoints(currentKg, targetKg, count = 12) {
  const n = Math.max(2, count);
  const dir = weightDirection(currentKg, targetKg);
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    if (dir === 'maintain' || targetKg == null) {
      return { t, kg: currentKg + Math.sin(t * Math.PI * 3) * MAINTAIN_BAND_KG * 0.5 };
    }
    const eased = 1 - Math.pow(1 - t, 1.6);
    return { t, kg: currentKg + (targetKg - currentKg) * eased };
  });
}

/** Idade em anos completos na data `today`. `birthIso` = "aaaa-mm-dd". */
function ageOn(birthIso, today) {
  const [y, m, d] = birthIso.split('-').map(Number);
  let age = today.getFullYear() - y;
  const beforeBirthday = today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

const MIN_AGE_NEW_ACCOUNT = 18;

function isAdult(birthIso, today) {
  return ageOn(birthIso, today) >= MIN_AGE_NEW_ACCOUNT;
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** "14 de dezembro"; com o ano quando não é o ano de `today`. */
function formatDateLong(date, today) {
  const base = `${date.getDate()} de ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === today.getFullYear() ? base : `${base} de ${date.getFullYear()}`;
}

/** Date → "aaaa-mm-dd" no fuso local. */
function toIsoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** "aaaa-mm-dd" → Date ao meio-dia local (sem escorregar de dia no fuso). */
function fromIsoDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

/** 72 → "72", 72.5 → "72,5". */
function formatKg(kg) {
  const r = Math.round(kg * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1).replace('.', ',');
}

/** Contagem ao vivo já arredondada: 4200 → "4.200". */
function formatThousands(n) {
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function addDays(date, days) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(a, b) {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / DAY_MS);
}

/** Faixa do IMC (OMS): abaixo de 18,5; até 24,9; até 29,9; 30 ou mais. */
function bmiBand(value) {
  if (value < MIN_HEALTHY_BMI) return 'below';
  if (value < 25) return 'healthy';
  if (value < 30) return 'above';
  return 'well_above';
}

/** Dias inteiros de `start` até `date`. */
function daysUntil(start, date) {
  return daysBetween(start, date);
}

/** Horas de sono entre dormir e acordar ("HH:mm"), atravessando a meia-noite. */
function sleepHours(bedtime, waketime) {
  const [bh, bm] = bedtime.split(':').map(Number);
  const [wh, wm] = waketime.split(':').map(Number);
  let minutes = (wh * 60 + wm) - (bh * 60 + bm);
  if (minutes <= 0) minutes += 24 * 60;
  return minutes / 60;
}

/** Na meta = até 30 min para mais ou para menos. */
function sleepVsGoal(hours, goalHours) {
  if (hours < goalHours - 0.5) return 'below';
  if (hours > goalHours + 0.5) return 'above';
  return 'on_goal';
}

/**
 * Diferença, em minutos, entre dois horários de acordar ("HH:mm"), pelo
 * caminho mais curto no relógio (06:30 e 09:00 = 150; 23:30 e 00:30 = 60).
 */
function wakeDiffMinutes(a, b) {
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const d = Math.abs(toMin(a) - toMin(b));
  return Math.min(d, 24 * 60 - d);
}

/** Acordar com mais de 1 h de diferença no fim de semana: mostra a dica de regularidade. */
const WAKE_REGULARITY_LIMIT_MIN = 60;
Object.assign(TF, { MIN_HEALTHY_BMI, MAX_WEEKLY_RATE, BIG_LOSS_FRACTION, MAINTAIN_BAND_KG, PACE_RATES, bmi, formatBmi, minHealthyWeight, weightDirection, targetWeightIssue, lossPercent, paceRate, weeklyKg, weeksToGoal, targetDateFor, requiredRate, checkCustomDate, projectionPoints, ageOn, MIN_AGE_NEW_ACCOUNT, isAdult, formatDateLong, toIsoDate, fromIsoDate, formatKg, formatThousands, bmiBand, daysUntil, sleepHours, sleepVsGoal, wakeDiffMinutes, WAKE_REGULARITY_LIMIT_MIN });
})();

// ==== Copiado de src/utils/calcAge.ts ====
(function () {
function calcAge(birthDate) {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}
Object.assign(TF, { calcAge });
})();

// ==== Copiado de src/utils/profileValidation.ts ====
(function () {
// Validação dos dados corporais e da data de nascimento : uma regra só pro
// onboarding e pro EditProfile. Faixas decididas em 21/09/2026 depois de o
// backfill da meta de água expor pesos de 1,6 kg e 9.950 kg, alturas em
// metros ("1.70") e datas de nascimento no futuro (7971) no perfil.
//
// Duas camadas: BLOQUEIO (fora da faixa possível) e CONFIRMAÇÃO (incomum mas
// possível : pergunta "Confirma X?" em vez de travar).

const { calcAge } = TF;

const MIN_WEIGHT_KG = 30;
const MAX_WEIGHT_KG = 300;
const CONFIRM_WEIGHT_KG = 200;

const MIN_HEIGHT_CM = 100;
const MAX_HEIGHT_CM = 250;
const CONFIRM_HEIGHT_CM = 210;

const MIN_AGE = 16;
const MAX_AGE = 100;

const WEIGHT_ERROR = 'Confira seu peso. Use um valor entre 30 e 300 kg.';
const HEIGHT_ERROR = 'Confira sua altura em centímetros. Use um valor entre 100 e 250.';
const BIRTH_DATE_ERROR = 'Confira sua data de nascimento.';
const UNDER_AGE_ERROR = 'Você precisa ter pelo menos 16 anos para usar o Tribbo.';

function isPlausibleWeight(kg) {
  return kg >= MIN_WEIGHT_KG && kg <= MAX_WEIGHT_KG;
}

function isPlausibleHeight(cm) {
  return cm >= MIN_HEIGHT_CM && cm <= MAX_HEIGHT_CM;
}

/**
 * Altura digitada em metros ("1.70", "1,7") vira centímetros ao sair do
 * campo. 51 dos 61 perfis com altura fora da faixa em PROD eram exatamente
 * isso. Fora de 1,0:2,6 devolve o valor como veio.
 */
function normalizeHeightCm(value) {
  return value >= 1 && value <= 2.6 ? Math.round(value * 100) : value;
}

/** Máscara dd/mm/aaaa: só dígitos, barras automáticas. */
function formatBirthDate(text) {
  const digits = text.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4, 8);
}

/** "dd/mm/aaaa" → "aaaa-mm-dd", ou null se incompleta. Não valida. */
function birthDateToISO(str) {
  const parts = str.split('/');
  if (parts.length !== 3 || parts[2].length !== 4) return null;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

/**
 * Mensagem de erro da data de nascimento, ou null se válida. Cobre: incompleta,
 * inexistente no calendário (31/02, 29/02 em ano não bissexto, mês 13, dia
 * 32), futura, mais de 100 anos, e menos de 16 anos (mensagem própria).
 * `''` (vazia) devolve null: campo ainda não tocado não mostra erro.
 */
function birthDateError(str) {
  if (str.length === 0) return null;
  if (str.length !== 10) return BIRTH_DATE_ERROR;
  const parts = str.split('/');
  if (parts.length !== 3 || parts[2].length !== 4) return BIRTH_DATE_ERROR;
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const y = parseInt(parts[2], 10);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return BIRTH_DATE_ERROR;
  const date = new Date(y, m - 1, d);
  const exists = date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  if (!exists) return BIRTH_DATE_ERROR;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (date > today) return BIRTH_DATE_ERROR;
  const age = calcAge(birthDateToISO(str) );
  if (age > MAX_AGE) return BIRTH_DATE_ERROR;
  if (age < MIN_AGE) return UNDER_AGE_ERROR;
  return null;
}

function isValidBirthDate(str) {
  return str.length === 10 && birthDateError(str) === null;
}

/**
 * Valores incomuns mas possíveis: texto do "Confirma …?" ou null.
 * Só faz sentido chamar com valores já dentro das faixas de bloqueio.
 */
function bodyDataConfirmation(v) {
  const parts = [];
  if (v.weight !== undefined && v.weight > CONFIRM_WEIGHT_KG) parts.push(`${fmtKg(v.weight)} kg de peso`);
  if (v.targetWeight !== undefined && v.targetWeight > CONFIRM_WEIGHT_KG) parts.push(`${fmtKg(v.targetWeight)} kg de meta`);
  if (v.height !== undefined && v.height > CONFIRM_HEIGHT_CM) parts.push(`${Math.round(v.height)} cm de altura`);
  if (parts.length === 0) return null;
  return `Confirma ${parts.join(', ')}?`;
}

function fmtKg(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// Meta de água ajustada no lápis do card : mesma faixa do cálculo pelo peso.
const WATER_GOAL_ERROR = 'Confira sua meta. Use um valor entre 1000 e 6000 ml.';
Object.assign(TF, { MIN_WEIGHT_KG, MAX_WEIGHT_KG, CONFIRM_WEIGHT_KG, MIN_HEIGHT_CM, MAX_HEIGHT_CM, CONFIRM_HEIGHT_CM, MIN_AGE, MAX_AGE, WEIGHT_ERROR, HEIGHT_ERROR, BIRTH_DATE_ERROR, UNDER_AGE_ERROR, isPlausibleWeight, isPlausibleHeight, normalizeHeightCm, formatBirthDate, birthDateToISO, birthDateError, isValidBirthDate, bodyDataConfirmation, WATER_GOAL_ERROR });
})();

// ==== Copiado de src/utils/seriousCondition.ts ====
(function () {
// Condições de saúde que exigem liberação médica antes de qualquer plano de
// treino. Espelho de supabase/functions/_shared/seriousCondition.ts (Deno não
// importa de src/) : se mudar um, mudar o outro. A edge function
// generate-workout-plan usa a mesma lista pra recusar a geração
// (status needs_clearance), e o app usa aqui pra avisar no momento da
// resposta e pra travar a opção de IA.
//
// As respostas do questionário vão TODAS pra profiles.physical_restrictions
// (as colunas has_serious_condition/serious_conditions nunca foram escritas
// por nenhuma tela). A checagem cobre as três fontes por segurança.

const SERIOUS_CONDITIONS = [
  'surgery',
  'acute_pain',
  'heart_disease',
  'uncontrolled_hypertension',
  'pregnant',
];

/** Rótulos do questionário, pra citar no aviso e no evento. */
const SERIOUS_CONDITION_LABELS = {
  surgery:                   'Cirurgia recente',
  acute_pain:                'Dor aguda ou lesão ativa',
  heart_disease:             'Cardiopatia diagnosticada',
  uncontrolled_hypertension: 'Hipertensão não controlada',
  pregnant:                  'Gestante',
};

function isSeriousCondition(value) {
  return (SERIOUS_CONDITIONS).includes(value);
}

/** Condições graves presentes numa lista de restrições. */
function seriousConditionsIn(values) {
  return (values ?? []).filter(isSeriousCondition);
}

/**
 * Regra única do app: este perfil precisa de liberação médica?
 * Usada pra travar a geração/ativação de plano com IA e pra esconder o
 * banner do plano guardado. Manual e PDF seguem liberados.
 */
function hasSeriousCondition(profile) {
  if (!profile) return false;
  if (profile.has_serious_condition === true) return true;
  if (seriousConditionsIn(profile.serious_conditions).length > 0) return true;
  return seriousConditionsIn(profile.physical_restrictions).length > 0;
}

/** Condições graves do perfil, pra citar no aviso e no evento. */
function profileSeriousConditions(profile) {
  if (!profile) return [];
  const all = new Set                  ([
    ...seriousConditionsIn(profile.physical_restrictions),
    ...seriousConditionsIn(profile.serious_conditions),
  ]);
  return [...all];
}
Object.assign(TF, { SERIOUS_CONDITIONS, SERIOUS_CONDITION_LABELS, isSeriousCondition, seriousConditionsIn, hasSeriousCondition, profileSeriousConditions });
})();

// ==== Copiado de src/utils/goal.ts ====
(function () {
// Objetivo do perfil (`profiles.goal`). Os valores canônicos são os do
// onboarding atual; versões antigas do app gravaram rótulos em português,
// e 283 perfis em PROD ainda estão assim (21/09/2026). Como o cálculo de
// calorias faz `switch (goal)`, um valor legado cai no default (TDEE de
// manutenção) mesmo pra quem quer emagrecer : por isso toda leitura de
// objetivo passa por aqui.
//
// Espelhado em supabase/functions/_shared/goal.ts (Deno não importa de src/).
// Se mudar um, mudar o outro.

const LEGACY_GOALS = {
  'emagrecer':     'lose_weight',
  'perder peso':   'lose_weight',
  'ganhar massa':  'gain_muscle',
  'ganhar músculo': 'gain_muscle',
  'manter peso':   'maintain_weight',
  'manter saúde':  'improve_health',
  'melhorar saúde': 'improve_health',
  'mais energia':  'improve_health',
};

const CANONICAL = ['lose_weight', 'gain_muscle', 'maintain_weight', 'improve_health'];

/** Valor canônico do objetivo, ou null se não der pra reconhecer. */
function normalizeGoal(goal) {
  if (!goal) return null;
  const raw = goal.trim();
  if ((CANONICAL).includes(raw)) return raw;
  return LEGACY_GOALS[raw.toLowerCase()] ?? null;
}

const GOAL_LABELS = {
  lose_weight:     'Perder peso',
  gain_muscle:     'Ganhar massa',
  maintain_weight: 'Manter peso',
  improve_health:  'Melhorar saúde',
};

/**
 * Opções de objetivo, iguais no onboarding e na edição do perfil. O valor
 * gravado é SEMPRE o canônico: até 24/09/2026 a edição do perfil gravava o
 * rótulo ("Emagrecer"), e como o valor canônico do onboarding não batia com
 * nenhuma opção, a tela abria sem nada marcado e a pessoa escolhia de novo.
 * Textos da spec do onboarding v2 (docs/onboarding/SPEC_ONBOARDING_V2.md,
 * tela 4), valendo em todas as telas desde 25/09/2026.
 */
const GOAL_OPTIONS = [
 { value: 'lose_weight',     label: 'Perder peso' },
 { value: 'gain_muscle',     label: 'Ganhar massa muscular' },
 { value: 'maintain_weight', label: 'Manter meu peso' },
 { value: 'improve_health',  label: 'Melhorar minha saúde e disposição' },
];

/** Rótulo em português para exibir ou mandar pro prompt da IA. */
function goalLabel(goal) {
  const canonical = normalizeGoal(goal);
  return canonical ? GOAL_LABELS[canonical] : 'não informado';
}
Object.assign(TF, { normalizeGoal, GOAL_OPTIONS, goalLabel });
})();

// ==== Copiado de src/onboarding/training.ts ====
(function () {
// Regras das respostas de treino do onboarding v2 (telas 17 a 28). Funções
// puras, sem import, testadas em supabase/tests/onboardingCalc.test.ts.

/**
 * Tela 20 → profiles.bodyweight_capacity. Marcou barra fixa: full. Flexão
 * sem barra: partial. Só agachamento ou nenhum: limited.
 */
function bodyweightCapacity(moves) {
  if (moves.includes('pull_up')) return 'full';
  if (moves.includes('push_up')) return 'partial';
  return 'limited';
}

/** Múltipla escolha com uma opção exclusiva ('none'): marcar uma desmarca a outra. */
function toggleExclusive(current, value, exclusive = 'none') {
  if (value === exclusive) return current.includes(exclusive) ? [] : [exclusive];
  const rest = current.filter((v) => v !== exclusive);
  return rest.includes(value) ? rest.filter((v) => v !== value) : [...rest, value];
}

/** Tela 21: iniciante com 5 ou 6 dias recebe o aviso. */
function daysWarning(level, days) {
  return level === 'beginner' && days != null && days >= 5;
}

/** Tela 22: selo "Recomendado para você". */
function recommendedDuration(level) {
  return level === 'beginner' ? 45 : 60;
}

/** profiles.physical_restrictions: regiões da tela 25 + condições da 26, sem 'none' duplicado. */
function physicalRestrictions(hasPain, injuries, conditions) {
  const inj = hasPain ? injuries.filter((c) => c !== 'none') : [];
  const cond = conditions.filter((c) => c !== 'none');
  const all = [...inj, ...cond];
  return all.length > 0 ? all : ['none'];
}

/**
 * Dias de treino no mini calendário da tela 29, na ordem segunda a domingo
 * (0 = segunda). Distribuição com descanso entre os treinos quando dá.
 */
function trainingWeekDays(count) {
  const byCount = {
    1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6],
  };
  return byCount[Math.min(7, Math.max(1, Math.round(count)))];
}

/** "Corpo inteiro", "Superiores e inferiores", "Corpo inteiro e cardio". */
function weekFocusLabel(week) {
  const labels = [];
  for (const s of week) {
    const l = s.focus === 'conditioning' ? 'cardio' : s.label;
    if (!labels.some((x) => x.toLowerCase() === l.toLowerCase())) labels.push(l);
  }
  const lower = labels.map((l, i) => (i === 0 ? l : l.charAt(0).toLowerCase() + l.slice(1)));
  if (lower.length <= 1) return lower[0] ?? '';
  return `${lower.slice(0, -1).join(', ')} e ${lower[lower.length - 1]}`;
}
Object.assign(TF, { bodyweightCapacity, toggleExclusive, daysWarning, recommendedDuration, physicalRestrictions, trainingWeekDays, weekFocusLabel });
})();

// ==== Copiado de src/onboarding/plates.ts ====
(function () {
// Prato da tela 42 por objetivo e tipo de alimentação. Regra em
// docs/ciencia/metas.md. As fotos e as posições das linhas ficam em
// stepViewsAlimentacao.tsx (PlatePhoto).

/**
 * Ganhar massa: Prato do Atleta (1/3 de cada). Perder, manter e saúde: Prato
 * Saudável (metade legumes e verduras, 1/4 proteína, 1/4 carboidrato).
 * Vegetariana, vegana e pescetariana usam a foto sem carne.
 */
function plateKind(goal, dietType) {
  return {
    model: goal === 'gain_muscle' ? 'athlete' : 'standard',
    veg: dietType === 'vegetarian' || dietType === 'vegan' || dietType === 'pescatarian',
  };
}

const PLATE_TEXT = {
  standard: {
    text: 'Um jeito simples de acertar as porções no almoço e no jantar, sem balança.',
    source: 'Referência: Prato Saudável (Harvard)',
    parts: ['1/2', '1/4', '1/4'],
  },
  athlete: {
    text: 'Um jeito simples de montar o almoço e o jantar com mais energia para treinar e construir músculo.',
    source: 'Referência: Prato do Atleta (Comitê Olímpico dos EUA)',
    parts: ['1/3', '1/3', '1/3'],
  },
};
Object.assign(TF, { plateKind, PLATE_TEXT });
})();

// ==== Regras de navegacao copiadas de src/onboarding/steps.ts (a lista STEPS esta em perguntas.js) ====
(function () {
const { weightDirection } = TF;
function isNoDeficitPhase(a) { return a.conditions.includes('pregnant') || a.conditions.includes('breastfeeding'); }
function hasWeightChange(a) {
  if (a.goal === 'maintain_weight' || a.weightKg == null || isNoDeficitPhase(a)) return false;
  return weightDirection(a.weightKg, a.targetWeightKg) !== 'maintain';
}
function stepById(id) { return TF.STEPS.find((s) => s.id === id) ?? TF.STEPS[0]; }
function applies(s, a) { return !s.skip?.(a); }
function nextStep(id, a) {
  const i = TF.STEPS.findIndex((s) => s.id === id);
  return TF.STEPS.slice(i + 1).find((s) => applies(s, a)) ?? null;
}
function prevStep(id, a) {
  const i = TF.STEPS.findIndex((s) => s.id === id);
  return TF.STEPS.slice(0, i).reverse().find((s) => applies(s, a)) ?? null;
}
function overallProgress(id, a) {
  const current = stepById(id);
  const idx = TF.SECTIONS.findIndex((s) => s.id === current.section);
  const inSection = TF.STEPS.filter((s) => s.section === current.section && applies(s, a));
  const pos = inSection.findIndex((s) => s.id === id);
  const within = inSection.length === 0 ? 0 : (Math.max(0, pos) + 1) / inSection.length;
  return Math.min(1, (idx + within) / TF.SECTIONS.length);
}
function isAfterSave(id) { return parseInt(stepById(id).code, 10) >= 47; }
function showsProgress(id) { return id !== 'welcome' && !isAfterSave(id); }
function canGoBack(id) { return id !== 'welcome' && id !== 'building' && id !== 'plan_summary'; }
Object.assign(TF, { isNoDeficitPhase, hasWeightChange, stepById, applies, nextStep, prevStep, overallProgress, isAfterSave, showsProgress, canGoBack });
})();

// ==== Copiado de src/onboarding/nutritionCalc.ts ====
(function () {
// Metas da tela 41 do onboarding v2 (docs/onboarding/SPEC_ONBOARDING_V2.md,
// seção 3): gasto do dia, meta de calorias pelo ritmo, macros e água com os
// horários. Funções puras, testadas em supabase/tests/onboardingCalc.test.ts
// (rodar com --unstable-sloppy-imports: o import abaixo não tem extensão,
// como o Metro espera).

const { activityFactor, mifflinStJeor, proteinWeightKg } = TF;
const { MEAL_OPTIONS, MEAL_SHARES, MEAL_TYPE_INFO, MEAL_TYPES_BY_COUNT, mealCodesFor, mealSharesFor } = TF;

/** kcal em 1 kg de peso corporal (aproximação usada para o déficit). */
const KCAL_PER_KG = 7700;

/** Piso da meta: nunca abaixo da taxa basal nem destes valores (mulheres, homens, média). */
const KCAL_FLOOR = { female: 1200, male: 1500, unknown: 1350 };

/** Proteína por kg: 1,6 para perder, manter e saúde; 2,0 para ganhar (regra atual do app). */
const PROTEIN_PER_KG = { default: 1.6, gain: 2.0 };
/** Gordura: 25% das calorias (regra atual do app). Carboidrato: o resto. */
const FAT_SHARE = 0.25;

           

                                     

                         

const round10 = (n) => Math.round(n / 10) * 10;

function energyTargets(i) {
  const bmr = mifflinStJeor(i.sex, i.weightKg, i.heightCm, i.age);
  const tdee = bmr * activityFactor(i.activityLevel);
  // Diferença diária do ritmo: kg por semana × 7700 ÷ 7.
  const delta = (i.weightKg * i.weeklyRate * KCAL_PER_KG) / 7;

  let kcal = tdee;
  if (i.goal === 'lose_weight') kcal = tdee - delta;
  else if (i.goal === 'gain_muscle') kcal = tdee + delta;

  let floored = false;
  const floor = Math.max(bmr, KCAL_FLOOR[i.sex]);
  if (kcal < floor) { kcal = floor; floored = true; }
  // Gestação e amamentação: nunca abaixo do gasto do dia.
  if (i.noDeficit && kcal < tdee) { kcal = tdee; floored = false; }

  kcal = round10(kcal);
  // IMC acima de 30: sobre o peso ajustado (utils/energy.proteinWeightKg).
  const proteinG = Math.round(proteinWeightKg(i.weightKg, i.heightCm) * (i.goal === 'gain_muscle' ? PROTEIN_PER_KG.gain : PROTEIN_PER_KG.default));
  const fatG = Math.round((kcal * FAT_SHARE) / 9);
  const carbsG = Math.max(0, Math.round((kcal - proteinG * 4 - fatG * 9) / 4));
  return { bmr: Math.round(bmr), tdee: round10(tdee), kcal, proteinG, carbsG, fatG, floored };
}

// ─── Água ─────────────────────────────────────────────────────────────────────

const WATER_ML_PER_KG = 35;
/** Piso por sexo (EFSA, 2010). */
const WATER_FLOOR_ML = { female: 2000, male: 2500, unknown: 2250 };
/**
 * Reposição do treino por hora, pela média da semana: 400 ml (mulheres), 500 ml
 * (homens) e a média, 450 ml, para "Prefiro não informar". Dentro da faixa do
 * ACSM (2007), de 400 a 800 ml por hora (decisão de 25/09/2026).
 */
const WATER_PER_TRAINING_HOUR_ML = { female: 400, male: 500, unknown: 450 };
const WATER_PREGNANT_ML = 300;
const WATER_BREASTFEEDING_ML = 700;
const WATER_MAX_ML = 5000;

function waterGoalMl(p

 ) {
  let ml = Math.max(p.weightKg * WATER_ML_PER_KG, WATER_FLOOR_ML[p.sex]);
  ml += (p.trainingDaysPerWeek * (p.trainingMinutes / 60) * WATER_PER_TRAINING_HOUR_ML[p.sex]) / 7;
  if (p.pregnant) ml += WATER_PREGNANT_ML;
  if (p.breastfeeding) ml += WATER_BREASTFEEDING_ML;
  return Math.min(WATER_MAX_ML, Math.round(ml / 50) * 50);
}

const CUP_ML = 250;
/** A última dose de água fica 2 h antes de dormir. */
const LAST_CUP_BEFORE_BED_MIN = 120;

const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

/**
 * Copos de 250 ml distribuídos do acordar até 2 h antes de dormir, com o
 * intervalo arredondado para baixo a 15 min (o último copo nunca passa da janela). Ex.: 2,3 L, acordar 7h e dormir 23h →
 * 10 copos, a cada 1h30, das 7h às 21h.
 */
function waterPlan(ml, waketime, bedtime) {
  const cups = Math.max(1, Math.ceil(ml / CUP_ML));
  const first = toMin(waketime);
  let bed = toMin(bedtime);
  if (bed <= first) bed += 24 * 60;
  const last = Math.max(first, bed - LAST_CUP_BEFORE_BED_MIN);
  // Para baixo, em quartos de hora: os copos sempre cabem na janela.
  const interval = cups > 1 ? Math.max(15, Math.floor((last - first) / (cups - 1) / 15) * 15) : 0;
  return { cups, intervalMin: interval, firstMin: first, lastMin: last % (24 * 60) };
}

/** 90 → "1h30"; 60 → "1h"; 45 → "45 min". */
function formatInterval(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

/** 420 → "7h"; 450 → "7h30". */
function formatClock(min) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

/** 2300 → "2,3". */
function formatLiters(ml) {
  return (Math.round(ml / 100) / 10).toFixed(1).replace('.', ',');
}

/** 2150 → "2.150". */
function formatKcal(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ─── Refeições ────────────────────────────────────────────────────────────────

/**
 * Divisão da meta pelas refeições do dia (tela 30), em ordem de horário: o
 * mapa único de refeições (src/constants/meals.ts). Regra em
 * docs/ciencia/metas.md.
 */
const MEAL_SPLIT = Object.fromEntries(
  MEAL_OPTIONS.map((n) => [n, MEAL_TYPES_BY_COUNT[n].map((c, i) => [MEAL_TYPE_INFO[c].label, MEAL_SHARES[n][i]])]),
);

/** Divide `total` pelas fatias com o arredondamento `round`; a sobra vai para o almoço. */
function divide(total, shares, lunch, round) {
  const parts = shares.map((sh) => round(total * sh));
  parts[lunch] += total - parts.reduce((a, b) => a + b, 0);
  return parts;
}

/**
 * kcal por refeição, arredondadas a 10; a diferença do arredondamento vai para
 * o almoço, para a soma bater com a meta. Fora de 2 a 7 usa 3 refeições.
 */
function mealSplit(kcal, count) {
  const codes = mealCodesFor(count);
  const parts = divide(kcal, mealSharesFor(count), codes.indexOf('lunch'), round10);
  return codes.map((c, i) => ({ name: MEAL_TYPE_INFO[c].label, kcal: parts[i] }));
}

/**
 * Metas de cada refeição (a regra única: onboarding, tela 42 e a tela de
 * montar refeições): o mapa único de refeições, as fatias do dia (MEAL_SHARES),
 * kcal arredondadas a 10 e macros em gramas inteiros; a sobra de cada
 * arredondamento vai para o almoço, para a soma bater com a meta do dia.
 */
function mealTargets(
  day, count,
) {
  const codes = mealCodesFor(count);
  const lunch = codes.indexOf('lunch');
  const shares = mealSharesFor(count);
  const kcals = divide(day.kcal, shares, lunch, round10);
  const proteins = divide(day.proteinG, shares, lunch, Math.round);
  const carbs = divide(day.carbsG ?? 0, shares, lunch, Math.round);
  const fats = divide(day.fatG ?? 0, shares, lunch, Math.round);
  return codes.map((code, i) => ({
    code, name: MEAL_TYPE_INFO[code].label, kcal: kcals[i], proteinG: proteins[i], carbsG: carbs[i], fatG: fats[i],
  }));
}

/** Primeira refeição: 30 min depois de acordar, arredondado para cima a 15 min. */
const FIRST_MEAL_AFTER_WAKE_MIN = 30;
/** Com 2 refeições não há café: o almoço fica 5 h depois de acordar. */
const LUNCH_AFTER_WAKE_MIN = 300;
/** Última refeição: pelo menos 2 h antes de dormir. */
const LAST_MEAL_BEFORE_BED_MIN = 120;
/** Sem ceia (até 5 refeições), o dia alimentar ocupa no máximo 12 h. */
const MAX_MEAL_SPAN_MIN = 720;

/**
 * Dia alimentar da tela 42: horário, kcal e proteína de cada refeição.
 * Horários em espaçamento regular entre a primeira refeição (30 min depois de
 * acordar) e a última (2 h antes de dormir), cada um arredondado a 15 min.
 * Sem ceia, o intervalo entre a primeira e a última fica em até 12 h, para o
 * jantar não ir para perto da hora de dormir. `atMin` em minutos desde 0h
 * (pode passar de 24 h em quem dorme depois da meia-noite; formatClock trata).
 */
function mealPlan(kcal, proteinG, count, waketime, bedtime) {
  const codes = mealCodesFor(count);
  const n = codes.length;
  const wake = toMin(waketime);
  let bed = toMin(bedtime);
  if (bed <= wake) bed += 24 * 60;
  const firstOffset = codes[0] === 'lunch' ? LUNCH_AFTER_WAKE_MIN : FIRST_MEAL_AFTER_WAKE_MIN;
  const first = Math.ceil((wake + firstOffset) / 15) * 15;
  const last = Math.floor((bed - LAST_MEAL_BEFORE_BED_MIN) / 15) * 15;
  const hasSupper = codes.includes('supper');
  // Janela curta demais (sono muito longo): pelo menos 1 h entre refeições.
  let span = Math.max(last - first, (n - 1) * 60);
  if (!hasSupper) span = Math.min(span, MAX_MEAL_SPAN_MIN);

  const targets = mealTargets({ kcal, proteinG }, count);
  return codes.map((code, i) => ({
    code,
    name: MEAL_TYPE_INFO[code].label,
    atMin: first + Math.round((i * span) / (n - 1) / 15) * 15,
    kcal: targets[i].kcal,
    proteinG: targets[i].proteinG,
  }));
}
Object.assign(TF, { KCAL_PER_KG, KCAL_FLOOR, PROTEIN_PER_KG, FAT_SHARE, energyTargets, WATER_ML_PER_KG, WATER_FLOOR_ML, WATER_PER_TRAINING_HOUR_ML, WATER_PREGNANT_ML, WATER_BREASTFEEDING_ML, WATER_MAX_ML, waterGoalMl, CUP_ML, LAST_CUP_BEFORE_BED_MIN, waterPlan, formatInterval, formatClock, formatLiters, formatKcal, MEAL_SPLIT, mealSplit, mealTargets, FIRST_MEAL_AFTER_WAKE_MIN, LUNCH_AFTER_WAKE_MIN, LAST_MEAL_BEFORE_BED_MIN, MAX_MEAL_SPAN_MIN, mealPlan });
})();

// ==== Copiado de src/onboarding/nutritionTargets.ts ====
(function () {
// Metas de calorias, macros e água a partir das respostas do onboarding v2:
// usadas pela tela 41B, pelo resumo (48) e pela gravação do perfil (47).
// Puro e testado em supabase/tests/onboardingCalc.test.ts.

const { sexOf } = TF;
const { birthDateToISO } = TF;

const { ageOn, fromIsoDate, paceRate, requiredRate, weightDirection } = TF;
const { energyTargets, waterGoalMl, waterPlan } = TF;
const { isNoDeficitPhase } = TF;

/** Ritmo semanal (fração do peso) das respostas: o escolhido, a data própria ou 0. */
function weeklyRateOf(a, today = new Date()) {
  if (a.weightKg == null || a.targetWeightKg == null || !a.pace || isNoDeficitPhase(a)) return 0;
  const dir = weightDirection(a.weightKg, a.targetWeightKg);
  if (dir === 'maintain') return 0;
  if (a.pace === 'custom') return a.targetDate ? requiredRate(today, fromIsoDate(a.targetDate), a.weightKg, a.targetWeightKg) : 0;
  return paceRate(dir, a.pace);
}

/** Metas da tela 41 a partir das respostas. */
function targetsOf(a, today = new Date()) {
  const sex = sexOf(a.gender);
  const iso = birthDateToISO(a.birthDate);
  const age = iso ? ageOn(iso, today) : 35;
  const weightKg = a.weightKg ?? 70;
  const pregnant = a.conditions.includes('pregnant');
  const breastfeeding = a.conditions.includes('breastfeeding');
  // isNoDeficitPhase(a) é pregnant || breastfeeding.
  const energy = energyTargets({
    sex, weightKg, heightCm: a.heightCm ?? 165, age, activityLevel: a.activityLevel,
    goal: a.goal, weeklyRate: weeklyRateOf(a, today), noDeficit: pregnant || breastfeeding,
  });
  const waterMl = waterGoalMl({
    sex, weightKg, trainingDaysPerWeek: a.workoutDays ?? 0, trainingMinutes: a.workoutDuration ?? 0, pregnant, breastfeeding,
  });
  // Horário de segunda-feira (ou o primeiro cadastrado).
  const schedule = a.sleepSchedules.find((s) => s.days.includes(1)) ?? a.sleepSchedules[0];
  const plan = waterPlan(waterMl, schedule?.waketime ?? '07:00', schedule?.bedtime ?? '23:00');
  return { energy, waterMl, plan, noDeficit: pregnant || breastfeeding };
}
Object.assign(TF, { weeklyRateOf, targetsOf });
})();

// ==== Copiado de src/onboarding/planValue.ts (so os textos do resumo; a parte de preco e de paywall nao vem para o quiz) ====
(function () {
// Textos montados pelas respostas nas telas 47 a 49: cuidado com a lesão,
// benefícios do plano (48) e o bloco "No Premium, seu plano ganha" (49).
// Puro, testado em supabase/tests/onboardingCalc.test.ts.

const { OBSTACLE_OPTIONS } = TF;
const { formatDateLong, formatKg, fromIsoDate } = TF;
const { seriousConditionsIn } = TF;
const { normalizeGoal } = TF;

/** Artigo e possessivo de cada região da tela 25 ("o seu joelho", "a sua coluna lombar"). */
const INJURY_PHRASE = {
  knee: 'o seu joelho',
  lower_back: 'a sua coluna lombar',
  shoulder: 'o seu ombro',
  hip: 'o seu quadril',
  other: 'a região que você informou',
};

/** "o seu joelho e o seu ombro"; vazio sem dor ou lesão. */
function injuryPhrase(a) {
  if (!a.hasPain) return '';
  const parts = a.injuries.filter((c) => INJURY_PHRASE[c]).map((c) => INJURY_PHRASE[c]);
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;
}

/** Condição grave (tela 26): sem plano com IA; treino montado ou importado. */
function hasSerious(a) {
  return seriousConditionsIn(a.conditions).length > 0;
}

/** "Para ter mais disposição no dia a dia" (5A), na segunda pessoa ("Para se sentir bem com o seu corpo"). */
function motivationLine(code) {
  const text = MOTIVATION_FOR_TITLE[code ?? ''];
  return text ? `Para ${text}` : null;
}

/** Grade 2x2 do resumo (48): título curto e uma linha de apoio. */
function planBenefitCards(a) {
  const serious = hasSerious(a);
  const injury = injuryPhrase(a);
  // Sem plano da IA (condição grave, ficha do personal ou montar o próprio,
  // 1.2.5): o treino é montado pela pessoa ou pelo profissional dela.
  const ownWorkout = serious || a.planSetupChoice !== 'ai';
  return [
 {
      icon: 'calendar-outline',
      title: 'Feito para a sua rotina',
      desc: !serious && a.workoutDays && a.workoutDuration ? `${a.workoutDays} treinos de ${a.workoutDuration} min` : 'No seu tempo',
    },
 { icon: 'leaf-outline', title: 'Sem dieta restritiva', desc: 'Metas que cabem no seu dia' },
    ownWorkout
      ? { icon: 'barbell-outline', title: 'Treino no seu ritmo', desc: 'Montado por você ou pelo seu profissional' }
      : { icon: 'barbell-outline', title: 'Treino no seu nível', desc: injury ? `Com cuidado com ${injury}` : 'Exercícios feitos para você' },
 { icon: 'calculator-outline', title: 'Metas calculadas', desc: 'Calorias e água para você' },
  ];
}

/** Resposta à objeção da tela 44, com o preço por dia da loja (sem ele, a frase termina no "app"). */
function objectionReply(code, daily) {
  const reply = OBSTACLE_OPTIONS.find((o) => o.value === code)?.reply;
  if (!reply) return null;
  if (!reply.includes('{daily}')) return reply;
  return daily ? reply.replace('{daily}', daily) : reply.replace(/, por menos de \{daily\} por dia/, '');
}

/**
 * Motivações da 5A na segunda pessoa, para o motivationLine (as opções da
 * 5A são em primeira pessoa: "Me sentir bem com o meu corpo").
 */
const MOTIVATION_FOR_TITLE = {
  energy: 'ter mais disposição no dia a dia',
  body_confidence: 'se sentir bem com o seu corpo',
  health: 'cuidar da sua saúde',
  clothes: 'usar as roupas que você quer',
  self_confidence: 'ter mais autoconfiança',
  special_occasion: 'chegar bem na sua ocasião especial',
};
Object.assign(TF, { injuryPhrase, hasSerious, motivationLine, planBenefitCards, objectionReply });
})();

// ==== Regra local do quiz, NAO existe igual no app ====
// A tela 29 do app pede a ficha ao servidor (supabase/functions/preview-workout), que escolhe na
// biblioteca do banco. O quiz nao chama o servidor. Aqui ficam: a divisao da semana, copiada de
// weeklyTemplate em supabase/functions/_shared/workoutRules.ts, e uma ficha de exemplo por regra simples.
(function () {
const FOCUS_LABEL = { full: 'Corpo inteiro', upper: 'Superiores', lower: 'Inferiores', push: 'Empurrar', pull: 'Puxar', legs: 'Pernas', conditioning: 'Condicionamento' };

function weeklyTemplateLocal(days, level) {
  const d = Math.min(6, Math.max(2, Math.round(days || 3)));
  let foci;
  if (d <= 3) foci = Array(d).fill('full');
  else if (d === 4) foci = ['upper', 'lower', 'upper', 'lower'];
  else if (d === 5) foci = level === 'beginner' ? ['full', 'conditioning', 'full', 'conditioning', 'full'] : ['push', 'pull', 'legs', 'upper', 'lower'];
  else foci = level === 'advanced' ? ['push', 'pull', 'legs', 'push', 'pull', 'legs'] : ['upper', 'lower', 'conditioning', 'upper', 'lower', 'conditioning'];
  return foci.map((focus, i) => ({ letter: String.fromCharCode(65 + i), focus, label: FOCUS_LABEL[focus] }));
}

// Exemplos por grupo: com aparelhos (gym), em casa com halteres ou elasticos (home) e so com o corpo (body).
// "evita" tira o exercicio de quem marcou dor naquela regiao na tela 25.
const POOL = {
  legs: [
    { gym: 'Leg press', home: 'Agachamento com halteres', body: 'Agachamento livre (peso do corpo)', evita: ['knee', 'hip'] },
    { gym: 'Cadeira flexora', home: 'Levantamento terra romeno com halteres', body: 'Ponte de glúteos', evita: ['lower_back'] },
    { gym: 'Elevação pélvica', home: 'Elevação pélvica com halter', body: 'Elevação pélvica', evita: [] },
  ],
  chest: [
    { gym: 'Supino reto com halteres', home: 'Supino com halteres', body: 'Flexão de braço', evita: ['shoulder'] },
    { gym: 'Crucifixo na máquina', home: 'Crucifixo com halteres', body: 'Flexão com os joelhos no chão', evita: ['shoulder'] },
  ],
  back: [
    { gym: 'Puxada na frente', home: 'Remada curvada com halteres', body: 'Remada invertida', evita: ['lower_back'] },
    { gym: 'Remada baixa', home: 'Remada unilateral com halter', body: 'Superman', evita: [] },
  ],
  shoulders: [{ gym: 'Elevação lateral com halteres', home: 'Elevação lateral com halteres', body: 'Prancha com toque no ombro', evita: ['shoulder'] }],
  core: [{ gym: 'Prancha', home: 'Prancha', body: 'Prancha', evita: [] }],
};
const ORDER = {
  full: ['legs', 'chest', 'back', 'shoulders', 'legs', 'back', 'core'],
  upper: ['chest', 'back', 'shoulders', 'chest', 'back', 'core'],
  lower: ['legs', 'legs', 'legs', 'core'],
  push: ['chest', 'chest', 'shoulders', 'core'],
  pull: ['back', 'back', 'core'],
  legs: ['legs', 'legs', 'legs', 'core'],
};

function localPreview(a) {
  const level = a.fitnessLevel;
  const week = weeklyTemplateLocal(a.workoutDays, level);
  const slot = week.find((s) => s.focus !== 'conditioning') ?? week[0];
  const kind = a.equipment === 'bodyweight' ? 'body' : a.equipment === 'home' ? 'home' : 'gym';
  const pain = a.hasPain ? a.injuries : [];
  const count = { 30: 4, 45: 5, 60: 6, 90: 7 }[a.workoutDuration] ?? 5;
  const used = new Set();
  const exercises = [];
  for (const group of ORDER[slot.focus] ?? ORDER.full) {
    const ex = POOL[group].find((e) => !used.has(e[kind]) && !e.evita.some((r) => pain.includes(r)));
    if (!ex) continue;
    used.add(ex[kind]);
    exercises.push({ id: ex[kind], name: ex[kind], sets: level === 'advanced' ? 4 : 3, reps: level === 'advanced' ? '8 a 10' : '10 a 12' });
    if (exercises.length >= count) break;
  }
  return { week, session: { letter: slot.letter, label: slot.label, minutes: a.workoutDuration ?? 45 }, exercises };
}
Object.assign(TF, { localPreview });
})();
