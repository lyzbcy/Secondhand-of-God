/**
 * 神之手 - 多区域地图系统 (重构版)
 * 真正的横向滑动地图，不使用弹窗
 */

class MapSystem {
    constructor(gameWorld) {
        this.game = gameWorld;

        this.regions = {
            craftsman: { id: 'craftsman', x: -1, name: '工匠坊', emoji: '🛠️', description: '升级防御设施' },
            base: { id: 'base', x: 0, name: '基地', emoji: '🏰', description: '保卫水晶' },
            factory: { id: 'factory', x: 1, name: '工厂', emoji: '🏭', description: '自动产资源' }
        };

        this.currentRegion = 'base';
        this.isTransitioning = false;
        this.keyboardEnabled = true;
        this.faceTracker = null;
        this.callbacks = {};
    }

    init() {
        this.createMapContainer();
        this.createRegionPanels();
        this.createHeadTurnIndicator();
        this.setupKeyboardControls();
        this.initFaceTracker();
        this.showRegion('base');
    }

    createHeadTurnIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'head-turn-indicator';
        indicator.className = 'head-turn-indicator hidden';
        indicator.innerHTML = `
            <div class="turn-arrow left">◀</div>
            <div class="turn-progress">
                <div class="turn-progress-fill" id="turn-progress-fill"></div>
            </div>
            <div class="turn-arrow right">▶</div>
            <div class="turn-text" id="turn-text">转头切换区域</div>
        `;
        document.body.appendChild(indicator);
    }

    async initFaceTracker() {
        try {
            if (typeof FaceTracker === 'undefined') return;
            this.faceTracker = new FaceTracker();
            await this.faceTracker.initialize();

            this.faceTracker.on('headTurn', (direction) => {
                if (this.isTransitioning) return;
                if (direction === 'left') this.navigateLeft();
                else if (direction === 'right') this.navigateRight();
            });

            this.faceTracker.on('headPose', (state) => this.updateHeadTurnIndicator(state));
            this.faceTracker.startTracking();
        } catch (e) {
            console.log('[MapSystem] Face tracker not available:', e);
        }
    }

    updateHeadTurnIndicator(state) {
        const indicator = document.getElementById('head-turn-indicator');
        const fill = document.getElementById('turn-progress-fill');
        const text = document.getElementById('turn-text');
        if (!indicator || !fill) return;

        if (state.direction !== 'center' && state.progress > 0) {
            indicator.classList.remove('hidden');
            fill.style.width = (state.progress * 100) + '%';
            const targetName = state.direction === 'left' ? '工匠坊' : '工厂';
            if (text) text.textContent = `→ ${targetName}`;
        } else {
            indicator.classList.add('hidden');
        }
    }

    createMapContainer() {
        const container = document.createElement('div');
        container.id = 'world-map';
        container.className = 'world-map';
        container.innerHTML = `
            <div class="map-scroll-wrapper" id="map-scroll-wrapper">
                <div class="region-panel" id="region-craftsman"></div>
                <div class="region-panel" id="region-base"></div>
                <div class="region-panel" id="region-factory"></div>
            </div>
        `;
        document.getElementById('game-container')?.appendChild(container);

        const nav = document.createElement('div');
        nav.id = 'map-nav';
        nav.className = 'map-nav';
        nav.innerHTML = `
            <button class="nav-btn" id="nav-left" title="工匠坊 (A)">◀ 🛠️</button>
            <div class="nav-center"><span id="current-region-name">🏰 基地</span></div>
            <button class="nav-btn" id="nav-right" title="工厂 (D)">🏭 ▶</button>
        `;
        document.getElementById('hud')?.appendChild(nav);

        document.getElementById('nav-left')?.addEventListener('click', () => this.navigateLeft());
        document.getElementById('nav-right')?.addEventListener('click', () => this.navigateRight());
    }

    createRegionPanels() {
        this.renderCraftsmanPanel();
        this.renderFactoryPanel();
    }

    renderCraftsmanPanel() {
        const panel = document.getElementById('region-craftsman');
        if (!panel) return;

        const craftsman = this.game?.craftsman;
        const unlocked = craftsman?.unlocked || false;
        const towers = this.game?.towers?.towers || [];

        panel.innerHTML = `
            <div class="region-content craftsman-zone">
                <div class="zone-header">
                    <span class="zone-icon">🛠️</span>
                    <div class="zone-title"><h2>工匠坊</h2><p>消耗金币升级塔防</p></div>
                </div>
                ${!unlocked ? `
                    <div class="zone-locked">
                        <div class="lock-icon">🔒</div>
                        <p>工匠坊尚未解锁</p>
                        <div class="unlock-cost">🪙 100 金币</div>
                        <button class="zone-btn unlock-btn" id="btn-unlock-craftsman">解锁工匠坊</button>
                    </div>
                ` : `
                    <div class="zone-content-grid">
                        ${towers.length === 0 ? `
                            <div class="empty-state"><span>🏗️</span><p>暂无已建造的塔<br>先建塔再来升级</p></div>
                        ` : `
                            <div class="upgrade-grid">${towers.map(t => this.renderTowerUpgradeCard(t)).join('')}</div>
                        `}
                    </div>
                `}
            </div>
        `;

        document.getElementById('btn-unlock-craftsman')?.addEventListener('click', () => {
            craftsman?.unlock();
            this.renderCraftsmanPanel();
        });

        panel.querySelectorAll('.upgrade-tower-btn').forEach(btn => {
            btn.addEventListener('click', () => this.upgradeTower(parseInt(btn.dataset.towerId)));
        });
    }

    renderTowerUpgradeCard(tower) {
        const recipes = this.game?.craftsman?.upgradeRecipes || {};
        const recipe = recipes[tower.type];
        if (!recipe) return '';

        const nextUpgrade = recipe.upgrades?.find(u => u.level === tower.level + 1);
        const isMaxLevel = !nextUpgrade;
        const canAfford = nextUpgrade ? this.game?.resources?.canAfford(nextUpgrade.cost) : false;

        return `
            <div class="upgrade-card ${isMaxLevel ? 'max-level' : ''}">
                <div class="card-header">
                    <span class="tower-emoji">${recipe.emoji}</span>
                    <div><span class="tower-name">${recipe.name}</span><span class="tower-level">Lv.${tower.level}</span></div>
                </div>
                ${!isMaxLevel ? `
                    <button class="zone-btn upgrade-tower-btn ${canAfford ? '' : 'disabled'}" 
                            data-tower-id="${tower.id}" ${canAfford ? '' : 'disabled'}>升级 🪙${nextUpgrade.cost.gold || 50}</button>
                ` : `<div class="max-level-badge">⭐ 满级</div>`}
            </div>
        `;
    }

    getResourceIcon(type) {
        const icons = { gold: '🪙', wood: '🪵', stone: '🪨', crystal: '💎' };
        return icons[type] || type;
    }

    upgradeTower(towerId) {
        const tower = this.game?.towers?.towers.find(t => t.id === towerId);
        if (!tower) return;
        const craftsman = this.game?.craftsman;
        if (!craftsman) return;
        const recipe = craftsman.upgradeRecipes[tower.type];
        const nextUpgrade = recipe?.upgrades?.find(u => u.level === tower.level + 1);
        if (nextUpgrade && this.game?.resources?.canAfford(nextUpgrade.cost)) {
            craftsman.upgradeTower(tower, nextUpgrade);
            this.renderCraftsmanPanel();
        }
    }

    renderFactoryPanel() {
        const panel = document.getElementById('region-factory');
        if (!panel) return;

        const factory = this.game?.factory;
        if (!factory) {
            panel.innerHTML = `<div class="region-content factory-zone"><p>加载中...</p></div>`;
            return;
        }

        const floors = factory.getFloors() || [];
        const totalProd = factory.getTotalProduction();
        const unlockedCount = factory.getUnlockedCount();

        const prodDisplay = Object.entries(totalProd)
            .filter(([_, amt]) => amt > 0)
            .map(([type, amt]) => `${this.getResourceIcon(type)}${amt}`)
            .join(' ') || '暂无';

        panel.innerHTML = `
            <div class="region-content factory-zone shelter-style">
                <div class="zone-header">
                    <span class="zone-icon">🏭</span>
                    <div class="zone-title"><h2>资源工厂</h2><p>自动产出各类资源</p></div>
                </div>

                <div class="factory-stats-bar">
                    <div class="stat"><span class="stat-label">每5秒产出</span><span class="stat-value">${prodDisplay}</span></div>
                    <div class="stat"><span class="stat-label">已解锁</span><span class="stat-value">${unlockedCount}/${floors.length}</span></div>
                </div>

                <div class="shelter-building">
                    ${floors.map((floor, idx) => this.renderShelterFloor(floor, idx, factory)).join('')}
                </div>
            </div>
        `;

        panel.querySelectorAll('.floor-unlock-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                factory.unlockFloor(parseInt(btn.dataset.floorId));
                this.renderFactoryPanel();
            });
        });

        panel.querySelectorAll('.floor-upgrade-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                factory.upgradeFloor(parseInt(btn.dataset.floorId));
                this.renderFactoryPanel();
            });
        });
    }

    renderShelterFloor(floor, index, factory) {
        const gold = this.game?.resources?.resources?.gold || 0;
        const canUnlock = factory.canUnlock(floor.id);
        const upgradeCost = factory.getUpgradeCost(floor.id);
        const canUpgrade = upgradeCost && gold >= upgradeCost;
        const isMaxLevel = floor.level >= factory.maxLevel;

        const prodDisplay = Object.entries(floor.production)
            .map(([type, amt]) => `${this.getResourceIcon(type)}${floor.unlocked ? amt * floor.level : amt}`)
            .join(' ');

        if (!floor.unlocked) {
            return `
                <div class="shelter-floor locked ${canUnlock ? 'available' : ''}">
                    <div class="floor-left"><span class="floor-num">${index + 1}F</span><span class="floor-emoji">${floor.emoji}</span></div>
                    <div class="floor-center">
                        <span class="floor-name">${floor.name}</span>
                        <span class="floor-desc">${floor.description}</span>
                        <span class="floor-prod-preview">${prodDisplay}/5秒</span>
                    </div>
                    <div class="floor-right">
                        ${canUnlock ? `
                            <button class="shelter-btn floor-unlock-btn ${gold >= floor.cost ? '' : 'disabled'}" 
                                    data-floor-id="${floor.id}" ${gold >= floor.cost ? '' : 'disabled'}>🪙${floor.cost} 解锁</button>
                        ` : `<span class="floor-locked-hint">🔒</span>`}
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="shelter-floor unlocked">
                    <div class="floor-left"><span class="floor-num">${index + 1}F</span><span class="floor-emoji working">${floor.emoji}</span></div>
                    <div class="floor-center">
                        <span class="floor-name">${floor.name} <span class="level-badge">Lv.${floor.level}</span></span>
                        <span class="floor-prod">${prodDisplay}/5秒</span>
                    </div>
                    <div class="floor-right">
                        ${isMaxLevel ? `<span class="max-level-tag">⭐满级</span>` : `
                            <button class="shelter-btn floor-upgrade-btn ${canUpgrade ? '' : 'disabled'}" 
                                    data-floor-id="${floor.id}" ${canUpgrade ? '' : 'disabled'}>🪙${upgradeCost} 升级</button>
                        `}
                    </div>
                </div>
            `;
        }
    }

    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            if (!this.keyboardEnabled || this.isTransitioning) return;
            if (this.game?.isPaused) return;

            if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
                e.preventDefault();
                this.navigateLeft();
            }
            if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
                e.preventDefault();
                this.navigateRight();
            }
        });
    }

    navigateLeft() {
        const order = ['craftsman', 'base', 'factory'];
        const idx = order.indexOf(this.currentRegion);
        if (idx > 0) this.showRegion(order[idx - 1]);
    }

    navigateRight() {
        const order = ['craftsman', 'base', 'factory'];
        const idx = order.indexOf(this.currentRegion);
        if (idx < order.length - 1) this.showRegion(order[idx + 1]);
    }

    showRegion(regionId) {
        if (this.isTransitioning || regionId === this.currentRegion) return;
        if (!this.regions[regionId]) return;

        this.isTransitioning = true;
        this.currentRegion = regionId;

        if (regionId === 'craftsman') this.renderCraftsmanPanel();
        else if (regionId === 'factory') this.renderFactoryPanel();

        const wrapper = document.getElementById('map-scroll-wrapper');
        if (wrapper) {
            const positions = { craftsman: '0%', base: '-100%', factory: '-200%' };
            wrapper.style.transform = `translateX(${positions[regionId]})`;
        }

        this.updateNavigation();
        this.toggleGameElements(regionId === 'base');

        setTimeout(() => {
            this.isTransitioning = false;
            this.emit('regionChanged', regionId);
        }, 400);
    }

    toggleGameElements(show) {
        const gameCanvas = document.getElementById('game-canvas');
        const towerPanel = document.getElementById('tower-panel');
        if (gameCanvas) gameCanvas.style.opacity = show ? '1' : '0.3';
        if (towerPanel) towerPanel.style.display = show ? 'flex' : 'none';
    }

    updateNavigation() {
        const region = this.regions[this.currentRegion];
        const nameEl = document.getElementById('current-region-name');
        if (nameEl) nameEl.textContent = `${region.emoji} ${region.name}`;

        const leftBtn = document.getElementById('nav-left');
        const rightBtn = document.getElementById('nav-right');
        const order = ['craftsman', 'base', 'factory'];
        const idx = order.indexOf(this.currentRegion);

        if (leftBtn) { leftBtn.disabled = idx === 0; leftBtn.style.opacity = idx === 0 ? '0.3' : '1'; }
        if (rightBtn) { rightBtn.disabled = idx === order.length - 1; rightBtn.style.opacity = idx === order.length - 1 ? '0.3' : '1'; }
    }

    refresh() {
        if (this.currentRegion === 'craftsman') this.renderCraftsmanPanel();
        else if (this.currentRegion === 'factory') this.renderFactoryPanel();
    }

    on(event, callback) {
        if (!this.callbacks[event]) this.callbacks[event] = [];
        this.callbacks[event].push(callback);
    }

    emit(event, data) {
        if (this.callbacks[event]) this.callbacks[event].forEach(cb => cb(data));
    }
}

window.MapSystem = MapSystem;
