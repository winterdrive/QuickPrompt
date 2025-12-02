import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { I18n } from './i18n';

export interface Prompt {
    id: string;
    title: string;
    content: string;
    use_count: number;        // 使用次數
    last_used: string;        // 最後使用時間
    created_at: string;       // 建立時間
    pinned?: boolean;         // 是否釘選
}

export class PromptProvider implements vscode.TreeDataProvider<PromptItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PromptItem | undefined | null | void> = new vscode.EventEmitter<PromptItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PromptItem | undefined | null | void> = this._onDidChangeTreeData.event;

    // 新增：Prompts 資料變更事件（用於同步到 FileSystem）
    private _onPromptsChanged: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    readonly onPromptsChanged: vscode.Event<void> = this._onPromptsChanged.event;

    private prompts: Prompt[] = [];
    private promptsFilePath: string;

    constructor(private context: vscode.ExtensionContext) {
        // 使用工作區路徑而非擴充功能路徑
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const vscodeDir = path.join(workspaceFolders[0].uri.fsPath, '.vscode');
            this.promptsFilePath = path.join(vscodeDir, 'prompts.json');
        } else {
            // 如果沒有工作區，使用擴充功能路徑作為備用
            this.promptsFilePath = path.join(context.extensionPath, 'prompts.json');
        }
        this.loadPrompts();
    }

    refresh(): void {
        this.loadPrompts();
        this._onDidChangeTreeData.fire();
    }

    private loadPrompts() {
        if (fs.existsSync(this.promptsFilePath)) {
            const content = fs.readFileSync(this.promptsFilePath, 'utf8');
            let prompts = JSON.parse(content);

            // 自動遷移：移除舊欄位 (status)，補齊新欄位
            let needsMigration = false;
            prompts = prompts.map((p: any) => {
                // 檢查是否有舊欄位
                if ('status' in p) {
                    needsMigration = true;
                }

                return {
                    id: p.id,
                    title: p.title,
                    content: p.content,
                    use_count: p.use_count ?? 0,
                    last_used: p.last_used || new Date().toISOString().split('T')[0],
                    created_at: p.created_at || p.last_used || new Date().toISOString().split('T')[0],
                    pinned: p.pinned ?? false
                };
            });

            this.prompts = prompts;

            // 如果有遷移，自動儲存清理後的資料
            if (needsMigration) {
                this.savePrompts();
                vscode.window.showInformationMessage('✨ 已自動更新 Prompt 資料格式');
            }
        } else {
            // 檔案不存在時，建立預設檔案
            this.createDefaultPromptsFile();
        }
    }

    private createDefaultPromptsFile() {
        const today = new Date().toISOString().split('T')[0];
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

        // 確保 .vscode 目錄存在
        const dir = path.dirname(this.promptsFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // 建立預設檔案
        fs.writeFileSync(this.promptsFilePath, JSON.stringify(defaultPrompts, null, 2), 'utf8');
        this.prompts = defaultPrompts;

        vscode.window.showInformationMessage(`✨ 已在 ${this.promptsFilePath} 建立預設 Prompt 檔案`);
    }

    getTreeItem(element: PromptItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: PromptItem): Thenable<PromptItem[]> {
        if (element) {
            return Promise.resolve([]);
        } else {
            // 排序：Pinned 在前，然後按最後使用時間排序
            const sortedPrompts = [...this.prompts].sort((a, b) => {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                // 如果 Pinned 狀態相同，則按最後使用時間排序 (新的在前)
                return new Date(b.last_used).getTime() - new Date(a.last_used).getTime();
            });
            return Promise.resolve(sortedPrompts.map(p => new PromptItem(p)));
        }
    }

    private savePrompts() {
        fs.writeFileSync(this.promptsFilePath, JSON.stringify(this.prompts, null, 2), 'utf8');
        this._onPromptsChanged.fire(); // 通知 FileSystem 同步
    }

    getPrompts(): Prompt[] {
        return this.prompts;
    }

    async addPrompt(title: string, content: string) {
        await this.addPromptWithOption(title, content, false);
    }

    // 重構 addPrompt 以支援 silent 模式
    async addPromptWithOption(title: string, content: string, silent: boolean = false) {
        const today = new Date().toISOString().split('T')[0];
        const newId = (Math.max(0, ...this.prompts.map(p => parseInt(p.id) || 0)) + 1).toString().padStart(3, '0');
        const newPrompt: Prompt = {
            id: newId,
            title,
            content,
            use_count: 0,
            last_used: today,
            created_at: today,
            pinned: false
        };
        this.prompts.push(newPrompt);
        this.savePrompts();
        this.refresh();

        if (!silent) {
            vscode.window.showInformationMessage(I18n.getMessage('message.promptAdded', title));
        } else {
            vscode.window.setStatusBarMessage(`✅ Prompt Saved: ${title}`, 3000);
        }
    }

    // 增加使用次數
    incrementUseCount(promptId: string) {
        const prompt = this.prompts.find(p => p.id === promptId);
        if (prompt) {
            prompt.use_count++;
            prompt.last_used = new Date().toISOString().split('T')[0];
            this.savePrompts();
            this.refresh();
        }
    }

    async deletePrompt(item: PromptItem) {
        const index = this.prompts.findIndex(p => p.id === item.prompt.id);
        if (index !== -1) {
            const confirm = await vscode.window.showWarningMessage(
                I18n.getMessage('confirm.deletePrompt', item.prompt.title),
                { modal: true },
                I18n.getMessage('confirm.yes')
            );

            if (confirm === I18n.getMessage('confirm.yes')) {
                this.prompts.splice(index, 1);
                this.savePrompts();
                this.refresh();
                vscode.window.showInformationMessage(I18n.getMessage('message.promptDeleted', item.prompt.title));
            }
        }
    }

    togglePin(item: PromptItem) {
        const prompt = this.prompts.find(p => p.id === item.prompt.id);
        if (prompt) {
            prompt.pinned = !prompt.pinned;
            this.savePrompts();
            this.refresh();
        }
    }

    updatePromptContent(id: string, content: string) {
        const prompt = this.prompts.find(p => p.id === id);
        if (prompt) {
            prompt.content = content;
            this.savePrompts();
            this.refresh(); // Optional: might not need full refresh if we just update content
        }
    }
}

