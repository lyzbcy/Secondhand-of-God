/**
 * 神之手 - 2.5D等距渲染系统
 * Isometric sprites with cinematic lighting
 */

class IsometricRenderer {
    constructor(gameWorld) {
        this.game = gameWorld;

        // 光照设置
        this.lighting = {
            ambient: { r: 80, g: 70, b: 100 },  // 环境光 (紫调)
            sun: {
                angle: Math.PI / 4,  // 太阳角度
                height: 0.7,         // 太阳高度
                color: { r: 255, g: 245, b: 220 },  // 暖阳光
                intensity: 1.0
            },
            rim: {
                color: { r: 255, g: 179, b: 217 },  // 粉色边缘光
                intensity: 0.4
            }
        };

        // 夜间光照
        this.nightLighting = {
            ambient: { r: 30, g: 25, b: 50 },
            sun: {
                angle: -Math.PI / 6,
                height: 0.3,
                color: { r: 120, g: 140, b: 200 },  // 月光冷色
                intensity: 0.5
            },
            rim: {
                color: { r: 100, g: 150, b: 255 },  // 蓝色边缘光
                intensity: 0.6
            }
        };

        // 等距视角偏移
        this.isoAngle = Math.PI / 6; // 30度
        this.shadowOffset = { x: 15, y: 10 };
    }

    getCurrentLighting() {
        return this.game?.isNight ? this.nightLighting : this.lighting;
    }

