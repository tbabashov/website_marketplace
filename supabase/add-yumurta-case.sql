-- ============================================================================
-- Case study: Yumurta N1
-- ----------------------------------------------------------------------------
-- Fill in the three marked blocks below, then paste the whole file into the
-- Supabase SQL editor and Run.
--
-- The three blocks are PROBLEM, BUILT and OUTCOME. I have deliberately left
-- the facts blank rather than writing plausible-sounding ones: a case study
-- whose "outcome" was invented is worth less than no case study at all, and a
-- client of this size will read their own page.
--
-- Before publishing, ask Yumurta N1 for:
--   1. Written permission to name them and show the site.  (usually a formality)
--   2. Any number they are willing to share — enquiries per month, export
--      leads, the share of traffic that is now English or Russian. One real
--      figure in OUTCOME is worth more than three paragraphs of adjectives.
--   3. Two or three sentences you can quote. That becomes your first review.
-- ============================================================================

insert into case_studies (
  slug, title, client, summary,
  problem, built, outcome,
  industry, stack, tags, year, live_url, cover_image,
  published, sort_order
) values (
  'yumurta-n1',

  '{"az":"Yumurta N1","en":"Yumurta N1","ru":"Yumurta N1"}',

  'Yumurta N1 — Zaqafqaziyanın №1 yumurta istehsalçısı',

  -- SUMMARY — one line, shown on the portfolio card.
  '{"az":"1976-cı ildən fəaliyyət göstərən istehsalçı üçün üçdilli korporativ sayt: məhsullar, ixrac və əlaqə.",
    "en":"A three-language corporate site for a producer operating since 1976: products, export and contact.",
    "ru":"Трёхъязычный корпоративный сайт производителя, работающего с 1976 года: продукция, экспорт и контакты."}',

  -- ==========================================================================
  -- 1. PROBLEM — what was the situation before the site existed?
  --    e.g. no web presence at all / an outdated site / export enquiries
  --    arriving only by phone / no English-language material for foreign buyers
  -- ==========================================================================
  '{"az":"TODO — problemi yazın.",
    "en":"TODO — describe the problem.",
    "ru":"TODO — опишите задачу."}',

  -- ==========================================================================
  -- 2. BUILT — what you actually made. Be concrete: pages, the three-language
  --    setup, product catalogue, export section, WhatsApp routing, news.
  -- ==========================================================================
  '{"az":"TODO — nə qurduğunuzu yazın.",
    "en":"TODO — describe what you built.",
    "ru":"TODO — опишите, что было сделано."}',

  -- ==========================================================================
  -- 3. OUTCOME — what changed. Ask the client for one real number. If they
  --    will not share one, write what is plainly true instead (e.g. that
  --    foreign buyers can now read the product specifications without
  --    contacting anyone) and do NOT invent a statistic.
  -- ==========================================================================
  '{"az":"TODO — nə dəyişdiyini yazın.",
    "en":"TODO — describe what changed.",
    "ru":"TODO — опишите, что изменилось."}',

  'food',                                          -- industry filter
  array['React','TypeScript','Multilingual'],      -- adjust to what you used
  array['corporate','multilingual','export','catalog'],
  2026,                                            -- year shipped
  'https://www.yumurtan1.az',                      -- live link, clickable
  '/assets/images/portfolio/yumurta-n1-cover.jpg', -- screenshot, 3:2

  true,   -- published
  100     -- highest sort_order, so it leads the portfolio
);
