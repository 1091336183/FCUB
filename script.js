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
let synthesizeMythLevel = null;
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
    <div class="modal-content confirm-modal-content">
      <h3>${title}</h3>
      <p>${message}</p>
      <div style="display: flex; justify-content: center; gap: 20px; margin-top: 20px;">
        <button class="action-btn secondary modal-cancel-btn">取消</button>
        <button class="action-btn primary modal-ok-btn">确定</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('.modal-cancel-btn').addEventListener('click', () => modal.remove());
  modal.querySelector('.modal-ok-btn').addEventListener('click', () => {
    modal.remove();
    onConfirm();
  });
}

function performGacha(type) {
  const config = GACHA_CONFIG[type];
  if (gameState.gold < config.price) {
    showToast('金币不足！');
    return;
  }
  
  gameState.gold -= config.price;
  
  const results = [];
  const isLargeGacha = config.count >= 50;
  
  if (isLargeGacha) {
    // 大量抽卡：使用统计方式，不逐张保存结果
    const qualityCount = {};
    for (const q of Object.keys(config.probabilities)) {
      qualityCount[q] = 0;
    }
    
    for (let i = 0; i < config.count; i++) {
      const quality = getRandomQuality(config.probabilities);
      const card = createCard(quality);
      gameState.cards.push(card);
      qualityCount[quality] = (qualityCount[quality] || 0) + 1;
      
      if (!gameState.collectedCards.includes(card.name)) {
        gameState.collectedCards.push(card.name);
      }
    }
    
    showGachaResultSummary(type, qualityCount, config.count);
  } else {
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
  }
  
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
  cardGrid.className = 'gacha-result-grid';
  
  cards.forEach((card, index) => {
    const cardEl = createCardElement(card);
    cardEl.style.animationDelay = `${index * 0.1}s`;
    cardGrid.appendChild(cardEl);
  });
  
  resultDiv.appendChild(cardGrid);
}

function showGachaResultSummary(type, qualityCount, totalCount) {
  const resultDiv = document.getElementById('gacha-result');
  const typeName = type === 'myth100' ? '神话100连抽' : '神话1000连抽';
  
  let html = `<h3>${typeName}结果 (共${totalCount}张)</h3>`;
  html += '<div class="gacha-summary">';
  html += '<div class="gacha-summary-grid">';
  
  const qualities = [7, 6, 5, 4, 3];
  qualities.forEach(q => {
    const count = qualityCount[q] || 0;
    if (count > 0) {
      const config = QUALITY_CONFIG[q];
      const pct = ((count / totalCount) * 100).toFixed(1);
      html += `<div class="gacha-summary-item" style="border-left: 4px solid ${config.color};">
        <span class="quality-badge" style="background:${config.color}; font-size:0.9em;">${config.name}</span>
        <span style="font-size:1.2em;font-weight:bold;color:#fff;">${count}张</span>
        <span style="color:#aaa;font-size:0.8em;">(${pct}%)</span>
      </div>`;
    }
  });
  
  html += '</div></div>';
  resultDiv.innerHTML = html;
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
    const item = btn.closest('.synthesize-item');
    if (!item) return;
    const quality = parseInt(item.dataset.quality);
    btn.disabled = !canSynthesize(quality);
  });
}

function canSynthesize(quality) {
  const rule = SYNTHESIZE_RULES[quality];
  if (!rule) return false;
  
  if (quality === 7) {
    for (let level = 0; level < MYTH_MAX_LEVEL; level++) {
      const count = gameState.cards.filter(c => c.quality === 7 && (c.mythLevel || 0) === level).length;
      if (count >= 2) return true;
    }
    return false;
  }
  
  const count = gameState.cards.filter(c => c.quality === quality && (c.mythLevel || 0) === 0).length;
  return count >= rule.count;
}

