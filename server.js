const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Hugging Face API エンドポイント
const HUGGINGFACE_API = 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0';

// 画像生成 API
app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt, apiKey } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'プロンプトが必要です' });
        }
        
        if (!apiKey) {
            return res.status(400).json({ error: 'APIキーが必要です' });
        }
        
        console.log('🎨 画像生成リクエスト:', prompt);
        
        // Hugging Face APIにリクエスト
        const response = await fetch(HUGGINGFACE_API, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: prompt,
                options: {
                    wait_for_model: true
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Hugging Face APIエラー:', response.status, errorData);
            return res.status(response.status).json({ 
                error: errorData.error || `API エラー: ${response.statusText}` 
            });
        }
        
        // 画像データを取得
        const imageBuffer = await response.buffer();
        
        console.log('✅ 画像生成成功:', imageBuffer.length, 'bytes');
        
        // 画像をBase64に変換して返す
        const base64Image = imageBuffer.toString('base64');
        res.json({
            success: true,
            image: `data:image/png;base64,${base64Image}`
        });
        
    } catch (error) {
        console.error('❌ 画像生成エラー:', error);
        res.status(500).json({ error: error.message });
    }
});

// ヘルスチェック
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'AI Image Generator API is running',
        timestamp: new Date().toISOString()
    });
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`🎨 AI Image Generator サーバー起動: http://localhost:${PORT}`);
});

module.exports = app;
