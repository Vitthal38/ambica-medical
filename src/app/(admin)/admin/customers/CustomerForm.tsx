'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { AdminButton, AdminCard, AdminInput } from '@/components/admin/ui';
import {
  customerCreateSchema,
  type CustomerCreateInput,
} from '@/features/admin/schemas';
import { cn } from '@/lib/cn';

interface Props {
  mode: 'create' | 'edit';
  customerId?: string;
  initial?: Partial<CustomerCreateInput>;
}

export function CustomerForm({ mode, customerId, initial }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CustomerCreateInput>({
    resolver: zodResolver(customerCreateSchema),
    defaultValues: {
      name: initial?.name ?? '',
      phone: initial?.phone ?? '',
      email: initial?.email ?? '',
      dob: initial?.dob ?? '',
      address: initial?.address ?? '',
      notes: initial?.notes ?? '',
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null);
    const url =
      mode === 'create'
        ? '/api/admin/customers'
        : `/api/admin/customers/${customerId}`;
    const method = mode === 'create' ? 'POST' : 'PATCH';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (body.fieldErrors) {
        for (const [k, v] of Object.entries(body.fieldErrors)) {
          setError(k as keyof CustomerCreateInput, {
            message: Array.isArray(v) ? v[0] : String(v),
          });
        }
      } else {
        setServerError(body.error || 'Could not save customer.');
      }
      return;
    }

    if (mode === 'create') {
      router.push(`/admin/customers/${body.customer.id}`);
    } else {
      // Edit mode: send back to the dashboard so staff see the updated
      // customer reflected in the broader context (recent activity, lists).
      // router.refresh() first invalidates any cached server-component data,
      // then router.push() navigates.
      router.refresh();
      router.push('/admin');
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <AdminCard className="p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" error={errors.name?.message} required>
            <AdminInput
              {...register('name')}
              placeholder="e.g. Anil Kulkarni"
              autoComplete="name"
            />
          </Field>
          <Field label="Phone (10 digits)" error={errors.phone?.message} required>
            <AdminInput
              {...register('phone')}
              inputMode="numeric"
              placeholder="9876543210"
              autoComplete="tel-national"
            />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <AdminInput {...register('email')} type="email" placeholder="optional" />
          </Field>
          <Field label="Date of birth" error={errors.dob?.message}>
            <AdminInput {...register('dob')} type="date" />
          </Field>
          <Field label="Address" error={errors.address?.message} className="sm:col-span-2">
            <textarea
              {...register('address')}
              rows={2}
              placeholder="Street, area, city, pincode"
              className={cn(
                'w-full rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500',
                'border border-zinc-700',
                'focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30',
              )}
            />
          </Field>
          <Field label="Internal notes" error={errors.notes?.message} className="sm:col-span-2">
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="Allergies, ongoing treatment, anything staff should know."
              className={cn(
                'w-full rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500',
                'border border-zinc-700',
                'focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30',
              )}
            />
          </Field>
        </div>
      </AdminCard>

      {serverError && (
        <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {serverError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <AdminButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'create' ? 'Create customer' : 'Save changes'}
        </AdminButton>
        <AdminButton type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </AdminButton>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
  required,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
        {label} {required && <span className="text-emerald-400">*</span>}
      </span>
      {children}
      {error && <span className="text-xs text-rose-400">{error}</span>}
    </label>
  );
}
