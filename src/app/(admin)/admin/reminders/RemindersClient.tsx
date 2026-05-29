'use client';

import { useState, useTransition, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Bell,
  Search,
  Send,
  CheckCircle,
  XCircle,
  RefreshCw,
  Phone,
  Calendar,
  Pill,
} from 'lucide-react';
import { AdminButton, AdminInput, AdminBadge, AdminCard } from '@/components/admin/ui';
import { cn } from '@/lib/cn';

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface Medicine {
  id: string;
  name: string;
  brand: string;
}

interface ReminderRow {
  id: string;
  dueOn: string;
  status: 'PENDING' | 'SENT' | 'FULFILLED' | 'DISMISSED';
  channel: 'NONE' | 'SMS' | 'WHATSAPP' | 'EMAIL';
  message: string | null;
  sentAt: string | null;
  createdAt: string;
  customer: Customer;
  medicine: Medicine;
  sourceOrderId: string | null;
}

type StatusFilter = 'ALL' | 'PENDING' | 'SENT' | 'FULFILLED' | 'DISMISSED';
type DateFilter = 'ALL' | 'OVERDUE' | 'TODAY' | 'WEEK' | 'MONTH';

interface Props {
  initialRows: ReminderRow[];
  initialNextCursor: string | null;
  initialQ?: string;
  initialStatusFilter?: StatusFilter;
}

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'SENT', label: 'Sent' },
  { key: 'FULFILLED', label: 'Completed' },
  { key: 'DISMISSED', label: 'Dismissed' },
];

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'ALL', label: 'Any date' },
  { key: 'OVERDUE', label: 'Overdue' },
  { key: 'TODAY', label: 'Today' },
  { key: 'WEEK', label: 'Next 7 days' },
  { key: 'MONTH', label: 'Next 30 days' },
];

const statusBadgeTone: Record<ReminderRow['status'], 'info' | 'warning' | 'success' | 'default'> =
  {
    PENDING: 'info',
    SENT: 'warning',
    FULFILLED: 'success',
    DISMISSED: 'default',
  };

const channelLabel: Record<ReminderRow['channel'], string> = {
  NONE: '—',
  SMS: 'SMS',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Email',
};

function daysFromNow(isoDate: string): number {
  return Math.round((new Date(isoDate).getTime() - Date.now()) / 86_400_000);
}

function dueBadgeTone(isoDate: string, status: string): 'danger' | 'warning' | 'success' | 'default' {
  if (status !== 'PENDING') return 'default';
  const days = daysFromNow(isoDate);
  if (days < 0) return 'danger';
  if (days <= 7) return 'warning';
  return 'success';
}

