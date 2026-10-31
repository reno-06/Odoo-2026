import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { AppRecord, ModuleKey, RecordData } from '../types';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';
const workspaceStorageKey = 'brightloop.workspaceId';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

type ApiEnvelope<T> = { data: T };
type ApiList<T> = {
  data: T[];
  meta: { page: number; pageSize: number; total: number; pageCount: number };
};
export type Workspace = { id: string; name: string; slug?: string; role: string };
export type Session = {
  id: string;
  email: string;
  fullName: string;
  status: string;
  memberships: Array<{ role: string; workspace: Omit<Workspace, 'role'> }>;
};
export type LoginResult = {
  user: { id: string; email: string; fullName: string };
  workspaces: Workspace[];
  accessToken: string;
  accessTokenExpiresIn: string;
};
export type RecordPage = ApiList<AppRecord>;

let accessToken: string | undefined;
let workspaceId = localStorage.getItem(workspaceStorageKey) ?? undefined;
let refreshPromise: Promise<string> | undefined;
let onUnauthorized: (() => void) | undefined;

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export function setActiveWorkspace(id: string | undefined): void {
  workspaceId = id;
  if (id) localStorage.setItem(workspaceStorageKey, id);
  else localStorage.removeItem(workspaceStorageKey);
}

export function getActiveWorkspace(): string | undefined {
  return workspaceId;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) config.headers.set('Authorization', `Bearer ${accessToken}`);
  if (workspaceId) config.headers.set('X-Workspace-Id', workspaceId);
  return config;
});

async function requestFreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = api
      .post<ApiEnvelope<{ accessToken: string }>>('/auth/refresh')
      .then(({ data }) => {
        accessToken = data.data.accessToken;
        return accessToken;
      })
      .finally(() => {
        refreshPromise = undefined;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as
      | (AxiosRequestConfig & { _authRetry?: boolean })
      | undefined;
    const url = request?.url ?? '';
    if (
      error.response?.status === 401 &&
      request &&
      !request._authRetry &&
      !/\/auth\/(login|refresh|logout|password\/forgot|password\/reset)$/.test(url)
    ) {
      request._authRetry = true;
      try {
        await requestFreshAccessToken();
        return api.request(request);
      } catch {
        accessToken = undefined;
        onUnauthorized?.();
      }
    }
    return Promise.reject(error);
  },
);

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as
      | { error?: { message?: unknown; details?: unknown[] } }
      | undefined;
    const message = body?.error?.message;
    if (Array.isArray(body?.error?.details)) {
      const details = body.error.details
        .map((detail) => {
          if (!detail || typeof detail !== 'object') return '';
          const item = detail as { message?: unknown };
          return typeof item.message === 'string' ? item.message : '';
        })
        .filter(Boolean);
      if (details.length) return details.join(' ');
    }
    if (typeof message === 'string') return message;
    if (error.code === 'ECONNABORTED') return 'The server took too long to respond.';
    if (!error.response) return 'Cannot reach the server. Check your connection and try again.';
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const { data } = await api.post<ApiEnvelope<LoginResult>>('/auth/login', {
    email,
    password,
  });
  accessToken = data.data.accessToken;
  if (data.data.workspaces.length) setActiveWorkspace(data.data.workspaces[0].id);
  return data.data;
}

export async function restoreSession(): Promise<{
  session: Session;
  workspaces: Workspace[];
}> {
  await requestFreshAccessToken();
  const { data } = await api.get<ApiEnvelope<Session>>('/auth/session');
  const workspaces = data.data.memberships.map(({ role, workspace }) => ({
    ...workspace,
    role,
  }));
  if (workspaceId && !workspaces.some((workspace) => workspace.id === workspaceId)) {
    setActiveWorkspace(undefined);
  }
  if (!workspaceId && workspaces.length) setActiveWorkspace(workspaces[0].id);
  return { session: data.data, workspaces };
}

