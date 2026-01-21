import { parentPort } from 'worker_threads';

// Global variables
let generator: any = null;
let status = 'uninitialized';

// AI Config
const MODEL_CONFIG = {
    primary: 'Xenova/Qwen1.5-0.5B-Chat',
};

if (!parentPort) {
    throw new Error('This module must be run as a worker thread');
}

// Handle messages from the main thread
parentPort.on('message', async (message: any) => {
    try {
        switch (message.command) {
            case 'init':
                await initialize(message.cacheDir);
                break;
            case 'summarize':
                await summarize(message.text, message.maxLength, message.requestId);
                break;
            case 'dispose':
                process.exit(0);
                break;
            default:
                console.warn('[AI Worker] Unknown command:', message.command);
        }
    } catch (error: any) {
        parentPort?.postMessage({
            type: 'error',
            error: error.message || String(error)
        });
    }
});

/**
 * Initialize the AI model
 */
async function initialize(cacheDir?: string) {
    if (status === 'ready') {
        parentPort?.postMessage({ type: 'status', status: 'ready' });
        return;
    }

    try {
        status = 'initializing';
        parentPort?.postMessage({ type: 'status', status: 'initializing' });

        // Import transformers dynamically
        const { pipeline, env } = await import('@xenova/transformers');

        // Set cache directory
        if (cacheDir) {
            env.cacheDir = cacheDir;
        }

        // Initialize pipeline
        generator = await pipeline(
            'text-generation',
            MODEL_CONFIG.primary,
            {
                progress_callback: (data: any) => {
                    if (data.status === 'progress') {
                        // Normalize progress 0-100
                        let percent: number;
                        if (data.progress > 1) {
                            percent = Math.round(data.progress);
                        } else {
                            percent = Math.round((data.progress || 0) * 100);
                        }

                        parentPort?.postMessage({
                            type: 'progress',
                            message: `Downloading Qwen1.5-0.5B: ${percent}%`,
                            progress: data.progress
                        });
                    }
                }
            }
        );

        status = 'ready';
        parentPort?.postMessage({ type: 'status', status: 'ready' });
        // console.log('[AI Worker] Model initialized successfully');

    } catch (error) {
        status = 'error';
        throw error;
    }
}

/**
 * Generate summary
 */
async function summarize(text: string, maxLength: number = 50, requestId: number) {
    if (!generator) {
        throw new Error('AI model not initialized');
    }

    try {
        // Truncate input to avoid context limit
        const truncatedInput = text.length > 2000 ? text.substring(0, 2000) + '...' : text;
        const prompt = buildSummarizePrompt(truncatedInput);

        const result = await generator(prompt, {
            max_new_tokens: maxLength,
            do_sample: false,
            temperature: 0.1,
            return_full_text: false
        });

        const generatedText = result[0]?.generated_text?.trim() || '';
        const title = cleanGeneratedTitle(generatedText);

        parentPort?.postMessage({
            type: 'result',
            requestId: requestId,
            title: title
        });

    } catch (error) {
        throw error;
    }
}

/**
 * Build ChatML prompt
 */
function buildSummarizePrompt(text: string): string {
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
 * Clean generated title
 */
function cleanGeneratedTitle(title: string): string {
    return title
        .replace(/^(標題[:：]|Title[:：]|Summary[:：])/i, '')
        .replace(/```[\w]*\s */g, '')
        .replace(/```/g, '')
        .replace(/^["「『]|["」』]$/g, '')
        .replace(/[\r\n]+/g, ' ')
        .trim();
}
