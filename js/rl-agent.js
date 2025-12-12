/**
 * 神之手 - 强化学习智能体 (Q-Learning)
 * 用于控制智能敌人的决策系统
 */

class RLAgent {
    constructor(config = {}) {
        // Q-Table: { stateKey: { action: qValue } }
        this.qTable = {};

        // 超参数
        this.learningRate = config.learningRate || 0.1;      // α: 学习率
        this.discountFactor = config.discountFactor || 0.95; // γ: 折扣因子
        this.epsilon = config.epsilon || 0.3;                // ε: 探索率
        this.epsilonDecay = config.epsilonDecay || 0.995;    // ε 衰减率
        this.epsilonMin = config.epsilonMin || 0.05;         // ε 最小值

        // 动作空间
        this.actions = ['direct', 'left', 'right', 'retreat', 'charge'];

        // 状态离散化阈值
        this.distanceThresholds = {
            crystal: [150, 350],  // 近/中/远
            hand: [120]           // 近/远
        };

        // 训练统计
        this.stats = {
            episodes: 0,
            totalReward: 0,
            rewardHistory: [],
            statesVisited: new Set()
        };

        // 当前回合信息
        this.currentEpisode = {
            states: [],
            actions: [],
            rewards: []
        };

        // 加载已保存的模型
        this.loadModel();
    }

    /**
     * 将游戏状态编码为离散状态键
     */
    encodeState(enemy, gameWorld) {
        const crystal = gameWorld.crystal;
        const handState = gameWorld.handTracker.getGestureState();

        // 计算距离
        const crystalDist = Utils.distance(enemy.x, enemy.y, crystal.x, crystal.y);

        // 离散化水晶距离 (0=近, 1=中, 2=远)
        let crystalDistLevel = 2;
        if (crystalDist < this.distanceThresholds.crystal[0]) crystalDistLevel = 0;
        else if (crystalDist < this.distanceThresholds.crystal[1]) crystalDistLevel = 1;

        // 计算相对水晶的方向 (0=上, 1=右, 2=下, 3=左)
        const angleTocrystal = Math.atan2(crystal.y - enemy.y, crystal.x - enemy.x);
        const direction = Math.floor(((angleTocrystal + Math.PI) / (Math.PI * 2) * 4 + 0.5) % 4);

        // 左右手状态
        let leftHandNear = 0, rightHandNear = 0;
        let leftHandExists = 0, rightHandExists = 0;

        if (handState.leftHand) {
            leftHandExists = 1;
            const leftDist = Utils.distance(enemy.x, enemy.y,
                handState.leftHand.palmCenter.x, handState.leftHand.palmCenter.y);
            if (leftDist < this.distanceThresholds.hand[0]) leftHandNear = 1;
        }

        if (handState.rightHand) {
            rightHandExists = 1;
            const rightDist = Utils.distance(enemy.x, enemy.y,
                handState.rightHand.palmCenter.x, handState.rightHand.palmCenter.y);
            if (rightDist < this.distanceThresholds.hand[0]) rightHandNear = 1;
        }

        // 组合成状态键
        const stateKey = `${crystalDistLevel}_${direction}_${leftHandNear}_${rightHandNear}_${leftHandExists}_${rightHandExists}`;

        this.stats.statesVisited.add(stateKey);
        return stateKey;
    }

    /**
     * ε-greedy 策略选择动作
     */
    chooseAction(state) {
        // 探索：随机选择动作
        if (Math.random() < this.epsilon) {
            return this.actions[Math.floor(Math.random() * this.actions.length)];
        }

        // 利用：选择 Q 值最大的动作
        return this.getBestAction(state);
    }

    /**
     * 获取当前状态下 Q 值最大的动作
     */
    getBestAction(state) {
        if (!this.qTable[state]) {
            this.initializeState(state);
        }

        let bestAction = this.actions[0];
        let bestValue = -Infinity;

        for (const action of this.actions) {
            const qValue = this.qTable[state][action] || 0;
            if (qValue > bestValue) {
                bestValue = qValue;
                bestAction = action;
            }
        }

        return bestAction;
    }

    /**
     * 初始化状态的 Q 值
     */
    initializeState(state) {
        this.qTable[state] = {};
        for (const action of this.actions) {
            this.qTable[state][action] = 0;
        }
    }

    /**
     * Q-Learning 更新公式
     * Q(s,a) ← Q(s,a) + α[r + γ·max Q(s',a') - Q(s,a)]
     */
    learn(state, action, reward, nextState, done = false) {
        if (!this.qTable[state]) this.initializeState(state);
        if (!this.qTable[nextState]) this.initializeState(nextState);

        const currentQ = this.qTable[state][action] || 0;

        // 计算目标 Q 值
        let targetQ;
        if (done) {
            targetQ = reward;
        } else {
            const maxNextQ = Math.max(...this.actions.map(a => this.qTable[nextState][a] || 0));
            targetQ = reward + this.discountFactor * maxNextQ;
        }

        // 更新 Q 值
        this.qTable[state][action] = currentQ + this.learningRate * (targetQ - currentQ);

        // 记录训练数据
        this.stats.totalReward += reward;
    }

