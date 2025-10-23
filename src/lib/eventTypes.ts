// Valid event types for type safety
export const EVENT_TYPES = {
  // Workspace events
  WORKSPACE_OPENED: "workspace_opened",
  WORKSPACE_CREATED: "workspace_created",
  WORKSPACE_REFRESHED: "workspace_refreshed",

  // Section events
  SECTION_GENERATED: "section_generated",
  SECTION_REGENERATED: "section_regenerated",

  // Export events
  EXPORT_CLICKED: "export_clicked",
  EXPORT_COMPLETED: "export_completed",

  // Copilot events
  COPILOT_ASKED: "copilot_asked",
  COPILOT_ANSWERED: "copilot_answered",

  // Feedback events
  FEEDBACK_SUBMITTED: "feedback_submitted",
  SECTION_RATED: "section_rated",

  // Navigation events
  PAIN_POINT_VIEWED: "pain_point_viewed",
  PLAYBOOK_VIEWED: "playbook_viewed",

  // Future Phase 14 events
  WORKSPACE_PUBLISHED: "workspace_published",
  WORKSPACE_REMIXED: "workspace_remixed",
  PROFILE_VIEWED: "profile_viewed",
  REFERRAL_CLICKED: "referral_clicked",
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
