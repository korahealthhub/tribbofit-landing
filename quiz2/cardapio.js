// Cardapio: motor de cardapio do app, carregado so quando o quiz chega nas telas de alimentacao (junto com alimentos.js).
// Era parte de calculos.js; separado para a primeira tela abrir mais rapido. Mesma logica, sem alteracao.
window.TF = window.TF || {};

// ==== Copiado de src/nutrition/menuEngine.ts ====
(function () {
// Cardápio sugerido por regras (sem IA), fase de alimentação da 1.2.0.
// Só os alimentos básicos (basicFoods.ts, gerado das planilhas revisadas),
// em medida caseira, na meta de kcal e proteína de cada refeição (divisão do
// mapa único, constants/meals). Uma sugestão por refeição e por dia da
// semana: os de sempre (arroz, feijão, pão, ovo) na maior parte dos dias e
// os outros em 2 dias, para variar sem estranhar. Puro e determinístico;
// testado em supabase/tests/menuEngine.test.ts.
//
// Estrutura:
// - café: pão, cuscuz, tapioca ou raiz + ovo, queijo, iogurte ou leite +
//   fruta (+ café com leite e manteiga ou requeijão no pão, se couber);
// - lanches: fruta + leite ou iogurte (+ aveia ou castanha), ou pão +
//   proteína leve (+ fruta), alternando entre os dias;
// - almoço e jantar: carboidrato + leguminosa + proteína + salada crua +
//   legume cozido + azeite (+ farofa ou fruta de sobremesa, se precisar);
// - ceia: leite ou iogurte (+ aveia ou fruta), ou fruta (+ leite).
//
// Regras de prato real: arroz mínimo de 3 colheres; até 4 ovos no dia;
// porções maiores só para refeições maiores (até 60% a mais); almoço e
// jantar não repetem a proteína; extras só quando a meta pede.

const { BASIC_FOODS } = TF;

                                                            

                              

/** Tolerâncias do cardápio (testadas). */
const MEAL_KCAL_TOLERANCE = 0.10;
const DAY_KCAL_TOLERANCE = 0.05;
const DAY_PROTEIN_TOLERANCE = 0.15;

// ─── Alimentos permitidos ─────────────────────────────────────────────────────

/** Tudo o que a pessoa pode comer: dieta, alergias (conservador) e aversões. */
function allowedFoods(p) {
  const diet = (p.dietType ?? 'omnivore');
  const allergens = p.restrictions.filter((r) => r !== 'none');
  const list = BASIC_FOODS.filter((f) =>
    f.diets.includes(diet)
    // Pão sem glúten só para quem precisa (mais caro e menos comum).
    && (f.name !== 'Pão sem glúten' || allergens.includes('gluten'))
    // Leite de soja só para quem não toma leite (vegano ou lactose).
    && (f.name !== 'Leite de soja' || diet === 'vegan' || allergens.includes('lactose'))
    && !f.allergens.some((a) => allergens.includes(a))
    && !(f.dislike && p.dislikes.includes(f.dislike)));
  // Proteína de soja só para quem não come carne nem peixe (vegetariano,
  // vegano, pescetariano sem peixe; camarão sozinho não conta).
  const isShellfish = (f) => f.allergens.includes('seafood') && f.dislike !== 'fish';
  const eatsMeatOrFish = list.some((f) => f.group === 'protein' && !f.diets.includes('vegetarian') && !isShellfish(f));
  return eatsMeatOrFish ? list.filter((f) => f.name !== SOY_PROTEIN) : list;
}

const SOY_PROTEIN = 'Proteína de soja';

// ─── Porções ──────────────────────────────────────────────────────────────────

const fmt = (n) => {
  const whole = Math.floor(n + 1e-9);
  const half = Math.abs(n - whole - 0.5) < 1e-9;
  if (half) return whole === 0 ? '½' : `${whole}½`;
  return String(Math.round(n));
};

/** "3 colheres de sopa cheias", "½ concha média", "1 unidade". */
function amountText(food, portions) {
  const m = food.measures[0];
  const total = portions * m.baseQty;
  return `${fmt(total)} ${total > 1 ? m.plural : m.singular}`;
}

function item(food, portions) {
  const grams = Math.round(portions * food.measures[0].grams);
  const k = grams / 100;
  return {
    name: food.name,
    baseName: food.baseName,
    group: food.group,
    amount: amountText(food, portions),
    grams,
    kcal: Math.round(food.per100.kcal * k),
    proteinG: Math.round(food.per100.protein * k * 10) / 10,
    carbsG: Math.round(food.per100.carbs * k * 10) / 10,
    fatG: Math.round(food.per100.fat * k * 10) / 10,
  };
}

/**
 * Medida contável ("1 unidade", "1 unidade média", "1 fatia", "1 pão",
 * "1 biscoito", "1 ovo"): fora das frutas, só em unidades inteiras.
 */
function isCountableMeasure(label) {
  return /^(unidade|fatia|pão|pães|biscoito|ovo)/i.test(label.replace(/^\d+(?:[.,/]\d+)?\s+/, ''));
}

/** Porções possíveis de um alimento num papel da refeição (múltiplos da medida). */
function portionSteps(food, role, scale = 1) {
  const g = food.measures[0].grams;
  const out = [];
  const maxGrams = role.maxGrams * scale;
  const maxN = role.maxN ? Math.floor(role.maxN * scale) : 99;
  const add = (n) => {
    if (n * g <= maxGrams + 1e-9 && n * g >= (role.minGrams ?? 0) - 1e-9 && n >= (role.minN ?? 0) && n <= maxN) out.push(n);
  };
  if (role.fixed) return role.optional ? [0, role.fixed] : [role.fixed];
  if (role.optional) out.push(0);
  // Medida grande (concha, filé, bife, fruta, pote): de meia em meia; pequena
  // (colher, fatia): inteira. Contáveis (unidade, fatia, pão, biscoito,
  // ovo) só em unidades inteiras; meia unidade só nas frutas (29/09/2026).
  const wholeOnly = isCountableMeasure(food.measures[0].label) && food.group !== 'fruit';
  if (g >= 60 && role.halves && !wholeOnly) for (let n = 0.5; n <= 4; n += 0.5) add(n);
  else for (let n = 1; n <= 20; n++) add(n);
  return out.length ? out : [1];
}

// ─── Estrutura das refeições ──────────────────────────────────────────────────

           

                                          

                        

               

               

                         

                        

                          
                 

                                                             

const has = (f, k) => f.meals.includes(k);
const isNut = (f) => f.group === 'fat' && f.allergens.includes('nuts') && f.name !== 'Pasta de amendoim';
const isButter = (f) => f.group === 'fat' && (f.name === 'Manteiga' || f.name === 'Margarina');
const isOil = (f) => f.name === 'Azeite';
const isEgg = (f) => /^Ovo /.test(f.name);
/** Leite em pó: só no café com leite, nunca como o laticínio da refeição. */
const isPowder = (f) => f.name === 'Leite em pó';

/** Ovos no dia, somando as refeições. */
const MAX_EGGS_PER_DAY = 4;

/** Acompanhamentos, não o carboidrato principal do prato. */
const SIDE_CARBS = ['Farinha de mandioca', 'Milho verde'];

/**
 * Refeição de referência (kcal) de cada tipo: acima disso, os limites de
 * porção crescem junto (até 60% a mais), porque o prato de quem come 3.500
 * kcal é maior.
 */
const REF_KCAL = { breakfast: 450, snack: 250, lunch: 700, dinner: 600, supper: 200 };
const MAX_SCALE = 1.6;

function kindOf(code) {
  if (code === 'breakfast' || code === 'lunch' || code === 'dinner' || code === 'supper') return code;
  return 'snack';
}

/** Papéis da refeição; os lanches e a ceia alternam de formato entre os dias. */
function rolesFor(kind, variant) {
  const fruit = (k, optional = false) =>
    ({ key: 'fruit', pick: (f) => f.group === 'fruit' && has(f, k) && f.name !== 'Abacate', maxGrams: 200, fixed: 1, optional });
  const oats = { key: 'oats', pick: (f) => f.name === 'Aveia em flocos', maxGrams: 45, optional: true, extra: true };
  if (kind === 'breakfast') {
    return [
 { key: 'base', pick: (f) => (f.group === 'bread' || f.group === 'carb') && has(f, 'breakfast') && f.name !== 'Aveia em flocos', maxGrams: 200, maxN: 3,
        staples: ['Pão francês', 'Pão de forma', 'Cuscuz de milho', 'Tapioca', 'Pão sem glúten'] },
 { key: 'protein', pick: (f) => (f.group === 'protein' || (f.group === 'dairy' && !isPowder(f)) || f.name === 'Pasta de amendoim') && has(f, 'breakfast') && f.name !== 'Requeijão', maxGrams: 200, maxN: 3,
        staples: ['Ovo mexido', 'Ovo cozido', 'Queijo minas frescal', 'Leite integral', 'Iogurte natural', 'Leite de soja'] },
      fruit('breakfast'),
      // Café com leite (quando a proteína não é leite nem iogurte).
 { key: 'milk', pick: (f) => /^Leite/.test(f.name) && has(f, 'breakfast'), maxGrams: 200, fixed: 1, optional: true, extra: true,
        skipIf: (c) => c.some((f) => (f.group === 'dairy' && !isPowder(f)) && !/Queijo|Muçarela|Requeij/.test(f.name)),
        staples: ['Leite integral', 'Leite de soja'] },
 { key: 'spread', pick: (f) => isButter(f) || f.name === 'Requeijão', maxGrams: 30, fixed: 1, optional: true,
        skipIf: (c) => !c.some((f) => f.group === 'bread') },
    ];
  }
  if (kind === 'snack') {
    const formats = [
      [fruit('snack'), { key: 'dairy', pick: (f) => (f.group === 'dairy' && !isPowder(f)) && has(f, 'snack') && !/Queijo|Muçarela|Requeij/.test(f.name), maxGrams: 340, halves: true }, oats,
 { key: 'nuts', pick: (f) => isNut(f), maxGrams: 20, maxN: 1, optional: true, extra: true }],
      [
 { key: 'bread', pick: (f) => f.group === 'bread' && has(f, 'snack') && f.name !== 'Aveia em flocos', maxGrams: 100, maxN: 3 },
 { key: 'protein', pick: (f) => (f.group === 'protein' || /Queijo|Muçarela/.test(f.name) || f.name === 'Pasta de amendoim') && has(f, 'snack'), maxGrams: 100, maxN: 3 },
 { ...fruit('snack', true), extra: true },
      ],
      [fruit('snack'), { key: 'dairy', pick: (f) => (f.group === 'dairy' && !isPowder(f)) && has(f, 'snack') && !/Queijo|Muçarela|Requeij/.test(f.name), maxGrams: 340, halves: true },
 { key: 'nuts', pick: (f) => isNut(f), maxGrams: 20, maxN: 1, optional: true, extra: true }],
    ];
    return formats[variant % formats.length];
  }
  if (kind === 'supper') {
    return variant % 2 === 0
      ? [{ key: 'dairy', pick: (f) => (f.group === 'dairy' && !isPowder(f)) && has(f, 'supper'), maxGrams: 300, halves: true }, oats, { ...fruit('supper', true), extra: true }]
      : [fruit('supper'), { key: 'dairy', pick: (f) => (f.group === 'dairy' && !isPowder(f)) && has(f, 'supper'), maxGrams: 300, halves: true, optional: true }];
  }
  // Almoço e jantar.
  return [
 { key: 'carb', pick: (f) => f.group === 'carb' && has(f, kind) && !SIDE_CARBS.includes(f.name), maxGrams: 300, minGrams: 75, halves: true,
      staples: ['Arroz branco', 'Arroz integral'] },
 { key: 'legume', pick: (f) => f.group === 'legume' && has(f, kind), maxGrams: 210, minGrams: 60, halves: true,
      staples: ['Feijão carioca', 'Feijão preto'] },
 { key: 'protein', pick: (f) => f.group === 'protein' && has(f, kind), maxGrams: 200, halves: true, minN: 1, maxN: 8,
      richFirst: true },
 { key: 'salad', pick: (f) => f.group === 'veg' && !f.cooked, maxGrams: 100, fixed: 1 },
 { key: 'veg', pick: (f) => f.group === 'veg' && f.cooked, maxGrams: 100, fixed: 2 },
 { key: 'oil', pick: (f) => isOil(f), maxGrams: 5, fixed: 1, optional: true },
 { key: 'farofa', pick: (f) => f.name === 'Farinha de mandioca', maxGrams: 48, optional: true, extra: true },
 { key: 'dessert', pick: (f) => f.group === 'fruit' && has(f, 'snack') && f.name !== 'Abacate', maxGrams: 200, fixed: 1, optional: true, extra: true },
  ];
}

function stableHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// ─── Uma refeição ─────────────────────────────────────────────────────────────

/**
 * Distância da meta: kcal pesa 4 vezes mais que a proteína, e sair de 5% nas
 * kcal pesa muito mais (dentro disso, a proteína decide). Proteína acima da
 * meta pesa um quarto (senão o prato perde arroz para não passar dela).
 */
function costOf(kcal, prot, target) {
  const ek = (kcal - target.kcal) / target.kcal;
  const ep = (prot - target.proteinG) / Math.max(target.proteinG, 5);
  const out = Math.max(0, Math.abs(ek) - 0.05);
  return ek * ek * 4 + out * out * 100 + ep * ep * (ep > 0 ? 0.25 : 1);
}

/** Escolhe um alimento por papel; `shift` gira as escolhas (outra tentativa). */
function chooseFoods(
  roles, foods, day, key, avoid, cheapOnly, shift,
  eggsLeft,
) {
  const chosen = [];
  const used = new Set        (avoid);
  for (const role of roles) {
    if (role.skipIf?.(chosen.map((c) => c.food))) continue;
    const all = foods.filter(role.pick).filter((f) => eggsLeft > 0 || !isEgg(f));
    let cands = all.filter((f) => !used.has(f.baseName));
    if (role.richFirst && cands.some((f) => f.per100.protein >= 12)) cands = cands.filter((f) => f.per100.protein >= 12);
    if (cheapOnly && cands.some((f) => f.cheap)) cands = cands.filter((f) => f.cheap);
    if (cands.length === 0) cands = all.filter((f) => !chosen.some((c) => c.food.baseName === f.baseName));
    if (cands.length === 0) continue;
    // Os de sempre na maior parte da semana; os outros em 2 dias (quarta e
    // domingo), para variar sem estranhar.
    const staples = (role.staples ?? []).map((n) => cands.find((f) => f.name === n)).filter((f) => !!f);
    const others = cands.filter((f) => !staples.includes(f));
    // Na metade final das tentativas, volta aos de sempre.
    const useOthers = staples.length === 0 || (others.length > 0 && (day === 2 || day === 6) && shift < MAX_TRIES / 2);
    const list = useOthers ? (others.length ? others : staples) : staples;
    // A tentativa sorteia outro deslocamento (fixo), sem colidir com o giro
    // dos dias (senão dois dias seguidos caem na mesma combinação).
    const jump = shift ? stableHash(`${key}${role.key}#${shift}`) : 0;
    const food = list[(stableHash(key + role.key) + day + jump) % list.length];
    chosen.push({ role, food });
    used.add(food.baseName);
  }
  return chosen;
}

/** Porções que chegam mais perto da meta (busca em todas as combinações). */
function bestPortions(
  chosen, target, eggsLeft,
) {
  const scale = Math.min(MAX_SCALE, Math.max(1, target.kcal / REF_KCAL[kindOf(target.code)]));
  const steps = chosen.map((c) => {
    const st = portionSteps(c.food, c.role, scale);
    if (!isEgg(c.food)) return st;
    const ok = st.filter((n) => n * c.food.measures[0].baseQty <= eggsLeft);
    return ok.length ? ok : [st[0]];
  });
  let best = steps.map((s) => s[0]);
  let bestCost = Infinity;
  const walk = (i, acc, kcal, prot) => {
    if (i === chosen.length) {
      // Desempate: menos porções (prato mais simples).
      const extras = acc.reduce((t, n, j) => t + (n > 0 && chosen[j].role.extra ? 1 : 0), 0);
      const cost = costOf(kcal, prot, target) + extras * EXTRA_COST + acc.reduce((t, n) => t + n, 0) * 1e-4;
      if (cost < bestCost) { bestCost = cost; best = [...acc]; }
      return;
    }
    const f = chosen[i].food;
    const g = f.measures[0].grams;
    for (const n of steps[i]) {
      acc.push(n);
      walk(i + 1, acc, kcal + (f.per100.kcal * n * g) / 100, prot + (f.per100.protein * n * g) / 100);
      acc.pop();
    }
  };
  walk(0, [], 0, 0);
  return { portions: best, cost: bestCost };
}

/** Custo de cada extra (farofa, sobremesa, aveia...): perto de 5% de kcal de erro. */
const EXTRA_COST = 0.01;

/** Tentativas de outra combinação de alimentos quando a refeição não fecha. */
const MAX_TRIES = 6;

/**
 * Monta uma refeição: escolhe um alimento por papel (girando pelo dia) e as
 * porções que chegam mais perto da meta de kcal (peso maior) e de proteína.
 * Se a combinação não fecha na tolerância, tenta outras (girando as
 * escolhas) e fica com a mais próxima. `avoid`: alimentos que não devem se
 * repetir (ex.: a proteína do almoço no jantar do mesmo dia).
 */
function buildMeal(
  target, foods, day, seed = '', avoid = new Set(), cheapOnly = false,
  eggsLeft = MAX_EGGS_PER_DAY,
) {
  const kind = kindOf(target.code);
  const variant = day + stableHash(seed + target.code) % 3;
  let best = null;
  for (let t = 0; t < MAX_TRIES; t++) {
    // Formato sem alimento possível (ex.: vegana sem castanha): o próximo.
    // Nas tentativas, o formato também gira (lanches e ceia).
    let roles = rolesFor(kind, variant + Math.floor(t / 2));
    for (let k = 1; k <= 3 && !roles.filter((r) => !r.optional).every((r) => foods.some(r.pick)); k++) {
      roles = rolesFor(kind, variant + Math.floor(t / 2) + k);
    }
    const chosen = chooseFoods(roles, foods, day, seed + target.code, avoid, cheapOnly, t, eggsLeft);
    const { portions, cost } = bestPortions(chosen, target, eggsLeft);
    if (!best || cost < best.cost) best = { chosen, portions, cost };
    const kcal = chosen.reduce((s, c, i) => s + (c.food.per100.kcal * portions[i] * c.food.measures[0].grams) / 100, 0);
    if (Math.abs(kcal - target.kcal) / target.kcal <= MEAL_KCAL_TOLERANCE / 2) { best = { chosen, portions, cost }; break; }
  }
  const { chosen, portions } = best ;
  const items = chosen.map((c, i) => ({ c, n: portions[i] })).filter((x) => x.n > 0).map((x) => item(x.c.food, x.n));
  const sum = (k) => Math.round(items.reduce((t, x) => t + x[k], 0) * 10) / 10;
  return { code: target.code, items, kcal: Math.round(sum('kcal')), proteinG: sum('proteinG'), carbsG: sum('carbsG'), fatG: sum('fatG') };
}

// ─── A semana ─────────────────────────────────────────────────────────────────

/**
 * Distância do dia até a meta: o total (kcal e proteína) e cada refeição
 * fora da sua faixa de kcal (contra a meta original da refeição).
 */
function dayCost(day, targets, kcal, prot) {
  const ek = (day.reduce((t, m) => t + m.kcal, 0) - kcal) / kcal;
  const ep = (day.reduce((t, m) => t + m.proteinG, 0) - prot) / prot;
  const out = Math.max(0, Math.abs(ek) - DAY_KCAL_TOLERANCE * 0.8) + Math.max(0, Math.abs(ep) - DAY_PROTEIN_TOLERANCE * 0.8);
  const meals = day.reduce((t, m, i) => t + Math.max(0, Math.abs(m.kcal - targets[i].kcal) / targets[i].kcal - MEAL_KCAL_TOLERANCE * 0.8) ** 2, 0);
  return ek * ek * 4 + ep * ep + out * out * 100 + meals * 30;
}

/** Remontagens do dia quando o total sai da meta. */
const DAY_PASSES = 3;

/**
 * Cardápio dos 7 dias (0 = segunda). Cada dia tem as refeições na ordem das
 * metas. Almoço e jantar do mesmo dia não repetem a proteína. Se o total do
 * dia sai da meta (as medidas caseiras não fecham em toda refeição), as
 * metas das refeições são corrigidas na proporção e o dia é remontado; fica
 * o dia mais perto da meta.
 */
function buildWeekMenu(targets, profile, seed = '') {
  const foods = allowedFoods(profile);
  const cheapOnly = profile.budget === 'economic';
  const dayKcal = targets.reduce((t, m) => t + m.kcal, 0);
  const dayProt = targets.reduce((t, m) => t + m.proteinG, 0);
  const eggsIn = (m) => m.items.filter((x) => /^Ovo /.test(x.name))
    .reduce((t, x) => t + Math.round(x.grams / BASIC_FOODS.find((f) => f.name === x.name) .measures[0].grams), 0);
  const buildDay = (day, ts) => {
    const avoid = new Set        ();
    let eggs = 0;
    return ts.map((t) => {
      const meal = buildMeal(t, foods, day, seed, t.code === 'dinner' ? avoid : new Set(), cheapOnly, MAX_EGGS_PER_DAY - eggs);
      if (t.code === 'lunch') meal.items.filter((x) => x.group === 'protein').forEach((x) => avoid.add(x.baseName));
      eggs += eggsIn(meal);
      return meal;
    });
  };
  return Array.from({ length: 7 }, (_, day) => {
    let ts = targets;
    let best = buildDay(day, ts);
    let bestCost = dayCost(best, targets, dayKcal, dayProt);
    let cur = best;
    for (let pass = 0; pass < DAY_PASSES && bestCost > 0; pass++) {
      const kr = dayKcal / Math.max(1, cur.reduce((t, m) => t + m.kcal, 0));
      const pr = dayProt / Math.max(1, cur.reduce((t, m) => t + m.proteinG, 0));
      if (Math.abs(kr - 1) <= DAY_KCAL_TOLERANCE * 0.8 && Math.abs(pr - 1) <= DAY_PROTEIN_TOLERANCE * 0.8) break;
      ts = ts.map((t) => ({ ...t, kcal: t.kcal * kr, proteinG: t.proteinG * pr }));
      cur = buildDay(day, ts);
      const c = dayCost(cur, targets, dayKcal, dayProt);
      if (c < bestCost) { best = cur; bestCost = c; }
    }
    return best;
  });
}
Object.assign(TF, { MEAL_KCAL_TOLERANCE, DAY_KCAL_TOLERANCE, DAY_PROTEIN_TOLERANCE, allowedFoods, SOY_PROTEIN, amountText, isCountableMeasure, MAX_EGGS_PER_DAY, buildMeal, buildWeekMenu });
})();

