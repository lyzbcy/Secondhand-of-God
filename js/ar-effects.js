/**
 * 神之手 - AR增强效果系统
 * 帽子特效和美颜滤镜
 */

class AREffectsSystem {
    constructor(gameWorld) {
        this.game = gameWorld;
        this.enabled = true;

        // 当前激活的效果
        this.activeEffects = {
            hatType: null,      // 'crown', 'halo', null
            beautyFilter: false
        };

        // 预加载帽子图片资源
        this.hatImages = {
            crown: this.createEmojiImage('👑', 60),
            halo: this.createEmojiImage('😇', 50)
        };

        // 面部追踪数据
        this.faceData = null;
    }

    createEmojiImage(emoji, size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.font = `${size * 0.8}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, size / 2, size / 2);
        return canvas;
    }

    enableEffect(effect) {
        if (effect.hatType) {
            this.activeEffects.hatType = effect.hatType;
        }
        if (effect.beautyFilter) {
            this.activeEffects.beautyFilter = true;
            this.applyBeautyFilter();
        }
    }

    disableAllEffects() {
        this.activeEffects = {
            hatType: null,
            beautyFilter: false
        };
        this.removeBeautyFilter();
    }

    updateFaceData(landmarks) {
        if (!landmarks) return;

        // 提取关键点用于帽子定位
        this.faceData = {
            // 头顶位置（用前额点估计）
            top: {
                x: landmarks[10].x,
                y: landmarks[10].y - 0.05 // 稍微往上偏移
            },
            // 脸部中心
            center: {
                x: (landmarks[234].x + landmarks[454].x) / 2,
                y: (landmarks[10].y + landmarks[152].y) / 2
            },
            // 用于计算旋转角度
            leftEye: landmarks[33],
            rightEye: landmarks[263],
            // 脸部宽度
            width: Math.abs(landmarks[454].x - landmarks[234].x)
        };
    }

    render(ctx, canvasWidth, canvasHeight) {
        if (!this.enabled || !this.faceData) return;

        // 渲染帽子效果
        if (this.activeEffects.hatType) {
            this.renderHat(ctx, canvasWidth, canvasHeight);
        }
    }

    renderHat(ctx, canvasWidth, canvasHeight) {
        const hat = this.hatImages[this.activeEffects.hatType];
        if (!hat || !this.faceData) return;

        // 将归一化坐标转换为画布坐标
        const x = this.faceData.top.x * canvasWidth;
        const y = this.faceData.top.y * canvasHeight;

        // 计算旋转角度
        const leftEyeX = this.faceData.leftEye.x * canvasWidth;
        const leftEyeY = this.faceData.leftEye.y * canvasHeight;
        const rightEyeX = this.faceData.rightEye.x * canvasWidth;
        const rightEyeY = this.faceData.rightEye.y * canvasHeight;
        const angle = Math.atan2(rightEyeY - leftEyeY, rightEyeX - leftEyeX);

        // 根据脸部宽度缩放帽子
        const scale = this.faceData.width * canvasWidth / hat.width * 1.5;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.scale(scale, scale);

        // 帽子特定调整
        if (this.activeEffects.hatType === 'crown') {
            ctx.drawImage(hat, -hat.width / 2, -hat.height * 1.2, hat.width, hat.height);
        } else if (this.activeEffects.hatType === 'halo') {
            // 光环悬浮动画
            const floatOffset = Math.sin(Date.now() / 300) * 5;
            ctx.drawImage(hat, -hat.width / 2, -hat.height * 1.5 + floatOffset, hat.width, hat.height);
        }

        ctx.restore();
    }

    applyBeautyFilter() {
        // 创建叠加的美颜滤镜层
        const cameraVideo = document.getElementById('camera-video');
        if (!cameraVideo) return;

        // 添加CSS滤镜效果
        cameraVideo.style.filter = 'brightness(1.1) contrast(0.95) saturate(1.1) blur(0.5px)';

        // 创建柔光叠加层
        let overlay = document.getElementById('beauty-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'beauty-overlay';
            overlay.style.cssText = `
                position: absolute;
                inset: 0;
                background: radial-gradient(circle at center, transparent 30%, rgba(255,220,220,0.1) 100%);
                pointer-events: none;
                z-index: 2;
                mix-blend-mode: soft-light;
            `;
            document.getElementById('game-container')?.appendChild(overlay);
        }

        console.log('[AREffects] Beauty filter applied');
    }

    removeBeautyFilter() {
        const cameraVideo = document.getElementById('camera-video');
        if (cameraVideo) {
            cameraVideo.style.filter = '';
        }

        const overlay = document.getElementById('beauty-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    // 检查是否有任何AR效果激活
    hasActiveEffects() {
        return this.activeEffects.hatType !== null || this.activeEffects.beautyFilter;
    }
}

window.AREffectsSystem = AREffectsSystem;
