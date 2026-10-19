export interface GroundingSource {
  title: string;
  uri: string;
}

export interface GroundingMetadataResult {
  webSearchQueries?: string[];
  sources?: GroundingSource[];
  isGrounded: boolean;
}

/**
 * Standard configuration object for Google GenAI models enabling Live Search Grounding.
 * Ensures all outgoing requests fetch real-time 2026+ web knowledge.
 */
export function getLiveSearchGroundingConfig(options: { temperature?: number; responseMimeType?: string } = {}) {
  return {
    tools: [{ googleSearch: {} }],
    temperature: options.temperature ?? 0.7,
    ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {})
  };
}

/**
 * Extracts and formats grounding metadata (search queries and web sources) from a Gemini GenerateContentResponse.
 */
export function extractGroundingMetadata(response: unknown): GroundingMetadataResult {
  const resp = response as {
    candidates?: Array<{
      groundingMetadata?: {
        webSearchQueries?: string[];
        groundingChunks?: Array<{
          web?: {
            title?: string;
            uri?: string;
          };
        }>;
      };
    }>;
  };

  const metadata = resp?.candidates?.[0]?.groundingMetadata;
  if (!metadata) {
    return { isGrounded: false };
  }

  const queries = metadata.webSearchQueries || [];
  const sources: GroundingSource[] = [];

  if (Array.isArray(metadata.groundingChunks)) {
    for (const chunk of metadata.groundingChunks) {
      if (chunk.web?.uri) {
        sources.push({
          title: chunk.web.title || chunk.web.uri,
          uri: chunk.web.uri
        });
      }
    }
  }

  return {
    webSearchQueries: queries.length > 0 ? queries : undefined,
    sources: sources.length > 0 ? sources : undefined,
    isGrounded: queries.length > 0 || sources.length > 0
  };
}
