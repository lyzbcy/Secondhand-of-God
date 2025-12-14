/**
 * 神之手 - 交互式教学系统
 * 引导玩家逐步学习5种核心手势
 */

class TutorialSystem {
    constructor() {
        this.currentPhase = 0;
        this.isActive = false;
        this.practiceMode = false;
        this.gestureDetected = false;
        this.successCount = 0;
        this.requiredSuccesses = 3; // 每个手势需要成功3次

        this.phases = [
            {
                id: 'chop',
                name: '手刀劈砍',
                icon: '🖐️➡️✊',
                description: '竖起手掌，快速向下挥动',
                tip: '用于砍伐树木获取木材',
                gesture: 'chop',
                targetEmoji: '🌲'
            },
            {
                id: 'punch',
                name: '握拳锤击',
                icon: '✊💥',
                description: '握紧拳头，向前冲击',
                tip: '用于粉碎岩石获取矿石',
                gesture: 'punch',
                targetEmoji: '🪨'
            },
            {
                id: 'pinch',
                name: '捏合拖拽',
                icon: '🤏📦',
                description: '拇指食指捏合，拖拽塔牌',
                tip: '用于建造防御塔',
                gesture: 'pinch',
                targetEmoji: '🏹'
            },
            {
                id: 'slap',
                name: '拍击扫荡',
                icon: '🖐️👋',
                description: '张开手掌横向拍击',
                tip: '用于攻击敌人',
                gesture: 'slap',
                targetEmoji: '👺'
            },
            {
                id: 'ultimate',
                name: '双手合十',
                icon: '🙏✨',
                description: '能量充满时双手合十',
                tip: '释放毁灭性终极技能',
                gesture: 'ultimate',
                targetEmoji: '⚡'
            }
        ];

        this.callbacks = {};
    }

    init() {
        this.createTutorialUI();
        this.setupEventListeners();
    }

    createTutorialUI() {
        // 创建教学关卡容器
        const container = document.createElement('div');
        container.id = 'tutorial-level';
        container.className = 'hidden';
        container.innerHTML = `
            <div class="tutorial-overlay"></div>
            <div class="tutorial-stage">
                <div class="tutorial-header">
                    <h2>🎓 教学关卡</h2>
                    <div class="tutorial-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" id="tutorial-progress-fill"></div>
                        </div>
                        <span id="tutorial-phase-text">阶段 1/5</span>
                    </div>
                    <button class="tutorial-close-btn" id="btn-exit-tutorial">✕</button>
                </div>
                
                <div class="tutorial-content">
                    <div class="tutorial-gesture-display">
                        <div class="gesture-icon-large" id="tutorial-gesture-icon">🖐️➡️✊</div>
                        <h3 id="tutorial-gesture-name">手刀劈砍</h3>
                        <p id="tutorial-gesture-desc">竖起手掌，快速向下挥动</p>
                        <p class="tutorial-tip" id="tutorial-gesture-tip">💡 用于砍伐树木获取木材</p>
                    </div>
                    
                    <div class="tutorial-practice-area">
                        <div class="practice-target" id="tutorial-target">
                            <span class="target-emoji">🌲</span>
                            <div class="target-ring"></div>
                        </div>
                        <div class="practice-feedback" id="tutorial-feedback">
                            <span>等待手势...</span>
                        </div>
                        <div class="practice-counter">
                            <span id="tutorial-success-count">0</span> / <span id="tutorial-required-count">3</span>
                        </div>
                        <div class="camera-notice" id="camera-notice">
                            📷 没有摄像头？点击"跳过此阶段"继续
                        </div>
                    </div>
                </div>
                
                <div class="tutorial-footer">
                    <button class="menu-btn" id="btn-skip-phase">跳过此阶段</button>
                    <button class="menu-btn primary" id="btn-next-phase" disabled>下一阶段 ➡️</button>
                </div>
            </div>
        `;

        document.body.appendChild(container);
    }

    setupEventListeners() {
        document.getElementById('btn-exit-tutorial')?.addEventListener('click', () => this.exit());
        document.getElementById('btn-skip-phase')?.addEventListener('click', () => this.skipPhase());
        document.getElementById('btn-next-phase')?.addEventListener('click', () => this.nextPhase());
    }

    start() {
        this.isActive = true;
        this.currentPhase = 0;
        this.successCount = 0;

        document.getElementById('tutorial-level')?.classList.remove('hidden');
        document.getElementById('start-menu')?.classList.add('hidden');

        this.updatePhaseDisplay();
        this.startPractice();

        console.log('[Tutorial] Started');
    }

    updatePhaseDisplay() {
        const phase = this.phases[this.currentPhase];
        if (!phase) return;

        document.getElementById('tutorial-gesture-icon').textContent = phase.icon;
        document.getElementById('tutorial-gesture-name').textContent = phase.name;
        document.getElementById('tutorial-gesture-desc').textContent = phase.description;
        document.getElementById('tutorial-gesture-tip').textContent = '💡 ' + phase.tip;
        document.getElementById('tutorial-target').querySelector('.target-emoji').textContent = phase.targetEmoji;
        document.getElementById('tutorial-phase-text').textContent = `阶段 ${this.currentPhase + 1}/${this.phases.length}`;

        const progress = ((this.currentPhase) / this.phases.length) * 100;
        document.getElementById('tutorial-progress-fill').style.width = progress + '%';

        document.getElementById('tutorial-success-count').textContent = '0';
        document.getElementById('tutorial-required-count').textContent = this.requiredSuccesses;
        document.getElementById('btn-next-phase').disabled = true;

        this.updateFeedback('等待手势...', 'waiting');
    }

