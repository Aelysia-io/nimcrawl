import path from "node:path";
/**
 * Common CLI options for NimCrawl commands
 */
import { type Command, Option } from "commander";

// Define the output format types
export type OutputFormatOption = "markdown" | "html" | "json" | "links" | "all";

/**
 * Add common options for output formats
 */
export function addFormatOptions(command: Command): Command {
  return command
    .option("-o, --output <file>", "Output file to write results to")
    .option("--dir <directory>", "Directory to save output files (auto-generates filenames from URLs)")
    .option("-f, --format <format>", "Output format (markdown, html, json, links, all) or comma-separated list", "markdown")
    .option("--links", "Extract and include links in the output");
}

/**
 * Parse the format option into actual format values, supporting comma-separated format lists
 */
export function parseFormatOption(format: string): OutputFormatOption[] {
  // Handle 'all' format option
  if (format === "all") {
    return ["markdown", "html", "json", "links"];
  }

  // Split by comma if multiple formats are specified
  if (format.includes(',')) {
    const formatList = format.split(',').map(f => f.trim().toLowerCase());
    const validFormats: OutputFormatOption[] = [];

    for (const f of formatList) {
      if (["markdown", "html", "json", "links"].includes(f)) {
        validFormats.push(f as OutputFormatOption);
      } else {
        console.warn(`Unknown format: ${f}, skipping`);
      }
    }

    // Default to markdown if no valid formats
    if (validFormats.length === 0) {
      console.warn("No valid formats specified, defaulting to markdown");
      return ["markdown"];
    }

    return validFormats;
  }

  // Single format case
  if (!["markdown", "html", "json", "links"].includes(format)) {
    console.warn(`Unknown format: ${format}, defaulting to markdown`);
    return ["markdown"];
  }

  return [format as OutputFormatOption];
}

/**
 * Add common options for Ollama LLM processing
 */
export function addLLMOptions(command: Command): Command {
  return command
    .option("--model <name>", "LLM model to use (default: gemma3:27b)")
    .option("--ollama-host <url>", "Ollama host URL", "http://127.0.0.1:11434")
    .option("--extract", "Extract structured data from content")
    .option("--summarize", "Generate a summary of the content")
    .option("--max-length <words>", "Maximum length for summaries", "200");
}

/**
 * Add common options for concurrency and rate limiting
 */
export function addConcurrencyOptions(command: Command): Command {
  return command
    .option("--concurrency <number>", "Maximum concurrent requests", "5")
    .option("--domain-delay <ms>", "Delay between requests to same domain (ms)", "200")
    .option("--domain-concurrency <number>", "Max concurrent requests per domain", "2");
}

/**
 * Parse output file path and create directory if needed
 */
