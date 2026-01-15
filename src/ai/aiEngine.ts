import * as vscode from 'vscode';

/**
 * AI 引擎狀態
 */
type AIEngineStatus = 'uninitialized' | 'initializing' | 'ready' | 'error' | 'disabled';

/**
 * 內容分類結果
 */
export interface ContentClassification {
    type: 'code' | 'text' | 'json' | 'markdown';
    language?: string;
}

/**
 * 模型配置
 * 
 * 主要模型：Qwen2.5-0.5B-Instruct
 * 候選模型（未來可切換）：
 * - mT5-Small (300M) - 多語系，Encoder-Decoder
 * - SmolLM2-360M - 英文為主
 * - RWKV-6-World-430M - RNN 變體，超長文本
 */
const MODEL_CONFIG = {
    primary: 'Xenova/Qwen1.5-0.5B-Chat',
    fallback: null, // 未來可加入備用模型
};

/**
 * AI 引擎 - 提供文字摘要、內容分類和標籤建議功能
 * 
 * 使用 Transformers.js 和 Qwen2.5-0.5B-Instruct 模型實現本地 AI 推理
 */
export class AIEngine {
    private static instance: AIEngine | null = null;
    private status: AIEngineStatus = 'uninitialized';
    private generator: any = null;
    private initPromise: Promise<void> | null = null;

    private constructor() { }

    /**
     * 取得 AIEngine 單例
     */
    static getInstance(): AIEngine {
        if (!AIEngine.instance) {
            AIEngine.instance = new AIEngine();
        }
        return AIEngine.instance;
    }

    /**
     * 初始化 AI 引擎
     * 延遲載入模型，首次使用時才下載
     */
    async initialize(): Promise<void> {
        // 檢查是否已經初始化或正在初始化
        if (this.status === 'ready') {
            return;
        }

        if (this.status === 'initializing' && this.initPromise) {
            return this.initPromise;
        }

        // 檢查是否啟用 AI 功能
        const config = vscode.workspace.getConfiguration('quickPrompt.ai');
        const enabled = config.get<boolean>('enabled', true);

        if (!enabled) {
            this.status = 'disabled';
            console.log('[AIEngine] AI features disabled by user');
            return;
        }

        this.status = 'initializing';
        this.initPromise = this.doInitialize();
        return this.initPromise;
    }

    /**
     * 實際執行初始化 - 載入 Qwen2.5-0.5B-Instruct 模型
     */
    private async doInitialize(): Promise<void> {
        try {
            // 動態載入 Transformers.js
            const { pipeline, env } = await import('@xenova/transformers');

            // 設定模型快取路徑
            env.cacheDir = vscode.Uri.joinPath(
                vscode.Uri.file(process.env.HOME || process.env.USERPROFILE || ''),
                '.cache',
                'quickprompt-models'
            ).fsPath;

            // 顯示載入進度
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Quick Prompt: Loading AI model...',
                cancellable: false
            }, async (progress) => {
                progress.report({ message: 'Downloading Qwen1.5-0.5B model (first time only, ~300MB)...' });

                // 載入 text-generation pipeline（使用 Qwen2.5-0.5B-Instruct）
                this.generator = await pipeline(
                    'text-generation',
                    MODEL_CONFIG.primary,
                    {
                        progress_callback: (data: any) => {
                            if (data.status === 'progress') {
                                // 修正進度計算邏輯：有些環境下 progress 是 0-100，有些是 0-1
                                let percent: number;
                                if (data.progress > 1) {
                                    percent = Math.round(data.progress);
                                } else {
                                    percent = Math.round((data.progress || 0) * 100);
                                }

                                progress.report({
                                    message: `Downloading Qwen1.5-0.5B: ${percent}%`,
                                    increment: data.progress
                                });
                            }
                        }
                    }
                );

                progress.report({ message: 'Model loaded successfully!' });
            });

