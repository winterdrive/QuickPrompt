# Quick Prompt Changelog

> **[繁體中文](CHANGELOG.zh-TW.md)** | English

## [0.0.1] - 2025-12-02

### 🎉 Initial Release

Quick Prompt is a lightweight VSCode extension designed for quick AI prompt management and usage.

### ✨ Core Features

#### Quick Search & Copy

- **Keyboard Search**: Press `Alt+P` to open search box
- **One-Click Copy**: Select a prompt and press Enter to copy directly to clipboard
- **Smart Filters**:
  - `@hot`: Show hot prompts (used >= 10 times)
  - `@recent`: Show prompts used in the last 7 days
  - `@unused`: Show never-used prompts

#### Quick Add

- **Add from Selection**: Select text and press `Alt+Shift+S` to instantly add
- **Smart Syntax**: Supports `Title::Content` format for one-step completion
- **Auto Title**: Automatically generates title from content

#### Virtual File System

- **Native Editing Experience**: Each prompt is a virtual file (`prompt-sniper:/001.md`)
- **Direct Save**: Press `Ctrl+S` to save directly, no "Save As" needed
- **Full Support**: Undo/Redo, Auto Save, Format Document

#### Smart Tracking

- **Usage Statistics**: Automatically tracks usage count for each prompt
- **Last Used Time**: Tracks recent usage time
- **Visual Indicators**:
  - 🔥 Hot (>= 10 times)
  - ⭐ Frequent (>= 5 times)
  - 📝 Normal (> 0 times)
  - ⚪ Unused

#### Other Features

- **Pin Function**: Important prompts can be pinned to the top
- **Sidebar Management**: Dedicated Activity Bar icon
- **Workspace Isolation**: Each project has its own `.vscode/prompts.json`

### 🎯 Design Philosophy

- **Lightweight**: Minimize complexity, focus on core features
- **Speed**: Keyboard-driven, lightning-fast operations
- **State Management**: Smart tracking of usage states to identify golden prompts

### 📋 Keyboard Shortcuts

| Function | Windows/Linux | Mac |
|----------|---------------|-----|
| Search Prompt | `Alt+P` | `Opt+P` |
| Add from Selection | `Alt+Shift+S` | `Opt+Shift+S` |

### 🚀 Getting Started

1. Install the extension
2. Open any project folder in VSCode
3. Press `Alt+P` to start using

The extension will automatically create a default file at `.vscode/prompts.json`.

---

**Enjoy efficient prompt management!** 🚀