export async function selectWorkspace(id: string): Promise<void> {
  setActiveWorkspace(id);
  const { data } = await api.get<ApiEnvelope<Session>>('/auth/session');
  if (!data.data.memberships.some((membership) => membership.workspace.id === id)) {
    setActiveWorkspace(undefined);
    throw new Error('You no longer have access to that workspace.');
  }
}

export async function registerWithInvitation(
  token: string,
  fullName: string,
  password: string,
): Promise<{ id: string; email: string; fullName: string }> {
  const { data } = await api.post<
    ApiEnvelope<{ user: { id: string; email: string; fullName: string } }>
  >('/workspaces/invitations/accept', { token, fullName, password });
  return data.data.user;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    accessToken = undefined;
    setActiveWorkspace(undefined);
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await api.post('/auth/password/change', { currentPassword, newPassword });
  accessToken = undefined;
  setActiveWorkspace(undefined);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await api.post('/auth/password/reset', { token, newPassword });
  accessToken = undefined;
  setActiveWorkspace(undefined);
}

const endpoint: Record<ModuleKey, string> = {
  products: '/products',
  plans: '/plans',
  customers: '/customers',
  quotations: '/quotations',
  subscriptions: '/subscriptions',
  invoices: '/invoices',
  discounts: '/discounts',
  payments: '/payments',
};

const statusLabel = (value: unknown) =>
  typeof value === 'string'
    ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
    : '';
const intervalLabel = (unit: unknown) => {
  const labels: Record<string, string> = {
    day: 'Daily',
    week: 'Weekly',
    month: 'Monthly',
    year: 'Yearly',
  };
  if (typeof unit !== 'string') return '';
  return labels[unit] ?? statusLabel(unit);
};

function displayRecord(module: ModuleKey, row: Record<string, unknown>): AppRecord {
  const customer = row.customer as Record<string, unknown> | undefined;
  const product = row.product as Record<string, unknown> | undefined;
  const plan = row.plan as Record<string, unknown> | undefined;
  const variants = row.variants as Array<Record<string, unknown>> | undefined;
  const items = row.items as Array<Record<string, unknown>> | undefined;
  const discountProducts = row.products as Array<Record<string, unknown>> | undefined;
  const discountPlans = row.plans as Array<Record<string, unknown>> | undefined;
  const relatedCustomer = String(customer?.name ?? '');
  const name = String(
    row.name ??
      (module === 'quotations' ? relatedCustomer : undefined) ??
      (module === 'subscriptions' || module === 'invoices' || module === 'payments'
        ? relatedCustomer
        : undefined) ??
      row.invoiceNumber ??
      row.quoteNumber ??
      row.subscriptionNumber ??
      row.paymentNumber ??
      row.productNumber ??
      row.planNumber ??
      row.customerNumber ??
      row.discountNumber ??
      row.id,
  );
  const record: Record<string, unknown> = {
    ...row,
    id: String(
      row.invoiceNumber ??
        row.quoteNumber ??
        row.subscriptionNumber ??
        row.paymentNumber ??
        row.productNumber ??
        row.planNumber ??
        row.customerNumber ??
        row.discountNumber ??
        row.id,
    ),
    dbId: String(row.id),
    name,
    status: statusLabel(row.status),
    customer: relatedCustomer || row.customer,
    company: row.companyName ?? customer?.companyName,
    product: product?.name ?? row.product,
    plan: plan?.name ?? (module === 'invoices' ? items?.[0]?.descriptionSnapshot : row.plan),
    interval: row.intervalUnit
      ? intervalLabel(row.intervalUnit)
      : row.interval,
    price: row.salesPrice ?? row.price,
    cost: row.costPrice ?? row.cost,
    quantity: row.minimumQuantity ?? row.quantity,
    renewals: row.allowRenewal === undefined
      ? row.renewals
      : row.allowRenewal
        ? 'Allowed'
        : 'Not allowed',
    earlyClosure: row.allowEarlyClosure === undefined ? row.earlyClosure : row.allowEarlyClosure ? 'Yes' : 'No',
    pause: row.allowPause === undefined ? row.pause : row.allowPause ? 'Yes' : 'No',
    autoClose: row.autoClose === undefined ? row.autoClose : row.autoClose ? 'Yes' : 'No',
    total: row.total ?? row.amount,
    created: row.createdOn ?? row.createdAt,
    startDate: row.startsOn ?? row.startDate,
    expiryDate: row.expiresOn ?? row.expiryDate,
    nextBilling: row.nextBillingOn ?? row.nextBilling,
    issueDate: row.issueDate,
    validUntil: row.validUntil,
    invoice: (row.invoice as Record<string, unknown> | undefined)?.invoiceNumber ?? row.invoice,
    date: row.paidAt ?? row.date,
    type: module === 'products'
      ? row.type === 'digital_service'
        ? 'Digital service'
        : row.type === 'physical_product'
          ? 'Physical product'
          : statusLabel(row.type)
      : module === 'discounts'
        ? row.type === 'fixed_amount'
          ? 'Fixed amount'
          : row.type === 'percentage'
            ? 'Percentage'
            : statusLabel(row.type)
        : statusLabel(row.type),
    method: row.method === 'bank_transfer' ? 'Bank transfer' : statusLabel(row.method),
    appliesTo:
      discountProducts?.[0]?.name ??
      discountPlans?.[0]?.name ??
      (row.appliesTo === 'all_products'
        ? 'All products'
        : row.appliesTo === 'subscription_wide'
          ? 'Subscription-wide'
          : statusLabel(row.appliesTo)),
    starts: row.startsOn,
    ends: row.endsOn,
    usage: row._count && typeof row._count === 'object'
      ? `${(row._count as Record<string, unknown>).redemptions ?? 0}${row.usageLimit ? ` / ${row.usageLimit}` : ''}`
      : row.usage,
    variants: variants?.map((variant) => variant.name).join(', ') ?? row.variants,
    variantPrice: variants?.[0]?.additionalPrice ?? row.variantPrice,
  };
  if (items?.length) {
    record.items = items.map((item) => ({
      productId: item.productId,
      planId: item.planId,
      description: item.descriptionSnapshot,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
    }));
  }
  return record as AppRecord;
}

