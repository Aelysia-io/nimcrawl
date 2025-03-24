/**
 * LLM Processor Utility
 * 
 * Provides integration with Ollama for local LLM processing
 * Used for structured data extraction, summarization, and content analysis
 */

import { Ollama } from "ollama";
import type { ExtractOptions, ExtractResult } from "../types";
import { createCache } from "./cache";

// Default Ollama server URL
const DEFAULT_OLLAMA_HOST = "http://127.0.0.1:11434";

// Default model to use
const DEFAULT_MODEL = "gemma3:27b";

// Cache for model availability checks - 10 minutes TTL
const MODEL_VALIDATION_CACHE = createCache<boolean>(10 * 60 * 1000);

// Cache for Ollama server health checks - 1 minute TTL
const SERVER_HEALTH_CACHE = createCache<boolean>(60 * 1000);

/**
 * Estimates tokens based on rough character count
 * Different models have different tokenization, but this is a reasonable approximation
 */
function estimateTokens(text: string): number {
  // An average of 4 characters per token is a reasonable approximation
  // for many languages and tokenization schemes
  return Math.ceil(text.length / 4);
}

/**
 * Adaptively truncates content based on model context limits
 * @param content The content to truncate
 * @param model The model name (used to determine appropriate limits)
 * @returns Truncated content
 */
function adaptiveTruncate(content: string, model?: string): string {
  // Determine context size based on model
  let contextSize = 4096; // Default context size

  if (model) {
    // Different models have different context windows
    const modelName = model.toLowerCase();
    if (modelName.includes("llama3")) contextSize = 8192;
    else if (modelName.includes("llama2")) contextSize = 4096;
    else if (modelName.includes("gemma3")) contextSize = 8192;
    else if (modelName.includes("gemma")) contextSize = 8192;
    else if (modelName.includes("mistral")) contextSize = 8192;
    else if (modelName.includes("mixtral")) contextSize = 32768;
    else if (modelName.includes("phi3")) contextSize = 2048;
  }

  // Reserve tokens for prompt overhead and response
  const promptOverheadTokens = 500;
  const maxResponseTokens = 1000;
  const availableTokens = contextSize - promptOverheadTokens - maxResponseTokens;

  // Estimate tokens in content (4 chars per token is a rough estimate)
  const estimatedTokens = Math.ceil(content.length / 4);

  // If content fits, return it unchanged
  if (estimatedTokens <= availableTokens) {
    return content;
  }

  // Otherwise, truncate to fit
  const ratio = availableTokens / estimatedTokens;
  const charsToKeep = Math.floor(content.length * ratio);

  // If very long, keep introduction and conclusion
  if (content.length > 10000) {
    const introLength = Math.floor(charsToKeep * 0.7);
    const conclusionLength = charsToKeep - introLength;

    return `${content.substring(0, introLength)}

[...content truncated for model context size...]

${content.substring(content.length - conclusionLength)}`;
  }

  // Otherwise just truncate from the end
  return `${content.substring(0, charsToKeep)}

[...remainder truncated for model context size...]`;
}

/**
 * Model options for Ollama API
 */
export interface OllamaModelOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_ctx?: number;
  num_predict?: number;
  repeat_penalty?: number;
  seed?: number;
  stop?: string[];
  presence_penalty?: number;
  frequency_penalty?: number;
  tfs_z?: number;
  mirostat?: number;
  mirostat_tau?: number;
  mirostat_eta?: number;
}

/**
 * Schema definition for LLM extraction
 */
export interface SchemaProperty {
  type: "string" | "number" | "boolean" | "object" | "array" | "null";
  description?: string;
  items?: SchemaProperty; // For array types
  properties?: Record<string, SchemaProperty>; // For object types
  required?: string[]; // For object types
  enum?: string[] | number[] | boolean[]; // For enum constraints
  minimum?: number; // For number constraints
  maximum?: number; // For number constraints
  minLength?: number; // For string constraints
  maxLength?: number; // For string constraints
  pattern?: string; // For string pattern constraints
  format?: string; // For string format constraints
}

/**
 * Strongly typed schema for LLM extraction
 */
export interface ExtractionSchema {
  [key: string]: SchemaProperty;
}

/**
 * Options for content summarization
 */
export interface SummarizeOptions {
  model?: string;
  maxLength?: number;
  ollamaHost?: string;
  modelOptions?: OllamaModelOptions;
}

/**
 * Result of summarization
 */
export interface SummarizeResult {
  success: boolean;
  summary?: string;
  error?: string;
}

/**
 * Default template for extracting structured data
 */
const DEFAULT_EXTRACTION_TEMPLATE = `
You are an AI assistant specialized in extracting structured data from web content.
Extract the requested information according to the provided schema.
Only include information that is explicitly mentioned in the content.
Response MUST be valid JSON matching the schema exactly.
Be thorough in your analysis and extract all relevant information.
If you cannot find information for a field, use an appropriate default value based on the field type.
`;

/**
 * Extracted data type - strongly typed data structure for extracted content
 */
export type ExtractedData = Record<string, string | number | boolean | null | string[] | number[] | boolean[] | Record<string, string | number | boolean | null | string[] | number[] | boolean[]>>;

