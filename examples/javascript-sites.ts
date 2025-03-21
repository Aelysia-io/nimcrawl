/**
 * JavaScript-Heavy Sites Example
 *
 * This example demonstrates how to scrape websites that rely heavily on JavaScript
 * for rendering content, using JSDOM for enhanced processing.
 */

import { scrape } from "../src/index";

async function javascriptSitesExample() {
  console.log("🌐 JavaScript-heavy sites example");

  // URL of a site that requires JavaScript for rendering
  const url = "https://spa-example.com"; // Replace with an actual JavaScript-heavy site

  // First attempt without JavaScript handling
  console.log("\n🔍 Attempt 1: Without JavaScript handling");
  const resultWithoutJS = await scrape(url, {
    formats: ["markdown", "html"],
    useJsdom: false, // Don't use JSDOM (default)
  });

  // Print the result
  if (resultWithoutJS.success && resultWithoutJS.data) {
    console.log("✅ Scrape successful without JS handling");

    // Show content preview
    if (resultWithoutJS.data.markdown) {
      const contentLength = resultWithoutJS.data.markdown.length;
      console.log(`Content length: ${contentLength} characters`);
      console.log(
        `Preview: ${resultWithoutJS.data.markdown.substring(0, 150)}...`,
      );
    } else {
      console.log(
        "❌ No markdown content received (JS content might be missing)",
      );
    }
  } else {
    console.error("❌ Scrape failed:", resultWithoutJS.error);
  }

  // Now try with JavaScript handling enabled
  console.log("\n🔍 Attempt 2: With JavaScript handling");
  const resultWithJS = await scrape(url, {
    formats: ["markdown", "html"],
    useJsdom: true, // Enable JSDOM for JavaScript rendering
    actions: [
      // Wait for content to load
      { type: "wait", milliseconds: 1000 },

      // Example: Click a button to show more content
      { type: "click", selector: ".load-more-button" },

      // Wait for new content to render
      { type: "wait", milliseconds: 500 },
    ],
  });

  // Print the result
  if (resultWithJS.success && resultWithJS.data) {
    console.log("✅ Scrape successful with JS handling");

    // Show content preview
    if (resultWithJS.data.markdown) {
      const contentLength = resultWithJS.data.markdown.length;
      console.log(`Content length: ${contentLength} characters`);
      console.log(
        `Preview: ${resultWithJS.data.markdown.substring(0, 150)}...`,
      );

      // Compare results
      const withoutJSLength = resultWithoutJS.data?.markdown?.length || 0;
      const withJSLength = resultWithJS.data.markdown.length;

      const percentDiff = withoutJSLength ?
        Math.round((withJSLength - withoutJSLength) / withoutJSLength * 100) :
        100;

      console.log("\n📊 Content comparison:");
      console.log(`Without JS: ${withoutJSLength} characters`);
      console.log(`With JS: ${withJSLength} characters`);
      console.log(`Difference: ${percentDiff}% more content with JS handling`);
    }
  } else {
    console.error("❌ Scrape failed:", resultWithJS.error);
  }
}

// Run the example if this file is executed directly
if (import.meta.main) {
  javascriptSitesExample().catch((error) => console.error("Error:", error));
}