export async function listRecords(
  module: ModuleKey,
  params: {
    page?: number;
    pageSize?: number;
    q?: string;
    status?: string;
    type?: string;
  } = {},
): Promise<RecordPage> {
  const { data } = await api.get<ApiList<Record<string, unknown>>>(endpoint[module], {
    params: {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 100,
      ...(params.q ? { q: params.q } : {}),
      ...(params.status ? { status: params.status.toLowerCase() } : {}),
      ...(params.type ? { type: params.type.toLowerCase().replaceAll(' ', '_') } : {}),
    },
  });
  return { ...data, data: data.data.map((record) => displayRecord(module, record)) };
}

function requestRecord(module: ModuleKey, input: RecordData): Record<string, unknown> {
  const data: Record<string, unknown> = { ...input };
  const set = (key: string, value: unknown) => {
    if (value !== undefined && value !== '') data[key] = value;
  };
  const remove = (...keys: string[]) => keys.forEach((key) => delete data[key]);
  const number = (key: string) => {
    if (data[key] !== undefined && data[key] !== '') data[key] = Number(data[key]);
  };
  const boolean = (key: string, source: string) => {
    if (data[source] !== undefined) data[key] = data[source] === true || data[source] === 'Yes' || data[source] === 'Allowed';
  };
  const normalizeStatus = () => {
    if (typeof data.status === 'string') data.status = data.status.toLowerCase().replaceAll(' ', '_');
  };

  switch (module) {
    case 'products':
      set('salesPrice', data.price);
      set('costPrice', data.cost);
      if (typeof data.type === 'string') data.type = data.type.toLowerCase().replaceAll(' ', '_');
      if (typeof data.variants === 'string') {
        data.variants = data.variants
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean)
          .map((name) => ({ name, additionalPrice: Number(data.variantPrice ?? 0) }));
      }
      number('salesPrice');
      number('costPrice');
      remove('price', 'cost', 'variantPrice');
      normalizeStatus();
      break;
    case 'plans':
      set('productId', data.product);
      set('intervalUnit', typeof data.interval === 'string'
        ? ({ daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }[data.interval.toLowerCase()] ?? data.interval.toLowerCase())
        : undefined);
      set('minimumQuantity', data.quantity);
      boolean('autoClose', 'autoClose');
      boolean('allowEarlyClosure', 'earlyClosure');
      boolean('allowPause', 'pause');
      boolean('allowRenewal', 'renewals');
      number('price');
      number('minimumQuantity');
      remove('interval', 'quantity', 'earlyClosure', 'pause', 'renewals');
      normalizeStatus();
      break;
    case 'customers':
      set('companyName', data.company);
      set('address', data.location);
      remove('company', 'location');
      normalizeStatus();
      break;
    case 'quotations':
      set('items', data.items ?? [{
        ...(String(data.product ?? '').startsWith('plan:') ? { planId: String(data.product).slice(5) } : { productId: String(data.product ?? '').replace(/^product:/, '') }),
        quantity: Number(data.quantity ?? 1),
        unitPrice: Number(data.unitPrice ?? 0),
        taxRate: Number(data.tax ?? 0),
      }]);
      set('customerId', data.customer);
      number('quantity');
      remove('customer', 'product', 'quantity', 'unitPrice', 'tax');
      normalizeStatus();
      break;
    case 'subscriptions':
      set('customerId', data.name);
      set('planId', data.plan);
      set('startsOn', data.startDate);
      set('expiresOn', data.expiryDate);
      set('nextBillingOn', data.nextBilling);
      set('amount', data.total);
      set('intervalUnit', typeof data.interval === 'string'
        ? ({ daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }[data.interval.toLowerCase()] ?? data.interval.toLowerCase())
        : undefined);
      number('amount');
      remove('name', 'customer', 'plan', 'startDate', 'expiryDate', 'nextBilling', 'total', 'interval');
      normalizeStatus();
      break;
    case 'invoices':
      set('customerId', data.name);
      set('items', data.items ?? [{
        description: data.notes || 'Invoice item',
        quantity: 1,
        unitPrice: Number(data.total ?? 0),
        taxRate: 0,
      }]);
      remove('name', 'customer', 'total', 'status');
      normalizeStatus();
      break;
    case 'discounts':
      set('startsOn', data.starts);
      set('endsOn', data.ends);
      if (typeof data.type === 'string') data.type = data.type.toLowerCase().replaceAll(' ', '_');
      if (typeof data.appliesTo === 'string') {
        if (data.appliesTo === 'Subscription-wide') data.appliesTo = 'subscription_wide';
        else if (data.appliesTo === 'All products') data.appliesTo = 'all_products';
        else if (data.appliesTo.startsWith('product:')) {
          data.appliesTo = 'selected_products';
          data.productIds = [String(input.appliesTo).slice(8)];
        } else if (data.appliesTo.startsWith('plan:')) {
          data.appliesTo = 'selected_plans';
          data.planIds = [String(input.appliesTo).slice(5)];
        }
      }
      number('value');
      number('minimumPurchase');
      number('minimumQuantity');
      number('usageLimit');
      remove('starts', 'ends', 'usage');
      normalizeStatus();
      break;
    case 'payments':
      set('customerId', data.name);
      set('invoiceId', data.invoice);
      set('paidAt', data.date);
      number('amount');
      if (typeof data.method === 'string') data.method = data.method.toLowerCase().replaceAll(' ', '_');
      remove('name', 'customer', 'invoice', 'date');
      normalizeStatus();
      break;
  }
  remove('id', 'dbId', 'createdAt', 'updatedAt', 'deletedAt', 'createdOn', 'createdById', 'workspaceId', 'productNumber', 'planNumber', 'customerNumber', 'quoteNumber', 'invoiceNumber', 'subscriptionNumber', 'paymentNumber', 'discountNumber', 'product', 'plan', 'products', 'plans', '_count', 'payments');
  for (const [key, value] of Object.entries(data)) {
    if (value === '' || value === undefined) delete data[key];
  }
  return data;
}

