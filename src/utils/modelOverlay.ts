/**
 * Dynamic Model Overlay & Live Metadata Cache
 * Allows client-side overrides and live badge updates (e.g. price drops, status badges, arabic notes)
 * without requiring application recompilation.
 */

import { AIModel } from '../types';

export interface ModelOverlayData {
  rank: number;
  customBadgeAr?: string;
  customBadgeEn?: string;
  customBadgeType?: 'new' | 'discount' | 'verified' | 'top_choice';
  isLiveVerified?: boolean;
  communityRating?: number;
  priceNoteAr?: string;
  priceNoteEn?: string;
  updatedAt?: string;
}

const OVERLAY_STORAGE_KEY = 'ai_models_dynamic_overlays_v1';

// Seed default dynamic overlays
const DEFAULT_OVERLAYS: Record<number, ModelOverlayData> = {
  1: { rank: 1, customBadgeAr: 'الأكثر شعبية عالمياً', customBadgeEn: 'Most Popular Globally', customBadgeType: 'top_choice', isLiveVerified: true },
  2: { rank: 2, customBadgeAr: 'الأقوى في البرمجة والمنطق', customBadgeEn: 'Best for Code & Reasoning', customBadgeType: 'top_choice', isLiveVerified: true },
  3: { rank: 3, customBadgeAr: 'الأسرع مع نافذة 2M', customBadgeEn: 'Ultra-fast with 2M Context', customBadgeType: 'top_choice', isLiveVerified: true },
  5: { rank: 5, customBadgeAr: 'ثورة مفتوحة المصدر وبأقل تكلفة', customBadgeEn: 'Cost-Effective Open Weights', customBadgeType: 'discount', isLiveVerified: true },
  8: { rank: 8, customBadgeAr: 'الأفضل للاستضافة الخاصة', customBadgeEn: 'Top Choice for Self-Hosting', customBadgeType: 'verified', isLiveVerified: true },
  42: { rank: 42, customBadgeAr: 'دعم استثنائي للغات والرياضيات', customBadgeEn: 'Exceptional Math & Multilingual', customBadgeType: 'new', isLiveVerified: true }
};

export function getStoredOverlays(): Record<number, ModelOverlayData> {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_OVERLAYS;
    const raw = localStorage.getItem(OVERLAY_STORAGE_KEY);
    if (!raw) return DEFAULT_OVERLAYS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_OVERLAYS, ...parsed };
  } catch {
    return DEFAULT_OVERLAYS;
  }
}

export function saveModelOverlay(data: ModelOverlayData): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const current = getStoredOverlays();
    current[data.rank] = {
      ...current[data.rank],
      ...data,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(OVERLAY_STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn('Failed to save model overlay:', err);
  }
}

export function applyModelOverlay(model: AIModel): AIModel & { overlay?: ModelOverlayData } {
  const overlays = getStoredOverlays();
  const overlay = overlays[model.rank];
  return {
    ...model,
    overlay
  };
}
