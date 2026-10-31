import { useEffect, useState, type FormEvent } from 'react';
import { Download, Eye, Pencil, Plus, Printer, Search, Trash2 } from 'lucide-react';
import type { AppRecord, FieldOption, FormField, ModuleKey, RecordData } from '../types';
import { EmptyState, Modal, PageHeading, StatusBadge } from '../components/ui';
import { fetchInvoicePdf } from '../services/api';

const choice = (...values: string[]) => values.map((value) => ({ label: value, value }));
const statusChoices: Partial<Record<ModuleKey, string[]>> = {
  products: ['Active', 'Inactive', 'Archived'],
  plans: ['Active', 'Inactive', 'Archived'],
  customers: ['Active', 'Inactive'],
  quotations: ['Draft', 'Quotation', 'Confirmed', 'Rejected', 'Expired'],
  subscriptions: ['Draft', 'Quotation', 'Confirmed', 'Active', 'Paused', 'Closed', 'Expired', 'Cancelled'],
  invoices: ['Draft', 'Confirmed', 'Overdue', 'Paid', 'Cancelled'],
  discounts: ['Active', 'Inactive', 'Expired'],
  payments: ['Pending', 'Completed', 'Failed', 'Refunded'],
};
const productTypeChoices = ['Digital service', 'Service', 'Physical product'];