export async function saveRecord(
  module: ModuleKey,
  input: RecordData,
  id?: string,
): Promise<AppRecord> {
  const payload = requestRecord(module, input);
  const { data } = id
    ? await api.patch<ApiEnvelope<Record<string, unknown>>>(`${endpoint[module]}/${id}`, payload)
    : await api.post<ApiEnvelope<Record<string, unknown>>>(endpoint[module], payload);
  return displayRecord(module, data.data);
}

export async function deleteRecord(module: ModuleKey, id: string): Promise<void> {
  await api.delete(`${endpoint[module]}/${id}`);
}

export async function planAction(id: string, active: boolean): Promise<void> {
  await api.post(`/plans/${id}/${active ? 'activate' : 'deactivate'}`);
}

export async function recordAction(
  module: ModuleKey,
  id: string,
  action: string,
  body?: Record<string, unknown>,
): Promise<unknown> {
  if (!['quotations', 'subscriptions', 'invoices'].includes(module)) {
    throw new Error('This action is not available for the selected record type.');
  }
  const { data } = await api.post<ApiEnvelope<unknown>>(`/${module}/${id}/${action}`, body);
  return data.data;
}

export async function fetchInvoicePdf(id: string): Promise<Blob> {
  const { data } = await api.get<Blob>(`/invoices/${id}/pdf`, { responseType: 'blob' });
  return data;
}

