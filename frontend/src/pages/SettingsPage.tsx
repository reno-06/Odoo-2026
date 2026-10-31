import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Check, SlidersHorizontal, UserRound, WalletCards } from 'lucide-react';
import { PageHeading } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import {
  changePassword,
  getApiError,
  getPreferences,
  getProfile,
  getSettings,
  savePreferences,
  saveProfile,
  saveSettings,
} from '../services/api';

const sections = [
  { id: 'company', label: 'Company profile', icon: Building2 },
  { id: 'tax', label: 'Tax configuration', icon: WalletCards },
  { id: 'profile', label: 'User profile', icon: UserRound },
  { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
];
const currencyNames: Record<string, string> = {
  USD: 'USD — US Dollar',
  EUR: 'EUR — Euro',
  GBP: 'GBP — British Pound',
  INR: 'INR — Indian Rupee',
};
const dateFormats: Record<string, string> = {
  'MMM d, yyyy': 'Oct 31, 2026',
  'dd/MM/yyyy': '31/10/2026',
  'yyyy-MM-dd': '2026-10-31',
};

export default function SettingsPage() {
  const { refreshSession, signOut } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState('company');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    let activeRequest = true;
    setLoading(true);
    setError('');
    const request = active === 'company'
      ? getSettings('company').then((data) => ({
          companyName: String(data.companyName ?? data.name ?? ''),
          email: String(data.billingEmail ?? ''),
          phone: String(data.phone ?? ''),
          address: String(data.address ?? ''),
        }))
      : active === 'tax'
        ? getSettings('tax').then((data) => ({
            taxName: String(data.taxName ?? 'Sales tax'),
            taxRate: String(data.taxRate ?? '0'),
            taxId: String(data.taxId ?? ''),
          }))
        : active === 'profile'
          ? getProfile().then((data) => ({
              fullName: String(data.fullName ?? ''),
              profileEmail: String(data.email ?? ''),
              currentPassword: '',
              newPassword: '',
              confirmPassword: '',
            }))
          : getPreferences().then((data) => ({
              currency: currencyNames[String(data.currency ?? 'USD')] ?? 'USD — US Dollar',
              timezone: String(data.timezone ?? 'UTC'),
              dateFormat: dateFormats[String(data.dateFormat ?? 'yyyy-MM-dd')] ?? '2026-10-31',
              emailNotifications: data.emailNotifications === false ? 'Disabled' : 'Enabled',
            }));
    void request.then((values) => {
      if (activeRequest) setForm((current) => ({ ...current, ...values }));
    }).catch((requestError: unknown) => {
      if (activeRequest) setError(getApiError(requestError));
    }).finally(() => {
      if (activeRequest) setLoading(false);
    });
    return () => { activeRequest = false; };
  }, [active]);

  const update = (key: string, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setError('');
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (active === 'company' && (!form.companyName?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email ?? ''))) {
      setError(!form.companyName?.trim() ? 'Company name is required.' : 'Enter a valid company email.');
      return;
    }
    if (active === 'tax' && (!form.taxName?.trim() || !Number.isFinite(Number(form.taxRate)) || Number(form.taxRate) < 0 || Number(form.taxRate) > 100)) {
      setError('Enter a tax name and a rate between 0 and 100%.');
      return;
    }
    if (active === 'profile' && (!form.fullName?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.profileEmail ?? ''))) {
      setError(!form.fullName?.trim() ? 'Full name is required.' : 'Enter a valid profile email.');
      return;
    }
    if (form.newPassword && (!form.currentPassword || form.newPassword.length < 12)) {
      setError('Enter your current password and a new password of at least 12 characters.');
      return;
    }
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setError('The password confirmation does not match.');
      return;
    }

    setSaving(true);
    setError('');
    setSaved(false);
    try {
      if (active === 'company') {
        await saveSettings('company', {
          companyName: form.companyName,
          billingEmail: form.email,
          phone: form.phone,
          address: form.address,
        });
      } else if (active === 'tax') {
        await saveSettings('tax', {
          taxName: form.taxName,
          taxRate: Number(form.taxRate),
          taxId: form.taxId,
        });
      } else if (active === 'profile') {
        await saveProfile({ fullName: form.fullName, email: form.profileEmail });
        if (form.newPassword) {
          await changePassword(form.currentPassword, form.newPassword);
          await signOut();
          navigate('/login', { replace: true });
          return;
        }
        await refreshSession();
      } else {
        await savePreferences({
          currency: form.currency.split(' ')[0],
          timezone: form.timezone,
          dateFormat: Object.keys(dateFormats).find((key) => dateFormats[key] === form.dateFormat) ?? 'yyyy-MM-dd',
          emailNotifications: form.emailNotifications === 'Enabled',
        });
      }
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3500);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: string, type = 'text', hint?: string) => (
    <label className="form-field" key={key}>
      <span>{label}</span>
      <input type={type} value={form[key] ?? ''} onChange={(event) => update(key, event.target.value)} />
      {hint && <small className="field-hint">{hint}</small>}
    </label>
  );
  const select = (label: string, key: string, options: string[]) => (
    <label className="form-field" key={key}>
      <span>{label}</span>
      <select value={form[key] ?? options[0]} onChange={(event) => update(key, event.target.value)}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
  const title = sections.find((section) => section.id === active)?.label ?? 'Settings';

  return (
    <div className="page-stack">
      <PageHeading eyebrow="WORKSPACE" title="Settings" description="Manage your workspace details and preferences." />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">{sections.map(({ id, label, icon: Icon }) => <button type="button" className={active === id ? 'settings-nav-active' : ''} key={id} onClick={() => { setActive(id); setSaved(false); setError(''); }}><Icon size={17} />{label}</button>)}</nav>
        <section className="panel settings-panel">
          <form onSubmit={(event) => void save(event)} noValidate>
            <div className="settings-panel-heading"><div><h2>{title}</h2><p>{active === 'company' ? 'This information appears on your invoices and customer communications.' : active === 'tax' ? 'Configure the tax details used when preparing quotations.' : active === 'profile' ? 'Update your personal details and account password.' : 'Set defaults for dates, currency, and notifications.'}</p></div></div>
            {loading ? <div className="table-loading" role="status">Loading settings…</div> : <>
              {active === 'company' && <div className="settings-form-grid">{field('Company name', 'companyName')}{field('Billing email', 'email', 'email')}{field('Phone number', 'phone', 'tel')}<div className="form-field field-full"><span>Business address</span><textarea rows={3} value={form.address ?? ''} onChange={(event) => update('address', event.target.value)} /></div></div>}
              {active === 'tax' && <div className="settings-form-grid">{field('Tax name', 'taxName')}{field('Tax rate (%)', 'taxRate', 'number', 'Enter a percentage from 0 to 100.')}{field('Tax identification number', 'taxId')}<div className="tax-note field-full"><WalletCards size={17} /><span>Tax details are saved to this workspace and available when preparing quotations.</span></div></div>}
              {active === 'profile' && <div className="settings-form-grid">{field('Full name', 'fullName')}{field('Email address', 'profileEmail', 'email')}{field('Current password', 'currentPassword', 'password')}{field('New password', 'newPassword', 'password', 'At least 12 characters.')}{field('Confirm new password', 'confirmPassword', 'password')}</div>}
              {active === 'preferences' && <div className="settings-form-grid">{select('Default currency', 'currency', Object.values(currencyNames))}{select('Timezone', 'timezone', ['UTC', 'America/Los_Angeles', 'America/New_York', 'Europe/London', 'Asia/Kolkata'])}{select('Date format', 'dateFormat', Object.values(dateFormats))}{select('Email notifications', 'emailNotifications', ['Enabled', 'Disabled'])}</div>}
            </>}
            {error && <div className="settings-error" role="alert">{error}</div>}
            <div className="settings-footer">{saved && <span className="save-confirmation"><Check size={16} /> Changes saved</span>}<button type="submit" className="button button-primary" disabled={loading || saving}>{saving ? 'Saving…' : 'Save changes'}</button></div>
          </form>
        </section>
      </div>
    </div>
  );
}
