import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { NewCustomerForm } from './NewCustomerForm';

export default function NewCustomerPage() {
  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Customers
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-zinc-100">New customer</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Phone number must be unique. You can also record initial medicines below — saved in the
        same Postgres transaction as the customer.
      </p>
      <div className="mt-6">
        <NewCustomerForm />
      </div>
    </div>
  );
}
