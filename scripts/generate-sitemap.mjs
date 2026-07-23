#!/usr/bin/env node
/**
 * Writes public/sitemap.xml before the Vite build.
 *
 * Static routes are always included. Listing and case-study URLs are pulled
 * from Supabase when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are present
 * in the environment — on Vercel and Netlify they are, so deploys get a
 * complete sitemap without anyone maintaining one by hand. Locally, without
 * those variables, you get the static routes and a warning rather than a
 * failed build.
 *
 * Each URL carries xhtml:link alternates for az/en/ru, matching the hreflang
 * tags the app writes at runtime.
 */

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outFile = resolve(here, '../public/sitemap.xml');

/**
 * This script runs before Vite, so it never sees the variables Vite loads
 * from .env.local — locally that silently produced a sitemap full of the
 * default domain. On Vercel the values are already in process.env and this
 * is a no-op; locally it makes the output match the app.
 */
for (const file of ['.env.local', '.env']) {
  try {
    const text = await readFile(resolve(here, '..', file), 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      // Anything already in the real environment wins.
      if (value && !process.env[key]) process.env[key] = value;
    }
  } catch {
    // No such file — expected on CI and on a fresh clone.
  }
}

const SITE = (process.env.VITE_SITE_URL || 'https://websale.az').replace(/\/+$/, '');
const SUPABASE_URL = process.env.VITE_SUPABASE_URL?.trim();
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY?.trim();
const LOCALES = ['az', 'en', 'ru'];

const staticRoutes = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/portfolio', priority: '0.9', changefreq: 'weekly' },
  { path: '/marketplace', priority: '0.9', changefreq: 'weekly' },
  { path: '/request', priority: '0.8', changefreq: 'monthly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { path: '/refund', priority: '0.4', changefreq: 'yearly' },
];

async function fetchSlugs(table, filter) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];

  const url = `${SUPABASE_URL}/rest/v1/${table}?select=slug,created_at&${filter}`;
  try {
    const response = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!response.ok) {
      console.warn(`[sitemap] ${table} returned ${response.status}; skipping those URLs.`);
      return [];
    }
    return await response.json();
  } catch (error) {
    console.warn(`[sitemap] could not reach Supabase for ${table}:`, error.message);
    return [];
  }
}

function urlEntry({ path, priority = '0.7', changefreq = 'monthly', lastmod }) {
  const loc = `${SITE}${path}`;
  const alternates = LOCALES.map(
    (locale) =>
      `    <xhtml:link rel="alternate" hreflang="${locale}" href="${loc}?lang=${locale}"/>`,
  ).join('\n');

  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    alternates,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${loc}"/>`,
    lastmod ? `    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : null,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

const [listings, cases] = await Promise.all([
  fetchSlugs('listings', 'status=in.(published,sold)'),
  fetchSlugs('case_studies', 'published=eq.true'),
]);

const entries = [
  ...staticRoutes.map(urlEntry),
  ...listings.map((row) =>
    urlEntry({
      path: `/marketplace/${row.slug}`,
      priority: '0.8',
      changefreq: 'monthly',
      lastmod: row.created_at,
    }),
  ),
  ...cases.map((row) =>
    urlEntry({
      path: `/portfolio/${row.slug}`,
      priority: '0.7',
      changefreq: 'monthly',
      lastmod: row.created_at,
    }),
  ),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`;

await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, xml, 'utf8');

const dynamicCount = listings.length + cases.length;
console.log(
  `[sitemap] wrote ${staticRoutes.length + dynamicCount} URLs to public/sitemap.xml` +
    (dynamicCount === 0 && !SUPABASE_URL
      ? ' (static routes only — set VITE_SUPABASE_URL to include listings and case studies)'
      : ''),
);
