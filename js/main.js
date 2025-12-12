/**
 * 神之手：最后的防线 - 主入口
 * God Hand: Last Defense - Main Entry
 */

class Game {
    constructor() {
        this.gameWorld = null;
        this.loadingProgress = 0;
        this.tutorialIndex = 0;
    }

    async init() {
        this.updateLoadingStatus('初始化游戏系统...');
        this.setLoadingProgress(10);

        // 设置教程
        this.setupTutorial();

        // 设置模态框关闭
        this.setupModals();

        // 设置菜单按钮
        this.setupMenuButtons();

        this.setLoadingProgress(30);
        this.updateLoadingStatus('加载 MediaPipe 手势识别...');

        // 等待 MediaPipe 加载
        await this.waitForMediaPipe();

        this.setLoadingProgress(70);
        this.updateLoadingStatus('初始化摄像头...');

        // 初始化预览摄像头
        await this.initPreviewCamera();

        this.setLoadingProgress(100);
        this.updateLoadingStatus('准备就绪！');

        // 显示开始菜单
        setTimeout(() => {
            document.getElementById('loading-screen').classList.add('hidden');
            document.getElementById('start-menu').classList.remove('hidden');
        }, 500);
    }

    async waitForMediaPipe() {
        return new Promise((resolve) => {
            const check = () => {
                if (typeof Hands !== 'undefined' && typeof Camera !== 'undefined') {
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    async initPreviewCamera() {
        const video = document.getElementById('preview-video');
        const status = document.getElementById('hand-status');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 320, height: 240 }
            });
            video.srcObject = stream;

            // 简易手势检测预览
            const hands = new Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });
            hands.setOptions({ maxNumHands: 2, modelComplexity: 0, minDetectionConfidence: 0.5 });
            hands.onResults((results) => {
                if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                    status.textContent = `✓ 检测到 ${results.multiHandLandmarks.length} 只手`;
                    status.classList.add('detected');
                } else {
                    status.textContent = '等待检测手部...';
                    status.classList.remove('detected');
                }
            });

            const camera = new Camera(video, {
                onFrame: async () => await hands.send({ image: video }),
                width: 320, height: 240
            });
            camera.start();

        } catch (error) {
            console.error('Camera access failed:', error);
            status.textContent = '⚠️ 无法访问摄像头';
        }
    }

    setupMenuButtons() {
        document.getElementById('btn-start')?.addEventListener('click', () => this.startGame());
        document.getElementById('btn-tutorial')?.addEventListener('click', () => this.showTutorial());
        document.getElementById('btn-settings')?.addEventListener('click', () => this.showSettings());
        document.getElementById('btn-save-settings')?.addEventListener('click', () => this.saveSettings());
    }

    setupTutorial() {
        const slides = document.querySelectorAll('.tutorial-slide');
        const dotsContainer = document.querySelector('.tutorial-dots');

        // 创建导航点
        slides.forEach((_, i) => {
            const dot = document.createElement('div');
            dot.className = 'dot' + (i === 0 ? ' active' : '');
            dot.addEventListener('click', () => this.goToTutorialSlide(i));
            dotsContainer?.appendChild(dot);
        });

        document.querySelector('.tutorial-prev')?.addEventListener('click', () => {
            this.goToTutorialSlide(this.tutorialIndex - 1);
        });
        document.querySelector('.tutorial-next')?.addEventListener('click', () => {
            this.goToTutorialSlide(this.tutorialIndex + 1);
        });
    }

    goToTutorialSlide(index) {
        const slides = document.querySelectorAll('.tutorial-slide');
        const dots = document.querySelectorAll('.tutorial-dots .dot');

        this.tutorialIndex = Math.max(0, Math.min(index, slides.length - 1));

        slides.forEach((s, i) => s.classList.toggle('active', i === this.tutorialIndex));
        dots.forEach((d, i) => d.classList.toggle('active', i === this.tutorialIndex));
    }

    setupModals() {
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal')?.classList.add('hidden');
            });
        });
    }

    showTutorial() {
        document.getElementById('tutorial-modal')?.classList.remove('hidden');
        this.goToTutorialSlide(0);
    }

    showSettings() {
        document.getElementById('settings-modal')?.classList.remove('hidden');
    }

    saveSettings() {
        const settings = {
            sfxVolume: document.getElementById('sfx-volume')?.value || 80,
            bgmVolume: document.getElementById('bgm-volume')?.value || 60,
            gestureSensitivity: document.getElementById('gesture-sensitivity')?.value || 5,
            showHandSkeleton: document.getElementById('show-hand-skeleton')?.checked ?? true,
            showCameraFeed: document.getElementById('show-camera-feed')?.checked ?? true
        };

        Utils.storage.save('godhand_settings', settings);
        document.getElementById('settings-modal')?.classList.add('hidden');
    }

    loadSettings() {
        const settings = Utils.storage.load('godhand_settings', {});
        if (settings.sfxVolume) document.getElementById('sfx-volume').value = settings.sfxVolume;
        if (settings.bgmVolume) document.getElementById('bgm-volume').value = settings.bgmVolume;
        if (settings.gestureSensitivity) document.getElementById('gesture-sensitivity').value = settings.gestureSensitivity;
        if (settings.showHandSkeleton !== undefined) document.getElementById('show-hand-skeleton').checked = settings.showHandSkeleton;
        if (settings.showCameraFeed !== undefined) document.getElementById('show-camera-feed').checked = settings.showCameraFeed;
    }

    async startGame() {
        // 隐藏菜单
        document.getElementById('start-menu').classList.add('hidden');
        document.getElementById('game-container').classList.remove('hidden');

        // 初始化游戏世界
        this.gameWorld = new GameWorld();
        await this.gameWorld.init();

        // 开始游戏
        this.gameWorld.start();
    }

    updateLoadingStatus(text) {
        const el = document.getElementById('loading-status');
        if (el) el.textContent = text;
    }

    setLoadingProgress(percent) {
        this.loadingProgress = percent;
        const el = document.querySelector('.loading-progress');
        if (el) el.style.width = percent + '%';
    }
}

// 启动游戏
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init().catch(console.error);
});
