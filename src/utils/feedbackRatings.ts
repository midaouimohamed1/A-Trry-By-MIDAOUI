/**
 * Local User Feedback & Rating Persistence Utility
 * Key: 'ai_model_ratings_v1'
 * Mapping: { [modelRank: number]: 'up' | 'down' }
 */

export type RatingVote = 'up' | 'down';

export interface ModelRatingsMap {
  [modelRank: number]: RatingVote;
}

const RATINGS_STORAGE_KEY = 'ai_model_ratings_v1';

/**
 * Safely loads user ratings from localStorage with mobile and SSR guards
 */
export function getStoredModelRatings(): ModelRatingsMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage?.getItem(RATINGS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to read model ratings from localStorage:', err);
  }
  return {};
}

/**
 * Sets or toggles a user vote for a model
 * Returns the updated ratings map
 */
export function setModelRatingVote(modelRank: number, vote: RatingVote): ModelRatingsMap {
  const current = getStoredModelRatings();
  const currentVote = current[modelRank];

  const updated = { ...current };
  if (currentVote === vote) {
    // Untoggle if clicked again
    delete updated[modelRank];
  } else {
    updated[modelRank] = vote;
  }

  if (typeof window !== 'undefined') {
    try {
      window.localStorage?.setItem(RATINGS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('ai-model-ratings-updated', { detail: { ratings: updated } }));
    } catch (err) {
      console.warn('Failed to write model ratings to localStorage:', err);
    }
  }

  return updated;
}

/**
 * Calculates a sorting boost score for models based on user rating
 */
export function getModelRatingValue(ratings: ModelRatingsMap, modelRank: number): number {
  const vote = ratings[modelRank];
  if (vote === 'up') return 1;
  if (vote === 'down') return -1;
  return 0;
}
