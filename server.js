/**
 * server.js — 《县治》游戏服务器 + AI秘书代理
 * ==============================================
 * 启动方式：node server.js
 * 然后在游戏目录创建 .env 文件配置 API 密钥
 *
 * 功能：
 *   1. 提供静态文件服务（游戏前端）
 *   2. POST /api/chat — AI对话代理（调用 OpenAI 兼容接口）
 *   3. GET /api/status — 服务器健康检查
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;
const AI_API_BASE = (process.env.AI_API_BASE || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'deepseek/deepseek-chat';

// ========== 中间件 ==========
app.use(express.json({ limit: '10mb' }));

// CORS 允许来自同一台机器的请求
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ========== 静态文件服务 ==========
app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ========== API: 健康检查 ==========
app.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    aiConfigured: !!AI_API_KEY,
    model: AI_MODEL,
    apiBase: AI_API_BASE.replace(/\/v1$/, ''),
  });
});

// ========== API: AI对话 ==========
app.post('/api/chat', async (req, res) => {
  const { messages, max_tokens, temperature } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages 参数缺失或格式错误' });
  }

  if (!AI_API_KEY) {
    return res.status(503).json({
      error: 'AI 未配置',
      detail: '请在 .env 文件中设置 AI_API_KEY',
    });
  }

  // 构建系统提示词
  const systemPrompt = {
    role: 'system',
    content: `你是《县治》游戏的AI治理秘书，辅佐玩家（县委书记）治理一个中国北方县。

你的回答规范：
1. 使用中文，语气专业但平易近人，像一个经验丰富的政府幕僚
2. 回答简洁，通常3-6句话，最多不超过8句
3. 涉及游戏数据时基于玩家提供的上下文，不编造数据
4. 在分析中体现体制内思维：考虑政治影响、财政约束、社会稳定
5. 给出建议时提供2-3个具体可操作的方向
6. 用"书记"称呼玩家
7. 不要使用markdown格式，用纯文字或简单的<br>换行
8. 不知道的事情坦诚说不知道，不要编造信息

当前游戏是一个中国县域治理模拟器，涉及经济、财政、社会、人事、党建等多个系统。`,
  };

  try {
    const body = JSON.stringify({
      model: AI_MODEL,
      messages: [systemPrompt, ...messages],
      max_tokens: max_tokens || 600,
      temperature: temperature ?? 0.7,
      top_p: 0.9,
    });

    const url = new URL(`${AI_API_BASE}/chat/completions`);
    const lib = url.protocol === 'https:' ? https : http;

    const reply = await new Promise((resolve, reject) => {
      const req = lib.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_API_KEY}`,
          'Content-Length': Buffer.byteLength(body, 'utf-8'),
        },
        family: 4, // 强制 IPv4，避免 IPv6 路由问题
        timeout: 30000,
      }, (resp) => {
        let data = '';
        resp.on('data', chunk => data += chunk);
        resp.on('end', () => {
          if (resp.statusCode !== 200) {
            try {
              const err = JSON.parse(data);
              reject(new Error(err.error?.message || err.error || `HTTP ${resp.statusCode}`));
            } catch (_) {
              reject(new Error(`HTTP ${resp.statusCode}: ${data.slice(0,200)}`));
            }
            return;
          }
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.choices?.[0]?.message?.content || '');
          } catch (e) {
            reject(new Error('解析响应失败'));
          }
        });
      });
      req.on('error', reject);
      req.on('timeout', function() { req.destroy(); reject(new Error('Connection timeout')); });
      req.write(body, 'utf-8');
      req.end();
    });

    res.json({ reply, model: AI_MODEL });
  } catch (err) {
    console.error('AI API 调用失败:', err.message, err.stack?.slice(0,300));
    res.status(502).json({
      error: 'AI 服务请求失败',
      detail: err.message,
    });
  }
});

// ========== 启动 ==========
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║  县治 · 游戏服务器已启动              ║
  ║  访问地址：http://localhost:${PORT}   ║
  ║                                       ║
  ║  AI 秘书: ${AI_API_KEY ? '✅ 已配置 (' + AI_MODEL + ')' : '❌ 未配置 (请编辑 .env 文件)'}
  ╚═══════════════════════════════════════╝
  `);
});
