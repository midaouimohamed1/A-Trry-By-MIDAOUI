/**
 * RepoLister-X Search Engine
 * 
 * Implements the complete protocol for "RepoLister-X":
 * - Single Source: GitHub only (no Google, YouTube, blogs).
 * - No ratings or recommendations. No explanations of how tools or exploits work.
 * - 3 mandatory search angles: Direct terms, Adjacent angles, Cross-domain analogies.
 * - Step 1: Lightweight estimation per_page=1 reading total_count and summing them.
 * - Step 2: Search names and descriptions via https://api.github.com/search/repositories?q=...&sort=updated&order=desc&per_page=100&page=N
 * - Step 3: Split by date range (month-by-month, or week-by-week when full).
 * - Step 4: Strict >= 2-second rate-limiting delay between requests (respecting 10 req/min).
 * - Step 5: Never sort by stars or popularity.
 * - Uncertain results: Include with neutral description and "flagged, verify yourself".
 * - Omitted results: Only omit clearly unrelated, and report how many were omitted.
 * - Output: Numbered list 50 per message with exact footer and "Type continue for the next batch".
 */

export interface RepoListerAngle {
  id: 'direct' | 'adjacent' | 'cross_domain';
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  query: string;
  terms: string[];
}

export const REPOLISTER_ANGLES: RepoListerAngle[] = [
  {
    id: 'direct',
    labelEn: 'Direct terms',
    labelAr: 'المصطلحات المباشرة',
    descriptionEn: '"clean room", "clean-room", "black box specification", "functional spec reverse engineering"',
    descriptionAr: 'مصطلحات صريحة ومباشرة للهندسة العكسية بنظام الغرفة النظيفة والتوصيف الصندوقي الأسود',
    query: '"clean room" OR "clean-room" OR "black box specification" OR "functional spec reverse engineering"',
    terms: [
      'clean room',
      'clean-room',
      'black box specification',
      'functional spec reverse engineering'
    ]
  },
  {
    id: 'adjacent',
    labelEn: 'Adjacent angles',
    labelAr: 'الزوايا والمسارات المجاورة',
    descriptionEn: 'Technical specification writing tools/templates used by RE teams; legal/compliance templates proving independent development; older repos (10-20+ yrs)',
    descriptionAr: 'قوالب وأدوات كتابة المواصفات الفنية للفرق العكسية، قوالب الامتثال القانوني للإثبات المستقل، ومشاريع تاريخية (10-20+ سنة)',
    query: '"technical specification" "reverse engineering" OR "clean room" compliance OR "independent development" "reverse engineering" OR "cleanroom software engineering"',
    terms: [
      'technical specification reverse engineering',
      'clean room compliance',
      'independent development reverse engineering',
      'cleanroom software engineering'
    ]
  },
  {
    id: 'cross_domain',
    labelEn: 'Cross-domain angles',
    labelAr: 'زوايا عبر المجالات والنطاقات المتعددة',
    descriptionEn: 'Analogies for "separate the meaning from the exact form" across law, translation, architecture, and documentation',
    descriptionAr: 'قياسات ونماذج مبدأ "فصل المعنى والدلالة عن الشكل البرمجي الدقيق" في القانون، والترجمة، والمعمارية البرمجية',
    query: '"behavioral specification" "implementation" OR "specification-driven" "clean-room" OR "clean slate" specification OR "intermediate representation" "specification"',
    terms: [
      'behavioral specification implementation',
      'specification-driven clean-room',
      'clean slate specification',
      'intermediate representation specification'
    ]
  }
];

export interface GitHubRepoItem {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
}

export interface FormattedRepo {
  rank: number;
  name: string;
  url: string;
  angle: 'direct' | 'adjacent' | 'cross-domain';
  angleLabel: string;
  description: string;
  isFlagged: boolean;
  flagReason?: string;
  createdAt: string;
  updatedAt: string;
  language: string | null;
}

export interface DateRangeSlice {
  start: string;
  end: string;
  label: string;
  type: 'month' | 'week';
}

export interface RepoListerBatchResult {
  batchNumber: number;
  dateRange: {
    start: string;
    end: string;
  };
  items: FormattedRepo[];
  totalFoundSoFar: number;
  totalEstimated: number;
  totalRemaining: number;
  omittedCount: number;
  githubSearchUrl: string;
  rateLimit: {
    remaining: number;
    reset: number;
    limit: number;
  };
  formattedTextAr: string;
  formattedTextEn: string;
  hasMoreBatches: boolean;
  angleBreakdown: {
    direct: number;
    adjacent: number;
    crossDomain: number;
  };
}

