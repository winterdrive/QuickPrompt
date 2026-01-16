import * as vscode from 'vscode';
import { I18n } from './i18n';
import { ClipboardManager } from './clipboardManager';
import {
    getPromptIcon,
    sortPrompts,
    generateAutoTitle,
    generatePromptId,
    getDaysSince,
    formatRelativeTime,
    getTodayISOString,
    getRelativeTime
} from './utils';

export interface Prompt {
    id: string;
    title: string;
    content: string;
    use_count: number;        // 使用次數
    last_used: string;        // 最後使用時間
    created_at: string;       // 建立時間
    pinned?: boolean;         // 是否釘選
    order?: number;           // 手動排序順序
    titleSource?: 'user' | 'ai';  // 標題來源
}

// 基礎 TreeItem 類型 (PromptProvider 只處理 PromptItem)
export type PromptTreeItem = PromptItem;

export class PromptProvider implements vscode.TreeDataProvider<PromptTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PromptTreeItem | undefined | null | void> = new vscode.EventEmitter<PromptTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PromptTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    // 新增：Prompts 資料變更事件（用於同步到 FileSystem）
    private _onPromptsChanged: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    readonly onPromptsChanged: vscode.Event<void> = this._onPromptsChanged.event;

    private prompts: Prompt[] = [];
    private promptsFilePath: string;
    private clipboardManager?: ClipboardManager;

    constructor(private context: vscode.ExtensionContext) {
        // 使用工作區路徑而非擴充功能路徑
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const vscodeDir = vscode.Uri.joinPath(workspaceFolders[0].uri, '.vscode');
            this.promptsFilePath = vscode.Uri.joinPath(vscodeDir, 'prompts.json').fsPath;
        } else {
            // 如果沒有工作區，使用擴充功能路徑作為備用
            this.promptsFilePath = vscode.Uri.joinPath(context.extensionUri, 'prompts.json').fsPath;
        }
        // 初始化時載入 prompts（但不阻塞）
        this.loadPrompts().catch(err => {
            console.error('Failed to load prompts:', err);
        });
    }

    /**
     * 設定 ClipboardManager 引用
     */
    setClipboardManager(manager: ClipboardManager) {
        this.clipboardManager = manager;

        // 監聽剪貼簿歷史變化
        manager.onHistoryChanged(() => {
            this.refresh();
        });
    }

    async refresh(): Promise<void> {
        await this.loadPrompts();
        this._onDidChangeTreeData.fire();
    }

    private async loadPrompts(): Promise<void> {
        try {
            const uri = vscode.Uri.file(this.promptsFilePath);
            const content = await vscode.workspace.fs.readFile(uri);
            let prompts = JSON.parse(content.toString());

            // 自動遷移：移除舊欄位 (status)，補齊新欄位
            let needsMigration = false;
            prompts = prompts.map((p: any) => {
                // 檢查是否有舊欄位
                if ('status' in p) {
                    needsMigration = true;
                }

                const today = getTodayISOString();
                return {
                    id: p.id,
                    title: p.title,
                    content: p.content,
                    use_count: p.use_count ?? 0,
                    last_used: p.last_used || today,
                    created_at: p.created_at || p.last_used || today,
                    pinned: p.pinned ?? false,
                    titleSource: p.titleSource,
                    order: p.order
                };
            });

            this.prompts = prompts;

            // 如果有遷移,自動儲存清理後的資料(靜默模式)
            if (needsMigration) {
                await this.savePrompts();
            }
        } catch (error: any) {
            if (error.code === 'FileNotFound') {
                // 檔案不存在時，建立預設檔案
                await this.createDefaultPromptsFile();
            } else {
                console.error('Failed to load prompts:', error);
                throw error;
            }
        }
    }

    private async createDefaultPromptsFile(): Promise<void> {
        const today = getTodayISOString();
        const defaultPrompts: Prompt[] = [
            {
                id: "001",
                title: "範例 Prompt",
                content: "這是一個範例 Prompt。您可以編輯 .vscode/prompts.json 來新增更多 Prompt。",
                use_count: 0,
                last_used: today,
                created_at: today,
                pinned: false
            }
        ];

        try {
            const uri = vscode.Uri.file(this.promptsFilePath);
            const dirUri = vscode.Uri.file(vscode.Uri.joinPath(uri, '..').fsPath);

            // 確保 .vscode 目錄存在
            await vscode.workspace.fs.createDirectory(dirUri);

            // 建立預設檔案
            const content = JSON.stringify(defaultPrompts, null, 2);
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
            this.prompts = defaultPrompts;

            vscode.window.showInformationMessage(`✨ 已在 ${this.promptsFilePath} 建立預設 Prompt 檔案`);
        } catch (error) {
            console.error('Failed to create default prompts file:', error);
            throw error;
        }
    }

    getTreeItem(element: PromptTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: PromptTreeItem): Thenable<PromptTreeItem[]> {
        // 直接返回 Prompts 列表（不再使用分組）
        if (!element) {
            // 排序：Pinned 在前，然後按最後使用時間排序
            const sorted = sortPrompts(this.prompts);
            return Promise.resolve(sorted.map(p => new PromptItem(p)));
        }

        return Promise.resolve([]);
    }

    private async savePrompts(): Promise<void> {
        try {
            const uri = vscode.Uri.file(this.promptsFilePath);
            const content = JSON.stringify(this.prompts, null, 2);
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
            this._onPromptsChanged.fire(); // 通知 FileSystem 同步
        } catch (error) {
            console.error('Failed to save prompts:', error);
            throw error;
        }
    }

    getPrompts(): Prompt[] {
        return this.prompts;
    }

    async addPrompt(title: string, content: string, titleSource?: 'user' | 'ai') {
        await this.addPromptWithOption(title, content, false, titleSource);
    }

    // 重構 addPrompt 以支援 silent 模式
    async addPromptWithOption(
        title: string,
        content: string,
        silent: boolean = false,
        titleSource?: 'user' | 'ai'
    ): Promise<void> {
        const today = getTodayISOString();
        const newId = generatePromptId(this.prompts);
        const newPrompt: Prompt = {
            id: newId,
            title,
            content,
            use_count: 0,
            last_used: today,
            created_at: today,
            pinned: false,
            titleSource
        };
        this.prompts.push(newPrompt);
        await this.savePrompts();
        await this.refresh();

        if (!silent) {
            vscode.window.showInformationMessage(I18n.getMessage('message.promptAdded', title));
        } else {
            vscode.window.setStatusBarMessage(`✅ Prompt Saved: ${title}`, 3000);
        }
    }

    // 增加使用次數
    async incrementUseCount(promptId: string): Promise<void> {
        const prompt = this.prompts.find(p => p.id === promptId);
        if (prompt) {
            prompt.use_count++;
            prompt.last_used = getTodayISOString();
            await this.savePrompts();
            await this.refresh();
        }
    }

    async deletePrompt(item: PromptItem): Promise<void> {
        const index = this.prompts.findIndex(p => p.id === item.prompt.id);
        if (index !== -1) {
            this.prompts.splice(index, 1);
            await this.savePrompts();
            await this.refresh();
            vscode.window.setStatusBarMessage(I18n.getMessage('message.promptDeleted', item.prompt.title), 2000);
        }
    }

    async togglePin(item: PromptItem): Promise<void> {
        const prompt = this.prompts.find(p => p.id === item.prompt.id);
        if (prompt) {
            prompt.pinned = !prompt.pinned;
            await this.savePrompts();
            await this.refresh();
        }
    }

    async updatePromptContent(id: string, content: string): Promise<void> {
        const prompt = this.prompts.find(p => p.id === id);
        if (prompt) {
            prompt.content = content;
            await this.savePrompts();
            await this.refresh(); // Optional: might not need full refresh if we just update content
        }
    }

    async updatePromptTitle(id: string, title: string): Promise<void> {
        const prompt = this.prompts.find(p => p.id === id);
        if (prompt) {
            prompt.title = title;
            await this.savePrompts();
            await this.refresh();
        }
    }

    // 上移 Prompt
    async moveUp(item: PromptItem): Promise<void> {
        const index = this.prompts.findIndex(p => p.id === item.prompt.id);
        if (index > 0) {
            // 交換位置
            [this.prompts[index - 1], this.prompts[index]] = [this.prompts[index], this.prompts[index - 1]];

            // 更新 order 欄位
            this.prompts.forEach((p, i) => p.order = i);

            await this.savePrompts();
            await this.refresh();
            vscode.window.setStatusBarMessage(`✅ 已上移: ${item.prompt.title}`, 2000);
        }
    }

    // 下移 Prompt
    async moveDown(item: PromptItem): Promise<void> {
        const index = this.prompts.findIndex(p => p.id === item.prompt.id);
        if (index < this.prompts.length - 1 && index !== -1) {
            // 交換位置
            [this.prompts[index], this.prompts[index + 1]] = [this.prompts[index + 1], this.prompts[index]];

            // 更新 order 欄位
            this.prompts.forEach((p, i) => p.order = i);

            await this.savePrompts();
            await this.refresh();
            vscode.window.setStatusBarMessage(`✅ 已下移: ${item.prompt.title}`, 2000);
        }
    }
}

export class PromptItem extends vscode.TreeItem {
    constructor(public readonly prompt: Prompt) {
        super(prompt.title, vscode.TreeItemCollapsibleState.None);

        // 計算相對時間
        const timeText = formatRelativeTime(prompt.last_used);

        this.tooltip = `${prompt.content}\n\n${I18n.getMessage('status.useCount', prompt.use_count.toString())}\n${I18n.getMessage('status.lastUsed', timeText)}`;
        this.description = I18n.getMessage('status.useCount', prompt.use_count.toString());

        // 根據使用次數設定圖示
        this.iconPath = getPromptIcon(prompt);
        this.contextValue = 'promptItem';

        this.command = {
            command: 'promptSniper.insert',
            title: 'Copy Prompt',
            arguments: [this]
        };
    }


}