function openSynthesizeModal(quality) {
  if (!canSynthesize(quality)) {
    showToast('卡片数量不足！');
    return;
  }
  
  synthesizeQuality = quality;
  synthesizeSelectedIds = [];
  synthesizeMythLevel = null;
  
  const rule = SYNTHESIZE_RULES[quality];
  const config = QUALITY_CONFIG[quality];
  
  if (quality === 7) {
    document.getElementById('synthesize-modal-title').textContent = '选择神话卡片进行合成';
    document.getElementById('synthesize-modal-desc').textContent = '请先选择等级，再选择2张同级卡片（同名→同名升级，异名→随机升级）';
    renderSynthesizeMythLevelSelect();
    document.getElementById('synthesize-myth-level-select').style.display = 'block';
  } else {
    document.getElementById('synthesize-modal-title').textContent = `选择${config.name}卡片进行合成`;
    document.getElementById('synthesize-modal-desc').textContent = `请选择 ${rule.count} 张${config.name}卡片进行合成`;
    document.getElementById('synthesize-myth-level-select').style.display = 'none';
    renderSynthesizeSelectGrid();
  }
  
  document.getElementById('synthesize-modal').style.display = 'flex';
}

function closeSynthesizeModal() {
  document.getElementById('synthesize-modal').style.display = 'none';
  synthesizeQuality = null;
  synthesizeSelectedIds = [];
  synthesizeMythLevel = null;
}

function renderSynthesizeMythLevelSelect() {
  const container = document.getElementById('synthesize-myth-level-select');
  container.innerHTML = '';
  
  const levelBtns = [];
  for (let level = 0; level < MYTH_MAX_LEVEL; level++) {
    const count = gameState.cards.filter(c => c.quality === 7 && (c.mythLevel || 0) === level).length;
    if (count >= 2) {
      const btn = document.createElement('button');
      btn.className = 'filter-btn' + (synthesizeMythLevel === level ? ' active' : '');
      btn.textContent = `神话${level > 0 ? '+' + level : ''} (${count}张)`;
      btn.onclick = () => selectSynthesizeMythLevel(level);
      levelBtns.push(btn);
    }
  }
  
  if (levelBtns.length === 0) {
    container.innerHTML = '<p style="color:#aaa;text-align:center;">没有可合成的等级</p>';
    return;
  }
  
  levelBtns.forEach(btn => container.appendChild(btn));
  
  if (synthesizeMythLevel === null && levelBtns.length > 0) {
    // Auto-select first available level
    for (let lv = 0; lv < MYTH_MAX_LEVEL; lv++) {
      const cnt = gameState.cards.filter(c => c.quality === 7 && (c.mythLevel || 0) === lv).length;
      if (cnt >= 2) {
        selectSynthesizeMythLevel(lv);
        break;
      }
    }
  }
}

function selectSynthesizeMythLevel(level) {
  synthesizeMythLevel = level;
  synthesizeSelectedIds = [];
  renderSynthesizeMythLevelSelect();
  renderSynthesizeSelectGrid();
}

