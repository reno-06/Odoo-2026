import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AppShell from './components/AppShell';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import WorkspacePage from './pages/WorkspacePage';
import {
  deleteRecord,
  getApiError,
  listRecords,
  planAction,
  recordAction,
  saveRecord,
} from './services/api';
import type { AppRecord, FieldOption, ModuleKey, RecordData } from './types';

const modules: ModuleKey[] = [
  'products',
  'plans',
  'customers',
  'quotations',
  'subscriptions',
  'invoices',
  'discounts',
  'payments',
];
const paths: Record<string, ModuleKey> = {
  products: 'products',
  plans: 'plans',
  customers: 'customers',
  quotations: 'quotations',
  subscriptions: 'subscriptions',
  invoices: 'invoices',
  discounts: 'discounts',
  payments: 'payments',
};
const emptyRecords = (): Record<ModuleKey, AppRecord[]> => ({
  products: [],
  plans: [],
  customers: [],
  quotations: [],
  subscriptions: [],
  invoices: [],
  discounts: [],
  payments: [],
});
const emptyPageInfo = () => ({
  page: 1,
  pageSize: 100,
  total: 0,
  pageCount: 0,
});

function LoadingScreen({ message }: { message: string }) {
  return <main className="auth-page"><div className="auth-loading">{message}</div></main>;
}

