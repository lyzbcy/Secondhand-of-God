/**
 * 神之手 - 技能树系统
 * 三个技能方向 + 终极技能
 * 重构自卡牌系统
 */

class SkillTreeSystem {
    constructor(gameWorld) {
        this.game = gameWorld;
        this.unlockedSkills = new Set();
        this.skillPoints = 0;

        // 三个技能树
        this.skillTrees = {
            fury: {
                name: '狂暴之路',
                icon: '💢',
                color: '#ff4757',
                description: '强化手部攻击力',
                tiers: [
                    // Tier 1 - 基础技能
                    [
                        { id: 'iron_palm', name: '铁砂掌', icon: '🖐️', desc: '手掌攻击范围+30%', effect: { handRange: 1.3 } },
                        { id: 'power_punch', name: '力量拳', icon: '👊', desc: '握拳伤害+50%', effect: { punchDamage: 1.5 } }
                    ],
                    // Tier 2 - 进阶技能（需要Tier1中的1个）
                    [
                        { id: 'thunder_fist', name: '雷神之锤', icon: '⚡', desc: '握拳附带闪电伤害', effect: { punchLightning: true } },
                        { id: 'combo_master', name: '连击大师', icon: '💫', desc: '连续攻击伤害递增', effect: { comboDamage: true } }
                    ],
                    // Tier 3 - 高级技能（需要Tier2中的1个）
                    [
                        { id: 'gold_touch', name: '点石成金', icon: '💰', desc: '击杀获得双倍金币', effect: { goldMulti: 2 } },
                        { id: 'berserker', name: '狂暴之心', icon: '🔥', desc: '攻速x2，但受伤x1.5', effect: { attackSpeedMulti: 2, damageTakenMulti: 1.5 } }
                    ]
                ],
                ultimate: {
                    id: 'rage_mode',
                    name: '狂暴化身',
                    icon: '👹',
                    desc: '变身巨大化，攻击全屏敌人10秒',
                    effect: { rageMode: true, duration: 10 }
                }
            },
            commander: {
                name: '指挥之路',
                icon: '🏰',
                color: '#3498db',
                description: '强化防御塔',
                tiers: [
                    [
                        { id: 'overcharge', name: '超频充能', icon: '🔋', desc: '触碰塔时攻速x2持续3秒', effect: { towerBoost: true } },
                        { id: 'range_up', name: '远程瞄准', icon: '🎯', desc: '所有塔射程+25%', effect: { towerRange: 1.25 } }
                    ],
                    [
                        { id: 'resonance', name: '共鸣水晶', icon: '💠', desc: '水晶可发射激光协助攻击', effect: { crystalAttack: true } },
                        { id: 'repair_aura', name: '修复光环', icon: '💚', desc: '塔自动缓慢回血', effect: { towerRegen: true } }
                    ],
                    [
                        { id: 'thorns', name: '荆棘护盾', icon: '🛡️', desc: '反弹50%伤害给攻击者', effect: { thornsDamage: 0.5 } },
                        { id: 'tower_master', name: '塔防大师', icon: '👑', desc: '所有塔攻击力+50%', effect: { towerDamageMulti: 1.5 } }
                    ]
                ],
                ultimate: {
                    id: 'fortress',
                    name: '永恒堡垒',
                    icon: '🏛️',
                    desc: '所有塔无敌+攻速x3持续10秒',
                    effect: { fortressMode: true, duration: 10 }
                }
            },
            tycoon: {
                name: '富豪之路',
                icon: '💎',
                color: '#f1c40f',
                description: '强化资源获取',
                tiers: [
                    [
                        { id: 'lumberjack', name: '伐木机', icon: '🪓', desc: '砍树效率x2', effect: { chopMulti: 2 } },
                        { id: 'miner', name: '矿工精神', icon: '⛏️', desc: '挖矿效率x2', effect: { mineMulti: 2 } }
                    ],
                    [
                        { id: 'airdrop', name: '空投补给', icon: '📦', desc: '每波开始获得随机资源', effect: { waveBonus: true } },
                        { id: 'lucky_drop', name: '幸运掉落', icon: '🍀', desc: '敌人有几率掉落水晶', effect: { crystalDrop: 0.1 } }
                    ],
                    [
                        { id: 'auto_turret', name: '临时炮台', icon: '🤖', desc: '消耗100木材召唤炮台', effect: { autoTurret: true } },
                        { id: 'treasure_sense', name: '财富感知', icon: '✨', desc: '金币获取+100%', effect: { goldMulti: 2 } }
                    ]
                ],
                ultimate: {
                    id: 'gold_rain',
                    name: '黄金雨',
                    icon: '🌧️',
                    desc: '天降500金币，同时短暂眩晕所有敌人',
                    effect: { goldRain: 500, stunAll: 2 }
                }
            }
        };

        // 特殊视觉效果技能（帽子/美颜）
        this.cosmeticSkills = {
            crown: { id: 'divine_crown', name: '神圣之冠', icon: '👑', desc: '获得神圣皇冠头饰', effect: { hatType: 'crown' } },
            halo: { id: 'angel_halo', name: '天使光环', icon: '😇', desc: '头顶出现光环', effect: { hatType: 'halo' } },
            beauty: { id: 'divine_beauty', name: '神之光辉', icon: '✨', desc: '开启美颜滤镜', effect: { beautyFilter: true } }
        };
    }

