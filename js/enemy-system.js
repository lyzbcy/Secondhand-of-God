/**
 * 神之手 - 敌人系统
 */

class EnemySystem {
    constructor(gameWorld) {
        this.game = gameWorld;
        this.enemies = [];
        this.enemyIdCounter = 0;

        this.enemyTypes = {
            goblin: {
                name: '小鬼', emoji: '👺',
                hp: 30, speed: 60, damage: 5, reward: 5,
                size: 25, canSlap: true
            },
            skeleton: {
                name: '骷髅', emoji: '💀',
                hp: 50, speed: 45, damage: 8, reward: 8,
                size: 28, canSlap: true
            },
            hedgehog: {
                name: '刺猬怪', emoji: '🦔',
                hp: 40, speed: 50, damage: 6, reward: 10,
                size: 30, canSlap: false, thorns: true
            },
            ghost: {
                name: '幽灵', emoji: '👻',
                hp: 35, speed: 70, damage: 7, reward: 12,
                size: 26, canSlap: false, ethereal: true
            },
            ogre: {
                name: '攻城巨兽', emoji: '👹',
                hp: 200, speed: 25, damage: 25, reward: 30,
                size: 50, canSlap: true, needsHold: true
            },
            rl_boss: {
                name: 'AI猎手', emoji: '🤖',
                hp: 150, speed: 40, damage: 20, reward: 50,
                size: 45, canSlap: true, isRLControlled: true
            }
        };

        this.waveConfig = [
            { enemies: [{ type: 'goblin', count: 5 }] },
            { enemies: [{ type: 'goblin', count: 8 }] },
            { enemies: [{ type: 'goblin', count: 5 }, { type: 'skeleton', count: 3 }] },
            { enemies: [{ type: 'skeleton', count: 5 }, { type: 'hedgehog', count: 2 }] },
            { enemies: [{ type: 'goblin', count: 8 }, { type: 'ghost', count: 3 }] },
            { enemies: [{ type: 'skeleton', count: 6 }, { type: 'hedgehog', count: 4 }] },
            { enemies: [{ type: 'ghost', count: 5 }, { type: 'ogre', count: 1 }] },
            { enemies: [{ type: 'goblin', count: 10 }, { type: 'skeleton', count: 5 }, { type: 'ogre', count: 1 }] },
            // 第9波开始出现 RL BOSS
            { enemies: [{ type: 'skeleton', count: 8 }, { type: 'rl_boss', count: 1 }] },
            { enemies: [{ type: 'ghost', count: 6 }, { type: 'hedgehog', count: 4 }, { type: 'rl_boss', count: 1 }] },
        ];
    }

    spawnWave(waveNumber) {
        const waveIndex = Math.min(waveNumber - 1, this.waveConfig.length - 1);
        const wave = this.waveConfig[waveIndex];
        const multiplier = Math.max(1, Math.floor(waveNumber / this.waveConfig.length));

        let spawnDelay = 0;
        wave.enemies.forEach(group => {
            const count = group.count * multiplier;
            for (let i = 0; i < count; i++) {
                setTimeout(() => this.spawnEnemy(group.type), spawnDelay);
                spawnDelay += 800 + Math.random() * 400;
            }
        });
    }

    spawnEnemy(type) {
        if (this.game.isGameOver) return;

        const config = this.enemyTypes[type];
        const w = this.game.canvas.width, h = this.game.canvas.height;

        // 从边缘生成
        const side = Utils.randomInt(0, 3);
        let x, y;
        switch (side) {
            case 0: x = Utils.randomInt(0, w); y = -30; break;
            case 1: x = w + 30; y = Utils.randomInt(0, h); break;
            case 2: x = Utils.randomInt(0, w); y = h + 30; break;
            case 3: x = -30; y = Utils.randomInt(0, h); break;
        }

        const enemy = {
            id: ++this.enemyIdCounter,
            type, x, y,
            ...config,
            maxHp: config.hp * (1 + this.game.day * 0.1),
            hp: config.hp * (1 + this.game.day * 0.1),
            alive: true,
            slowFactor: 1,
            slowTimer: 0,
            stunTimer: 0,
            heldBy: null,
            // RL 相关字段
            rlState: null,
            rlAction: null,
            prevDist: null
        };
        this.enemies.push(enemy);
    }

