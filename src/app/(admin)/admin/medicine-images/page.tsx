import { MedicineImagesClient } from './MedicineImagesClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Medicine images' };

export default function MedicineImagesPage() {
  // The page is intentionally a thin server-component wrapper. All the
  // upload/preview interactivity is client-side, but rendering the shell
  // server-side keeps the route fast and the dark-theme nav consistent.
  return <MedicineImagesClient />;
}
