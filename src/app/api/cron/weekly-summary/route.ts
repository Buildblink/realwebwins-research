import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * POST /api/cron/weekly-summary
 * Trigger the weekly summary generation script
 * Protected by secret token
 */
export async function POST(request: Request) {
  try {
    // 1. Verify secret token
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.WEEKLY_SUMMARY_SECRET;

    if (!expectedSecret) {
      console.error("[cron.weekly-summary] WEEKLY_SUMMARY_SECRET not configured");
      return NextResponse.json(
        {
          success: false,
          error: "SERVER_MISCONFIGURED",
          message: "Server is not configured for weekly summaries",
        },
        { status: 500 }
      );
    }

    const providedSecret = authHeader?.replace("Bearer ", "");

    if (providedSecret !== expectedSecret) {
      console.warn("[cron.weekly-summary] Unauthorized attempt");
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "Invalid authorization token",
        },
        { status: 401 }
      );
    }

    // 2. Run the weekly summary script
    console.log("[cron.weekly-summary] Starting weekly summary generation...");

    const { stdout, stderr } = await execAsync(
      "npm run weekly:summary",
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: "production",
        },
        timeout: 60000, // 1 minute timeout
      }
    );

    console.log("[cron.weekly-summary] Script output:", stdout);

    if (stderr) {
      console.warn("[cron.weekly-summary] Script warnings:", stderr);
    }

    // 3. Log success event
    try {
      await fetch(`${request.url.replace(/\/api\/cron\/.*/, "")}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "weekly_summary_generated",
          context: {
            timestamp: new Date().toISOString(),
          },
        }),
      });
    } catch (eventError) {
      console.warn("[cron.weekly-summary] Failed to log event:", eventError);
    }

    return NextResponse.json({
      success: true,
      message: "Weekly summary generated successfully",
      output: stdout,
    });
  } catch (error) {
    console.error("[cron.weekly-summary] Failed to generate summary:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "GENERATION_FAILED",
        message: `Failed to generate weekly summary: ${message}`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/weekly-summary
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Weekly summary cron endpoint is active",
    configured: !!process.env.WEEKLY_SUMMARY_SECRET,
  });
}
