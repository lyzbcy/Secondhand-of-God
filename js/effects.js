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

    // 清除所有效果
    clear() {
        this.particles = [];
        this.trails = [];
    }
}

window.EffectsSystem = EffectsSystem;
