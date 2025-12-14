/**
 * 神之手 - 开发者菜单系统
 * 秘密代码: lyzbcy (10秒内输入)
 */

class DevMenu {
    constructor(gameWorld) {
        this.game = gameWorld;
        this.secretCode = 'lyzbcy';
        this.inputBuffer = '';
        this.lastInputTime = 0;
        this.timeout = 10000; // 10秒超时
        this.isOpen = false;
        this.isUnlocked = false;
    }

    init() {
        this.createUI();
        this.setupKeyListener();
    }

    setupKeyListener() {
        document.addEventListener('keydown', (e) => {
            // 如果开发者菜单已打开，不记录输入
            if (this.isOpen) return;

            const now = Date.now();

            // 超时重置
            if (now - this.lastInputTime > this.timeout) {
                this.inputBuffer = '';
            }

            this.lastInputTime = now;
            this.inputBuffer += e.key.toLowerCase();

            // 保持buffer长度
            if (this.inputBuffer.length > this.secretCode.length) {
                this.inputBuffer = this.inputBuffer.slice(-this.secretCode.length);
            }

            // 检查是否匹配秘密代码
            if (this.inputBuffer === this.secretCode) {
                this.unlock();
                this.inputBuffer = '';
            }
        });
    }

    unlock() {
        if (this.isUnlocked) {
            this.open();
            return;
        }

        this.isUnlocked = true;
        console.log('[DevMenu] 🔓 Developer mode unlocked!');

        // 显示解锁提示
        const toast = document.createElement('div');
        toast.className = 'dev-toast';
        toast.innerHTML = '🔓 开发者模式已解锁';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);

