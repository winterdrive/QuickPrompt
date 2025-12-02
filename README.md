# Quick Prompt 🎯

> **[繁體中文](README.zh-TW.md)** | English

![Quick Prompt Hero Banner](assets/hero_banner.png)

A lightweight VSCode extension for quick prompt management and usage

## ✨ Key Features

- **🎯 Lightning Fast Copy**: Press `Alt+P` to search prompts, hit Enter to copy to clipboard
- **📊 Smart Tracking**: Automatically tracks usage count and last used time to identify your golden prompts
- **🚀 Quick Add**: Select text and press `Alt+Shift+S` to instantly add, or use context menu
- **🎨 Visual Interface**: Sidebar displays popularity with icons (🔥/⭐/📝)
- **📁 Project Isolation**: Each workspace has its own independent prompt collection

![Feature Highlights](assets/feature_highlights.png)

## 📸 Screenshots

### Quick Search in Action

![Quick Search Demo](assets/quick_search_demo.png)

### Sidebar Management

![Sidebar View](assets/sidebar_view.png)

## 🚀 Quick Start

### First Time Setup

1. Open any project folder in VSCode
2. The extension will automatically create a default file at `.vscode/prompts.json`
3. Press `Alt+P` (Mac: `Opt+P`) to start using

### Basic Usage

#### Method 1: Quick Search (Recommended) ⚡

1. Press `Alt+P` to open the search box
2. Type keywords to filter prompts
3. Press `Enter` to copy to clipboard (automatically increments usage count)
4. Switch to anywhere (Copilot, Agent, browser, etc.) and press `Ctrl+V` to paste

#### Method 2: Sidebar Operations 📋

1. Click the Quick Prompt icon (chat bubble) in the Activity Bar
2. Click any prompt to copy
3. Icon meanings:
    - 🔥: Hot (used >= 10 times)
    - ⭐: Frequent (used >= 5 times)
    - 📝: Normal (used > 0 times)
    - ⚪: Unused

## 📝 Adding Prompts

### Method 1: Add from Selection (Fastest) 🚀

1. Select text in the editor (your prompt)
2. Press `Alt+Shift+S` (or right-click and choose "Quick Add Prompt (Selection)")
3. Done! Title is auto-generated and saved

### Method 2: Smart Add Mode ⚡

1. Click the **➕ Add** button in the sidebar title bar (or run command `Quick Prompt: Add Prompt`)
2. In the input box:
    - **Auto Mode**: Paste content directly and press Enter (auto-generates title)
    - **Manual Mode**: Use `Title::Content` format, e.g., `Debug::Please analyze error logs...`
3. Done!

**Tip**: Using the `::` separator allows advanced users to complete in one step, skipping the title confirmation.

### Method 3: Manual Edit

Edit the `.vscode/prompts.json` file directly.

## ⚙️ Configuration

### File Location

- **Workspace Mode**: `.vscode/prompts.json` (independent per project)
- **Fallback Mode**: Uses extension directory if no workspace is open

### Keyboard Shortcuts

| Function        | Windows/Linux | Mac           |
|----------------|---------------|---------------|
| Search Prompt  | `Alt+P`       | `Opt+P`       |
| Add from Selection | `Alt+Shift+S` | `Opt+Shift+S` |

## 💡 Best Practices

1. **Save on the Fly**: When you see a useful prompt, select it and press `Alt+Shift+S` to save
2. **Nurture Your Prompts**: Use Quick Prompt to copy frequently, the system will automatically mark hot prompts
3. **Version Control**: Add `.vscode/prompts.json` to Git to share golden prompts with your team

## 📄 License

MIT License

---

**Enjoy efficient prompt management!** 🚀