            this.status = 'ready';
            console.log('[AIEngine] Initialized with Qwen1.5-0.5B-Chat');

        } catch (error) {
            this.status = 'error';
            console.error('[AIEngine] Initialization failed:', error);

            // 顯示錯誤訊息但不阻止延伸套件運作
            vscode.window.showWarningMessage(
                `Quick Prompt: AI model loading failed (${error instanceof Error ? error.message : String(error)}). Using fallback title generation.`
            );
        }
    }

    /**
     * 檢查 AI 引擎是否可用
     */
    isReady(): boolean {
        return this.status === 'ready' && this.generator !== null;
    }

    /**
     * 取得當前狀態
     */
    getStatus(): AIEngineStatus {
        return this.status;
    }

    /**
     * 生成文字摘要（用於自動生成標題）
     * 使用 Qwen2.5-0.5B-Instruct 配合 ChatML 格式
     * 
     * @param text 要摘要的文字
     * @param maxLength 最大長度（預設 50）
     * @returns 摘要文字
     */
    async summarize(text: string, maxLength: number = 50): Promise<string> {
        // 如果 AI 不可用，使用簡單降級策略
        if (!this.isReady()) {
            return this.simpleFallback(text);
        }

        try {
            // 截斷過長的輸入文字（避免 context 超限）
            const truncatedInput = text.length > 2000 ? text.substring(0, 2000) + '...' : text;

            // 使用 ChatML 格式的 Prompt
            const prompt = this.buildSummarizePrompt(truncatedInput);

            const result = await this.generator(prompt, {
                max_new_tokens: maxLength,
                do_sample: false,
                temperature: 0.1,
                return_full_text: false
            });

            // 提取生成的標題
            let title = result[0]?.generated_text?.trim() || '';


            // 清理輸出（移除可能的標點符號和多餘空白）
            title = this.cleanGeneratedTitle(title);

            // 如果生成失敗或品質不佳，使用簡單降級
            if (!title || title.length < 2 || title.length > maxLength * 2) {
                return this.simpleFallback(text);
            }

            return title;

        } catch (error) {
            console.error('[AIEngine] Summarization failed:', error);
            return this.simpleFallback(text);
        }
    }

    /**
     * 建立摘要用的 ChatML Prompt
     */
    private buildSummarizePrompt(text: string): string {
        // Qwen2.5 使用 ChatML 格式
        return `<|im_start|>system
你是一個專門生成簡短標題的助手。你的任務是為給定的文字生成一個簡潔、準確的標題。
規則：
- 標題必須在 50 字元以內
- 直接輸出標題，不要加任何前綴或說明
- 不要使用 Markdown 格式 (如 \`\`\`)
- 使用與原文相同的語言
<|im_end|>
<|im_start|>user
請為以下內容生成一個簡短標題：

${text}
<|im_end|>
<|im_start|>assistant
`;
    }

    /**
     * 清理 AI 生成的標題
     */
    private cleanGeneratedTitle(title: string): string {
        return title
            // 移除常見的前綴
            .replace(/^(標題[:：]|Title[:：]|Summary[:：])/i, '')
            // 移除 Markdown 代碼塊標記
            .replace(/```[\w]*\s */g, '')
            .replace(/```/g, '')
            // 移除引號
            .replace(/^["「『]|["」』]$/g, '')
            // 移除多餘的換行和空白
            .replace(/[\r\n]+/g, ' ')
            .trim();
    }

    /**
     * 簡單降級策略 - strip 後取前 10 字
     */
    private simpleFallback(text: string): string {
        // 移除換行、多餘空白，取前 10 個字元
        const cleaned = text.replace(/[\r\n]+/g, ' ').trim();
        const maxLen = 10;

        if (cleaned.length <= maxLen) {
            return cleaned;
        }

        return cleaned.substring(0, maxLen) + '...';
    }

    /**
     * 分類內容類型
     */
    classify(text: string): ContentClassification {
        const trimmed = text.trim();

        if (this.isJSON(trimmed)) return { type: 'json' };
        if (this.isMarkdown(trimmed)) return { type: 'markdown' };

        const codeResult = this.detectCode(trimmed);
        if (codeResult) return codeResult;

        return { type: 'text' };
    }

    private isJSON(text: string): boolean {
        try {
            JSON.parse(text);
            return text.startsWith('{') || text.startsWith('[');
        } catch {
            return false;
        }
    }

    private isMarkdown(text: string): boolean {
        const patterns = [
            /^#{1,6}\s+/m,
            /^\*\*.*\*\*/m,
            /^\s*[-*+]\s+/m,
            /^\s*\d+\.\s+/m,
            /^\s*```/m,
            /\[.*\]\(.*\)/
        ];
        return patterns.some(p => p.test(text));
    }

    private detectCode(text: string): ContentClassification | null {
        const languagePatterns: Record<string, RegExp[]> = {
            'javascript': [/\b(const|let|var|function|=>|async|await)\b/],
            'typescript': [/\b(interface|type|enum)\s+\w+/, /:\s*(string|number|boolean|any)\b/],
            'python': [/\b(def|class|import|from|if __name__)\b/, /^\s*@\w+/m],
            'java': [/\b(public|private|protected)\s+(class|interface|void|static)\b/],
            'html': [/^\s*<(!DOCTYPE|html|head|body|div)\b/im],
            'css': [/^\s*[.#]?\w+\s*\{/m],
            'sql': [/\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN)\b/i],
        };

        for (const [language, patterns] of Object.entries(languagePatterns)) {
            if (patterns.some(p => p.test(text))) {
                return { type: 'code', language };
            }
        }

        const codeIndicators = [/\bfunction\s+\w+\s*\(/, /\bclass\s+\w+/, /[{};]\s*$/m];
        if (codeIndicators.some(p => p.test(text))) {
            return { type: 'code' };
        }

        return null;
    }



    /**
     * 清除模型快取
     */
    async clearModelCache(): Promise<void> {
        try {
            const cacheDir = vscode.Uri.joinPath(
                vscode.Uri.file(process.env.HOME || process.env.USERPROFILE || ''),
                '.cache',
                'quickprompt-models'
            );

            await vscode.workspace.fs.delete(cacheDir, { recursive: true, useTrash: false });

            this.status = 'uninitialized';
            this.generator = null;

            // 重置初始化 Promise，這樣下次調用 initialize 時會重新觸發下載
            this.initPromise = null;

            console.log('[AIEngine] Model cache cleared');
        } catch (error) {
            console.error('[AIEngine] Failed to clear cache:', error);
            // 忽略文件不存在的錯誤
            if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                return;
            }
            throw error;
        }
    }

    /**
     * 釋放資源
     */
    dispose(): void {
        this.generator = null;
        this.status = 'uninitialized';
        AIEngine.instance = null;
    }
}

