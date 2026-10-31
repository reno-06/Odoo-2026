import {
  ArrowDownRight, ArrowUpRight, ArrowUpRight as ExternalLink, CalendarDays, ChevronRight,
  CircleAlert, CreditCard, Download, Ellipsis, FileText, Users, WalletCards,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { initialRecords, paymentBreakdown, planDistribution, revenueByMonth } from '../data/sampleData';
import type { AppRecord } from '../types';
import { PageHeading, StatusBadge } from '../components/ui';

const metrics = [
  { label: 'Total revenue', value: '$284,560', change: '+12.8%', positive: true, note: 'vs. last month', icon: WalletCards, color: 'violet' },
  { label: 'Monthly recurring revenue', value: '$42,850', change: '+8.2%', positive: true, note: 'vs. last month', icon: CreditCard, color: 'blue' },
  { label: 'Active subscriptions', value: '482', change: '+6.4%', positive: true, note: 'vs. last month', icon: FileText, color: 'green' },
  { label: 'Total customers', value: '1,284', change: '+4.3%', positive: true, note: 'vs. last month', icon: Users, color: 'amber' },
  { label: 'Outstanding payments', value: '$8,240', change: '2.1%', positive: false, note: 'of total revenue', icon: WalletCards, color: 'rose' },
  { label: 'Overdue invoices', value: '12', change: '3 new', positive: false, note: 'need your attention', icon: CircleAlert, color: 'slate' },
];

function TableRows({ records }: { records: AppRecord[] }) {
  return (
    <div className="mini-table-wrap">
      <table className="data-table compact-table">
        <thead><tr><th>Customer</th><th>Plan</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>{records.slice(0, 4).map((record) => (
          <tr key={record.id}><td><div className="customer-cell"><span className="table-avatar">{String(record.name).split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><span><strong>{record.name}</strong><small>{record.id}</small></span></div></td><td>{String(record.plan ?? record.customer ?? '—')}</td><td className="amount-cell">${Number(record.total ?? record.amount ?? 0).toLocaleString()}</td><td><StatusBadge status={record.status} /></td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export default function DashboardPage() {
  const subscriptions = initialRecords.subscriptions;
  const invoices = initialRecords.invoices;
  return (
    <div className="page-stack">
      <PageHeading eyebrow="SATURDAY, OCTOBER 31, 2026" title="Good morning, Olivia" description="Here’s what’s happening with your subscriptions today." action={<button type="button" className="button button-secondary" onClick={() => window.print()}><Download size={16} /> Export report</button>} />

      <section className="metric-grid" aria-label="Business metrics">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const ChangeIcon = metric.positive ? ArrowUpRight : ArrowDownRight;
          return (
            <article className="metric-card" key={metric.label}>
              <div className="metric-card-top"><span>{metric.label}</span><span className={`metric-icon metric-${metric.color}`}><Icon size={17} /></span></div>
              <div className="metric-value">{metric.value}</div>
              <div className="metric-note"><span className={metric.positive ? 'trend-up' : 'trend-down'}><ChangeIcon size={14} />{metric.change}</span><span>{metric.note}</span></div>
            </article>
          );
        })}
      </section>

      <section className="dashboard-grid">
        <article className="panel revenue-panel">
          <div className="panel-heading">
            <div><h2>Revenue over time</h2><p>A clear view of your business momentum</p></div>
            <select className="select-compact" aria-label="Revenue time range" defaultValue="6"><option value="6">Last 6 months</option><option value="12">Last 12 months</option></select>
          </div>
          <div className="chart-legend"><span><i className="legend-dot violet-dot" /> Revenue</span><span><i className="legend-dot indigo-dot" /> Subscriptions</span></div>
          <div className="revenue-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueByMonth} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7253c7" stopOpacity={0.19} /><stop offset="96%" stopColor="#7253c7" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9097a9', fontSize: 11 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9097a9', fontSize: 11 }} tickFormatter={(value: number) => `$${value / 1000}k`} />
                <Tooltip formatter={(value, name) => [name === 'revenue' ? `$${Number(value).toLocaleString()}` : value, name === 'revenue' ? 'Revenue' : 'Subscriptions']} contentStyle={{ borderRadius: 12, border: '1px solid #ececf4', boxShadow: '0 8px 24px #17203312' }} />
                <Area type="monotone" dataKey="revenue" stroke="#6747c7" strokeWidth={2.5} fill="url(#revenueFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel breakdown-panel">
          <div className="panel-heading"><div><h2>Payment status</h2><p>Invoice breakdown</p></div><button className="icon-button" aria-label="More payment options" type="button"><Ellipsis size={19} /></button></div>
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height={198}>
              <PieChart><Pie data={paymentBreakdown} dataKey="value" nameKey="name" innerRadius={62} outerRadius={82} paddingAngle={4} stroke="none">{paymentBreakdown.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip formatter={(value) => [`${value}%`, 'Invoices']} /></PieChart>
            </ResponsiveContainer>
            <div className="donut-center"><strong>1,248</strong><span>Total invoices</span></div>
          </div>
          <div className="breakdown-legend">{paymentBreakdown.map((item) => <div key={item.name}><span><i className="legend-dot" style={{ background: item.color }} />{item.name}</span><strong>{item.value}%</strong></div>)}</div>
        </article>

        <article className="panel subscription-panel">
          <div className="panel-heading"><div><h2>Subscription growth</h2><p>Growing steadily month over month</p></div><span className="growth-tag"><ArrowUpRight size={14} /> 18.4%</span></div>
          <div className="growth-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueByMonth} margin={{ top: 12, right: 5, left: -24, bottom: 0 }}>
                <defs><linearGradient id="subscriberFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4a61cf" stopOpacity={0.16} /><stop offset="100%" stopColor="#4a61cf" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="#eef0f6" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9097a9', fontSize: 10 }} dy={8} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#9097a9', fontSize: 10 }} />
                <Tooltip formatter={(value) => [value, 'Subscriptions']} contentStyle={{ borderRadius: 12, border: '1px solid #ececf4' }} /><Area type="monotone" dataKey="subscriptions" stroke="#4a61cf" strokeWidth={2.2} fill="url(#subscriberFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel plans-panel">
          <div className="panel-heading"><div><h2>Plans by subscribers</h2><p>What customers love most</p></div><button className="text-link" type="button">View plans <ChevronRight size={15} /></button></div>
          <div className="plan-list">{planDistribution.map((plan) => <div className="plan-row" key={plan.name}><span className="plan-color" style={{ background: plan.color }} /><span className="plan-name">{plan.name}</span><div className="plan-bar"><span style={{ width: `${plan.value * 2}%`, background: plan.color }} /></div><strong>{plan.value}%</strong></div>)}</div>
          <div className="plan-total"><span>Total subscribers</span><strong>482</strong></div>
        </article>

        <article className="panel recent-panel">
          <div className="panel-heading"><div><h2>Recent subscriptions</h2><p>Your latest customer activity</p></div><button className="text-link" type="button" onClick={() => window.location.assign('/subscriptions')}>View all <ChevronRight size={15} /></button></div>
          <TableRows records={subscriptions} />
        </article>

        <article className="panel invoice-panel">
          <div className="panel-heading"><div><h2>Recent invoices</h2><p>Latest billing activity</p></div><button className="text-link" type="button" onClick={() => window.location.assign('/invoices')}>View all <ChevronRight size={15} /></button></div>
          <TableRows records={invoices} />
        </article>
      </section>

      <section className="attention-grid">
        <article className="attention-card renewal-card">
          <div className="attention-icon renewal-icon"><CalendarDays size={18} /></div>
          <div className="attention-copy"><strong>Upcoming renewals</strong><span>8 subscriptions renew in the next 7 days</span></div>
          <button type="button" aria-label="View upcoming renewals" onClick={() => window.location.assign('/subscriptions')}><ChevronRight size={17} /></button>
        </article>
        <article className="attention-card overdue-card">
          <div className="attention-icon overdue-icon"><CircleAlert size={18} /></div>
          <div className="attention-copy"><strong>Overdue payment alerts</strong><span>3 invoices need a friendly follow-up</span></div>
          <button type="button" aria-label="View overdue invoices" onClick={() => window.location.assign('/invoices')}><ExternalLink size={16} /></button>
        </article>
      </section>
    </div>
  );
}
