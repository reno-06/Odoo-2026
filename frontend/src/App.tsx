import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import { initialRecords } from './data/sampleData';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import WorkspacePage from './pages/WorkspacePage';
import type { AppRecord, ModuleKey, RecordData } from './types';

function makeReference(module: ModuleKey, records: AppRecord[]) {
  const prefixes: Record<ModuleKey, string> = {
    products: 'PRD', plans: 'PLN', customers: 'CUS', quotations: 'QUO',
    subscriptions: 'SUB', invoices: 'INV-2026', discounts: 'DSC', payments: 'PAY',
  };
  const maxId = records.reduce((max, record) => {
    const number = Number(record.id.match(/(\d+)$/)?.[1] ?? 0);
    return Math.max(max, number);
  }, 0);
  return `${prefixes[module]}-${String(maxId + 1).padStart(4, '0')}`;
}

export default function App() {
  const [records, setRecords] = useState(initialRecords);
  const saveRecord = (module: ModuleKey, data: RecordData, existing?: AppRecord) => {
    const current = records[module];
    const normalized = Object.fromEntries(Object.entries(data).map(([key, value]) => (
      ['price', 'cost', 'variantPrice', 'quantity', 'unitPrice', 'tax', 'total', 'amount', 'value', 'minimumPurchase', 'minimumQuantity', 'usageLimit'].includes(key) && value !== ''
        ? [key, Number(value)]
        : [key, value]
    ))) as RecordData;
    const name = String(normalized.name ?? normalized.customer ?? 'New record');
    let additions: RecordData = {};
    if (module === 'quotations') {
      const base = Number(normalized.unitPrice ?? 0) * Number(normalized.quantity ?? 0);
      additions = { created: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }), total: Number((base * (1 + Number(normalized.tax ?? 0) / 100)).toFixed(2)), name };
    }
    if (module === 'customers') additions = { ...additions, location: normalized.location ?? '' };
    if (module === 'payments') additions = { ...additions, amount: Number(normalized.amount ?? 0) };
    if (module === 'subscriptions') additions = { ...additions, total: Number(normalized.total ?? 0) };
    if (module === 'invoices') additions = { ...additions, total: Number(normalized.total ?? 0) };
    const nextRecord: AppRecord = {
      ...(existing ?? {}),
      ...normalized,
      ...additions,
      id: existing?.id ?? makeReference(module, current),
      name,
      status: String(normalized.status ?? existing?.status ?? 'Active'),
    };
    setRecords((state) => ({
      ...state,
      [module]: existing
        ? state[module].map((record) => record.id === existing.id ? nextRecord : record)
        : [nextRecord, ...state[module]],
    }));
  };
  const deleteRecord = (module: ModuleKey, record: AppRecord) => {
    if (!window.confirm(`Delete "${record.name}" (${record.id})? This cannot be undone.`)) return;
    setRecords((state) => ({ ...state, [module]: state[module].filter((item) => item.id !== record.id) }));
  };
  const togglePlan = (record: AppRecord) => saveRecord('plans', { ...record, status: record.status === 'Active' ? 'Inactive' : 'Active' }, record);
  const workspacePage = (module: ModuleKey) => <WorkspacePage module={module} records={records[module]} onSave={(value, existing) => saveRecord(module, value, existing)} onDelete={(record) => deleteRecord(module, record)} onToggle={togglePlan} />;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="products" element={workspacePage('products')} />
        <Route path="plans" element={workspacePage('plans')} />
        <Route path="customers" element={workspacePage('customers')} />
        <Route path="quotations" element={workspacePage('quotations')} />
        <Route path="subscriptions" element={workspacePage('subscriptions')} />
        <Route path="invoices" element={workspacePage('invoices')} />
        <Route path="discounts" element={workspacePage('discounts')} />
        <Route path="payments" element={workspacePage('payments')} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
