/**
 * Workspace-related type definitions
 * Centralized types used across workspace features
 */

/**
 * Message format for workspace copilot conversations
 */
export interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Options for copilot configuration
 */
export interface CopilotOptions {
  onHistoryChange?: (history: CopilotMessage[]) => void;
}