function renderSynthesizeSelectGrid() {
  const grid = document.getElementById('synthesize-select-grid');
  grid.innerHTML = '';
  
  const rule = SYNTHESIZE_RULES[synthesizeQuality];
  
  let filteredCards;
  if (synthesizeQuality === 7) {
    if (synthesizeMythLevel === null) {
      grid.innerHTML = '<div style="text-align:center;color:#aaa;padding:50px">请先选择合成等级</div>';
      return;
    }
    filteredCards = gameState.cards.filter(c => c.quality === 7 && (c.mythLevel || 0) === synthesizeMythLevel);
  } else {
    filteredCards = gameState.cards.filter(c => c.quality === synthesizeQuality && (c.mythLevel || 0) === 0);
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
    
    const mythSuffix = card.quality === 7 && (card.mythLevel || 0) > 0 ? '+' + card.mythLevel : '';
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
  if (synthesizeQuality === 7) {
    btn.disabled = synthesizeSelectedIds.length !== 2 || synthesizeMythLevel === null;
  } else {
    btn.disabled = synthesizeSelectedIds.length !== rule.count;
  }
}

function confirmSynthesize() {
  const rule = SYNTHESIZE_RULES[synthesizeQuality];
  
  if (synthesizeQuality === 7) {
    if (synthesizeSelectedIds.length !== 2 || synthesizeMythLevel === null) {
      showToast('请选择2张同级神话卡片！');
      return;
    }
    
    const card1 = gameState.cards.find(c => c.id === synthesizeSelectedIds[0]);
    const card2 = gameState.cards.find(c => c.id === synthesizeSelectedIds[1]);
    
    if (!card1 || !card2) {
      showToast('卡片已不存在！');
      return;
    }
    
    // Remove the 2 selected cards
    gameState.cards = gameState.cards.filter(c => !synthesizeSelectedIds.includes(c.id));
    
    // Synthesize: same name → same name next level; different name → random name next level
    const targetLevel = (synthesizeMythLevel || 0) + 1;
    let resultCard;
    if (card1.name === card2.name) {
      resultCard = createCard(7, targetLevel, card1.name);
    } else {
      resultCard = createCard(7, targetLevel);
    }
    
    gameState.cards.splice(0, 0, resultCard);
    const levelText = targetLevel > 0 ? '+' + targetLevel : '';
    showToast(`神话合成成功！获得神话${levelText} ${resultCard.name}`);
    
    closeSynthesizeModal();
    saveGame();
    updateUI();
    return;
  }
  
  if (synthesizeSelectedIds.length !== rule.count) {
    showToast(`请选择 ${rule.count} 张卡片！`);
    return;
  }
  
  gameState.cards = gameState.cards.filter(c => !synthesizeSelectedIds.includes(c.id));
  
  gameState.cards.splice(0, 0, createCard(rule.targetQuality));
  showToast(`合成成功！获得 ${QUALITY_CONFIG[rule.targetQuality].name}`);
  
  closeSynthesizeModal();
  saveGame();
  updateUI();
}

function oneClickSynthesize(quality) {
  if (!canSynthesize(quality)) {
    showToast('卡片数量不足！');
    return;
  }
  
  if (quality === 7) {
    oneClickMythSynthesize();
    return;
  }
  
  const rule = SYNTHESIZE_RULES[quality];
  const eligibleCards = gameState.cards.filter(c => c.quality === quality && (c.mythLevel || 0) === 0);
  const totalCount = eligibleCards.length;
  const batchCount = Math.floor(totalCount / rule.count);
  
  if (batchCount === 0) {
    showToast('卡片数量不足！');
    return;
  }
  
  // Remove cards used for synthesis (take first batchCount * rule.count cards)
  const usedIds = eligibleCards.slice(0, batchCount * rule.count).map(c => c.id);
  gameState.cards = gameState.cards.filter(c => !usedIds.includes(c.id));
  
  // Create synthesized cards
  for (let i = 0; i < batchCount; i++) {
    gameState.cards.splice(0, 0, createCard(rule.targetQuality));
  }
  
  showToast(`一键合成完成！消耗${batchCount * rule.count}张，获得${batchCount}张 ${QUALITY_CONFIG[rule.targetQuality].name}`);
  
  saveGame();
  updateUI();
}

function oneClickMythSynthesize() {
  let totalConsumed = 0;
  let totalCreated = 0;
  
  // Process bottom-up: level 0 to MYTH_MAX_LEVEL - 1
  for (let level = 0; level < MYTH_MAX_LEVEL; level++) {
    let hasMore = true;
    while (hasMore) {
      // Get all cards of this mythLevel
      const levelCards = gameState.cards.filter(c => c.quality === 7 && (c.mythLevel || 0) === level);
      
      // Group by name
      const nameGroups = {};
      levelCards.forEach(card => {
        if (!nameGroups[card.name]) nameGroups[card.name] = [];
        nameGroups[card.name].push(card);
      });
      
      let pairFound = false;
      
      // First: process same-name pairs
      for (const [name, cards] of Object.entries(nameGroups)) {
        if (cards.length >= 2) {
          const usedIds = cards.slice(0, 2).map(c => c.id);
          gameState.cards = gameState.cards.filter(c => !usedIds.includes(c.id));
          gameState.cards.splice(0, 0, createCard(7, level + 1, name));
          totalConsumed += 2;
          totalCreated++;
          pairFound = true;
          break; // Process one pair at a time, recheck groups
        }
      }
      
      if (pairFound) {
        hasMore = true;
        continue;
      }
      
      // Second: process different-name pairs
      const remainingCards = gameState.cards.filter(c => c.quality === 7 && (c.mythLevel || 0) === level);
      if (remainingCards.length >= 2) {
        const usedIds = remainingCards.slice(0, 2).map(c => c.id);
        gameState.cards = gameState.cards.filter(c => !usedIds.includes(c.id));
        gameState.cards.splice(0, 0, createCard(7, level + 1));
        totalConsumed += 2;
        totalCreated++;
        pairFound = true;
      }
      
      hasMore = pairFound;
    }
  }
  
  if (totalCreated > 0) {
    showToast(`神话一键合成完成！消耗${totalConsumed}张，获得${totalCreated}张`);
  } else {
    showToast('没有可合成的神话卡片！');
  }
  
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

function isQualitySetComplete(quality) {
  const names = CARD_NAMES[quality];
  if (!names) return false;
  return names.every(name => gameState.collectedCards.includes(name));
}

function getCollectionCountForQuality(quality) {
  const names = CARD_NAMES[quality];
  if (!names) return 0;
  return names.filter(name => gameState.collectedCards.includes(name)).length;
}

function getGlobalBonus() {
  let total = 0;
  for (let q = 1; q <= 6; q++) {
    if (isQualitySetComplete(q)) {
      total += COLLECTION_BONUS[q];
    }
  }
  return total;
}

function getCollectionBonus(quality, mythLevel = 0) {
  if (!isQualitySetComplete(quality)) return 0;

  const bonusConfig = COLLECTION_BONUS[quality];
  if (quality === 7) {
    return bonusConfig.base + mythLevel * bonusConfig.perLevel;
  }
  return bonusConfig;
}

function getCollectionBonusPercent(quality, mythLevel = 0) {
  return Math.round(getCollectionBonus(quality, mythLevel) * 100);
}

function abbreviateNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 10000) return (num / 1000).toFixed(1) + 'K';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function startBattle(level) {
  if (!gameState.battleCards || gameState.battleCards.length !== 3) {
    showToast('请先在背包中选择3张卡片！');
    switchTab('inventory');
    return;
  }
  
  const isBoss = level % LEVEL_CONFIG.bossInterval === 0;
  
  const globalBonus = getGlobalBonus();

  const playerCards = gameState.battleCards.map(card => {
    let bonus = globalBonus;
    // 神话卡片额外叠加神话等级加成
    if (card.quality === 7) {
      bonus += getCollectionBonus(7, card.mythLevel || 0);
    }
    if (bonus > 0) {
      return {
        ...card,
        attack: Math.floor(card.attack * (1 + bonus)),
        hp: Math.floor(card.hp * (1 + bonus)),
        defense: Math.floor(card.defense * (1 + bonus))
      };
    }
    return { ...card };
  });
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
  el.className = `card card-${card.quality} battle-card ${isDead ? 'dead' : ''} ${hpPercent <= 20 ? 'hp-critical' : ''}`;
  el.dataset.side = side;
  el.dataset.index = index;
  
  if (side === 'enemy' && !isDead) {
    el.onclick = () => selectEnemyTarget(index);
  }
  
  const icon = getCardIcon(card);
  const abbr = abbreviateNumber;
  
  el.innerHTML = `
    <div class="card-header">
      <div class="card-icon">${icon}</div>
      <div class="card-name">${card.name}</div>
      <div class="quality-badge">${config.name}</div>
    </div>
    <div class="card-stats">
      <div class="stat-row"><span>攻击</span><span>${abbr(card.attack)}</span></div>
      <div class="stat-row"><span>生命</span><span>${abbr(card.currentHp)}/${abbr(card.hp)}</span></div>
      <div class="stat-row"><span>防御</span><span>${abbr(card.defense)}</span></div>
      <div class="stat-row"><span>暴击</span><span>${(card.critRate * 100).toFixed(0)}%</span></div>
    </div>
    <div class="card-hp-bar" style="margin-top:3px">
      <div class="card-hp-fill ${hpClass}" style="width:${hpPercent}%"></div>
    </div>
    ${card.hasUltimate ? '<div class="battle-ultimate">必杀技</div>' : ''}
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

function quickBattle() {
  if (!gameState.battleState) return;
  
  stopAutoBattle();
  
  const playerCards = gameState.battleState.playerCards.filter(c => c.currentHp > 0);
  const enemyCards = gameState.battleState.enemyCards.filter(c => c.currentHp > 0);
  
  if (playerCards.length === 0 || enemyCards.length === 0) {
    checkBattleResult();
    return;
  }
  
  // Calculate total power for both sides
  function calcPower(cards) {
    return cards.reduce((sum, c) => {
      const effectiveAtk = c.attack * (1 + c.critRate * (c.critDamage - 1));
      const power = effectiveAtk + c.hp * 0.3 + c.defense * 0.5 + (c.hasUltimate ? c.ultimateDamage * 0.3 : 0);
      return sum + power;
    }, 0);
  }
  
  const playerPower = calcPower(playerCards);
  const enemyPower = calcPower(enemyCards);
  const ratio = playerPower / (enemyPower || 1);
  
  let isVictory;
  if (ratio >= 1.2) {
    isVictory = true;
  } else if (ratio < 0.8) {
    isVictory = false;
  } else {
    isVictory = Math.random() < 0.5 + (ratio - 0.8) * 1.25;
  }
  
  gameState.battleState.log.push(`[快速战斗] 评估结果: ${isVictory ? '胜利' : '失败'} (战力比: ${ratio.toFixed(2)})`);
  
  // Apply result immediately
  if (isVictory) {
    enemyCards.forEach(c => c.currentHp = 0);
  } else {
    playerCards.forEach(c => c.currentHp = 0);
  }
  
  checkBattleResult();
}

// ---- 扫荡功能 ----
let sweepInterval = null;
let sweepStartTime = 0;
let sweepTotalCount = 0;
let sweepCompleted = 0;
let sweepWins = 0;
let sweepLosses = 0;
let sweepTotalGold = 0;
let sweepDroppedCards = [];

function openSweepModal() {
  if (!gameState.battleCards || gameState.battleCards.length !== 3) {
    showToast('请先在背包中选择3张卡片！');
    switchTab('inventory');
    return;
  }
  
  document.getElementById('sweep-modal').style.display = 'flex';
  document.getElementById('sweep-progress').style.display = 'none';
  document.getElementById('sweep-result').style.display = 'none';
  document.querySelector('.sweep-count-options').style.display = 'flex';
}

function closeSweepModal() {
  if (sweepInterval) {
    clearInterval(sweepInterval);
    sweepInterval = null;
  }
  document.getElementById('sweep-modal').style.display = 'none';
}

function startSweep(count) {
  sweepTotalCount = count;
  sweepCompleted = 0;
  sweepWins = 0;
  sweepLosses = 0;
  sweepTotalGold = 0;
  sweepDroppedCards = [];
  
  document.querySelector('.sweep-count-options').style.display = 'none';
  document.getElementById('sweep-progress').style.display = 'block';
  document.getElementById('sweep-result').style.display = 'none';
  document.getElementById('sweep-progress-text').textContent = '扫荡中... 0/' + count;
  document.getElementById('sweep-progress-fill').style.width = '0%';
  
  sweepStartTime = Date.now();
  const totalDuration = 10000; // 10 seconds
  const intervalMs = Math.min(200, Math.floor(totalDuration / count));
  
  sweepInterval = setInterval(() => {
    const elapsed = Date.now() - sweepStartTime;
    const shouldComplete = Math.min(Math.floor((elapsed / totalDuration) * count), count);
    
    while (sweepCompleted < shouldComplete) {
      const level = gameState.maxLevel;
      const result = simulateBattle(level);
      sweepCompleted++;
      
      if (result.isVictory) {
        sweepWins++;
        sweepTotalGold += result.gold;
        result.droppedCards.forEach(c => {
          sweepDroppedCards.push(c);
          gameState.cards.push(c);
          if (!gameState.collectedCards.includes(c.name)) {
            gameState.collectedCards.push(c.name);
          }
        });
      } else {
        sweepLosses++;
        sweepTotalGold += result.gold;
      }
    }
    
    const progress = Math.min(100, (sweepCompleted / sweepTotalCount) * 100);
    document.getElementById('sweep-progress-fill').style.width = progress + '%';
    document.getElementById('sweep-progress-text').textContent = `扫荡中... ${sweepCompleted}/${sweepTotalCount}`;
    
    if (sweepCompleted >= sweepTotalCount) {
      finishSweep();
    }
  }, intervalMs);
}

function finishSweep() {
  if (sweepInterval) {
    clearInterval(sweepInterval);
    sweepInterval = null;
  }
  
  document.getElementById('sweep-progress').style.display = 'none';
  document.getElementById('sweep-result').style.display = 'block';
  
  gameState.gold += sweepTotalGold;
  
  let resultHTML = `<h3 style="color:#ffd700;">扫荡完成！(${sweepTotalCount}次)</h3>`;
  resultHTML += `<p>胜利: <span style="color:#44aa44;">${sweepWins}</span> | 失败: <span style="color:#ff4444;">${sweepLosses}</span></p>`;
  resultHTML += `<p>获得金币: <span style="color:#ffd700;">${Math.floor(sweepTotalGold)}</span></p>`;
  
  if (sweepDroppedCards.length > 0) {
    resultHTML += `<p>掉落卡片: ${sweepDroppedCards.length}张</p>`;
  }
  
  resultHTML += `<div style="margin-top:20px;">
    <button class="action-btn primary" onclick="closeSweepModal()">确定</button>
  </div>`;
  
  document.getElementById('sweep-result').innerHTML = resultHTML;
  
  saveGame();
  updateUI();
  renderLevelGrid();
}

function simulateBattle(level) {
  const globalBonus = getGlobalBonus();
  
  const playerCards = gameState.battleCards.map(card => {
    let bonus = globalBonus;
    if (card.quality === 7) {
      bonus += getCollectionBonus(7, card.mythLevel || 0);
    }
    if (bonus > 0) {
      return {
        ...card,
        attack: Math.floor(card.attack * (1 + bonus)),
        hp: Math.floor(card.hp * (1 + bonus)),
        defense: Math.floor(card.defense * (1 + bonus))
      };
    }
    return { ...card };
  });
  
  const enemyCards = generateEnemyCards(level);
  
  function calcPower(cards) {
    return cards.reduce((sum, c) => {
      const effectiveAtk = c.attack * (1 + c.critRate * (c.critDamage - 1));
      return sum + effectiveAtk + c.hp * 0.3 + c.defense * 0.5 + (c.hasUltimate ? c.ultimateDamage * 0.3 : 0);
    }, 0);
  }
  
  const playerPower = calcPower(playerCards);
  const enemyPower = calcPower(enemyCards);
  const ratio = playerPower / (enemyPower || 1);
  
  let isVictory;
  if (ratio >= 1.2) {
    isVictory = true;
  } else if (ratio < 0.8) {
    isVictory = false;
  } else {
    isVictory = Math.random() < 0.5 + (ratio - 0.8) * 1.25;
  }
  
  // Calculate reward
  let gold = 0;
  enemyCards.forEach(card => {
    const config = QUALITY_CONFIG[card.quality];
    gold += card.attack * 0.5 * config.rewardMultiplier;
  });
  
  const isBoss = level % LEVEL_CONFIG.bossInterval === 0;
  if (isBoss) gold *= 1.5;
  
  const finalGold = isVictory ? Math.floor(gold) : Math.floor(gold * 0.2);
  
  // Drop cards
  const droppedCards = isVictory ? dropCards(level) : [];
  
  return { isVictory, gold: finalGold, droppedCards };
}

function renderCollection() {
  const grid = document.getElementById('collection-grid');
  grid.innerHTML = '';
  
  let filteredQualities = [1, 2, 3, 4, 5, 6, 7];
  if (currentFilter !== 'all') {
    filteredQualities = [parseInt(currentFilter)];
  }
  
  filteredQualities.forEach(quality => {
    const config = QUALITY_CONFIG[quality];
    const collectedCount = getCollectionCountForQuality(quality);
    const totalCount = CARD_NAMES[quality].length;
    const isComplete = isQualitySetComplete(quality);

    // 添加品质分组标题
    const header = document.createElement('div');
    header.className = 'collection-quality-header';
    header.style.cssText = `grid-column: 1 / -1; display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-top: 8px;`;
    header.innerHTML = `
      <span class="quality-badge" style="background:${config.color}; font-size:0.8em;">${config.name}</span>
      <span style="color:#aaa; font-size:0.8em;">${collectedCount}/${totalCount}</span>
    `;
    grid.appendChild(header);
    
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
          <div class="quality-badge">${config.name}</div>
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

  // 渲染套装加成汇总
  renderCollectionBonusSummary();
}

function renderCollectionBonusSummary() {
  let summary = document.getElementById('collection-bonus-summary');
  if (!summary) {
    summary = document.createElement('div');
    summary.id = 'collection-bonus-summary';
    summary.className = 'collection-bonus-summary';
    const progress = document.querySelector('.collection-progress');
    progress.parentNode.insertBefore(summary, progress.nextSibling);
  }

  let html = '<h4>套装收集加成（集齐全部8张后生效）</h4>';
  html += '<p style="text-align:center;color:#ffd700;font-size:0.8em;margin-bottom:10px;">品质1-6：全部上阵卡牌获得全局增益 | 品质7：神话卡牌额外叠加等级加成</p>';
  html += '<div class="bonus-list">';
  let hasBonus = false;

  for (let q = 1; q <= 7; q++) {
    const collected = getCollectionCountForQuality(q);
    const total = CARD_NAMES[q] ? CARD_NAMES[q].length : 8;
    const isComplete = isQualitySetComplete(q);
    const config = QUALITY_CONFIG[q];

    if (q < 7) {
      const bonus = Math.round(COLLECTION_BONUS[q] * 100);
      html += `<div class="bonus-item ${isComplete ? 'complete' : ''}">
        <span class="bonus-quality" style="color:${config.color}">${config.name}</span>
        <span class="bonus-progress">${collected}/${total}</span>
        <span class="bonus-value">${isComplete ? '全局 +' + bonus + '%' : '未集齐'}</span>
      </div>`;
      if (isComplete) hasBonus = true;
    } else {
      // 神话基础行
      const base = Math.round(COLLECTION_BONUS[7].base * 100);
      html += `<div class="bonus-item ${isComplete ? 'complete' : ''}">
        <span class="bonus-quality" style="color:${config.color}">神话</span>
        <span class="bonus-progress">${collected}/${total}</span>
        <span class="bonus-value">${isComplete ? '神话 +' + base + '%' : '未集齐'}</span>
      </div>`;
      if (isComplete) hasBonus = true;

      // 神话+1 ~ 神话+10 收集任务
      html += '<div class="bonus-divider">── 神话等级加成任务 ──</div>';
      for (let lvl = 1; lvl <= 10; lvl++) {
        const lvlBonus = Math.round((COLLECTION_BONUS[7].base + lvl * COLLECTION_BONUS[7].perLevel) * 100);
        const mythLvlItem = isComplete ? 'complete' : '';
        html += `<div class="bonus-item ${mythLvlItem}">
          <span class="bonus-quality" style="color:${config.color}">神话+${lvl}</span>
          <span class="bonus-progress">${isComplete ? '8/8' : collected + '/' + total}</span>
          <span class="bonus-value">${isComplete ? '+' + lvlBonus + '%' : '需集齐神话8张'}</span>
        </div>`;
      }
    }
  }

  html += '</div>';

  if (!hasBonus) {
    html += '<p class="no-bonus">收集齐任一品质的全部8张卡片后解锁全局属性增益</p>';
  } else {
    const globalTotal = Math.round(getGlobalBonus() * 100);
    if (globalTotal > 0) {
      html += `<p class="set-complete-banner" style="margin-top:12px;">当前全局增益累计：全部上阵卡牌攻击/生命/防御 <strong>+${globalTotal}%</strong></p>`;
    }
  }

  summary.innerHTML = html;
}

function showCollectionTab(tab) {
  document.querySelectorAll('.collection-tab-btn').forEach(btn => btn.classList.remove('active'));
  if (tab === 'cards') {
    document.querySelectorAll('.collection-tab-btn')[0].classList.add('active');
    document.getElementById('collection-cards-tab').style.display = 'block';
    document.getElementById('collection-bonuses-tab').style.display = 'none';
    renderCollection();
  } else {
    document.querySelectorAll('.collection-tab-btn')[1].classList.add('active');
    document.getElementById('collection-cards-tab').style.display = 'none';
    document.getElementById('collection-bonuses-tab').style.display = 'block';
    renderCollectionBonusSummary();
  }
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