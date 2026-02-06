const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 環境変数から API トークンを取得
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// 画像生成 API (Replicate)
app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'プロンプトが必要です' });
        }
        
        if (!REPLICATE_API_TOKEN) {
            console.error('❌ REPLICATE_API_TOKEN が設定されていません');
            return res.status(500).json({ 
                error: 'サーバー設定エラー: APIトークンが設定されていません' 
            });
        }
        
        console.log('🎨 画像生成リクエスト:', prompt);
        
        // Replicate API で予測を開始
        const prediction = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${REPLICATE_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                version: '39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
                input: {
                    prompt: prompt,
                    num_inference_steps: 25,
                    guidance_scale: 7.5,
                    width: 512,
                    height: 512
                }
            }),
        });

        if (!prediction.ok) {
            const errorText = await prediction.text();
            console.error('❌ Replicate API エラー:', prediction.status, errorText);
            return res.status(prediction.status).json({ 
                error: '画像生成の開始に失敗しました' 
            });
        }

        let predictionData = await prediction.json();
        console.log('🔄 予測を開始しました:', predictionData.id);

        // 予測が完了するまでポーリング
        const maxAttempts = 60; // 最大60秒
        let attempts = 0;

        while (predictionData.status !== 'succeeded' && predictionData.status !== 'failed' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const statusResponse = await fetch(
                `https://api.replicate.com/v1/predictions/${predictionData.id}`,
                {
                    headers: {
                        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
                    },
                }
            );

            if (!statusResponse.ok) {
                console.error('❌ ステータス確認エラー');
                break;
            }

            predictionData = await statusResponse.json();
            attempts++;
            
            console.log(`⏳ ステータス: ${predictionData.status} (${attempts}/${maxAttempts})`);
        }

        if (predictionData.status === 'succeeded' && predictionData.output && predictionData.output.length > 0) {
            const imageUrl = predictionData.output[0];
            console.log('✅ 画像生成成功:', imageUrl);
            
            // 画像をダウンロードして Base64 に変換
            const imageResponse = await fetch(imageUrl);
            const imageBuffer = await imageResponse.arrayBuffer();
            const base64Image = Buffer.from(imageBuffer).toString('base64');
            
            res.json({
                success: true,
                image: `data:image/png;base64,${base64Image}`
            });
        } else {
            console.error('❌ 画像生成失敗:', predictionData.status, predictionData.error);
            res.status(500).json({ 
                error: predictionData.error || '画像生成に失敗しました' 
            });
        }
        
    } catch (error) {
        console.error('❌ サーバーエラー:', error);
        res.status(500).json({ 
            error: error.message || '画像生成中にエラーが発生しました' 
        });
    }
});

// ヘルスチェック
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'AI Image Generator API (Replicate)',
        timestamp: new Date().toISOString(),
        apiTokenConfigured: !!REPLICATE_API_TOKEN
    });
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`🎨 サーバー起動: http://localhost:${PORT}`);
    console.log(`Replicate API Token: ${REPLICATE_API_TOKEN ? '✅ 設定済み' : '❌ 未設定'}`);
});

module.exports = app;
