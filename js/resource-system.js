/**
 * 神之手 - 资源系统
 */

class ResourceSystem {
    constructor(gameWorld) {
        this.game = gameWorld;
        this.resources = { wood: 20, stone: 10, crystal: 5, gold: 0 };
        this.nodes = []; // 资源节点
        this.nodeIdCounter = 0;

        this.nodeTypes = {
            tree: { resource: 'wood', hp: 3, yield: 5, emoji: '🌲', size: 50, color: '#228B22' },
            rock: { resource: 'stone', hp: 4, yield: 4, emoji: '🪨', size: 45, color: '#808080' },
            crystal: { resource: 'crystal', hp: 2, yield: 2, emoji: '💎', size: 35, color: '#00d4ff' }
        };
    }

    init() {
        this.spawnInitialNodes();
        this.updateUI();
    }

    spawnInitialNodes() {
        const w = this.game.canvas.width, h = this.game.canvas.height;
        const margin = 80;

        // 生成树木
        for (let i = 0; i < 6; i++) {
            this.spawnNode('tree',
                Utils.randomInt(margin, w * 0.3),
                Utils.randomInt(margin, h - margin)
            );
            this.spawnNode('tree',
                Utils.randomInt(w * 0.7, w - margin),
                Utils.randomInt(margin, h - margin)
            );
        }

        // 生成岩石
        for (let i = 0; i < 4; i++) {
            this.spawnNode('rock',
                Utils.randomInt(margin, w - margin),
                Utils.randomInt(margin, h - margin)
            );
        }

        // 生成水晶
        this.spawnNode('crystal', Utils.randomInt(w * 0.2, w * 0.4), Utils.randomInt(h * 0.3, h * 0.7));
        this.spawnNode('crystal', Utils.randomInt(w * 0.6, w * 0.8), Utils.randomInt(h * 0.3, h * 0.7));
    }

    spawnNode(type, x, y) {
        const config = this.nodeTypes[type];
        this.nodes.push({
            id: ++this.nodeIdCounter,
            type, x, y,
            hp: config.hp,
            maxHp: config.hp,
            size: config.size,
            shakeTime: 0
        });
    }

    update(deltaTime) {
        this.nodes.forEach(node => {
            if (node.shakeTime > 0) {
                node.shakeTime -= deltaTime;
            }
        });
    }

    render(ctx) {
        this.nodes.forEach(node => {
            const config = this.nodeTypes[node.type];
            let x = node.x, y = node.y;

            // 震动效果
            if (node.shakeTime > 0) {
                x += (Math.random() - 0.5) * 8;
                y += (Math.random() - 0.5) * 8;
            }

            // 绘制阴影
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(node.x, node.y + node.size * 0.4, node.size * 0.5, node.size * 0.2, 0, 0, Math.PI * 2);
            ctx.fill();

            // 绘制emoji
            ctx.font = `${node.size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(config.emoji, x, y);

            // 血条
            if (node.hp < node.maxHp) {
                const barW = 40, barH = 6;
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(node.x - barW / 2, node.y - node.size / 2 - 15, barW, barH);
                ctx.fillStyle = '#2ecc71';
                ctx.fillRect(node.x - barW / 2, node.y - node.size / 2 - 15, barW * (node.hp / node.maxHp), barH);
            }
        });
    }

    // 检测手势命中资源节点
    hitNode(x, y, gestureType) {
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const node = this.nodes[i];
            const dist = Utils.distance(x, y, node.x, node.y);

            if (dist < node.size) {
                const config = this.nodeTypes[node.type];

                // 验证手势类型
                let validGesture = false;
                if (node.type === 'tree' && (gestureType === 'chop' || gestureType === 'slap')) validGesture = true;
                if (node.type === 'rock' && gestureType === 'punch') validGesture = true;
                if (node.type === 'crystal') validGesture = true;

                if (validGesture) {
                    node.hp--;
                    node.shakeTime = 0.2;

                    // 特效
                    this.game.effects.createCollectEffect(node.x, node.y, config.resource);

                    if (node.hp <= 0) {
                        // 收获资源
                        this.addResource(config.resource, config.yield);
                        this.nodes.splice(i, 1);
                        this.game.effects.createExplosion(node.x, node.y, config.color, 15);

                        // 一段时间后重生
                        setTimeout(() => this.respawnNode(node.type), 10000 + Math.random() * 5000);
                    }

                    return true;
                }
            }
        }
        return false;
    }

    respawnNode(type) {
        if (this.game.isGameOver) return;
        const w = this.game.canvas.width, h = this.game.canvas.height;
        const margin = 80;
        this.spawnNode(type, Utils.randomInt(margin, w - margin), Utils.randomInt(margin, h - margin));
    }

    addResource(type, amount) {
        this.resources[type] = (this.resources[type] || 0) + amount;
        this.updateUI();
        this.pulseResourceUI(type);
    }

    spendResource(type, amount) {
        if (this.resources[type] >= amount) {
            this.resources[type] -= amount;
            this.updateUI();
            return true;
        }
        return false;
    }

    canAfford(costs) {
        for (const [type, amount] of Object.entries(costs)) {
            if ((this.resources[type] || 0) < amount) return false;
        }
        return true;
    }

    spend(costs) {
        if (!this.canAfford(costs)) return false;
        for (const [type, amount] of Object.entries(costs)) {
            this.resources[type] -= amount;
        }
        this.updateUI();
        return true;
    }

    updateUI() {
        ['wood', 'stone', 'crystal', 'gold'].forEach(type => {
            const el = document.querySelector(`#res-${type} .res-value`);
            if (el) el.textContent = this.resources[type] || 0;
        });
    }

    pulseResourceUI(type) {
        const el = document.getElementById(`res-${type}`);
        if (el) {
            el.classList.add('pulse');
            setTimeout(() => el.classList.remove('pulse'), 500);
        }
    }
}

window.ResourceSystem = ResourceSystem;