// In-memory rate limiter tracker: enforces >= 2 seconds delay between requests
let lastGitHubRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 2100; // 2.1 seconds to guarantee safety

export async function enforceRateLimitDelay(): Promise<number> {
  const now = Date.now();
  const elapsed = now - lastGitHubRequestTime;
  let waitTime = 0;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    waitTime = MIN_REQUEST_INTERVAL_MS - elapsed;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }
  lastGitHubRequestTime = Date.now();
  return waitTime;
}

/**
 * Generate date range intervals (month by month, with week-by-week subdivision capability)
 * Starting from today backwards
 */
export function generateDateRanges(monthsCount: number = 36): DateRangeSlice[] {
  const ranges: DateRangeSlice[] = [];
  const now = new Date();

  let currentEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  for (let i = 0; i < monthsCount; i++) {
    const startOfMonth = new Date(Date.UTC(currentEnd.getUTCFullYear(), currentEnd.getUTCMonth(), 1));
    const startStr = startOfMonth.toISOString().slice(0, 10);
    const endStr = currentEnd.toISOString().slice(0, 10);

    ranges.push({
      start: startStr,
      end: endStr,
      label: `${startStr} .. ${endStr}`,
      type: 'month'
    });

    currentEnd = new Date(startOfMonth.getTime() - 24 * 60 * 60 * 1000);
  }

  return ranges;
}

/**
 * Subdivide a month into 4 week slices if it is full (> 900 results)
 */
