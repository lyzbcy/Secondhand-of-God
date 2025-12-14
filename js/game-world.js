/**
 * 神之手 - 游戏世界核心
 */

class GameWorld {
    constructor(gameMode = 'single') {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameMode = gameMode; // 'single' or 'coop'

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

        // 单人模式：单个水晶
        // 双人模式：两个水晶（左右）
        this.crystal = null;  // 单人模式使用
        this.crystals = [];   // 双人模式使用
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
        this.devMenu = new DevMenu(this);
        this.isoRenderer = new IsometricRenderer(this);
        this.spriteLoader = new SpriteLoader();
        this.spriteLoader.init();

        // 初始化HandTracker，传入游戏模式
        this.handTracker = new HandTracker(this.gameMode);
        const video = document.getElementById('camera-video');
        const handCanvas = document.getElementById('hand-canvas');

        await this.handTracker.initialize(video, handCanvas);

        this.handTracker.on('onGesture', (gesture) => this.combat.handleGesture(gesture));
        this.handTracker.on('onPinchStart', (hand, pos) => this.onPinchStart(hand, pos));
        this.handTracker.on('onPinchMove', (hand, pos) => this.onPinchMove(hand, pos));
        this.handTracker.on('onPinchEnd', (hand, pos) => this.onPinchEnd(hand, pos));

        // 初始化水晶位置
        if (this.gameMode === 'coop') {
            // 双人模式：两个基地
            this.crystals = [
                {
                    x: this.canvas.width * 0.25,
                    y: this.canvas.height * 0.5,
                    hp: 100,
                    maxHp: 100,
                    playerId: 1
                },
                {
                    x: this.canvas.width * 0.75,
                    y: this.canvas.height * 0.5,
                    hp: 100,
                    maxHp: 100,
                    playerId: 2
                }
            ];
        } else {
            // 单人模式：中央单个基地
            this.crystal = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
        }

        this.resources.init();
        this.towers.init();
        this.craftsman.init();
        this.factory.init();
        this.skillTree.init();
        this.mapSystem.init();
        this.devMenu.init();
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

        // 更新水晶位置
        if (this.gameMode === 'coop' && this.crystals.length > 0) {
            // 双人模式：更新两个基地位置
            this.crystals[0].x = this.canvas.width * 0.25;
            this.crystals[0].y = this.canvas.height * 0.5;
            this.crystals[1].x = this.canvas.width * 0.75;
            this.crystals[1].y = this.canvas.height * 0.5;
        } else if (this.crystal) {
            // 单人模式：中央
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

        // 摄像头画面作为背景，不绘制遮挡

        if (this.isNight) {
            ctx.fillStyle = 'rgba(20, 10, 40, 0.3)';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        this.renderCrystals(ctx);
        this.resources.render(ctx);
        this.towers.render(ctx);
        this.enemies.render(ctx);
        this.combat.renderSlashTrails(ctx);
        this.effects.render();
        this.renderHandInteraction(ctx);
    }

    renderCrystals(ctx) {
        if (this.gameMode === 'coop') {
            // 双人模式：渲染两个基地
            this.crystals.forEach((crystal, index) => {
                this.renderSingleCrystal(ctx, crystal);

                // 更新对应的HUD血条
                const ratio = crystal.hp / crystal.maxHp;
                if (index === 0) {
                    // 玩家1基地（左侧）
                    const hpEl = document.getElementById('crystal-hp-p1');
                    const barEl = document.getElementById('crystal-health-p1');
                    if (hpEl) hpEl.textContent = `${Math.ceil(crystal.hp)}/${crystal.maxHp}`;
                    if (barEl) barEl.style.width = (ratio * 100) + '%';
                } else {
                    // 玩家2基地（右侧）
                    const hpEl = document.getElementById('crystal-hp-p2');
                    const barEl = document.getElementById('crystal-health-p2');
                    if (hpEl) hpEl.textContent = `${Math.ceil(crystal.hp)}/${crystal.maxHp}`;
                    if (barEl) barEl.style.width = (ratio * 100) + '%';
                }
            });
        } else {
            // 单人模式：渲染单个基地
            this.renderSingleCrystal(ctx, this.crystal);

            // 更新单人HUD血条
            const ratio = this.crystalHp / this.crystalMaxHp;
            const hpEl = document.getElementById('crystal-hp');
            const barEl = document.getElementById('crystal-health');
            if (hpEl) hpEl.textContent = `${Math.ceil(this.crystalHp)}/${this.crystalMaxHp}`;
            if (barEl) barEl.style.width = (ratio * 100) + '%';
        }
    }

    renderSingleCrystal(ctx, crystal) {
        if (!crystal) return;

        // 使用等距渲染器绘制水晶
        if (this.isoRenderer) {
            this.isoRenderer.renderCrystal(ctx, crystal);
        } else {
            // 备用渲染
            const { x, y } = crystal;
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
        }
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

    damageCrystal(amount, crystalIndex = 0) {
        if (this.gameMode === 'coop') {
            // 双人模式：伤害指定的基地
            if (crystalIndex >= 0 && crystalIndex < this.crystals.length) {
                this.crystals[crystalIndex].hp -= amount;
                this.effects.shake(10, 0.2);
                this.effects.flash('#ff0000');

                if (this.crystals[crystalIndex].hp <= 0) {
                    this.crystals[crystalIndex].hp = 0;
                    this.gameOver();
                }
            }
        } else {
            // 单人模式：原有逻辑
            this.crystalHp -= amount;
            this.effects.shake(10, 0.2);
            this.effects.flash('#ff0000');

            if (this.crystalHp <= 0) {
                this.crystalHp = 0;
                this.gameOver();
            }
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
