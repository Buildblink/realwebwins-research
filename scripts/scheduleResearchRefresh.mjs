import "dotenv/config";

const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_PATH = "/api/cron/research-refresh";

function resolveEndpoint() {
  const explicitUrl = process.env.RESEARCH_REFRESH_ENDPOINT;
  if (explicitUrl) {
    return explicitUrl;
  }

  const baseUrl =
    process.env.PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    DEFAULT_BASE_URL;

  const normalizedBase = baseUrl.endsWith("/")
    ? baseUrl.slice(0, -1)
    : baseUrl;

  return `${normalizedBase}${DEFAULT_PATH}`;
}

async function triggerRefresh() {
  const endpoint = resolveEndpoint();
  const method = process.env.RESEARCH_REFRESH_METHOD ?? "POST";
  const cronSecret =
    process.env.RESEARCH_REFRESH_SECRET ?? process.env.CRON_SECRET;

  const headers = {
    "User-Agent": "realwebwins-refresh-cron/1.0",
  };

  if (cronSecret) {
    headers.Authorization = `Bearer ${cronSecret}`;
  }

  console.log(
    `[scheduleResearchRefresh] Triggering ${method} ${endpoint}${cronSecret ? " (with Authorization header)" : ""}`
  );

  const response = await fetch(endpoint, {
    method,
    headers,
  }).catch((error) => {
    console.error(
      "[scheduleResearchRefresh] Network error while reaching endpoint:",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  });

  if (!response) {
    process.exit(1);
  }

  const text = await response.text();

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }

  if (!response.ok) {
    console.error(
      `[scheduleResearchRefresh] Endpoint responded with ${response.status}`,
      payload
    );
    process.exit(1);
  }

  console.log("[scheduleResearchRefresh] Refresh trigger succeeded:", payload);
}

triggerRefresh().catch((error) => {
  console.error(
    "[scheduleResearchRefresh] Unexpected error:",
    error instanceof Error ? error.stack ?? error.message : error
  );
  process.exit(1);
});
