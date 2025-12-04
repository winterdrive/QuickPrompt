import * as vscode from 'vscode';
import { PromptProvider } from './promptProvider';
import { PromptFileSystemProvider } from './promptFileSystem';
import { ClipboardManager } from './clipboardManager';
import { PromptHoverProvider } from './promptHoverProvider';
import { I18n } from './i18n';
import { registerPromptCommands, registerClipboardCommands } from './commands';

export async function activate(context: vscode.ExtensionContext) {
    // Initialize i18n
    await I18n.initialize(context);

    // Initialize providers
    const { promptProvider, clipboardManager } = initializeProviders(context);

    // Initialize file system
    const fileSystemProvider = initializeFileSystem(context, promptProvider);

    // Initialize hover provider
    initializeHoverProvider(context, promptProvider, clipboardManager);

    // Initialize status bar
    initializeStatusBar(context, clipboardManager);

    // Register all commands
    registerPromptCommands(context, promptProvider, clipboardManager, fileSystemProvider);
    registerClipboardCommands(context, promptProvider, clipboardManager, fileSystemProvider);

    // Setup cleanup
    setupCleanup(context, clipboardManager);
}

export function deactivate() { }

// ==================== Initialization Functions ====================

/**
 * Initialize core providers (PromptProvider and ClipboardManager)
 */
function initializeProviders(context: vscode.ExtensionContext) {
    const promptProvider = new PromptProvider(context);
    vscode.window.registerTreeDataProvider('promptSniperView', promptProvider);

    // 初始化 ClipboardManager
    const clipboardManager = new ClipboardManager(context);
    promptProvider.setClipboardManager(clipboardManager);

    // 註冊即時捕捉（監聽選取變化）
    clipboardManager.registerInstantCapture(context.subscriptions);

    return { promptProvider, clipboardManager };
}

/**
 * Initialize virtual file system provider
 */
function initializeFileSystem(
    context: vscode.ExtensionContext,
    promptProvider: PromptProvider
): PromptFileSystemProvider {
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

    return fileSystemProvider;
}

/**
 * Initialize hover provider for virtual files
 */
function initializeHoverProvider(
    context: vscode.ExtensionContext,
    promptProvider: PromptProvider,
    clipboardManager: ClipboardManager
): void {
    const hoverProvider = new PromptHoverProvider();

    context.subscriptions.push(
        vscode.languages.registerHoverProvider(
            { scheme: 'prompt-sniper', language: 'markdown' },
            hoverProvider
        )
    );

    // 初始化 HoverProvider 資料
    hoverProvider.updatePrompts(promptProvider.getPrompts());
    hoverProvider.updateClipboardHistory(clipboardManager.getHistory());

    // 當 Prompts 或剪貼簿歷史更新時，同步到 HoverProvider
    promptProvider.onPromptsChanged(() => {
        hoverProvider.updatePrompts(promptProvider.getPrompts());
    });

    clipboardManager.onHistoryChanged(() => {
        hoverProvider.updateClipboardHistory(clipboardManager.getHistory());
    });
}

/**
 * Initialize status bar item for clipboard
 */
function initializeStatusBar(
    context: vscode.ExtensionContext,
    clipboardManager: ClipboardManager
): void {
    const clipboardStatusBar = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    clipboardStatusBar.command = 'promptSniper.search'; // 點擊狀態列開啟搜尋
    clipboardStatusBar.text = '$(clippy)'; // 使用剪貼簿圖示
    context.subscriptions.push(clipboardStatusBar);

    // 更新狀態列顯示
    const updateStatusBar = () => {
        const history = clipboardManager.getHistory();
        if (history.length > 0) {
            const latest = history[0];
            // 僅顯示圖示，tooltip 顯示完整預覽
            clipboardStatusBar.text = '$(clippy)';
            clipboardStatusBar.tooltip = `📋 最新剪貼簿: ${latest.preview}\n點擊開啟 Quick Prompt 搜尋`;
            clipboardStatusBar.show();
        } else {
            clipboardStatusBar.hide();
        }
    };

    // 初始更新
    updateStatusBar();

    // 監聽剪貼簿歷史變化
    clipboardManager.onHistoryChanged(() => {
        updateStatusBar();
    });
}

/**
 * Setup cleanup handlers
 */
function setupCleanup(
    context: vscode.ExtensionContext,
    clipboardManager: ClipboardManager
): void {
    context.subscriptions.push({
        dispose: () => {
            clipboardManager.dispose();
        }
    });
}
