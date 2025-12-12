/**
 * 神之手 - 防御塔系统
 */

class TowerSystem {
    constructor(gameWorld) {
        this.game = gameWorld;
        this.towers = [];
        this.towerIdCounter = 0;
        this.selectedTower = null;
        this.draggedTower = null;
        this.dragPosition = null;

        this.towerTypes = {
            arrow: {
                name: '箭塔', emoji: '🏹',
                cost: { wood: 10 },
                damage: 15, range: 150, attackSpeed: 1.0,
                projectile: { color: '#8B4513', speed: 400, size: 4 }
            },
            fire: {
                name: '火焰塔', emoji: '🔥',
                cost: { wood: 15, stone: 5 },
                damage: 8, range: 100, attackSpeed: 0.5,
                aoe: true, aoeRadius: 50,
                projectile: { color: '#ff6b35', speed: 300, size: 8 }
            },
            ice: {
                name: '冰霜塔', emoji: '❄️',
                cost: { wood: 10, crystal: 10 },
                damage: 10, range: 120, attackSpeed: 0.8,
                slow: 0.5, slowDuration: 2,
                projectile: { color: '#00d4ff', speed: 350, size: 5 }
            },
            lightning: {
                name: '雷电塔', emoji: '⚡',
                cost: { crystal: 20 },
                damage: 25, range: 180, attackSpeed: 0.4,
                chain: 3,
                projectile: { color: '#ffd700', speed: 600, size: 3 }
            }
        };

        this.projectiles = [];
    }

    init() {
        this.setupTowerPanel();
    }

    setupTowerPanel() {
        const panel = document.getElementById('tower-panel');
        if (!panel) return;

        panel.querySelectorAll('.tower-card').forEach(card => {
            const type = card.dataset.tower;
            card.addEventListener('mousedown', (e) => this.startDrag(type, e));
            card.addEventListener('touchstart', (e) => this.startDrag(type, e.touches[0]));
        });

        document.addEventListener('mousemove', (e) => this.onDrag(e));
        document.addEventListener('touchmove', (e) => this.onDrag(e.touches[0]));
        document.addEventListener('mouseup', (e) => this.endDrag(e));
        document.addEventListener('touchend', (e) => this.endDrag(e.changedTouches?.[0] || e));
    }

    startDrag(type, e) {
        const config = this.towerTypes[type];
        if (!this.game.resources.canAfford(config.cost)) return;

        this.draggedTower = type;
        this.dragPosition = { x: e.clientX, y: e.clientY };
    }

    onDrag(e) {
        if (!this.draggedTower) return;
        this.dragPosition = { x: e.clientX, y: e.clientY };
    }

    endDrag(e) {
        if (!this.draggedTower) return;

        const x = e.clientX, y = e.clientY;
        const config = this.towerTypes[this.draggedTower];

        // 检查是否可以建造
        if (this.canBuild(x, y) && this.game.resources.spend(config.cost)) {
            this.buildTower(this.draggedTower, x, y);
        }

        this.draggedTower = null;
        this.dragPosition = null;
    }

    // 通过捏合手势放置塔
    placeTowerAtPinch(type, x, y) {
        const config = this.towerTypes[type];
        if (!config) return false;

        if (this.canBuild(x, y) && this.game.resources.spend(config.cost)) {
            this.buildTower(type, x, y);
            return true;
        }
        return false;
    }

    canBuild(x, y) {
        const margin = 50;
        const w = this.game.canvas.width, h = this.game.canvas.height;

        // 边界检查
        if (x < margin || x > w - margin || y < margin || y > h - margin) return false;

        // 与其他塔的距离
        for (const tower of this.towers) {
            if (Utils.distance(x, y, tower.x, tower.y) < 60) return false;
        }

        // 与水晶的距离
        const crystal = this.game.crystal;
        if (crystal && Utils.distance(x, y, crystal.x, crystal.y) < 80) return false;

        return true;
    }

    buildTower(type, x, y) {
        const config = this.towerTypes[type];

        this.towers.push({
            id: ++this.towerIdCounter,
            type, x, y,
            ...config,
            hp: 100,
            maxHp: 100,
            attackCooldown: 0,
            level: 1,
            angle: 0,
            targetId: null
        });

        this.game.effects.createBuildEffect(x, y);
        this.game.stats.towersBuilt++;
        this.updateTowerCards();
    }

    update(deltaTime) {
        // 更新塔
        this.towers.forEach(tower => {
            tower.attackCooldown -= deltaTime;

            // 寻找目标
            const target = this.findTarget(tower);
            if (target) {
                tower.angle = Utils.angle(tower.x, tower.y, target.x, target.y);

                if (tower.attackCooldown <= 0) {
                    this.attack(tower, target);
                    tower.attackCooldown = 1 / tower.attackSpeed;
                }
            }
        });

        // 更新子弹
        this.projectiles = this.projectiles.filter(p => {
            p.x += Math.cos(p.angle) * p.speed * deltaTime;
            p.y += Math.sin(p.angle) * p.speed * deltaTime;
            p.life -= deltaTime;

            if (p.life <= 0) return false;

            // 碰撞检测
            const hit = this.game.enemies.checkHit(p.x, p.y, p.size);
            if (hit) {
                this.onProjectileHit(p, hit);
                return false;
            }

            return true;
        });
    }

