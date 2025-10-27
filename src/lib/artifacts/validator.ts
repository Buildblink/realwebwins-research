import ts from "typescript";
import {
  ArtifactFileDescriptor,
  ArtifactValidationInput,
  ArtifactValidationResult,
  ArtifactFormat,
} from "./types";

export function validateArtifact(
  input: ArtifactValidationInput
): ArtifactValidationResult {
  switch (input.format) {
    case "json":
      return validateJson(input);
    case "json-schema":
      return validateJsonSchema(input);
    case "markdown":
    case "html":
    case "text":
      return validateDocument(input);
    case "typescript":
    case "tsx":
      return validateTypeScript(input);
    case "sql":
      return validateSql(input);
    case "yaml":
      return validateYaml(input);
    case "code-bundle":
      return validateCodeBundle(input);
    default:
      return validateDocument(input);
  }
}

export function validateArtifacts(
  artifacts: ArtifactValidationInput[]
): ArtifactValidationResult[] {
  return artifacts.map((artifact) => validateArtifact(artifact));
}

function validateJson(input: ArtifactValidationInput): ArtifactValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let parsed: unknown = input.content;

  if (typeof input.content === "string") {
    try {
      parsed = JSON.parse(input.content);
    } catch (error) {
      errors.push(
        `Invalid JSON: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  if (parsed && typeof parsed === "object") {
    const keys = Object.keys(parsed as Record<string, unknown>);
    if (!keys.length) {
      warnings.push("JSON object is empty.");
    }
  }

  return buildResult(errors, warnings, {
    parsed: typeof parsed === "string" ? undefined : parsed,
  });
}

function validateJsonSchema(
  input: ArtifactValidationInput
): ArtifactValidationResult {
  const base = validateJson({
    ...input,
    format: "json",
  });

  if (base.status === "invalid") {
    return base;
  }

  const schema =
    typeof input.content === "string"
      ? JSON.parse(input.content)
      : input.content;

  const errors = [...base.errors];
  const warnings = [...base.warnings];

  if (!schema || typeof schema !== "object") {
    errors.push("JSON schema must be an object.");
  } else {
    if (!("type" in schema)) {
      warnings.push('JSON schema is missing a top-level "type" property.');
    }
    if (!("properties" in schema) && schema.type === "object") {
      warnings.push(
        'JSON schema declared as "object" should include a "properties" map.'
      );
    }
  }

  return buildResult(errors, warnings, base.metadata);
}

function validateDocument(
  input: ArtifactValidationInput
): ArtifactValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const content = stringifyContent(input.content);

  if (!content.trim()) {
    errors.push("Document content is empty.");
  } else if (content.trim().length < 40) {
    warnings.push("Document content looks short; double-check completeness.");
  }

  return buildResult(errors, warnings);
}

function validateTypeScript(
  input: ArtifactValidationInput
): ArtifactValidationResult {
  const sources = buildSourceList(input.content);
  const diagnostics = sources.flatMap((source) =>
    getTypeScriptDiagnostics(source.content, input.format)
  );
  const errors = diagnostics
    .filter((d) => d.category === ts.DiagnosticCategory.Error)
    .map(formatDiagnostic);
  const warnings = diagnostics
    .filter((d) => d.category === ts.DiagnosticCategory.Warning)
    .map(formatDiagnostic);

  if (!sources.length) {
    errors.push("No TypeScript sources found in artifact.");
  }

  return buildResult(errors, warnings, {
    files: sources.map((source) => source.path ?? "inline.ts"),
  });
}

function validateSql(input: ArtifactValidationInput): ArtifactValidationResult {
  const content = stringifyContent(input.content);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!content.trim()) {
    errors.push("SQL content is empty.");
    return buildResult(errors, warnings);
  }

  const statements = content
    .split(/;\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (!statements.length) {
    errors.push("No SQL statements detected (missing semicolons?).");
  }

  const forbidden = statements.filter((stmt) =>
    /\b(drop|truncate)\b/i.test(stmt)
  );
  if (forbidden.length) {
    warnings.push("Destructive SQL statements detected (DROP/TRUNCATE).");
  }

  return buildResult(errors, warnings, {
    statements: statements.length,
  });
}

function validateYaml(input: ArtifactValidationInput): ArtifactValidationResult {
  const content = stringifyContent(input.content);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!content.trim()) {
    errors.push("YAML content is empty.");
  }

  // Lightweight structural check: ensure indentation is consistent
  const lines = content.split("\n");
  const badIndent = lines.find((line) => /^\s/.test(line) && /\t/.test(line));
  if (badIndent) {
    warnings.push("Tabs detected in YAML; use spaces for indentation.");
  }

  return buildResult(errors, warnings);
}

function validateCodeBundle(
  input: ArtifactValidationInput
): ArtifactValidationResult {
  if (!Array.isArray(input.content)) {
    return buildResult(["Code bundle must be an array of files."], []);
  }

  const files = input.content as ArtifactFileDescriptor[];
  if (!files.length) {
    return buildResult(["Code bundle is empty."], []);
  }

  const results = files.map((file) => {
    const format = detectFormatFromPath(file.path);
    return validateArtifact({
      type: input.type,
      format,
      content: file.content,
    });
  });

  const errors = results.flatMap((result) => result.errors);
  const warnings = results.flatMap((result) => result.warnings);

  return buildResult(errors, warnings, {
    files: files.map((file) => file.path),
  });
}

function buildResult(
  errors: string[],
  warnings: string[],
  metadata?: Record<string, unknown>
): ArtifactValidationResult {
  if (errors.length) {
    return {
      status: "invalid",
      errors,
      warnings,
      metadata,
    };
  }

  if (warnings.length) {
    return {
      status: "warning",
      errors,
      warnings,
      metadata,
    };
  }

  return {
    status: "valid",
    errors: [],
    warnings: [],
    metadata,
  };
}

function stringifyContent(
  content: string | Record<string, unknown> | ArtifactFileDescriptor[]
): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((file) => {
        const descriptor = file as ArtifactFileDescriptor;
        return `// ${descriptor.path}\n${descriptor.content}`;
      })
      .join("\n\n");
  }

  return JSON.stringify(content, null, 2);
}

