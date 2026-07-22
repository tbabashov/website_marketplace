import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { site, SUPPORTED_LOCALES, type Locale } from '@/config/site';
import { setLocale } from '@/i18n';
import { getSlot } from '@/lib/images';

interface Seo {
  title: string;
  description: string;
  /** Absolute or root-relative path to the share card. */
  image?: string | null;
  /** 'website' for pages, 'article' for case studies. */
  type?: 'website' | 'article';
  /** Keep a page out of search results (order pages, checkout, the admin desk). */
  noindex?: boolean;
}

function upsertMeta(selector: string, attrs: Record<string, string>): void {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    document.head.appendChild(el);
  }
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
}

function upsertLink(rel: string, href: string, hreflang?: string): void {
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    if (hreflang) el.hreflang = hreflang;
    document.head.appendChild(el);
  }
  el.href = href;
}

/**
 * Per-page, per-locale metadata. Everything is written on navigation rather
 * than rendered once, because this is a single-page app and crawlers that do
 * execute JS read the head after routing.
 *
 * hreflang uses `?lang=` because the language here is a preference rather than
 * a URL segment — one canonical URL per page, three declared language variants.
 */
export function useSeo({ title, description, image, type = 'website', noindex = false }: Seo): void {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();
  const locale = i18n.language as Locale;

  useEffect(() => {
    const url = `${site.url}${pathname}`;
    const ogSlot = getSlot('og-default');
    const shareImage = image
      ? image.startsWith('http')
        ? image
        : `${site.url}${image}`
      : `${site.url}${ogSlot?.expected_path ?? ''}`;

    document.title = title;
    document.documentElement.lang = locale;

    upsertMeta('meta[name="description"]', { name: 'description', content: description });
    upsertMeta('meta[name="robots"]', {
      name: 'robots',
      content: noindex ? 'noindex, nofollow' : 'index, follow',
    });

    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: url });
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: site.name });
    upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: locale });
    if (shareImage) {
      upsertMeta('meta[property="og:image"]', { property: 'og:image', content: shareImage });
    }

    upsertMeta('meta[name="twitter:card"]', {
      name: 'twitter:card',
      content: 'summary_large_image',
    });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
    upsertMeta('meta[name="twitter:description"]', {
      name: 'twitter:description',
      content: description,
    });

    upsertLink('canonical', url);
    for (const l of SUPPORTED_LOCALES) {
      upsertLink('alternate', `${url}?lang=${l}`, l);
    }
    upsertLink('alternate', url, 'x-default');
  }, [title, description, image, type, noindex, pathname, locale]);
}

/**
 * `?lang=xx` overrides the stored preference for one visit. This is what makes
 * the hreflang links above resolve to the language they claim, and it is how a
 * link shared into a Russian-speaking group chat opens in Russian.
 */
export function useLangQueryParam(): void {
  const { search } = useLocation();
  const { i18n } = useTranslation();

  useEffect(() => {
    const requested = new URLSearchParams(search).get('lang');
    if (
      requested &&
      (SUPPORTED_LOCALES as readonly string[]).includes(requested) &&
      requested !== i18n.language
    ) {
      void setLocale(requested as Locale);
    }
  }, [search, i18n]);
}
