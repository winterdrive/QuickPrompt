# Quick Prompt Changelog

> **[繁體中文](CHANGELOG.zh-TW.md)** | English

All notable changes to the "Quick Prompt" extension will be documented in this file.

---

## [0.0.3] - 2025-12-04

### 🎉 Major Update: Clipboard History & UX Refinements

This release focuses on significantly reducing interaction cost and improving the overall user experience with automatic clipboard tracking and streamlined workflows.

### ✨ New Features

#### 📋 Automatic Clipboard History

- **Instant Capture**: Automatically captures clipboard content from VSCode editor copies (no delay)
- **External App Support**: Captures content from external applications when switching back to VSCode
- **Background Polling**: Lightweight polling every 5 seconds (configurable)
- **Smart Filtering**:
  - Automatic deduplication
  - Minimum length filter (default: 10 characters)
  - Excludes pure numbers

#### 🔍 Unified Search Interface (`Alt+P`)

- **Single Search Box**: Search both prompts and clipboard history in one place
- **Organized Display**:
  - "My Prompts" section shown first
  - "Clipboard History" section shown below
- **Consistent Format**:
  - Prompts: Show usage count and character count
  - Clipboard: Show relative time and character count
- **Quick Actions**: Press Enter to copy selected item

#### ⬆️⬇️ Manual Sorting

- **Right-Click Menu**: Move prompts up or down
- **Persistent Order**: Order is saved automatically
- **Status Feedback**: Shows confirmation in status bar (2 seconds)

#### ✏️ Enhanced Editing

- **Clipboard Item Editing**: Click edit button on clipboard items to:
  - Automatically convert to permanent prompt
  - Open in native editor
  - No manual title input needed
- **Virtual File System**: Full VSCode editing experience
- **Hover Preview**: Rich preview cards when hovering over virtual files

### 🎨 UI/UX Improvements

#### Inline Action Buttons

**Prompt Items** (4 buttons):

1. 📋 Copy
2. 📌 Pin/Unpin
3. ✏️ Edit
4. 🗑️ Delete

**Clipboard Items** (4 buttons):

1. 📋 Copy
2. 📌 Pin to Prompts
3. ✏️ Edit as Prompt
4. 🗑️ Remove from History

#### Notification Strategy

- **Minimalist Approach**: Reduced notification noise
- **Status Bar Messages**: Quick operations show brief status bar messages (2-3 seconds)
- **No Confirmation Dialogs**: Streamlined delete operations
- **Silent Mode**: Pin and edit operations use status bar instead of popups

#### Status Bar Integration

- **Clipboard Indicator**: Shows clipboard icon in status bar
- **Quick Access**: Click to open unified search
- **Tooltip Preview**: Hover to see latest clipboard content

### 🔧 Technical Improvements

#### Instant Clipboard Capture

- **Selection Listener**: Monitors text selection in VSCode
- **200ms Delay**: Waits for clipboard to update after selection
- **Automatic Detection**: Captures when clipboard matches selection
- **No Polling Delay**: Instant capture for VSCode operations

#### Data Structure

- **Order Field**: Added `order` field to Prompt interface for manual sorting
- **Clipboard Metadata**: Tracks timestamp, length, and preview for each item

#### Performance

- **Optimized Polling**: Only polls when VSCode window is active
- **Configurable Intervals**: Adjustable polling frequency
- **Smart Deduplication**: Efficient duplicate detection

### ⚙️ New Configuration Options

```json
{
  "quickPrompt.clipboardHistory.enabled": true,
  "quickPrompt.clipboardHistory.maxItems": 20,
  "quickPrompt.clipboardHistory.enablePolling": true,
  "quickPrompt.clipboardHistory.pollingInterval": 5000,
  "quickPrompt.clipboardHistory.minLength": 10
}
```

### 🌐 Internationalization

- Added translations for all new features
- Supported languages: English, 繁體中文, 简体中文

### 📊 Interaction Cost Reduction

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| View Clipboard | 4 steps | **1 click** (status bar) | ⬇️ 75% |
| Pin Clipboard | 5 steps | **1 click** | ⬇️ 80% |
| Delete Prompt | 3 steps | **1 click** | ⬇️ 67% |
| Search All | Separate | **Alt+P unified** | ✅ Simplified |

### 🐛 Bug Fixes

- Fixed TreeView order to show Prompts before Clipboard History
- Fixed notification spam by using status bar messages
- Improved clipboard capture reliability

### 📝 Documentation

- Updated README with comprehensive feature descriptions
- Added best practices for clipboard history usage
- Included configuration examples

---

## [0.0.2] - 2025-12-03

### 🎨 UI Improvements

- Enhanced sidebar icons and visual indicators
- Improved prompt display with better formatting
- Added pin functionality for important prompts

### 🔧 Bug Fixes

- Fixed workspace isolation issues
- Improved file system provider stability
- Better error handling for edge cases

---

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
