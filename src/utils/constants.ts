/**
 * Application-wide constants
 * Centralized magic numbers and configuration values
 */

// Clipboard Manager Constants
export const CLIPBOARD_CONSTANTS = {
    MIN_SELECTION_LENGTH: 10,
    CLIPBOARD_CHECK_DELAY_MS: 200,
    PREVIEW_MAX_LENGTH: 50,
    RECENT_HISTORY_CHECK_COUNT: 5,
    STARTUP_CHECK_DELAY_MS: 1000,
} as const;

// Prompt Display Constants
export const PROMPT_CONSTANTS = {
    USE_COUNT_THRESHOLD_HIGH: 10,
    USE_COUNT_THRESHOLD_MEDIUM: 5,
    PREVIEW_MAX_LENGTH: 200,
    AUTO_TITLE_MAX_LENGTH: 30,
    ID_PADDING_LENGTH: 3,
} as const;

// Time Constants
export const TIME_CONSTANTS = {
    MILLISECONDS_PER_DAY: 24 * 60 * 60 * 1000,
    STATUS_BAR_MESSAGE_DURATION_MS: 2000,
    STATUS_BAR_MESSAGE_LONG_DURATION_MS: 3000,
} as const;