export function parseOutputFile(output: string | undefined): string | undefined {
  if (!output) return undefined;

  try {
    // Create directory if needed
    const dir = output.substring(0, output.lastIndexOf("/"));
    if (dir) {
      const fs = require("node:fs");
      fs.mkdirSync(dir, { recursive: true });
    }
    return output;
  } catch (error) {
    console.error(`Error creating output directory: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

/**
 * Convert a URL to a clean filename
 * Removes protocol, replaces special chars, and truncates to reasonable length
 */
export function urlToFilename(url: string, extension = "md"): string {
  // Remove protocol and trailing slashes
  let filename = url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  // Replace invalid filename characters with underscores
  filename = filename.replace(/[\\/:*?"<>|]/g, "_");

  // Replace multiple underscores with a single one
  filename = filename.replace(/_+/g, "_");

  // Truncate if too long (leave room for extension)
  const maxLength = 64;
  if (filename.length > maxLength) {
    filename = filename.substring(0, maxLength);
  }

  // Add extension if not already present
  if (!filename.endsWith(`.${extension}`)) {
    filename = `${filename}.${extension}`;
  }

  return filename;
}

/**
 * Get extension for the specified format
 */
export function getExtensionForFormat(format: string): string {
  switch (format) {
    case "json": return "json";
    case "html": return "html";
    case "markdown": return "md";
    case "links": return "json";
    default: return "md";
  }
}

/**
 * Write result data to a file or stdout
 */
export async function writeOutput(
  data: Record<string, unknown>,
  options: {
    output?: string,
    dir?: string,
    url?: string,
    urls?: string[],
    format?: string,
    json?: boolean,
    markdown?: boolean,
    html?: boolean,
    links?: boolean
  }
): Promise<void> {
  const fs = require("node:fs/promises");

  // Get format(s) from options
  let formatOptions: string[] = ["markdown"]; // Default

  if (options.format) {
    // Use the format option if specified
    formatOptions = parseFormatOption(options.format);
  } else if (options.json) {
    formatOptions = ["json"];
  } else if (options.html) {
    formatOptions = ["html"];
  } else if (options.links) {
    formatOptions = ["links"];
  }

  // Writing output to a file or directory
  if (options.output) {
    // Single output file - use the first format
    const formatOption = formatOptions[0];
    const extension = getExtensionForFormat(formatOption || "markdown");

    // Determine content based on format
    let outputContent: string;

    if (formatOption === "json") {
      outputContent = JSON.stringify(data, null, 2);
    } else if (formatOption === "html" && typeof data === "object" && data.html) {
      outputContent = data.html as string;
    } else if (formatOption === "links" && typeof data === "object" && data.links) {
      outputContent = JSON.stringify({
        links: data.links,
        count: Array.isArray(data.links) ? data.links.length : 0
      }, null, 2);
    } else if (formatOption === "markdown" && typeof data === "object" && data.markdown) {
      outputContent = data.markdown as string;
    } else {
      // Default to JSON if we can't determine content for the format
      outputContent = JSON.stringify(data, null, 2);
    }

    // Check if output file already has an extension that matches the format
    let outputPath = options.output;
    const hasExtension = path.extname(outputPath).toLowerCase().substring(1);

    // If no extension or wrong extension, add the correct one
    if (!hasExtension || !hasExtension.match(extension)) {
      outputPath = `${outputPath}.${extension}`;
    }

    // Ensure directory exists
    const dirPath = path.dirname(outputPath);
    if (dirPath && dirPath !== '.') {
      await fs.mkdir(dirPath, { recursive: true });
    }

    await fs.writeFile(outputPath, outputContent);
    console.log(`Output written to ${outputPath}`);

  } else if (options.dir && (options.url || options.urls)) {
    // Directory output - can write multiple formats
    await fs.mkdir(options.dir, { recursive: true });

    if (options.url) {
      // Single URL case - write each format
      for (const formatOption of formatOptions) {
        const extension = getExtensionForFormat(formatOption);
        let content: string;

        // Determine content based on format
        if (formatOption === "json") {
          content = JSON.stringify(data, null, 2);
        } else if (formatOption === "html" && typeof data === "object" && data.html) {
          content = data.html as string;
        } else if (formatOption === "links" && typeof data === "object" && data.links) {
          content = JSON.stringify({
            links: data.links,
            count: Array.isArray(data.links) ? data.links.length : 0
          }, null, 2);
        } else if (formatOption === "markdown" && typeof data === "object" && data.markdown) {
          content = data.markdown as string;
        } else {
          // Skip if format data isn't available
          continue;
        }

        // Construct filename with format-specific extension
        const filenameBase = options.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
        const filename = urlToFilename(filenameBase, extension);
        const filepath = path.join(options.dir, filename);

        await fs.writeFile(filepath, content);
        console.log(`Output written to ${filepath} (${formatOption} format)`);
      }
    } else if (options.urls && options.urls.length > 0) {
      // Multiple URLs case - save main index for each format and create one file per URL
      for (const formatOption of formatOptions) {
        const extension = getExtensionForFormat(formatOption);
        let indexContent: string;

        // Determine content for main index
        if (formatOption === "json") {
          indexContent = JSON.stringify(data, null, 2);
        } else if (formatOption === "html" && typeof data === "object" && data.html) {
          indexContent = data.html as string;
        } else if (formatOption === "links" && typeof data === "object" && data.links) {
          indexContent = JSON.stringify({
            links: data.links,
            count: Array.isArray(data.links) ? data.links.length : 0
          }, null, 2);
        } else if (formatOption === "markdown" && typeof data === "object" && data.markdown) {
          indexContent = data.markdown as string;
        } else {
          // Skip if format data isn't available for index
          continue;
        }

        // Write the index file for this format
        const indexPath = path.join(options.dir, `index.${extension}`);
        await fs.writeFile(indexPath, indexContent);
        console.log(`Index output written to ${indexPath} (${formatOption} format)`);

        // If there's a 'results' array, try to save individual files for this format
        if (Array.isArray(data.results)) {
          // Only attempt individual files if we have URL-specific data
          for (let i = 0; i < Math.min(options.urls?.length || 0, data.results.length); i++) {
            const url = options.urls?.[i];
            const result = data.results[i];

            if (result && url) {
              const filename = urlToFilename(url, extension);
              const filepath = path.join(options.dir, filename);

              // Determine content for this specific URL in the current format
              let urlContent: string | undefined;

              if (formatOption === "json") {
                urlContent = JSON.stringify({ url, ...result }, null, 2);
              } else if (formatOption === "html" && result.html) {
                urlContent = result.html as string;
              } else if (formatOption === "markdown" && result.markdown) {
                urlContent = result.markdown as string;
              } else if (formatOption === "links" && result.links) {
                urlContent = JSON.stringify({
                  url,
                  links: result.links,
                  count: Array.isArray(result.links) ? result.links.length : 0
                }, null, 2);
              }

              // Only write if we have content for this format
              if (urlContent) {
                await fs.writeFile(filepath, urlContent);
                console.log(`URL output written to ${filepath} (${formatOption} format)`);
              }
            }
          }
        }
        // Handle crawl results which have an array of page data directly
        else if (Array.isArray(data.data) && data.data.length > 0) {
          // Process each page in the crawl results
          for (let i = 0; i < data.data.length; i++) {
            const pageData = data.data[i];
            if (!pageData || !pageData.metadata?.sourceURL) continue;

            const url = pageData.metadata.sourceURL;
            const filename = urlToFilename(url, extension);
            const filepath = path.join(options.dir, filename);

            // Determine content for this page in the current format
            let pageContent: string | undefined;

            if (formatOption === "json") {
              pageContent = JSON.stringify({
                url,
                metadata: pageData.metadata,
                ...(pageData.markdown ? { markdown: pageData.markdown } : {}),
                ...(pageData.html ? { html: pageData.html } : {}),
                ...(pageData.links ? { links: pageData.links } : {})
              }, null, 2);
            } else if (formatOption === "html" && pageData.html) {
              pageContent = pageData.html as string;
            } else if (formatOption === "markdown" && pageData.markdown) {
              pageContent = pageData.markdown as string;
            } else if (formatOption === "links" && pageData.links) {
              pageContent = JSON.stringify({
                url,
                links: pageData.links,
                count: Array.isArray(pageData.links) ? pageData.links.length : 0
              }, null, 2);
            }

            // Only write if we have content for this format
            if (pageContent) {
              await fs.writeFile(filepath, pageContent);
              console.log(`Page output written to ${filepath} (${formatOption} format)`);
            }
          }
        }
      }
    }
  } else {
    // Output to stdout - just use the first format
    const formatOption = formatOptions[0];
    let outputContent: string;

    if (formatOption === "json") {
      outputContent = JSON.stringify(data, null, 2);
    } else if (formatOption === "html" && typeof data === "object" && data.html) {
      outputContent = data.html as string;
    } else if (formatOption === "links" && typeof data === "object" && data.links) {
      outputContent = JSON.stringify({
        links: data.links,
        count: Array.isArray(data.links) ? data.links.length : 0
      }, null, 2);
    } else if (formatOption === "markdown" && typeof data === "object" && data.markdown) {
      outputContent = data.markdown as string;
    } else {
      // Default to JSON if we can't determine content for the format
      outputContent = JSON.stringify(data, null, 2);
    }

    console.log(outputContent);
  }
} 