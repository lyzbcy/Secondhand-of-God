/**
 * 神之手 - 面部追踪系统 (头部转向版)
 * 通过头部左右转向控制地图导航
 */

class FaceTracker {
    constructor() {
        this.faceMesh = null;
        this.video = null;
        this.isInitialized = false;
        this.isTracking = false;

        // 头部转向状态
        this.headPose = {
            yaw: 0,    // 左右转向 (负=左, 正=右)
            pitch: 0,  // 上下点头
            roll: 0    // 歪头
        };

        // 转向阈值和持续时间
        this.turnThreshold = 15; // 度数阈值
        this.holdTime = 0;
        this.holdDuration = 400; // 持续400ms触发
        this.lastDirection = 'center';
        this.cooldown = 0;
        this.cooldownDuration = 1000; // 触发后1秒冷却

        this.callbacks = {};

        // 面部关键点索引
        this.landmarks = {
            noseTip: 1,
            leftEye: 33,
            rightEye: 263,
            leftCheek: 234,
            rightCheek: 454,
            chin: 152,
            forehead: 10
        };
    }

    async initialize(videoElement) {
        this.video = videoElement || document.getElementById('camera-video');

        if (typeof FaceMesh === 'undefined') {
            console.log('[FaceTracker] Loading FaceMesh library...');
            await this.loadFaceMesh();
        }

        try {
            this.faceMesh = new FaceMesh({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
            });

            this.faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: false, // 不需要精细landmark
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            this.faceMesh.onResults((results) => this.onResults(results));

            this.isInitialized = true;
            console.log('[FaceTracker] Initialized - Head turn detection ready');

        } catch (error) {
            console.error('[FaceTracker] Initialization failed:', error);
            this.isInitialized = false;
        }
    }

    async loadFaceMesh() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
            script.crossOrigin = 'anonymous';
            script.onload = () => {
                console.log('[FaceTracker] FaceMesh library loaded');
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async startTracking() {
        if (!this.isInitialized || !this.video) {
            console.warn('[FaceTracker] Not initialized');
            return;
        }

        this.isTracking = true;
        this.trackFrame();
        console.log('[FaceTracker] Head tracking started');
    }

    async trackFrame() {
        if (!this.isTracking) return;

        try {
            await this.faceMesh.send({ image: this.video });
        } catch (e) {
            // 忽略帧错误
        }

        requestAnimationFrame(() => this.trackFrame());
    }

    stopTracking() {
        this.isTracking = false;
        console.log('[FaceTracker] Head tracking stopped');
    }

    onResults(results) {
        const now = Date.now();

        // 冷却期间不处理
        if (this.cooldown > now) {
            return;
        }

        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            this.emit('faceDetected', false);
            this.resetHold();
            return;
        }

        this.emit('faceDetected', true);

        const landmarks = results.multiFaceLandmarks[0];
        this.calculateHeadPose(landmarks);
        this.detectTurn();
    }

    calculateHeadPose(landmarks) {
        // 获取关键点
        const nose = landmarks[this.landmarks.noseTip];
        const leftEye = landmarks[this.landmarks.leftEye];
        const rightEye = landmarks[this.landmarks.rightEye];
        const leftCheek = landmarks[this.landmarks.leftCheek];
        const rightCheek = landmarks[this.landmarks.rightCheek];

        // 计算眼睛中心
        const eyeCenter = {
            x: (leftEye.x + rightEye.x) / 2,
            y: (leftEye.y + rightEye.y) / 2
        };

        // 计算 Yaw (左右转向)
        // 原理：鼻子相对于脸颊中心的偏移
        const faceCenter = (leftCheek.x + rightCheek.x) / 2;
        const faceWidth = Math.abs(rightCheek.x - leftCheek.x);

        // 鼻子偏离脸部中心的比例
        const noseOffset = (nose.x - faceCenter) / faceWidth;

        // 转换为大致度数 (经验公式)
        this.headPose.yaw = noseOffset * 90;

        // 发送实时状态
        this.emit('headPose', {
            yaw: this.headPose.yaw,
            direction: this.getDirection(),
            progress: Math.min(1, this.holdTime / this.holdDuration)
        });
    }

    getDirection() {
        // 注意：摄像头是镜像的，所以方向要反转
        // yaw > 0 表示头部在画面中向右，实际是向左转
        if (this.headPose.yaw > this.turnThreshold) {
            return 'left';  // 画面右 = 实际左
        } else if (this.headPose.yaw < -this.turnThreshold) {
            return 'right'; // 画面左 = 实际右
        }
        return 'center';
    }

    detectTurn() {
        const direction = this.getDirection();

        if (direction !== 'center' && direction === this.lastDirection) {
            this.holdTime += 16; // 约60fps

            if (this.holdTime >= this.holdDuration) {
                // 触发转向
                this.emit('headTurn', direction);
                console.log(`[FaceTracker] Head turn: ${direction}`);

                // 进入冷却
                this.cooldown = Date.now() + this.cooldownDuration;
                this.resetHold();
            }
        } else {
            this.lastDirection = direction;
            if (direction === 'center') {
                this.holdTime = Math.max(0, this.holdTime - 32); // 快速衰减
            } else {
                this.holdTime = 0;
            }
        }
    }

    resetHold() {
        this.holdTime = 0;
        this.lastDirection = 'center';
    }

    // 获取当前头部状态
    getHeadPose() {
        return { ...this.headPose };
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
}

window.FaceTracker = FaceTracker;
