import { chromium } from "playwright";

async function testBrowserFetch() {
  console.log("Testing Playwright-based fetching against FreeJobAlert...");
  console.time("Browser fetch time");

  try {
    // Use pre-installed Chromium at /opt/pw-browsers/chromium
    const browser = await chromium.launch({
      headless: true,
      executablePath: "/opt/pw-browsers/chromium",
    });

    const page = await browser.newPage();
    console.log("Navigating to https://www.freejobalert.com/...");

    const response = await page.goto("https://www.freejobalert.com/", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    console.log(`Response status: ${response?.status()}`);

    const html = await page.content();
    await browser.close();

    console.timeEnd("Browser fetch time");
    console.log(`✅ Success! Fetched ${html.length} bytes of HTML`);
    console.log(`First 500 chars:\n${html.slice(0, 500)}`);

    // Check if we got real content (not a WAF block page)
    if (
      html.includes("government") ||
      html.includes("job") ||
      html.includes("article")
    ) {
      console.log(
        "✅ Content appears to be real job listings (found keywords)",
      );
    } else {
      console.log(
        "⚠️ Content doesn't have expected keywords; may still be blocked",
      );
    }
  } catch (err) {
    console.timeEnd("Browser fetch time");
    console.error("❌ Failed:", (err as Error).message);
  }
}

testBrowserFetch().catch(console.error);
