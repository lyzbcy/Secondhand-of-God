/**
 * 神之手 - 游戏世界核心
 */

class GameWorld {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.handTracker = null;
        this.effects = null;
        this.resources = null;
        this.towers = null;
        this.enemies = null;
        this.combat = null;
        this.cards = null;

        // 游戏状态
        this.isRunning = false;
        this.isPaused = false;
        this.isGameOver = false;
        this.isNight = false;

        // 时间
        this.day = 1;
        this.dayTime = 0;
        this.dayDuration = 45; // 白天45秒
        this.waveNumber = 0;
        this.waveActive = false;

        // 水晶
        this.crystal = null;
        this.crystalHp = 100;
        this.crystalMaxHp = 100;

        // 统计
        this.stats = { enemiesKilled: 0, towersBuilt: 0, cardsCollected: 0 };

        // 效果乘数
        this.goldMultiplier = 1;
        this.chopMultiplier = 1;
        this.mineMultiplier = 1;
        this.handRangeMultiplier = 1;

        this.lastTime = 0;
    }

    async init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // 初始化子系统
        this.effects = new EffectsSystem(this.canvas);
        this.resources = new ResourceSystem(this);
        this.towers = new TowerSystem(this);
        this.enemies = new EnemySystem(this);
        this.combat = new CombatSystem(this);
        this.cards = new CardSystem(this);

        // 初始化手势追踪
        this.handTracker = new HandTracker();
        const video = document.getElementById('camera-video');
        const handCanvas = document.getElementById('hand-canvas');

        await this.handTracker.initialize(video, handCanvas);

        // 设置手势回调
        this.handTracker.on('onGesture', (gesture) => this.combat.handleGesture(gesture));
        this.handTracker.on('onPinchStart', (hand, pos) => this.onPinchStart(hand, pos));
        this.handTracker.on('onPinchMove', (hand, pos) => this.onPinchMove(hand, pos));
        this.handTracker.on('onPinchEnd', (hand, pos) => this.onPinchEnd(hand, pos));

        // 初始化水晶位置
        this.crystal = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2
        };

        // 初始化资源和塔系统
        this.resources.init();
        this.towers.init();

        this.setupUI();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        const handCanvas = document.getElementById('hand-canvas');
        if (handCanvas) {
            handCanvas.width = window.innerWidth;
            handCanvas.height = window.innerHeight;
        }

        if (this.crystal) {
            this.crystal.x = this.canvas.width / 2;
            this.crystal.y = this.canvas.height / 2;
        }
    }

    setupUI() {
        // 暂停按钮
        document.getElementById('btn-pause')?.addEventListener('click', () => this.togglePause());
        document.getElementById('btn-resume')?.addEventListener('click', () => this.togglePause());
        document.getElementById('btn-quit')?.addEventListener('click', () => this.returnToMenu());
        document.getElementById('btn-restart')?.addEventListener('click', () => this.restart());
        document.getElementById('btn-to-menu')?.addEventListener('click', () => this.returnToMenu());
    }

    async start() {
        await this.handTracker.startTracking();
        this.isRunning = true;
        this.isGameOver = false;
        this.lastTime = performance.now();
        this.gameLoop();
    }

    gameLoop() {
        if (!this.isRunning) return;

        const now = performance.now();
        const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;

        if (!this.isPaused) {
            this.update(deltaTime);
        }

        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    update(deltaTime) {
        // 更新昼夜循环
        this.updateDayCycle(deltaTime);

        // 更新子系统
        this.effects.update(deltaTime);
        this.resources.update(deltaTime);
        this.towers.update(deltaTime);
        this.enemies.update(deltaTime);
        this.combat.update(deltaTime);

        // 检查波次结束
        if (this.waveActive && this.enemies.isWaveCleared()) {
            this.endWave();
        }

        // 更新塔卡片状态
        this.towers.updateTowerCards();
    }

    updateDayCycle(deltaTime) {
        if (this.waveActive) return;

        this.dayTime += deltaTime;
        const progress = (this.dayTime / this.dayDuration) * 100;

        // 更新UI
        document.getElementById('time-progress').style.width = progress + '%';
        document.getElementById('cycle-icon').textContent = '☀️';
        document.querySelector('#wave-info .wave-label').textContent = '休整阶段';
        document.getElementById('wave-info').classList.remove('combat');

        // 进入夜晚
        if (this.dayTime >= this.dayDuration) {
            this.startNight();
        }
    }

    startNight() {
        this.isNight = true;
        this.waveNumber++;
        this.waveActive = true;
        this.dayTime = 0;

        document.getElementById('cycle-icon').textContent = '🌙';
        document.querySelector('#wave-info .wave-label').textContent = `第 ${this.waveNumber} 波`;
        document.getElementById('wave-info').classList.add('combat');

        // 生成敌人
        this.enemies.spawnWave(this.waveNumber);
    }

    endWave() {
        this.waveActive = false;
        this.isNight = false;
        this.day++;

        document.getElementById('day-count').textContent = `第 ${this.day} 天`;

        // 显示卡牌选择
        this.cards.showCardSelection();
    }

    resumeAfterCard() {
        // 波次奖励
        if (this.cards.hasEffect('waveBonus')) {
            const res = Utils.randomChoice(['wood', 'stone', 'crystal']);
            this.resources.addResource(res, Utils.randomInt(5, 15));
        }
    }

    render() {
        const ctx = this.ctx;

        // 清空画布
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 昼夜滤镜
        if (this.isNight) {
            ctx.fillStyle = 'rgba(0, 0, 30, 0.3)';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // 渲染水晶
        this.renderCrystal(ctx);

        // 渲染资源节点
        this.resources.render(ctx);

        // 渲染防御塔
        this.towers.render(ctx);

        // 渲染敌人
        this.enemies.render(ctx);

        // 渲染特效
        this.effects.render();

        // 渲染手部交互提示
        this.renderHandInteraction(ctx);
    }

    renderCrystal(ctx) {
        const { x, y } = this.crystal;

        // 光环
        const gradient = ctx.createRadialGradient(x, y, 20, x, y, 80);
        gradient.addColorStop(0, 'rgba(0, 212, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 212, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 80, 0, Math.PI * 2);
        ctx.fill();

        // 水晶
        ctx.font = '60px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💎', x, y);

        // 更新血条UI
        const ratio = this.crystalHp / this.crystalMaxHp;
        document.getElementById('crystal-health').style.width = (ratio * 100) + '%';
        document.getElementById('crystal-hp').textContent = `${Math.ceil(this.crystalHp)}/${this.crystalMaxHp}`;
    }

    renderHandInteraction(ctx) {
        const state = this.handTracker.getGestureState();

        if (state.leftHand) {
            this.renderHandIndicator(ctx, state.leftHand.palmCenter, '#ff6b35');
        }
        if (state.rightHand) {
            this.renderHandIndicator(ctx, state.rightHand.palmCenter, '#00d4ff');
        }
    }

    renderHandIndicator(ctx, pos, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // 捏合拖拽处理
    onPinchStart(hand, pos) {
        // 检查是否在塔面板上捏合
        const cards = document.querySelectorAll('.tower-card:not(.disabled)');
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            if (pos.x >= rect.left && pos.x <= rect.right && pos.y >= rect.top && pos.y <= rect.bottom) {
                this.draggedTowerType = card.dataset.tower;
            }
        });
    }

    onPinchMove(hand, pos) {
        if (this.draggedTowerType) {
            this.towers.dragPosition = pos;
            this.towers.draggedTower = this.draggedTowerType;
        }
    }

    onPinchEnd(hand, startPos) {
        if (this.draggedTowerType) {
            const state = this.handTracker.getGestureState();
            const endPos = state[hand + 'Hand']?.palmCenter || startPos;
            this.towers.placeTowerAtPinch(this.draggedTowerType, endPos.x, endPos.y);
            this.draggedTowerType = null;
            this.towers.draggedTower = null;
            this.towers.dragPosition = null;
        }
    }

    damageCrystal(amount) {
        this.crystalHp -= amount;
        this.effects.shake(10, 0.2);
        this.effects.flash('#ff0000');

        if (this.crystalHp <= 0) {
            this.crystalHp = 0;
            this.gameOver();
        }
    }

    addUltimateCharge(amount) {
        this.combat.addCharge(amount);
    }

    gameOver() {
        this.isGameOver = true;
        this.isRunning = false;

        // 显示结算
        document.getElementById('stat-days').textContent = this.day;
        document.getElementById('stat-kills').textContent = this.stats.enemiesKilled;
        document.getElementById('stat-towers').textContent = this.stats.towersBuilt;
        document.getElementById('stat-cards').textContent = this.stats.cardsCollected;
        document.getElementById('gameover-modal').classList.remove('hidden');
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        document.getElementById('pause-modal').classList.toggle('hidden', !this.isPaused);
    }

    restart() {
        location.reload();
    }

    returnToMenu() {
        location.reload();
    }
}

window.GameWorld = GameWorld;
