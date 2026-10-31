import { useState } from 'react';
import { CalendarDays, Download, TrendingUp, Users, WalletCards } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeading } from '../components/ui';
import { initialRecords, paymentBreakdown, revenueByMonth } from '../data/sampleData';

const customerGrowth = [
  { month: 'May', customers: 96, paid: 83 },
  { month: 'Jun', customers: 118, paid: 101 },
  { month: 'Jul', customers: 109, paid: 92 },
  { month: 'Aug', customers: 142, paid: 126 },
  { month: 'Sep', customers: 161, paid: 146 },
  { month: 'Oct', customers: 184, paid: 169 },
];

export default function ReportsPage() {
  const [range, setRange] = useState('Last 6 months');
  const pointCount = range === 'Last 3 months' ? 3 : range === 'Last 12 months' ? 12 : 6;
  const revenue = revenueByMonth.slice(-pointCount);
  const growth = customerGrowth.slice(-pointCount);
  const overdueInvoices = initialRecords.invoices.filter((invoice) => invoice.status === 'Overdue');
  return (
    <div className="page-stack">
      <PageHeading eyebrow="INSIGHTS & ANALYTICS" title="Reports" description="Make confident decisions with a clear picture of your business." action={<button type="button" className="button button-secondary" onClick={() => window.print()}><Download size={16} /> Export reports</button>} />
      <div className="report-controls panel">
        <div><CalendarDays size={17} /><span>Reporting period</span></div>
        <select className="select-compact" aria-label="Reporting period" value={range} onChange={(event) => setRange(event.target.value)}><option>Last 3 months</option><option>Last 6 months</option><option>Last 12 months</option></select>
        <span className="report-updated">Data updated just now</span>
      </div>
      <div className="report-kpis">
        <article className="report-kpi"><div className="report-kpi-icon purple-kpi"><WalletCards size={18} /></div><span>Total revenue</span><strong>$284,560</strong><small className="trend-up"><TrendingUp size={13} /> 12.8% <i>vs. previous period</i></small></article>
        <article className="report-kpi"><div className="report-kpi-icon blue-kpi"><TrendingUp size={18} /></div><span>Active subscriptions</span><strong>482</strong><small className="trend-up"><TrendingUp size={13} /> 18.4% <i>vs. previous period</i></small></article>
        <article className="report-kpi"><div className="report-kpi-icon green-kpi"><Users size={18} /></div><span>New customers</span><strong>184</strong><small className="trend-up"><TrendingUp size={13} /> 9.2% <i>vs. previous period</i></small></article>
        <article className="report-kpi"><div className="report-kpi-icon amber-kpi"><WalletCards size={18} /></div><span>Overdue invoices</span><strong>12</strong><small className="trend-down">3 need follow-up <i>this week</i></small></article>
      </div>
      <section className="report-charts">
        <article className="panel report-chart-panel">
          <div className="panel-heading"><div><h2>Revenue report</h2><p>Monthly revenue performance</p></div><span className="report-total">$42,850 <small>October</small></span></div>
          <div className="report-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={revenue} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}><defs><linearGradient id="reportRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6747c7" stopOpacity={0.19} /><stop offset="100%" stopColor="#6747c7" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#eef0f6" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9097a9', fontSize: 11 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#9097a9', fontSize: 11 }} tickFormatter={(value: number) => `$${value / 1000}k`} /><Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} /><Area dataKey="revenue" type="monotone" stroke="#6747c7" strokeWidth={2.5} fill="url(#reportRevenue)" /></AreaChart></ResponsiveContainer></div>
        </article>
        <article className="panel report-chart-panel">
          <div className="panel-heading"><div><h2>Customer growth</h2><p>New customers and paying accounts</p></div></div>
          <div className="chart-legend"><span><i className="legend-dot violet-dot" /> New customers</span><span><i className="legend-dot indigo-dot" /> Paying accounts</span></div>
          <div className="report-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={growth} barGap={5} margin={{ top: 8, right: 5, left: -22, bottom: 0 }}><CartesianGrid stroke="#eef0f6" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9097a9', fontSize: 11 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#9097a9', fontSize: 11 }} /><Tooltip /><Bar dataKey="customers" name="New customers" fill="#7253c7" radius={[4, 4, 0, 0]} /><Bar dataKey="paid" name="Paying accounts" fill="#a99ae1" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </article>
        <article className="panel report-chart-panel">
          <div className="panel-heading"><div><h2>Active subscriptions</h2><p>Subscriber growth during {range.toLowerCase()}</p></div><span className="report-total">482<small>active today</small></span></div>
          <div className="report-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={revenue} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}><defs><linearGradient id="activeSubs" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4a61cf" stopOpacity={0.17} /><stop offset="100%" stopColor="#4a61cf" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#eef0f6" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9097a9', fontSize: 11 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#9097a9', fontSize: 11 }} /><Tooltip formatter={(value) => [value, 'Subscriptions']} /><Area dataKey="subscriptions" type="monotone" stroke="#4a61cf" strokeWidth={2.3} fill="url(#activeSubs)" /></AreaChart></ResponsiveContainer></div>
        </article>
        <article className="panel report-chart-panel payment-report-panel">
          <div className="panel-heading"><div><h2>Payment report</h2><p>Invoice collection status</p></div></div>
          <div className="payment-report-content">
            <div className="payment-report-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={paymentBreakdown} dataKey="value" nameKey="name" innerRadius={49} outerRadius={68} paddingAngle={4} stroke="none">{paymentBreakdown.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip formatter={(value) => [`${value}%`, 'Invoices']} /></PieChart></ResponsiveContainer></div>
            <div className="payment-report-legend">{paymentBreakdown.map((item) => <div key={item.name}><span><i className="legend-dot" style={{ background: item.color }} />{item.name}</span><strong>{item.value}%</strong></div>)}</div>
          </div>
        </article>
      </section>
      <section className="report-list panel">
        <div className="panel-heading"><div><h2>Overdue invoices</h2><p>Invoices that may need a friendly follow-up.</p></div><button type="button" className="button button-secondary" onClick={() => window.location.assign('/invoices')}>View invoices</button></div>
        <div className="table-wrap">
          <table className="data-table report-overdue-table"><thead><tr><th>Invoice</th><th>Customer</th><th>Due date</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>{overdueInvoices.map((invoice) => <tr key={invoice.id}><td className="primary-cell">{invoice.id}</td><td>{invoice.customer}</td><td>{invoice.dueDate}</td><td className="amount-cell">${Number(invoice.total).toLocaleString()}</td><td><span className="badge badge-danger"><span className="badge-dot" />Overdue</span></td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