/**
 * Creates an Ollama client
 */
function createOllamaClient(host?: string): Ollama {
  return new Ollama({ host: host || DEFAULT_OLLAMA_HOST });
}

/**
 * Checks if Ollama server is running with caching to avoid repeated checks
 */
async function checkServerHealth(ollamaHost: string): Promise<boolean> {
  const cacheKey = `server:${ollamaHost}`;

  // Check cache first
  const cachedHealth = SERVER_HEALTH_CACHE.get(cacheKey);
  if (cachedHealth !== undefined) {
    return cachedHealth;
  }

  try {
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch(`${ollamaHost}/api/version`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const isHealthy = response.ok;
    SERVER_HEALTH_CACHE.set(cacheKey, isHealthy);
    return isHealthy;
  } catch (error) {
    SERVER_HEALTH_CACHE.set(cacheKey, false);
    return false;
  }
}

/**
 * Validates whether the model exists in Ollama with caching to avoid repeated checks
 */
async function validateModel(ollama: Ollama, model: string, ollamaHost: string): Promise<boolean> {
  const cacheKey = `model:${ollamaHost}:${model}`;

  // Check cache first
  const cachedValidation = MODEL_VALIDATION_CACHE.get(cacheKey);
  if (cachedValidation !== undefined) {
    return cachedValidation;
  }

  try {
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${ollamaHost}/api/tags`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      MODEL_VALIDATION_CACHE.set(cacheKey, false);
      console.error(`Failed to get model list: ${response.statusText}`);
      return false;
    }

    const data = await response.json() as { models: Array<{ name: string }> };
    const modelExists = data.models.some(m => m.name === model);

    if (!modelExists) {
      console.error(`Model "${model}" not found. Available models: ${data.models.map(m => m.name).join(", ")}`);
      console.error(`Try running: ollama pull ${model}`);
    }

    MODEL_VALIDATION_CACHE.set(cacheKey, modelExists);
    return modelExists;
  } catch (error) {
    MODEL_VALIDATION_CACHE.set(cacheKey, false);
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error(`Timeout while checking for model: ${model}`);
    } else {
      console.error(`Error checking for model: ${error instanceof Error ? error.message : String(error)}`);
    }
    return false;
  }
}

/**
 * Extracts structured data from content using Ollama
 */
export async function extractStructuredData(
  content: string,
  options: ExtractOptions = {}
): Promise<ExtractResult> {
  try {
    // Validate we have enough content to extract from
    if (!content || content.trim().length < 200) {
      return {
        success: false,
        error: "Content is too short for meaningful extraction",
        data: { _warning: "Content too short for extraction" }
      };
    }

    // Create a reasonable fallback schema if none provided
    const schema = options.schema || {
      title: { type: "string", description: "The title of the page" },
      summary: { type: "string", description: "A brief summary of the content" },
      topics: { type: "array", items: { type: "string" }, description: "Main topics covered" }
    };

    // Try to connect to Ollama
    try {
      const ollamaHost = options.ollamaHost || DEFAULT_OLLAMA_HOST;
      const model = options.model || DEFAULT_MODEL;

      // First check if Ollama server is running
      console.log(`Checking Ollama server at ${ollamaHost}...`);
      const serverIsHealthy = await checkServerHealth(ollamaHost);

      if (!serverIsHealthy) {
        return {
          success: false,
          error: `Could not connect to Ollama server at ${ollamaHost}. Make sure Ollama is running.`,
          data: { _error: "Ollama connection failed", _hint: "Run Ollama with 'ollama serve'" }
        };
      }

      // Then initialize Ollama client
      const ollama = createOllamaClient(ollamaHost);

      // Check if model exists
      const modelExists = await validateModel(ollama, model, ollamaHost);
      if (!modelExists) {
        return {
          success: false,
          error: `Model "${model}" not found in Ollama. Try running: ollama pull ${model}`,
          data: { _error: `Model "${model}" not found` }
        };
      }

      console.log(`Using model: ${model} for extraction`);

      // Create schema-based prompt
      const systemPrompt = options.systemPrompt || DEFAULT_EXTRACTION_TEMPLATE;

      // Adaptively truncate content based on model's context window
      const truncatedContent = adaptiveTruncate(content, model);

      // Format user prompt with schema and truncated content
      const userPrompt = options.prompt ||
        `Extract the following data from the content according to this schema:
        ${JSON.stringify(schema, null, 2)}
        
        Content:
        ${truncatedContent}
        
        Response should be ONLY valid JSON matching the schema exactly.
        Each field must be present and populated with the values from the content.
        Be thorough in your extraction and ensure to output a valid JSON object.`;

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ];

      console.log("Sending extraction request to Ollama...");
      console.log(`Schema: ${JSON.stringify(schema, null, 2)}`);

      try {
        // Get response from Ollama
        const response = await ollama.chat({
          model,
          messages,
          format: "json",
          // Pass additional model parameters
          options: options.modelOptions
        });

        console.log("Received response from Ollama");
        console.log(`Raw response (first 200 chars): ${response.message.content.substring(0, 200)}`);

        // Parse the response
        try {
          const responseContent = response.message.content.trim();

          // Try to extract JSON directly first
          if (responseContent.startsWith("{") && responseContent.endsWith("}")) {
            const extractedData = JSON.parse(responseContent) as ExtractedData;

            if (Object.keys(extractedData).length === 0) {
              console.warn("Warning: Extracted data is an empty object");
            }

            return {
              success: true,
              data: extractedData
            };
          }

          // If not a direct JSON, try to find JSON block in the response
          const jsonStart = responseContent.indexOf("{");
          const jsonEnd = responseContent.lastIndexOf("}") + 1;

          if (jsonStart === -1 || jsonEnd === 0) {
            console.error("No valid JSON found in response:");
            console.error(responseContent);
            return {
              success: false,
              error: "No valid JSON found in response",
              rawResponse: responseContent
            };
          }

          const jsonContent = responseContent.slice(jsonStart, jsonEnd);
          console.log(`Extracted JSON from response (${jsonContent.length} chars)`);

          try {
            const extractedData = JSON.parse(jsonContent) as ExtractedData;

            if (Object.keys(extractedData).length === 0) {
              console.warn("Warning: Extracted data is an empty object");
            }

            return {
              success: true,
              data: extractedData
            };
          } catch (jsonError) {
            console.error("Failed to parse JSON from response:", jsonError);
            return {
              success: false,
              error: `Failed to parse JSON from response: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`,
              rawResponse: responseContent
            };
          }
        } catch (parseError) {
          console.error("Failed to parse LLM response:", parseError);
          console.error("Raw response:", response.message.content);

          return {
            success: false,
            error: `Failed to parse LLM response as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
            rawResponse: response.message.content
          };
        }
      } catch (ollamaError) {
        console.error("Ollama API error:", ollamaError);

        // Check for specific error types
        const errorMessage = ollamaError instanceof Error ? ollamaError.message : String(ollamaError);

        if (errorMessage.includes("Failed to fetch") || errorMessage.includes("ECONNREFUSED")) {
          // Update server health cache to avoid retrying
          SERVER_HEALTH_CACHE.set(`server:${ollamaHost}`, false);

          return {
            success: false,
            error: `Failed to connect to Ollama. Make sure the server is running at ${ollamaHost}`,
            data: { _error: "Ollama connection error", _hint: "Check if Ollama is running" }
          };
        }

        if (errorMessage.includes("not found")) {
          // Update model validation cache
          MODEL_VALIDATION_CACHE.set(`model:${ollamaHost}:${model}`, false);

          return {
            success: false,
            error: `Model "${model}" not found. Try running: ollama pull ${model}`,
            data: { _error: "Model not found", _hint: `Run: ollama pull ${model}` }
          };
        }

        return {
          success: false,
          error: `LLM extraction failed: ${errorMessage}`,
          data: { _error: "Ollama API error" }
        };
      }
    } catch (error) {
      console.error("LLM extraction error:", error);
      return {
        success: false,
        error: `LLM extraction failed: ${error instanceof Error ? error.message : String(error)}`,
        data: { _error: "Extraction error" }
      };
    }
  } catch (error) {
    console.error("Fatal error during extraction:", error);
    return {
      success: false,
      error: `Fatal error during extraction: ${error instanceof Error ? error.message : String(error)}`,
      data: { _fatal: "Extraction system error" }
    };
  }
}

