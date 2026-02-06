// ===== 設定 =====
// API Base URL（サーバー側のAPIを使用）
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api'
  : '/api';

// ===== DOM要素の取得 =====
const apiKeySection = document.getElementById('apiKeySection');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const promptInput = document.getElementById('promptInput');
const styleSelect = document.getElementById('styleSelect');
const sizeSelect = document.getElementById('sizeSelect');
const generateBtn = document.getElementById('generateBtn');
const btnText = generateBtn.querySelector('.btn-text');
const btnLoading = generateBtn.querySelector('.btn-loading');
const errorMessage = document.getElementById('errorMessage');
const imageSection = document.getElementById('imageSection');
const generatedImage = document.getElementById('generatedImage');
const imagePrompt = document.getElementById('imagePrompt');
const downloadBtn = document.getElementById('downloadBtn');
const regenerateBtn = document.getElementById('regenerateBtn');
const newImageBtn = document.getElementById('newImageBtn');

// ===== 設定 =====
let API_KEY = localStorage.getItem('hf_api_key') || '';

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎨 AI Image Generator 起動');
    
    // APIキーが保存されているか確認
    if (API_KEY) {
        apiKeySection.style.display = 'none';
        generateBtn.disabled = false;
    }
    
    // イベントリスナー設定
    setupEventListeners();
});

// ===== イベントリスナー設定 =====
function setupEventListeners() {
    // APIキー保存
    saveApiKeyBtn.addEventListener('click', saveApiKey);
    
    // 生成ボタン
    generateBtn.addEventListener('click', generateImage);
    
    // サンプルプロンプト
    document.querySelectorAll('.sample-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            promptInput.value = btn.dataset.prompt;
            promptInput.focus();
        });
    });
    
    // ダウンロード
    downloadBtn.addEventListener('click', downloadImage);
    
    // 再生成
    regenerateBtn.addEventListener('click', generateImage);
    
    // 新しい画像
    newImageBtn.addEventListener('click', () => {
        imageSection.style.display = 'none';
        promptInput.value = '';
        promptInput.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ===== APIキー保存 =====
function saveApiKey() {
    const key = apiKeyInput.value.trim();
    
    if (!key) {
        showError('APIキーを入力してください');
        return;
    }
    
    if (!key.startsWith('hf_')) {
        showError('Hugging FaceのAPIキーは "hf_" で始まります');
        return;
    }
    
    API_KEY = key;
    localStorage.setItem('hf_api_key', key);
    apiKeySection.style.display = 'none';
    generateBtn.disabled = false;
    showSuccess('APIキーを保存しました！');
}

// ===== 画像生成（サーバー経由） =====
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
    
    try {
        // スタイルを追加
        const style = styleSelect.value;
        const fullPrompt = style ? `${prompt}, ${style}` : prompt;
        
        console.log('📝 完全なプロンプト:', fullPrompt);
        
        // サーバー経由でHugging Face APIにリクエスト
        const response = await fetch(`${API_BASE_URL}/generate-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: fullPrompt,
                apiKey: API_KEY
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'ゲーム生成に失敗しました');
        }
        
        if (data.success && data.image) {
            // Base64画像を表示
            generatedImage.src = data.image;
            imagePrompt.textContent = `プロンプト: ${prompt}`;
            imageSection.style.display = 'block';
            
            // スクロール
            imageSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            console.log('✅ 画像生成成功');
        } else {
            throw new Error('画像データが不正です');
        }
        
    } catch (error) {
        console.error('❌ 画像生成エラー:', error);
        showError(error.message);
    } finally {
        setGenerating(false);
    }
}

// ===== 画像ダウンロード =====
function downloadImage() {
    const link = document.createElement('a');
    link.href = generatedImage.src;
    link.download = `ai-generated-${Date.now()}.png`;
    link.click();
}

// ===== UIヘルパー関数 =====
function setGenerating(isGenerating) {
    generateBtn.disabled = isGenerating;
    btnText.style.display = isGenerating ? 'none' : 'inline';
    btnLoading.style.display = isGenerating ? 'inline' : 'none';
}

function showError(message) {
    errorMessage.textContent = `❌ ${message}`;
    errorMessage.style.display = 'block';
}

function hideError() {
    errorMessage.style.display = 'none';
}

function showSuccess(message) {
    errorMessage.textContent = `✅ ${message}`;
    errorMessage.style.display = 'block';
    errorMessage.style.background = '#efe';
    errorMessage.style.borderColor = '#cfc';
    errorMessage.style.color = '#060';
    
    setTimeout(() => {
        hideError();
        errorMessage.style.background = '#fee';
        errorMessage.style.borderColor = '#fcc';
        errorMessage.style.color = '#c00';
    }, 3000);
}

console.log('✅ app.js 読み込み完了');
