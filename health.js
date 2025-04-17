const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 4000;

// 替换为你的通义千问API密钥
const API_KEY = 'sk-0bfafb2e66704116a1c503fce9b229f3';

// 提供静态资源
app.use(express.static(path.join(__dirname)));

// 解析 JSON 请求体
app.use(express.json());

// 路由：接收用户输入并调用通义千问API生成健康分析报告
app.post('/api/analyze-health', async (req, res) => {
    try {
        // 解构请求体中的用户数据
        const { height, weight, age, injuryHistory } = req.body;

        // 检查是否接收到必要的数据
        if (!height || !weight || !age) {
            return res.status(400).json({ error: '请提供身高、体重和年龄信息。' });
        }

        // 构造提示文本
        const prompt = `
            根据以下信息生成健康分析报告：
            - 身高：${height} cm
            - 体重：${weight} kg
            - 年龄：${age}
            - 历史伤病：${injuryHistory || '无'}
            分析内容包括：
            1. 当前身体状态（如偏瘦、正常、超重等）
            2. 距离标准体重的差距
            3. 锻炼建议
            4. 饮食建议
            请以以下格式返回结果：
            当前身体状态：[状态]
            距离标准体重差距：[差距] kg
            锻炼建议：[建议]
            饮食建议：[建议]
        `;

        // 调用通义千问API
        const response = await axios.post(
            'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
            {
                model: 'qwen-turbo', // 替换为实际支持的模型名称
                input: {
                    prompt,
                },
                parameters: {
                    max_tokens: 200,
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        // 提取回答内容
        const analysis = response.data.output.text.trim();

        // 检查返回内容是否符合预期格式
        const lines = analysis.split('\n').map(line => line.trim()).filter(line => line);
        if (lines.length < 4) {
            throw new Error('API 返回的结果格式不符合预期');
        }

        // 解析返回内容
        const bodyCondition = lines.find(line => line.startsWith('当前身体状态：'))?.replace('当前身体状态：', '').trim();
        const weightDifference = parseFloat(lines.find(line => line.startsWith('距离标准体重差距：'))?.replace('距离标准体重差距：', '').replace('kg', '').trim());
        const exerciseAdvice = lines.find(line => line.startsWith('锻炼建议：'))?.replace('锻炼建议：', '').trim();
        const dietAdvice = lines.find(line => line.startsWith('饮食建议：'))?.replace('饮食建议：', '').trim();

        // 返回解析后的结果
        res.json({
            bodyCondition,
            weightDifference,
            exerciseAdvice,
            dietAdvice,
        });
    } catch (error) {
        console.error('Error calling API:', error.message || error);
        res.status(500).json({ error: 'Failed to get a response from the API.' });
    }
});

// 路由：接收用户问题并调用通义千问API获取回答
app.post('/api/ask', async (req, res) => {
    try {
        // 解构请求体中的用户问题
        const { question } = req.body;

        // 检查是否接收到问题
        if (!question) {
            return res.status(400).json({ error: '请输入问题内容。' });
        }

        // 调用通义千问API
        const response = await axios.post(
            'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
            {
                model: 'qwen-turbo', // 替换为实际支持的模型名称
                input: {
                    prompt: question,
                },
                parameters: {
                    max_tokens: 200,
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        // 提取回答内容
        const answer = response.data.output.text.trim();

        // 返回回答
        res.json({ answer });
    } catch (error) {
        console.error('Error calling API:', error.message || error);
        res.status(500).json({ error: 'Failed to get a response from the API.' });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});