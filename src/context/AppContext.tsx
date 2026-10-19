import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { AIModel } from '../types';
import { allAIModels, TOTAL_MODELS_COUNT } from '../data/allModels';
import { AppTheme, getStoredTheme, setAppTheme, applyThemeToDocument } from '../utils/themeManager';
import { safeParseComparisonQuery, buildComparisonUrl, sanitizeInput } from '../utils/sanitizer';
import { AnalyticsTracker } from '../utils/analyticsTracker';
import { getStoredModelRatings, getModelRatingValue, ModelRatingsMap } from '../utils/feedbackRatings';

export interface AppState {
  // Theme & Language
  currentTheme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  language: 'ar' | 'en' | 'both';
  setLanguage: (lang: 'ar' | 'en' | 'both') => void;

  // Filter & Search
  searchTerm: string;
  setSearchTerm: (q: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedDeveloper: string;
  setSelectedDeveloper: (dev: string) => void;
  selectedPricing: string;
  setSelectedPricing: (pricing: string) => void;
  onlyTrending: boolean;
  setOnlyTrending: (val: boolean | ((prev: boolean) => boolean)) => void;
  onlyTop50: boolean;
  setOnlyTop50: (val: boolean | ((prev: boolean) => boolean)) => void;
  sortBy: 'rank_asc' | 'popularity_desc' | 'name_asc' | 'year_desc';
  setSortBy: (sort: 'rank_asc' | 'popularity_desc' | 'name_asc' | 'year_desc') => void;
  activePresetId: string | null;
  setActivePresetId: (id: string | null) => void;
  viewMode: 'grid' | 'compact';
  setViewMode: (mode: 'grid' | 'compact') => void;
  handleResetFilters: () => void;
  resetFilters: () => void;
  handleSelectPreset: (presetId: string | null) => void;

  // Model Data & Pagination
  allModels: AIModel[];
  filteredModels: AIModel[];
  paginatedModels: AIModel[];
  displayedModels: AIModel[];
  currentPage: number;
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
  itemsPerPage: number;
  setItemsPerPage: (items: number) => void;
  totalPages: number;
  totalModelsCount: number;
  visibleCount: number;
  loadMore: () => void;

  // Ratings & Feedback
  userRatings: ModelRatingsMap;
  setUserRatings: React.Dispatch<React.SetStateAction<ModelRatingsMap>>;

  // Bookmarks
  bookmarkedRanks: number[];
  bookmarkedModels: AIModel[];
  isBookmarked: (rank: number) => boolean;
  toggleBookmark: (model: AIModel) => void;
  clearBookmarks: () => void;

  // Comparison & Deep-linking
  comparedRanks: number[];
  comparedModels: AIModel[];
  isCompared: (rank: number) => boolean;
  toggleCompare: (model: AIModel) => void;
  clearComparison: () => void;
  shareComparisonUrl: string;

  // Modals & Active Model
  selectedModel: AIModel | null;
  setSelectedModel: (model: AIModel | null) => void;
  showPlayground: boolean;
  setShowPlayground: (show: boolean | ((prev: boolean) => boolean)) => void;
  showWizard: boolean;
  setShowWizard: (show: boolean | ((prev: boolean) => boolean)) => void;
  showCalculator: boolean;
  setShowCalculator: (show: boolean | ((prev: boolean) => boolean)) => void;
  showStudio: boolean;
  setShowStudio: (show: boolean | ((prev: boolean) => boolean)) => void;
  showRepoLister: boolean;
  setShowRepoLister: (show: boolean | ((prev: boolean) => boolean)) => void;
  isCompareOpen: boolean;
  setIsCompareOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isBookmarksOpen: boolean;
  setIsBookmarksOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isExportOpen: boolean;
  setIsExportOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

const BOOKMARKS_STORAGE_KEY = 'ai_directory_bookmarks';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Theme & Language
  const [currentTheme, setCurrentThemeState] = useState<AppTheme>(() => getStoredTheme());
  const [language, setLanguage] = useState<'ar' | 'en' | 'both'>('both');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDeveloper, setSelectedDeveloper] = useState<string>('all');
  const [selectedPricing, setSelectedPricing] = useState<string>('All');
  const [onlyTrending, setOnlyTrending] = useState<boolean>(false);
  const [onlyTop50, setOnlyTop50] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'rank_asc' | 'popularity_desc' | 'name_asc' | 'year_desc'>('rank_asc');
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(24);
  const [visibleCount, setVisibleCount] = useState<number>(36);