export class PromptItem extends vscode.TreeItem {
    constructor(public readonly prompt: Prompt) {
        super(prompt.title, vscode.TreeItemCollapsibleState.None);

        // 計算相對時間
        const daysSinceUsed = this.getDaysSince(prompt.last_used);
        const timeText = daysSinceUsed === 0 ? I18n.getMessage('time.today') :
            daysSinceUsed === 1 ? I18n.getMessage('time.yesterday') :
                I18n.getMessage('time.daysAgo', daysSinceUsed.toString());

        this.tooltip = `${prompt.content}\n\n${I18n.getMessage('status.useCount', prompt.use_count.toString())}\n${I18n.getMessage('status.lastUsed', timeText)}`;
        this.description = I18n.getMessage('status.useCount', prompt.use_count.toString());

        // 根據使用次數設定圖示
        if (prompt.pinned) {
            this.iconPath = new vscode.ThemeIcon('pin', new vscode.ThemeColor('charts.orange'));
            this.contextValue = 'promptItemPinned'; // 用於 Context Menu 區分
        } else if (prompt.use_count === 0) {
            this.iconPath = new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('descriptionForeground'));
            this.contextValue = 'promptItem';
        } else if (prompt.use_count >= 10) {
            this.iconPath = new vscode.ThemeIcon('flame', new vscode.ThemeColor('charts.red'));
            this.contextValue = 'promptItem';
        } else if (prompt.use_count >= 5) {
            this.iconPath = new vscode.ThemeIcon('star-full', new vscode.ThemeColor('charts.yellow'));
            this.contextValue = 'promptItem';
        } else {
            this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.blue'));
            this.contextValue = 'promptItem';
        }

        this.command = {
            command: 'promptSniper.insert',
            title: 'Copy Prompt',
            arguments: [this]
        };
    }

    private getDaysSince(dateString: string): number {
        const date = new Date(dateString);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - date.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }
}
