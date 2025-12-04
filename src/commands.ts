import * as vscode from 'vscode';
import { PromptProvider, PromptItem, ClipboardTreeItem } from './promptProvider';
import { ClipboardManager } from './clipboardManager';
import { PromptFileSystemProvider } from './promptFileSystem';
import { I18n } from './i18n';
import { getPromptQuickPickIcon, sortPrompts, generateAutoTitle, getRelativeTime } from './utils';

/**
 * Register all prompt-related commands
 */
export function registerPromptCommands(
    context: vscode.ExtensionContext,
    promptProvider: PromptProvider,
    clipboardManager: ClipboardManager,
    fileSystemProvider: PromptFileSystemProvider
): void {
    // 搜尋 Prompt（整合剪貼簿歷史）
    context.subscriptions.push(
        vscode.commands.registerCommand('promptSniper.search', async () => {
            await handleSearch(promptProvider, clipboardManager);
        })
    );

    // 複製 Prompt
    context.subscriptions.push(
        vscode.commands.registerCommand('promptSniper.insert', async (item: PromptItem) => {
            await handleInsertPrompt(item, promptProvider);
        })
    );

    // 新增 Prompt - 智慧模式（支援 "標題::內容" 語法）
    context.subscriptions.push(
        vscode.commands.registerCommand('promptSniper.addPrompt', async () => {
            await handleAddPrompt(promptProvider);
        })
    );

    // 新增 Prompt - Silent Capture (無干擾捕捉)
    context.subscriptions.push(
        vscode.commands.registerCommand('promptSniper.silentAdd', async () => {
            await handleSilentAdd(promptProvider);
        })
    );

    // 刪除 Prompt
    context.subscriptions.push(
        vscode.commands.registerCommand('promptSniper.deletePrompt', async (item: PromptItem) => {
            await promptProvider.deletePrompt(item);
        })
    );

    // 釘選/取消釘選 Prompt
    context.subscriptions.push(
        vscode.commands.registerCommand('promptSniper.togglePin', async (item: PromptItem) => {
            await promptProvider.togglePin(item);
        })
    );

    // 重新整理
    context.subscriptions.push(
        vscode.commands.registerCommand('promptSniper.refresh', async () => {
            await promptProvider.refresh();
            vscode.window.showInformationMessage(I18n.getMessage('message.refreshed'));
        })
    );

    // 編輯 Prompt (使用虛擬檔案系統)
    context.subscriptions.push(
        vscode.commands.registerCommand('promptSniper.editPrompt', async (item: PromptItem) => {
            await handleEditPrompt(item, fileSystemProvider);
        })
    );

    // 上移 Prompt
    context.subscriptions.push(
        vscode.commands.registerCommand('promptSniper.moveUp', async (item: PromptItem) => {
            await promptProvider.moveUp(item);
        })
    );

    // 下移 Prompt
    context.subscriptions.push(
        vscode.commands.registerCommand('promptSniper.moveDown', async (item: PromptItem) => {
            await promptProvider.moveDown(item);
        })
    );
}

/**
 * Register all clipboard-related commands
 */
export function registerClipboardCommands(
    context: vscode.ExtensionContext,
    promptProvider: PromptProvider,
    clipboardManager: ClipboardManager,
    fileSystemProvider: PromptFileSystemProvider
): void {
    // 複製剪貼簿歷史項目
    context.subscriptions.push(
        vscode.commands.registerCommand('promptSniper.copyClipboardItem', async (item: ClipboardTreeItem) => {
            await handleCopyClipboardItem(item);
        })
    );

    // 固定剪貼簿項目到 Prompts（無需輸入標題，靜默模式）
    context.subscriptions.push(
        vscode.commands.registerCommand('promptSniper.pinClipboardItem', async (item: ClipboardTreeItem) => {
            await handlePinClipboardItem(item, promptProvider, clipboardManager);
        })
    );

    // 編輯剪貼簿項目（自動轉為永久 Prompt）
    context.subscriptions.push(
        vscode.commands.registerCommand('promptSniper.editClipboardItem', async (item: ClipboardTreeItem) => {
            await handleEditClipboardItem(item, promptProvider, clipboardManager, fileSystemProvider);
        })
    );

    // 從歷史移除剪貼簿項目
    context.subscriptions.push(
        vscode.commands.registerCommand('promptSniper.removeClipboardItem', async (item: ClipboardTreeItem) => {
            await handleRemoveClipboardItem(item, clipboardManager);
        })
    );

    // 清空剪貼簿歷史
    context.subscriptions.push(
        vscode.commands.registerCommand('promptSniper.clearClipboardHistory', async () => {
            await handleClearClipboardHistory(clipboardManager);
        })
    );
}

