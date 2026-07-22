-- ============================================================================
-- Optional seed data
-- ----------------------------------------------------------------------------
-- Run this only if you want the demo portfolio and marketplace entries in your
-- own database — the app already shows the same content from src/lib/demoData.ts
-- when Supabase is empty, so this is mostly useful for trying the Owner desk
-- against real rows.
--
-- Replace it with your real work before going live. These four case studies
-- describe plausible projects, not projects that happened.
-- ============================================================================

insert into case_studies (slug, title, client, summary, industry, stack, tags, year, cover_image, published, sort_order)
values
  (
    'nargiz-dental',
    '{"az":"Nargiz Dental","en":"Nargiz Dental","ru":"Nargiz Dental"}',
    'Nargiz Dental, Bakı',
    '{"az":"Instaqram profilindən onlayn qeydiyyatı olan sayta keçid.","en":"From an Instagram profile to a site that books its own appointments.","ru":"От профиля в Instagram к сайту, который сам записывает пациентов."}',
    'health', array['React','Supabase','WhatsApp API'], array['booking','multilingual'], 2025,
    '/assets/images/portfolio/nargiz-dental-cover.jpg', true, 40
  ),
  (
    'kaspi-yuk',
    '{"az":"Kaspi Yük","en":"Kaspi Yük","ru":"Kaspi Yük"}',
    'Kaspi Yük MMC',
    '{"az":"Yük daşıma şirkəti üçün hesablama forması olan sayt.","en":"A freight company site that answers the price question before the call.","ru":"Сайт транспортной компании, который отвечает на вопрос о цене до звонка."}',
    'logistics', array['React','TypeScript','Vercel'], array['calculator','lead-gen'], 2025,
    '/assets/images/portfolio/kaspi-yuk-cover.jpg', true, 30
  ),
  (
    'cay-evi-sirvan',
    '{"az":"Çay Evi Şirvan","en":"Çay Evi Şirvan","ru":"Чайхана «Ширван»"}',
    'Çay Evi Şirvan',
    '{"az":"Kağız menyunun yerinə telefondan açılan, həmişə güncəl menyu.","en":"A menu that is always current, opened from the phone in the customer''s hand.","ru":"Меню, которое всегда актуально и открывается с телефона гостя."}',
    'hospitality', array['React','Supabase'], array['menu','qr','self-serve'], 2024,
    '/assets/images/portfolio/cay-evi-cover.jpg', true, 20
  ),
  (
    'atlas-huquq',
    '{"az":"Atlas Hüquq","en":"Atlas Legal","ru":"Atlas Legal"}',
    'Atlas Hüquq Bürosu',
    '{"az":"Hüquq bürosunun ilk saytı — sual verməyi asanlaşdıran quruluş.","en":"A law office''s first site, built around making the first question easy to ask.","ru":"Первый сайт юридического бюро, построенный вокруг того, чтобы первый вопрос было легко задать."}',
    'legal', array['React','TypeScript'], array['content','seo','multilingual'], 2024,
    '/assets/images/portfolio/atlas-huquq-cover.jpg', true, 10
  )
on conflict (slug) do nothing;

insert into listings (slug, title, tagline, price_azn, category, page_count, pages, stack, cover_image, license, status, sort_order)
values
  (
    'vitrin',
    '{"az":"Vitrin","en":"Vitrin","ru":"Vitrin"}',
    '{"az":"Bir səhifə, bir məqsəd: sizinlə əlaqə saxlasınlar.","en":"One page, one job: get them to contact you.","ru":"Одна страница, одна задача: чтобы вам написали."}',
    450, 'onepage', 1, array['home','contact'], array['React','TypeScript','Tailwind'],
    '/assets/images/marketplace/vitrin-cover.jpg', 'single', 'published', 40
  ),
  (
    'menyu',
    '{"az":"Menyu","en":"Menyu","ru":"Menyu"}',
    '{"az":"Kafe və restoranlar üçün: menyu, foto, masa rezervasiyası.","en":"For cafés and restaurants: menu, photos, table booking.","ru":"Для кафе и ресторанов: меню, фотографии, бронь стола."}',
    890, 'hospitality', 5, array['home','services','gallery','booking','contact'], array['React','Supabase','Tailwind'],
    '/assets/images/marketplace/menyu-cover.jpg', 'single', 'published', 30
  ),
  (
    'kataloq',
    '{"az":"Kataloq","en":"Kataloq","ru":"Kataloq"}',
    '{"az":"Məhsul kataloqu — ödəniş sistemi qurmadan satışa başlayın.","en":"A product catalogue that starts selling before you set up payments.","ru":"Каталог товаров: продажи начинаются до подключения оплаты."}',
    1250, 'catalog', 8, array['home','catalog','about','contact'], array['React','Supabase','Tailwind'],
    '/assets/images/marketplace/kataloq-cover.jpg', 'single', 'published', 20
  ),
  (
    'klinika',
    '{"az":"Klinika","en":"Klinika","ru":"Klinika"}',
    '{"az":"Həkimlər, xidmətlər, qiymətlər və onlayn qeydiyyat.","en":"Doctors, services, prices and appointments that book themselves.","ru":"Врачи, услуги, цены и запись, которая работает сама."}',
    1600, 'health', 9, array['home','services','about','booking','contact'], array['React','Supabase','Tailwind'],
    '/assets/images/marketplace/klinika-cover.jpg', 'single', 'published', 10
  )
on conflict (slug) do nothing;
