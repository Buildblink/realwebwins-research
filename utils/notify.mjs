const SLACK_TIMEOUT_MS = 5000;

export async function sendSlackAlert({
  webhookUrl,
  summary,
  diagnostics,
  triggeredAt,
}) {
  if (!webhookUrl) {
    return { success: false, error: "missing-webhook-url" };
  }

  const message = buildAlertMessage(summary, diagnostics, triggeredAt);
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  let timeoutHandle;

  try {
    if (controller) {
      timeoutHandle = setTimeout(() => controller.abort(), SLACK_TIMEOUT_MS);
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: message }),
      signal: controller?.signal,
    });

    if (timeoutHandle) clearTimeout(timeoutHandle);

    if (!response.ok) {
      const errorText = await safeReadBody(response);
      return {
        success: false,
        error: errorText || `slack-${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    return { success: false, error: formatError(error) };
  }
}

export async function sendEmailAlert({
  apiKey,
  from,
  to,
  summary,
  diagnostics,
  triggeredAt,
}) {
  if (!apiKey || !to) {
    return { success: false, error: "missing-email-config" };
  }

  const emailFrom = from ?? "Realwebwins Alerts <alerts@realwebwins.app>";
  const subject = `[Realwebwins] Refresh Alert — ${summary.status.toUpperCase()}`;
  const text = buildAlertMessage(summary, diagnostics, triggeredAt);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom,
        to,
        subject,
        text,
      }),
    });

    if (!response.ok) {
      const errorText = await safeReadBody(response);
      return {
        success: false,
        error: errorText || `email-${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
}

function buildAlertMessage(summary, diagnostics, triggeredAt) {
  return [
    `Realwebwins research refresh alert (${summary.status.toUpperCase()})`,
    `Time: ${triggeredAt}`,
    `Projects checked: ${summary.projects_checked}`,
    `Refreshed: ${summary.refreshed}`,
    `Simulated: ${summary.simulated}`,
    `Failures: ${summary.failures}`,
    `Diagnostics status: ${diagnostics.status}`,
    diagnostics.reasons?.length
      ? `Diagnostics reasons: ${diagnostics.reasons.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function safeReadBody(response) {
  try {
    const text = await response.text();
    return text.trim();
  } catch {
    return "";
  }
}

function formatError(error) {
  if (!error) return "unknown-error";
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