// ==== Copiado de src/nutrition/suggestedMenu.ts (sem a lista de compras e o plano do nutricionista, que o quiz nao usa) ====
(function () {
// Refeições automáticas do fim do onboarding (parte 5 da fase de
// alimentação, 1.2.0): na saída para a paywall, quem não tem nutricionista
// (tela 40) ganha um plano alimentar com source = 'suggested', as refeições
// do mapa único (nome, horário pelo sono da tela 16, kcal) e o cardápio da
// semana de cada uma em meals.suggested_items. Quem tem nutricionista fica
// sem refeições (o card de configurar da Nutrição oferece a importação).
//
// Parte pura (metas, cardápio e o que vai para o banco): a mesma que a
// prévia das telas 42 e 48 usa. A gravação fica em suggestedPlan.ts.
// Testado em supabase/tests/menuEngine.test.ts.

const { mealPlan } = TF;
const { targetsOf } = TF;
const { BASIC_FOODS } = TF;
const { buildWeekMenu } = TF;

/** Versão do formato de meals.suggested_items. */
const SUGGESTED_ITEMS_VERSION = 1;

/** Item no formato de meal_logs.foods_consumed_json (mesmo da busca). */

/**
 * Caminho da alimentação (tela 40). Rascunho antigo, sem a escolha: quem
 * disse ter nutricionista vai para 'nutritionist'; os outros, 'auto'. Sem
 * resposta nenhuma: null.
 */
function mealSetupOf(a) {
  if (a.mealSetupChoice) return a.mealSetupChoice;
  if (a.hasNutritionist == null) return null;
  return a.hasNutritionist ? 'nutritionist' : 'auto';
}

/** Perfil do cardápio a partir das respostas (telas 31, 32, 33 e 39). */
function menuProfileOf(a) {
  return {
    dietType: a.dietType,
    restrictions: a.foodRestrictions.filter((r) => r !== 'none'),
    dislikes: a.foodDislikes.filter((d) => d !== 'none' && d !== 'other'),
    budget: a.foodBudget,
  };
}

/** "HH:MM" a partir de minutos desde 0h (passa da meia-noite). */
function hhmm(min) {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

                                               

/**
 * Metas, refeições e cardápio da semana pelas respostas. `seed` fixa a
 * variação (o id da pessoa): a prévia do onboarding e o plano gravado são o
 * mesmo cardápio.
 */
function suggestedPlanOf(a, seed, today = new Date()) {
  const { energy } = targetsOf(a, today);
  const schedule = a.sleepSchedules.find((s) => s.days.includes(1)) ?? a.sleepSchedules[0];
  const slots = mealPlan(energy.kcal, energy.proteinG, a.mealCount, schedule?.waketime ?? '07:00', schedule?.bedtime ?? '23:00');
  const week = buildWeekMenu(
    slots.map((s) => ({ code: s.code, kcal: s.kcal, proteinG: s.proteinG })),
    menuProfileOf(a),
    seed,
);
  return {
    kcal: energy.kcal, proteinG: energy.proteinG, carbsG: energy.carbsG, fatG: energy.fatG,
    week,
    meals: slots.map((s, i) => ({
      name: s.name,
      scheduled_time: hhmm(s.atMin),
      total_kcal: s.kcal,
      sort_order: i,
      suggested_items: { version: SUGGESTED_ITEMS_VERSION, days: week.map((day) => day[i].items) },
    })),
  };
}

/** Dia da semana do cardápio (0 = segunda) de uma data "AAAA-MM-DD". */
function menuDayOf(date) {
  const [y, m, d] = date.split('-').map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

/** Sugestão de uma refeição numa data, ou null (refeição sem cardápio). */
function suggestionFor(suggested, date) {
  const s = suggested;
  if (!s || !Array.isArray(s.days) || s.days.length !== 7) return null;
  const items = s.days[menuDayOf(date)];
  return Array.isArray(items) && items.length > 0 ? items : null;
}

/** Itens da sugestão no formato do registro ("Comi isso", "Trocar"). */
function consumedFromMenu(items) {
  return items.map((it) => ({
    name: it.name, qty: 1, unit: it.amount, quantity_label: it.amount, grams: it.grams,
    kcal: it.kcal, protein_g: it.proteinG, carbs_g: it.carbsG, fat_g: it.fatG,
  }));
}

// ─── Pastas da semana (tela 42 e aba Nutrição) ────────────────────────────────

const WEEKDAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const WEEKDAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

/** "07:15" → "7h15"; "12:00" → "12h". */
function clockOf(hhmmStr) {
  const [h, m] = hhmmStr.slice(0, 5).split(':').map(Number);
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

/**
 * Os 7 dias do cardápio a partir das refeições (nome, horário e
 * suggested_items), começando por hoje ("Hoje · terça"); kcal e proteína de
 * cada refeição somam os itens do dia.
 */
function weekFolderDays(
  rows, todayIndex,
  /** 'today': "Hoje", "Qua"...; 'numbered': "Dia 1", "Dia 2"... (dia 1 = todayIndex). */
  labels = 'today',
) {
  const days = [];
  for (let k = 0; k < 7; k++) {
    const index = (todayIndex + k) % 7;
    const meals = rows.map((r) => {
      const s = r.suggested_items;
      const items = Array.isArray(s?.days?.[index]) ? s .days[index] : [];
      return {
        ...(r.id ? { mealId: r.id } : {}),
        name: r.name,
        time: clockOf(r.scheduled_time),
        kcal: items.reduce((t, it) => t + it.kcal, 0),
        proteinG: items.reduce((t, it) => t + it.proteinG, 0),
        items: items.map((it) => ({ name: it.name, amount: it.amount })),
      };
    }).filter((m) => m.items.length > 0);
    days.push(labels === 'numbered'
      ? { index, title: `Dia ${k + 1}`, short: `Dia ${k + 1}`, meals }
      : {
        index, title: k === 0 ? `Hoje · ${WEEKDAY_NAMES[index].toLowerCase()}` : WEEKDAY_NAMES[index],
        short: k === 0 ? 'Hoje' : WEEKDAY_SHORT[index], meals,
      });
  }
  return days;
}
Object.assign(TF, { SUGGESTED_ITEMS_VERSION, mealSetupOf, menuProfileOf, suggestedPlanOf, menuDayOf, suggestionFor, consumedFromMenu, weekFolderDays });
})();
