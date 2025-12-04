import * as vscode from 'vscode';
import { Prompt } from '../promptProvider';
import { PROMPT_CONSTANTS } from './constants';

/**
 * Prompt-related utility functions
 */

/**
 * Get the appropriate icon for a prompt based on its state
 * @param prompt The prompt object
 * @returns VSCode icon identifier string
 */
export function getPromptIconName(prompt: Prompt): string {
    if (prompt.pinned) return 'pin';
    if (prompt.use_count >= PROMPT_CONSTANTS.USE_COUNT_THRESHOLD_HIGH) return 'flame';
    if (prompt.use_count >= PROMPT_CONSTANTS.USE_COUNT_THRESHOLD_MEDIUM) return 'star-full';
    if (prompt.use_count > 0) return 'circle-filled';
    return 'circle-outline';
}

/**
 * Get the themed icon for a prompt
 * @param prompt The prompt object
 * @returns VSCode ThemeIcon
 */
export function getPromptIcon(prompt: Prompt): vscode.ThemeIcon {
    const iconName = getPromptIconName(prompt);

    if (prompt.pinned) {
        return new vscode.ThemeIcon(iconName, new vscode.ThemeColor('charts.orange'));
    }

    switch (iconName) {
        case 'flame':
            return new vscode.ThemeIcon(iconName, new vscode.ThemeColor('charts.red'));
        case 'star-full':
            return new vscode.ThemeIcon(iconName, new vscode.ThemeColor('charts.yellow'));
        case 'circle-filled':
            return new vscode.ThemeIcon(iconName, new vscode.ThemeColor('charts.blue'));
        default:
            return new vscode.ThemeIcon(iconName, new vscode.ThemeColor('descriptionForeground'));
    }
}

/**
 * Get the QuickPick icon string for a prompt
 * @param prompt The prompt object
 * @returns Icon string with VSCode icon syntax
 */
export function getPromptQuickPickIcon(prompt: Prompt): string {
    const iconName = getPromptIconName(prompt);
    return `$(${iconName})`;
}

/**
 * Compare two prompts for sorting
 * Pinned prompts come first, then sorted by last used date
 * @param a First prompt
 * @param b Second prompt
 * @returns Comparison result
 */
export function comparePrompts(a: Prompt, b: Prompt): number {
    // Pinned prompts come first
    if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
    }

    // Then sort by last used date (newest first)
    return new Date(b.last_used).getTime() - new Date(a.last_used).getTime();
}

/**
 * Sort prompts array
 * @param prompts Array of prompts to sort
 * @returns Sorted array (new array, does not mutate original)
 */
export function sortPrompts(prompts: Prompt[]): Prompt[] {
    return [...prompts].sort(comparePrompts);
}

/**
 * Generate a preview string from content
 * @param content The full content
 * @param maxLength Maximum length of preview (default from constants)
 * @returns Preview string
 */
export function generatePreview(content: string, maxLength: number = PROMPT_CONSTANTS.PREVIEW_MAX_LENGTH): string {
    const normalized = content.replace(/[\r\n]+/g, ' ').trim();
    if (normalized.length <= maxLength) {
        return normalized;
    }
    return normalized.substring(0, maxLength) + '...';
}

/**
 * Generate an auto title from content
 * @param content The full content
 * @returns Auto-generated title
 */
export function generateAutoTitle(content: string): string {
    return content
        .replace(/[\r\n]+/g, ' ')
        .substring(0, PROMPT_CONSTANTS.AUTO_TITLE_MAX_LENGTH)
        .trim();
}

/**
 * Generate a new prompt ID
 * @param existingPrompts Array of existing prompts
 * @returns New unique ID
 */
export function generatePromptId(existingPrompts: Prompt[]): string {
    const maxId = Math.max(0, ...existingPrompts.map(p => parseInt(p.id) || 0));
    return (maxId + 1).toString().padStart(PROMPT_CONSTANTS.ID_PADDING_LENGTH, '0');
}