export function subdivideMonthIntoWeeks(monthSlice: DateRangeSlice): DateRangeSlice[] {
  const startDate = new Date(monthSlice.start + 'T00:00:00Z');
  const endDate = new Date(monthSlice.end + 'T23:59:59Z');
  const weekSlices: DateRangeSlice[] = [];

  let curStart = new Date(startDate);
  while (curStart <= endDate) {
    const curEnd = new Date(curStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    const actualEnd = curEnd > endDate ? endDate : curEnd;

    const sStr = curStart.toISOString().slice(0, 10);
    const eStr = actualEnd.toISOString().slice(0, 10);

    weekSlices.push({
      start: sStr,
      end: eStr,
      label: `${sStr} .. ${eStr} (أسبوعي)`,
      type: 'week'
    });

    curStart = new Date(actualEnd.getTime() + 24 * 60 * 60 * 1000);
  }

  return weekSlices;
}

/**
 * Step 1: Query GitHub API with per_page=1 to read total_count for an angle
 */
export async function fetchAngleEstimate(
  query: string,
  token?: string
): Promise<{ totalCount: number; rateLimit: { remaining: number; reset: number; limit: number } }> {
  await enforceRateLimitDelay();

  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=1`;
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'RepoLister-X-Catalog-Assistant/1.0'
  };

  if (token && token.trim()) {
    headers['Authorization'] = `token ${token.trim()}`;
  }

  const response = await fetch(url, { headers });

  const remaining = parseInt(response.headers.get('x-ratelimit-remaining') || '10', 10);
  const reset = parseInt(response.headers.get('x-ratelimit-reset') || '0', 10);
  const limit = parseInt(response.headers.get('x-ratelimit-limit') || '10', 10);

  if (!response.ok) {
    if (response.status === 403 || response.status === 429) {
      throw new Error(`GitHub Rate Limit Reached: Remaining 0. Reset at ${new Date(reset * 1000).toLocaleTimeString()}`);
    }
    const errText = await response.text();
    throw new Error(`GitHub API error (${response.status}): ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  return {
    totalCount: data.total_count || 0,
    rateLimit: { remaining, reset, limit }
  };
}

/**
 * Filter, classify, and flag repositories strictly by rules
 */
export function processRepoItem(
  repo: GitHubRepoItem,
  discoveredAngle: 'direct' | 'adjacent' | 'cross-domain'
): { include: boolean; item?: FormattedRepo } {
  const rawDesc = (repo.description || '').trim();
  const repoName = repo.name || repo.full_name;
  const combinedText = `${repoName} ${rawDesc} ${(repo.topics || []).join(' ')}`.toLowerCase();

  // Rule: Only omit results clearly unrelated to the topic
  if (!rawDesc && repoName.length < 4) {
    return { include: false };
  }

  // Rule: Handling uncertain results: if unsure whether to include, include it anyway with neutral description and "flagged, verify yourself."
  let isFlagged = false;
  let flagReason = '';

  if (!rawDesc) {
    isFlagged = true;
    flagReason = 'لا يوجد وصف من المستودع - يلزم التحقق الذاتي';
  } else if (rawDesc.length < 20) {
    isFlagged = true;
    flagReason = 'الوصف مقتضب - يلزم التحقق الذاتي';
  } else if (
    !combinedText.includes('clean') &&
    !combinedText.includes('spec') &&
    !combinedText.includes('reverse') &&
    !combinedText.includes('black box') &&
    !combinedText.includes('independent')
  ) {
    isFlagged = true;
    flagReason = 'صلة غير مؤكدة تماماً - تم التضمين مع إشعار التحقق الذاتي';
  }

  // Neutral description from repo's own title/description (Rule: never explain how any tool works)
  let cleanDescription = rawDesc || `Repository: ${repoName} (No description provided by author)`;
  cleanDescription = cleanDescription.replace(/[\r\n\t]+/g, ' ').trim();

  return {
    include: true,
    item: {
      rank: 0,
      name: repo.full_name,
      url: repo.html_url,
      angle: discoveredAngle,
      angleLabel: discoveredAngle === 'direct' ? 'direct' : discoveredAngle === 'adjacent' ? 'adjacent' : 'cross-domain',
      description: cleanDescription,
      isFlagged,
      flagReason: isFlagged ? (flagReason || 'flagged, verify yourself') : undefined,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      language: repo.language
    }
  };
}

/**
 * Format output text according to prompt specification
 */
export function formatBatchOutput(
  items: FormattedRepo[],
  startIndex: number,
  totalFoundSoFar: number,
  totalEstimated: number,
  dateRange: { start: string; end: string },
  githubSearchUrl: string,
  omittedCount: number,
  hasMoreBatches: boolean,
  language: 'ar' | 'en' = 'ar'
): { textAr: string; textEn: string } {
  const totalRemaining = Math.max(0, totalEstimated - totalFoundSoFar);

  // Arabic formatted version
  const linesAr: string[] = [];
  items.forEach((item, idx) => {
    const num = startIndex + idx + 1;
    const flagNotice = item.isFlagged ? ' [مُعلّم: تحقق بنفسك / flagged, verify yourself]' : '';
    linesAr.push(`${num}. ${item.name} - ${item.url} - ${item.angleLabel} - ${item.description}${flagNotice}`);
  });

  linesAr.push('');
  linesAr.push('---');
  linesAr.push(`• إجمالي ما تم العثور عليه حتى الآن: ${totalFoundSoFar}`);
  linesAr.push(`• إجمالي المتبقي (من تقدير الخطوة الأولى): ${totalRemaining}`);
  linesAr.push(`• النطاق الزمني المغطى: ${dateRange.start} .. ${dateRange.end}`);
  if (omittedCount > 0) {
    linesAr.push(`• المستودعات المستبعدة لعدم صلتها بالموضوع: ${omittedCount}`);
  }
  linesAr.push(`• رابط البحث الكامل على GitHub للتحقق الذاتي: ${githubSearchUrl}`);
  linesAr.push('');
  if (hasMoreBatches) {
    linesAr.push('اكتب continue للمجموعة التالية (Type continue for the next batch)');
  } else {
    linesAr.push('✅ اكتملت جميع النطاقات الزمنية المحددة للبحث.');
  }

  // English formatted version
  const linesEn: string[] = [];
  items.forEach((item, idx) => {
    const num = startIndex + idx + 1;
    const flagNotice = item.isFlagged ? ' [flagged, verify yourself]' : '';
    linesEn.push(`${num}. ${item.name} - ${item.url} - ${item.angleLabel} - ${item.description}${flagNotice}`);
  });

  linesEn.push('');
  linesEn.push('---');
  linesEn.push(`• Total found so far: ${totalFoundSoFar}`);
  linesEn.push(`• Total remaining (from step 1's estimate): ${totalRemaining}`);
  linesEn.push(`• Date range covered: ${dateRange.start} .. ${dateRange.end}`);
  if (omittedCount > 0) {
    linesEn.push(`• Omitted repositories (unrelated to topic): ${omittedCount}`);
  }
  linesEn.push(`• Full GitHub search link for self-verification: ${githubSearchUrl}`);
  linesEn.push('');
  if (hasMoreBatches) {
    linesEn.push('Type continue for the next batch');
  } else {
    linesEn.push('✅ All targeted date range intervals have been successfully cataloged.');
  }

  return {
    textAr: linesAr.join('\n'),
    textEn: linesEn.join('\n')
  };
}
