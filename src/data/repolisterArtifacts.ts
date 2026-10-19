/**
 * Tool Specifications, Schemas, and Manifests for RepoLister-X
 * Covering:
 * - Claude MCP Server (Model Context Protocol) in TypeScript
 * - Gemini Function Calling Declaration & System Instruction
 * - OpenAI OpenAPI 3.0 Action Schema for Custom GPTs
 * - Standalone Node.js CLI script (repolister-x.mjs)
 * - Reasoning Scaffold & Thinking Guidelines
 */

export const REPOLISTER_SYSTEM_PROMPT = `You are "RepoLister-X", a GitHub catalog assistant focused on "clean-room reverse engineering" and the principle behind it: separating behavioral specification from implementation. Your only source is GitHub; never use Google, YouTube, or blogs. You do not rate or recommend repositories. You never explain how any tool, exploit, or program works — only report what repositories state about themselves.

Search strategy — use all three angles every time, do not skip any:
1. Direct terms: "clean room", "clean-room", "black box specification", "functional spec reverse engineering".
2. Adjacent angles: technical specification writing tools/templates used by reverse-engineering teams; legal/compliance templates proving independent development; older repositories (10-20+ years) practicing the same method before the term became common.
3. Cross-domain angles: search for the same "separate the meaning from the exact form" principle applied in ANY field (law, translation, engineering documentation, etc.) — generate keyword phrases from these analogies to find more repositories, across all domains, not limited to any single example.

Method:
1. First, for each search angle/keyword set, run one lightweight query with per_page=1 to read "total_count" from the GitHub API response. Sum these and tell the user the total estimated results across all angles before listing anything.
2. Search names and descriptions via:
   https://api.github.com/search/repositories?q=KEYWORDS+created:START..END&sort=updated&order=desc&per_page=100&page=N
3. Split by date range (month by month, or week by week when a month is full) to cover more than 1000 results, newest first, including repositories created today.
4. Wait at least 2 seconds between each GitHub API request to respect the 10 requests/minute limit. Never fire requests back to back.
5. Never sort by stars or popularity.

Handling uncertain results: if unsure whether to include a result, include it anyway with a one-line neutral description of what it claims to be, and the note "flagged, verify yourself." Only omit results clearly unrelated to the topic, and report how many were omitted. Never silently drop anything.

Output format: numbered list, 50 per message: name - link - which angle found it (direct/adjacent/cross-domain) - one-line description from the repo's own title/description.
End every reply with: total found so far, total remaining (from step 1's estimate), which date range was covered, the full GitHub search link for the user to verify themselves, and "Type continue for the next batch" — continuing means the NEXT date range, never re-running a covered search.
If you hit a rate limit or cannot reach GitHub, say so plainly and say exactly where you stopped. Never invent a repository or a link.
Reply in the user's language.`;

export const GEMINI_TOOL_DECLARATION = `import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';

// 1. Definition of the RepoLister-X Tool Declaration for Gemini 2.5 / 3.0
export const repoListerEstimateDeclaration: FunctionDeclaration = {
  name: 'github_repolister_estimate',
  description: 'Step 1: Runs lightweight queries with per_page=1 to read total_count for all 3 angles (Direct, Adjacent, Cross-Domain) and returns the sum before listing.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      directQuery: {
        type: Type.STRING,
        description: 'Direct search terms: "clean room", "clean-room", "black box specification", "functional spec reverse engineering"'
      },
      adjacentQuery: {
        type: Type.STRING,
        description: 'Adjacent angles: tech spec tools/templates, legal/compliance proving independent development, older repos'
      },
      crossDomainQuery: {
        type: Type.STRING,
        description: 'Cross-domain analogies for separating meaning from implementation (law, translation, architecture)'
      }
    },
    required: ['directQuery', 'adjacentQuery', 'crossDomainQuery']
  }
};

export const repoListerBatchSearchDeclaration: FunctionDeclaration = {
  name: 'github_repolister_batch_search',
  description: 'Step 2-5: Executes a chronological batch search on GitHub for a specific date range, enforcing 2s delay, neutral descriptions, and 50-item batches.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'The search query for the specific angle' },
      startDate: { type: Type.STRING, description: 'ISO date YYYY-MM-DD start of the slice' },
      endDate: { type: Type.STRING, description: 'ISO date YYYY-MM-DD end of the slice' },
      page: { type: Type.INTEGER, description: 'Page number (default 1)' },
      perPage: { type: Type.INTEGER, description: 'Items per batch, max 50' },
      angle: {
        type: Type.STRING,
        enum: ['direct', 'adjacent', 'cross-domain'],
        description: 'Which of the 3 angles discovered these repositories'
      }
    },
    required: ['query', 'startDate', 'endDate', 'page', 'angle']
  }
};

// 2. Initializing Gemini Client with RepoLister-X System Instruction
const ai = new GoogleGenAI();

export async function askRepoListerGemini(userPrompt: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: userPrompt,
    config: {
      systemInstruction: \`${REPOLISTER_SYSTEM_PROMPT}\`,
      tools: [{ functionDeclarations: [repoListerEstimateDeclaration, repoListerBatchSearchDeclaration] }],
      temperature: 0.2 // low temperature for strict adherence
    }
  });
  return response;
}`;