const moduleConfig: Record<ModuleKey, {
  title: string;
  description: string;
  singular: string;
  columns: { key: string; label: string }[];
  fields: FormField[];
}> = {
  products: {
    title: 'Products',
    description: 'Manage the products and services you offer to your customers.',
    singular: 'product',
    columns: [{ key: 'name', label: 'Product' }, { key: 'type', label: 'Type' }, { key: 'price', label: 'Sales price' }, { key: 'cost', label: 'Cost price' }, { key: 'variants', label: 'Variants' }, { key: 'status', label: 'Status' }],
    fields: [
      { key: 'name', label: 'Product name', required: true, placeholder: 'e.g. Cloud workspace' },
      { key: 'type', label: 'Product type', type: 'select', required: true, options: choice('Digital service', 'Service', 'Physical product') },
      { key: 'price', label: 'Sales price', type: 'number', required: true, min: 0 },
      { key: 'cost', label: 'Cost price', type: 'number', required: true, min: 0 },
      { key: 'variants', label: 'Product variants', placeholder: 'Separate variants with commas' },
      { key: 'variantPrice', label: 'Variant additional price', type: 'number', min: 0 },
      { key: 'description', label: 'Description / notes', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select', required: true, options: choice('Active', 'Archived') },
    ],
  },
  plans: {
    title: 'Subscription plans',
    description: 'Build flexible billing options that work for your customers.',
    singular: 'plan',
    columns: [{ key: 'name', label: 'Plan' }, { key: 'product', label: 'Product' }, { key: 'interval', label: 'Billing interval' }, { key: 'price', label: 'Price' }, { key: 'quantity', label: 'Min. quantity' }, { key: 'status', label: 'Status' }],
    fields: [
      { key: 'name', label: 'Plan name', required: true, placeholder: 'e.g. Growth annual' },
      { key: 'product', label: 'Product', type: 'select', required: true, options: choice('Cloud workspace', 'Priority support', 'Analytics add-on') },
      { key: 'interval', label: 'Billing interval', type: 'select', required: true, options: choice('Daily', 'Weekly', 'Monthly', 'Yearly') },
      { key: 'price', label: 'Price', type: 'number', min: 0, required: true },
      { key: 'quantity', label: 'Minimum quantity', type: 'number', min: 1, required: true },
      { key: 'availableFrom', label: 'Available from', type: 'date' },
      { key: 'availableUntil', label: 'Available until', type: 'date' },
      { key: 'autoClose', label: 'Auto-close', type: 'select', options: choice('No', 'Yes') },
      { key: 'earlyClosure', label: 'Allow early closure', type: 'select', options: choice('Yes', 'No') },
      { key: 'pause', label: 'Allow pause', type: 'select', options: choice('Yes', 'No') },
      { key: 'renewals', label: 'Allow renewal', type: 'select', options: choice('Allowed', 'Not allowed') },
      { key: 'status', label: 'Status', type: 'select', required: true, options: choice('Active', 'Inactive') },
    ],
  },
  customers: {
    title: 'Customers',
    description: 'Get to know your customers and keep every account organized.',
    singular: 'customer',
    columns: [{ key: 'name', label: 'Customer' }, { key: 'company', label: 'Company' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'status', label: 'Status' }],
    fields: [
      { key: 'name', label: 'Full name', required: true, placeholder: 'e.g. Olivia Rhye' },
      { key: 'email', label: 'Email address', type: 'email', required: true, placeholder: 'name@company.com' },
      { key: 'phone', label: 'Phone number', type: 'tel', placeholder: '+1 (555) 000-0000' },
      { key: 'company', label: 'Company name', placeholder: 'Company or organization' },
      { key: 'location', label: 'Address', type: 'textarea' },
      { key: 'status', label: 'Account status', type: 'select', required: true, options: choice('Active', 'Inactive') },
    ],
  },
  quotations: {
    title: 'Quotations',
    description: 'Create clear proposals and keep every deal moving forward.',
    singular: 'quotation',
    columns: [{ key: 'id', label: 'Quote' }, { key: 'customer', label: 'Customer' }, { key: 'created', label: 'Created' }, { key: 'validUntil', label: 'Valid until' }, { key: 'total', label: 'Total' }, { key: 'status', label: 'Status' }],
    fields: [
      { key: 'customer', label: 'Select customer', type: 'select', required: true, options: choice('Olivia Rhye', 'Phoenix Baker', 'Lana Steiner', 'Demi Wilkinson') },
      { key: 'product', label: 'Product or plan', type: 'select', required: true, options: choice('Cloud workspace · Growth annual', 'Cloud workspace · Starter monthly', 'Priority support · Support monthly') },
      { key: 'quantity', label: 'Quantity', type: 'number', min: 1, required: true },
      { key: 'unitPrice', label: 'Unit price', type: 'number', min: 0, required: true },
      { key: 'tax', label: 'Tax (%)', type: 'number', min: 0, required: true },
      { key: 'validUntil', label: 'Quotation valid until', type: 'date', required: true },
      { key: 'status', label: 'Status', type: 'select', required: true, options: choice('Draft', 'Quotation', 'Confirmed') },
    ],
  },
  subscriptions: {
    title: 'Subscriptions',
    description: 'Track customer plans, renewal dates, and subscription health.',
    singular: 'subscription',
    columns: [{ key: 'id', label: 'Subscription' }, { key: 'name', label: 'Customer' }, { key: 'plan', label: 'Plan' }, { key: 'startDate', label: 'Start date' }, { key: 'nextBilling', label: 'Next billing' }, { key: 'total', label: 'Amount' }, { key: 'status', label: 'Status' }],
    fields: [
      { key: 'name', label: 'Customer', type: 'select', required: true, options: choice('Olivia Rhye', 'Phoenix Baker', 'Lana Steiner', 'Demi Wilkinson') },
      { key: 'plan', label: 'Plan', type: 'select', required: true, options: choice('Growth annual', 'Starter monthly', 'Support monthly') },
      { key: 'startDate', label: 'Start date', type: 'date', required: true },
      { key: 'expiryDate', label: 'Expiry date', type: 'date' },
      { key: 'interval', label: 'Billing interval', type: 'select', required: true, options: choice('Daily', 'Weekly', 'Monthly', 'Yearly') },
      { key: 'total', label: 'Total amount', type: 'number', min: 0, required: true },
      { key: 'nextBilling', label: 'Next billing date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', required: true, options: choice('Draft', 'Quotation', 'Confirmed', 'Active', 'Paused', 'Closed', 'Expired') },
    ],
  },
  invoices: {
    title: 'Invoices',
    description: 'Keep billing tidy, see payment status, and follow up on time.',
    singular: 'invoice',
    columns: [{ key: 'id', label: 'Invoice' }, { key: 'name', label: 'Customer' }, { key: 'issueDate', label: 'Issue date' }, { key: 'dueDate', label: 'Due date' }, { key: 'total', label: 'Total' }, { key: 'status', label: 'Payment status' }],
    fields: [
      { key: 'name', label: 'Customer', type: 'select', required: true, options: choice('Olivia Rhye', 'Phoenix Baker', 'Lana Steiner', 'Demi Wilkinson') },
      { key: 'issueDate', label: 'Issue date', type: 'date', required: true },
      { key: 'dueDate', label: 'Due date', type: 'date', required: true },
      { key: 'total', label: 'Total', type: 'number', min: 0, required: true },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  discounts: {
    title: 'Discounts',
    description: 'Create thoughtful offers and decide exactly where they apply.',
    singular: 'discount',
    columns: [{ key: 'name', label: 'Discount' }, { key: 'type', label: 'Type' }, { key: 'value', label: 'Value' }, { key: 'appliesTo', label: 'Applies to' }, { key: 'usage', label: 'Usage' }, { key: 'ends', label: 'Ends' }, { key: 'status', label: 'Status' }],
    fields: [
      { key: 'name', label: 'Discount name', required: true },
      { key: 'type', label: 'Discount type', type: 'select', required: true, options: choice('Fixed amount', 'Percentage') },
      { key: 'value', label: 'Discount value', type: 'number', min: 0, required: true },
      { key: 'minimumPurchase', label: 'Minimum purchase amount', type: 'number', min: 0 },
      { key: 'minimumQuantity', label: 'Minimum quantity', type: 'number', min: 1 },
      { key: 'starts', label: 'Start date', type: 'date' },
      { key: 'ends', label: 'End date', type: 'date' },
      { key: 'usageLimit', label: 'Usage limit', type: 'number', min: 1 },
      { key: 'appliesTo', label: 'Applies to', type: 'select', required: true, options: choice('All products', 'Cloud workspace', 'Growth annual', 'Subscription-wide') },
      { key: 'status', label: 'Status', type: 'select', required: true, options: choice('Active', 'Inactive', 'Expired') },
    ],
  },
  payments: {
    title: 'Payments',
    description: 'A straightforward record of payments received from customers.',
    singular: 'payment',
    columns: [{ key: 'id', label: 'Reference' }, { key: 'name', label: 'Customer' }, { key: 'invoice', label: 'Invoice' }, { key: 'amount', label: 'Amount' }, { key: 'method', label: 'Method' }, { key: 'date', label: 'Payment date' }, { key: 'status', label: 'Status' }],
    fields: [
      { key: 'name', label: 'Customer', type: 'select', required: true, options: choice('Olivia Rhye', 'Phoenix Baker', 'Lana Steiner', 'Demi Wilkinson') },
      { key: 'invoice', label: 'Invoice number', placeholder: 'e.g. INV-2026-084' },
      { key: 'amount', label: 'Amount', type: 'number', min: 0, required: true },
      { key: 'method', label: 'Payment method', type: 'select', required: true, options: choice('Cash', 'Bank transfer', 'Card', 'UPI', 'Other') },
      { key: 'date', label: 'Payment date', type: 'date', required: true },
      { key: 'notes', label: 'Notes', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select', required: true, options: choice('Completed', 'Pending') },
    ],
  },
};

function displayValue(key: string, value: unknown) {
  if (typeof value === 'number' && ['price', 'cost', 'total', 'amount', 'unitPrice', 'value'].includes(key)) {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (value === undefined || value === '') return '—';
  return String(value);
}

function validate(values: RecordData, fields: FormField[], module: ModuleKey) {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const value = values[field.key];
    if (field.required && (value === undefined || value === '' || value === null)) {
      errors[field.key] = `${field.label} is required.`;
      continue;
    }
    if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
      errors[field.key] = 'Enter a valid email address.';
    }
    if (field.type === 'number' && value !== undefined && value !== '') {
      const number = Number(value);
      if (!Number.isFinite(number) || number < (field.min ?? 0)) {
        errors[field.key] = field.min === 1 ? 'Enter a quantity greater than zero.' : 'Enter a valid non-negative amount.';
      }
    }
  }
  const startKey = values.startDate !== undefined ? 'startDate' : values.availableFrom !== undefined ? 'availableFrom' : 'starts';
  const endKey = values.expiryDate !== undefined ? 'expiryDate' : values.availableUntil !== undefined ? 'availableUntil' : 'ends';
  const start = values[startKey];
  const end = values[endKey];
  if (start && end && String(end) < String(start)) errors[endKey] = 'End date cannot be earlier than start date.';
  if (values.issueDate && values.dueDate && String(values.dueDate) < String(values.issueDate)) errors.dueDate = 'Due date cannot be earlier than issue date.';
  if ((module === 'discounts' && Number(values.value) <= 0) || (module === 'payments' && Number(values.amount) <= 0)) {
    const key = module === 'discounts' ? 'value' : 'amount';
    errors[key] = 'Enter an amount greater than zero.';
  }
  if (module === 'discounts' && values.type === 'Percentage' && Number(values.value) > 100) {
    errors.value = 'Percentage discounts cannot exceed 100%.';
  }
  return errors;
}

type Query = { page?: number; pageSize?: number; q?: string; status?: string; type?: string };
type PageInfo = { page: number; pageSize: number; total: number; pageCount: number };

export default function WorkspacePage({
  module,
  records,
  loading,
  pageInfo,
  fieldOptions,
  onSave,
  onDelete,
  onToggle,
  onAction,
  onQueryChange,
}: {
  module: ModuleKey;
  records: AppRecord[];
  loading: boolean;
  pageInfo: PageInfo;
  fieldOptions?: Partial<Record<string, FieldOption[]>>;
  onSave: (value: RecordData, record?: AppRecord) => Promise<void>;
  onDelete: (record: AppRecord) => Promise<void>;
  onToggle: (record: AppRecord) => Promise<void>;
  onAction: (record: AppRecord, operation: string) => Promise<void>;
  onQueryChange: (module: ModuleKey, query: Query) => void;
}) {
  const config = moduleConfig[module];
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All status');
  const [typeFilter, setTypeFilter] = useState('All product types');
  const [dialog, setDialog] = useState<'create' | 'edit' | 'detail' | null>(null);
  const [selected, setSelected] = useState<AppRecord | null>(null);
  const [values, setValues] = useState<RecordData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [reloadVersion, setReloadVersion] = useState(0);
  const statuses = statusChoices[module] ?? [];
  const productTypes = productTypeChoices;
  const filtered = records.filter((record) => {
    const matchesText = Object.values(record).some((value) => String(value).toLowerCase().includes(query.toLowerCase()));
    return matchesText &&
      (filter === 'All status' || record.status === filter) &&
      (module !== 'products' || typeFilter === 'All product types' || record.type === typeFilter);
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onQueryChange(module, {
        page,
        pageSize: 100,
        ...(query.trim() ? { q: query.trim() } : {}),
        ...(filter !== 'All status' ? { status: filter } : {}),
        ...(module === 'products' && typeFilter !== 'All product types' ? { type: typeFilter } : {}),
      });
    }, query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [module, page, query, filter, typeFilter, reloadVersion, onQueryChange]);

  const beginCreate = () => {
    const initial: RecordData = {};
    for (const field of config.fields) {
      if (field.type === 'select') initial[field.key] = (fieldOptions?.[field.key] ?? field.options)?.[0]?.value ?? '';
      else if (field.type === 'number') initial[field.key] = field.min ?? 0;
      else initial[field.key] = '';
    }
    if (module === 'products' || module === 'plans' || module === 'customers' || module === 'discounts') initial.status = 'Active';
    if (module === 'quotations') initial.status = 'Draft';
    if (module === 'subscriptions') initial.status = 'Draft';
    if (module === 'invoices') initial.status = 'Draft';
    if (module === 'payments') initial.status = 'Pending';
    setValues(initial);
    setErrors({});
    setFormError('');
    setSelected(null);
    setDialog('create');
  };

  const beginEdit = (record: AppRecord) => {
    setSelected(record);
    const editable: RecordData = { ...record };
    for (const key of ['startDate', 'expiryDate', 'nextBilling', 'created', 'validUntil', 'issueDate', 'dueDate', 'starts', 'ends', 'date', 'availableFrom', 'availableUntil']) {
      if (typeof editable[key] === 'string') editable[key] = String(editable[key]).slice(0, 10);
    }
    if (module === 'plans') editable.product = String(record.productId ?? '');
    if (module === 'quotations') {
      editable.customer = String(record.customerId ?? '');
      const item = (record.items as unknown as Array<Record<string, unknown>> | undefined)?.[0];
      if (item) {
        editable.product = item.planId ? `plan:${item.planId}` : `product:${item.productId}`;
        editable.quantity = Number(item.quantity ?? 1);
        editable.unitPrice = Number(item.unitPrice ?? 0);
        editable.tax = Number(item.taxRate ?? 0);
      }
      delete editable.items;
    }
    if (module === 'invoices') delete editable.items;
    if (module === 'subscriptions') {
      editable.name = String(record.customerId ?? '');
      editable.plan = String(record.planId ?? '');
    }
    if (module === 'invoices') editable.name = String(record.customerId ?? '');
    if (module === 'payments') {
      editable.name = String(record.customerId ?? '');
      editable.invoice = String(record.invoiceId ?? '');
    }
    if (module === 'discounts') {
      const products = record.products as unknown as Array<Record<string, unknown>> | undefined;
      const plans = record.plans as unknown as Array<Record<string, unknown>> | undefined;
      if (products?.[0]) editable.appliesTo = `product:${products[0].id}`;
      else if (plans?.[0]) editable.appliesTo = `plan:${plans[0].id}`;
    }
    setValues(editable);
    setErrors({});
    setFormError('');
    setDialog('edit');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validate(values, config.fields, module);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    setSaving(true);
    setFormError('');
    try {
      await onSave(values, selected ?? undefined);
      setPage(1);
      setReloadVersion((version) => version + 1);
      setDialog(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save this record.');
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csv = [
      config.columns.map((column) => escape(column.label)).join(','),
      ...filtered.map((record) => config.columns.map(({ key }) => escape(record[key])).join(',')),
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${module}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadInvoice = async (record: AppRecord) => {
    try {
      const blob = await fetchInvoicePdf(String(record.dbId ?? record.id));
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${record.id}.pdf`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to download invoice PDF.');
    }
  };
  const runAction = async (record: AppRecord, operation: string) => {
    setFormError('');
    try {
      await onAction(record, operation);
      setPage(1);
      setReloadVersion((version) => version + 1);
      setDialog(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to complete this action.');
    }
  };
  const runDelete = async (record: AppRecord) => {
    setPage(1);
    await onDelete(record);
    setReloadVersion((version) => version + 1);
  };
  const runToggle = async (record: AppRecord) => {
    setPage(1);
    await onToggle(record);
    setReloadVersion((version) => version + 1);
  };

  const openDetail = (record: AppRecord) => {
    setSelected(record);
    setFormError('');
    setDialog('detail');
  };

  const columns = config.columns;
  const quoteTotal = Number(values.unitPrice ?? 0) * Number(values.quantity ?? 0) * (1 + Number(values.tax ?? 0) / 100);

  return (
    <div className="page-stack">
      <PageHeading eyebrow="MANAGE YOUR BUSINESS" title={config.title} description={config.description} action={<button type="button" className="button button-primary" onClick={beginCreate}><Plus size={17} /> Add {config.singular}</button>} />
      <section className="panel records-panel">
        <div className="records-toolbar">
          <div className="records-heading"><div><h2>All {config.title.toLowerCase()}</h2><span className="record-count">{records.length} records</span></div></div>
          <div className="records-controls">
            <label className="table-search"><Search size={16} /><input placeholder={`Search ${config.title.toLowerCase()}...`} value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} /></label>
            {module === 'products' && <select className="select-compact" aria-label="Filter by product type" value={typeFilter} onChange={(event) => { setPage(1); setTypeFilter(event.target.value); }}><option>All product types</option>{productTypes.map((type) => <option key={type}>{type}</option>)}</select>}
            <select className="select-compact" aria-label="Filter by status" value={filter} onChange={(event) => { setPage(1); setFilter(event.target.value); }}>
              <option>All status</option>{statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
            <button type="button" className="button button-secondary export-button" onClick={exportCsv}><Download size={15} /> Export</button>
          </div>
        </div>
        {loading && <div className="table-loading" role="status">Loading records…</div>}
        {formError && !dialog && <div className="app-error" role="alert">{formError}</div>}
        {filtered.length === 0 ? <EmptyState title="No records found" description="Try a different search or add your first record." /> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}<th className="actions-heading">Actions</th></tr></thead>
              <tbody>{filtered.map((record) => (
                <tr key={record.id}>
                  {columns.map((column, index) => {
                    const value = record[column.key];
                    return <td key={column.key} className={index === 0 ? 'primary-cell' : ''}>
                      {column.key === 'status' ? <StatusBadge status={String(value)} /> :
                        column.key === 'name' && module === 'customers' ? <div className="customer-cell"><span className="table-avatar">{String(value).split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><span><strong>{String(value)}</strong><small>{String(record.email ?? record.company ?? '')}</small></span></div> :
                          <span>{displayValue(column.key, value)}</span>}
                    </td>;
                  })}
                  <td><div className="row-actions">
                    <button type="button" title={`View ${config.singular}`} aria-label={`View ${config.singular}`} onClick={() => openDetail(record)}><Eye size={16} /></button>
                    <button type="button" title={`Edit ${config.singular}`} aria-label={`Edit ${config.singular}`} onClick={() => beginEdit(record)}><Pencil size={15} /></button>
                    {module === 'plans' && <button type="button" title={record.status === 'Active' ? 'Deactivate plan' : 'Activate plan'} aria-label="Toggle plan status" onClick={() => void runToggle(record)}><span className={`toggle ${record.status === 'Active' ? 'toggle-on' : ''}`} /></button>}
                    <button type="button" title={`Delete ${config.singular}`} aria-label={`Delete ${config.singular}`} className="delete-action" onClick={() => void runDelete(record)}><Trash2 size={15} /></button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <div className="table-footer"><span>Showing <strong>{pageInfo.total ? (pageInfo.page - 1) * pageInfo.pageSize + 1 : 0}–{Math.min(pageInfo.page * pageInfo.pageSize, pageInfo.total)}</strong> of <strong>{pageInfo.total}</strong> results</span><div className="pagination"><button type="button" disabled={pageInfo.page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><button type="button" className="pagination-current">{pageInfo.page}</button><button type="button" disabled={pageInfo.page >= pageInfo.pageCount || loading} onClick={() => setPage((value) => Math.min(pageInfo.pageCount, value + 1))}>Next</button></div></div>
      </section>

      {dialog && dialog !== 'detail' && (
        <Modal title={`${dialog === 'edit' ? 'Edit' : 'Add'} ${config.singular}`} description={`Enter the details for this ${config.singular}.`} onClose={() => setDialog(null)} size={module === 'plans' || module === 'discounts' ? 'wide' : 'normal'}>
          <form className="record-form" onSubmit={handleSubmit} noValidate>
            <div className="form-grid">
              {config.fields.map((field) => (
                <label key={field.key} className={`form-field ${field.type === 'textarea' ? 'field-full' : ''}`}>
                  <span>{field.label}{field.required && <i> *</i>}</span>
                  {field.type === 'select' ? <select required={field.required} value={String(values[field.key] ?? '')} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}>
                    <option value="">Select {field.label.toLowerCase()}</option>{(fieldOptions?.[field.key] ?? field.options)?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select> : field.type === 'textarea' ? <textarea rows={3} placeholder={field.placeholder} value={String(values[field.key] ?? '')} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} /> :
                    <input type={field.type ?? 'text'} min={field.type === 'number' ? field.min ?? 0 : undefined} step={field.type === 'number' ? 'any' : undefined} placeholder={field.placeholder} value={String(values[field.key] ?? '')} onChange={(event) => setValues((current) => ({ ...current, [field.key]: field.type === 'number' ? event.target.value : event.target.value }))} />}
                  {errors[field.key] && <small className="field-error">{errors[field.key]}</small>}
                </label>
              ))}
            </div>
            {module === 'quotations' && <div className="quote-total"><span>Estimated total including tax</span><strong>${quoteTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>}
            {formError && <div className="settings-error" role="alert">{formError}</div>}
            <div className="form-actions"><button type="button" className="button button-secondary" onClick={() => setDialog(null)} disabled={saving}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Saving…' : dialog === 'edit' ? 'Save changes' : `Create ${config.singular}`}</button></div>
          </form>
        </Modal>
      )}

      {dialog === 'detail' && selected && (
        <Modal title={selected.id} description={`${config.singular[0].toUpperCase()}${config.singular.slice(1)} details`} onClose={() => setDialog(null)} size="wide">
          {formError && <div className="settings-error" role="alert">{formError}</div>}
          <div className="detail-grid">
            {config.columns.map((column) => <div className="detail-item" key={column.key}><span>{column.label}</span><strong>{column.key === 'status' ? <StatusBadge status={String(selected[column.key])} /> : displayValue(column.key, selected[column.key])}</strong></div>)}
            {Object.entries(selected).filter(([key]) => !config.columns.some((column) => column.key === key) && key !== 'id').map(([key, value]) => <div className="detail-item" key={key}><span>{key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`).replace(/^./, (letter) => letter.toUpperCase())}</span><strong>{displayValue(key, value)}</strong></div>)}
          </div>
          {module === 'invoices' && <div className="invoice-preview-note"><Printer size={16} /> Download a print-ready PDF generated from the saved invoice.</div>}
          <div className="form-actions">
            {module === 'invoices' && <><button type="button" className="button button-secondary" onClick={() => window.print()}><Printer size={16} /> Print invoice</button><button type="button" className="button button-secondary" onClick={() => void downloadInvoice(selected)}><Download size={15} /> Download PDF</button>{selected.status === 'Draft' && <button type="button" className="button button-primary" onClick={() => void runAction(selected, 'issue')}>Issue invoice</button>}{selected.status !== 'Paid' && selected.status !== 'Draft' && <button type="button" className="button button-primary" onClick={() => void runAction(selected, 'mark-paid')}>Mark paid</button>}</>}
            {module === 'quotations' && selected.status !== 'Confirmed' && <button type="button" className="button button-primary" onClick={() => void runAction(selected, 'confirm')}>Confirm quotation</button>}
            {module === 'quotations' && selected.status === 'Confirmed' && <button type="button" className="button button-primary" onClick={() => void runAction(selected, 'convert-to-subscription')}>Convert to subscription</button>}
            {module === 'subscriptions' && selected.status === 'Active' && <button type="button" className="button button-secondary" onClick={() => void runAction(selected, 'pause')}>Pause</button>}
            {module === 'subscriptions' && selected.status === 'Paused' && <button type="button" className="button button-secondary" onClick={() => void runAction(selected, 'resume')}>Resume</button>}
            {module === 'subscriptions' && selected.status !== 'Closed' && selected.status !== 'Cancelled' && <button type="button" className="button button-secondary" onClick={() => void runAction(selected, 'cancel')}>Cancel subscription</button>}
            <button type="button" className="button button-secondary" onClick={() => setDialog(null)}>Close</button>
            <button type="button" className="button button-primary" onClick={() => beginEdit(selected)}>Edit details</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
