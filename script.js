let gameState = {
  gold: 10000,
  cards: [],
  currentLevel: 1,
  maxLevel: 1,
  unlockedLevels: [1],
  selectedCards: [],
  battleCards: [],
  collectedCards: [],
  battleState: null
};

let currentFilter = 'all';
let selectedCardIds = [];
let synthesizeQuality = null;
let synthesizeSelectedIds = [];
let isAutoBattle = false;
let autoBattleTimeout = null;

function init() {
  loadGame();
  updateUI();
  setupEventListeners();
  renderLevelGrid();
  renderCollection();
}

function setupEventListeners() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      switchTab(e.target.closest('.tab-btn').dataset.tab);
    });
  });
}

function saveGame() {
  localStorage.setItem('cardGame_player', JSON.stringify(gameState));
}

function loadGame() {
  const saved = localStorage.getItem('cardGame_player');
  if (saved) {
    gameState = JSON.parse(saved);
  } else {
    initializeNewGame();
  }
}

function initializeNewGame() {
  gameState = {
    gold: 10000,
    cards: [],
    currentLevel: 1,
    maxLevel: 1,
    unlockedLevels: [1],
    selectedCards: [],
    battleCards: [],
    collectedCards: []
  };
  saveGame();
}

function updateUI() {
  document.getElementById('gold-display').textContent = gameState.gold;
  document.getElementById('level-display').textContent = '第' + gameState.currentLevel + '关';
  document.getElementById('max-level-display').textContent = '最高: ' + gameState.maxLevel;
  document.getElementById('home-gold').textContent = gameState.gold;
  document.getElementById('home-card-count').textContent = gameState.cards.length;
  document.getElementById('home-level').textContent = gameState.currentLevel;
  
  renderInventory();
  renderSynthesizeButtons();
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
  document.getElementById(tabId).classList.add('active');
  
  if (tabId === 'inventory') {
    renderInventory();
  } else if (tabId === 'synthesize') {
    renderSynthesizeButtons();
  } else if (tabId === 'battle') {
    renderLevelGrid();
  } else if (tabId === 'collection') {
    renderCollection();
  }
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

function showConfirmModal(title, message, onConfirm) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 400px; width: 90%;">
      <h3>${title}</h3>
      <p>${message}</p>
      <div style="display: flex; justify-content: center; gap: 20px; margin-top: 20px;">
        <button class="action-btn secondary" onclick="this.closest('.modal').remove()">取消</button>
        <button class="action-btn primary" onclick="this.closest('.modal').remove(); ${onConfirm.name}()">确定</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function performGacha(type) {
  const config = GACHA_CONFIG[type];
  if (gameState.gold < config.price) {
    showToast('金币不足！');
    return;
  }
  
  gameState.gold -= config.price;
  
  const results = [];
  for (let i = 0; i < config.count; i++) {
    const quality = getRandomQuality(config.probabilities);
    const card = createCard(quality);
    results.push(card);
    gameState.cards.push(card);
    
    if (!gameState.collectedCards.includes(card.name)) {
      gameState.collectedCards.push(card.name);
    }
  }
  
  showGachaResult(results);
  saveGame();
  updateUI();
}

function getRandomQuality(probabilities) {
  const rand = Math.random();
  let cumulative = 0;
  for (const [quality, prob] of Object.entries(probabilities)) {
    cumulative += prob;
    if (rand < cumulative) {
      return parseInt(quality);
    }
  }
  return 1;
}

function showGachaResult(cards) {
  const resultDiv = document.getElementById('gacha-result');
  resultDiv.innerHTML = '<h3>抽卡结果</h3>';
  
  const cardGrid = document.createElement('div');
  cardGrid.style.display = 'grid';
  cardGrid.style.gridTemplateColumns = 'repeat(4, 1fr)';
  cardGrid.style.gap = '10px';
  
  cards.forEach((card, index) => {
    const cardEl = createCardElement(card);
    cardEl.style.animationDelay = `${index * 0.1}s`;
    cardGrid.appendChild(cardEl);
  });
  
  resultDiv.appendChild(cardGrid);
}

const CARD_ICONS = {
  1: { '史莱姆': '👾', '哥布林': '👺', '骷髅兵': '💀', '蝙蝠': '🦇', '哥布林弓手': '🏹', '骷髅法师': '🧙', '狼人': '🐺', '石像鬼': '🗿' },
  2: { '剑士': '⚔️', '弓箭手': '🏹', '法师': '🧙', '骑士': '🛡️', '刺客': '🗡️', '牧师': '⛪', '德鲁伊': '🌿', '萨满': '🔮' },
  3: { '狂战士': '💥', '精灵射手': '🏹', '火焰法师': '🔥', '圣骑士': '⚜️', '暗影刺客': '🌑', '圣光牧师': '✨', '森林德鲁伊': '🌲', '元素萨满': '⚡' },
  4: { '战神': '🛡️', '神射手': '🎯', '大魔导师': '🔮', '神圣骑士': '⚔️', '影舞者': '🌀', '大主教': '⛪', '自然守护者': '🌳', '风暴使者': '🌪️' },
  5: { '屠龙勇士': '🐉', '精灵女王': '👸', '元素领主': '💫', '圣殿骑士团团长': '🏰', '暗夜帝王': '👑', '教皇': '⛅', '生命古树': '🌲', '雷电之神': '⚡' },
  6: { '泰坦': '🏛️', '凤凰': '🔥', '冥王': '💀', '天使长': '👼', '死神': '☠️', '时间领主': '⏳', '空间行者': '🌀', '混沌之神': '🌌' },
  7: { '创世神': '🌟', '毁灭之神': '💥', '命运女神': '🔮', '虚空行者': '🌑', '秩序之主': '⚖️', '混沌本源': '🌀', '永恒守护者': '🛡️', '万界至尊': '👑' }
};

function getCardIcon(card) {
  const icons = CARD_ICONS[card.quality];
  return icons ? icons[card.name] || '❓' : '❓';
}

function createCardElement(card) {
  const config = QUALITY_CONFIG[card.quality];
  const el = document.createElement('div');
  el.className = `card card-${card.quality}`;
  el.dataset.id = card.id;
  
  const mythSuffix = card.quality === 7 && card.mythLevel > 0 ? '+' + card.mythLevel : '';
  const icon = getCardIcon(card);
  
  el.innerHTML = `
    <div class="card-header">
      <div class="card-icon">${icon}</div>
      <div class="card-name">${card.name}</div>
      <div class="quality-badge">${config.name}${mythSuffix}</div>
    </div>
    <div class="card-stats">
      <div class="stat-row"><span>攻击</span><span>${card.attack}</span></div>
      <div class="stat-row"><span>生命</span><span>${card.hp}</span></div>
      <div class="stat-row"><span>防御</span><span>${card.defense}</span></div>
      <div class="stat-row"><span>暴击</span><span>${(card.critRate * 100).toFixed(0)}%</span></div>
    </div>
    ${card.hasUltimate ? '<div style="text-align:center;color:#ffd700;font-size:0.8em;margin-top:5px">必杀技 +500</div>' : ''}
    <div class="card-actions" style="margin-top:auto">
      <button class="card-btn sell" onclick="sellCard('${card.id}')">出售</button>
      <button class="card-btn select" onclick="toggleCardSelection('${card.id}')">${selectedCardIds.includes(card.id) ? '取消' : '选中'}</button>
    </div>
  `;
  
  return el;
}

function renderInventory() {
  const grid = document.getElementById('inventory-grid');
  grid.innerHTML = '';
  
  let filteredCards = gameState.cards;
  if (currentFilter !== 'all') {
    filteredCards = gameState.cards.filter(c => c.quality === parseInt(currentFilter));
  }
  
  filteredCards.sort((a, b) => {
    if (b.quality !== a.quality) {
      return b.quality - a.quality;
    }
    return b.attack - a.attack;
  });
  
  if (filteredCards.length === 0) {
    grid.innerHTML = '<div style="text-align:center;color:#aaa;padding:50px">暂无卡片</div>';
    return;
  }
  
  filteredCards.forEach(card => {
    const el = createCardElement(card);
    if (selectedCardIds.includes(card.id)) {
      el.classList.add('selected');
    }
    grid.appendChild(el);
  });
}

function filterCards(filter) {
  currentFilter = filter;
  document.querySelectorAll('.inventory-filter .filter-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`.inventory-filter .filter-btn[data-filter="${filter}"]`).classList.add('active');
  renderInventory();
}

function toggleCardSelection(cardId) {
  const index = selectedCardIds.indexOf(cardId);
  if (index > -1) {
    selectedCardIds.splice(index, 1);
  } else {
    if (selectedCardIds.length >= 3) {
      showToast('最多选择3张卡片');
      return;
    }
    selectedCardIds.push(cardId);
  }
  renderInventory();
}

function sellCard(cardId) {
  const card = gameState.cards.find(c => c.id === cardId);
  if (!card) return;
  
  const config = QUALITY_CONFIG[card.quality];
  let sellPrice = config.sellPrice;
  
  if (card.quality === 7 && card.mythLevel > 0) {
    sellPrice = Math.floor(sellPrice * Math.pow(1.1, card.mythLevel));
  }
  
  gameState.gold += sellPrice;
  gameState.cards = gameState.cards.filter(c => c.id !== cardId);
  selectedCardIds = selectedCardIds.filter(id => id !== cardId);
  
  showToast(`出售成功！获得 ${sellPrice} 金币`);
  saveGame();
  updateUI();
}

function sellSelectedCards() {
  if (selectedCardIds.length === 0) {
    showToast('请先选择要出售的卡片');
    return;
  }
  
  let totalPrice = 0;
  selectedCardIds.forEach(id => {
    const card = gameState.cards.find(c => c.id === id);
    if (card) {
      const config = QUALITY_CONFIG[card.quality];
      let sellPrice = config.sellPrice;
      if (card.quality === 7 && card.mythLevel > 0) {
        sellPrice = Math.floor(sellPrice * Math.pow(1.1, card.mythLevel));
      }
      totalPrice += sellPrice;
    }
  });
  
  gameState.gold += totalPrice;
  gameState.cards = gameState.cards.filter(c => !selectedCardIds.includes(c.id));
  selectedCardIds = [];
  
  showToast(`出售成功！获得 ${totalPrice} 金币`);
  saveGame();
  updateUI();
}

function renderSynthesizeButtons() {
  document.querySelectorAll('.synthesize-btn').forEach(btn => {
    const quality = parseInt(btn.parentElement.dataset.quality);
    btn.disabled = !canSynthesize(quality);
  });
}

function canSynthesize(quality) {
  const rule = SYNTHESIZE_RULES[quality];
  if (!rule) return false;
  
  if (quality === 7) {
    const count = gameState.cards.filter(c => c.quality === 7 && c.mythLevel === 0).length;
    return count >= rule.count;
  }
  
  const count = gameState.cards.filter(c => c.quality === quality && c.mythLevel === 0).length;
  return count >= rule.count;
}

function openSynthesizeModal(quality) {
  if (!canSynthesize(quality)) {
    showToast('卡片数量不足！');
    return;
  }
  
  synthesizeQuality = quality;
  synthesizeSelectedIds = [];
  
  const rule = SYNTHESIZE_RULES[quality];
  const config = QUALITY_CONFIG[quality];
  
  document.getElementById('synthesize-modal-title').textContent = `选择${config.name}卡片进行合成`;
  document.getElementById('synthesize-modal-desc').textContent = `请选择 ${rule.count} 张${config.name}卡片进行合成`;
  
  renderSynthesizeSelectGrid();
  
  document.getElementById('synthesize-modal').style.display = 'flex';
}

function closeSynthesizeModal() {
  document.getElementById('synthesize-modal').style.display = 'none';
  synthesizeQuality = null;
  synthesizeSelectedIds = [];
}

function renderSynthesizeSelectGrid() {
  const grid = document.getElementById('synthesize-select-grid');
  grid.innerHTML = '';
  
  const rule = SYNTHESIZE_RULES[synthesizeQuality];
  
  let filteredCards = gameState.cards.filter(c => c.quality === synthesizeQuality);
  if (synthesizeQuality !== 7) {
    filteredCards = filteredCards.filter(c => c.mythLevel === 0);
  } else {
    filteredCards = filteredCards.filter(c => c.mythLevel === 0);
  }
  
  if (filteredCards.length === 0) {
    grid.innerHTML = '<div style="text-align:center;color:#aaa;padding:50px">暂无可用卡片</div>';
    return;
  }
  
  filteredCards.forEach(card => {
    const config = QUALITY_CONFIG[card.quality];
    const isSelected = synthesizeSelectedIds.includes(card.id);
    const el = document.createElement('div');
    el.className = `card card-${card.quality} ${isSelected ? 'selected' : ''}`;
    el.dataset.id = card.id;
    
    const mythSuffix = card.quality === 7 && card.mythLevel > 0 ? '+' + card.mythLevel : '';
    const icon = getCardIcon(card);
    
    el.innerHTML = `
      <div class="card-header">
        <div class="card-icon">${icon}</div>
        <div class="card-name">${card.name}</div>
        <div class="quality-badge">${config.name}${mythSuffix}</div>
      </div>
      <div class="card-stats">
        <div class="stat-row"><span>攻击</span><span>${card.attack}</span></div>
        <div class="stat-row"><span>生命</span><span>${card.hp}</span></div>
        <div class="stat-row"><span>防御</span><span>${card.defense}</span></div>
        <div class="stat-row"><span>暴击</span><span>${(card.critRate * 100).toFixed(0)}%</span></div>
      </div>
      ${card.hasUltimate ? '<div style="text-align:center;color:#ffd700;font-size:0.8em;margin-top:5px">必杀技 +500</div>' : ''}
      <button class="card-btn ${isSelected ? 'sell' : 'select'}" onclick="toggleSynthesizeSelection('${card.id}')" style="margin-top:auto">${isSelected ? '取消选择' : '选择'}</button>
    `;
    
    grid.appendChild(el);
  });
  
  updateSynthesizeConfirmButton();
}

function toggleSynthesizeSelection(cardId) {
  const rule = SYNTHESIZE_RULES[synthesizeQuality];
  const index = synthesizeSelectedIds.indexOf(cardId);
  
  if (index > -1) {
    synthesizeSelectedIds.splice(index, 1);
  } else {
    if (synthesizeSelectedIds.length >= rule.count) {
      showToast(`最多选择 ${rule.count} 张卡片`);
      return;
    }
    synthesizeSelectedIds.push(cardId);
  }
  
  renderSynthesizeSelectGrid();
}

function updateSynthesizeConfirmButton() {
  const rule = SYNTHESIZE_RULES[synthesizeQuality];
  const btn = document.getElementById('synthesize-confirm-btn');
  btn.disabled = synthesizeSelectedIds.length !== rule.count;
}

function confirmSynthesize() {
  const rule = SYNTHESIZE_RULES[synthesizeQuality];
  
  if (synthesizeSelectedIds.length !== rule.count) {
    showToast(`请选择 ${rule.count} 张卡片！`);
    return;
  }
  
  gameState.cards = gameState.cards.filter(c => !synthesizeSelectedIds.includes(c.id));
  
  if (synthesizeQuality === 7) {
    gameState.cards.splice(0, 0, createCard(7, 1));
    showToast('神话升级成功！获得神话+1');
  } else {
    gameState.cards.splice(0, 0, createCard(rule.targetQuality));
    showToast(`合成成功！获得 ${QUALITY_CONFIG[rule.targetQuality].name}`);
  }
  
  closeSynthesizeModal();
  saveGame();
  updateUI();
}

function renderLevelGrid() {
  const grid = document.getElementById('level-grid');
  grid.innerHTML = '';
  
  for (let i = 1; i <= Math.min(gameState.maxLevel + 1, LEVEL_CONFIG.totalLevels); i++) {
    const isUnlocked = gameState.unlockedLevels.includes(i);
    const isCurrent = i === gameState.currentLevel;
    const isBoss = i % LEVEL_CONFIG.bossInterval === 0;
    
    const btn = document.createElement('button');
    btn.className = `level-btn ${isUnlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current' : ''} ${isBoss ? 'boss' : ''}`;
    btn.textContent = i;
    btn.disabled = !isUnlocked;
    
    if (isUnlocked) {
      btn.onclick = () => startBattle(i);
    }
    
    grid.appendChild(btn);
  }
}

function startBattle(level) {
  if (!gameState.battleCards || gameState.battleCards.length !== 3) {
    showToast('请先在背包中选择3张卡片！');
    switchTab('inventory');
    return;
  }
  
  const isBoss = level % LEVEL_CONFIG.bossInterval === 0;
  
  const playerCards = [...gameState.battleCards];
  const enemyCards = generateEnemyCards(level);
  
  gameState.battleState = {
    level: level,
    isBoss: isBoss,
    playerCards: playerCards.map(c => ({ ...c, currentHp: c.hp })),
    enemyCards: enemyCards.map(c => ({ ...c, currentHp: c.hp })),
    turn: 'player',
    log: []
  };
  
  document.getElementById('level-grid').style.display = 'none';
  document.getElementById('battle-scene').style.display = 'block';
  document.getElementById('battle-level').textContent = level;
  document.getElementById('battle-boss').textContent = isBoss ? 'BOSS关卡' : '';
  document.getElementById('battle-boss').style.display = isBoss ? 'inline' : 'none';
  
  renderBattleCards();
  renderBattleLog();
}

function generateEnemyCards(level) {
  const isBoss = level % LEVEL_CONFIG.bossInterval === 0;
  
  const cycleIndex = Math.floor((level - 1) / 10);
  const cycleBaseMultiplier = Math.pow(1.16, cycleIndex);
  
  const levelInCycle = (level - 1) % 10 + 1;
  
  let multiplier = 1;
  if (levelInCycle === 10) {
    multiplier = cycleBaseMultiplier * 1.16 * 1.2;
  } else {
    multiplier = cycleBaseMultiplier * Math.pow(1.02, levelInCycle - 1);
  }
  
  let enemyQuality = 1;
  if (level >= 20) enemyQuality = 2;
  if (level >= 40) enemyQuality = 3;
  if (level >= 60) enemyQuality = 4;
  if (level >= 100) enemyQuality = 5;
  if (level >= 150) enemyQuality = 6;
  if (level >= 200) enemyQuality = 7;
  
  const enemyCards = [];
  for (let i = 0; i < 3; i++) {
    const card = createCard(enemyQuality);
    card.attack = Math.floor(card.attack * multiplier);
    card.hp = Math.floor(card.hp * multiplier);
    card.defense = Math.floor(card.defense * multiplier);
    enemyCards.push(card);
  }
  
  return enemyCards;
}

function renderBattleCards() {
  const playerContainer = document.getElementById('player-cards');
  const enemyContainer = document.getElementById('enemy-cards');
  
  playerContainer.innerHTML = '';
  enemyContainer.innerHTML = '';
  
  gameState.battleState.playerCards.forEach((card, index) => {
    const el = createBattleCardElement(card, 'player', index);
    playerContainer.appendChild(el);
  });
  
  gameState.battleState.enemyCards.forEach((card, index) => {
    const el = createBattleCardElement(card, 'enemy', index);
    enemyContainer.appendChild(el);
  });
}

function createBattleCardElement(card, side, index) {
  const config = QUALITY_CONFIG[card.quality];
  const hpPercent = (card.currentHp / card.hp) * 100;
  const isDead = card.currentHp <= 0;
  const hpClass = isDead ? 'critical' : hpPercent > 50 ? '' : hpPercent > 20 ? 'low' : 'critical';
  
  const el = document.createElement('div');
  el.className = `card card-${card.quality} ${isDead ? 'dead' : ''} ${hpPercent <= 20 ? 'hp-critical' : ''}`;
  el.dataset.side = side;
  el.dataset.index = index;
  
  if (side === 'enemy' && !isDead) {
    el.onclick = () => selectEnemyTarget(index);
  }
  
  const icon = getCardIcon(card);
  
  el.innerHTML = `
    <div class="card-header">
      <div class="card-icon">${icon}</div>
      <div class="card-name">${card.name}</div>
      <div class="quality-badge">${config.name}</div>
    </div>
    <div class="card-stats">
      <div class="stat-row"><span>攻击</span><span>${card.attack}</span></div>
      <div class="stat-row"><span>生命</span><span>${card.currentHp}/${card.hp}</span></div>
      <div class="stat-row"><span>防御</span><span>${card.defense}</span></div>
      <div class="stat-row"><span>暴击</span><span>${(card.critRate * 100).toFixed(0)}%</span></div>
    </div>
    <div class="card-hp-bar" style="margin-top:5px">
      <div class="card-hp-fill ${hpClass}" style="width:${hpPercent}%"></div>
    </div>
    ${card.hasUltimate ? '<div style="text-align:center;color:#ffd700;font-size:0.8em;margin-top:5px">必杀技 +500</div>' : ''}
  `;
  
  return el;
}

let selectedTarget = null;

function selectEnemyTarget(index) {
  if (gameState.battleState.turn !== 'player') return;
  
  const targetCard = gameState.battleState.enemyCards[index];
  if (targetCard.currentHp <= 0) {
    showToast('目标已死亡！');
    return;
  }
  
  document.querySelectorAll('.battle-card').forEach(c => c.classList.remove('selected'));
  document.querySelector(`.battle-card[data-side="enemy"][data-index="${index}"]`).classList.add('selected');
  selectedTarget = index;
}

function renderBattleLog() {
  const log = document.getElementById('battle-log');
  log.innerHTML = gameState.battleState.log.map(entry => `<p>${entry}</p>`).join('');
  log.scrollTop = log.scrollHeight;
}

function playerAttack() {
  if (gameState.battleState.turn !== 'player') {
    showToast('请等待敌方回合！');
    return;
  }
  
  const alivePlayerCards = gameState.battleState.playerCards.filter(c => c.currentHp > 0);
  const aliveEnemyCards = gameState.battleState.enemyCards.filter(c => c.currentHp > 0);
  
  if (alivePlayerCards.length === 0 || aliveEnemyCards.length === 0) {
    checkBattleResult();
    return;
  }
  
  if (selectedTarget === null) {
    selectedTarget = Math.floor(Math.random() * aliveEnemyCards.length);
  }
  
  const attacker = alivePlayerCards[0];
  const target = gameState.battleState.enemyCards[selectedTarget];
  
  if (target.currentHp <= 0) {
    const aliveIndices = aliveEnemyCards.map(c => gameState.battleState.enemyCards.indexOf(c));
    if (aliveIndices.length > 0) {
      selectedTarget = aliveIndices[Math.floor(Math.random() * aliveIndices.length)];
    } else {
      checkBattleResult();
      return;
    }
  }
  
  const result = calculateDamage(attacker, target);
  target.currentHp = Math.max(0, target.currentHp - result.damage);
  
  let logMessage = `[我方] ${attacker.name} 攻击 ${target.name}，造成 ${result.damage} 点伤害`;
  if (result.isCrit) logMessage += ' 暴击！';
  if (result.isUltimate) logMessage += ' 触发必杀技！';
  if (target.currentHp <= 0) logMessage += ' 击败！';
  
  gameState.battleState.log.push(logMessage);
  
  selectedTarget = null;
  gameState.battleState.turn = 'enemy';
  
  renderBattleCards();
  renderBattleLog();
  
  if (checkBattleResult()) return;
  
  setTimeout(enemyAttack, 1000);
}

function calculateDamage(attacker, defender) {
  const randomFactor = 0.8 + Math.random() * 0.4;
  let baseDamage = attacker.attack * randomFactor;
  let isCrit = false;
  let isUltimate = false;
  
  if (Math.random() < attacker.critRate) {
    baseDamage *= attacker.critDamage;
    isCrit = true;
  }
  
  if (attacker.hasUltimate && Math.random() < 0.3) {
    baseDamage += attacker.ultimateDamage;
    isUltimate = true;
  }
  
  const finalDamage = Math.max(1, Math.floor(baseDamage - defender.defense * 0.5));
  
  return { damage: finalDamage, isCrit, isUltimate };
}

function enemyAttack() {
  if (gameState.battleState.turn !== 'enemy') return;
  
  const alivePlayerCards = gameState.battleState.playerCards.filter(c => c.currentHp > 0);
  const aliveEnemyCards = gameState.battleState.enemyCards.filter(c => c.currentHp > 0);
  
  if (alivePlayerCards.length === 0 || aliveEnemyCards.length === 0) {
    checkBattleResult();
    return;
  }
  
  const attacker = aliveEnemyCards[0];
  const targetIndex = Math.floor(Math.random() * alivePlayerCards.length);
  const target = gameState.battleState.playerCards.find(c => c.id === alivePlayerCards[targetIndex].id);
  
  const result = calculateDamage(attacker, target);
  target.currentHp = Math.max(0, target.currentHp - result.damage);
  
  let logMessage = `[对方] ${attacker.name} 攻击 ${target.name}，造成 ${result.damage} 点伤害`;
  if (result.isCrit) logMessage += ' 暴击！';
  if (result.isUltimate) logMessage += ' 触发必杀技！';
  if (target.currentHp <= 0) logMessage += ' 击败！';
  
  gameState.battleState.log.push(logMessage);
  
  gameState.battleState.turn = 'player';
  
  renderBattleCards();
  renderBattleLog();
  
  checkBattleResult();
}

function checkBattleResult() {
  const alivePlayerCards = gameState.battleState.playerCards.filter(c => c.currentHp > 0);
  const aliveEnemyCards = gameState.battleState.enemyCards.filter(c => c.currentHp > 0);
  
  if (alivePlayerCards.length === 0) {
    showBattleResult(false);
    return true;
  }
  
  if (aliveEnemyCards.length === 0) {
    showBattleResult(true);
    return true;
  }
  
  return false;
}

function showBattleResult(isVictory) {
  stopAutoBattle();
  
  const resultDiv = document.getElementById('battle-result');
  const icon = document.getElementById('result-icon');
  const title = document.getElementById('result-title');
  const reward = document.getElementById('result-reward');
  
  document.getElementById('battle-scene').style.display = 'none';
  resultDiv.style.display = 'block';
  
  const level = gameState.battleState.level;
  
  let victoryReward = 0;
  gameState.battleState.enemyCards.forEach(card => {
    const config = QUALITY_CONFIG[card.quality];
    const cardReward = card.attack * 0.5 * config.rewardMultiplier;
    victoryReward += cardReward;
  });
  
  if (gameState.battleState.isBoss) {
    victoryReward = victoryReward * 1.5;
  }
  
  const displayReward = isVictory ? victoryReward.toFixed(2) : (victoryReward * 0.2).toFixed(2);
  const totalReward = parseFloat(displayReward);
  
  if (isVictory) {
    icon.textContent = '🎉';
    title.textContent = '战斗胜利！';
    
    gameState.gold += totalReward;
    
    const droppedCards = dropCards(level);
    let rewardText = `获得 ${totalReward} 金币`;
    
    if (droppedCards.length > 0) {
      rewardText += `<br>获得 ${droppedCards.length} 张卡片：`;
      droppedCards.forEach(card => {
        const config = QUALITY_CONFIG[card.quality];
        rewardText += `<span style="color:${config.color}"> ${card.name}</span>`;
        gameState.cards.push(card);
        
        if (!gameState.collectedCards.includes(card.name)) {
          gameState.collectedCards.push(card.name);
        }
      });
    }
    
    reward.innerHTML = rewardText;
    
    if (level > gameState.maxLevel) {
      gameState.maxLevel = level;
    }
    
    if (level >= gameState.currentLevel) {
      gameState.currentLevel = level + 1;
    }
    
    if (!gameState.unlockedLevels.includes(level + 1) && level + 1 <= LEVEL_CONFIG.totalLevels) {
      gameState.unlockedLevels.push(level + 1);
    }
    
    const nextBtn = document.getElementById('next-battle-btn');
    if (level + 1 <= LEVEL_CONFIG.totalLevels) {
      nextBtn.style.display = 'inline-block';
    } else {
      nextBtn.style.display = 'none';
    }
    
    document.getElementById('retry-battle-btn').style.display = 'inline-block';
  } else {
    icon.textContent = '💀';
    title.textContent = '战斗失败';
    const failReward = Math.floor(totalReward * 0.2);
    reward.textContent = `获得 ${failReward} 金币（20%）`;
    gameState.gold += failReward;
    
    document.getElementById('next-battle-btn').style.display = 'none';
    document.getElementById('retry-battle-btn').style.display = 'inline-block';
  }
  
  saveGame();
  updateUI();
}

function nextBattle() {
  const currentLevel = gameState.battleState.level;
  closeBattleResult();
  startBattle(currentLevel + 1);
}

function retryBattle() {
  const currentLevel = gameState.battleState.level;
  closeBattleResult();
  startBattle(currentLevel);
}

function dropCards(level) {
  const rand = Math.random();
  let dropCount = 0;
  
  if (rand < 0.5) {
    dropCount = 0;
  } else if (rand < 0.9) {
    dropCount = 1;
  } else {
    dropCount = 2;
  }
  
  const droppedCards = [];
  for (let i = 0; i < dropCount; i++) {
    const card = generateDropCard(level);
    droppedCards.push(card);
  }
  
  return droppedCards;
}

function generateDropCard(level) {
  let quality = 1;
  if (level >= 20) quality = Math.min(2, Math.floor(Math.random() * 2) + 1);
  if (level >= 40) quality = Math.min(3, Math.floor(Math.random() * 3) + 1);
  if (level >= 60) quality = Math.min(4, Math.floor(Math.random() * 4) + 1);
  if (level >= 100) quality = Math.min(5, Math.floor(Math.random() * 5) + 1);
  if (level >= 150) quality = Math.min(6, Math.floor(Math.random() * 6) + 1);
  if (level >= 200) quality = Math.min(7, Math.floor(Math.random() * 7) + 1);
  
  return createCard(quality);
}

function toggleAutoBattle() {
  if (!gameState.battleState) return;
  
  isAutoBattle = !isAutoBattle;
  const btn = document.getElementById('auto-battle-btn');
  
  if (isAutoBattle) {
    btn.textContent = '停止战斗';
    btn.style.background = '#ff4444';
    btn.style.color = '#fff';
    autoBattleLoop();
  } else {
    btn.textContent = '自动战斗';
    btn.style.background = '';
    btn.style.color = '';
    if (autoBattleTimeout) {
      clearTimeout(autoBattleTimeout);
      autoBattleTimeout = null;
    }
  }
}

function autoBattleLoop() {
  if (!isAutoBattle || !gameState.battleState) {
    stopAutoBattle();
    return;
  }
  
  const alivePlayerCards = gameState.battleState.playerCards.filter(c => c.currentHp > 0);
  const aliveEnemyCards = gameState.battleState.enemyCards.filter(c => c.currentHp > 0);
  
  if (alivePlayerCards.length === 0 || aliveEnemyCards.length === 0) {
    checkBattleResult();
    stopAutoBattle();
    return;
  }
  
  if (gameState.battleState.turn === 'player') {
    if (selectedTarget !== null) {
      const currentTarget = gameState.battleState.enemyCards[selectedTarget];
      if (currentTarget && currentTarget.currentHp <= 0) {
        selectedTarget = null;
      }
    }
    
    if (selectedTarget === null) {
      const aliveIndices = gameState.battleState.enemyCards
        .map((c, i) => c.currentHp > 0 ? i : -1)
        .filter(i => i !== -1);
      if (aliveIndices.length > 0) {
        selectedTarget = aliveIndices[Math.floor(Math.random() * aliveIndices.length)];
      }
    }
    
    if (selectedTarget !== null) {
      playerAttack();
    }
  }
  
  autoBattleTimeout = setTimeout(autoBattleLoop, 1200);
}

function stopAutoBattle() {
  isAutoBattle = false;
  const btn = document.getElementById('auto-battle-btn');
  if (btn) {
    btn.textContent = '自动战斗';
    btn.style.background = '';
    btn.style.color = '';
  }
  if (autoBattleTimeout) {
    clearTimeout(autoBattleTimeout);
    autoBattleTimeout = null;
  }
}

function battleFlee() {
  showConfirmModal('确定要逃跑吗？', '逃跑将无法获得任何奖励！', () => {
    closeBattleResult();
  });
}

function closeBattleResult() {
  stopAutoBattle();
  document.getElementById('battle-result').style.display = 'none';
  document.getElementById('battle-scene').style.display = 'none';
  document.getElementById('level-grid').style.display = 'grid';
  renderLevelGrid();
  gameState.battleState = null;
  selectedTarget = null;
}

function renderCollection() {
  const grid = document.getElementById('collection-grid');
  grid.innerHTML = '';
  
  let filteredQualities = [1, 2, 3, 4, 5, 6, 7];
  if (currentFilter !== 'all') {
    filteredQualities = [parseInt(currentFilter)];
  }
  
  filteredQualities.forEach(quality => {
    CARD_NAMES[quality].forEach(name => {
      const isUnlocked = gameState.collectedCards.includes(name);
      
      const el = document.createElement('div');
      el.className = `card card-${quality} ${isUnlocked ? '' : 'locked'}`;
      
      const cardIndex = getCardIndex(quality, name);
      const stats = calculateStats(BASE_STATS, quality, cardIndex);
      const icon = getCardIcon({ quality, name });
      
      el.innerHTML = `
        <div class="card-header">
          <div class="card-icon">${isUnlocked ? icon : '❓'}</div>
          <div class="card-name">${name}</div>
          <div class="quality-badge">${QUALITY_CONFIG[quality].name}</div>
        </div>
        ${isUnlocked ? `
        <div class="card-stats">
          <div class="stat-row"><span>攻击</span><span>${stats.attack}</span></div>
          <div class="stat-row"><span>生命</span><span>${stats.hp}</span></div>
          <div class="stat-row"><span>防御</span><span>${stats.defense}</span></div>
          <div class="stat-row"><span>暴击</span><span>${(stats.critRate * 100).toFixed(0)}%</span></div>
        </div>
        ${stats.hasUltimate ? '<div style="text-align:center;color:#ffd700;font-size:0.8em;margin-top:5px">必杀技 +500</div>' : ''}
        ` : '<div style="text-align:center;color:#666;font-size:0.9em;margin-top:20px">未解锁</div>'}
      `;
      grid.appendChild(el);
    });
  });
  
  document.getElementById('collection-count').textContent = gameState.collectedCards.length;
  document.getElementById('collection-total').textContent = Object.values(CARD_NAMES).reduce((sum, names) => sum + names.length, 0);
}

function filterCollection(filter) {
  currentFilter = filter;
  document.querySelectorAll('.collection-filter .filter-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`.collection-filter .filter-btn[data-filter="${filter}"]`).classList.add('active');
  renderCollection();
}

function closeCardModal() {
  document.getElementById('card-modal').style.display = 'none';
}

function selectForBattle() {
  if (selectedCardIds.length !== 3) {
    showToast('请选择3张卡片进行战斗！');
    return;
  }
  
  gameState.battleCards = selectedCardIds.map(id => gameState.cards.find(c => c.id === id));
  switchTab('battle');
}

window.addEventListener('load', init);