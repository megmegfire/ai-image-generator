// ===== 画像生成（エラー詳細表示版） =====
async function generateImage() {
    const prompt = promptInput.value.trim();
    
    // バリデーション
    if (!prompt) {
        showError('画像の説明を入力してください');
        promptInput.focus();
        return;
    }
    
    if (!API_KEY) {
        showError('APIキーを設定してください');
        apiKeySection.style.display = 'block';
        return;
    }
    
    // UIの状態変更
    setGenerating(true);
    hideError();
    imageSection.style.display = 'none';
    
    console.log('🎨 画像生成開始:', prompt);
    console.log('🔑 APIキー:', API_KEY.substring(0, 10) + '...');
    
    try {
        // スタイルを追加
        const style = styleSelect.value;
        const fullPrompt = style ? `${prompt}, ${style}` : prompt;
        
        console.log('📝 完全なプロンプト:', fullPrompt);
        
        // Hugging Face APIにリクエスト
        console.log('🌐 APIリクエスト送信中...');
        const response = await fetch(HUGGINGFACE_API, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: fullPrompt,
                options: {
                    wait_for_model: true
                }
            })
        });
        
        console.log('📡 レスポンス受信:', response.status, response.statusText);
        
        if (!response.ok) {
            // 詳細なエラー情報を取得
            let errorData;
            try {
                errorData = await response.json();
                console.error('❌ APIエラー詳細:', errorData);
            } catch (e) {
                const textError = await response.text();
                console.error('❌ APIエラー（テキスト）:', textError);
                errorData = { error: textError };
            }
            
            // ユーザーフレンドリーなエラーメッセージ
            let errorMessage = `エラー ${response.status}: `;
            
            if (response.status === 401 || response.status === 403) {
                errorMessage += 'APIキーが無効です。正しいキーを入力してください。';
                apiKeySection.style.display = 'block';
            } else if (response.status === 503) {
                errorMessage += 'モデルが起動中です。30秒待ってから再度お試しください。';
            } else if (response.status === 429) {
                errorMessage += 'リクエスト制限に達しました。しばらく待ってから再度お試しください。';
            } else {
                errorMessage += errorData.error || response.statusText;
            }
            
            throw new Error(errorMessage);
        }
        
        // 画像データを取得
        console.log('🖼️ 画像データ取得中...');
        const blob = await response.blob();
        console.log('✅ 画像データ取得完了:', blob.size, 'bytes');
        
        const imageUrl = URL.createObjectURL(blob);
        
        // 画像を表示
        generatedImage.src = imageUrl;
        imagePrompt.textContent = `プロンプト: ${prompt}`;
        imageSection.style.display = 'block';
        
        // スクロール
        imageSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        console.log('✅ 画像生成成功');
        
    } catch (error) {
        console.error('❌ 画像生成エラー:', error);
        
        // ネットワークエラーの場合
        if (error.message === 'Failed to fetch') {
            showError('ネットワークエラー: Hugging Faceに接続できません。インターネット接続を確認してください。');
        } else {
            showError(error.message);
        }
    } finally {
        setGenerating(false);
    }
}
