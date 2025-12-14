/**
 * 神之手 - 工匠升级系统
 * 消耗金币和材料升级防御塔
 */

class CraftsmanSystem {
    constructor(gameWorld) {
        this.game = gameWorld;
        this.unlocked = false;
        this.unlockCost = 100; // 100金币解锁

        // 塔升级配方
        this.upgradeRecipes = {
            arrow: {
                name: '箭塔',
                emoji: '🏹',
                upgrades: [
                    { level: 2, cost: { gold: 50, wood: 30 }, effects: { damage: 1.5, range: 1.2 } },
                    { level: 3, cost: { gold: 100, wood: 50, crystal: 10 }, effects: { damage: 2.0, range: 1.4, attackSpeed: 1.3 } }
                ]
            },
            fire: {
                name: '火焰塔',
                emoji: '🔥',
                upgrades: [
                    { level: 2, cost: { gold: 60, stone: 40 }, effects: { damage: 1.5, aoeRadius: 1.3 } },
                    { level: 3, cost: { gold: 120, stone: 60, crystal: 20 }, effects: { damage: 2.0, aoeRadius: 1.5, burnDamage: 5 } }
                ]
            },
            ice: {
                name: '冰霜塔',
                emoji: '❄️',
                upgrades: [
                    { level: 2, cost: { gold: 70, crystal: 25 }, effects: { damage: 1.4, slow: 0.4, slowDuration: 1.5 } },
                    { level: 3, cost: { gold: 150, crystal: 50 }, effects: { damage: 1.8, slow: 0.3, slowDuration: 2.0, freezeChance: 0.1 } }
                ]
            },
            lightning: {
                name: '雷电塔',
                emoji: '⚡',
                upgrades: [
                    { level: 2, cost: { gold: 80, crystal: 40 }, effects: { damage: 1.5, chain: 4 } },
                    { level: 3, cost: { gold: 200, crystal: 80 }, effects: { damage: 2.0, chain: 5, stunChance: 0.15 } }
                ]
            }
        };

        this.selectedTower = null;
    }

    init() {
        this.createUI();
        this.loadState();
    }

