import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowUpRight as ExternalLink,
  CalendarDays,
  ChevronRight,
  CircleAlert,
  CreditCard,
  Download,
  FileText,
  Users,
  WalletCards,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link } from 'react-router-dom';
import { PageHeading, StatusBadge } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import {
  downloadReport,
  getApiError,
  getDashboard,
  getReport,
  listRecords,
} from '../services/api';
import type { AppRecord } from '../types';

type Summary = {
  metrics: {
    revenue: string;
    mrr: string;
    activeSubscriptions: number;
    customers: number;
    outstandingPayments: string;
    overdueInvoices: number;
    revenueChangePercent: string | null;
  };
  revenueSeries: Array<{ period: string; revenue: string }>;
  subscriptionSeries: Array<{ period: string; count: number }>;
  upcomingRenewals: unknown[];
  overdueAlerts: unknown[];
};
type SubscriptionReport = { plans: Array<{ planId: string; name: string; count: number }> };
type PaymentReport = Array<{ status: string; count: number; percentage: number }>;

const colors = ['#6747c7', '#4a61cf', '#27a77b', '#e7a63b', '#dd6670', '#8892a6'];
const money = (value: string | number | boolean) =>
  `$${Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const monthLabel = (period: string) =>
  new Date(`${period}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short' });

function TableRows({ records }: { records: AppRecord[] }) {
  return (
    <div className="mini-table-wrap">
      <table className="data-table compact-table">
        <thead><tr><th>Customer</th><th>Plan</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>{records.slice(0, 4).map((record) => (
          <tr key={record.id}>
            <td><div className="customer-cell"><span className="table-avatar">{String(record.name).split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><span><strong>{record.name}</strong><small>{record.id}</small></span></div></td>
            <td>{String(record.plan ?? record.customer ?? '—')}</td>
            <td className="amount-cell">{money(record.total ?? record.amount ?? 0)}</td>
            <td><StatusBadge status={record.status} /></td>
          </tr>
        ))}</tbody>
      </table>
      {!records.length && <div className="empty-chart-note">No records yet.</div>}
    </div>
  );
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function DashboardPage() {
  const { session } = useAuth();
  const [months, setMonths] = useState(6);
  const [summary, setSummary] = useState<Summary>();
  const [plans, setPlans] = useState<SubscriptionReport>();
  const [payments, setPayments] = useState<PaymentReport>([]);
  const [subscriptions, setSubscriptions] = useState<AppRecord[]>([]);
  const [invoices, setInvoices] = useState<AppRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const from = useMemo(() => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - months + 1);
    return date.toISOString().slice(0, 10);
  }, [months]);
  const to = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void Promise.allSettled([
      getDashboard(from, to),
      getReport<SubscriptionReport>('subscriptions', { from, to }),
      getReport<PaymentReport>('payments', { from, to }),
      listRecords('subscriptions', { pageSize: 4 }),
      listRecords('invoices', { pageSize: 4 }),
    ]).then((results) => {
      if (!active) return;
      const failures: string[] = [];
      const [summaryResult, plansResult, paymentResult, subscriptionsResult, invoicesResult] = results;
      if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value as Summary);
      else failures.push(getApiError(summaryResult.reason));
      if (plansResult.status === 'fulfilled') setPlans(plansResult.value);
      else failures.push(getApiError(plansResult.reason));
      if (paymentResult.status === 'fulfilled') setPayments(paymentResult.value);
      else failures.push(getApiError(paymentResult.reason));
      if (subscriptionsResult.status === 'fulfilled') setSubscriptions(subscriptionsResult.value.data);
      else failures.push(getApiError(subscriptionsResult.reason));
      if (invoicesResult.status === 'fulfilled') setInvoices(invoicesResult.value.data);
      else failures.push(getApiError(invoicesResult.reason));
      setError(failures.join(' '));
      setLoading(false);
    });
    return () => { active = false; };
  }, [from, to]);

  const revenueRows = (summary?.revenueSeries ?? []).map((row) => ({
    month: monthLabel(row.period),
    revenue: Number(row.revenue),
  }));
  const subscriptionRows = (summary?.subscriptionSeries ?? []).map((row) => ({
    month: monthLabel(row.period),
    subscriptions: row.count,
  }));
  const paymentBreakdown = payments.map((item, index) => ({
    name: item.status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    value: item.percentage,
    count: item.count,
    color: colors[index % colors.length],
  }));
  const planTotal = (plans?.plans ?? []).reduce((total, plan) => total + plan.count, 0);
  const planDistribution = (plans?.plans ?? []).map((plan, index) => ({
    ...plan,
    value: planTotal ? Math.round((plan.count / planTotal) * 100) : 0,
    color: colors[index % colors.length],
  }));
  const metrics = [
    { label: 'Total revenue', value: money(summary?.metrics.revenue ?? 0), change: summary?.metrics.revenueChangePercent ? `${summary.metrics.revenueChangePercent}%` : '—', positive: Number(summary?.metrics.revenueChangePercent ?? 0) >= 0, note: 'vs. last month', icon: WalletCards, color: 'violet' },
    { label: 'Monthly recurring revenue', value: money(summary?.metrics.mrr ?? 0), change: '—', positive: true, note: 'annualized plan revenue', icon: CreditCard, color: 'blue' },
    { label: 'Active subscriptions', value: String(summary?.metrics.activeSubscriptions ?? 0), change: '—', positive: true, note: 'currently active', icon: FileText, color: 'green' },
    { label: 'Total customers', value: String(summary?.metrics.customers ?? 0), change: '—', positive: true, note: 'in this workspace', icon: Users, color: 'amber' },
    { label: 'Outstanding payments', value: money(summary?.metrics.outstandingPayments ?? 0), change: '—', positive: false, note: 'unpaid invoice balance', icon: WalletCards, color: 'rose' },
    { label: 'Overdue invoices', value: String(summary?.metrics.overdueInvoices ?? 0), change: '—', positive: false, note: 'need your attention', icon: CircleAlert, color: 'slate' },
  ];

  const exportReport = async () => {
    setExporting(true);
    setError('');
    try {
      saveBlob(await downloadReport({ from, to, dataset: 'revenue' }), 'brightloop-revenue-report.csv');
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeading eyebrow="WORKSPACE OVERVIEW" title={`Good morning, ${session?.fullName.split(' ')[0] ?? 'there'}`} description="Here’s what’s happening with your subscriptions today." action={<button type="button" className="button button-secondary" disabled={exporting} onClick={() => void exportReport()}><Download size={16} /> {exporting ? 'Exporting…' : 'Export report'}</button>} />
      {error && <div className="app-error" role="alert">{error}</div>}
      <section className="metric-grid" aria-label="Business metrics">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const ChangeIcon = metric.positive ? ArrowUpRight : ArrowDownRight;
          return (
            <article className="metric-card" key={metric.label}>
              <div className="metric-card-top"><span>{metric.label}</span><span className={`metric-icon metric-${metric.color}`}><Icon size={17} /></span></div>
              <div className="metric-value">{loading ? '…' : metric.value}</div>
              <div className="metric-note"><span className={metric.positive ? 'trend-up' : 'trend-down'}><ChangeIcon size={14} />{metric.change}</span><span>{metric.note}</span></div>
            </article>
          );
        })}
      </section>

      <section className="dashboard-grid">
        <article className="panel revenue-panel">
          <div className="panel-heading"><div><h2>Revenue over time</h2><p>Completed payments in your workspace</p></div><select className="select-compact" aria-label="Revenue time range" value={months} onChange={(event) => setMonths(Number(event.target.value))}><option value={6}>Last 6 months</option><option value={12}>Last 12 months</option></select></div>
          <div className="chart-legend"><span><i className="legend-dot violet-dot" /> Revenue</span></div>
          <div className="revenue-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={revenueRows} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}><defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7253c7" stopOpacity={0.19} /><stop offset="96%" stopColor="#7253c7" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#eef0f6" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9097a9', fontSize: 11 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#9097a9', fontSize: 11 }} tickFormatter={(value: number) => `$${value / 1000}k`} /><Tooltip formatter={(value) => [money(Number(value)), 'Revenue']} /><Area type="monotone" dataKey="revenue" stroke="#6747c7" strokeWidth={2.5} fill="url(#revenueFill)" /></AreaChart></ResponsiveContainer></div>
        </article>

        <article className="panel breakdown-panel">
          <div className="panel-heading"><div><h2>Payment status</h2><p>Invoice breakdown</p></div></div>
          <div className="donut-wrap"><ResponsiveContainer width="100%" height={198}><PieChart><Pie data={paymentBreakdown} dataKey="value" nameKey="name" innerRadius={62} outerRadius={82} paddingAngle={4} stroke="none">{paymentBreakdown.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip formatter={(value) => [`${value}%`, 'Invoices']} /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{paymentBreakdown.reduce((sum, item) => sum + item.count, 0)}</strong><span>Total invoices</span></div></div>
          <div className="breakdown-legend">{paymentBreakdown.map((item) => <div key={item.name}><span><i className="legend-dot" style={{ background: item.color }} />{item.name}</span><strong>{item.value}%</strong></div>)}</div>
          {!paymentBreakdown.length && <div className="empty-chart-note">No invoice data for this period.</div>}
        </article>

        <article className="panel subscription-panel">
          <div className="panel-heading"><div><h2>Subscription growth</h2><p>Active subscriptions created each month</p></div></div>
          <div className="growth-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={subscriptionRows} margin={{ top: 12, right: 5, left: -24, bottom: 0 }}><defs><linearGradient id="subscriberFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4a61cf" stopOpacity={0.16} /><stop offset="100%" stopColor="#4a61cf" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#eef0f6" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9097a9', fontSize: 10 }} dy={8} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#9097a9', fontSize: 10 }} /><Tooltip formatter={(value) => [value, 'Subscriptions']} /><Area type="monotone" dataKey="subscriptions" stroke="#4a61cf" strokeWidth={2.2} fill="url(#subscriberFill)" /></AreaChart></ResponsiveContainer></div>
        </article>

        <article className="panel plans-panel">
          <div className="panel-heading"><div><h2>Plans by subscribers</h2><p>Active subscriptions by plan</p></div><Link className="text-link" to="/plans">View plans <ChevronRight size={15} /></Link></div>
          <div className="plan-list">{planDistribution.map((plan) => <div className="plan-row" key={plan.planId}><span className="plan-color" style={{ background: plan.color }} /><span className="plan-name">{plan.name}</span><div className="plan-bar"><span style={{ width: `${plan.value}%`, background: plan.color }} /></div><strong>{plan.count}</strong></div>)}</div>
          <div className="plan-total"><span>Total subscribers</span><strong>{planTotal}</strong></div>
        </article>

        <article className="panel recent-panel"><div className="panel-heading"><div><h2>Recent subscriptions</h2><p>Your latest customer activity</p></div><Link className="text-link" to="/subscriptions">View all <ChevronRight size={15} /></Link></div><TableRows records={subscriptions} /></article>
        <article className="panel invoice-panel"><div className="panel-heading"><div><h2>Recent invoices</h2><p>Latest billing activity</p></div><Link className="text-link" to="/invoices">View all <ChevronRight size={15} /></Link></div><TableRows records={invoices} /></article>
      </section>

      <section className="attention-grid">
        <article className="attention-card renewal-card"><div className="attention-icon renewal-icon"><CalendarDays size={18} /></div><div className="attention-copy"><strong>Upcoming renewals</strong><span>{summary?.upcomingRenewals.length ?? 0} subscriptions renew in the next 7 days</span></div><Link aria-label="View upcoming renewals" to="/subscriptions"><ChevronRight size={17} /></Link></article>
        <article className="attention-card overdue-card"><div className="attention-icon overdue-icon"><CircleAlert size={18} /></div><div className="attention-copy"><strong>Overdue payment alerts</strong><span>{summary?.overdueAlerts.length ?? 0} invoices need a friendly follow-up</span></div><Link aria-label="View overdue invoices" to="/invoices"><ExternalLink size={16} /></Link></article>
      </section>
    </div>
  );
}
