/**
 * 神之手：最后的防线 - 工具函数库
 * God Hand: Last Defense - Utility Functions
 */

const Utils = {
    /**
     * 生成随机整数 [min, max]
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * 生成随机浮点数 [min, max)
     */
    randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    },

    /**
     * 从数组中随机选择一个元素
     */
    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    },

    /**
     * 洗牌算法 (Fisher-Yates)
     */
    shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    /**
     * 计算两点之间的距离
     */
    distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    },

    /**
     * 计算两点之间的角度 (弧度)
     */
    angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    },

    /**
     * 线性插值
     */
    lerp(start, end, t) {
        return start + (end - start) * t;
    },

    /**
     * 限制值在范围内
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    /**
     * 检测两个矩形是否碰撞
     */
    rectCollision(r1, r2) {
        return !(r1.x + r1.width < r2.x ||
            r2.x + r2.width < r1.x ||
            r1.y + r1.height < r2.y ||
            r2.y + r2.height < r1.y);
    },

    /**
     * 检测点是否在矩形内
     */
    pointInRect(px, py, rect) {
        return px >= rect.x && px <= rect.x + rect.width &&
            py >= rect.y && py <= rect.y + rect.height;
    },

    /**
     * 检测两个圆是否碰撞
     */
    circleCollision(c1, c2) {
        const dist = this.distance(c1.x, c1.y, c2.x, c2.y);
        return dist < c1.radius + c2.radius;
    },

    /**
     * 检测点是否在圆内
     */
    pointInCircle(px, py, cx, cy, radius) {
        return this.distance(px, py, cx, cy) <= radius;
    },

    /**
     * 角度转弧度
     */
    degToRad(degrees) {
        return degrees * (Math.PI / 180);
    },

    /**
     * 弧度转角度
     */
    radToDeg(radians) {
        return radians * (180 / Math.PI);
    },

    /**
     * 格式化时间 (秒 -> MM:SS)
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    /**
     * 节流函数
     */
    throttle(func, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * 防抖函数
     */
    debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    /**
     * 缓动函数集合
     */
    easing: {
        linear: t => t,
        easeInQuad: t => t * t,
        easeOutQuad: t => t * (2 - t),
        easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        easeInCubic: t => t * t * t,
        easeOutCubic: t => (--t) * t * t + 1,
        easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
        easeOutElastic: t => {
            const p = 0.3;
            return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
        },
        easeOutBounce: t => {
            if (t < 1 / 2.75) {
                return 7.5625 * t * t;
            } else if (t < 2 / 2.75) {
                return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
            } else if (t < 2.5 / 2.75) {
                return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
            } else {
                return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
            }
        }
    },

    /**
     * 颜色工具
     */
    color: {
        hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        },

        rgbToHex(r, g, b) {
            return '#' + [r, g, b].map(x => {
                const hex = x.toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            }).join('');
        },

        rgba(r, g, b, a = 1) {
            return `rgba(${r}, ${g}, ${b}, ${a})`;
        },

        // 混合两个颜色
        blend(color1, color2, ratio) {
            const c1 = this.hexToRgb(color1);
            const c2 = this.hexToRgb(color2);
            if (!c1 || !c2) return color1;

            const r = Math.round(c1.r + (c2.r - c1.r) * ratio);
            const g = Math.round(c1.g + (c2.g - c1.g) * ratio);
            const b = Math.round(c1.b + (c2.b - c1.b) * ratio);

            return this.rgbToHex(r, g, b);
        }
    },

    /**
     * 创建对象池
     */
    createPool(factory, initialSize = 10) {
        const pool = [];
        const active = new Set();

        for (let i = 0; i < initialSize; i++) {
            pool.push(factory());
        }

        return {
            get() {
                let obj = pool.pop();
                if (!obj) {
                    obj = factory();
                }
                active.add(obj);
                return obj;
            },

            release(obj) {
                if (active.has(obj)) {
                    active.delete(obj);
                    pool.push(obj);
                }
            },

            getActive() {
                return active;
            },

            clear() {
                active.clear();
            }
        };
    },

    /**
     * 简单的事件发射器
     */
    createEventEmitter() {
        const events = {};

        return {
            on(event, callback) {
                if (!events[event]) {
                    events[event] = [];
                }
                events[event].push(callback);
            },

            off(event, callback) {
                if (events[event]) {
                    events[event] = events[event].filter(cb => cb !== callback);
                }
            },

            emit(event, ...args) {
                if (events[event]) {
                    events[event].forEach(callback => callback(...args));
                }
            },

            once(event, callback) {
                const wrapper = (...args) => {
                    callback(...args);
                    this.off(event, wrapper);
                };
                this.on(event, wrapper);
            }
        };
    },

    /**
     * 本地存储助手
     */
    storage: {
        save(key, data) {
            try {
                localStorage.setItem(key, JSON.stringify(data));
                return true;
            } catch (e) {
                console.warn('Failed to save to localStorage:', e);
                return false;
            }
        },

        load(key, defaultValue = null) {
            try {
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : defaultValue;
            } catch (e) {
                console.warn('Failed to load from localStorage:', e);
                return defaultValue;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                return false;
            }
        }
    }
};

// 导出为全局变量
window.Utils = Utils;
