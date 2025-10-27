export type ArtifactFormat =
  | "markdown"
  | "html"
  | "json"
  | "json-schema"
  | "typescript"
  | "tsx"
  | "sql"
  | "text"
  | "yaml"
  | "code-bundle";

export interface ArtifactFileDescriptor {
  path: string;
  content: string;
  language?: string;
}

export interface GeneratedArtifact {
  type: string;
  title?: string;
  format: ArtifactFormat;
  content: string | Record<string, unknown> | ArtifactFileDescriptor[];
  summary?: string;
  metadata?: Record<string, unknown>;
}

export interface ArtifactValidationInput {
  type: string;
  format: ArtifactFormat;
  content: string | Record<string, unknown> | ArtifactFileDescriptor[];
}

export interface ArtifactValidationResult {
  status: "valid" | "invalid" | "warning";
  errors: string[];
  warnings: string[];
  metadata?: Record<string, unknown>;
}
