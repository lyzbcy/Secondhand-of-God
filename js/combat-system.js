/**
 * 神之手 - 战斗系统
 */

class CombatSystem {
    constructor(gameWorld) {
        this.game = gameWorld;
        this.isCharged = false;
        this.chargeTimer = 0;
        this.fireHands = false;
        this.fireTimer = 0;
        this.ultimateCharge = 0;
        this.ultimateMax = 100;
        this.isUltimateReady = false;

        // 划刀轨迹系统
        this.slashTrails = [];
        this.lastHandPos = { left: null, right: null };
    }

    update(deltaTime) {
        if (this.chargeTimer > 0) {
            this.chargeTimer -= deltaTime;
            if (this.chargeTimer <= 0) this.isCharged = false;
        }
        if (this.fireTimer > 0) {
            this.fireTimer -= deltaTime;
            if (this.fireTimer <= 0) this.fireHands = false;
        }

        // 更新划刀轨迹
        this.slashTrails = this.slashTrails.filter(trail => {
            trail.life -= deltaTime;
            return trail.life > 0;
        });

        // 记录手部位置并创建轨迹
        const state = this.game.handTracker.getGestureState();
        ['left', 'right'].forEach(hand => {
            if (state[hand + 'Hand']) {
                const pos = state[hand + 'Hand'].palmCenter;
                if (this.lastHandPos[hand]) {
                    const dist = Utils.distance(pos.x, pos.y, this.lastHandPos[hand].x, this.lastHandPos[hand].y);
                    if (dist > 20) {
                        this.slashTrails.push({
                            x1: this.lastHandPos[hand].x, y1: this.lastHandPos[hand].y,
                            x2: pos.x, y2: pos.y,
                            life: 0.3, maxLife: 0.3,
                            color: hand === 'left' ? '#ff6b35' : '#ffb3d9',
                            width: 15
                        });
                    }
                }
                this.lastHandPos[hand] = { x: pos.x, y: pos.y };
            } else {
                this.lastHandPos[hand] = null;
            }
        });

        this.updateUltimateUI();
    }