    update(deltaTime) {
        const crystal = this.game.crystal;
        if (!crystal) return;

        this.enemies.forEach(enemy => {
            if (!enemy.alive) return;

            // 减速效果
            if (enemy.slowTimer > 0) {
                enemy.slowTimer -= deltaTime;
            } else {
                enemy.slowFactor = 1;
            }

            // 眩晕效果
            if (enemy.stunTimer > 0) {
                enemy.stunTimer -= deltaTime;
                return;
            }

            // 被玩家按住
            if (enemy.heldBy) return;

            // RL 控制的敌人使用智能体决策
            if (enemy.isRLControlled && this.game.rlAgent) {
                this.updateRLEnemy(enemy, deltaTime);
            } else {
                // 普通敌人：直线移动朝向水晶
                const angle = Utils.angle(enemy.x, enemy.y, crystal.x, crystal.y);
                const speed = enemy.speed * enemy.slowFactor * deltaTime;
                enemy.x += Math.cos(angle) * speed;
                enemy.y += Math.sin(angle) * speed;
            }

            // 攻击水晶
            if (Utils.distance(enemy.x, enemy.y, crystal.x, crystal.y) < 50) {
                this.attackCrystal(enemy);
            }
        });

        // 清理死亡敌人
        this.enemies = this.enemies.filter(e => e.alive);
    }

    attackCrystal(enemy) {
        this.game.damageCrystal(enemy.damage);
        enemy.alive = false;
    }