    /**
     * 回合结束处理
     */
    endEpisode(finalReward) {
        this.stats.episodes++;
        this.stats.rewardHistory.push(finalReward);

        // 保持最近 100 个回合的记录
        if (this.stats.rewardHistory.length > 100) {
            this.stats.rewardHistory.shift();
        }

        // 衰减探索率
        this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);

        // 重置当前回合
        this.currentEpisode = { states: [], actions: [], rewards: [] };

        // 定期保存模型
        if (this.stats.episodes % 10 === 0) {
            this.saveModel();
        }
    }

    /**
     * 计算奖励
     */
    calculateReward(enemy, gameWorld, event = null) {
        let reward = 0;

        // 事件奖励
        if (event) {
            switch (event.type) {
                case 'attackCrystal':
                    reward += 100;    // 成功攻击水晶
                    break;
                case 'damaged':
                    reward -= 20;     // 被玩家击中
                    break;
                case 'killed':
                    reward -= 50;     // 死亡
                    break;
            }
        }

        // 距离奖励：靠近水晶
        const crystal = gameWorld.crystal;
        const dist = Utils.distance(enemy.x, enemy.y, crystal.x, crystal.y);
        if (enemy.prevDist !== undefined) {
            if (dist < enemy.prevDist) {
                reward += 0.5;   // 靠近水晶
            } else if (dist > enemy.prevDist) {
                reward -= 0.5;   // 远离水晶
            }
        }
        enemy.prevDist = dist;

        // 存活奖励
        reward += 0.1;

        return reward;
    }

    /**
     * 将动作转换为移动向量
     */
    getMovementFromAction(action, enemy, gameWorld) {
        const crystal = gameWorld.crystal;
        const angleTocrystal = Math.atan2(crystal.y - enemy.y, crystal.x - enemy.x);

        let moveAngle = angleTocrystal;
        let speedMultiplier = 1;

        switch (action) {
            case 'direct':
                // 直线朝向水晶
                moveAngle = angleTocrystal;
                break;
            case 'left':
                // 向左绕行
                moveAngle = angleTocrystal - Math.PI / 4;
                break;
            case 'right':
                // 向右绕行
                moveAngle = angleTocrystal + Math.PI / 4;
                break;
            case 'retreat':
                // 后退躲避
                moveAngle = angleTocrystal + Math.PI;
                speedMultiplier = 0.8;
                break;
            case 'charge':
                // 冲锋
                moveAngle = angleTocrystal;
                speedMultiplier = 1.8;
                break;
        }

        return {
            dx: Math.cos(moveAngle) * speedMultiplier,
            dy: Math.sin(moveAngle) * speedMultiplier,
            speedMultiplier
        };
    }

    /**
     * 保存模型到 localStorage
     */
    saveModel() {
        try {
            const modelData = {
                qTable: this.qTable,
                epsilon: this.epsilon,
                stats: {
                    episodes: this.stats.episodes,
                    totalReward: this.stats.totalReward,
                    rewardHistory: this.stats.rewardHistory
                }
            };
            localStorage.setItem('rl_agent_model', JSON.stringify(modelData));
            console.log('[RL Agent] 模型已保存，共 ', Object.keys(this.qTable).length, ' 个状态');
        } catch (e) {
            console.warn('[RL Agent] 保存模型失败:', e);
        }
    }

    /**
     * 从 localStorage 加载模型
     */
    loadModel() {
        try {
            const saved = localStorage.getItem('rl_agent_model');
            if (saved) {
                const data = JSON.parse(saved);
                this.qTable = data.qTable || {};
                this.epsilon = data.epsilon || 0.3;
                this.stats.episodes = data.stats?.episodes || 0;
                this.stats.totalReward = data.stats?.totalReward || 0;
                this.stats.rewardHistory = data.stats?.rewardHistory || [];
                console.log('[RL Agent] 模型已加载，共 ', Object.keys(this.qTable).length, ' 个状态');
            }
        } catch (e) {
            console.warn('[RL Agent] 加载模型失败:', e);
        }
    }

    /**
     * 重置模型
     */
    resetModel() {
        this.qTable = {};
        this.epsilon = 0.3;
        this.stats = {
            episodes: 0,
            totalReward: 0,
            rewardHistory: [],
            statesVisited: new Set()
        };
        localStorage.removeItem('rl_agent_model');
        console.log('[RL Agent] 模型已重置');
    }

    /**
     * 获取调试信息
     */
    getDebugInfo(state) {
        const qValues = this.qTable[state] || {};
        return {
            state,
            qValues,
            bestAction: this.getBestAction(state),
            epsilon: this.epsilon.toFixed(3),
            episodes: this.stats.episodes,
            statesCount: Object.keys(this.qTable).length,
            avgReward: this.stats.rewardHistory.length > 0
                ? (this.stats.rewardHistory.reduce((a, b) => a + b, 0) / this.stats.rewardHistory.length).toFixed(2)
                : 'N/A'
        };
    }
}

window.RLAgent = RLAgent;
