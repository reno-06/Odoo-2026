export type ModuleKey =
  | 'products'
  | 'plans'
  | 'customers'
  | 'quotations'
  | 'subscriptions'
  | 'invoices'
  | 'discounts'
  | 'payments';

export type RecordData = Record<string, string | number | boolean>;

export type AppRecord = RecordData & {
  id: string;
  name: string;
  status: string;
};

export type FieldOption = {
  label: string;
  value: string;
};

export type FormField = {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'date' | 'select' | 'textarea';
  required?: boolean;
  options?: FieldOption[];
  placeholder?: string;
  min?: number;
};