    findTarget(tower) {
        let closest = null;
        let closestDist = tower.range;

        this.game.enemies.enemies.forEach(enemy => {
            if (!enemy.alive) return;
            const dist = Utils.distance(tower.x, tower.y, enemy.x, enemy.y);
            if (dist < closestDist) {
                closestDist = dist;
                closest = enemy;
            }
        });

        return closest;
    }

    attack(tower, target) {
        const config = this.towerTypes[tower.type].projectile;
        const angle = Utils.angle(tower.x, tower.y, target.x, target.y);

        this.projectiles.push({
            x: tower.x,
            y: tower.y,
            angle,
            speed: config.speed,
            size: config.size,
            color: config.color,
            damage: tower.damage,
            tower: tower,
            life: 2
        });
    }

    onProjectileHit(projectile, enemy) {
        const tower = projectile.tower;

        // 造成伤害
        this.game.enemies.damageEnemy(enemy, projectile.damage);

        // 特效
        this.game.effects.createExplosion(enemy.x, enemy.y, projectile.color, 8);

        // AOE
        if (tower.aoe) {
            this.game.enemies.enemies.forEach(e => {
                if (e.id !== enemy.id && e.alive) {
                    const dist = Utils.distance(enemy.x, enemy.y, e.x, e.y);
                    if (dist < tower.aoeRadius) {
                        this.game.enemies.damageEnemy(e, tower.damage * 0.5);
                    }
                }
            });
        }

        // 减速
        if (tower.slow) {
            enemy.slowFactor = tower.slow;
            enemy.slowTimer = tower.slowDuration;
        }

        // 连锁闪电
        if (tower.chain) {
            this.chainLightning(enemy, tower.damage * 0.6, tower.chain - 1);
        }
    }

    chainLightning(fromEnemy, damage, chainsLeft) {
        if (chainsLeft <= 0) return;

        let closest = null;
        let closestDist = 150;

        this.game.enemies.enemies.forEach(e => {
            if (e.id !== fromEnemy.id && e.alive) {
                const dist = Utils.distance(fromEnemy.x, fromEnemy.y, e.x, e.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = e;
                }
            }
        });

        if (closest) {
            this.game.enemies.damageEnemy(closest, damage);
            this.game.effects.createExplosion(closest.x, closest.y, '#ffd700', 5);
            this.chainLightning(closest, damage * 0.6, chainsLeft - 1);
        }
    }

    render(ctx) {
        // 渲染塔
        this.towers.forEach(tower => {
            const config = this.towerTypes[tower.type];

            // 攻击范围
            if (this.selectedTower === tower.id) {
                ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
                ctx.stroke();
            }

            // 塔身
            ctx.fillStyle = 'rgba(50, 50, 80, 0.8)';
            ctx.beginPath();
            ctx.arc(tower.x, tower.y, 25, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Emoji
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(config.emoji, tower.x, tower.y);

            // 血条
            if (tower.hp < tower.maxHp) {
                const barW = 40, barH = 5;
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(tower.x - barW / 2, tower.y - 35, barW, barH);
                ctx.fillStyle = tower.hp > 30 ? '#2ecc71' : '#e74c3c';
                ctx.fillRect(tower.x - barW / 2, tower.y - 35, barW * (tower.hp / tower.maxHp), barH);
            }
        });

        // 渲染子弹
        this.projectiles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // 渲染拖拽预览
        if (this.draggedTower && this.dragPosition) {
            const config = this.towerTypes[this.draggedTower];
            const canBuild = this.canBuild(this.dragPosition.x, this.dragPosition.y);

            ctx.globalAlpha = 0.6;
            ctx.fillStyle = canBuild ? '#2ecc71' : '#e74c3c';
            ctx.beginPath();
            ctx.arc(this.dragPosition.x, this.dragPosition.y, 25, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = canBuild ? '#2ecc71' : '#e74c3c';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(this.dragPosition.x, this.dragPosition.y, config.range, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.font = '30px Arial';
            ctx.fillText(config.emoji, this.dragPosition.x, this.dragPosition.y);
            ctx.globalAlpha = 1;
        }
    }

    updateTowerCards() {
        document.querySelectorAll('.tower-card').forEach(card => {
            const type = card.dataset.tower;
            const config = this.towerTypes[type];
            const canAfford = this.game.resources.canAfford(config.cost);
            card.classList.toggle('disabled', !canAfford);
        });
    }

    repairTower(x, y) {
        for (const tower of this.towers) {
            if (Utils.distance(x, y, tower.x, tower.y) < 40 && tower.hp < tower.maxHp) {
                const healAmount = 10;
                tower.hp = Math.min(tower.maxHp, tower.hp + healAmount);
                this.game.effects.createCollectEffect(tower.x, tower.y, 'gold');
                return true;
            }
        }
        return false;
    }
}

window.TowerSystem = TowerSystem;
