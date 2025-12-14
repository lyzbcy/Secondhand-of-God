/**
 * 神之手 - 精灵资源加载器
 * 使用CC0/可商用的免费游戏资源
 * 
 * 资源来源:
 * - Kenney.nl (CC0 Public Domain) - 最可靠的免费游戏资源
 * - OpenGameArt.org (Various CC/CC0)
 */

class SpriteLoader {
    constructor() {
        this.sprites = {};
        this.loaded = false;
        this.loadingProgress = 0;

        // 使用Kenney.nl的CC0资源 (公共领域，可商用，无需署名)
        // CDN: https://kenney.nl 或镜像服务
        this.spriteConfig = {
            // 资源节点
            resources: {
                // 树木 - 使用Kenney的自然资源
                tree: {
                    url: 'https://raw.githubusercontent.com/kenney/assets/master/2D/Topdown%20Shooter/tilesheet_complete.png',
                    fallbackEmoji: '🌲',
                    frames: 1,
                    frameWidth: 64,
                    frameHeight: 64
                },
                // 岩石
                rock: {
                    url: 'https://raw.githubusercontent.com/kenney/assets/master/2D/Topdown%20Shooter/tilesheet_complete.png',
                    fallbackEmoji: '🪨',
                    frames: 1,
                    frameWidth: 64,
                    frameHeight: 64
                },
                // 水晶 - 使用发光效果替代
                crystal: {
                    url: null, // 使用程序生成的发光水晶效果
                    fallbackEmoji: '💎',
                    useProceduralGlow: true
                }
            },

            // 敌人精灵
            enemies: {
                goblin: { fallbackEmoji: '👺', color: '#ff6b35' },
                skeleton: { fallbackEmoji: '💀', color: '#f5f5dc' },
                hedgehog: { fallbackEmoji: '🦔', color: '#8b4513' },
                ghost: { fallbackEmoji: '👻', color: '#b8b8ff' },
                ogre: { fallbackEmoji: '👹', color: '#8b0000' },
                rl_boss: { fallbackEmoji: '🤖', color: '#00ff88' }
            },

            // 塔防精灵
            towers: {
                basic: { fallbackEmoji: '🗼', color: '#ffd700' },
                slow: { fallbackEmoji: '❄️', color: '#00bfff' },
                splash: { fallbackEmoji: '💥', color: '#ff4500' },
                sniper: { fallbackEmoji: '🎯', color: '#9370db' }
            },

            // 主水晶
            mainCrystal: {
                fallbackEmoji: '💎',
                useProceduralGlow: true,
                glowColor: { r: 255, g: 179, b: 217 }
            }
        };
    }

    async init() {
        console.log('[SpriteLoader] Initializing sprite assets...');

        // 加载本地精灵图
        const basePath = 'assets/sprites/';
        const spriteFiles = {
            // 资源
            tree: `${basePath}tree.png`,
            rock: `${basePath}rock.png`,
            crystal: `${basePath}crystal.png`,
            // 敌人
            goblin: `${basePath}goblin.png`,
            skeleton: `${basePath}skeleton.png`,
            // 塔
            tower: `${basePath}tower.png`
        };

        let loadedCount = 0;
        const totalCount = Object.keys(spriteFiles).length;

        for (const [name, path] of Object.entries(spriteFiles)) {
            try {
                this.sprites[name] = await this.loadImage(path);
                loadedCount++;
                console.log(`[SpriteLoader] ✓ Loaded: ${name}`);
            } catch (e) {
                console.warn(`[SpriteLoader] ✗ Using fallback for: ${name}`);
            }
        }

        this.loaded = true;
        console.log(`[SpriteLoader] Loaded ${loadedCount}/${totalCount} sprites`);
        return true;
    }

    // 检查是否有已加载的精灵图
    hasSprite(name) {
        return !!this.sprites[name];
    }

    // 获取已加载的精灵图
    getLoadedSprite(name) {
        return this.sprites[name] || null;
    }

    // 渲染精灵图 (优先使用PNG，否则fallback到emoji)
    renderLoadedSprite(ctx, name, x, y, size, options = {}) {
        const sprite = this.sprites[name];

        if (sprite) {
            // 使用真实精灵图
            ctx.save();

            // 等距变换
            if (options.isometric) {
                ctx.translate(x, y);
                ctx.scale(1, 0.8);
                ctx.translate(-x, -y);
            }

            // 绘制阴影
            this.renderShadow(ctx, x, y, size);

            // 边缘发光效果
            if (options.glow) {
                ctx.shadowColor = options.glowColor || 'rgba(255, 179, 217, 0.6)';
                ctx.shadowBlur = size * 0.3;
            }

            // 绘制精灵图
            const drawSize = size * 1.2;
            ctx.globalAlpha = options.alpha || 1;
            ctx.drawImage(sprite, x - drawSize / 2, y - drawSize / 2, drawSize, drawSize);

            ctx.restore();
            return true;
        }

        return false; // 没有加载成功，需要使用fallback
    }

    // 获取精灵配置
    getSprite(category, type) {
        const categoryConfig = this.spriteConfig[category];
        if (!categoryConfig) return null;
        return categoryConfig[type] || null;
    }

    // 获取fallback emoji
    getEmoji(category, type) {
        const sprite = this.getSprite(category, type);
        return sprite?.fallbackEmoji || '❓';
    }

    // 渲染精灵 (当前使用增强emoji，未来支持真实精灵图)
    renderSprite(ctx, category, type, x, y, size, options = {}) {
        const sprite = this.getSprite(category, type);
        if (!sprite) return;

        // 使用水晶发光效果
        if (sprite.useProceduralGlow) {
            this.renderProceduralGlow(ctx, x, y, size, sprite.glowColor || { r: 0, g: 212, b: 255 });
        }

        // 渲染阴影
        this.renderShadow(ctx, x, y, size);

        // 渲染emoji精灵 (带增强效果)
        ctx.save();

        // 等距变换
        if (options.isometric) {
            ctx.translate(x, y);
            ctx.scale(1, 0.75);
            ctx.translate(-x, -y);
        }

        // 边缘发光
        if (sprite.color) {
            ctx.shadowColor = sprite.color;
            ctx.shadowBlur = size * 0.3;
        }

        ctx.font = `${size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = options.alpha || 1;
        ctx.fillText(sprite.fallbackEmoji, x, y);

        ctx.restore();
    }

    renderShadow(ctx, x, y, size) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(x + 5, y + size * 0.4, size * 0.5, size * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    renderProceduralGlow(ctx, x, y, size, color) {
        const time = Date.now() / 1000;
        const pulseSize = size * (1.2 + Math.sin(time * 2) * 0.15);

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, pulseSize);
        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.4)`);
        gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, 0.15)`);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
        ctx.fill();
    }

    // 预留: 从URL加载图片精灵
    async loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load: ${url}`));
            img.src = url;
        });
    }

    // 预留: 本地精灵图加载
    async loadLocalSprites(basePath = 'assets/sprites/') {
        // 未来可以下载Kenney资源包到本地
        // 然后使用这个方法加载
        const localSprites = {
            tree: `${basePath}tree.png`,
            rock: `${basePath}rock.png`,
            crystal: `${basePath}crystal.png`,
            tower_basic: `${basePath}tower_basic.png`
        };

        for (const [name, path] of Object.entries(localSprites)) {
            try {
                this.sprites[name] = await this.loadImage(path);
                console.log(`[SpriteLoader] Loaded: ${name}`);
            } catch (e) {
                console.log(`[SpriteLoader] Using fallback for: ${name}`);
            }
        }
    }
}

window.SpriteLoader = SpriteLoader;