// ==================== Command Handlers ====================

/**
 * Handle search command - unified search for prompts and clipboard history
 */
async function handleSearch(
    promptProvider: PromptProvider,
    clipboardManager: ClipboardManager
): Promise<void> {
    const prompts = promptProvider.getPrompts();
    const clipboardHistory = clipboardManager.getHistory();

    interface QuickPickItemWithType extends vscode.QuickPickItem {
        type: 'prompt' | 'clipboard';
        data: any;
    }

    const items: QuickPickItemWithType[] = [];

    // 1. 我的 Prompts（Pinned 優先）
    if (prompts.length > 0) {
        items.push({
            label: '$(bookmark) 我的 Prompts',
            kind: vscode.QuickPickItemKind.Separator,
            type: 'prompt',
            data: null
        } as any);

        const sorted = sortPrompts(prompts);
        sorted.forEach(p => {
            const icon = getPromptQuickPickIcon(p);
            items.push({
                label: `${icon} ${p.title}`,
                description: '',
                detail: `使用 ${p.use_count} 次 (${p.content.length} 字元)`,
                type: 'prompt',
                data: p
            });
        });
    }

    // 2. 剪貼簿歷史（最近的放後面）
    if (clipboardHistory.length > 0) {
        items.push({
            label: '$(history) 剪貼簿歷史',
            kind: vscode.QuickPickItemKind.Separator,
            type: 'prompt',
            data: null
        } as any);

        clipboardHistory.slice(0, 10).forEach(item => {
            const relativeTime = getRelativeTime(item.timestamp);
            items.push({
                label: `$(clock) ${item.preview}`,
                description: '',
                detail: `${relativeTime} (${item.length} 字元)`,
                type: 'clipboard',
                data: item
            });
        });
    }

    const result = await vscode.window.showQuickPick(items, {
        placeHolder: '搜尋 Prompt 或剪貼簿歷史...',
        matchOnDetail: true,
        matchOnDescription: true
    });

    if (result && result.data) {
        if (result.type === 'clipboard') {
            // 剪貼簿項目
            await vscode.env.clipboard.writeText(result.data.content);
            vscode.window.setStatusBarMessage(`✅ 已複製: ${result.data.preview}`, 2000);
        } else if (result.type === 'prompt') {
            // Prompt 項目
            await vscode.env.clipboard.writeText(result.data.content);
            await promptProvider.incrementUseCount(result.data.id);
            vscode.window.showInformationMessage(I18n.getMessage('message.copied', result.data.title));
        }
    }
}

/**
 * Handle insert prompt command
 */
async function handleInsertPrompt(item: PromptItem, promptProvider: PromptProvider): Promise<void> {
    await vscode.env.clipboard.writeText(item.prompt.content);
    await promptProvider.incrementUseCount(item.prompt.id);
    vscode.window.showInformationMessage(I18n.getMessage('message.copied', item.prompt.title));
}

/**
 * Handle add prompt command with smart parsing
 */
async function handleAddPrompt(promptProvider: PromptProvider): Promise<void> {
    const input = await vscode.window.showInputBox({
        prompt: I18n.getMessage('input.addPromptPrompt'),
        placeHolder: I18n.getMessage('input.addPromptPlaceholder'),
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return I18n.getMessage('input.contentRequired');
            }
            return null;
        }
    });

    if (!input) {
        return;
    }

    // 智慧解析：支援 "標題::內容" 格式
    let title: string, content: string;
    if (input.includes('::')) {
        const parts = input.split('::', 2);
        title = parts[0].trim();
        content = parts[1].trim();

        // 如果標題為空，使用自動生成
        if (!title) {
            title = generateAutoTitle(content);
        }
    } else {
        content = input;
        // 自動生成標題
        title = generateAutoTitle(input);
    }

    await promptProvider.addPrompt(title, content);
}