function AuthenticatedApp() {
  const { session, workspaceId, ready } = useAuth();
  const location = useLocation();
  const [records, setRecords] = useState(emptyRecords);
  const [lookupRecords, setLookupRecords] = useState(emptyRecords);
  const [pageInfo, setPageInfo] = useState(() => Object.fromEntries(
    modules.map((module) => [module, emptyPageInfo()]),
  ) as Record<ModuleKey, ReturnType<typeof emptyPageInfo>>);
  const [loading, setLoading] = useState<Record<ModuleKey, boolean>>({
    products: false, plans: false, customers: false, quotations: false,
    subscriptions: false, invoices: false, discounts: false, payments: false,
  });
  const [errors, setErrors] = useState<Partial<Record<ModuleKey, string>>>({});
  const [message, setMessage] = useState('');
  const requestSequence = useRef<Record<ModuleKey, number>>({
    products: 0, plans: 0, customers: 0, quotations: 0,
    subscriptions: 0, invoices: 0, discounts: 0, payments: 0,
  });

  const loadModule = useCallback(async (
    module: ModuleKey,
    query: { page?: number; pageSize?: number; q?: string; status?: string; type?: string } = {},
  ) => {
    const requestId = ++requestSequence.current[module];
    setLoading((current) => ({ ...current, [module]: true }));
    setErrors((current) => ({ ...current, [module]: undefined }));
    try {
      const result = await listRecords(module, { pageSize: 100, ...query });
      if (requestId !== requestSequence.current[module]) return;
      setRecords((current) => ({ ...current, [module]: result.data }));
      setPageInfo((current) => ({ ...current, [module]: result.meta }));
      if (
        ['customers', 'products', 'plans', 'invoices'].includes(module) &&
        (query.page ?? 1) === 1 &&
        !query.q &&
        !query.status &&
        !query.type
      ) {
        setLookupRecords((current) => ({ ...current, [module]: result.data }));
      }
    } catch (error) {
      if (requestId !== requestSequence.current[module]) return;
      const errorMessage = getApiError(error);
      setErrors((current) => ({ ...current, [module]: errorMessage }));
    } finally {
      if (requestId === requestSequence.current[module]) {
        setLoading((current) => ({ ...current, [module]: false }));
      }
    }
  }, []);

  useEffect(() => {
    if (!session || !workspaceId) return;
    setRecords(emptyRecords());
    setLookupRecords(emptyRecords());
    setPageInfo(Object.fromEntries(
      modules.map((module) => [module, emptyPageInfo()]),
    ) as Record<ModuleKey, ReturnType<typeof emptyPageInfo>>);
    void Promise.all(modules.map((module) => loadModule(module, { pageSize: 100 })));
  }, [session, workspaceId, loadModule]);

  useEffect(() => {
    if (!session || location.pathname === '/login') return;
    const module = paths[location.pathname.slice(1)];
    if (module) void loadModule(module);
  }, [location.pathname, session, loadModule]);

  const save = useCallback(async (module: ModuleKey, data: RecordData, existing?: AppRecord) => {
    try {
      await saveRecord(module, data, existing?.dbId ? String(existing.dbId) : undefined);
      await loadModule(module);
      setMessage(`${module.slice(0, -1)} saved successfully.`);
    } catch (error) {
      setMessage(getApiError(error));
      throw error;
    }
  }, [loadModule]);

  const remove = useCallback(async (module: ModuleKey, record: AppRecord) => {
    if (!window.confirm(`Delete "${record.name}"? This cannot be undone.`)) return;
    try {
      await deleteRecord(module, String(record.dbId ?? record.id));
      await loadModule(module);
      setMessage('Record deleted.');
    } catch (error) {
      setMessage(getApiError(error));
    }
  }, [loadModule]);

  const togglePlan = useCallback(async (record: AppRecord) => {
    try {
      await planAction(String(record.dbId ?? record.id), record.status !== 'Active');
      await loadModule('plans');
    } catch (error) {
      setMessage(getApiError(error));
    }
  }, [loadModule]);

  const action = useCallback(async (module: ModuleKey, record: AppRecord, operation: string) => {
    try {
      await recordAction(module, String(record.dbId ?? record.id), operation);
      await loadModule(module);
      setMessage('Action completed.');
    } catch (error) {
      setMessage(getApiError(error));
      throw error;
    }
  }, [loadModule]);

  const customerOptions = lookupRecords.customers.map((record) => ({
    label: record.name,
    value: String(record.dbId ?? record.id),
  }));
  const productOptions = lookupRecords.products.map((record) => ({
    label: record.name,
    value: String(record.dbId ?? record.id),
  }));
  const planOptions = lookupRecords.plans.map((record) => ({
    label: record.name,
    value: String(record.dbId ?? record.id),
  }));
  const options: Partial<Record<ModuleKey, Partial<Record<string, FieldOption[]>>>> = {
    plans: { product: productOptions },
    quotations: {
      customer: customerOptions,
      product: [
        ...productOptions.map((option) => ({ ...option, value: `product:${option.value}` })),
        ...planOptions.map((option) => ({ ...option, value: `plan:${option.value}` })),
      ],
    },
    subscriptions: { name: customerOptions, plan: planOptions },
    invoices: { name: customerOptions },
    discounts: {
      appliesTo: [
        { label: 'All products', value: 'All products' },
        { label: 'Subscription-wide', value: 'Subscription-wide' },
        ...productOptions.map((option) => ({ ...option, value: `product:${option.value}` })),
        ...planOptions.map((option) => ({ ...option, value: `plan:${option.value}` })),
      ],
    },
    payments: {
      name: customerOptions,
      invoice: lookupRecords.invoices.map((record) => ({
        label: record.id,
        value: String(record.dbId ?? record.id),
      })),
    },
  };

  if (!ready) return <LoadingScreen message="Restoring your session…" />;
  if (session && location.pathname === '/reset-password') return <LoginPage />;
  if (!session) return <Routes><Route path="/login" element={<LoginPage />} /><Route path="/reset-password" element={<LoginPage />} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes>;
  if (!workspaceId) return <LoadingScreen message="Your account does not have an active workspace." />;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        {modules.map((module) => (
          <Route
            key={module}
            path={`/${module}`}
            element={
              <>
                {message && <div className="app-message" role="status">{message}<button type="button" aria-label="Dismiss message" onClick={() => setMessage('')}>×</button></div>}
                {errors[module] && <div className="app-error" role="alert">{errors[module]}<button type="button" onClick={() => void loadModule(module)}>Retry</button></div>}
                <WorkspacePage
                  module={module}
                  records={records[module]}
                  loading={loading[module]}
                  pageInfo={pageInfo[module]}
                  fieldOptions={options[module]}
                  onSave={(data, existing) => save(module, data, existing)}
                  onDelete={(record) => remove(module, record)}
                  onToggle={(record) => togglePlan(record)}
                  onAction={(record, operation) => action(module, record, operation)}
                  onQueryChange={loadModule}
                />
              </>
            }
          />
        ))}
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return <AuthProvider><AuthenticatedApp /></AuthProvider>;
}
