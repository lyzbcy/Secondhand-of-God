/**
 * 神之手 - 战斗系统
 */

class CombatSystem {
    constructor(gameWorld) {
        this.game = gameWorld;
        this.isCharged = false; // 是否带电(攻击幽灵)
        this.chargeTimer = 0;
        this.fireHands = false; // 是否带火
        this.fireTimer = 0;

        this.ultimateCharge = 0;
        this.ultimateMax = 100;
        this.isUltimateReady = false;
    }

    update(deltaTime) {
        // 更新带电状态
        if (this.chargeTimer > 0) {
            this.chargeTimer -= deltaTime;
            if (this.chargeTimer <= 0) this.isCharged = false;
        }

        // 更新带火状态
        if (this.fireTimer > 0) {
            this.fireTimer -= deltaTime;
            if (this.fireTimer <= 0) this.fireHands = false;
        }

        // 更新大招UI
        this.updateUltimateUI();
    }

    // 处理手势
    handleGesture(gesture) {
        const { type, hand, data } = gesture;

        switch (type) {
            case 'chop':
                this.onChop(data);
                break;
            case 'punch':
                this.onPunch(data);
                break;
            case 'slap':
                this.onSlap(data);
                break;
            case 'clap':
                this.onClap();
                break;
        }
    }

    onChop(landmarks) {
        // 手刀攻击 - 用于砍树和攻击敌人
        const palm = this.getPalmCenter(landmarks);

        // 尝试砍树
        if (this.game.resources.hitNode(palm.x, palm.y, 'chop')) {
            this.game.effects.createSlashEffect(palm.x, palm.y, -Math.PI / 2);
            this.showGestureFeedback('手刀劈砍！');
            return;
        }

        // 尝试攻击敌人
        const velocity = this.game.handTracker.getHandVelocity('right') || { speed: 300 };
        const result = this.game.enemies.handAttack(palm.x, palm.y, 'chop', velocity);
        if (result.success) {
            this.game.effects.createSlashEffect(palm.x, palm.y, -Math.PI / 2);
            this.game.effects.shake(5, 0.1);
        }
    }

    onPunch(landmarks) {
        // 握拳锤击 - 用于挖矿和攻击
        const palm = this.getPalmCenter(landmarks);

        // 尝试挖矿
        if (this.game.resources.hitNode(palm.x, palm.y, 'punch')) {
            this.game.effects.createExplosion(palm.x, palm.y, '#808080', 10);
            this.game.effects.shake(8, 0.15);
            this.showGestureFeedback('握拳锤击！');
            return;
        }

        // 尝试攻击敌人
        const velocity = this.game.handTracker.getHandVelocity('right') || { speed: 400 };
        const result = this.game.enemies.handAttack(palm.x, palm.y, 'punch', velocity);
        if (result.success) {
            this.game.effects.createExplosion(palm.x, palm.y, '#ff6b35', 12);
            this.game.effects.shake(10, 0.2);
        }
    }

    onSlap(landmarks) {
        // 拍击 - 用于攻击敌人
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

        // 尝试修理塔
        this.game.towers.repairTower(palm.x, palm.y);
    }

    onClap() {
        // 双手合十 - 释放大招
        if (this.ultimateCharge >= this.ultimateMax) {
            this.releaseUltimate();
        } else {
            this.showGestureFeedback('能量不足！');
        }
    }

    releaseUltimate() {
        this.ultimateCharge = 0;
        this.isUltimateReady = false;

        // 全屏清除敌人
        const centerX = this.game.canvas.width / 2;
        const centerY = this.game.canvas.height / 2;

        this.game.effects.flash('#ffd700');
        this.game.effects.shake(20, 0.5);

        // 创建大量粒子
        for (let i = 0; i < 100; i++) {
            setTimeout(() => {
                const angle = (Math.PI * 2 * i) / 50;
                const dist = 100 + Math.random() * 300;
                this.game.effects.createExplosion(
                    centerX + Math.cos(angle) * dist,
                    centerY + Math.sin(angle) * dist,
                    '#ffd700', 10
                );
            }, i * 20);
        }

        // 杀死所有敌人
        setTimeout(() => {
            this.game.enemies.enemies.forEach(enemy => {
                if (enemy.alive) {
                    this.game.enemies.killEnemy(enemy);
                }
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
        if (progress) {
            progress.style.width = (this.ultimateCharge / this.ultimateMax * 100) + '%';
        }
    }

    // 从火焰塔借火
    borrowFire(towerX, towerY, handX, handY) {
        if (Utils.distance(towerX, towerY, handX, handY) < 50) {
            this.fireHands = true;
            this.fireTimer = 5;
            this.showGestureFeedback('🔥 获得火焰强化！');
            return true;
        }
        return false;
    }

    // 从水晶充电
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
