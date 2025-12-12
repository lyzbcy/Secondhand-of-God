/**
 * 神之手 - 卡牌系统 (Roguelike)
 */

class CardSystem {
    constructor(gameWorld) {
        this.game = gameWorld;
        this.activeCards = [];
        this.cardPool = this.initializeCardPool();
    }

    initializeCardPool() {
        return {
            // 暴躁上帝 - 强化手部攻击
            fury: [
                { id: 'iron_palm', name: '铁砂掌', icon: '🖐️', rarity: 'common', desc: '手掌攻击范围+50%', effect: { handRange: 1.5 } },
                { id: 'thunder_fist', name: '雷神之锤', icon: '⚡', rarity: 'rare', desc: '握拳锤击附带闪电伤害', effect: { punchLightning: true } },
                { id: 'gold_touch', name: '点石成金', icon: '💰', rarity: 'epic', desc: '击杀敌人获得双倍金币', effect: { goldMulti: 2 } },
                { id: 'berserker', name: '狂暴之心', icon: '💢', rarity: 'legendary', desc: '攻击速度翻倍，但受伤加倍', effect: { attackSpeedMulti: 2, damageTakenMulti: 2 } },
            ],
            // 塔防统帅 - 强化防御塔
            commander: [
                { id: 'overcharge', name: '手动充能', icon: '🔋', rarity: 'common', desc: '触碰塔时攻速翻倍3秒', effect: { towerBoost: true } },
                { id: 'resonance', name: '共鸣水晶', icon: '💠', rarity: 'rare', desc: '水晶可发射激光协助攻击', effect: { crystalAttack: true } },
                { id: 'thorns', name: '荆棘护盾', icon: '🛡️', rarity: 'epic', desc: '反弹50%伤害给攻击者', effect: { thornsDamage: 0.5 } },
                { id: 'tower_master', name: '塔防大师', icon: '🏰', rarity: 'legendary', desc: '所有塔攻击力+100%', effect: { towerDamageMulti: 2 } },
            ],
            // 资源大亨 - 强化资源采集
            tycoon: [
                { id: 'lumberjack', name: '伐木机', icon: '🪓', rarity: 'common', desc: '砍树效率x3', effect: { chopMulti: 3 } },
                { id: 'miner', name: '矿工精神', icon: '⛏️', rarity: 'common', desc: '挖矿效率x2', effect: { mineMulti: 2 } },
                { id: 'airdrop', name: '空投补给', icon: '📦', rarity: 'rare', desc: '每波开始获得随机资源', effect: { waveBonus: true } },
                { id: 'auto_turret', name: '自动炮台', icon: '🤖', rarity: 'epic', desc: '消耗100木材召唤临时炮台', effect: { autoTurret: true } },
            ]
        };
    }

    // 显示三选一卡牌
    showCardSelection() {
        const cards = this.getRandomCards(3);
        const modal = document.getElementById('card-modal');
        const container = document.getElementById('card-options');

        if (!modal || !container) return;

        container.innerHTML = '';

        cards.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = `upgrade-card rarity-${card.rarity}`;
            cardEl.innerHTML = `
                <div class="card-icon">${card.icon}</div>
                <div class="card-title">${card.name}</div>
                <div class="card-desc">${card.desc}</div>
                <div class="card-rarity">${this.getRarityName(card.rarity)}</div>
            `;
            cardEl.addEventListener('click', () => this.selectCard(card));
            container.appendChild(cardEl);
        });

        modal.classList.remove('hidden');
    }

    getRandomCards(count) {
        const allCards = [
            ...this.cardPool.fury,
            ...this.cardPool.commander,
            ...this.cardPool.tycoon
        ];

        // 过滤已获得的卡
        const available = allCards.filter(c => !this.activeCards.find(ac => ac.id === c.id));

        // 根据稀有度加权随机
        const weighted = [];
        available.forEach(card => {
            const weight = { common: 10, rare: 5, epic: 2, legendary: 1 }[card.rarity] || 1;
            for (let i = 0; i < weight; i++) weighted.push(card);
        });

        const selected = [];
        while (selected.length < count && weighted.length > 0) {
            const idx = Utils.randomInt(0, weighted.length - 1);
            const card = weighted[idx];
            if (!selected.find(c => c.id === card.id)) {
                selected.push(card);
            }
            weighted.splice(idx, 1);
        }

        return selected;
    }

    selectCard(card) {
        this.activeCards.push(card);
        this.applyCardEffect(card);

        document.getElementById('card-modal')?.classList.add('hidden');
        this.game.stats.cardsCollected++;

        // 继续游戏
        this.game.resumeAfterCard();
    }

    applyCardEffect(card) {
        const effect = card.effect;

        // 应用各种效果
        if (effect.handRange) this.game.handRangeMultiplier = (this.game.handRangeMultiplier || 1) * effect.handRange;
        if (effect.goldMulti) this.game.goldMultiplier = (this.game.goldMultiplier || 1) * effect.goldMulti;
        if (effect.chopMulti) this.game.chopMultiplier = (this.game.chopMultiplier || 1) * effect.chopMulti;
        if (effect.mineMulti) this.game.mineMultiplier = (this.game.mineMultiplier || 1) * effect.mineMulti;
        if (effect.towerDamageMulti) {
            this.game.towers.towers.forEach(t => t.damage *= effect.towerDamageMulti);
        }
        if (effect.attackSpeedMulti) this.game.attackSpeedMultiplier = effect.attackSpeedMulti;

        // 存储特殊效果标记
        if (effect.punchLightning) this.game.hasPunchLightning = true;
        if (effect.towerBoost) this.game.hasTowerBoost = true;
        if (effect.crystalAttack) this.game.hasCrystalAttack = true;
        if (effect.thornsDamage) this.game.thornsDamage = effect.thornsDamage;
        if (effect.waveBonus) this.game.hasWaveBonus = true;
    }

    getRarityName(rarity) {
        return { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' }[rarity] || rarity;
    }

    // 获取当前激活的卡牌效果
    hasEffect(effectName) {
        return this.activeCards.some(c => c.effect[effectName]);
    }
}

window.CardSystem = CardSystem;