    init() {
        this.createUI();
        this.loadState();
    }

    createUI() {
        // 覆盖原有卡牌选择模态框
        const modal = document.createElement('div');
        modal.id = 'skill-tree-modal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content skill-tree-content">
                <div class="skill-tree-header">
                    <h2>🌟 选择技能强化</h2>
                    <p class="skill-points">可用技能点: <span id="skill-points-count">1</span></p>
                </div>
                
                <div class="skill-trees-container" id="skill-trees-container">
                    <!-- 动态生成三棵技能树 -->
                </div>
                
                <div class="skill-tree-footer">
                    <button class="menu-btn" id="btn-skip-skill">跳过</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('btn-skip-skill')?.addEventListener('click', () => {
            this.closeSelection();
        });
    }

    showSelection(points = 1) {
        this.skillPoints = points;
        document.getElementById('skill-points-count').textContent = points;

        this.renderSkillTrees();
        document.getElementById('skill-tree-modal')?.classList.remove('hidden');

        // 隐藏旧的卡牌选择界面
        document.getElementById('card-modal')?.classList.add('hidden');
    }

    renderSkillTrees() {
        const container = document.getElementById('skill-trees-container');
        if (!container) return;

        container.innerHTML = Object.entries(this.skillTrees).map(([treeId, tree]) => {
            const unlockedCount = this.getTreeUnlockedCount(treeId);
            const ultimateUnlocked = unlockedCount >= 6;

            return `
                <div class="skill-tree" style="--tree-color: ${tree.color}">
                    <div class="tree-header">
                        <span class="tree-icon">${tree.icon}</span>
                        <div>
                            <h3>${tree.name}</h3>
                            <p>${tree.description}</p>
                        </div>
                        <span class="tree-progress">${unlockedCount}/6</span>
                    </div>
                    
                    <div class="tree-tiers">
                        ${tree.tiers.map((tier, tierIndex) => `
                            <div class="skill-tier" data-tier="${tierIndex}">
                                ${tier.map(skill => {
                const unlocked = this.unlockedSkills.has(skill.id);
                const canUnlock = this.canUnlockSkill(treeId, skill.id, tierIndex);
                return `
                                        <div class="skill-node ${unlocked ? 'unlocked' : ''} ${canUnlock ? 'available' : 'locked'}"
                                             data-skill-id="${skill.id}" data-tree="${treeId}">
                                            <span class="skill-icon">${skill.icon}</span>
                                            <span class="skill-name">${skill.name}</span>
                                            <div class="skill-tooltip">
                                                <strong>${skill.name}</strong>
                                                <p>${skill.desc}</p>
                                            </div>
                                        </div>
                                    `;
            }).join('')}
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="ultimate-skill ${ultimateUnlocked ? 'available' : 'locked'}"
                         data-skill-id="${tree.ultimate.id}" data-tree="${treeId}">
                        <div class="ultimate-icon">${tree.ultimate.icon}</div>
                        <div class="ultimate-info">
                            <span class="ultimate-name">${tree.ultimate.name}</span>
                            <span class="ultimate-desc">${tree.ultimate.desc}</span>
                        </div>
                        ${!ultimateUnlocked ? '<span class="ultimate-lock">🔒 解锁全部6个技能</span>' : ''}
                    </div>
                </div>
            `;
        }).join('');

        // 添加点击事件
        container.querySelectorAll('.skill-node.available, .ultimate-skill.available').forEach(node => {
            node.addEventListener('click', () => {
                const skillId = node.dataset.skillId;
                const treeId = node.dataset.tree;
                this.selectSkill(treeId, skillId);
            });
        });
    }

    canUnlockSkill(treeId, skillId, tierIndex) {
        if (this.skillPoints <= 0) return false;
        if (this.unlockedSkills.has(skillId)) return false;

        // Tier 0 总是可以解锁
        if (tierIndex === 0) return true;

        // 需要前一层有至少一个技能
        const tree = this.skillTrees[treeId];
        const prevTier = tree.tiers[tierIndex - 1];
        return prevTier.some(skill => this.unlockedSkills.has(skill.id));
    }

    getTreeUnlockedCount(treeId) {
        const tree = this.skillTrees[treeId];
        let count = 0;

        tree.tiers.forEach(tier => {
            tier.forEach(skill => {
                if (this.unlockedSkills.has(skill.id)) count++;
            });
        });

        return count;
    }

    selectSkill(treeId, skillId) {
        if (this.skillPoints <= 0) return;

        const tree = this.skillTrees[treeId];
        let skill = null;

        // 查找技能
        if (tree.ultimate.id === skillId) {
            skill = tree.ultimate;
        } else {
            for (const tier of tree.tiers) {
                const found = tier.find(s => s.id === skillId);
                if (found) {
                    skill = found;
                    break;
                }
            }
        }

        if (!skill) return;

        // 解锁技能
        this.unlockedSkills.add(skillId);
        this.skillPoints--;
        this.applySkillEffect(skill);

        // 检查是否解锁了视觉效果
        this.checkCosmeticUnlock(skill);

        // 保存状态
        this.saveState();

        // 更新游戏统计
        if (this.game) this.game.stats.cardsCollected++;

        // 关闭或继续选择
        if (this.skillPoints <= 0) {
            this.closeSelection();
        } else {
            this.renderSkillTrees();
        }

        console.log(`[SkillTree] Unlocked: ${skill.name}`);
    }

    applySkillEffect(skill) {
        const effect = skill.effect;
        if (!this.game) return;

        // 应用各种效果
        if (effect.handRange) this.game.handRangeMultiplier = (this.game.handRangeMultiplier || 1) * effect.handRange;
        if (effect.goldMulti) this.game.goldMultiplier = (this.game.goldMultiplier || 1) * effect.goldMulti;
        if (effect.chopMulti) this.game.chopMultiplier = (this.game.chopMultiplier || 1) * effect.chopMulti;
        if (effect.mineMulti) this.game.mineMultiplier = (this.game.mineMultiplier || 1) * effect.mineMulti;
        if (effect.towerRange) {
            this.game.towers?.towers.forEach(t => t.range *= effect.towerRange);
        }
        if (effect.towerDamageMulti) {
            this.game.towers?.towers.forEach(t => t.damage *= effect.towerDamageMulti);
        }
        if (effect.punchDamage) this.game.punchDamageMulti = (this.game.punchDamageMulti || 1) * effect.punchDamage;
        if (effect.attackSpeedMulti) this.game.attackSpeedMultiplier = effect.attackSpeedMulti;

        // 布尔型特效
        if (effect.punchLightning) this.game.hasPunchLightning = true;
        if (effect.towerBoost) this.game.hasTowerBoost = true;
        if (effect.crystalAttack) this.game.hasCrystalAttack = true;
        if (effect.thornsDamage) this.game.thornsDamage = effect.thornsDamage;
        if (effect.waveBonus) this.game.hasWaveBonus = true;
        if (effect.towerRegen) this.game.hasTowerRegen = true;
        if (effect.comboDamage) this.game.hasComboDamage = true;
        if (effect.crystalDrop) this.game.crystalDropChance = effect.crystalDrop;
        if (effect.autoTurret) this.game.hasAutoTurret = true;

        // 终极技能
        if (effect.rageMode) this.unlockUltimate('rage');
        if (effect.fortressMode) this.unlockUltimate('fortress');
        if (effect.goldRain) this.unlockUltimate('goldRain');
    }

    checkCosmeticUnlock(skill) {
        // 某些特定技能会解锁视觉效果
        if (skill.id === 'tower_master') {
            // 解锁皇冠
            this.unlockCosmetic('crown');
        } else if (skill.id === 'gold_touch' || skill.id === 'treasure_sense') {
            // 解锁光环
            this.unlockCosmetic('halo');
        }

        // 解锁任意一个终极技能时解锁美颜
        if (skill.id === 'rage_mode' || skill.id === 'fortress' || skill.id === 'gold_rain') {
            this.unlockCosmetic('beauty');
        }
    }

    unlockCosmetic(type) {
        const skill = this.cosmeticSkills[type];
        if (!skill) return;

        // 通知 AR 效果系统
        if (this.game?.arEffects) {
            this.game.arEffects.enableEffect(skill.effect);
        }

        console.log(`[SkillTree] Cosmetic unlocked: ${skill.name}`);
    }

    unlockUltimate(type) {
        if (this.game) {
            if (!this.game.ultimateAbilities) {
                this.game.ultimateAbilities = new Set();
            }
            this.game.ultimateAbilities.add(type);
        }
    }

    closeSelection() {
        document.getElementById('skill-tree-modal')?.classList.add('hidden');

        // 恢复游戏
        if (this.game) {
            this.game.resumeAfterCard();
        }
    }

    saveState() {
        localStorage.setItem('godhand_skills', JSON.stringify([...this.unlockedSkills]));
    }

    loadState() {
        try {
            const saved = localStorage.getItem('godhand_skills');
            if (saved) {
                const skills = JSON.parse(saved);
                this.unlockedSkills = new Set(skills);
            }
        } catch (e) {
            console.error('[SkillTree] Failed to load state:', e);
        }
    }

    hasSkill(skillId) {
        return this.unlockedSkills.has(skillId);
    }

    // 获取当前激活的效果
    getActiveEffects() {
        const effects = {};

        Object.values(this.skillTrees).forEach(tree => {
            tree.tiers.forEach(tier => {
                tier.forEach(skill => {
                    if (this.unlockedSkills.has(skill.id)) {
                        Object.assign(effects, skill.effect);
                    }
                });
            });

            if (this.unlockedSkills.has(tree.ultimate.id)) {
                Object.assign(effects, tree.ultimate.effect);
            }
        });

        return effects;
    }
}

window.SkillTreeSystem = SkillTreeSystem;
