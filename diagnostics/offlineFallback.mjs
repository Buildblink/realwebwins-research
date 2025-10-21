const DEFAULT_TIMEOUT_MS = 2500;

function cleanUrl(url) {
  if (!url) return "";
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export async function evaluateDiagnostics(options = {}) {
  const timestamp = new Date().toISOString();
  const reasons = [];
  let status = "online";

  const supabaseUrl = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (!supabaseUrl) {
    status = "offline";
    reasons.push("missing-supabase-url");
    return { status, reasons, timestamp };
  }

  if (!supabaseKey) {
    status = "partial";
    reasons.push("missing-supabase-key");
  }

  if (supabaseKey) {
    const endpoint = `${supabaseUrl}/rest/v1/research_projects?select=id&limit=1`;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    let timeoutHandle;

    try {
      if (controller) {
        timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
      }

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: "application/json",
          Prefer: "count=exact",
        },
        signal: controller?.signal,
      });

      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      if (!response.ok) {
        if (response.status >= 500) {
          status = "offline";
          reasons.push(`supabase-${response.status}`);
        } else {
          if (status === "online") status = "partial";
          reasons.push(`supabase-${response.status}`);
        }
      }
    } catch (error) {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      status = "offline";
      reasons.push(`network-error:${formatError(error)}`);
    }
  }

  return { status, reasons, timestamp };
}

export async function diagnoseSystem(options) {
  const diagnostics = await evaluateDiagnostics(options);
  return diagnostics;
}

function formatError(error) {
  if (!error) return "unknown";
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String(error.message);
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
