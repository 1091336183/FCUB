const BASE_STATS = {
  attack: 100,
  hp: 1500,
  defense: 50,
  critRate: 0.25,
  critDamage: 2.0
};

const QUALITY_CONFIG = {
  1: { name: '普通', color: '#999999', sellPrice: 20, multiplier: 1, rewardMultiplier: 1, hasUltimate: false },
  2: { name: '精良', color: '#00ff00', sellPrice: 50, multiplier: 1.3, rewardMultiplier: 1.3, hasUltimate: false },
  3: { name: '优秀', color: '#0080ff', sellPrice: 100, multiplier: 1.69, rewardMultiplier: 1.6, hasUltimate: false },
  4: { name: '杰出', color: '#a335ee', sellPrice: 150, multiplier: 2.197, rewardMultiplier: 1.92, hasUltimate: true },
  5: { name: '史诗', color: '#ff8000', sellPrice: 500, multiplier: 3.2955, rewardMultiplier: 2.304, hasUltimate: true },
  6: { name: '传奇', color: '#ff0000', sellPrice: 2000, multiplier: 4.94325, rewardMultiplier: 2.7648, hasUltimate: true },
  7: { name: '神话', color: '#ffd700', sellPrice: 5000, multiplier: 7.414875, rewardMultiplier: 3.31776, hasUltimate: true }
};

const CARD_NAMES = {
  1: ['史莱姆', '哥布林', '骷髅兵', '蝙蝠', '哥布林弓手', '骷髅法师', '狼人', '石像鬼'],
  2: ['剑士', '弓箭手', '法师', '骑士', '刺客', '牧师', '德鲁伊', '萨满'],
  3: ['狂战士', '精灵射手', '火焰法师', '圣骑士', '暗影刺客', '圣光牧师', '森林德鲁伊', '元素萨满'],
  4: ['战神', '神射手', '大魔导师', '神圣骑士', '影舞者', '大主教', '自然守护者', '风暴使者'],
  5: ['屠龙勇士', '精灵女王', '元素领主', '圣殿骑士团团长', '暗夜帝王', '教皇', '生命古树', '雷电之神'],
  6: ['泰坦', '凤凰', '冥王', '天使长', '死神', '时间领主', '空间行者', '混沌之神'],
  7: ['创世神', '毁灭之神', '命运女神', '虚空行者', '秩序之主', '混沌本源', '永恒守护者', '万界至尊']
};

const SYNTHESIZE_RULES = {
  1: { count: 3, targetQuality: 2 },
  2: { count: 3, targetQuality: 3 },
  3: { count: 5, targetQuality: 4 },
  4: { count: 5, targetQuality: 5 },
  5: { count: 10, targetQuality: 6 },
  6: { count: 15, targetQuality: 7 },
  7: { count: 2, targetMythLevel: '+1' }
};

const GACHA_CONFIG = {
  normal: {
    price: 1000,
    count: 8,
    probabilities: { 1: 0.5, 2: 0.3, 3: 0.15, 4: 0.05 }
  },
  advanced: {
    price: 5000,
    count: 8,
    probabilities: { 1: 0.3, 2: 0.35, 3: 0.25, 4: 0.08, 5: 0.02 }
  },
  myth: {
    price: 30000,
    count: 8,
    probabilities: { 3: 0.2, 4: 0.3, 5: 0.25, 6: 0.15, 7: 0.1 }
  }
};

const LEVEL_CONFIG = {
  totalLevels: 300,
  baseReward: 5,
  rewardIncrease: 5,
  bossBonus: 100,
  difficultyIncrease: 0.1,
  bossDifficultyMultiplier: 1.3,
  bossInterval: 10
};

const COLLECTION_BONUS = {
  1: 0.10,
  2: 0.20,
  3: 0.40,
  4: 0.60,
  5: 0.80,
  6: 1.00,
  7: { base: 2.00, perLevel: 0.30 }
};

function generateCardId() {
  return 'card_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getCardIndex(quality, name) {
  const names = CARD_NAMES[quality];
  return names.indexOf(name);
}

function calculateStats(base, quality, cardIndex, mythLevel = 0) {
  const config = QUALITY_CONFIG[quality];
  let multiplier = config.multiplier;
  if (quality === 7 && mythLevel > 0) {
    multiplier *= Math.pow(1.1, mythLevel);
  }
  
  const positionBonus = 1 + cardIndex * 0.02;
  
  const statVariations = [
    { attack: 0.95, hp: 1.05, defense: 1.0, critRate: 0.23 },
    { attack: 0.97, hp: 1.02, defense: 1.0, critRate: 0.24 },
    { attack: 1.0, hp: 1.0, defense: 1.0, critRate: 0.25 },
    { attack: 1.02, hp: 0.98, defense: 1.0, critRate: 0.26 },
    { attack: 1.04, hp: 0.96, defense: 1.0, critRate: 0.27 },
    { attack: 1.06, hp: 0.94, defense: 1.0, critRate: 0.28 },
    { attack: 1.08, hp: 0.92, defense: 1.0, critRate: 0.29 },
    { attack: 1.1, hp: 0.9, defense: 1.0, critRate: 0.3 }
  ];
  
  const variation = statVariations[cardIndex];
  
  return {
    attack: Math.floor(base.attack * multiplier * variation.attack * positionBonus),
    hp: Math.floor(base.hp * multiplier * variation.hp * positionBonus),
    defense: Math.floor(base.defense * multiplier * variation.defense * positionBonus),
    critRate: variation.critRate,
    critDamage: base.critDamage,
    hasUltimate: config.hasUltimate,
    ultimateDamage: config.hasUltimate ? 500 : 0
  };
}

function createCard(quality, mythLevel = 0, name = null) {
  const names = CARD_NAMES[quality];
  const cardName = name || names[Math.floor(Math.random() * names.length)];
  const cardIndex = getCardIndex(quality, cardName);
  const stats = calculateStats(BASE_STATS, quality, cardIndex, mythLevel);
  return {
    id: generateCardId(),
    name: cardName,
    quality: quality,
    mythLevel: mythLevel,
    ...stats
  };
}