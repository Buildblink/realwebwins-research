import { test, expect } from "@playwright/test";

test("research workflow persists to dashboard", async ({ page }) => {
  const idea = `Playwright automation idea ${Date.now()}`;

  await page.goto("/");
  await page.fill("#idea", idea);
  await page.click("button:has-text('Generate Research')");

  await expect(page.getByRole("link", { name: "Open in vault" })).toBeVisible({
    timeout: 20_000,
  });

  await page.goto("/dashboard");
  const ideaHeading = page.getByRole("heading", { name: idea });
  await expect(ideaHeading).toBeVisible({ timeout: 20_000 });
});
