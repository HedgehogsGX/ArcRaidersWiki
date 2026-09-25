/**
 * ARC Raiders Wiki 语言切换系统
 * 支持中英文切换
 */

class LanguageManager {
    constructor() {
        this.currentLanguage = localStorage.getItem('arcraiders_language') || 'en';
        this.translations = {
            en: {},
            zh: {}
        };
        this.loadTranslations();
    }

    /**
     * 加载翻译文件
     */
    async loadTranslations() {
        try {
            // 加载英文翻译（原始数据）
            const itemsEn = await fetch('/arcraiders-data/items.json').then(r => r.json());
            const questsEn = await fetch('/arcraiders-data/quests.json').then(r => r.json());
            const skillNodesEn = await fetch('/arcraiders-data/skillNodes.json').then(r => r.json());
            const hideoutModulesEn = await fetch('/arcraiders-data/hideoutModules.json').then(r => r.json());

            // 加载中文翻译
            const itemsZh = await fetch('/translations/items_zh.json').then(r => r.json());
            const questsZh = await fetch('/translations/quests_zh.json').then(r => r.json());
            const skillNodesZh = await fetch('/translations/skillNodes_zh.json').then(r => r.json());
            const hideoutModulesZh = await fetch('/translations/hideoutModules_zh.json').then(r => r.json());

            this.translations.en = {
                items: itemsEn,
                quests: questsEn,
                skillNodes: skillNodesEn,
                hideoutModules: hideoutModulesEn
            };

            this.translations.zh = {
                items: itemsZh,
                quests: questsZh,
                skillNodes: skillNodesZh,
                hideoutModules: hideoutModulesZh
            };

            console.log('翻译文件加载完成');
            this.updateUI();
        } catch (error) {
            console.error('加载翻译文件失败:', error);
        }
    }

