# NimCrawler Examples

This directory contains examples demonstrating various use cases for the NimCrawler library.

## Basic Examples

- **basic-scrape.ts**: Simple scraping of a single URL with multiple output formats
- **batch-scrape.ts**: How to scrape multiple URLs in parallel
- **crawl-site.ts**: Full website crawling with configurable depth and filters
- **site-mapping.ts**: Creating a site map by analyzing link structures

## Advanced Examples

- **javascript-sites.ts**: How to handle JavaScript-heavy sites with JSDOM
- **custom-extraction.ts**: Extracting structured data from webpages

## Running the Examples

To run an example, use the following command:

```bash
bun examples/basic-scrape.ts
```

Or run any other example file similarly.

## Creating Your Own Examples

Feel free to create your own examples based on these templates. The key components to experiment with include:

1. Different `formats` options to extract various content types
2. Setting up filters for crawling with `includePatterns` and `excludePatterns`
3. Configuring rate limiting and concurrency
4. Using different processing strategies for JavaScript-heavy sites 