/**
 * Version History Type Definitions
 * 
 * This module defines the core data structures for the linear version history system.
 */

/**
 * Represents a single version of a prompt
 */
export interface PromptVersion {
    /** Unique identifier for this version */
    versionId: string;

    /** The content of the prompt at this version */
    content: string;

    /** Timestamp when this version was created (milliseconds since epoch) */
    timestamp: number;

    /** Type of change that created this version */
    changeType: 'create' | 'edit' | 'restore';

    /** Optional milestone information if this version is tagged */
    milestone?: {
        /** User-defined label for this milestone */
        label: string;
        /** Timestamp when the milestone was created */
        createdAt: number;
    };
}

/**
 * Represents the complete version history for a single prompt
 */
export interface VersionHistory {
    /** ID of the prompt this history belongs to */
    promptId: string;

    /** Array of all versions, ordered from newest to oldest */
    versions: PromptVersion[];

    /** ID of the currently active version */
    currentVersionId: string;
}

/**
 * Options for creating a new version
 */
export interface CreateVersionOptions {
    /** The prompt content */
    content: string;

    /** Type of change */
    changeType: 'create' | 'edit' | 'restore';

    /** Optional milestone label */
    milestoneLabel?: string;
}
