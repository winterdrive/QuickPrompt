import * as vscode from 'vscode';

export interface TitleInputOptions {
    initialTitle: string;
    placeholder?: string;
    prompt?: string;
}

/**
 * 標題輸入管理器
 * 負責顯示標題輸入框並處理 AI 標題更新 (靜默替換 + 可撤銷通知)
 */
export class TitleInputManager {
    private currentInput: vscode.InputBox | null = null;
    private originalFallbackTitle: string = '';

    /**
     * 顯示標題輸入框
     */
    async showTitleInput(options: TitleInputOptions): Promise<string | undefined> {
        this.originalFallbackTitle = options.initialTitle;

        return new Promise((resolve) => {
            this.currentInput = vscode.window.createInputBox();
            this.currentInput.title = options.prompt || '輸入標題';
            this.currentInput.placeholder = options.placeholder || '標題...';
            this.currentInput.value = options.initialTitle;
            this.currentInput.prompt = '💡 AI 正在背景生成更好的標題...';

            // 監聽確認
            this.currentInput.onDidAccept(() => {
                const result = this.currentInput?.value;
                this.currentInput?.dispose();
                this.currentInput = null;
                resolve(result);
            });

            // 監聽取消
            this.currentInput.onDidHide(() => {
                this.currentInput?.dispose();
                this.currentInput = null;
                resolve(undefined);
            });

            this.currentInput.show();
        });
    }

    /**
     * 更新標題建議 (AI 生成完成後呼叫)
     * 靜默替換 + 顯示可撤銷通知
     */
    async updateTitleSuggestion(aiTitle: string, fallbackTitle: string): Promise<void> {
        if (!this.currentInput) {
            console.log('[TitleInput] 輸入框已關閉，跳過更新');
            return; // 使用者已關閉輸入框
        }

        // 1. 靜默替換標題
        this.replaceTitleSilently(aiTitle);

        // 2. 顯示可撤銷通知
        this.showUndoNotification(aiTitle, fallbackTitle);
    }

    /**
     * 靜默替換標題
     */
    private replaceTitleSilently(newTitle: string): void {
        if (!this.currentInput) return;

        this.currentInput.value = newTitle;
        this.currentInput.prompt = '✨ AI 已優化標題 (可在通知中回復)';

        console.log(`[TitleInput] 已替換標題: "${newTitle}"`);
    }

    /**
     * 顯示可撤銷通知
     * 使用狀態列訊息 + 通知，確保使用者有足夠時間操作
     */
    private async showUndoNotification(aiTitle: string, fallbackTitle: string): Promise<void> {
        // 截斷標題以避免通知過長
        const displayTitle = aiTitle.length > 30
            ? aiTitle.substring(0, 30) + '...'
            : aiTitle;

        // 顯示狀態列訊息 (持續 15 秒)
        const statusBarDisposable = vscode.window.setStatusBarMessage(
            `✨ AI 已優化標題: "${displayTitle}"`,
            15000
        );

        // 顯示通知 (不會自動消失，直到使用者操作或關閉)
        const choice = await vscode.window.showInformationMessage(
            `✨ AI 已優化標題: "${displayTitle}"`,
            { modal: false },
            '回復原標題',
            '保持 AI 標題'
        );

        // 清除狀態列訊息
        statusBarDisposable.dispose();

        if (choice === '回復原標題' && this.currentInput) {
            this.currentInput.value = fallbackTitle;
            this.currentInput.prompt = '已回復為原始標題';
            console.log(`[TitleInput] 已回復為 Fallback: "${fallbackTitle}"`);
        } else if (choice === '保持 AI 標題') {
            // 使用者明確選擇保持，無需操作
            console.log(`[TitleInput] 使用者選擇保持 AI 標題`);
        }
    }

    /**
     * 關閉輸入框
     */
    dispose(): void {
        this.currentInput?.dispose();
        this.currentInput = null;
    }
}
