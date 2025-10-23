export interface AffiliateTool {
  toolName: string;
  url: string;
  description?: string;
  badge?: string; // e.g., "Free" or "Paid"
  price?: string; // e.g., "$29/mo"
}

interface PlaybookTool {
  name?: string;
  url?: string;
  description?: string;
  badge?: string;
  price?: string;
}

interface PlaybookData {
  tools?: PlaybookTool[];
  [key: string]: unknown;
}

/**
 * Extract affiliate/tool mentions from markdown content
 * Looks for patterns like:
 * - **Tool:** [ToolName](url)
 * - Try [ToolName](url)
 * - Check out [ToolName](url)
 */
export function extractAffiliateBlocks(markdown: string): AffiliateTool[] {
  if (!markdown) return [];

  const tools: AffiliateTool[] = [];
  const seenUrls = new Set<string>();

  // Pattern 1: **Tool:** [Name](url) or **Recommended:** [Name](url)
  const toolPattern = /\*\*(?:Tool|Recommended|Try|Check out):\*\*\s*\[([^\]]+)\]\(([^)]+)\)/gi;
  let match;

  while ((match = toolPattern.exec(markdown)) !== null) {
    const [, toolName, url] = match;
    if (!seenUrls.has(url)) {
      tools.push({
        toolName: toolName.trim(),
        url: url.trim(),
      });
      seenUrls.add(url);
    }
  }

  // Pattern 2: Links in bullet lists that mention tools
  const listPattern = /^[\s-]*\*\s*.*?\[([^\]]+)\]\(([^)]+)\)/gm;

  while ((match = listPattern.exec(markdown)) !== null) {
    const [, toolName, url] = match;
    if (!seenUrls.has(url) && !url.startsWith("#")) {
      // Exclude internal links
      tools.push({
        toolName: toolName.trim(),
        url: url.trim(),
      });
      seenUrls.add(url);
    }
  }

  return tools;
}

/**
 * Extract tool information from playbook JSONB
 * Playbooks may have a tools field with structured data
 */
export function extractAffiliateFromPlaybook(playbook: PlaybookData): AffiliateTool[] {
  if (!playbook) return [];

  const tools: AffiliateTool[] = [];

  // Check if playbook has a tools array
  if (Array.isArray(playbook.tools)) {
    for (const tool of playbook.tools) {
      if (tool.name && tool.url) {
        tools.push({
          toolName: tool.name,
          url: tool.url,
          description: tool.description,
          badge: tool.badge,
          price: tool.price,
        });
      }
    }
  }

  // Also parse markdown content if present
  if (playbook.content && typeof playbook.content === "string") {
    const markdownTools = extractAffiliateBlocks(playbook.content);
    tools.push(...markdownTools);
  }

  // Deduplicate by URL
  const uniqueTools = Array.from(
    new Map(tools.map((tool) => [tool.url, tool])).values()
  );

  return uniqueTools;
}

/**
 * Inject affiliate blocks into markdown content
 * Adds a "## Recommended Tools" section at the end if tools are found
 */
export function injectAffiliateBlocks(
  markdown: string,
  tools: AffiliateTool[],
  workspaceId?: string
): string {
  if (!tools || tools.length === 0) return markdown;

  // Build the tools section
  let toolsSection = "\n\n## 🔧 Recommended Tools\n\n";

  for (const tool of tools) {
    const trackingUrl = workspaceId
      ? `/api/affiliate?workspaceId=${workspaceId}&tool=${encodeURIComponent(tool.toolName)}&url=${encodeURIComponent(tool.url)}`
      : tool.url;

    toolsSection += `### ${tool.toolName}\n`;

    if (tool.description) {
      toolsSection += `${tool.description}\n\n`;
    }

    const badges = [];
    if (tool.badge) badges.push(tool.badge);
    if (tool.price) badges.push(tool.price);

    if (badges.length > 0) {
      toolsSection += `${badges.map((b) => `\`${b}\``).join(" ")} `;
    }

    toolsSection += `[Try ${tool.toolName} →](${trackingUrl})\n\n`;
  }

  // Check if there's already a tools section
  if (markdown.includes("## Recommended Tools") || markdown.includes("## Tools")) {
    // Replace existing section
    return markdown.replace(
      /## (?:Recommended )?Tools[\s\S]*?(?=##|$)/,
      toolsSection
    );
  }

  // Append to end
  return markdown + toolsSection;
}

/**
 * Parse tool name from a URL (fallback)
 */
export function getToolNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Get domain without TLD
    const parts = urlObj.hostname.split(".");
    const domain = parts.length > 2 ? parts[parts.length - 2] : parts[0];
    // Capitalize first letter
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  } catch {
    return "Tool";
  }
}

/**
 * Track affiliate click (call before redirect)
 */
export async function trackAffiliateClick(params: {
  workspaceId?: string;
  playbookSlug?: string;
  toolName: string;
  url: string;
  ref?: string;
}): Promise<void> {
  try {
    await fetch("/api/affiliate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  } catch (error) {
    console.error("[affiliate] Failed to track click:", error);
    // Don't throw - tracking failure shouldn't block redirect
  }
}
