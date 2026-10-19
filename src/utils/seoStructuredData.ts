import { AIModel } from '../types';

/**
 * Production-Grade Dynamic SEO & Schema.org JSON-LD Generator
 * Supports Google Rich Snippets for SoftwareApplication, ItemList, and Dataset.
 */

export interface PageMetadataOptions {
  title?: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  type?: 'website' | 'article' | 'product';
  model?: AIModel;
  comparedModels?: AIModel[];
  category?: string;
  language?: 'ar' | 'en';
}

const DEFAULT_METADATA = {
  titleAr: 'دليل الـ 1000 نموذج وأداة ذكاء اصطناعي 2026 | الفهرس الشامل والمختبر التفاعلي',
  titleEn: '1000+ AI Models & Tools Directory 2026 | Interactive Directory & BYOK Playground',
  descriptionAr: 'الفهرس التفاعلي الأكبر لاكتشاف ومقارنة وتجربة أكثر من 1,000 نموذج وأداة ذكاء اصطناعي عالمية مع حاسبة تكاليف API فورية وموجه الاختيار الذكي.',
  descriptionEn: 'The most comprehensive directory of 1,000+ AI models and tools. Compare pricing, context windows, benchmark scores, and test models live with BYOK.'
};

/**
 * Updates document head meta tags dynamically for client-side routing & modals.
 */
export function updatePageMetadata(options: PageMetadataOptions = {}): void {
  if (typeof document === 'undefined') return;

  const lang = options.language || 'ar';
  const isArabic = lang === 'ar';

  let title = options.title || (isArabic ? DEFAULT_METADATA.titleAr : DEFAULT_METADATA.titleEn);
  let description = options.description || (isArabic ? DEFAULT_METADATA.descriptionAr : DEFAULT_METADATA.descriptionEn);

  if (options.model) {
    const m = options.model;
    const modelName = m.name;
    const dev = m.developer;
    const desc = isArabic ? m.descriptionAr : m.descriptionEn;
    const pricing = isArabic ? m.pricingAr : m.pricing;

    title = isArabic
      ? `${modelName} (${dev}) - مواصفات وتجربة النموذج | دليل الذكاء الاصطناعي`
      : `${modelName} by ${dev} - AI Model Specs & Playground | 1000 AI Models`;

    description = `${desc.slice(0, 150)}... [${pricing} - ${m.category}]`;
  } else if (options.comparedModels && options.comparedModels.length > 1) {
    const names = options.comparedModels.map((m) => m.name).join(' vs ');
    title = isArabic
      ? `مقارنة مباشرة: ${names} | دليل الذكاء الاصطناعي`
      : `Side-by-Side Comparison: ${names} | 1000 AI Models`;
    description = isArabic
      ? `مقارنة تقنية شاملة بين ${names} من حيث الأداء والأسعار وسرعة الاستجابة ونافذة السياق.`
      : `Comprehensive benchmark and pricing comparison between ${names}.`;
  } else if (options.category && options.category !== 'All') {
    title = isArabic
      ? `أفضل نماذج ${options.category} لعام 2026 | دليل الذكاء الاصطناعي`
      : `Best ${options.category} Models 2026 | 1000 AI Models Directory`;
  }

  document.title = title;

  setMetaTag('name', 'description', description);
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:type', options.type || 'website');
  setMetaTag('name', 'twitter:title', title);
  setMetaTag('name', 'twitter:description', description);

  // Generate and inject Schema.org JSON-LD
  injectSchemaJsonLd(options);
}

function setMetaTag(attrName: 'name' | 'property', attrValue: string, content: string): void {
  let element = document.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.content = content;
}

/**
 * Builds and injects Schema.org JSON-LD script into document head.
 */
export function injectSchemaJsonLd(options: PageMetadataOptions): void {
  if (typeof document === 'undefined') return;

  const scriptId = 'ai-directory-schema-ld';
  let scriptEl = document.getElementById(scriptId) as HTMLScriptElement;
  if (!scriptEl) {
    scriptEl = document.createElement('script');
    scriptEl.id = scriptId;
    scriptEl.type = 'application/ld+json';
    document.head.appendChild(scriptEl);
  }

  let schemaData: Record<string, unknown>;

  if (options.model) {
    const m = options.model;
    schemaData = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      'name': m.name,
      'operatingSystem': 'Cloud / Cross-platform',
      'applicationCategory': m.category,
      'description': m.descriptionEn || m.descriptionAr,
      'author': {
        '@type': 'Organization',
        'name': m.developer
      },
      'offers': {
        '@type': 'Offer',
        'price': m.apiPricing ? String(m.apiPricing.inputPricePer1M) : '0',
        'priceCurrency': 'USD',
        'category': m.pricing
      },
      'aggregateRating': {
        '@type': 'AggregateRating',
        'ratingValue': (m.popularityScore / 20).toFixed(1),
        'bestRating': '5',
        'worstRating': '1',
        'ratingCount': Math.max(10, Math.round(m.popularityScore * 12))
      },
      'dateModified': m.lastUpdated || '2026-08',
      'url': m.url
    };
  } else if (options.comparedModels && options.comparedModels.length > 1) {
    schemaData = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      'name': `AI Models Comparison: ${options.comparedModels.map((m) => m.name).join(' vs ')}`,
      'itemListElement': options.comparedModels.map((m, idx) => ({
        '@type': 'ListItem',
        'position': idx + 1,
        'item': {
          '@type': 'SoftwareApplication',
          'name': m.name,
          'applicationCategory': m.category,
          'author': {
            '@type': 'Organization',
            'name': m.developer
          }
        }
      }))
    };
  } else {
    schemaData = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': '1000 AI Models & Tools Hub 2026',
      'alternateName': 'دليل الـ 1000 نموذج وأداة ذكاء اصطناعي',
      'url': typeof window !== 'undefined' ? window.location.origin : 'https://ai-models-directory.app',
      'potentialAction': {
        '@type': 'SearchAction',
        'target': {
          '@type': 'EntryPoint',
          'urlTemplate': `${typeof window !== 'undefined' ? window.location.origin : ''}/?q={search_term_string}`
        },
        'query-input': 'required name=search_term_string'
      }
    };
  }

  scriptEl.textContent = JSON.stringify(schemaData);
}
