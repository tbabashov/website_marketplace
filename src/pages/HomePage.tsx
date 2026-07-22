import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Hero } from '@/components/home/Hero';
import { StatsBar } from '@/components/home/StatsBar';
import { PortfolioPreview } from '@/components/home/PortfolioPreview';
import { HowItWorks } from '@/components/home/HowItWorks';
import { MarketPreview } from '@/components/home/MarketPreview';
import { Reviews } from '@/components/home/Reviews';
import { Faq } from '@/components/home/Faq';
import { FinalCta } from '@/components/home/FinalCta';
import { fetchCaseStudies, fetchListings, fetchReviews } from '@/lib/api';
import { useSeo } from '@/lib/seo';
import type { CaseStudy, Listing, Review } from '@/types/db';

export default function HomePage() {
  const { t } = useTranslation();
  useSeo({ title: t('seo.home.title'), description: t('seo.home.description') });

  const [studies, setStudies] = useState<CaseStudy[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [studiesDemo, setStudiesDemo] = useState(false);
  const [listingsDemo, setListingsDemo] = useState(false);

  useEffect(() => {
    let alive = true;

    void Promise.all([fetchCaseStudies(), fetchListings(), fetchReviews(6)]).then(
      ([c, l, r]) => {
        if (!alive) return;
        setStudies(c.data);
        setStudiesDemo(c.isDemo);
        setListings(l.data);
        setListingsDemo(l.isDemo);
        setReviews(r);
      },
    );

    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <Hero />
      <StatsBar />
      <PortfolioPreview studies={studies} isDemo={studiesDemo} />
      <HowItWorks />
      <MarketPreview listings={listings} isDemo={listingsDemo} />
      <Reviews reviews={reviews} />
      <Faq />
      <FinalCta />
    </>
  );
}
