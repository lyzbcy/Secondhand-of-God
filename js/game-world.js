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
        this.rlAgent = null;  // 强化学习智能体

        // New systems
        this.craftsman = null;
        this.factory = null;
        this.skillTree = null;
        this.mapSystem = null;
        this.arEffects = null;

        this.isRunning = false;
        this.isPaused = false;
        this.isGameOver = false;
        this.isNight = false;

        this.day = 1;
        this.dayTime = 0;
        this.dayDuration = 45;
        this.waveNumber = 0;
        this.waveActive = false;

        this.crystal = null;
        this.crystalHp = 100;
        this.crystalMaxHp = 100;

        this.stats = { enemiesKilled: 0, towersBuilt: 0, cardsCollected: 0 };

        this.goldMultiplier = 1;
        this.chopMultiplier = 1;
        this.mineMultiplier = 1;
        this.handRangeMultiplier = 1;
        this.punchDamageMulti = 1;
        this.ultimateAbilities = new Set();

        this.lastTime = 0;
    }

    async init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.effects = new EffectsSystem(this.canvas);
        this.resources = new ResourceSystem(this);
        this.towers = new TowerSystem(this);
        this.enemies = new EnemySystem(this);
        this.combat = new CombatSystem(this);
        this.cards = new CardSystem(this);
        this.rlAgent = new RLAgent();  // 初始化 RL 智能体

        // Initialize new systems
        this.craftsman = new CraftsmanSystem(this);
        this.factory = new FactorySystem(this);
        this.skillTree = new SkillTreeSystem(this);
        this.mapSystem = new MapSystem(this);
        this.arEffects = new AREffectsSystem(this);

        this.handTracker = new HandTracker();
        const video = document.getElementById('camera-video');
        const handCanvas = document.getElementById('hand-canvas');

        await this.handTracker.initialize(video, handCanvas);

        this.handTracker.on('onGesture', (gesture) => this.combat.handleGesture(gesture));
        this.handTracker.on('onPinchStart', (hand, pos) => this.onPinchStart(hand, pos));
        this.handTracker.on('onPinchMove', (hand, pos) => this.onPinchMove(hand, pos));
        this.handTracker.on('onPinchEnd', (hand, pos) => this.onPinchEnd(hand, pos));

        this.crystal = { x: this.canvas.width / 2, y: this.canvas.height / 2 };

        this.resources.init();
        this.towers.init();
        this.craftsman.init();
        this.factory.init();
        this.skillTree.init();
        this.mapSystem.init();
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
        document.getElementById('btn-pause')?.addEventListener('click', () => this.togglePause());
        document.getElementById('btn-resume')?.addEventListener('click', () => this.togglePause());
        document.getElementById('btn-quit')?.addEventListener('click', () => this.returnToMenu());
        document.getElementById('btn-restart')?.addEventListener('click', () => this.restart());
        document.getElementById('btn-to-menu')?.addEventListener('click', () => this.returnToMenu());

        // RL 调试面板
        this.setupRLDebugPanel();
    }

    setupRLDebugPanel() {
        const toggle = document.getElementById('rl-debug-toggle');
        const content = document.querySelector('.rl-debug-content');
        const resetBtn = document.getElementById('rl-reset-btn');
        const saveBtn = document.getElementById('rl-save-btn');

        toggle?.addEventListener('click', () => {
            toggle.classList.toggle('collapsed');
            content?.classList.toggle('collapsed');
        });

        resetBtn?.addEventListener('click', () => {
            if (confirm('确定要重置 AI 模型吗？这将清除所有训练数据。')) {
                this.rlAgent.resetModel();
                this.updateRLDebugPanel();
            }
        });

        saveBtn?.addEventListener('click', () => {
            this.rlAgent.saveModel();
            alert('模型已保存！');
        });
    }

    updateRLDebugPanel() {
        if (!this.rlAgent) return;

        // 找到当前的 RL 敌人
        const rlEnemy = this.enemies?.enemies.find(e => e.alive && e.isRLControlled);

        if (rlEnemy && rlEnemy.rlState) {
            const debug = this.rlAgent.getDebugInfo(rlEnemy.rlState);
            document.getElementById('rl-state').textContent = debug.state;
            document.getElementById('rl-action').textContent = this.getActionName(rlEnemy.rlAction);
            document.getElementById('rl-epsilon').textContent = debug.epsilon;
            document.getElementById('rl-episodes').textContent = debug.episodes;
            document.getElementById('rl-states-count').textContent = debug.statesCount;
            document.getElementById('rl-avg-reward').textContent = debug.avgReward;
        } else {
            document.getElementById('rl-state').textContent = '-';
            document.getElementById('rl-action').textContent = '-';
            document.getElementById('rl-epsilon').textContent = this.rlAgent.epsilon.toFixed(3);
            document.getElementById('rl-episodes').textContent = this.rlAgent.stats.episodes;
            document.getElementById('rl-states-count').textContent = Object.keys(this.rlAgent.qTable).length;
        }
    }

    getActionName(action) {
        const names = {
            direct: '直线冲锋',
            left: '左侧绕行',
            right: '右侧绕行',
            retreat: '后退躲避',
            charge: '高速冲锋'
        };
        return names[action] || action || '-';
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
        this.updateDayCycle(deltaTime);
        this.effects.update(deltaTime);
        this.resources.update(deltaTime);
        this.towers.update(deltaTime);
        this.enemies.update(deltaTime);
        this.combat.update(deltaTime);

        if (this.waveActive && this.enemies.isWaveCleared()) {
            this.endWave();
        }

        this.towers.updateTowerCards();
        this.updateRLDebugPanel();
    }

    updateDayCycle(deltaTime) {
        if (this.waveActive) return;

        this.dayTime += deltaTime;
        const progress = (this.dayTime / this.dayDuration) * 100;

        document.getElementById('time-progress').style.width = progress + '%';
        document.getElementById('cycle-icon').textContent = '☀️';
        document.querySelector('#wave-info .wave-label').textContent = '休整阶段';
        document.getElementById('wave-info').classList.remove('combat');

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

        this.enemies.spawnWave(this.waveNumber);
    }

    endWave() {
        this.waveActive = false;
        this.isNight = false;
        this.day++;

        document.getElementById('day-count').textContent = `第 ${this.day} 天`;
        // Use skill tree instead of card selection
        this.showSkillSelectionWithPause();
    }

    showSkillSelectionWithPause() {
        // 暂停游戏
        this.isPaused = true;
        // Use skill tree system
        if (this.skillTree) {
            this.skillTree.showSelection(1);
        } else {
            // Fallback to legacy card system
            this.cards.showCardSelection();
        }
    }

    resumeAfterCard() {
        if (this.cards.hasEffect('waveBonus')) {
            const res = Utils.randomChoice(['wood', 'stone', 'crystal']);
            this.resources.addResource(res, Utils.randomInt(5, 15));
        }
        // 恢复游戏
        this.isPaused = false;
    }

    showCardSelectionWithPause() {
        // 暂停游戏
        this.isPaused = true;
        this.cards.showCardSelection();
    }

    render() {
        const ctx = this.ctx;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.isNight) {
            ctx.fillStyle = 'rgba(0, 0, 30, 0.3)';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        this.renderCrystal(ctx);
        this.resources.render(ctx);
        this.towers.render(ctx);
        this.enemies.render(ctx);
        this.combat.renderSlashTrails(ctx);
        this.effects.render();
        this.renderHandInteraction(ctx);
    }

    renderCrystal(ctx) {
        const { x, y } = this.crystal;

        const gradient = ctx.createRadialGradient(x, y, 20, x, y, 80);
        gradient.addColorStop(0, 'rgba(255, 179, 217, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 179, 217, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 80, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '60px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💎', x, y);

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
            this.renderHandIndicator(ctx, state.rightHand.palmCenter, '#ffb3d9');
        }
    }

    renderHandIndicator(ctx, pos, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 40, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    onPinchStart(hand, pos) {
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
            const handState = state[hand + 'Hand'];
            // 使用捏合位置（拇指和食指中点）而不是手掌中心
            const endPos = handState?.pinchPosition || handState?.palmCenter || startPos;
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

        document.getElementById('stat-days').textContent = this.day;
        document.getElementById('stat-kills').textContent = this.stats.enemiesKilled;
        document.getElementById('stat-towers').textContent = this.stats.towersBuilt;
        document.getElementById('stat-cards').textContent = this.stats.cardsCollected;
        document.getElementById('gameover-modal').classList.remove('hidden');
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseModal = document.getElementById('pause-modal');

        if (this.isPaused) {
            // 更新暂停界面统计数据
            document.getElementById('pause-day').textContent = this.day;
            document.getElementById('pause-kills').textContent = this.stats.enemiesKilled;
            document.getElementById('pause-towers').textContent = this.stats.towersBuilt;
            pauseModal.classList.remove('hidden');
        } else {
            pauseModal.classList.add('hidden');
        }
    }

    restart() {
        location.reload();
    }

    returnToMenu() {
        location.reload();
    }
}

window.GameWorld = GameWorld;