  // Ratings
  const [userRatings, setUserRatings] = useState<ModelRatingsMap>(() => getStoredModelRatings());

  useEffect(() => {
    const handleRatingsUpdate = (e: any) => {
      setUserRatings(e?.detail?.ratings || getStoredModelRatings());
    };
    window.addEventListener('ai-model-ratings-updated', handleRatingsUpdate);
    return () => window.removeEventListener('ai-model-ratings-updated', handleRatingsUpdate);
  }, []);

  // Modals
  const [selectedModel, setSelectedModelState] = useState<AIModel | null>(null);
  const [showPlayground, setShowPlayground] = useState<boolean>(false);
  const [showWizard, setShowWizard] = useState<boolean>(false);
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [showStudio, setShowStudio] = useState<boolean>(false);
  const [showRepoLister, setShowRepoLister] = useState<boolean>(true); // Active by default for RepoLister-X
  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Bookmarks with LocalStorage persistence
  const [bookmarkedRanks, setBookmarkedRanks] = useState<number[]>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
      }
    } catch {
      return [];
    }
    return [];
  });

  // Comparisons with URL deep-linking support
  const [comparedRanks, setComparedRanks] = useState<number[]>(() => {
    if (typeof window !== 'undefined') {
      const initialFromUrl = safeParseComparisonQuery(window.location.search, TOTAL_MODELS_COUNT, 6);
      return initialFromUrl;
    }
    return [];
  });

  // Initialize selected model from URL if ?model=rank is present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const modelRankParam = params.get('model');
      if (modelRankParam && /^\d+$/.test(modelRankParam)) {
        const rankNum = parseInt(modelRankParam, 10);
        const match = allAIModels.find((m) => m.rank === rankNum);
        if (match) {
          setSelectedModelState(match);
          AnalyticsTracker.trackModelInteraction(match.rank, match.name, 'view');
        }
      }
    }
  }, []);

  // Update theme and apply classes
  const setTheme = (theme: AppTheme) => {
    setCurrentThemeState(theme);
    setAppTheme(theme);
    applyThemeToDocument(theme);
  };

  useEffect(() => {
    applyThemeToDocument(currentTheme);
  }, [currentTheme]);

  // Persist Bookmarks
  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarkedRanks));
      }
    } catch (err) {
      console.warn('Failed to persist bookmarks:', err);
    }
  }, [bookmarkedRanks]);

  // Sync comparison state to URL query parameter without reloading
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (comparedRanks.length > 0) {
        url.searchParams.set('compare', comparedRanks.join(','));
      } else {
        url.searchParams.delete('compare');
      }

      if (selectedModel) {
        url.searchParams.set('model', String(selectedModel.rank));
      } else {
        url.searchParams.delete('model');
      }

      window.history.replaceState({}, '', url.toString());
    }
  }, [comparedRanks, selectedModel]);

  const setSelectedModel = (model: AIModel | null) => {
    setSelectedModelState(model);
    if (model) {
      AnalyticsTracker.trackModelInteraction(model.rank, model.name, 'view');
    }
  };

  const isBookmarked = (rank: number) => bookmarkedRanks.includes(rank);
  const isCompared = (rank: number) => comparedRanks.includes(rank);

  const toggleBookmark = (model: AIModel) => {
    setBookmarkedRanks((prev) => {
      const exists = prev.includes(model.rank);
      if (!exists) {
        AnalyticsTracker.trackModelInteraction(model.rank, model.name, 'bookmark');
        return [...prev, model.rank];
      } else {
        return prev.filter((r) => r !== model.rank);
      }
    });
  };

  const clearBookmarks = () => {
    setBookmarkedRanks([]);
  };

  const toggleCompare = (model: AIModel) => {
    setComparedRanks((prev) => {
      const exists = prev.includes(model.rank);
      if (exists) {
        return prev.filter((r) => r !== model.rank);
      }
      if (prev.length >= 6) {
        return prev;
      }
      AnalyticsTracker.trackModelInteraction(model.rank, model.name, 'compare');
      return [...prev, model.rank];
    });
  };

  const clearComparison = () => {
    setComparedRanks([]);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedDeveloper('all');
    setSelectedPricing('All');
    setOnlyTrending(false);
    setOnlyTop50(false);
    setSortBy('rank_asc');
    setActivePresetId(null);
    setCurrentPage(1);
  };

  const resetFilters = handleResetFilters;

  const handleSelectPreset = (presetId: string | null) => {
    setActivePresetId(presetId);
    setCurrentPage(1);
    if (!presetId) {
      handleResetFilters();
      return;
    }

    switch (presetId) {
      case 'coding':
        setSelectedCategory('All');
        setSelectedPricing('All');
        setSearchTerm('Code');
        setOnlyTrending(false);
        setOnlyTop50(false);
        setSortBy('popularity_desc');
        break;
      case 'reasoning':
        setSelectedCategory('All');
        setSelectedPricing('All');
        setSearchTerm('Reasoning');
        setOnlyTrending(false);
        setOnlyTop50(false);
        setSortBy('rank_asc');
        break;
      case 'arabic':
        setSelectedCategory('All');
        setSelectedPricing('All');
        setSearchTerm('Arabic');
        setOnlyTrending(false);
        setOnlyTop50(false);
        setSortBy('popularity_desc');
        break;
      case 'cheapest_free':
        setSelectedCategory('All');
        setSelectedPricing('Free');
        setSearchTerm('');
        setOnlyTrending(false);
        setOnlyTop50(false);
        setSortBy('popularity_desc');
        break;
      case 'creative_vision':
        setSelectedCategory('Vision');
        setSelectedPricing('All');
        setSearchTerm('');
        setOnlyTrending(false);
        setOnlyTop50(false);
        setSortBy('popularity_desc');
        break;
      case 'open_weights':
        setSelectedCategory('All');
        setSelectedPricing('Open Source');
        setSearchTerm('');
        setOnlyTrending(false);
        setOnlyTop50(false);
        setSortBy('popularity_desc');
        break;
      case 'enterprise':
        setSelectedCategory('All');
        setSelectedPricing('All');
        setSearchTerm('Enterprise');
        setOnlyTrending(false);
        setOnlyTop50(false);
        setSortBy('rank_asc');
        break;
      default:
        break;
    }
  };

  const loadMore = () => {
    setVisibleCount((prev) => prev + 36);
  };

  // Filtered models calculation
  const filteredModels = useMemo(() => {
    return allAIModels.filter((model) => {
      // Top 50 filter
      if (onlyTop50 && model.rank > 50) {
        return false;
      }

      if (onlyTrending && !model.isTrending) return false;
      if (selectedCategory !== 'All' && model.category !== selectedCategory) return false;
      if (selectedDeveloper !== 'all' && model.developer !== selectedDeveloper) return false;
      if (selectedPricing !== 'All' && model.pricing !== selectedPricing) return false;

      if (searchTerm.trim()) {
        const query = sanitizeInput(searchTerm.toLowerCase().trim());
        const matchName = model.name.toLowerCase().includes(query);
        const matchDev = model.developer.toLowerCase().includes(query);
        const matchRank = model.rank.toString() === query || `#${model.rank}` === query;
        const matchDescAr = model.descriptionAr.toLowerCase().includes(query);
        const matchDescEn = model.descriptionEn.toLowerCase().includes(query);
        const matchFeaturesAr = model.keyFeaturesAr.some((f) => f.toLowerCase().includes(query));
        const matchFeaturesEn = model.keyFeaturesEn.some((f) => f.toLowerCase().includes(query));
        const matchCat =
          model.category.toLowerCase().includes(query) ||
          model.categoryAr.toLowerCase().includes(query);

        if (
          !matchName &&
          !matchDev &&
          !matchRank &&
          !matchDescAr &&
          !matchDescEn &&
          !matchFeaturesAr &&
          !matchFeaturesEn &&
          !matchCat
        ) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'popularity_desc') {
        const boostA = getModelRatingValue(userRatings, a.rank) * 10;
        const boostB = getModelRatingValue(userRatings, b.rank) * 10;
        const scoreA = a.popularityScore + boostA;
        const scoreB = b.popularityScore + boostB;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.rank - b.rank;
      }
      if (sortBy === 'year_desc') {
        return parseInt(b.releaseYear || '0', 10) - parseInt(a.releaseYear || '0', 10);
      }
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      return a.rank - b.rank;
    });
  }, [searchTerm, selectedCategory, selectedDeveloper, selectedPricing, onlyTrending, onlyTop50, sortBy, userRatings]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedDeveloper, selectedPricing, onlyTrending, onlyTop50, sortBy, itemsPerPage]);

  const totalPages = Math.ceil(filteredModels.length / itemsPerPage);

  const paginatedModels = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredModels.slice(start, start + itemsPerPage);
  }, [filteredModels, currentPage, itemsPerPage]);

  const displayedModels = useMemo(() => {
    return filteredModels.slice(0, visibleCount);
  }, [filteredModels, visibleCount]);

  const comparedModels = useMemo(() => {
    return allAIModels.filter((m) => comparedRanks.includes(m.rank));
  }, [comparedRanks]);

  const bookmarkedModels = useMemo(() => {
    return allAIModels.filter((m) => bookmarkedRanks.includes(m.rank));
  }, [bookmarkedRanks]);

  const shareComparisonUrl = useMemo(() => {
    return buildComparisonUrl(comparedRanks);
  }, [comparedRanks]);

  const value: AppState = {
    currentTheme,
    setTheme,
    language,
    setLanguage,
    searchTerm,
    setSearchTerm,
    searchQuery: searchTerm,
    setSearchQuery: setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    selectedDeveloper,
    setSelectedDeveloper,
    selectedPricing,
    setSelectedPricing,
    onlyTrending,
    setOnlyTrending,
    onlyTop50,
    setOnlyTop50,
    sortBy,
    setSortBy,
    activePresetId,
    setActivePresetId,
    viewMode,
    setViewMode,
    handleResetFilters,
    resetFilters,
    handleSelectPreset,
    allModels: allAIModels,
    filteredModels,
    paginatedModels,
    displayedModels,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    totalModelsCount: TOTAL_MODELS_COUNT,
    visibleCount,
    loadMore,
    userRatings,
    setUserRatings,
    bookmarkedRanks,
    bookmarkedModels,
    isBookmarked,
    toggleBookmark,
    clearBookmarks,
    comparedRanks,
    comparedModels,
    isCompared,
    toggleCompare,
    clearComparison,
    shareComparisonUrl,
    selectedModel,
    setSelectedModel,
    showPlayground,
    setShowPlayground,
    showWizard,
    setShowWizard,
    showCalculator,
    setShowCalculator,
    showStudio,
    setShowStudio,
    showRepoLister,
    setShowRepoLister,
    isCompareOpen,
    setIsCompareOpen,
    isBookmarksOpen,
    setIsBookmarksOpen,
    isExportOpen,
    setIsExportOpen
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppState => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
