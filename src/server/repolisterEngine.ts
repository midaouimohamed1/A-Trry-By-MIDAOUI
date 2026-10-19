/**
 * RepoLister-X Engine
 * 
 * Specialized GitHub catalog assistant tool focused on "clean-room reverse engineering"
 * and the principle of separating behavioral specification from implementation.
 * 
 * Complies with strict search protocol:
 * - 3-angle search strategy: Direct, Adjacent, Cross-Domain.
 * - Pre-flight per_page=1 estimation for total_count calculation across all angles.
 * - Date-range chunking (newest first, starting today) to bypass 1,000 result API ceiling.
 * - Minimum 2-second rate-limiting delay between requests (10 req/min compliance).
 * - Chronological sort by updated/desc (never stars/popularity).
 * - Neutral self-description reporting, flagging uncertain items ("flagged, verify yourself"),
 *   and tracking omitted count ("never silently drop anything").
 * - Numbered batches (50 per batch) with exact footer.
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
    descriptionEn: 'Technical specification writing tools/templates used by RE teams; legal/compliance templates; older repos (10-20+ yrs)',
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
    query: '"behavioral specification" "implementation" OR "specification-driven" "clean-room" OR "intermediate representation" "specification" OR "clean slate" specification',
    terms: [
      'behavioral specification implementation',
      'specification-driven clean-room',
      'intermediate representation specification',
      'clean slate specification'
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
  nextDateRange?: {
    start: string;
    end: string;
  } | null;
  hasMoreBatches: boolean;
}

// In-memory timestamp to enforce minimum 2-second delay between GitHub API requests
let lastGitHubRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 2100; // 2.1 seconds to be safely above 2s

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
 * Generate date range intervals (month by month) starting from today backwards
 */
export function generateDateRanges(count: number = 24): Array<{ start: string; end: string; label: string }> {
  const ranges: Array<{ start: string; end: string; label: string }> = [];
  const now = new Date();

  let currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (let i = 0; i < count; i++) {
    // Current slice starts at the 1st of this month, ends at currentEnd
    const startOfMonth = new Date(currentEnd.getFullYear(), currentEnd.getMonth(), 1);
    
    const startStr = startOfMonth.toISOString().slice(0, 10);
    const endStr = currentEnd.toISOString().slice(0, 10);

    ranges.push({
      start: startStr,
      end: endStr,
      label: `${startStr} .. ${endStr}`
    });

    // Move to the last day of the previous month
    currentEnd = new Date(startOfMonth.getTime() - 24 * 60 * 60 * 1000);
  }

  return ranges;
}

/**
 * Query GitHub API with per_page=1 to fetch the total_count for an angle
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
 * Clean neutral description generator & uncertainty flagger
 * Rule: Only report what repositories state about themselves.
 * Rule: If unsure whether to include, include with "flagged, verify yourself."
 * Rule: Only omit clearly unrelated results, report how many were omitted.
 */
export function processRepoItem(
  repo: GitHubRepoItem,
  angleId: 'direct' | 'adjacent' | 'cross_domain'
): { include: boolean; item?: FormattedRepo } {
  const rawDesc = (repo.description || '').trim();
  const repoName = repo.name || repo.full_name;

  // Filter out clearly unrelated / blank spam if it contains neither relevant keywords nor description
  const combinedText = `${repoName} ${rawDesc} ${(repo.topics || []).join(' ')}`.toLowerCase();
  
  // Angle determination
  let assignedAngle: 'direct' | 'adjacent' | 'cross-domain' = 'direct';
  if (angleId === 'direct') assignedAngle = 'direct';
  else if (angleId === 'adjacent') assignedAngle = 'adjacent';
  else assignedAngle = 'cross-domain';

  // Check if totally unrelated: zero description and name is completely generic
  if (!rawDesc && repoName.length < 4) {
    return { include: false };
  }

  // Check for uncertainty flagging
  let isFlagged = false;
  let flagReason = '';

  if (!rawDesc) {
    isFlagged = true;
    flagReason = 'لا يوجد وصف رسمي من المستودع - يلزم التحقق الذاتي';
  } else if (rawDesc.length < 20) {
    isFlagged = true;
    flagReason = 'الوصف مقتضب جداً - يلزم التحقق الذاتي';
  } else if (
    !combinedText.includes('clean') &&
    !combinedText.includes('specification') &&
    !combinedText.includes('reverse') &&
    !combinedText.includes('black box') &&
    !combinedText.includes('independent')
  ) {
    isFlagged = true;
    flagReason = 'صلة غير مؤكدة تماماً بالمبدأ - تم التضمين مع إشعار التحقق الذاتي';
  }

  // Clean description: strictly neutral, only what the repo states about itself
  let cleanDescription = rawDesc || `Repository: ${repoName} (No description provided by author)`;
  // Sanitize formatting characters
  cleanDescription = cleanDescription.replace(/[\r\n\t]+/g, ' ').trim();

  return {
    include: true,
    item: {
      rank: 0, // will be assigned in batch
      name: repo.full_name,
      url: repo.html_url,
      angle: assignedAngle,
      angleLabel: assignedAngle === 'direct' ? 'Direct' : assignedAngle === 'adjacent' ? 'Adjacent' : 'Cross-domain',
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
 * Format output text according to exact prompt specifications:
 * Output format: numbered list, 50 per message: name - link - which angle found it (direct/adjacent/cross-domain) - one-line description from the repo's own title/description.
 * End every reply with: total found so far, total remaining (from step 1's estimate), which date range was covered, the full GitHub search link for the user to verify themselves, and "Type continue for the next batch" — continuing means the NEXT date range, never re-running a covered search.
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
