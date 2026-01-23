import * as vscode from 'vscode';

/**
 * 根據使用者設定，在執行操作前提示確認。
 * 
 * @param message 要顯示的確認訊息
 * @param confirmButtonLabel 確認按鈕的標籤
 * @param action 如果確認則執行的動作
 * @param configKey 要檢查的配置鍵名 (預設為 'quickPrompt.confirmBeforeDelete')
 */
export async function executeWithConfirmation(
    message: string,
    confirmButtonLabel: string,
    action: () => void | Promise<void>,
    configKey: string = 'quickPrompt.confirmBeforeDelete'
): Promise<void> {
    const config = vscode.workspace.getConfiguration();
    const shouldConfirm = config.get<boolean>(configKey, true);

    if (!shouldConfirm) {
        await action();
        return;
    }

    const choice = await vscode.window.showWarningMessage(
        message,
        { modal: true },
        confirmButtonLabel
    );

    if (choice === confirmButtonLabel) {
        await action();
    }
}