/**
 * Handle silent add command
 */
async function handleSilentAdd(promptProvider: PromptProvider): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage(I18n.getMessage('message.pleaseSelectText'));
        return;
    }

    const selection = editor.document.getText(editor.selection);
    if (!selection || selection.trim().length === 0) {
        vscode.window.showWarningMessage(I18n.getMessage('message.pleaseSelectText'));
        return;
    }

    // 自動生成標題
    const autoTitle = generateAutoTitle(selection);

    // 直接儲存，並顯示通知 (silent=false)
    await promptProvider.addPromptWithOption(autoTitle, selection, false);
}

/**
 * Handle edit prompt command
 */
async function handleEditPrompt(
    item: PromptItem,
    fileSystemProvider: PromptFileSystemProvider
): Promise<void> {
    if (!item || !item.prompt) return;

    // 使用虛擬檔案系統開啟 Prompt
    const uri = fileSystemProvider.getUriForPrompt(item.prompt.id);
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, {
        preview: false, // 不使用預覽模式，確保分頁不會被自動關閉
        preserveFocus: false
    });
}

/**
 * Handle copy clipboard item command
 */
async function handleCopyClipboardItem(item: ClipboardTreeItem): Promise<void> {
    if (!item || !item.item) return;

    await vscode.env.clipboard.writeText(item.item.content);
    vscode.window.showInformationMessage(`✅ 已複製: ${item.item.preview}`);
}

/**
 * Handle pin clipboard item command
 */
async function handlePinClipboardItem(
    item: ClipboardTreeItem,
    promptProvider: PromptProvider,
    clipboardManager: ClipboardManager
): Promise<void> {
    if (!item || !item.item) return;

    // 直接使用預覽文字作為標題
    const title = generateAutoTitle(item.item.preview);

    // 使用 silent 模式，避免彈出通知
    await promptProvider.addPromptWithOption(title, item.item.content, true);
    clipboardManager.removeFromHistory(item.item.id);
    vscode.window.setStatusBarMessage(`✅ 已固定: ${title}`, 2000);
}

/**
 * Handle edit clipboard item command
 */
async function handleEditClipboardItem(
    item: ClipboardTreeItem,
    promptProvider: PromptProvider,
    clipboardManager: ClipboardManager,
    fileSystemProvider: PromptFileSystemProvider
): Promise<void> {
    if (!item || !item.item) return;

    // 自動轉為 Prompt（使用預覽作為標題，靜默模式）
    const title = generateAutoTitle(item.item.preview);
    await promptProvider.addPromptWithOption(title, item.item.content, true);
    clipboardManager.removeFromHistory(item.item.id);

    // 找到剛新增的 Prompt 並開啟編輯
    const prompts = promptProvider.getPrompts();
    const newPrompt = prompts[prompts.length - 1]; // 最新的一個

    if (newPrompt) {
        const uri = fileSystemProvider.getUriForPrompt(newPrompt.id);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, {
            preview: false,
            preserveFocus: false
        });
    }
}

/**
 * Handle remove clipboard item command
 */
async function handleRemoveClipboardItem(
    item: ClipboardTreeItem,
    clipboardManager: ClipboardManager
): Promise<void> {
    if (!item || !item.item) return;

    clipboardManager.removeFromHistory(item.item.id);
    vscode.window.setStatusBarMessage(I18n.getMessage('message.clipboardItemRemoved'), 3000);
}

/**
 * Handle clear clipboard history command
 */
async function handleClearClipboardHistory(clipboardManager: ClipboardManager): Promise<void> {
    const confirm = await vscode.window.showWarningMessage(
        I18n.getMessage('confirm.clearClipboardHistory'),
        { modal: true },
        I18n.getMessage('confirm.yes')
    );

    if (confirm === I18n.getMessage('confirm.yes')) {
        clipboardManager.clearHistory();
        vscode.window.showInformationMessage(I18n.getMessage('message.clipboardHistoryCleared'));
    }
}