    renderSlashTrails(ctx) {
        this.slashTrails.forEach(trail => {
            const alpha = trail.life / trail.maxLife;
            ctx.strokeStyle = trail.color + Math.floor(alpha * 128).toString(16).padStart(2, '0');
            ctx.lineWidth = trail.width * alpha;
            ctx.lineCap = 'round';
            ctx.shadowBlur = 15;
            ctx.shadowColor = trail.color;
            ctx.beginPath();
            ctx.moveTo(trail.x1, trail.y1);
            ctx.lineTo(trail.x2, trail.y2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        });
    }

    handleGesture(gesture) {
        const { type, data } = gesture;
        switch (type) {
            case 'chop': this.onChop(data); break;
            case 'punch': this.onPunch(data); break;
            case 'slap': this.onSlap(data); break;
            case 'clap': this.onClap(); break;
        }
    }

    onChop(landmarks) {
        const palm = this.getPalmCenter(landmarks);
        let hitSomething = false;

        // 使用轨迹检测
        for (let trail of this.slashTrails) {
            if (trail.life > trail.maxLife * 0.5) {
                for (let t = 0; t <= 1; t += 0.1) {
                    const x = trail.x1 + (trail.x2 - trail.x1) * t;
                    const y = trail.y1 + (trail.y2 - trail.y1) * t;
                    if (this.game.resources.hitNode(x, y, 'chop')) {
                        this.game.effects.createSlashEffect(x, y, -Math.PI / 2);
                        this.showGestureFeedback('手刀劈砍！');
                        hitSomething = true;
                        break;
                    }
                }
                if (hitSomething) break;
            }
        }

        if (!hitSomething && this.game.resources.hitNode(palm.x, palm.y, 'chop')) {
            this.game.effects.createSlashEffect(palm.x, palm.y, -Math.PI / 2);
            this.showGestureFeedback('手刀劈砍！');
            hitSomething = true;
        }

        if (!hitSomething) {
            const velocity = this.game.handTracker.getHandVelocity('right') || { speed: 300 };
            const result = this.game.enemies.handAttack(palm.x, palm.y, 'chop', velocity);
            if (result.success) {
                this.game.effects.createSlashEffect(palm.x, palm.y, -Math.PI / 2);
                this.game.effects.shake(5, 0.1);
            }
        }
    }

    onPunch(landmarks) {
        const palm = this.getPalmCenter(landmarks);
        if (this.game.resources.hitNode(palm.x, palm.y, 'punch')) {
            this.game.effects.createExplosion(palm.x, palm.y, '#808080', 10);
            this.game.effects.shake(8, 0.15);
            this.showGestureFeedback('握拳锤击！');
            return;
        }
        const velocity = this.game.handTracker.getHandVelocity('right') || { speed: 400 };
        const result = this.game.enemies.handAttack(palm.x, palm.y, 'punch', velocity);
        if (result.success) {
            this.game.effects.createExplosion(palm.x, palm.y, '#ff6b35', 12);
            this.game.effects.shake(10, 0.2);
        }
    }

    onSlap(landmarks) {
        const palm = this.getPalmCenter(landmarks);
        const velocity = this.game.handTracker.getHandVelocity('right') || { speed: 350 };
        const result = this.game.enemies.handAttack(palm.x, palm.y, 'slap', velocity);
        if (result.success) {
            this.game.effects.createExplosion(palm.x, palm.y, '#00d4ff', 8);
            this.game.effects.shake(5, 0.1);
            this.showGestureFeedback('拍击！');
        } else if (result.reason === 'thorns') {
            this.showGestureFeedback('⚠️ 刺猬怪不能直接拍！');
        } else if (result.reason === 'ethereal') {
            this.showGestureFeedback('⚠️ 幽灵需要带电才能攻击！');
        }
        this.game.towers.repairTower(palm.x, palm.y);
    }

    onClap() {
        if (this.ultimateCharge >= this.ultimateMax) {
            this.releaseUltimate();
        } else {
            this.showGestureFeedback('能量不足！');
        }
    }

    releaseUltimate() {
        this.ultimateCharge = 0;
        this.isUltimateReady = false;
        const centerX = this.game.canvas.width / 2, centerY = this.game.canvas.height / 2;
        this.game.effects.flash('#ffd700');
        this.game.effects.shake(20, 0.5);
        for (let i = 0; i < 100; i++) {
            setTimeout(() => {
                const angle = (Math.PI * 2 * i) / 50;
                const dist = 100 + Math.random() * 300;
                this.game.effects.createExplosion(centerX + Math.cos(angle) * dist, centerY + Math.sin(angle) * dist, '#ffd700', 10);
            }, i * 20);
        }
        setTimeout(() => {
            this.game.enemies.enemies.forEach(enemy => {
                if (enemy.alive) this.game.enemies.killEnemy(enemy);
            });
        }, 500);
        this.showGestureFeedback('🌟 神之制裁！');
    }

    addCharge(amount) {
        this.ultimateCharge = Math.min(this.ultimateMax, this.ultimateCharge + amount);
        if (this.ultimateCharge >= this.ultimateMax && !this.isUltimateReady) {
            this.isUltimateReady = true;
            document.querySelector('.hud-ultimate')?.classList.add('ready');
        }
    }

    updateUltimateUI() {
        const progress = document.getElementById('ultimate-progress');
        if (progress) progress.style.width = (this.ultimateCharge / this.ultimateMax * 100) + '%';
    }

    borrowFire(towerX, towerY, handX, handY) {
        if (Utils.distance(towerX, towerY, handX, handY) < 50) {
            this.fireHands = true;
            this.fireTimer = 5;
            this.showGestureFeedback('🔥 获得火焰强化！');
            return true;
        }
        return false;
    }

    chargeFromCrystal(crystalX, crystalY, handX, handY) {
        if (Utils.distance(crystalX, crystalY, handX, handY) < 60) {
            this.isCharged = true;
            this.chargeTimer = 8;
            this.showGestureFeedback('⚡ 获得雷电强化！');
            return true;
        }
        return false;
    }

    getPalmCenter(landmarks) {
        if (Array.isArray(landmarks)) {
            return { x: (landmarks[0].x + landmarks[9].x) / 2, y: (landmarks[0].y + landmarks[9].y) / 2 };
        }
        return { x: 0, y: 0 };
    }

    showGestureFeedback(text) {
        const el = document.getElementById('gesture-feedback');
        if (el) {
            el.querySelector('.gesture-name').textContent = text;
            el.classList.remove('hidden');
            clearTimeout(this.feedbackTimeout);
            this.feedbackTimeout = setTimeout(() => el.classList.add('hidden'), 1000);
        }
    }
}

window.CombatSystem = CombatSystem;
