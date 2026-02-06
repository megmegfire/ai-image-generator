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

// 環境変数からAPIキーを取得
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

// 画像生成 API（新しいエンドポイント）
app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'プロンプトが必要です' });
        }
        
        // サーバー側の環境変数のAPIキーを確認
        if (!HUGGINGFACE_API_KEY) {
            console.error('❌ サーバーの環境変数 HUGGINGFACE_API_KEY が設定されていません');
            return res.status(500).json({ 
                error: 'サーバー設定エラー: APIキーが設定されていません。管理者に連絡してください。' 
            });
        }
        
        console.log('🎨 画像生成リクエスト:', prompt);
        
        // 新しいHugging Face APIエンドポイント（FLUX.1-schnell）
        const HUGGINGFACE_API = 'https://router.huggingface.co/models/black-forest-labs/FLUX.1-schnell';
        
        // Hugging Face APIにリクエスト
        const response = await fetch(HUGGINGFACE_API, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    num_inference_steps: 4,  // FLUX.1-schnell用のパラメータ
                    guidance_scale: 0
                }
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Hugging Face APIエラー:', response.status, errorText);
            
            // エラーメッセージをパース
            let errorMessage = `API エラー: ${response.statusText}`;
            try {
                const errorData = JSON.parse(errorText);
                if (errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch (e) {
                // JSON パースに失敗した場合はそのまま
            }
            
            return res.status(response.status).json({ error: errorMessage });
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
        res.status(500).json({ 
            error: error.message || '画像生成中にエラーが発生しました' 
        });
    }
});

// ヘルスチェック
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'AI Image Generator API is running',
        timestamp: new Date().toISOString(),
        apiKeyConfigured: !!HUGGINGFACE_API_KEY,
        model: 'black-forest-labs/FLUX.1-schnell'
    });
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`🎨 AI Image Generator サーバー起動: http://localhost:${PORT}`);
    console.log(`環境変数 HUGGINGFACE_API_KEY: ${HUGGINGFACE_API_KEY ? '設定済み ✅' : '未設定 ❌'}`);
    console.log(`モデル: black-forest-labs/FLUX.1-schnell`);
});

module.exports = app;
