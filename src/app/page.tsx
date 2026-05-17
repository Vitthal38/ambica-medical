import { Hero } from '@/features/home/Hero';
import { StatsStrip } from '@/features/home/StatsStrip';
import { CategoryGrid } from '@/features/categories/CategoryGrid';
import { FeaturedProducts } from '@/features/products/FeaturedProducts';
import { MoreProducts } from '@/features/products/MoreProducts';
import { PrescriptionPromo } from '@/features/home/PrescriptionPromo';
import { WhyChooseUs } from '@/features/home/WhyChooseUs';
import { DeliveryStore } from '@/features/home/DeliveryStore';

export default function HomePage() {
  return (
    <>
      <Hero />
      <StatsStrip />
      <CategoryGrid />
      <FeaturedProducts />
      <MoreProducts />
      <PrescriptionPromo />
      <WhyChooseUs />
      <DeliveryStore />
    </>
  );
}