export async function getDashboard(from?: string, to?: string) {
  const { data } = await api.get<ApiEnvelope<Record<string, unknown>>>('/dashboard/summary', {
    params: { ...(from ? { from } : {}), ...(to ? { to } : {}) },
  });
  return data.data;
}

export async function getReport<T>(report: string, params: Record<string, string> = {}) {
  const { data } = await api.get<ApiEnvelope<T>>(`/reports/${report}`, { params });
  return data.data;
}

export async function downloadReport(params: Record<string, string>): Promise<Blob> {
  const { data } = await api.get<Blob>('/reports/export', {
    params: { format: 'csv', ...params },
    responseType: 'blob',
  });
  return data;
}

export async function getSettings(path: string): Promise<Record<string, unknown>> {
  const { data } = await api.get<ApiEnvelope<Record<string, unknown>>>(`/settings/${path}`);
  return data.data;
}

export async function saveSettings(
  path: string,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { data } = await api.patch<ApiEnvelope<Record<string, unknown>>>(`/settings/${path}`, input);
  return data.data;
}

export async function getProfile(): Promise<Record<string, unknown>> {
  const { data } = await api.get<ApiEnvelope<Record<string, unknown>>>('/users/me');
  return data.data;
}

export async function saveProfile(input: Record<string, unknown>) {
  const { data } = await api.patch<ApiEnvelope<Record<string, unknown>>>('/users/me', input);
  return data.data;
}

export async function getPreferences(): Promise<Record<string, unknown>> {
  const { data } = await api.get<ApiEnvelope<Record<string, unknown>>>('/users/me/preferences');
  return data.data;
}

export async function savePreferences(input: Record<string, unknown>) {
  const { data } = await api.patch<ApiEnvelope<Record<string, unknown>>>('/users/me/preferences', input);
  return data.data;
}

export async function getSearchResults(q: string) {
  const { data } = await api.get<ApiEnvelope<Record<string, unknown>>>('/search', { params: { q } });
  return data.data;
}

export async function getNotifications() {
  const { data } = await api.get<ApiList<Record<string, unknown>>>('/notifications');
  return data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/notifications/read-all');
}

export async function checkHealth(): Promise<void> {
  await api.get('/health');
}