/**
 * Summarizes content using Ollama
 */
export async function summarizeContent(
  content: string,
  options: SummarizeOptions = {}
): Promise<SummarizeResult> {
  try {
    const ollamaHost = options.ollamaHost || DEFAULT_OLLAMA_HOST;
    const model = options.model || DEFAULT_MODEL;

    // Check server health first
    const serverIsHealthy = await checkServerHealth(ollamaHost);
    if (!serverIsHealthy) {
      return {
        success: false,
        error: `Could not connect to Ollama server at ${ollamaHost}. Make sure Ollama is running.`
      };
    }

    // Initialize client
    const ollama = createOllamaClient(ollamaHost);

    // Validate model exists
    const modelExists = await validateModel(ollama, model, ollamaHost);
    if (!modelExists) {
      return {
        success: false,
        error: `Model "${model}" not found in Ollama. Try running: ollama pull ${model}`
      };
    }

    console.log(`Using model: ${model} for summarization`);
    const maxLength = options.maxLength || 200;

    const systemPrompt =
      `You are an AI assistant specialized in summarizing web content.
      Create clear, concise summaries that capture the main points.`;

    // Use adaptive truncation for content
    const truncatedContent = adaptiveTruncate(content, model);

    const userPrompt =
      `Summarize the following content in ${maxLength} words or less:
      
      ${truncatedContent}`;

    console.log("Sending summarization request to Ollama...");

    // Set up a timeout for the Ollama request
    const response = await ollama.chat({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      options: options.modelOptions
    });

    console.log("Received summarization response from Ollama");

    return {
      success: true,
      summary: response.message.content.trim()
    };
  } catch (error) {
    console.error("Summarization error:", error);

    return {
      success: false,
      error: `Summarization failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
} 