import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { PromptProvider, PromptItem } from './promptProvider';
import { PromptFileSystemProvider } from './promptFileSystem';
import { I18n } from './i18n';

export async function activate(context: vscode.ExtensionContext) {
    // Initialize i18n
    await I18n.initialize(context);

    const promptProvider = new PromptProvider(context);
    vscode.window.registerTreeDataProvider('promptSniperView', promptProvider);

    // 註冊虛擬檔案系統
    const fileSystemProvider = new PromptFileSystemProvider();
    context.subscriptions.push(
        vscode.workspace.registerFileSystemProvider('prompt-sniper', fileSystemProvider, {
            isCaseSensitive: true,
            isReadonly: false
        })
    );

    // 設定雙向綁定：FileSystem ↔ PromptProvider
    fileSystemProvider.setCallbacks(
        (id, content) => promptProvider.updatePromptContent(id, content),
        () => promptProvider.getPrompts()
    );

    // 當 PromptProvider 更新時，同步到 FileSystem
    promptProvider.onPromptsChanged(() => {
        fileSystemProvider.rebuildCache();
    });

    // 搜尋 Prompt
    context.subscriptions.push(
        vscode.commands.registerCommand('promptSniper.search', async () => {
            let prompts = promptProvider.getPrompts();

            // 排序：Pinned 優先
            prompts.sort((a, b) => {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                return 0;
            });

            const items = prompts.map(p => ({
                label: `${p.pinned ? I18n.getMessage('icon.pinned') : ''}${p.use_count >= 10 ? I18n.getMessage('icon.hot') : p.use_count >= 5 ? I18n.getMessage('icon.star') : p.use_count > 0 ? I18n.getMessage('icon.used') : I18n.getMessage('icon.unused')} ${p.title}`,
                detail: p.content,
                description: I18n.getMessage('status.useCount', p.use_count.toString()),
                prompt: p
            }));

            const result = await vscode.window.showQuickPick(items, {
                placeHolder: I18n.getMessage('message.searchPlaceholder'),
                matchOnDetail: true,
                matchOnDescription: true
            });

            if (result) {
                await vscode.env.clipboard.writeText(result.prompt.content);
                promptProvider.incrementUseCount(result.prompt.id);
                vscode.window.showInformationMessage(I18n.getMessage('message.copied', result.prompt.title));
            }
        })
    );

    // 複製 Prompt
    context.subscriptions.push(
        vscode.commands.registerCommand('promptSniper.insert', async (item: PromptItem) => {
            await vscode.env.clipboard.writeText(item.prompt.content);
            promptProvider.incrementUseCount(item.prompt.id);
            vscode.window.showInformationMessage(I18n.getMessage('message.copied', item.prompt.title));
        })
    );

    // 新增 Prompt - 智慧模式（支援 "標題::內容" 語法）
    context.subscriptions.push(
        vscode.commands.registerCommand('promptSniper.addPrompt', async () => {
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
                    title = content.split('\n')[0].substring(0, 30).trim();
                }
            } else {
                content = input;
                // 自動生成標題（取前 30 字或第一行）
                title = input.split('\n')[0].substring(0, 30).trim();
            }

            await promptProvider.addPrompt(title, content);
        })
    );

    // 新增 Prompt - Silent Capture (無干擾捕捉)
    context.subscriptions.push(
        vscode.commands.registerCommand('promptSniper.silentAdd', async () => {
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

            // 自動生成標題 (取前 30 字，去除換行)
            const autoTitle = selection.replace(/[\r\n]+/g, ' ').substring(0, 30).trim();

            // 直接儲存，並顯示通知 (silent=false)
            await promptProvider.addPromptWithOption(autoTitle, selection, false);
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
            promptProvider.togglePin(item);
        })
    );

    // 重新整理
    context.subscriptions.push(
        vscode.commands.registerCommand('promptSniper.refresh', () => {
            promptProvider.refresh();
            vscode.window.showInformationMessage(I18n.getMessage('message.refreshed'));
        })
    );

    // 編輯 Prompt (使用虛擬檔案系統)
    context.subscriptions.push(
        vscode.commands.registerCommand('promptSniper.editPrompt', async (item: PromptItem) => {
            if (!item || !item.prompt) return;

            // 使用虛擬檔案系統開啟 Prompt
            const uri = fileSystemProvider.getUriForPrompt(item.prompt.id);
            const doc = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(doc, {
                preview: false, // 不使用預覽模式，確保分頁不會被自動關閉
                preserveFocus: false
            });
        })
    );

}

export function deactivate() { }
