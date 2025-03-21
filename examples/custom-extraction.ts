/**
 * Custom Data Extraction Example
 *
 * This example demonstrates how to extract structured data from websites
 * using a schema-based approach.
 */

import { scrape } from "../src/index";

async function customExtractionExample() {
  console.log("📊 Custom data extraction example");

  // Define a URL to scrape
  const url = "https://example.com";

  // Define a schema for data extraction
  const result = await scrape(url, {
    formats: ["extract"],
    extractMetadata: true,
  });

  // Process results
  if (result.success && result.data) {
    console.log("✅ Data extraction successful");

    // Display page metadata
    if (result.data.metadata) {
      console.log("\n📝 Page Metadata:");
      console.log(`Title: ${result.data.metadata.title || "N/A"}`);
      console.log(`URL: ${result.data.metadata.sourceURL}`);
    }

    // Display extracted structured data
    if (result.data.extract) {
      console.log("\n🔍 Extracted Data:");

      // Format the extracted data for display
      const extractedData = result.data.extract;
      for (const [key, value] of Object.entries(extractedData)) {
        if (typeof value === "object" && value !== null) {
          console.log(`${key}:`);
          for (const [subKey, subValue] of Object.entries(value)) {
            console.log(`  ${subKey}: ${formatValue(subValue)}`);
          }
          continue;
        }
        console.log(`${key}: ${formatValue(value)}`);
      }
      return;
    }
    console.log("❌ No structured data extracted");
    return;
  }
  console.error("❌ Extraction failed:", result.error);
}

// Helper function to format values for display
function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }

  if (typeof value === "object" && value !== null) {
    return "{Object}";
  }

  return String(value);
}

// Run the example if this file is executed directly
if (import.meta.main) {
  customExtractionExample().catch((error) => console.error("Error:", error));
}
