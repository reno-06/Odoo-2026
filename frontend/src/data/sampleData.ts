import type { AppRecord, ModuleKey } from '../types';

export const initialRecords: Record<ModuleKey, AppRecord[]> = {
  products: [
    { id: 'PRD-1042', name: 'Cloud workspace', type: 'Digital service', price: 24, cost: 8, variants: 'Starter, Business, Enterprise', status: 'Active' },
    { id: 'PRD-1041', name: 'Priority support', type: 'Service', price: 12, cost: 4, variants: 'Standard, Premium', status: 'Active' },
    { id: 'PRD-1040', name: 'Analytics add-on', type: 'Digital service', price: 8, cost: 2, variants: 'Monthly', status: 'Active' },
    { id: 'PRD-1039', name: 'Onboarding session', type: 'Service', price: 99, cost: 35, variants: 'One-time', status: 'Archived' },
  ],
  plans: [
    { id: 'PLN-2048', name: 'Growth annual', product: 'Cloud workspace', interval: 'Yearly', price: 240, quantity: 1, renewals: 'Allowed', status: 'Active' },
    { id: 'PLN-2047', name: 'Starter monthly', product: 'Cloud workspace', interval: 'Monthly', price: 24, quantity: 1, renewals: 'Allowed', status: 'Active' },
    { id: 'PLN-2046', name: 'Support monthly', product: 'Priority support', interval: 'Monthly', price: 12, quantity: 1, renewals: 'Allowed', status: 'Active' },
    { id: 'PLN-2045', name: 'Analytics quarterly', product: 'Analytics add-on', interval: 'Monthly', price: 8, quantity: 1, renewals: 'Not allowed', status: 'Inactive' },
  ],
  customers: [
    { id: 'CUS-3018', name: 'Olivia Rhye', email: 'olivia@acme.io', company: 'Acme Studio', phone: '+1 (415) 555-0132', location: 'San Francisco, US', status: 'Active' },
    { id: 'CUS-3017', name: 'Phoenix Baker', email: 'phoenix@circl.es', company: 'Circle Labs', phone: '+1 (212) 555-0184', location: 'New York, US', status: 'Active' },
    { id: 'CUS-3016', name: 'Lana Steiner', email: 'lana@catalog.app', company: 'Catalog', phone: '+44 20 7946 0821', location: 'London, UK', status: 'Active' },
    { id: 'CUS-3015', name: 'Demi Wilkinson', email: 'demi@layers.design', company: 'Layers', phone: '+61 2 5550 0188', location: 'Sydney, AU', status: 'Inactive' },
  ],
  quotations: [
    { id: 'QUO-0084', name: 'Acme Studio', customer: 'Olivia Rhye', created: 'Oct 28, 2026', validUntil: 'Nov 27, 2026', total: 576, status: 'Quotation' },
    { id: 'QUO-0083', name: 'Circle Labs', customer: 'Phoenix Baker', created: 'Oct 26, 2026', validUntil: 'Nov 25, 2026', total: 288, status: 'Confirmed' },
    { id: 'QUO-0082', name: 'Layers', customer: 'Demi Wilkinson', created: 'Oct 24, 2026', validUntil: 'Nov 23, 2026', total: 144, status: 'Draft' },
  ],
  subscriptions: [
    { id: 'SUB-4820', name: 'Olivia Rhye', customer: 'Acme Studio', plan: 'Growth annual', startDate: 'Oct 01, 2026', expiryDate: 'Sep 30, 2027', interval: 'Yearly', total: 240, nextBilling: 'Oct 01, 2027', status: 'Active' },
    { id: 'SUB-4819', name: 'Phoenix Baker', customer: 'Circle Labs', plan: 'Starter monthly', startDate: 'Sep 14, 2026', expiryDate: 'Sep 13, 2027', interval: 'Monthly', total: 24, nextBilling: 'Nov 14, 2026', status: 'Active' },
    { id: 'SUB-4818', name: 'Lana Steiner', customer: 'Catalog', plan: 'Support monthly', startDate: 'Aug 29, 2026', expiryDate: 'Aug 28, 2027', interval: 'Monthly', total: 12, nextBilling: 'Nov 10, 2026', status: 'Paused' },
    { id: 'SUB-4817', name: 'Demi Wilkinson', customer: 'Layers', plan: 'Growth annual', startDate: 'May 02, 2026', expiryDate: 'May 01, 2027', interval: 'Yearly', total: 240, nextBilling: 'Nov 03, 2026', status: 'Active' },
    { id: 'SUB-4816', name: 'Candice Wu', customer: 'Sisyphus', plan: 'Starter monthly', startDate: 'Jul 18, 2026', expiryDate: 'Jul 17, 2027', interval: 'Monthly', total: 24, nextBilling: 'Nov 18, 2026', status: 'Confirmed' },
  ],
  invoices: [
    { id: 'INV-2026-084', name: 'Olivia Rhye', customer: 'Acme Studio', issueDate: 'Oct 28, 2026', dueDate: 'Nov 11, 2026', total: 240, status: 'Paid' },
    { id: 'INV-2026-083', name: 'Phoenix Baker', customer: 'Circle Labs', issueDate: 'Oct 26, 2026', dueDate: 'Nov 09, 2026', total: 24, status: 'Confirmed' },
    { id: 'INV-2026-082', name: 'Lana Steiner', customer: 'Catalog', issueDate: 'Oct 20, 2026', dueDate: 'Nov 03, 2026', total: 12, status: 'Overdue' },
    { id: 'INV-2026-081', name: 'Demi Wilkinson', customer: 'Layers', issueDate: 'Oct 18, 2026', dueDate: 'Nov 01, 2026', total: 240, status: 'Draft' },
  ],
  discounts: [
    { id: 'DSC-0018', name: 'Annual appreciation', type: 'Percentage', value: 15, appliesTo: 'Growth annual', usage: '42 / 100', ends: 'Dec 31, 2026', status: 'Active' },
    { id: 'DSC-0017', name: 'Welcome credit', type: 'Fixed amount', value: 20, appliesTo: 'All products', usage: '18 / 50', ends: 'Nov 30, 2026', status: 'Active' },
    { id: 'DSC-0016', name: 'Launch offer', type: 'Percentage', value: 10, appliesTo: 'Cloud workspace', usage: '100 / 100', ends: 'Oct 15, 2026', status: 'Expired' },
  ],
  payments: [
    { id: 'PAY-9018', name: 'Olivia Rhye', customer: 'Acme Studio', invoice: 'INV-2026-084', amount: 240, method: 'Card', date: 'Oct 28, 2026', status: 'Completed' },
    { id: 'PAY-9017', name: 'Phoenix Baker', customer: 'Circle Labs', invoice: 'INV-2026-079', amount: 24, method: 'Bank transfer', date: 'Oct 26, 2026', status: 'Completed' },
    { id: 'PAY-9016', name: 'Lana Steiner', customer: 'Catalog', invoice: 'INV-2026-076', amount: 12, method: 'UPI', date: 'Oct 24, 2026', status: 'Completed' },
    { id: 'PAY-9015', name: 'Demi Wilkinson', customer: 'Layers', invoice: 'INV-2026-074', amount: 240, method: 'Card', date: 'Oct 20, 2026', status: 'Pending' },
  ],
};

export const revenueByMonth = [
  { month: 'May', revenue: 28400, subscriptions: 312 },
  { month: 'Jun', revenue: 31800, subscriptions: 348 },
  { month: 'Jul', revenue: 30200, subscriptions: 371 },
  { month: 'Aug', revenue: 38600, subscriptions: 408 },
  { month: 'Sep', revenue: 36200, subscriptions: 446 },
  { month: 'Oct', revenue: 42850, subscriptions: 482 },
];

export const paymentBreakdown = [
  { name: 'Paid', value: 68, color: '#18a874' },
  { name: 'Pending', value: 21, color: '#f0a321' },
  { name: 'Overdue', value: 11, color: '#ee5d5d' },
];

export const planDistribution = [
  { name: 'Growth annual', value: 44, color: '#5b35b5' },
  { name: 'Starter monthly', value: 32, color: '#7960d2' },
  { name: 'Support monthly', value: 16, color: '#a292e2' },
  { name: 'Other', value: 8, color: '#d1c8f2' },
];
