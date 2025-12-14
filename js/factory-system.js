/**
 * 神之手 - 自动工厂系统 (辐射避难所风格)
 * 多层工厂，每层产出不同资源
 */

class FactorySystem {
    constructor(gameWorld) {
        this.game = gameWorld;

        // 工厂楼层配置 - 不同层产出不同资源
        this.floors = [
            {
                id: 1, unlocked: true, level: 1, cost: 0,
                name: '采集层', emoji: '⛏️',
                production: { gold: 1 },
                description: '基础金币产出'
            },
            {
                id: 2, unlocked: false, level: 0, cost: 100,
                name: '伐木厂', emoji: '🪓',
                production: { wood: 2 },
                description: '自动产出木材'
            },
            {
                id: 3, unlocked: false, level: 0, cost: 200,
                name: '采石场', emoji: '⛏️',
                production: { stone: 1 },
                description: '自动产出石材'
            },
            {
                id: 4, unlocked: false, level: 0, cost: 400,
                name: '锻造炉', emoji: '🔥',
                production: { gold: 3 },
                description: '高级金币产出'
            },
            {
                id: 5, unlocked: false, level: 0, cost: 800,
                name: '魔导室', emoji: '✨',
                production: { crystal: 1 },
                description: '产出珍贵水晶'
            },
            {
                id: 6, unlocked: false, level: 0, cost: 1500,
                name: '金矿层', emoji: '💰',
                production: { gold: 8 },
                description: '大量金币产出'
            }
        ];

        // 升级成本倍率
        this.upgradeCostMultiplier = 2;
        this.maxLevel = 5;

        this.lastProduction = Date.now();
        this.productionInterval = 5000; // 每5秒产出一次
    }

    init() {
        this.loadState();
        this.startProduction();
    }

    getFloors() {
        return this.floors;
    }

    getFloor(floorId) {
        return this.floors.find(f => f.id === floorId);
    }

    canUnlock(floorId) {
        const floor = this.getFloor(floorId);
        if (!floor || floor.unlocked) return false;

        // 检查前一层是否已解锁
        if (floorId > 1) {
            const prevFloor = this.getFloor(floorId - 1);
            if (!prevFloor?.unlocked) return false;
        }

        return true;
    }

    getUnlockCost(floorId) {
        const floor = this.getFloor(floorId);
        return floor ? floor.cost : 0;
    }

    getUpgradeCost(floorId) {
        const floor = this.getFloor(floorId);
        if (!floor || !floor.unlocked || floor.level >= this.maxLevel) return null;

        // 升级成本 = 基础cost × 等级^2
        return Math.floor(floor.cost * Math.pow(this.upgradeCostMultiplier, floor.level));
    }

    unlockFloor(floorId) {
        const floor = this.getFloor(floorId);
        if (!floor || floor.unlocked) return false;
        if (!this.canUnlock(floorId)) return false;

        const gold = this.game?.resources?.resources?.gold || 0;
        if (gold < floor.cost) return false;

        // 扣除金币
        this.game.resources.spendResource('gold', floor.cost);
        floor.unlocked = true;
        floor.level = 1;

        // 特效
        this.game.effects?.flash('#ffd700');
        this.game.effects?.createExplosion(
            this.game.canvas.width / 2,
            this.game.canvas.height / 2,
            '#ffd700', 30
        );

        this.saveState();
        console.log(`[Factory] Unlocked floor ${floorId}: ${floor.name}`);
        return true;
    }

    upgradeFloor(floorId) {
        const floor = this.getFloor(floorId);
        if (!floor || !floor.unlocked || floor.level >= this.maxLevel) return false;

        const cost = this.getUpgradeCost(floorId);
        const gold = this.game?.resources?.resources?.gold || 0;
        if (gold < cost) return false;

        // 扣除金币
        this.game.resources.spendResource('gold', cost);
        floor.level++;

        // 特效
        this.game.effects?.createExplosion(
            this.game.canvas.width / 2,
            this.game.canvas.height / 2,
            '#00ff88', 20
        );

        this.saveState();
        console.log(`[Factory] Upgraded floor ${floorId} to level ${floor.level}`);
        return true;
    }

    getFloorProduction(floor) {
        if (!floor.unlocked) return {};

        // 产出 = 基础产出 × 等级
        const result = {};
        for (const [resource, amount] of Object.entries(floor.production)) {
            result[resource] = amount * floor.level;
        }
        return result;
    }

    getTotalProduction() {
        const total = { gold: 0, wood: 0, stone: 0, crystal: 0 };

        this.floors.forEach(floor => {
            if (floor.unlocked) {
                const prod = this.getFloorProduction(floor);
                for (const [resource, amount] of Object.entries(prod)) {
                    total[resource] = (total[resource] || 0) + amount;
                }
            }
        });

        return total;
    }

    startProduction() {
        setInterval(() => this.produce(), 1000);
    }

    produce() {
        if (!this.game || this.game.isPaused || this.game.isGameOver) return;

        const now = Date.now();
        const elapsed = now - this.lastProduction;

        if (elapsed >= this.productionInterval) {
            const production = this.getTotalProduction();
            let produced = false;

            for (const [resource, amount] of Object.entries(production)) {
                if (amount > 0) {
                    this.game.resources.addResource(resource, amount);
                    produced = true;
                }
            }

            if (produced) {
                // 产出提示效果
                this.showProductionEffect(production);
            }

            this.lastProduction = now;
        }
    }

    showProductionEffect(production) {
        // 给资源栏添加脉冲效果
        for (const [resource, amount] of Object.entries(production)) {
            if (amount > 0) {
                const el = document.getElementById(`res-${resource}`);
                if (el) {
                    el.classList.add('pulse');
                    setTimeout(() => el.classList.remove('pulse'), 500);
                }
            }
        }
    }

    saveState() {
        const state = {
            floors: this.floors.map(f => ({
                id: f.id,
                unlocked: f.unlocked,
                level: f.level
            })),
            lastProduction: this.lastProduction
        };
        localStorage.setItem('godhand_factory', JSON.stringify(state));
    }

    loadState() {
        try {
            const saved = localStorage.getItem('godhand_factory');
            if (saved) {
                const state = JSON.parse(saved);

                state.floors?.forEach(savedFloor => {
                    const floor = this.floors.find(f => f.id === savedFloor.id);
                    if (floor) {
                        floor.unlocked = savedFloor.unlocked;
                        floor.level = savedFloor.level || 0;
                    }
                });

                this.lastProduction = state.lastProduction || Date.now();
            }
        } catch (e) {
            console.error('[Factory] Failed to load state:', e);
        }
    }

    getUnlockedCount() {
        return this.floors.filter(f => f.unlocked).length;
    }
}

window.FactorySystem = FactorySystem;