    createUI() {
        // 创建工匠界面
        const modal = document.createElement('div');
        modal.id = 'craftsman-modal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content craftsman-content">
                <button class="modal-close" id="btn-close-craftsman">&times;</button>
                <div class="craftsman-header">
                    <div class="craftsman-icon">🛠️</div>
                    <h2>工匠坊</h2>
                    <p class="craftsman-subtitle">升级你的防御设施</p>
                </div>
                
                <div id="craftsman-locked" class="craftsman-locked">
                    <div class="lock-icon">🔒</div>
                    <p>工匠坊尚未解锁</p>
                    <div class="unlock-cost">
                        <span>🪙 ${this.unlockCost}</span>
                    </div>
                    <button class="menu-btn primary" id="btn-unlock-craftsman">解锁工匠坊</button>
                </div>
                
                <div id="craftsman-content" class="craftsman-main hidden">
                    <div class="tower-select-grid" id="tower-select-grid">
                        <!-- 动态生成塔选择 -->
                    </div>
                    
                    <div class="upgrade-panel" id="upgrade-panel">
                        <p class="no-tower-selected">选择一个已建造的塔进行升级</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('btn-close-craftsman')?.addEventListener('click', () => this.close());
        document.getElementById('btn-unlock-craftsman')?.addEventListener('click', () => this.unlock());

        // 点击背景关闭
        document.getElementById('craftsman-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'craftsman-modal') this.close();
        });
    }

    open() {
        document.getElementById('craftsman-modal')?.classList.remove('hidden');
        this.updateUI();

        // 暂停游戏
        if (this.game) this.game.isPaused = true;
    }

    close() {
        document.getElementById('craftsman-modal')?.classList.add('hidden');
        this.selectedTower = null;

        // 恢复游戏
        if (this.game) this.game.isPaused = false;
    }

    unlock() {
        if (!this.game) return;

        const gold = this.game.resources.resources.gold || 0;
        if (gold >= this.unlockCost) {
            this.game.resources.spendResource('gold', this.unlockCost);
            this.unlocked = true;
            this.saveState();
            this.updateUI();

            // 解锁特效
            this.game.effects?.createExplosion(
                this.game.canvas.width / 2,
                this.game.canvas.height / 2,
                '#ffd700', 30
            );
        }
    }

    updateUI() {
        const lockedDiv = document.getElementById('craftsman-locked');
        const contentDiv = document.getElementById('craftsman-content');

        if (this.unlocked) {
            lockedDiv?.classList.add('hidden');
            contentDiv?.classList.remove('hidden');
            this.updateTowerGrid();
        } else {
            lockedDiv?.classList.remove('hidden');
            contentDiv?.classList.add('hidden');

            // 更新解锁按钮状态
            const gold = this.game?.resources?.resources?.gold || 0;
            const unlockBtn = document.getElementById('btn-unlock-craftsman');
            if (unlockBtn) {
                unlockBtn.disabled = gold < this.unlockCost;
            }
        }
    }

    updateTowerGrid() {
        const grid = document.getElementById('tower-select-grid');
        if (!grid || !this.game) return;

        const towers = this.game.towers?.towers || [];

        if (towers.length === 0) {
            grid.innerHTML = '<p class="no-towers">暂无已建造的塔<br/>建造塔后再来升级</p>';
            return;
        }

        grid.innerHTML = towers.map(tower => {
            const recipe = this.upgradeRecipes[tower.type];
            const maxLevel = recipe ? recipe.upgrades.length + 1 : 1;
            const isMaxLevel = tower.level >= maxLevel;

            return `
                <div class="tower-select-card ${this.selectedTower?.id === tower.id ? 'selected' : ''} ${isMaxLevel ? 'max-level' : ''}" 
                     data-tower-id="${tower.id}">
                    <div class="tower-emoji">${recipe?.emoji || '🏰'}</div>
                    <div class="tower-info">
                        <span class="tower-name">${recipe?.name || tower.type}</span>
                        <span class="tower-level">Lv.${tower.level}${isMaxLevel ? ' MAX' : ''}</span>
                    </div>
                </div>
            `;
        }).join('');

        // 添加点击事件
        grid.querySelectorAll('.tower-select-card').forEach(card => {
            card.addEventListener('click', () => {
                const towerId = parseInt(card.dataset.towerId);
                this.selectTower(towerId);
            });
        });
    }

    selectTower(towerId) {
        const tower = this.game?.towers?.towers.find(t => t.id === towerId);
        if (!tower) return;

        this.selectedTower = tower;
        this.updateTowerGrid();
        this.updateUpgradePanel();
    }

    updateUpgradePanel() {
        const panel = document.getElementById('upgrade-panel');
        if (!panel) return;

        if (!this.selectedTower) {
            panel.innerHTML = '<p class="no-tower-selected">选择一个已建造的塔进行升级</p>';
            return;
        }

        const tower = this.selectedTower;
        const recipe = this.upgradeRecipes[tower.type];

        if (!recipe) {
            panel.innerHTML = '<p>该塔类型不支持升级</p>';
            return;
        }

        const nextUpgrade = recipe.upgrades.find(u => u.level === tower.level + 1);

        if (!nextUpgrade) {
            panel.innerHTML = `
                <div class="upgrade-max">
                    <div class="max-icon">⭐</div>
                    <h3>${recipe.name} 已满级！</h3>
                    <p>这座塔已经达到最高等级</p>
                </div>
            `;
            return;
        }

        const canAfford = this.canAffordUpgrade(nextUpgrade.cost);

        panel.innerHTML = `
            <div class="upgrade-details">
                <div class="upgrade-header">
                    <span class="upgrade-emoji">${recipe.emoji}</span>
                    <div>
                        <h3>${recipe.name}</h3>
                        <span class="level-change">Lv.${tower.level} → Lv.${nextUpgrade.level}</span>
                    </div>
                </div>
                
                <div class="upgrade-effects">
                    <h4>升级效果</h4>
                    ${this.formatEffects(nextUpgrade.effects)}
                </div>
                
                <div class="upgrade-cost">
                    <h4>所需材料</h4>
                    ${this.formatCost(nextUpgrade.cost)}
                </div>
                
                <button class="menu-btn primary ${canAfford ? '' : 'disabled'}" 
                        id="btn-upgrade-tower" ${canAfford ? '' : 'disabled'}>
                    ${canAfford ? '🔨 升级' : '材料不足'}
                </button>
            </div>
        `;

        document.getElementById('btn-upgrade-tower')?.addEventListener('click', () => {
            this.upgradeTower(tower, nextUpgrade);
        });
    }

    formatEffects(effects) {
        const effectNames = {
            damage: '伤害',
            range: '射程',
            attackSpeed: '攻速',
            aoeRadius: '范围',
            slow: '减速',
            slowDuration: '减速时长',
            chain: '连锁数',
            burnDamage: '灼烧伤害',
            freezeChance: '冻结几率',
            stunChance: '眩晕几率'
        };

        return Object.entries(effects).map(([key, value]) => {
            const name = effectNames[key] || key;
            let display = '';

            if (typeof value === 'number') {
                if (value > 1 && value < 10) {
                    display = `×${value}`;
                } else if (value < 1) {
                    display = `${Math.round(value * 100)}%`;
                } else {
                    display = `+${value}`;
                }
            }

            return `<div class="effect-item"><span>${name}</span><span class="effect-value">${display}</span></div>`;
        }).join('');
    }

    formatCost(cost) {
        const icons = { gold: '🪙', wood: '🪵', stone: '🪨', crystal: '💎' };
        const resources = this.game?.resources?.resources || {};

        return Object.entries(cost).map(([type, amount]) => {
            const has = resources[type] || 0;
            const enough = has >= amount;
            return `
                <div class="cost-item ${enough ? '' : 'insufficient'}">
                    <span>${icons[type] || type}</span>
                    <span>${has}/${amount}</span>
                </div>
            `;
        }).join('');
    }

    canAffordUpgrade(cost) {
        if (!this.game?.resources) return false;
        return this.game.resources.canAfford(cost);
    }

    upgradeTower(tower, upgrade) {
        if (!this.canAffordUpgrade(upgrade.cost)) return;

        // 扣除材料
        this.game.resources.spend(upgrade.cost);

        // 升级塔
        tower.level = upgrade.level;

        // 应用效果
        if (upgrade.effects.damage) {
            tower.damage = tower.damage * upgrade.effects.damage;
        }
        if (upgrade.effects.range) {
            tower.range = tower.range * upgrade.effects.range;
        }
        if (upgrade.effects.attackSpeed) {
            tower.attackSpeed = tower.attackSpeed * upgrade.effects.attackSpeed;
        }
        if (upgrade.effects.aoeRadius) {
            tower.aoeRadius = (tower.aoeRadius || 50) * upgrade.effects.aoeRadius;
        }
        if (upgrade.effects.slow !== undefined) {
            tower.slow = upgrade.effects.slow;
        }
        if (upgrade.effects.slowDuration !== undefined) {
            tower.slowDuration = upgrade.effects.slowDuration;
        }
        if (upgrade.effects.chain !== undefined) {
            tower.chain = upgrade.effects.chain;
        }
        if (upgrade.effects.burnDamage) {
            tower.burnDamage = upgrade.effects.burnDamage;
        }
        if (upgrade.effects.freezeChance) {
            tower.freezeChance = upgrade.effects.freezeChance;
        }
        if (upgrade.effects.stunChance) {
            tower.stunChance = upgrade.effects.stunChance;
        }

        // 升级特效
        this.game.effects?.createExplosion(tower.x, tower.y, '#ffd700', 20);
        this.game.effects?.createBuildEffect(tower.x, tower.y);

        // 更新界面
        this.updateTowerGrid();
        this.updateUpgradePanel();

        console.log(`[Craftsman] Upgraded ${tower.type} to level ${tower.level}`);
    }

    saveState() {
        localStorage.setItem('godhand_craftsman_unlocked', this.unlocked ? 'true' : 'false');
    }

    loadState() {
        this.unlocked = localStorage.getItem('godhand_craftsman_unlocked') === 'true';
    }
}

window.CraftsmanSystem = CraftsmanSystem;
