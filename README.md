# NimCrawl 🚀

A highly efficient and optimized web scraper and crawler built with Bun.

## Features

- **Smart Fetching**: Automatically detects if a site needs JavaScript and uses the appropriate method
- **Parallel Processing**: Handles multiple requests in parallel with resource management
- **Content Conversion**: Converts HTML to clean markdown, ideal for LLM applications
- **Metadata Extraction**: Extracts page metadata including Open Graph tags
- **Link Crawling**: Recursively crawls websites with depth and domain control
- **Rate Limiting**: Domain-specific rate limiting to be a good web citizen
- **Caching**: Efficient caching to reduce redundant requests

## Installation

```bash
bun add @aelysia.labs/nimcrawl
```

## Usage

### Basic Scraping

```typescript
import { scrape } from "@aelysia.labs/nimcrawl";

// Scrape a URL and convert to markdown
const result = await scrape("https://example.com", {
  formats: ["markdown", "html"]
});

if (result.success && result.data) {
  console.log(result.data.markdown);
  console.log(result.data.metadata?.title);
}
```

### Batch Scraping

```typescript
import { batchScrape } from "@aelysia.labs/nimcrawl";

// Scrape multiple URLs in parallel
const urls = [
  "https://example.com",
  "https://example.org",
  "https://example.net"
];

const results = await batchScrape(urls, {
  formats: ["markdown"]
});

console.log(`Scraped ${results.data.length} pages`);
```

### Crawling

```typescript
import { crawl } from "@aelysia.labs/nimcrawl";

// Crawl a website with depth control
const crawlResult = await crawl("https://example.com", {
  maxDepth: 2,
  maxPages: 50,
  formats: ["markdown"],
  excludePatterns: ["/blog/*"]
});

console.log(`Crawled ${crawlResult.data.length} pages`);
```

### URL Mapping

```typescript
import { map } from "@aelysia.labs/nimcrawl";

// Get all URLs from a website
const mapResult = await map("https://example.com");

console.log(`Found ${mapResult.links.length} URLs`);

// Search for specific URLs
const searchResult = await map("https://example.com", {
  search: "about"
});

console.log("About pages:", searchResult.links);
```

## Options

### Scrape Options

- `formats`: Array of output formats (`markdown`, `html`, `rawHtml`, `links`, `extract`)
- `useJsdom`: Force using jsdom for JavaScript rendering
- `extractMetadata`: Extract metadata from the page
- `extractLinks`: Extract links from the page
- `location`: Location options for geotargeted content

### Crawl Options

- `maxDepth`: Maximum depth to crawl (default: 3)
- `maxPages`: Maximum number of pages to crawl (default: 100)
- `concurrency`: Number of concurrent requests (default: 5)
- `includePatterns`: URL patterns to include
- `excludePatterns`: URL patterns to exclude
- `allowExternalDomains`: Allow crawling external domains

## Development

```bash
# Clone the repository
git clone https://github.com/aelysia/nimcrawl.git
cd nimcrawl

# Install dependencies
bun install

# Run tests
bun test

# Run example
bun src/example.ts
```

## License

MIT
