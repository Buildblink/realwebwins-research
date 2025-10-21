import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

async function main() {
  const sanity = performEnvironmentSanity();
  if (!sanity.ok) {
    printSummary({
      apiResponded: false,
      projectsUpdated: 0,
      agentLogFound: false,
      timestampDeltaMinutes: null,
      notes: sanity.messages,
    });
    process.exitCode = 1;
    return;
  }

  const endpointResult = await triggerRefreshEndpoint();
  const supabaseChecks = endpointResult.skipVerification
    ? {
        lastRefreshDeltaMinutes: null,
        agentStatusFound: false,
        messages: endpointResult.messages,
      }
    : await verifySupabaseState();

  const notes = [...endpointResult.messages, ...supabaseChecks.messages];

  const success =
    endpointResult.apiResponded &&
    endpointResult.projectsUpdated > 0 &&
    (supabaseChecks.lastRefreshDeltaMinutes ?? Infinity) <= 10 &&
    supabaseChecks.agentStatusFound;

  if (!success) {
    process.exitCode = 1;
  }

  printSummary({
    apiResponded: endpointResult.apiResponded,
    projectsUpdated: endpointResult.projectsUpdated,
    agentLogFound: supabaseChecks.agentStatusFound,
    timestampDeltaMinutes: supabaseChecks.lastRefreshDeltaMinutes,
    notes,
  });
}

function performEnvironmentSanity() {
  const messages = [];

  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      messages.push(`Missing required environment variable: ${key}`);
    }
  }

  const adminMode = process.env.ADMIN_MODE;
  if (!adminMode || adminMode.toLowerCase() !== "true") {
    messages.push(
      "ADMIN_MODE must be set to true to run verification with elevated access."
    );
  }

  return {
    ok: messages.length === 0,
    messages,
  };
}

async function triggerRefreshEndpoint() {
  const messages = [];
  const start = Date.now();

  const endpoints = [
    process.env.REFRESH_VERIFICATION_ENDPOINT,
    "http://localhost:3000/api/cron/research-refresh",
    "https://realwebwins-research.vercel.app/api/cron/research-refresh",
  ].filter(Boolean);

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: buildAuthHeaders(),
      });
      const text = await response.text();
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }

      if (!response.ok) {
        messages.push(
          `Endpoint ${url} responded with ${response.status}: ${formatPayload(payload)}`
        );
        continue;
      }

      const updated =
        typeof payload?.updated === "number"
          ? payload.updated
          : typeof payload?.refreshedProjects === "number"
          ? payload.refreshedProjects
          : 0;

      messages.push(
        `Endpoint ${url} responded in ${Date.now() - start}ms with updated=${updated}.`
      );

      return {
        apiResponded: true,
        projectsUpdated: updated,
        messages,
        skipVerification: false,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error ?? "UNKNOWN");
      messages.push(`Failed to reach ${url}: ${message}`);
    }
  }

  return {
    apiResponded: false,
    projectsUpdated: 0,
    messages,
    skipVerification: true,
  };
}

function buildAuthHeaders() {
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "realwebwins-refresh-verifier/1.0",
  };

  const secret =
    process.env.RESEARCH_REFRESH_SECRET ??
    process.env.CRON_SECRET ??
    process.env.REFRESH_VERIFICATION_SECRET;

  if (secret) {
    headers.Authorization = `Bearer ${secret}`;
  }

  return headers;
}

async function verifySupabaseState() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const messages = [];

  const projectCheck = await supabase
    .from("research_projects")
    .select("id, title, last_refreshed_at")
    .not("last_refreshed_at", "is", null)
    .order("last_refreshed_at", { ascending: false })
    .limit(1);

  let lastRefreshDeltaMinutes = null;
  if (projectCheck.error) {
    messages.push(
      `Failed to query research_projects: ${projectCheck.error.message}`
    );
  } else if (projectCheck.data && projectCheck.data.length > 0) {
    const [record] = projectCheck.data;
    const refreshedAt = new Date(record.last_refreshed_at);
    lastRefreshDeltaMinutes = Math.abs(Date.now() - refreshedAt.getTime()) / 60000;
    messages.push(
      `Most recent refresh: ${record.title ?? record.id} at ${
        record.last_refreshed_at
      } (${lastRefreshDeltaMinutes.toFixed(2)}m ago)`
    );
  } else {
    messages.push("No research_projects rows contain last_refreshed_at.");
  }

  const agentCheck = await supabase
    .from("AgentStatus")
    .select("id, stage, success, last_run")
    .eq("stage", "refresh")
    .order("last_run", { ascending: false })
    .limit(1);

  let agentStatusFound = false;
  if (agentCheck.error) {
    messages.push(`Failed to query AgentStatus: ${agentCheck.error.message}`);
  } else if (agentCheck.data && agentCheck.data.length > 0) {
    const [entry] = agentCheck.data;
    agentStatusFound = entry.success === true;
    messages.push(
      `Latest AgentStatus refresh entry at ${entry.last_run} (success=${entry.success}).`
    );
  } else {
    messages.push("No AgentStatus entries found for stage=refresh.");
  }

  return {
    lastRefreshDeltaMinutes,
    agentStatusFound,
    messages,
  };
}

function printSummary({
  apiResponded,
  projectsUpdated,
  agentLogFound,
  timestampDeltaMinutes,
  notes,
}) {
  const lines = [
    "✅ Refresh Verification Summary",
    `- API responded: ${apiResponded ? "✅" : "❌"}`,
    `- Projects updated: ${projectsUpdated}`,
    `- AgentStatus log found: ${agentLogFound ? "✅" : "❌"}`,
    `- Timestamp delta: ${
      typeof timestampDeltaMinutes === "number"
        ? `${timestampDeltaMinutes.toFixed(2)} minutes`
        : "n/a"
    }`,
    "",
    "Notes:",
  ];

  if (notes.length === 0) {
    lines.push("- No additional notes.");
  } else {
    for (const note of notes) {
      lines.push(`- ${note}`);
    }
  }

  console.log(lines.join("\n"));
}

function formatPayload(payload) {
  if (typeof payload === "string") {
    return payload.slice(0, 200);
  }
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

main().catch((error) => {
  console.error(
    "Refresh verification encountered an unexpected error:",
    error instanceof Error ? error.stack ?? error.message : error
  );
  process.exit(1);
});
