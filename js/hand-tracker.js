/**
 * 神之手 - 手势追踪系统
 * 基于 MediaPipe Hands
 */

class HandTracker {
    constructor(gameMode = 'single') {
        this.gameMode = gameMode; // 'single' or 'coop'
        this.hands = null;
        this.camera = null;
        this.isInitialized = false;
        this.isTracking = false;

        // 单人模式：左右手
        // 双人模式：玩家1左右手 + 玩家2左右手
        this.leftHand = null;
        this.rightHand = null;
        this.player1 = { leftHand: null, rightHand: null };
        this.player2 = { leftHand: null, rightHand: null };

        this.handsData = [];
        this.gestures = { left: null, right: null };
        this.history = { left: [], right: [], p1left: [], p1right: [], p2left: [], p2right: [] };
        this.historyMaxLength = 10;

        this.config = {
            minConfidence: 0.7,
            pinchThreshold: 0.12,  // 放宽捏合检测阈值 (原0.08)
            gestureCooldown: 300
        };

        this.lastGestureTime = { left: 0, right: 0, both: 0, p1left: 0, p1right: 0, p2left: 0, p2right: 0 };
        this.callbacks = {};
        this.pinchState = {
            left: { active: false, startPos: null },
            right: { active: false, startPos: null },
            p1left: { active: false, startPos: null },
            p1right: { active: false, startPos: null },
            p2left: { active: false, startPos: null },
            p2right: { active: false, startPos: null }
        };

        // 玩家颜色方案
        this.colors = {
            p1left: '#00d4ff',   // 玩家1左手：青色
            p1right: '#ff6b35',  // 玩家1右手：橙色
            p2left: '#00ff88',   // 玩家2左手：绿色
            p2right: '#ff3366'   // 玩家2右手：粉红色
        };
    }

    async initialize(videoElement, canvasElement) {
        this.videoElement = videoElement;
        this.canvasElement = canvasElement;
        this.canvasCtx = canvasElement.getContext('2d');

        try {
            this.hands = new Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });

            const maxHands = this.gameMode === 'coop' ? 4 : 2;
            this.hands.setOptions({
                maxNumHands: maxHands,
                modelComplexity: 1,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.5
            });
            this.hands.onResults((results) => this.onResults(results));
            this.isInitialized = true;
            console.log(`[HandTracker] Initialized in ${this.gameMode} mode, max hands: ${maxHands}`);
            return true;
        } catch (error) {
            console.error('HandTracker init failed:', error);
            return false;
        }
    }

    async startTracking() {
        if (!this.isInitialized) return false;
        try {
            // 获取用户选择的摄像头
            const settings = Utils.storage.load('godhand_settings', { cameraId: 'user' });
            const cameraId = settings.cameraId || 'user';

            // 构建视频约束
            let videoConstraints = { width: 1280, height: 720 };
            if (cameraId === 'user' || cameraId === 'environment') {
                videoConstraints.facingMode = cameraId;
            } else {
                videoConstraints.deviceId = { exact: cameraId };
            }

            // 先获取媒体流
            const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
            this.videoElement.srcObject = stream;

            this.camera = new Camera(this.videoElement, {
                onFrame: async () => {
                    if (this.hands && this.isTracking) {
                        await this.hands.send({ image: this.videoElement });
                    }
                },
                width: 1280, height: 720
            });
            await this.camera.start();
            this.isTracking = true;
            console.log('[Camera] Started with:', cameraId);
            return true;
        } catch (error) {
            console.error('Camera start failed:', error);
            return false;
        }
    }

    stopTracking() {
        if (this.camera) this.camera.stop();
        this.isTracking = false;
        this.handsData = [];
    }

    onResults(results) {
        this.canvasElement.width = this.videoElement.videoWidth;
        this.canvasElement.height = this.videoElement.videoHeight;
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

        const hadHands = this.handsData.length > 0;
        this.handsData = [];

        // 重置手部数据
        if (this.gameMode === 'single') {
            this.leftHand = null;
            this.rightHand = null;
        } else {
            this.player1.leftHand = null;
            this.player1.rightHand = null;
            this.player2.leftHand = null;
            this.player2.rightHand = null;
        }

        if (results.multiHandLandmarks && results.multiHandedness) {
            for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                const landmarks = results.multiHandLandmarks[i];
                const handedness = results.multiHandedness[i];
                const screenLandmarks = this.convertToScreenCoords(landmarks);

                // 计算手掌中心用于玩家识别
                const palmCenter = this.getPalmCenter(screenLandmarks);
                const normalizedX = landmarks[9].x; // 使用手掌根部的归一化X坐标

                const handData = {
                    landmarks: screenLandmarks,
                    normalizedLandmarks: landmarks,
                    handedness: handedness.label,
                    palmCenter
                };

                if (this.gameMode === 'coop') {
                    // 双人模式：根据X坐标区分玩家
                    const playerId = normalizedX < 0.5 ? 1 : 2;
                    handData.playerId = playerId;

                    // MediaPipe的handedness是镜像的
                    const isLeft = handedness.label === 'Left';
                    const actualHand = isLeft ? 'right' : 'left'; // 镜像转换
                    handData.actualHand = actualHand;

                    // 分配到对应玩家
                    if (playerId === 1) {
                        if (actualHand === 'left') {
                            this.player1.leftHand = handData;
                            this.updateHistory('p1left', screenLandmarks);
                            handData.handKey = 'p1left';
                        } else {
                            this.player1.rightHand = handData;
                            this.updateHistory('p1right', screenLandmarks);
                            handData.handKey = 'p1right';
                        }
                    } else {
                        if (actualHand === 'left') {
                            this.player2.leftHand = handData;
                            this.updateHistory('p2left', screenLandmarks);
                            handData.handKey = 'p2left';
                        } else {
                            this.player2.rightHand = handData;
                            this.updateHistory('p2right', screenLandmarks);
                            handData.handKey = 'p2right';
                        }
                    }
                } else {
                    // 单人模式：兼容原逻辑
                    if (handedness.label === 'Left') {
                        this.rightHand = handData;
                        this.updateHistory('right', screenLandmarks);
                        handData.handKey = 'right';
                    } else {
                        this.leftHand = handData;
                        this.updateHistory('left', screenLandmarks);
                        handData.handKey = 'left';
                    }
                }

                this.handsData.push(handData);
                this.drawHand(landmarks, handData);
            }

            this.detectGestures();
            if (!hadHands) this.callbacks.onHandsDetected?.();
        } else if (hadHands) {
            this.callbacks.onHandsLost?.();
        }
    }

    convertToScreenCoords(landmarks) {
        // 镜像X坐标，使手部追踪与摄像头画面一致
        // 使用 window 尺寸确保映射到整个屏幕
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        return landmarks.map(lm => ({
            x: (1 - lm.x) * screenWidth,
            y: lm.y * screenHeight,
            z: lm.z,
            nx: 1 - lm.x,
            ny: lm.y
        }));
    }

    updateHistory(hand, landmarks) {
        const palm = this.getPalmCenter(landmarks);
        this.history[hand].push({ position: palm, timestamp: Date.now() });
        if (this.history[hand].length > this.historyMaxLength) this.history[hand].shift();
    }

    getPalmCenter(landmarks) {
        return { x: (landmarks[0].x + landmarks[9].x) / 2, y: (landmarks[0].y + landmarks[9].y) / 2 };
    }

    getHandVelocity(hand) {
        const h = this.history[hand];
        if (h.length < 2) return { x: 0, y: 0, speed: 0 };
        const recent = h[h.length - 1], previous = h[h.length - 2];
        const dt = (recent.timestamp - previous.timestamp) / 1000;
        if (dt === 0) return { x: 0, y: 0, speed: 0 };
        const vx = (recent.position.x - previous.position.x) / dt;
        const vy = (recent.position.y - previous.position.y) / dt;
        return { x: vx, y: vy, speed: Math.sqrt(vx * vx + vy * vy) };
    }

    detectGestures() {
        if (this.gameMode === 'single') {
            // 单人模式：原有逻辑
            if (this.leftHand) {
                this.gestures.left = this.analyzeHandGesture(this.leftHand, 'left');
            } else {
                this.gestures.left = null;
                if (this.pinchState.left.active) this.endPinch('left');
            }
            if (this.rightHand) {
                this.gestures.right = this.analyzeHandGesture(this.rightHand, 'right');
            } else {
                this.gestures.right = null;
                if (this.pinchState.right.active) this.endPinch('right');
            }
            if (this.leftHand && this.rightHand) this.detectClap();
        } else {
            // 双人模式：检测4只手
            if (this.player1.leftHand) {
                this.analyzeHandGesture(this.player1.leftHand, 'p1left');
            } else if (this.pinchState.p1left.active) {
                this.endPinch('p1left');
            }

            if (this.player1.rightHand) {
                this.analyzeHandGesture(this.player1.rightHand, 'p1right');
            } else if (this.pinchState.p1right.active) {
                this.endPinch('p1right');
            }

            if (this.player2.leftHand) {
                this.analyzeHandGesture(this.player2.leftHand, 'p2left');
            } else if (this.pinchState.p2left.active) {
                this.endPinch('p2left');
            }

            if (this.player2.rightHand) {
                this.analyzeHandGesture(this.player2.rightHand, 'p2right');
            } else if (this.pinchState.p2right.active) {
                this.endPinch('p2right');
            }

            // 检测每个玩家的双手合十
            if (this.player1.leftHand && this.player1.rightHand) {
                this.detectClap(this.player1.leftHand, this.player1.rightHand, 1);
            }
            if (this.player2.leftHand && this.player2.rightHand) {
                this.detectClap(this.player2.leftHand, this.player2.rightHand, 2);
            }
        }
    }

    analyzeHandGesture(handData, handLabel) {
        const landmarks = handData.normalizedLandmarks;
        const screenLandmarks = handData.landmarks;
        const isPinching = this.isPinching(landmarks);
        const isFist = this.isFist(landmarks);
        const isOpen = this.isOpenPalm(landmarks);
        const velocity = this.getHandVelocity(handLabel);
        const now = Date.now();
        const canTrigger = now - this.lastGestureTime[handLabel] > this.config.gestureCooldown;

        if (isPinching) {
            const pinchPos = { x: (screenLandmarks[4].x + screenLandmarks[8].x) / 2, y: (screenLandmarks[4].y + screenLandmarks[8].y) / 2 };
            if (!this.pinchState[handLabel].active) this.startPinch(handLabel, pinchPos);
            else this.updatePinch(handLabel, pinchPos);
        } else if (this.pinchState[handLabel].active) {
            this.endPinch(handLabel);
        }

        // 手势检测 - 降低阈值提高灵敏度
        if (canTrigger && velocity.speed > 100) {
            // 握拳锤击 - 优先检测（挖矿/砸石头）
            if (isFist && velocity.speed > 150) {
                this.triggerGesture('punch', handLabel, screenLandmarks);
            }
            // 手刀劈砍 - 检测手掌打开但手指并拢（砍树）
            else if (!isFist && !isPinching && velocity.speed > 120) {
                this.triggerGesture('chop', handLabel, screenLandmarks);
            }
            // 拍击 - 张开手掌横扫
            else if (isOpen && velocity.speed > 150) {
                this.triggerGesture('slap', handLabel, screenLandmarks);
            }
        }
        return { type: isPinching ? 'pinch' : (isFist ? 'fist' : (isOpen ? 'open' : 'unknown')), velocity, palmCenter: this.getPalmCenter(screenLandmarks) };
    }

    isOpenPalm(lm) { return this.getExtendedFingers(lm).filter(Boolean).length >= 4; }
    isFist(lm) { return this.getExtendedFingers(lm).filter(Boolean).length <= 1; }

    // 捏合检测：拇指和食指或中指靠近都算捏合
    isPinching(lm) {
        const thumbToIndex = Utils.distance(lm[4].x, lm[4].y, lm[8].x, lm[8].y);
        const thumbToMiddle = Utils.distance(lm[4].x, lm[4].y, lm[12].x, lm[12].y);
        return thumbToIndex < this.config.pinchThreshold || thumbToMiddle < this.config.pinchThreshold * 1.2;
    }

    getExtendedFingers(lm) {
        return [4, 8, 12, 16, 20].map((tipIdx, i) => {
            if (i === 0) return Utils.distance(lm[4].x, lm[4].y, lm[2].x, lm[2].y) > 0.05; // 降低拇指阈值
            return lm[tipIdx].y < lm[[3, 6, 10, 14, 18][i]].y;
        });
    }

    detectClap(leftHandData, rightHandData, playerId) {
        // 兼容单人模式调用
        const lh = leftHandData || this.leftHand;
        const rh = rightHandData || this.rightHand;

        if (!lh || !rh) return;

        const lp = this.getPalmCenter(lh.landmarks);
        const rp = this.getPalmCenter(rh.landmarks);
        const dist = Utils.distance(lp.x / this.canvasElement.width, lp.y / this.canvasElement.height, rp.x / this.canvasElement.width, rp.y / this.canvasElement.height);

        const handKey = playerId ? `p${playerId}both` : 'both';
        const cooldownTime = this.lastGestureTime[handKey] || 0;

        if (dist < 0.15 && Date.now() - cooldownTime > 900) {
            if (this.isOpenPalm(lh.normalizedLandmarks) && this.isOpenPalm(rh.normalizedLandmarks)) {
                const gestureData = { left: lh.landmarks, right: rh.landmarks };
                if (playerId) {
                    gestureData.playerId = playerId;
                }
                this.triggerGesture('clap', handKey, gestureData);
            }
        }
    }

    triggerGesture(type, hand, data) {
        this.lastGestureTime[hand] = Date.now();
        const gestureEvent = {
            type,
            hand,
            data,
            timestamp: Date.now()
        };

        // 从handKey提取playerId（如p1left -> playerId: 1）
        if (hand.startsWith('p') && hand.length > 1) {
            const playerNum = parseInt(hand[1]);
            if (!isNaN(playerNum)) {
                gestureEvent.playerId = playerNum;
            }
        }

        this.callbacks.onGesture?.(gestureEvent);
    }

    startPinch(hand, pos) { this.pinchState[hand] = { active: true, startPos: { ...pos } }; this.callbacks.onPinchStart?.(hand, pos); }
    updatePinch(hand, pos) { this.callbacks.onPinchMove?.(hand, pos, this.pinchState[hand].startPos); }
    endPinch(hand) { if (this.pinchState[hand].active) this.callbacks.onPinchEnd?.(hand, this.pinchState[hand].startPos); this.pinchState[hand] = { active: false, startPos: null }; }

    drawHand(landmarks, handData) {
        const conn = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [0, 9], [9, 10], [10, 11], [11, 12], [0, 13], [13, 14], [14, 15], [15, 16], [0, 17], [17, 18], [18, 19], [19, 20], [5, 9], [9, 13], [13, 17]];
        const ctx = this.canvasCtx;

        // 确定颜色
        let color;
        if (this.gameMode === 'coop' && handData.handKey) {
            color = this.colors[handData.handKey] || '#ffffff';
        } else {
            // 单人模式兼容
            color = handData.handedness === 'Left' ? '#00d4ff' : '#ff6b35';
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        // 不做代码镜像，因为hand-canvas有CSS scaleX(-1)
        conn.forEach(([i, j]) => { ctx.beginPath(); ctx.moveTo(landmarks[i].x * this.canvasElement.width, landmarks[i].y * this.canvasElement.height); ctx.lineTo(landmarks[j].x * this.canvasElement.width, landmarks[j].y * this.canvasElement.height); ctx.stroke(); });
        landmarks.forEach((lm, idx) => { ctx.beginPath(); ctx.arc(lm.x * this.canvasElement.width, lm.y * this.canvasElement.height, idx === 0 ? 8 : 5, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); });
    }

    on(event, callback) { this.callbacks[event] = callback; }

    getPinchPosition(landmarks) {
        // 拇指尖(4)和食指尖(8)的中点
        return {
            x: (landmarks[4].x + landmarks[8].x) / 2,
            y: (landmarks[4].y + landmarks[8].y) / 2
        };
    }

    getGestureState() {
        return {
            leftHand: this.leftHand ? {
                gesture: this.gestures.left,
                palmCenter: this.getPalmCenter(this.leftHand.landmarks),
                pinchPosition: this.getPinchPosition(this.leftHand.landmarks),
                isPinching: this.pinchState.left.active
            } : null,
            rightHand: this.rightHand ? {
                gesture: this.gestures.right,
                palmCenter: this.getPalmCenter(this.rightHand.landmarks),
                pinchPosition: this.getPinchPosition(this.rightHand.landmarks),
                isPinching: this.pinchState.right.active
            } : null,
            handsCount: this.handsData.length
        };
    }
}

window.HandTracker = HandTracker;