    startPractice() {
        this.practiceMode = true;
        this.successCount = 0;

        // 添加目标动画
        const target = document.getElementById('tutorial-target');
        target?.classList.add('active');
    }

    // 被外部手势检测调用
    onGestureDetected(gestureType) {
        if (!this.isActive || !this.practiceMode) return;

        const phase = this.phases[this.currentPhase];
        if (!phase) return;

        if (gestureType === phase.gesture) {
            this.onSuccess();
        } else if (gestureType) {
            this.onWrongGesture(gestureType);
        }
    }

    onSuccess() {
        this.successCount++;
        document.getElementById('tutorial-success-count').textContent = this.successCount;

        // 成功动画
        const target = document.getElementById('tutorial-target');
        target?.classList.add('hit');
        setTimeout(() => target?.classList.remove('hit'), 300);

        this.updateFeedback('✓ 正确！', 'success');

        if (this.successCount >= this.requiredSuccesses) {
            this.completePhase();
        }
    }

    onWrongGesture(detected) {
        const phase = this.phases[this.currentPhase];
        this.updateFeedback(`✗ 检测到: ${this.getGestureName(detected)}，请尝试: ${phase.name}`, 'error');

        // 错误动画
        const target = document.getElementById('tutorial-target');
        target?.classList.add('shake');
        setTimeout(() => target?.classList.remove('shake'), 300);
    }

    getGestureName(gesture) {
        const names = {
            chop: '手刀',
            punch: '握拳',
            pinch: '捏合',
            slap: '拍击',
            ultimate: '合十'
        };
        return names[gesture] || gesture;
    }

    updateFeedback(text, type = 'info') {
        const feedback = document.getElementById('tutorial-feedback');
        if (feedback) {
            feedback.innerHTML = `<span class="${type}">${text}</span>`;
        }
    }

    completePhase() {
        this.practiceMode = false;
        this.updateFeedback('🎉 太棒了！阶段完成！', 'success');
        document.getElementById('btn-next-phase').disabled = false;

        const target = document.getElementById('tutorial-target');
        target?.classList.remove('active');
        target?.classList.add('complete');

        // 更新进度
        const progress = ((this.currentPhase + 1) / this.phases.length) * 100;
        document.getElementById('tutorial-progress-fill').style.width = progress + '%';
    }

    skipPhase() {
        this.completePhase();
    }

    nextPhase() {
        this.currentPhase++;
        const target = document.getElementById('tutorial-target');
        target?.classList.remove('complete');

        if (this.currentPhase >= this.phases.length) {
            this.complete();
        } else {
            this.successCount = 0;
            this.updatePhaseDisplay();
            this.startPractice();
        }
    }

    complete() {
        this.isActive = false;
        this.practiceMode = false;

        // 显示完成界面
        const stage = document.querySelector('.tutorial-stage');
        if (stage) {
            stage.innerHTML = `
                <div class="tutorial-complete">
                    <div class="complete-icon">🏆</div>
                    <h2>教学完成！</h2>
                    <p>你已经掌握了所有基础手势</p>
                    <div class="complete-summary">
                        <div class="summary-item">🖐️ 手刀劈砍 - 砍树</div>
                        <div class="summary-item">✊ 握拳锤击 - 挖矿</div>
                        <div class="summary-item">🤏 捏合拖拽 - 建塔</div>
                        <div class="summary-item">👋 拍击扫荡 - 攻击</div>
                        <div class="summary-item">🙏 双手合十 - 大招</div>
                    </div>
                    <button class="menu-btn primary" id="btn-tutorial-finish">开始游戏 ⚔️</button>
                </div>
            `;

            document.getElementById('btn-tutorial-finish')?.addEventListener('click', () => {
                this.exit();
                // 触发开始游戏
                this.emit('complete');
            });
        }

        // 保存教学完成状态
        localStorage.setItem('godhand_tutorial_completed', 'true');
        console.log('[Tutorial] Completed');
    }

    exit() {
        this.isActive = false;
        this.practiceMode = false;
        document.getElementById('tutorial-level')?.classList.add('hidden');
        document.getElementById('start-menu')?.classList.remove('hidden');

        this.emit('exit');
    }

    // 事件系统
    on(event, callback) {
        if (!this.callbacks[event]) this.callbacks[event] = [];
        this.callbacks[event].push(callback);
    }

    emit(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(cb => cb(data));
        }
    }

    // 检查是否需要显示教学提示
    shouldShowTutorialPrompt() {
        return !localStorage.getItem('godhand_tutorial_completed');
    }
}

window.TutorialSystem = TutorialSystem;
