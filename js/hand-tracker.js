/**
 * 神之手 - 手势追踪系统
 * 基于 MediaPipe Hands
 */

class HandTracker {
    constructor() {
        this.hands = null;
        this.camera = null;
        this.isInitialized = false;
        this.isTracking = false;

        this.leftHand = null;
        this.rightHand = null;
        this.handsData = [];
        this.gestures = { left: null, right: null };
        this.history = { left: [], right: [] };
        this.historyMaxLength = 10;

        this.config = {
            minConfidence: 0.7,
            pinchThreshold: 0.08,
            gestureCooldown: 300
        };

        this.lastGestureTime = { left: 0, right: 0, both: 0 };
        this.callbacks = {};
        this.pinchState = {
            left: { active: false, startPos: null },
            right: { active: false, startPos: null }
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
            this.hands.setOptions({
                maxNumHands: 2, modelComplexity: 1,
                minDetectionConfidence: 0.7, minTrackingConfidence: 0.5
            });
            this.hands.onResults((results) => this.onResults(results));
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('HandTracker init failed:', error);
            return false;
        }
    }

    async startTracking() {
        if (!this.isInitialized) return false;
        try {
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
        this.leftHand = null;
        this.rightHand = null;

        if (results.multiHandLandmarks && results.multiHandedness) {
            for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                const landmarks = results.multiHandLandmarks[i];
                const handedness = results.multiHandedness[i];
                const screenLandmarks = this.convertToScreenCoords(landmarks);
                const handData = { landmarks: screenLandmarks, normalizedLandmarks: landmarks, handedness: handedness.label };
                this.handsData.push(handData);

                if (handedness.label === 'Left') {
                    this.rightHand = handData;
                    this.updateHistory('right', screenLandmarks);
                } else {
                    this.leftHand = handData;
                    this.updateHistory('left', screenLandmarks);
                }
                this.drawHand(landmarks, handedness.label);
            }
            this.detectGestures();
            if (!hadHands) this.callbacks.onHandsDetected?.();
        } else if (hadHands) {
            this.callbacks.onHandsLost?.();
        }
    }

    convertToScreenCoords(landmarks) {
        // 镜像X坐标，使手部追踪与摄像头画面一致
        return landmarks.map(lm => ({
            x: (1 - lm.x) * this.canvasElement.width, y: lm.y * this.canvasElement.height,
            z: lm.z, nx: 1 - lm.x, ny: lm.y
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

        // 大幅降低阈值，提升灵敏度
        if (canTrigger && velocity.speed > 150) {
            // 砍树：任何快速移动都算（不限制方向）
            if (velocity.speed > 200) this.triggerGesture('chop', handLabel, screenLandmarks);
            // 握拳锤击
            else if (isFist && velocity.speed > 250) this.triggerGesture('punch', handLabel, screenLandmarks);
            // 拍击
            else if (isOpen && velocity.speed > 200) this.triggerGesture('slap', handLabel, screenLandmarks);
        }
        return { type: isPinching ? 'pinch' : (isFist ? 'fist' : (isOpen ? 'open' : 'unknown')), velocity, palmCenter: this.getPalmCenter(screenLandmarks) };
    }

    isOpenPalm(lm) { return this.getExtendedFingers(lm).filter(Boolean).length >= 4; }
    isFist(lm) { return this.getExtendedFingers(lm).filter(Boolean).length <= 1; }
    isPinching(lm) { return Utils.distance(lm[4].x, lm[4].y, lm[8].x, lm[8].y) < this.config.pinchThreshold; }

    getExtendedFingers(lm) {
        return [4, 8, 12, 16, 20].map((tipIdx, i) => {
            if (i === 0) return Utils.distance(lm[4].x, lm[4].y, lm[2].x, lm[2].y) > 0.06;
            return lm[tipIdx].y < lm[[3, 6, 10, 14, 18][i]].y;
        });
    }

    detectClap() {
        const lp = this.getPalmCenter(this.leftHand.landmarks);
        const rp = this.getPalmCenter(this.rightHand.landmarks);
        const dist = Utils.distance(lp.x / this.canvasElement.width, lp.y / this.canvasElement.height, rp.x / this.canvasElement.width, rp.y / this.canvasElement.height);
        if (dist < 0.15 && Date.now() - this.lastGestureTime.both > 900) {
            if (this.isOpenPalm(this.leftHand.normalizedLandmarks) && this.isOpenPalm(this.rightHand.normalizedLandmarks)) {
                this.triggerGesture('clap', 'both', { left: this.leftHand.landmarks, right: this.rightHand.landmarks });
            }
        }
    }

    triggerGesture(type, hand, data) {
        this.lastGestureTime[hand] = Date.now();
        this.callbacks.onGesture?.({ type, hand, data, timestamp: Date.now() });
    }

    startPinch(hand, pos) { this.pinchState[hand] = { active: true, startPos: { ...pos } }; this.callbacks.onPinchStart?.(hand, pos); }
    updatePinch(hand, pos) { this.callbacks.onPinchMove?.(hand, pos, this.pinchState[hand].startPos); }
    endPinch(hand) { if (this.pinchState[hand].active) this.callbacks.onPinchEnd?.(hand, this.pinchState[hand].startPos); this.pinchState[hand] = { active: false, startPos: null }; }

    drawHand(landmarks, handedness) {
        const conn = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [0, 9], [9, 10], [10, 11], [11, 12], [0, 13], [13, 14], [14, 15], [15, 16], [0, 17], [17, 18], [18, 19], [19, 20], [5, 9], [9, 13], [13, 17]];
        const ctx = this.canvasCtx, color = handedness === 'Left' ? '#00d4ff' : '#ff6b35';
        ctx.strokeStyle = color; ctx.lineWidth = 3;
        // 不做代码镜像，因为hand-canvas有CSS scaleX(-1)
        conn.forEach(([i, j]) => { ctx.beginPath(); ctx.moveTo(landmarks[i].x * this.canvasElement.width, landmarks[i].y * this.canvasElement.height); ctx.lineTo(landmarks[j].x * this.canvasElement.width, landmarks[j].y * this.canvasElement.height); ctx.stroke(); });
        landmarks.forEach((lm, idx) => { ctx.beginPath(); ctx.arc(lm.x * this.canvasElement.width, lm.y * this.canvasElement.height, idx === 0 ? 8 : 5, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); });
    }

    on(event, callback) { this.callbacks[event] = callback; }
    getGestureState() {
        return {
            leftHand: this.leftHand ? { gesture: this.gestures.left, palmCenter: this.getPalmCenter(this.leftHand.landmarks), isPinching: this.pinchState.left.active } : null,
            rightHand: this.rightHand ? { gesture: this.gestures.right, palmCenter: this.getPalmCenter(this.rightHand.landmarks), isPinching: this.pinchState.right.active } : null,
            handsCount: this.handsData.length
        };
    }
}

window.HandTracker = HandTracker;