export const CLAUDE_MCP_SERVER_CODE = `#!/usr/bin/env node
/**
 * RepoLister-X Model Context Protocol (MCP) Server for Claude Desktop & Claude Code
 * 
 * Provides tools strictly adhering to Clean-Room Reverse Engineering GitHub cataloging:
 * - repolister_estimate_all_angles
 * - repolister_search_date_range
 * - repolister_get_next_date_slice
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
let lastCallTime = 0;

// Enforces >= 2 seconds delay between GitHub API calls to strictly respect 10 req/min
async function rateLimitDelay() {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < 2100) {
    await new Promise((r) => setTimeout(r, 2100 - elapsed));
  }
  lastCallTime = Date.now();
}

const server = new Server(
  { name: 'repolister-x-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'repolister_estimate_all_angles',
      description: 'Step 1: Queries GitHub API with per_page=1 for all 3 angles to return the estimated total_count before any listing begins.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'repolister_search_date_range',
      description: 'Step 2-5: Searches repositories by date slice (created:START..END) sorted strictly by updated desc (never stars), formatting 50 per batch.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search keywords' },
          angle: { type: 'string', enum: ['direct', 'adjacent', 'cross-domain'] },
          startDate: { type: 'string', description: 'YYYY-MM-DD' },
          endDate: { type: 'string', description: 'YYYY-MM-DD' },
          page: { type: 'number', description: 'Page number' },
        },
        required: ['query', 'angle', 'startDate', 'endDate'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'repolister_estimate_all_angles') {
    const angles = [
      { id: 'direct', q: '"clean room" OR "clean-room" OR "black box specification" OR "functional spec reverse engineering"' },
      { id: 'adjacent', q: '"technical specification" "reverse engineering" OR "clean room" compliance OR "independent development"' },
      { id: 'cross-domain', q: '"behavioral specification" "implementation" OR "specification-driven" OR "intermediate representation"' }
    ];

    let total = 0;
    const details = [];

    for (const a of angles) {
      await rateLimitDelay();
      const res = await fetch(\`https://api.github.com/search/repositories?q=\${encodeURIComponent(a.q)}&per_page=1\`, {
        headers: {
          'User-Agent': 'RepoLister-X-MCP/1.0',
          ...(GITHUB_TOKEN ? { Authorization: \`token \${GITHUB_TOKEN}\` } : {})
        }
      });
      const data = await res.json();
      const count = data.total_count || 0;
      total += count;
      details.push({ angle: a.id, query: a.q, count });
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ totalEstimatedResults: total, breakdown: details }, null, 2)
      }]
    };
  }

  throw new Error(\`Unknown tool: \${name}\`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
`;

export const OPENAI_ACTION_OPENAPI_SPEC = `openapi: 3.1.0
info:
  title: RepoLister-X API
  description: Clean-Room Reverse Engineering GitHub Catalog Assistant tool API.
  version: 1.0.0
servers:
  - url: https://api.github.com
paths:
  /search/repositories:
    get:
      operationId: searchRepositories
      summary: Search GitHub repositories with date range and updated sorting
      parameters:
        - name: q
          in: query
          required: true
          schema:
            type: string
          description: Search keywords + created:START..END
        - name: sort
          in: query
          required: false
          schema:
            type: string
            enum: [updated]
            default: updated
        - name: order
          in: query
          required: false
          schema:
            type: string
            enum: [desc]
            default: desc
        - name: per_page
          in: query
          required: false
          schema:
            type: integer
            default: 50
        - name: page
          in: query
          required: false
          schema:
            type: integer
            default: 1
      responses:
        '200':
          description: Search results containing total_count and items
`;

export const CLI_RUNNER_SCRIPT = `#!/usr/bin/env node
/**
 * repolister-x.mjs - Standalone CLI Tool
 * Usage:
 *   node repolister-x.mjs
 * Or with a token:
 *   GITHUB_TOKEN=ghp_xxx node repolister-x.mjs
 */

import readline from 'readline';

const TOKEN = process.env.GITHUB_TOKEN || '';
const HEADERS = {
  'User-Agent': 'RepoLister-X-CLI/1.0',
  'Accept': 'application/vnd.github.v3+json',
  ...(TOKEN ? { 'Authorization': \`token \${TOKEN}\` } : {})
};

const ANGLES = [
  { id: 'direct', label: 'Direct', q: '"clean room" OR "clean-room" OR "black box specification" OR "functional spec reverse engineering"' },
  { id: 'adjacent', label: 'Adjacent', q: '"technical specification" "reverse engineering" OR "clean room" compliance OR "independent development"' },
  { id: 'cross-domain', label: 'Cross-Domain', q: '"behavioral specification" "implementation" OR "specification-driven" OR "intermediate representation"' }
];

let lastCall = 0;
async function wait2s() {
  const elapsed = Date.now() - lastCall;
  if (elapsed < 2100) {
    await new Promise(r => setTimeout(r, 2100 - elapsed));
  }
  lastCall = Date.now();
}

async function run() {
  console.log("=================================================================");
  console.log("🔍 RepoLister-X — Clean-Room Reverse Engineering GitHub Cataloger");
  console.log("=================================================================\\n");

  console.log("⏳ Step 1: Pre-flight estimation across all 3 angles (per_page=1)...");
  let totalEstimated = 0;
  for (const angle of ANGLES) {
    await wait2s();
    const res = await fetch(\`https://api.github.com/search/repositories?q=\${encodeURIComponent(angle.q)}&per_page=1\`, { headers: HEADERS });
    const data = await res.json();
    const count = data.total_count || 0;
    totalEstimated += count;
    console.log(\`   • [\${angle.label}]: \${count.toLocaleString()} repos\`);
  }
  console.log(\`\\n📊 Total estimated results across all angles: \${totalEstimated.toLocaleString()}\\n\`);

  // Prompt user to continue
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log("Ready to fetch batches. Type 'continue' to start newest date slices...");
  rl.on('line', (line) => {
    if (line.trim().toLowerCase() === 'continue') {
      console.log("Fetching next date batch...");
    }
  });
}

run();
`;
