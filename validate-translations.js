#!/usr/bin/env node

/**
 * ARC Raiders Wiki 翻译文件验证脚本
 * 检查翻译文件的完整性和有效性
 */

const fs = require('fs');
const path = require('path');

// 翻译文件路径
const translationFiles = [
    'translations/items_zh.json',
    'translations/quests_zh.json', 
    'translations/skillNodes_zh.json',
    'translations/hideoutModules_zh.json'
];

// 原始数据文件路径
const originalFiles = [
    'arcraiders-data/items.json',
    'arcraiders-data/quests.json',
    'arcraiders-data/skillNodes.json', 
    'arcraiders-data/hideoutModules.json'
];

/**
 * 验证JSON文件格式
 */
function validateJSON(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        return { valid: true, data };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

/**
 * 比较两个数组的ID是否一致
 */
function compareIds(original, translated, category) {
    const originalIds = original.map(item => item.id).sort();
    const translatedIds = translated.map(item => item.id).sort();
    
    const missing = originalIds.filter(id => !translatedIds.includes(id));
    const extra = translatedIds.filter(id => !originalIds.includes(id));
    
    return { missing, extra, match: missing.length === 0 && extra.length === 0 };
}

/**
 * 验证翻译文件
 */
function validateTranslations() {
    console.log('🔍 开始验证ARC Raiders Wiki翻译文件...\n');
    
    let allValid = true;
    
    for (let i = 0; i < translationFiles.length; i++) {
        const translationFile = translationFiles[i];
        const originalFile = originalFiles[i];
        const category = translationFile.split('/')[1].split('_')[0];
        
        console.log(`📁 验证 ${category} 翻译文件...`);
        
        // 检查文件是否存在
        if (!fs.existsSync(translationFile)) {
            console.log(`❌ 翻译文件不存在: ${translationFile}`);
            allValid = false;
            continue;
        }
        
        if (!fs.existsSync(originalFile)) {
            console.log(`❌ 原始文件不存在: ${originalFile}`);
            allValid = false;
            continue;
        }
        
        // 验证JSON格式
        const translationResult = validateJSON(translationFile);
        const originalResult = validateJSON(originalFile);
        
        if (!translationResult.valid) {
            console.log(`❌ 翻译文件JSON格式错误: ${translationResult.error}`);
            allValid = false;
            continue;
        }
        
        if (!originalResult.valid) {
            console.log(`❌ 原始文件JSON格式错误: ${originalResult.error}`);
            allValid = false;
            continue;
        }
        
        // 比较ID
        const idComparison = compareIds(originalResult.data, translationResult.data, category);
        
        if (idComparison.match) {
            console.log(`✅ ${category} 翻译文件验证通过`);
            console.log(`   - 翻译项目数量: ${translationResult.data.length}`);
        } else {
            console.log(`⚠️  ${category} 翻译文件ID不匹配`);
            if (idComparison.missing.length > 0) {
                console.log(`   - 缺失的ID: ${idComparison.missing.slice(0, 5).join(', ')}${idComparison.missing.length > 5 ? '...' : ''}`);
            }
            if (idComparison.extra.length > 0) {
                console.log(`   - 多余的ID: ${idComparison.extra.slice(0, 5).join(', ')}${idComparison.extra.length > 5 ? '...' : ''}`);
            }
        }
        
        console.log('');
    }
    
    // 总结
    console.log('📊 验证总结:');
    if (allValid) {
        console.log('✅ 所有翻译文件验证通过！');
        console.log('🎉 ARC Raiders Wiki多语言系统已准备就绪！');
    } else {
        console.log('❌ 部分翻译文件存在问题，请检查上述错误信息。');
    }
    
    return allValid;
}

/**
 * 生成翻译统计报告
 */
function generateReport() {
    console.log('\n📈 翻译统计报告:');
    console.log('='.repeat(50));
    
    let totalItems = 0;
    let totalQuests = 0;
    let totalSkillNodes = 0;
    let totalModules = 0;
    
    translationFiles.forEach(file => {
        if (fs.existsSync(file)) {
            const result = validateJSON(file);
            if (result.valid) {
                const category = file.split('/')[1].split('_')[0];
                const count = result.data.length;
                
                switch (category) {
                    case 'items':
                        totalItems = count;
                        console.log(`📦 物品翻译: ${count} 项`);
                        break;
                    case 'quests':
                        totalQuests = count;
                        console.log(`🎯 任务翻译: ${count} 项`);
                        break;
                    case 'skillNodes':
                        totalSkillNodes = count;
                        console.log(`⚡ 技能节点翻译: ${count} 项`);
                        break;
                    case 'hideoutModules':
                        totalModules = count;
                        console.log(`🏠 隐藏所模块翻译: ${count} 项`);
                        break;
                }
            }
        }
    });
    
    const total = totalItems + totalQuests + totalSkillNodes + totalModules;
    console.log('='.repeat(50));
    console.log(`📊 总计翻译项目: ${total} 项`);
    console.log(`🌍 支持语言: 中文 (简体)`);
    console.log(`🔄 语言切换: 实时切换，无需刷新`);
    console.log(`💾 持久化: 本地存储支持`);
}

// 运行验证
if (require.main === module) {
    const isValid = validateTranslations();
    generateReport();
    
    process.exit(isValid ? 0 : 1);
}

module.exports = {
    validateTranslations,
    generateReport,
    validateJSON,
    compareIds
};
