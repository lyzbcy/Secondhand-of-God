/**
 * 神之手 - 特效系统
 */

class EffectsSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.trails = [];
        this.screenShake = { intensity: 0, duration: 0 };
        this.flashEffect = { active: false, color: '#fff', alpha: 0 };
    }

    update(deltaTime) {
        // 更新粒子
        this.particles = this.particles.filter(p => {
            p.life -= deltaTime;
            if (p.life <= 0) return false;
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.vy += (p.gravity || 0) * deltaTime;
            p.alpha = p.life / p.maxLife;
            p.size *= p.shrink || 1;
            return true;
        });

        // 更新轨迹
        this.trails = this.trails.filter(t => {
            t.life -= deltaTime;
            return t.life > 0;
        });

        // 更新屏幕震动
        if (this.screenShake.duration > 0) {
            this.screenShake.duration -= deltaTime;
        }

        // 更新闪光
        if (this.flashEffect.active) {
            this.flashEffect.alpha -= deltaTime * 3;
            if (this.flashEffect.alpha <= 0) this.flashEffect.active = false;
        }
    }

    // 渲染2.5D背景 - 透视地面和环境粒子
    renderBackground() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // 渐变背景天空
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, '#0a0a1a');
        skyGrad.addColorStop(0.5, '#1a1530');
        skyGrad.addColorStop(1, '#2a1a3a');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // 透视地面网格
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 179, 217, 0.08)';
        ctx.lineWidth = 1;

        const horizon = h * 0.45; // 地平线位置
        const gridSize = 60;
        const perspective = 0.7;

        // 横线 (从地平线向下，间距渐大)
        for (let i = 0; i < 12; i++) {
            const progress = i / 12;
            const y = horizon + (h - horizon) * Math.pow(progress, perspective);
            const alpha = 0.08 * (1 - progress * 0.6);
            ctx.strokeStyle = `rgba(255, 179, 217, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // 纵线 (透视收敛到中心)
        const centerX = w / 2;
        for (let i = -8; i <= 8; i++) {
            const bottomX = centerX + i * gridSize;
            const topX = centerX + i * gridSize * 0.3; // 向中心收敛
            ctx.beginPath();
            ctx.moveTo(topX, horizon);
            ctx.lineTo(bottomX, h);
            ctx.stroke();
        }

        ctx.restore();

        // 环境粒子 (漂浮的光点)
        if (!this.ambientParticles) {
            this.ambientParticles = [];
            for (let i = 0; i < 30; i++) {
                this.ambientParticles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    size: Math.random() * 2 + 1,
                    speed: Math.random() * 0.3 + 0.1,
                    opacity: Math.random() * 0.3 + 0.1,
                    hue: Math.random() > 0.5 ? 330 : 50
                });
            }
        }

        this.ambientParticles.forEach(p => {
            p.y -= p.speed;
            if (p.y < 0) {
                p.y = h;
                p.x = Math.random() * w;
            }

            ctx.beginPath();
            ctx.fillStyle = `hsla(${p.hue}, 70%, 70%, ${p.opacity})`;
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    render() {
        const ctx = this.ctx;

        // 应用屏幕震动
        if (this.screenShake.duration > 0) {
            const ox = (Math.random() - 0.5) * this.screenShake.intensity;
            const oy = (Math.random() - 0.5) * this.screenShake.intensity;
            ctx.translate(ox, oy);
        }

        // 渲染轨迹
        this.trails.forEach(t => {
            ctx.beginPath();
            ctx.strokeStyle = t.color;
            ctx.lineWidth = t.width * (t.life / t.maxLife);
            ctx.globalAlpha = t.life / t.maxLife;
            ctx.moveTo(t.x1, t.y1);
            ctx.lineTo(t.x2, t.y2);
            ctx.stroke();
        });

        // 渲染粒子
        this.particles.forEach(p => {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.globalAlpha = 1;

        // 渲染闪光
        if (this.flashEffect.active) {
            ctx.fillStyle = this.flashEffect.color;
            ctx.globalAlpha = this.flashEffect.alpha;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.globalAlpha = 1;
        }

        // 重置变换
        if (this.screenShake.duration > 0) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
    }

    // 创建粒子爆炸效果
    createExplosion(x, y, color = '#ff6b35', count = 20) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const speed = 100 + Math.random() * 200;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 5,
                color,
                life: 0.5 + Math.random() * 0.5,
                maxLife: 1,
                alpha: 1,
                gravity: 200,
                shrink: 0.98
            });
        }
    }

    // 创建资源收集效果
    createCollectEffect(x, y, type = 'wood') {
        const colors = { wood: '#8B4513', stone: '#808080', crystal: '#00d4ff', gold: '#ffd700' };
        const color = colors[type] || '#fff';
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * 50,
                vy: -100 - Math.random() * 100,
                size: 4 + Math.random() * 4,
                color,
                life: 0.8,
                maxLife: 0.8,
                alpha: 1,
                gravity: 300,
                shrink: 0.95
            });
        }
    }

    // 创建手部轨迹
    createHandTrail(x1, y1, x2, y2, color = '#00d4ff') {
        this.trails.push({
            x1, y1, x2, y2, color,
            width: 4, life: 0.2, maxLife: 0.2
        });
    }

    // 创建攻击特效（风刃）
    createSlashEffect(x, y, angle = 0) {
        for (let i = 0; i < 15; i++) {
            const spread = (Math.random() - 0.5) * 0.5;
            const speed = 200 + Math.random() * 100;
            this.particles.push({
                x, y,
                vx: Math.cos(angle + spread) * speed,
                vy: Math.sin(angle + spread) * speed,
                size: 2 + Math.random() * 3,
                color: `hsl(${180 + Math.random() * 40}, 80%, 70%)`,
                life: 0.3,
                maxLife: 0.3,
                alpha: 1,
                shrink: 0.9
            });
        }
    }

    // 屏幕震动
    shake(intensity = 10, duration = 0.2) {
        this.screenShake.intensity = intensity;
        this.screenShake.duration = duration;
    }

    // 屏幕闪光
    flash(color = '#fff') {
        this.flashEffect = { active: true, color, alpha: 0.5 };
    }

    // 创建伤害数字
    createDamageNumber(x, y, damage, isCritical = false) {
        const container = document.getElementById('damage-numbers');
        if (!container) return;

        const el = document.createElement('div');
        el.className = 'damage-number' + (isCritical ? ' critical' : '');
        el.textContent = Math.round(damage);
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        container.appendChild(el);

        setTimeout(() => el.remove(), 1000);
    }

    // 创建建造特效
    createBuildEffect(x, y) {
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12;
            this.particles.push({
                x: x + Math.cos(angle) * 30,
                y: y + Math.sin(angle) * 30,
                vx: Math.cos(angle) * -50,
                vy: Math.sin(angle) * -50,
                size: 5,
                color: '#ffd700',
                life: 0.5,
                maxLife: 0.5,
                alpha: 1,
                shrink: 0.95
            });
        }
    }

    // ===================================
    // 高精度电影级粒子特效
    // ===================================

    // 创建光晕效果
    createGlowEffect(x, y, color = '#00d4ff', radius = 100, duration = 1) {
        const particles = 30;
        for (let i = 0; i < particles; i++) {
            const angle = (Math.PI * 2 * i) / particles;
            const dist = Math.random() * radius;
            this.particles.push({
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                vx: Math.cos(angle) * 20,
                vy: Math.sin(angle) * 20,
                size: 2 + Math.random() * 4,
                color,
                life: duration,
                maxLife: duration,
                alpha: 1,
                shrink: 0.99,
                glow: true
            });
        }
    }

    // 创建闪电链特效
    createLightningBolt(x1, y1, x2, y2, segments = 8) {
        const points = [{ x: x1, y: y1 }];
        const dx = x2 - x1;
        const dy = y2 - y1;

        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const offsetX = (Math.random() - 0.5) * 60;
            const offsetY = (Math.random() - 0.5) * 60;
            points.push({
                x: x1 + dx * t + offsetX,
                y: y1 + dy * t + offsetY
            });
        }
        points.push({ x: x2, y: y2 });

        // 创建闪电段
        for (let i = 0; i < points.length - 1; i++) {
            this.trails.push({
                x1: points[i].x,
                y1: points[i].y,
                x2: points[i + 1].x,
                y2: points[i + 1].y,
                color: '#ffd700',
                width: 4 + Math.random() * 3,
                life: 0.15,
                maxLife: 0.15,
                isLightning: true
            });

            // 添加光晕粒子
            this.particles.push({
                x: points[i].x,
                y: points[i].y,
                vx: 0, vy: 0,
                size: 8 + Math.random() * 5,
                color: '#fff',
                life: 0.2,
                maxLife: 0.2,
                alpha: 1,
                shrink: 0.9
            });
        }
    }

    // 创建魔法阵
    createMagicCircle(x, y, radius = 150, duration = 2) {
        const rings = 3;
        const particlesPerRing = 40;

        for (let ring = 0; ring < rings; ring++) {
            const ringRadius = radius * (0.5 + ring * 0.25);
            const hue = 200 + ring * 40;

            for (let i = 0; i < particlesPerRing; i++) {
                const angle = (Math.PI * 2 * i) / particlesPerRing;
                this.particles.push({
                    x: x + Math.cos(angle) * ringRadius,
                    y: y + Math.sin(angle) * ringRadius,
                    vx: Math.cos(angle + Math.PI / 2) * 30,
                    vy: Math.sin(angle + Math.PI / 2) * 30,
                    size: 3 + ring,
                    color: `hsl(${hue}, 80%, 60%)`,
                    life: duration,
                    maxLife: duration,
                    alpha: 1,
                    shrink: 0.995,
                    rotateAround: { x, y, radius: ringRadius, speed: (ring + 1) * 2 }
                });
            }
        }

        // 中心光柱
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: -200 - Math.random() * 100,
                size: 4 + Math.random() * 6,
                color: '#fff',
                life: duration * 0.6,
                maxLife: duration * 0.6,
                alpha: 1,
                shrink: 0.98
            });
        }
    }

    // 终极技能特效
    createUltimateEffect(x, y, type = 'rage') {
        const colors = {
            rage: '#ff4757',
            fortress: '#3498db',
            goldRain: '#ffd700'
        };
        const color = colors[type] || '#fff';

        // 大规模爆炸
        this.createExplosion(x, y, color, 50);
        this.createMagicCircle(x, y, 200, 1.5);
        this.createGlowEffect(x, y, color, 150, 1);

        // 全屏闪光
        this.flash(color);
        this.shake(20, 0.5);

        // 环形冲击波
        for (let i = 0; i < 60; i++) {
            const angle = (Math.PI * 2 * i) / 60;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * 400,
                vy: Math.sin(angle) * 400,
                size: 8,
                color,
                life: 0.8,
                maxLife: 0.8,
                alpha: 1,
                shrink: 0.95
            });
        }
    }

    // 环境氛围粒子
    createAmbientParticles(canvasWidth, canvasHeight, count = 20) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * canvasWidth,
                y: Math.random() * canvasHeight,
                vx: (Math.random() - 0.5) * 20,
                vy: -10 - Math.random() * 20,
                size: 1 + Math.random() * 2,
                color: `hsl(${200 + Math.random() * 60}, 70%, 70%)`,
                life: 3 + Math.random() * 2,
                maxLife: 5,
                alpha: 0.5,
                shrink: 1,
                ambient: true
            });
        }
    }

    // 黄金雨效果
    createGoldRain(canvasWidth, count = 50) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                this.particles.push({
                    x: Math.random() * canvasWidth,
                    y: -20,
                    vx: (Math.random() - 0.5) * 30,
                    vy: 150 + Math.random() * 100,
                    size: 10 + Math.random() * 8,
                    color: '#ffd700',
                    life: 3,
                    maxLife: 3,
                    alpha: 1,
                    shrink: 0.99,
                    gravity: 50,
                    isGold: true
                });
            }, i * 30);
        }
    }

    // 清除所有效果
    clear() {
        this.particles = [];
        this.trails = [];
    }
}

window.EffectsSystem = EffectsSystem;