function buildSourceList(
  content: string | Record<string, unknown> | ArtifactFileDescriptor[]
): Array<{ path?: string; content: string }> {
  if (typeof content === "string") {
    return [{ content }];
  }

  if (Array.isArray(content)) {
    return content.map((file) => ({
      path: file.path,
      content: file.content,
    }));
  }

  if ("files" in (content as Record<string, unknown>)) {
    const files = (content as Record<string, unknown>).files;
    if (Array.isArray(files)) {
      return files
        .map((file) => file as ArtifactFileDescriptor)
        .map((file) => ({
          path: file.path,
          content: file.content,
        }));
    }
  }

  return [];
}

function getTypeScriptDiagnostics(
  source: string,
  format: ArtifactFormat
): readonly ts.Diagnostic[] {
  const compilerOptions: ts.CompilerOptions = {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
    jsx: format === "tsx" ? ts.JsxEmit.React : undefined,
  };

  const result = ts.transpileModule(source, {
    reportDiagnostics: true,
    compilerOptions,
  });

  return result.diagnostics ?? [];
}

function formatDiagnostic(diagnostic: ts.Diagnostic): string {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, " ");
  if (diagnostic.file && diagnostic.start !== undefined) {
    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
      diagnostic.start
    );
    const fileName = diagnostic.file.fileName;
    return `${fileName}:${line + 1}:${character + 1} ${message}`;
  }
  return message;
}

function detectFormatFromPath(path: string): ArtifactFormat {
  if (path.endsWith(".tsx")) return "tsx";
  if (path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".sql")) return "sql";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".md")) return "markdown";
  if (path.endsWith(".yaml") || path.endsWith(".yml")) return "yaml";
  if (path.endsWith(".html")) return "html";
  return "text";
}
