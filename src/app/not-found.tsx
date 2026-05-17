import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <Container className="flex min-h-[60svh] flex-col items-center justify-center py-16 text-center">
      <span className="text-7xl">🔍</span>
      <h1 className="mt-6 text-3xl font-bold">Page not found</h1>
      <p className="mt-2 max-w-sm text-neutral-600">
        We couldn't find what you were looking for. Try the homepage or browse our catalog.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/">
          <Button>Back to home</Button>
        </Link>
        <Link href="/products">
          <Button variant="outline">Browse products</Button>
        </Link>
      </div>
    </Container>
  );
}