    /**
     * 切换语言
     */
    switchLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLanguage = lang;
            localStorage.setItem('arcraiders_language', lang);
            this.updateUI();
            this.updatePageContent();
        }
    }

    /**
     * 获取翻译文本
     */
    getTranslation(category, id, field) {
        const translation = this.translations[this.currentLanguage];
        if (translation && translation[category]) {
            const item = translation[category].find(item => item.id === id);
            return item ? item[field] : null;
        }
        return null;
    }

    /**
     * 获取完整翻译对象
     */
    getTranslatedData(category) {
        return this.translations[this.currentLanguage][category] || [];
    }

    /**
     * 更新UI语言切换按钮
     */
    updateUI() {
        const languageButtons = document.querySelectorAll('.language-switch');
        languageButtons.forEach(button => {
            if (button.dataset.lang === this.currentLanguage) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });

        // 更新页面标题
        const pageTitle = document.querySelector('.page-title');
        if (pageTitle) {
            pageTitle.textContent = this.currentLanguage === 'zh' ? 'ARC Raiders 维基' : 'ARC Raiders Wiki';
        }
    }

    /**
     * 更新页面内容
     */
    updatePageContent() {
        // 更新物品列表
        this.updateItemsList();
        // 更新任务列表
        this.updateQuestsList();
        // 更新技能节点
        this.updateSkillNodes();
        // 更新隐藏所模块
        this.updateHideoutModules();
    }

    /**
     * 更新物品列表
     */
    updateItemsList() {
        const itemsContainer = document.querySelector('.items-container');
        if (!itemsContainer) return;

        const items = this.getTranslatedData('items');
        itemsContainer.innerHTML = '';

        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'item-card';
            itemElement.innerHTML = `
                <div class="item-image">
                    ${item.imageFilename ? `<img src="${item.imageFilename}" alt="${item.name}" />` : ''}
                </div>
                <div class="item-info">
                    <h3 class="item-name">${item.name}</h3>
                    <p class="item-description">${item.description}</p>
                    <span class="item-type">${item.type}</span>
                    ${item.rarity ? `<span class="item-rarity rarity-${item.rarity.toLowerCase()}">${item.rarity}</span>` : ''}
                </div>
            `;
            itemsContainer.appendChild(itemElement);
        });
    }

    /**
     * 更新任务列表
     */
    updateQuestsList() {
        const questsContainer = document.querySelector('.quests-container');
        if (!questsContainer) return;

        const quests = this.getTranslatedData('quests');
        questsContainer.innerHTML = '';

        quests.forEach(quest => {
            const questElement = document.createElement('div');
            questElement.className = 'quest-card';
            questElement.innerHTML = `
                <div class="quest-header">
                    <h3 class="quest-name">${quest.name}</h3>
                    <span class="quest-trader">${quest.trader}</span>
                </div>
                <div class="quest-objectives">
                    <h4>${this.currentLanguage === 'zh' ? '目标' : 'Objectives'}:</h4>
                    <ul>
                        ${quest.objectives.map(obj => `<li>${obj}</li>`).join('')}
                    </ul>
                </div>
                <div class="quest-rewards">
                    <h4>${this.currentLanguage === 'zh' ? '奖励' : 'Rewards'}:</h4>
                    <div class="reward-items">
                        ${quest.rewardItemIds.map(reward => 
                            `<span class="reward-item">${reward.itemId} x${reward.quantity}</span>`
                        ).join('')}
                    </div>
                    <div class="quest-xp">XP: ${quest.xp}</div>
                </div>
            `;
            questsContainer.appendChild(questElement);
        });
    }

    /**
     * 更新技能节点
     */
    updateSkillNodes() {
        const skillNodesContainer = document.querySelector('.skill-nodes-container');
        if (!skillNodesContainer) return;

        const skillNodes = this.getTranslatedData('skillNodes');
        skillNodesContainer.innerHTML = '';

        skillNodes.forEach(node => {
            const nodeElement = document.createElement('div');
            nodeElement.className = `skill-node ${node.isMajor ? 'major' : 'minor'}`;
            nodeElement.style.left = `${node.position.x}%`;
            nodeElement.style.top = `${node.position.y}%`;
            nodeElement.innerHTML = `
                <div class="node-icon">
                    <img src="/images/skills/${node.iconName}" alt="${node.name}" />
                </div>
                <div class="node-info">
                    <h4 class="node-name">${node.name}</h4>
                    <p class="node-description">${node.description}</p>
                    <div class="node-category">${node.category}</div>
                    <div class="node-max-points">${this.currentLanguage === 'zh' ? '最大点数' : 'Max Points'}: ${node.maxPoints}</div>
                </div>
            `;
            skillNodesContainer.appendChild(nodeElement);
        });
    }

    /**
     * 更新隐藏所模块
     */
    updateHideoutModules() {
        const modulesContainer = document.querySelector('.hideout-modules-container');
        if (!modulesContainer) return;

        const modules = this.getTranslatedData('hideoutModules');
        modulesContainer.innerHTML = '';

        modules.forEach(module => {
            const moduleElement = document.createElement('div');
            moduleElement.className = 'hideout-module';
            moduleElement.innerHTML = `
                <div class="module-header">
                    <h3 class="module-name">${module.name}</h3>
                    <span class="module-max-level">${this.currentLanguage === 'zh' ? '最大等级' : 'Max Level'}: ${module.maxLevel}</span>
                </div>
                <div class="module-levels">
                    ${module.levels.map(level => `
                        <div class="module-level">
                            <h4>${this.currentLanguage === 'zh' ? '等级' : 'Level'} ${level.level}</h4>
                            <div class="level-requirements">
                                ${level.requirementItemIds.map(req => 
                                    `<span class="requirement-item">${req.itemId} x${req.quantity}</span>`
                                ).join('')}
                            </div>
                            ${level.otherRequirements ? `
                                <div class="other-requirements">
                                    ${level.otherRequirements.map(req => `<span class="other-req">${req}</span>`).join('')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
            modulesContainer.appendChild(moduleElement);
        });
    }
}

// 创建语言管理器实例
const languageManager = new LanguageManager();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 创建语言切换按钮
    createLanguageSwitch();
    
    // 绑定事件
    bindLanguageEvents();
});

/**
 * 创建语言切换按钮
 */
function createLanguageSwitch() {
    const languageSwitch = document.createElement('div');
    languageSwitch.className = 'language-switch-container';
    languageSwitch.innerHTML = `
        <div class="language-switch">
            <button class="language-switch-btn" data-lang="en">English</button>
            <button class="language-switch-btn" data-lang="zh">中文</button>
        </div>
    `;
    
    // 插入到页面顶部
    const header = document.querySelector('.header') || document.body;
    header.insertBefore(languageSwitch, header.firstChild);
}

/**
 * 绑定语言切换事件
 */
function bindLanguageEvents() {
    const languageButtons = document.querySelectorAll('.language-switch-btn');
    languageButtons.forEach(button => {
        button.addEventListener('click', function() {
            const lang = this.dataset.lang;
            languageManager.switchLanguage(lang);
        });
    });
}

// 导出语言管理器供其他脚本使用
window.LanguageManager = LanguageManager;
window.languageManager = languageManager;