    // 渲染带阴影和光照的精灵
    renderSprite(ctx, emoji, x, y, size, options = {}) {
        const lighting = this.getCurrentLighting();

        // 1. 绘制动态阴影
        this.renderShadow(ctx, x, y, size, options);

        // 2. 绘制主体精灵
        ctx.save();

        // 应用等距变换
        if (options.isometric) {
            ctx.translate(x, y);
            ctx.scale(1, 0.7); // 压缩Y轴模拟等距视角
            ctx.translate(-x, -y);
        }

        // 绘制精灵
        ctx.font = `${size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 背光描边 (轮廓光)
        if (options.rimLight !== false) {
            ctx.shadowColor = `rgba(${lighting.rim.color.r}, ${lighting.rim.color.g}, ${lighting.rim.color.b}, ${lighting.rim.intensity})`;
            ctx.shadowBlur = size * 0.3;
            ctx.shadowOffsetX = -3;
            ctx.shadowOffsetY = -2;
        }

        ctx.globalAlpha = options.alpha || 1;
        ctx.fillText(emoji, x, y);

        // 清除阴影设置
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // 3. 添加高光层 (顶部亮边)
        if (options.highlight !== false) {
            ctx.globalAlpha = 0.15;
            ctx.fillText(emoji, x, y - size * 0.05);
        }

        ctx.restore();
    }

    // 渲染动态阴影
    renderShadow(ctx, x, y, size, options = {}) {
        const lighting = this.getCurrentLighting();
        const shadowLength = size * (0.5 + (1 - lighting.sun.height) * 0.3);

        ctx.save();

        // 阴影颜色和透明度
        const shadowAlpha = 0.25 + (this.game?.isNight ? 0.15 : 0);
        ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;

        // 根据光源方向计算阴影位置
        const shadowX = x + Math.cos(lighting.sun.angle) * shadowLength;
        const shadowY = y + size * 0.4;

        // 绘制椭圆阴影
        ctx.beginPath();
        ctx.ellipse(shadowX, shadowY, size * 0.5, size * 0.15, lighting.sun.angle * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // 渲染资源节点 (树/石头/水晶)
    renderResourceNode(ctx, node, config) {
        const { x, y, size, type, shakeTime } = node;

        let drawX = x, drawY = y;
        if (shakeTime > 0) {
            drawX += (Math.random() - 0.5) * 8;
            drawY += (Math.random() - 0.5) * 8;
        }

        // 水晶特殊发光效果
        if (type === 'crystal') {
            this.renderCrystalGlow(ctx, drawX, drawY, size);
        }

        // 尝试使用PNG精灵图
        const spriteLoader = this.game?.spriteLoader;
        const spriteName = type; // tree, rock, crystal

        if (spriteLoader && spriteLoader.hasSprite(spriteName)) {
            // 使用PNG精灵
            spriteLoader.renderLoadedSprite(ctx, spriteName, drawX, drawY, size, {
                isometric: true,
                glow: type === 'crystal',
                glowColor: 'rgba(0, 212, 255, 0.5)'
            });
        } else {
            // Fallback到emoji
            this.renderSprite(ctx, config.emoji, drawX, drawY, size, {
                isometric: true,
                rimLight: true,
                highlight: true
            });
        }

        // 血条
        if (node.hp < node.maxHp) {
            this.renderHealthBar(ctx, x, y - size * 0.6, 40, 6, node.hp / node.maxHp, config.color);
        }
    }

    // 水晶发光效果
    renderCrystalGlow(ctx, x, y, size) {
        const time = Date.now() / 1000;
        const pulseSize = size * (1.2 + Math.sin(time * 2) * 0.1);

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, pulseSize);
        gradient.addColorStop(0, 'rgba(0, 212, 255, 0.3)');
        gradient.addColorStop(0.5, 'rgba(0, 212, 255, 0.1)');
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
        ctx.fill();
    }

    // 渲染敌人
    renderEnemy(ctx, enemy, config) {
        const { x, y, size, type } = enemy;

        const alpha = enemy.ethereal ? 0.6 + Math.sin(Date.now() / 200) * 0.2 : 1;

        // Boss敌人添加威慑光环
        if (type === 'ogre' || type === 'rl_boss') {
            this.renderBossAura(ctx, x, y, size);
        }

        // 被减速时有冰霜效果
        if (enemy.slowFactor < 1) {
            this.renderFrostEffect(ctx, x, y, size);
        }

        // 尝试使用PNG精灵图
        const spriteLoader = this.game?.spriteLoader;

        if (spriteLoader && spriteLoader.hasSprite(type)) {
            // 使用PNG精灵
            spriteLoader.renderLoadedSprite(ctx, type, x, y, size * 1.5, {
                isometric: true,
                glow: type === 'ogre' || type === 'rl_boss',
                glowColor: 'rgba(255, 50, 50, 0.4)',
                alpha: alpha
            });
        } else {
            // Fallback到emoji
            this.renderSprite(ctx, config.emoji, x, y, size * 1.5, {
                isometric: true,
                rimLight: true,
                alpha: alpha
            });
        }

        // 血条
        if (enemy.hp < enemy.maxHp) {
            this.renderHealthBar(ctx, x, y - size, 50, 6, enemy.hp / enemy.maxHp, '#ff4757');
        }
    }

    // Boss威慑光环
    renderBossAura(ctx, x, y, size) {
        const time = Date.now() / 500;
        const auraSize = size * (1.5 + Math.sin(time) * 0.2);

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, auraSize);
        gradient.addColorStop(0, 'rgba(255, 50, 50, 0.2)');
        gradient.addColorStop(0.7, 'rgba(255, 50, 50, 0.1)');
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, auraSize, 0, Math.PI * 2);
        ctx.fill();
    }

    // 冰霜减速效果
    renderFrostEffect(ctx, x, y, size) {
        ctx.save();
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(x, y, size * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // 渲染血条
    renderHealthBar(ctx, x, y, width, height, percent, color) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x - width / 2, y, width, height);

        const gradient = ctx.createLinearGradient(x - width / 2, y, x - width / 2 + width * percent, y);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, this.adjustBrightness(color, 30));

        ctx.fillStyle = gradient;
        ctx.fillRect(x - width / 2 + 1, y + 1, (width - 2) * percent, height - 2);
    }

    // 渲染主水晶 (中心)
    renderCrystal(ctx, crystal) {
        const { x, y } = crystal;
        const size = 80;
        const time = Date.now() / 1000;

        // 能量场
        const pulseSize = 100 + Math.sin(time * 1.5) * 15;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, pulseSize);
        gradient.addColorStop(0, 'rgba(0, 212, 255, 0.4)');
        gradient.addColorStop(0.3, 'rgba(0, 212, 255, 0.2)');
        gradient.addColorStop(0.7, 'rgba(150, 100, 255, 0.1)');
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
        ctx.fill();

        // 水晶本体
        this.renderSprite(ctx, '💎', x, y, size, {
            isometric: true,
            rimLight: true,
            highlight: true
        });

        // 旋转光点
        for (let i = 0; i < 6; i++) {
            const angle = time + (i * Math.PI / 3);
            const dist = 60 + Math.sin(time * 2 + i) * 10;
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist * 0.5;

            ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(time * 3 + i) * 0.2})`;
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 渲染塔
    renderTower(ctx, tower, config) {
        const { x, y, range } = tower;
        const size = 50;

        // 范围圈 (半透明)
        ctx.strokeStyle = 'rgba(255, 179, 217, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, range, 0, Math.PI * 2);
        ctx.stroke();

        // 塔本体
        this.renderSprite(ctx, config?.emoji || '🗼', x, y, size, {
            isometric: true,
            rimLight: true
        });
    }

    adjustBrightness(color, amount) {
        // 简单的亮度调整
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            const r = Math.min(255, parseInt(hex.slice(0, 2), 16) + amount);
            const g = Math.min(255, parseInt(hex.slice(2, 4), 16) + amount);
            const b = Math.min(255, parseInt(hex.slice(4, 6), 16) + amount);
            return `rgb(${r}, ${g}, ${b})`;
        }
        return color;
    }
}

window.IsometricRenderer = IsometricRenderer;
