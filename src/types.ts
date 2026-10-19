/**
 * RepoLister-X Type Definitions
 * Clean-Room Reverse Engineering GitHub Catalog Assistant
 */

export type RepoListerAngleType = 'direct' | 'adjacent' | 'cross-domain';

export interface RepoListerAngleDefinition {
  id: 'direct' | 'adjacent' | 'cross-domain'; // تم توحيدها لتتوافق مع البقية
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  query: string;
  terms: string[];
}

export interface CatalogedRepo {
  rank: number;
  name: string;
  url: string;
  angle: RepoListerAngleType;
  angleLabel: string;
  description: string;
  isFlagged: boolean;
  flagReason?: string;
  createdAt: string;
  updatedAt: string;
  language: string | null;
}

export interface BatchQueryResult {
  batchNumber: number;
  dateRange: {
    start: string;
    end: string;
  };
  items: CatalogedRepo[];
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
  angleBreakdown?: {
    direct: number;
    adjacent: number;
    crossDomain: number;
  };
}

export interface PreFlightEstimation {
  status: string;
  totalEstimated: number;
  angles: Array<{
    id: string;
    labelEn: string;
    labelAr: string;
    query: string;
    totalCount: number;
    rateLimit: { remaining: number; reset: number; limit: number };
  }>;
  rateLimit: { remaining: number; reset: number; limit: number };
  timestamp: string;
}

export interface ConsoleMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  thinkingSteps?: string[];
  timestamp: string;
  batchData?: BatchQueryResult;
}