function formatDue(isoDate: string, status: string): string {
  const days = daysFromNow(isoDate);
  const dateStr = new Date(isoDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  if (status !== 'PENDING') return dateStr;
  if (days < 0) return `${dateStr} (overdue ${Math.abs(days)}d)`;
  if (days === 0) return `${dateStr} (today)`;
  return `${dateStr} (in ${days}d)`;
}

function buildQueryParams(
  q: string,
  status: StatusFilter,
  dateFilter: DateFilter,
  cursor?: string,
): URLSearchParams {
  const p = new URLSearchParams();
  if (q.trim()) p.set('q', q.trim());
  p.set('status', status);
  const now = new Date();
  if (dateFilter === 'OVERDUE') {
    p.set('to', now.toISOString());
  } else if (dateFilter === 'TODAY') {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    p.set('from', new Date(now.setHours(0, 0, 0, 0)).toISOString());
    p.set('to', end.toISOString());
  } else if (dateFilter === 'WEEK') {
    p.set('daysAhead', '7');
  } else if (dateFilter === 'MONTH') {
    p.set('daysAhead', '30');
  }
  if (cursor) p.set('cursor', cursor);
  return p;
}

export default function RemindersClient({
  initialRows,
  initialNextCursor,
  initialQ = '',
  initialStatusFilter = 'ALL',
}: Props) {
  const [rows, setRows] = useState<ReminderRow[]>(initialRows);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [q, setQ] = useState(initialQ);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter);
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [isPending, startTransition] = useTransition();
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<Record<string, string>>({});
  // Monotonic counter: only the latest fetch can write to state
  const latestRequestId = useRef(0);

  const fetchReminders = useCallback(
    (newQ: string, newStatus: StatusFilter, newDate: DateFilter, cursor?: string) => {
      startTransition(async () => {
        const requestId = ++latestRequestId.current;
        try {
          const params = buildQueryParams(newQ, newStatus, newDate, cursor);
          const res = await fetch(`/api/admin/reminders?${params}`);
          if (!res.ok) return;
          const data: { rows: ReminderRow[]; nextCursor: string | null } = await res.json();
          // Discard stale responses that resolved after a newer request
          if (requestId !== latestRequestId.current) return;
          setRows(cursor ? (prev) => [...prev, ...data.rows] : data.rows);
          setNextCursor(data.nextCursor);
        } catch {
          // silently ignore network errors on filter — user can retry
        }
      });
    },
    [],
  );

  const handleSearch = (newQ: string) => {
    setQ(newQ);
    fetchReminders(newQ, statusFilter, dateFilter);
  };

  const handleStatusFilter = (s: StatusFilter) => {
    setStatusFilter(s);
    fetchReminders(q, s, dateFilter);
  };

  const handleDateFilter = (d: DateFilter) => {
    setDateFilter(d);
    fetchReminders(q, statusFilter, d);
  };

  const handleLoadMore = () => {
    if (nextCursor) fetchReminders(q, statusFilter, dateFilter, nextCursor);
  };

  const setRowStatus = (id: string, newStatus: ReminderRow['status']) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
  };

  const patchReminder = async (id: string, body: object) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    setActionError((prev) => ({ ...prev, [id]: '' }));
    try {
      const res = await fetch(`/api/admin/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      let data: { error?: string } | null = null;
      try { data = await res.json(); } catch { /* non-JSON body */ }
      if (!res.ok) {
        setActionError((prev) => ({ ...prev, [id]: data?.error ?? 'Update failed.' }));
        return false;
      }
      return true;
    } catch {
      setActionError((prev) => ({ ...prev, [id]: 'Network error. Please retry.' }));
      return false;
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleMarkComplete = async (id: string) => {
    const ok = await patchReminder(id, { status: 'FULFILLED' });
    if (ok) setRowStatus(id, 'FULFILLED');
  };

  const handleDismiss = async (id: string) => {
    const ok = await patchReminder(id, { status: 'DISMISSED' });
    if (ok) setRowStatus(id, 'DISMISSED');
  };

  const handleSendNotification = async (id: string, channel: ReminderRow['channel']) => {
    if (channel === 'NONE') {
      setActionError((prev) => ({
        ...prev,
        [id]: 'Set a channel (SMS/WhatsApp/Email) before sending.',
      }));
      return;
    }
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    setActionError((prev) => ({ ...prev, [id]: '' }));
    try {
      const res = await fetch(`/api/admin/reminders/${id}/notify`, { method: 'POST' });
      let data: { error?: string; result?: { status: string; reason?: string } } | null = null;
      try { data = await res.json(); } catch { /* non-JSON body */ }
      if (!res.ok) {
        setActionError((prev) => ({ ...prev, [id]: data?.error ?? 'Send failed.' }));
        return;
      }
      if (data?.result?.status !== 'skipped') {
        setRowStatus(id, 'SENT');
      } else {
        setActionError((prev) => ({
          ...prev,
          [id]: `Skipped: ${data?.result?.reason ?? 'provider not configured'}`,
        }));
      }
    } catch {
      setActionError((prev) => ({ ...prev, [id]: 'Network error. Please retry.' }));
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Stats from current rows (approximate — reflects current filter)
  const overdue = rows.filter(
    (r) => r.status === 'PENDING' && daysFromNow(r.dueOn) < 0,
  ).length;
  const today = rows.filter(
    (r) => r.status === 'PENDING' && daysFromNow(r.dueOn) === 0,
  ).length;
  const pending = rows.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Refill Reminders</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Track and send medicine refill reminders to customers.
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
        <AdminCard className="p-4 text-center">
          <p className="text-2xl font-bold text-rose-400">{overdue}</p>
          <p className="mt-0.5 text-xs text-zinc-500">Overdue</p>
        </AdminCard>
        <AdminCard className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{today}</p>
          <p className="mt-0.5 text-xs text-zinc-500">Due Today</p>
        </AdminCard>
        <AdminCard className="p-4 text-center">
          <p className="text-2xl font-bold text-sky-400">{pending}</p>
          <p className="mt-0.5 text-xs text-zinc-500">Pending</p>
        </AdminCard>
      </div>

      {/* Filters */}
      <AdminCard className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <AdminInput
              type="text"
              placeholder="Search by customer name or phone…"
              value={q}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {/* Date filter */}
          <select
            value={dateFilter}
            onChange={(e) => handleDateFilter(e.target.value as DateFilter)}
            className="h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
          >
            {DATE_FILTERS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status tabs */}
        <div className="mt-3 flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleStatusFilter(tab.key)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                statusFilter === tab.key
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200',
              )}
            >
              {tab.label}
            </button>
          ))}
          {isPending && (
            <RefreshCw className="ml-2 h-4 w-4 animate-spin self-center text-zinc-500" />
          )}
        </div>
      </AdminCard>

      {/* Table */}
      <AdminCard>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="h-8 w-8 text-zinc-700" />
            <p className="mt-3 text-sm text-zinc-500">No reminders found.</p>
            <p className="mt-1 text-xs text-zinc-600">
              Reminders are auto-created when an order is placed.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Medicine
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Due Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Channel
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {rows.map((row) => {
                  const loading = actionLoading[row.id];
                  const error = actionError[row.id];
                  const isActionable = row.status === 'PENDING' || row.status === 'SENT';

                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        'transition-colors hover:bg-zinc-800/30',
                        !isActionable && 'opacity-50',
                      )}
                    >
                      {/* Customer */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/customers/${row.customer.id}`}
                          className="font-medium text-zinc-100 hover:text-emerald-300"
                        >
                          {row.customer.name}
                        </Link>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
                          <Phone className="h-3 w-3" />
                          +91 {row.customer.phone}
                        </p>
                      </td>

                      {/* Medicine */}
                      <td className="px-4 py-3">
                        <p className="flex items-center gap-1 text-zinc-200">
                          <Pill className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                          {row.medicine.brand}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">{row.medicine.name}</p>
                      </td>

                      {/* Due Date */}
                      <td className="px-4 py-3">
                        <AdminBadge tone={dueBadgeTone(row.dueOn, row.status)}>
                          <Calendar className="h-3 w-3" />
                          {formatDue(row.dueOn, row.status)}
                        </AdminBadge>
                      </td>

                      {/* Channel */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-zinc-400">{channelLabel[row.channel]}</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <AdminBadge tone={statusBadgeTone[row.status]}>
                          {row.status}
                        </AdminBadge>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-end gap-1">
                          {isActionable && (
                            <div className="flex items-center gap-1.5">
                              {row.channel !== 'NONE' && (
                                <AdminButton
                                  variant="secondary"
                                  size="sm"
                                  disabled={loading}
                                  onClick={() => handleSendNotification(row.id, row.channel)}
                                  title={`Send ${channelLabel[row.channel]} notification`}
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  Send
                                </AdminButton>
                              )}
                              <AdminButton
                                variant="secondary"
                                size="sm"
                                disabled={loading}
                                onClick={() => handleMarkComplete(row.id)}
                                title="Mark as completed"
                              >
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                                Done
                              </AdminButton>
                              <AdminButton
                                variant="ghost"
                                size="sm"
                                disabled={loading}
                                onClick={() => handleDismiss(row.id)}
                                title="Dismiss reminder"
                              >
                                <XCircle className="h-3.5 w-3.5 text-zinc-500" />
                              </AdminButton>
                            </div>
                          )}
                          {error && (
                            <p className="text-right text-[11px] text-rose-400">{error}</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Load more */}
        {nextCursor && (
          <div className="border-t border-zinc-800 p-4 text-center">
            <AdminButton variant="secondary" size="sm" onClick={handleLoadMore} disabled={isPending}>
              {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Load more'}
            </AdminButton>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