        this.open();
    }

    createUI() {
        const panel = document.createElement('div');
        panel.id = 'dev-menu';
        panel.className = 'dev-menu hidden';
        panel.innerHTML = `
            <div class="dev-header">
                <h3>🛠️ 开发者菜单</h3>
                <button class="dev-close" id="dev-close">✕</button>
            </div>
            
            <div class="dev-section">
                <h4>⏯️ 游戏控制</h4>
                <div class="dev-buttons">
                    <button class="dev-btn" id="dev-pause">⏸️ 暂停</button>
                    <button class="dev-btn" id="dev-resume">▶️ 继续</button>
                    <button class="dev-btn danger" id="dev-restart">🔄 重新开始</button>
                </div>
            </div>
            
            <div class="dev-section">
                <h4>📦 资源控制</h4>
                <div class="dev-resource-row">
                    <span>🪙 金币</span>
                    <input type="number" id="dev-gold" value="1000">
                    <button class="dev-btn small" data-resource="gold">添加</button>
                </div>
                <div class="dev-resource-row">
                    <span>🪵 木材</span>
                    <input type="number" id="dev-wood" value="100">
                    <button class="dev-btn small" data-resource="wood">添加</button>
                </div>
                <div class="dev-resource-row">
                    <span>🪨 石材</span>
                    <input type="number" id="dev-stone" value="100">
                    <button class="dev-btn small" data-resource="stone">添加</button>
                </div>
                <div class="dev-resource-row">
                    <span>💎 水晶</span>
                    <input type="number" id="dev-crystal" value="50">
                    <button class="dev-btn small" data-resource="crystal">添加</button>
                </div>
                <button class="dev-btn full" id="dev-add-all">➕ 全部添加</button>
            </div>
            
            <div class="dev-section">
                <h4>🌊 波次控制</h4>
                <div class="dev-wave-row">
                    <span>当前波次: <strong id="dev-current-wave">1</strong></span>
                    <div class="dev-buttons">
                        <button class="dev-btn" id="dev-wave-prev">◀ 上一波</button>
                        <button class="dev-btn" id="dev-wave-next">下一波 ▶</button>
                    </div>
                </div>
                <div class="dev-wave-row">
                    <label>跳转到波次:</label>
                    <input type="number" id="dev-wave-input" value="1" min="1">
                    <button class="dev-btn small" id="dev-wave-jump">跳转</button>
                </div>
                <button class="dev-btn full" id="dev-skip-wave">⏭️ 跳过当前波次</button>
            </div>
            
            <div class="dev-section">
                <h4>⚡ 快捷操作</h4>
                <div class="dev-buttons">
                    <button class="dev-btn" id="dev-fill-ultimate">充满终极技能</button>
                    <button class="dev-btn" id="dev-kill-enemies">清除所有敌人</button>
                    <button class="dev-btn" id="dev-heal-crystal">治愈水晶</button>
                    <button class="dev-btn danger" id="dev-damage-crystal">伤害水晶</button>
                </div>
            </div>
            
            <div class="dev-footer">
                <span class="dev-hint">解锁码: lyzbcy</span>
            </div>
        `;

        document.body.appendChild(panel);
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('dev-close')?.addEventListener('click', () => this.close());

        // 游戏控制
        document.getElementById('dev-pause')?.addEventListener('click', () => this.pauseGame());
        document.getElementById('dev-resume')?.addEventListener('click', () => this.resumeGame());
        document.getElementById('dev-restart')?.addEventListener('click', () => this.restartGame());

        // 资源添加
        document.querySelectorAll('[data-resource]').forEach(btn => {
            btn.addEventListener('click', () => {
                const resource = btn.dataset.resource;
                const input = document.getElementById(`dev-${resource}`);
                const amount = parseInt(input?.value) || 100;
                this.addResource(resource, amount);
            });
        });

        document.getElementById('dev-add-all')?.addEventListener('click', () => this.addAllResources());

        // 波次控制
        document.getElementById('dev-wave-prev')?.addEventListener('click', () => this.changeWave(-1));
        document.getElementById('dev-wave-next')?.addEventListener('click', () => this.changeWave(1));
        document.getElementById('dev-wave-jump')?.addEventListener('click', () => this.jumpToWave());
        document.getElementById('dev-skip-wave')?.addEventListener('click', () => this.skipWave());

        // 快捷操作
        document.getElementById('dev-fill-ultimate')?.addEventListener('click', () => this.fillUltimate());
        document.getElementById('dev-kill-enemies')?.addEventListener('click', () => this.killAllEnemies());
        document.getElementById('dev-heal-crystal')?.addEventListener('click', () => this.healCrystal());
        document.getElementById('dev-damage-crystal')?.addEventListener('click', () => this.damageCrystal());
    }

    open() {
        if (!this.isUnlocked) return;

        this.isOpen = true;
        document.getElementById('dev-menu')?.classList.remove('hidden');
        this.updateDisplay();

        // 暂停游戏
        if (this.game) this.game.isPaused = true;
    }

    close() {
        this.isOpen = false;
        document.getElementById('dev-menu')?.classList.add('hidden');
    }

    updateDisplay() {
        const waveEl = document.getElementById('dev-current-wave');
        if (waveEl && this.game) {
            waveEl.textContent = this.game.wave || 1;
        }
    }

    // 游戏控制
    pauseGame() {
        if (this.game) {
            this.game.isPaused = true;
            console.log('[DevMenu] Game paused');
        }
    }

    resumeGame() {
        if (this.game) {
            this.game.isPaused = false;
            console.log('[DevMenu] Game resumed');
        }
        this.close();
    }

    restartGame() {
        if (confirm('确定要重新开始游戏吗？')) {
            location.reload();
        }
    }

    // 资源控制
    addResource(type, amount) {
        if (this.game?.resources) {
            this.game.resources.addResource(type, amount);
            console.log(`[DevMenu] Added ${amount} ${type}`);
        }
    }

    addAllResources() {
        const gold = parseInt(document.getElementById('dev-gold')?.value) || 1000;
        const wood = parseInt(document.getElementById('dev-wood')?.value) || 100;
        const stone = parseInt(document.getElementById('dev-stone')?.value) || 100;
        const crystal = parseInt(document.getElementById('dev-crystal')?.value) || 50;

        this.addResource('gold', gold);
        this.addResource('wood', wood);
        this.addResource('stone', stone);
        this.addResource('crystal', crystal);
    }

    // 波次控制
    changeWave(delta) {
        if (!this.game) return;
        const newWave = Math.max(1, (this.game.wave || 1) + delta);
        this.game.wave = newWave;
        this.updateDisplay();
        console.log(`[DevMenu] Wave set to ${newWave}`);
    }

    jumpToWave() {
        const input = document.getElementById('dev-wave-input');
        const wave = parseInt(input?.value) || 1;
        if (this.game) {
            this.game.wave = Math.max(1, wave);
            this.updateDisplay();
            console.log(`[DevMenu] Jumped to wave ${wave}`);
        }
    }

    skipWave() {
        if (this.game?.enemies) {
            // 杀死所有敌人
            this.game.enemies.enemies.forEach(enemy => {
                if (enemy.alive) this.game.enemies.killEnemy(enemy);
            });
            // 结束当前波次
            if (this.game.endWave) this.game.endWave();
            console.log('[DevMenu] Wave skipped');
        }
    }

    // 快捷操作
    fillUltimate() {
        if (this.game?.combat) {
            this.game.combat.ultimateCharge = this.game.combat.ultimateMax;
            this.game.combat.isUltimateReady = true;
            document.getElementById('ultimate-container')?.classList.add('ready');
            console.log('[DevMenu] Ultimate filled');
        }
    }

    killAllEnemies() {
        if (this.game?.enemies) {
            this.game.enemies.enemies.forEach(enemy => {
                if (enemy.alive) this.game.enemies.killEnemy(enemy);
            });
            console.log('[DevMenu] All enemies killed');
        }
    }

    healCrystal() {
        if (this.game) {
            this.game.crystalHealth = this.game.crystalMaxHealth;
            this.game.updateCrystalUI?.();
            console.log('[DevMenu] Crystal healed');
        }
    }

    damageCrystal() {
        if (this.game) {
            const damage = Math.floor(this.game.crystalMaxHealth * 0.2);
            this.game.crystalHealth = Math.max(0, this.game.crystalHealth - damage);
            this.game.updateCrystalUI?.();
            console.log(`[DevMenu] Crystal damaged by ${damage}`);
        }
    }
}

window.DevMenu = DevMenu;