    render(ctx) {
        this.enemies.forEach(enemy => {
            if (!enemy.alive) return;

            const config = this.enemyTypes[enemy.type];

            // 阴影
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(enemy.x, enemy.y + enemy.size * 0.3, enemy.size * 0.6, enemy.size * 0.2, 0, 0, Math.PI * 2);
            ctx.fill();

            // 绘制敌人
            let alpha = 1;
            if (enemy.ethereal) {
                alpha = 0.6 + Math.sin(Date.now() / 200) * 0.2;
            }

            ctx.globalAlpha = alpha;
            ctx.font = `${enemy.size * 1.5}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(config.emoji, enemy.x, enemy.y);
            ctx.globalAlpha = 1;

            // 减速视觉
            if (enemy.slowTimer > 0) {
                ctx.fillStyle = 'rgba(0, 212, 255, 0.3)';
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.size * 0.8, 0, Math.PI * 2);
                ctx.fill();
            }

            // 血条
            const barW = enemy.size * 1.5, barH = 5;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(enemy.x - barW / 2, enemy.y - enemy.size - 10, barW, barH);
            ctx.fillStyle = enemy.hp > enemy.maxHp * 0.3 ? '#2ecc71' : '#e74c3c';
            ctx.fillRect(enemy.x - barW / 2, enemy.y - enemy.size - 10, barW * (enemy.hp / enemy.maxHp), barH);
        });
    }

    /**
     * 更新 RL 控制的敌人
     */
    updateRLEnemy(enemy, deltaTime) {
        const rlAgent = this.game.rlAgent;

        // 获取当前状态
        const currentState = rlAgent.encodeState(enemy, this.game);

        // 如果有上一个状态，进行学习
        if (enemy.rlState && enemy.rlAction) {
            const reward = rlAgent.calculateReward(enemy, this.game);
            rlAgent.learn(enemy.rlState, enemy.rlAction, reward, currentState, false);
        }

        // 选择动作
        const action = rlAgent.chooseAction(currentState);

        // 保存状态和动作供下次学习
        enemy.rlState = currentState;
        enemy.rlAction = action;

        // 执行动作
        const movement = rlAgent.getMovementFromAction(action, enemy, this.game);
        const speed = enemy.speed * enemy.slowFactor * movement.speedMultiplier * deltaTime;
        enemy.x += movement.dx * speed;
        enemy.y += movement.dy * speed;

        // 边界检测
        enemy.x = Math.max(0, Math.min(this.game.canvas.width, enemy.x));
        enemy.y = Math.max(0, Math.min(this.game.canvas.height, enemy.y));
    }

    checkHit(x, y, radius = 10) {
        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            const dist = Utils.distance(x, y, enemy.x, enemy.y);
            if (dist < enemy.size + radius) {
                return enemy;
            }
        }
        return null;
    }

    damageEnemy(enemy, damage) {
        if (!enemy.alive) return;

        enemy.hp -= damage;
        this.game.effects.createDamageNumber(enemy.x, enemy.y - 30, damage, damage > 30);

        // RL 学习：被击中惩罚
        if (enemy.isRLControlled && this.game.rlAgent && enemy.rlState) {
            const reward = this.game.rlAgent.calculateReward(enemy, this.game, { type: 'damaged' });
            const newState = this.game.rlAgent.encodeState(enemy, this.game);
            this.game.rlAgent.learn(enemy.rlState, enemy.rlAction, reward, newState, false);
        }

        if (enemy.hp <= 0) {
            this.killEnemy(enemy);
        }
    }

    killEnemy(enemy) {
        // RL 学习：死亡惩罚
        if (enemy.isRLControlled && this.game.rlAgent && enemy.rlState) {
            const reward = this.game.rlAgent.calculateReward(enemy, this.game, { type: 'killed' });
            this.game.rlAgent.learn(enemy.rlState, enemy.rlAction, reward, enemy.rlState, true);
            this.game.rlAgent.endEpisode(reward);
        }

        enemy.alive = false;
        this.game.resources.addResource('gold', enemy.reward);
        this.game.effects.createExplosion(enemy.x, enemy.y, '#ff6b35', 15);
        this.game.addUltimateCharge(5);
        this.game.stats.enemiesKilled++;
    }

    attackCrystal(enemy) {
        // RL 学习：攻击水晶奖励
        if (enemy.isRLControlled && this.game.rlAgent && enemy.rlState) {
            const reward = this.game.rlAgent.calculateReward(enemy, this.game, { type: 'attackCrystal' });
            this.game.rlAgent.learn(enemy.rlState, enemy.rlAction, reward, enemy.rlState, true);
            this.game.rlAgent.endEpisode(reward);
        }

        this.game.damageCrystal(enemy.damage);
        enemy.alive = false;
    }

    // 手部攻击检测
    handAttack(x, y, gestureType, velocity) {
        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;

            const dist = Utils.distance(x, y, enemy.x, enemy.y);
            if (dist > enemy.size * 1.5) continue;

            const config = this.enemyTypes[enemy.type];

            // 刺猬不能拍
            if (!config.canSlap && gestureType === 'slap') {
                this.game.effects.flash('#ff0000');
                return { success: false, reason: 'thorns' };
            }

            // 幽灵需要带电
            if (config.ethereal && !this.game.combat.isCharged) {
                return { success: false, reason: 'ethereal' };
            }

            // 造成伤害
            const damage = 20 + velocity.speed / 20;
            this.damageEnemy(enemy, damage);

            // 击退
            const angle = Utils.angle(x, y, enemy.x, enemy.y);
            enemy.x += Math.cos(angle) * 30;
            enemy.y += Math.sin(angle) * 30;
            enemy.stunTimer = 0.3;

            return { success: true, enemy };
        }
        return { success: false };
    }

    // 检测是否所有敌人都被清除
    isWaveCleared() {
        return this.enemies.filter(e => e.alive).length === 0;
    }

    getActiveCount() {
        return this.enemies.filter(e => e.alive).length;
    }
}

window.EnemySystem = EnemySystem;

