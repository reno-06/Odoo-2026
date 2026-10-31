import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Download, TrendingUp, Users, WalletCards } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeading } from '../components/ui';
import { downloadReport, getApiError, getDashboard, getReport } from '../services/api';

type Summary = { revenue: string; activeSubscriptions: number; newCustomers: number; overdueInvoices: number };
type RevenueRow = { period: string; revenue: string };
type GrowthRow = { period: string; customers: number; paid: number };
type PaymentRow = { status: string; count: number; amount: string; percentage: number };
type OverdueRow = { id: string; customer: string; dueDate: string; total: string; status: string };
type DashboardSeries = { subscriptionSeries: Array<{ period: string; count: number }> };

const colors = ['#6747c7', '#4a61cf', '#27a77b', '#e7a63b', '#dd6670', '#8892a6'];
const monthLabel = (period: string) => new Date(`${period.slice(0, 7)}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short' });

function saveCsv(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'brightloop-report.csv';
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ReportsPage() {
  const [range, setRange] = useState('6');
  const [summary, setSummary] = useState<Summary>();
  const [revenue, setRevenue] = useState<Array<{ month: string; revenue: number }>>([]);
  const [growth, setGrowth] = useState<Array<{ month: string; customers: number; paid: number }>>([]);
  const [subscriptionRows, setSubscriptionRows] = useState<Array<{ month: string; subscriptions: number }>>([]);
  const [payments, setPayments] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [overdueInvoices, setOverdueInvoices] = useState<OverdueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const months = Number(range);
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
      getReport<Summary>('summary', { from, to }),
      getReport<RevenueRow[]>('revenue', { from, to }),
      getReport<GrowthRow[]>('customer-growth', { from, to }),
      getDashboard(from, to),
      getReport<PaymentRow[]>('payments', { from, to }),
      getReport<{ data: Record<string, unknown>[]; meta: unknown }>('overdue-invoices', { page: '1', pageSize: '10' }),
    ]).then((results) => {
      if (!active) return;
      const failures: string[] = [];
      const [summaryResult, revenueResult, growthResult, dashboardResult, paymentResult, overdueResult] = results;
      if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value);
      else failures.push(getApiError(summaryResult.reason));
      if (revenueResult.status === 'fulfilled') setRevenue(revenueResult.value.map((row) => ({ month: monthLabel(row.period), revenue: Number(row.revenue) })));
      else failures.push(getApiError(revenueResult.reason));
      if (growthResult.status === 'fulfilled') setGrowth(growthResult.value.map((row) => ({ month: monthLabel(row.period), customers: row.customers, paid: row.paid })));
      else failures.push(getApiError(growthResult.reason));
      if (dashboardResult.status === 'fulfilled') setSubscriptionRows(((dashboardResult.value as DashboardSeries).subscriptionSeries ?? []).map((row) => ({ month: monthLabel(row.period), subscriptions: row.count })));
      else failures.push(getApiError(dashboardResult.reason));
      if (paymentResult.status === 'fulfilled') setPayments(paymentResult.value.map((row, index) => ({
        name: row.status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
        value: row.percentage,
        color: colors[index % colors.length],
      })));
      else failures.push(getApiError(paymentResult.reason));
      if (overdueResult.status === 'fulfilled') {
        setOverdueInvoices(overdueResult.value.data.map((row) => ({
          id: String(row.invoiceNumber ?? row.id),
          customer: String((row.customer as Record<string, unknown> | undefined)?.name ?? ''),
          dueDate: String(row.dueDate ?? '').slice(0, 10),
          total: String(row.total ?? 0),
          status: String(row.status ?? ''),
        })));
      } else failures.push(getApiError(overdueResult.reason));
      setError(failures.join(' '));
      setLoading(false);
    });
    return () => { active = false; };
  }, [from, to]);

  const download = async () => {
    setExporting(true);
    setError('');
    try {
      saveCsv(await downloadReport({ from, to, dataset: 'revenue' }));
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setExporting(false);
    }
  };
  const paymentTotal = payments.reduce((total, item) => total + item.value, 0);

  return (
    <div className="page-stack">
      <PageHeading eyebrow="INSIGHTS & ANALYTICS" title="Reports" description="Make confident decisions with a clear picture of your business." action={<button type="button" className="button button-secondary" disabled={exporting} onClick={() => void download()}><Download size={16} /> {exporting ? 'Exporting…' : 'Export reports'}</button>} />
      {error && <div className="app-error" role="alert">{error}</div>}
      <div className="report-controls panel">
        <div><CalendarDays size={17} /><span>Reporting period</span></div>
        <select className="select-compact" aria-label="Reporting period" value={range} onChange={(event) => setRange(event.target.value)}><option value="3">Last 3 months</option><option value="6">Last 6 months</option><option value="12">Last 12 months</option></select>
        <span className="report-updated">{loading ? 'Loading report data…' : 'Data updated just now'}</span>
      </div>
      <div className="report-kpis">
        <article className="report-kpi"><div className="report-kpi-icon purple-kpi"><WalletCards size={18} /></div><span>Total revenue</span><strong>{loading ? '…' : `$${Number(summary?.revenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</strong><small>Completed payments in period</small></article>
        <article className="report-kpi"><div className="report-kpi-icon blue-kpi"><TrendingUp size={18} /></div><span>Active subscriptions</span><strong>{loading ? '…' : summary?.activeSubscriptions ?? 0}</strong><small>Active today</small></article>
        <article className="report-kpi"><div className="report-kpi-icon green-kpi"><Users size={18} /></div><span>New customers</span><strong>{loading ? '…' : summary?.newCustomers ?? 0}</strong><small>Created in period</small></article>
        <article className="report-kpi"><div className="report-kpi-icon amber-kpi"><WalletCards size={18} /></div><span>Overdue invoices</span><strong>{loading ? '…' : summary?.overdueInvoices ?? 0}</strong><small>Past due date</small></article>
      </div>
      <section className="report-charts">
        <article className="panel report-chart-panel">
          <div className="panel-heading"><div><h2>Revenue report</h2><p>Monthly revenue performance</p></div><span className="report-total">${Number(summary?.revenue ?? 0).toLocaleString()}<small>selected period</small></span></div>
          <div className="report-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={revenue} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}><defs><linearGradient id="reportRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6747c7" stopOpacity={0.19} /><stop offset="100%" stopColor="#6747c7" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#eef0f6" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9097a9', fontSize: 11 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#9097a9', fontSize: 11 }} tickFormatter={(value: number) => `$${value / 1000}k`} /><Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} /><Area dataKey="revenue" type="monotone" stroke="#6747c7" strokeWidth={2.5} fill="url(#reportRevenue)" /></AreaChart></ResponsiveContainer></div>
        </article>
        <article className="panel report-chart-panel">
          <div className="panel-heading"><div><h2>Customer growth</h2><p>New customers and paying accounts</p></div></div>
          <div className="chart-legend"><span><i className="legend-dot violet-dot" /> New customers</span><span><i className="legend-dot indigo-dot" /> Paying accounts</span></div>
          <div className="report-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={growth} barGap={5} margin={{ top: 8, right: 5, left: -22, bottom: 0 }}><CartesianGrid stroke="#eef0f6" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9097a9', fontSize: 11 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#9097a9', fontSize: 11 }} /><Tooltip /><Bar dataKey="customers" name="New customers" fill="#7253c7" radius={[4, 4, 0, 0]} /><Bar dataKey="paid" name="Paying accounts" fill="#a99ae1" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </article>
        <article className="panel report-chart-panel">
          <div className="panel-heading"><div><h2>Active subscriptions</h2><p>Subscription activity in selected period</p></div><span className="report-total">{summary?.activeSubscriptions ?? 0}<small>active today</small></span></div>
          <div className="report-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={subscriptionRows} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}><defs><linearGradient id="activeSubs" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4a61cf" stopOpacity={0.17} /><stop offset="100%" stopColor="#4a61cf" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#eef0f6" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9097a9', fontSize: 11 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#9097a9', fontSize: 11 }} /><Tooltip formatter={(value) => [value, 'Subscriptions']} /><Area dataKey="subscriptions" type="monotone" stroke="#4a61cf" strokeWidth={2.3} fill="url(#activeSubs)" /></AreaChart></ResponsiveContainer></div>
        </article>
        <article className="panel report-chart-panel payment-report-panel">
          <div className="panel-heading"><div><h2>Payment report</h2><p>Invoice collection status</p></div></div>
          <div className="payment-report-content">
            <div className="payment-report-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={payments} dataKey="value" nameKey="name" innerRadius={49} outerRadius={68} paddingAngle={4} stroke="none">{payments.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip formatter={(value) => [`${value}%`, 'Invoices']} /></PieChart></ResponsiveContainer></div>
            <div className="payment-report-legend">{payments.map((item) => <div key={item.name}><span><i className="legend-dot" style={{ background: item.color }} />{item.name}</span><strong>{item.value}%</strong></div>)}</div>
          </div>
          {!paymentTotal && <div className="empty-chart-note">No invoice data for this period.</div>}
        </article>
      </section>
      <section className="report-list panel">
        <div className="panel-heading"><div><h2>Overdue invoices</h2><p>Invoices that may need a friendly follow-up.</p></div><Link className="button button-secondary" to="/invoices">View invoices</Link></div>
        <div className="table-wrap">
          <table className="data-table report-overdue-table"><thead><tr><th>Invoice</th><th>Customer</th><th>Due date</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>{overdueInvoices.map((invoice) => <tr key={invoice.id}><td className="primary-cell">{invoice.id}</td><td>{invoice.customer}</td><td>{invoice.dueDate}</td><td className="amount-cell">${Number(invoice.total).toLocaleString()}</td><td><span className="badge badge-danger"><span className="badge-dot" />Overdue</span></td></tr>)}</tbody>
          </table>
          {!loading && !overdueInvoices.length && <div className="empty-chart-note">No overdue invoices.</div>}
        </div>
      </section>
    </div>
  );
}
