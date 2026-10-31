import { useState, type FormEvent } from 'react';
import { Building2, Check, SlidersHorizontal, UserRound, WalletCards } from 'lucide-react';
import { PageHeading } from '../components/ui';

const sections = [
  { id: 'company', label: 'Company profile', icon: Building2 },
  { id: 'tax', label: 'Tax configuration', icon: WalletCards },
  { id: 'profile', label: 'User profile', icon: UserRound },
  { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
];

export default function SettingsPage() {
  const [active, setActive] = useState('company');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Record<string, string>>({
    companyName: 'Brightloop Studio',
    email: 'billing@brightloop.io',
    phone: '+1 (415) 555-0100',
    address: '548 Market Street, San Francisco, CA 94104',
    taxName: 'Sales tax',
    taxRate: '8.25',
    taxId: '',
    fullName: 'Olivia Rhye',
    profileEmail: 'olivia@brightloop.io',
    timezone: 'America/Los_Angeles',
    currency: 'USD — US Dollar',
    dateFormat: 'Oct 31, 2026',
    emailNotifications: 'Enabled',
  });
  const update = (key: string, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setError('');
  };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (active === 'company' && (!form.companyName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))) {
      setError(!form.companyName.trim() ? 'Company name is required.' : 'Enter a valid company email.');
      return;
    }
    if (active === 'tax' && (!form.taxName.trim() || !Number.isFinite(Number(form.taxRate)) || Number(form.taxRate) < 0 || Number(form.taxRate) > 100)) {
      setError('Enter a tax name and a rate between 0 and 100%.');
      return;
    }
    if (active === 'profile' && (!form.fullName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.profileEmail))) {
      setError(!form.fullName.trim() ? 'Full name is required.' : 'Enter a valid profile email.');
      return;
    }
    if (form.newPassword && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$/.test(form.newPassword)) {
      setError('Password must be over 8 characters and include uppercase, lowercase, and a special character.');
      return;
    }
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setError('The password confirmation does not match.');
      return;
    }
    setError('');
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3500);
  };
  const field = (label: string, key: string, type = 'text', hint?: string) => (
    <label className="form-field" key={key}><span>{label}</span><input type={type} value={form[key] ?? ''} onChange={(event) => update(key, event.target.value)} />{hint && <small className="field-hint">{hint}</small>}</label>
  );
  const select = (label: string, key: string, options: string[]) => <label className="form-field" key={key}><span>{label}</span><select value={form[key] ?? options[0]} onChange={(event) => update(key, event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
  const title = sections.find((section) => section.id === active)?.label ?? 'Settings';

  return (
    <div className="page-stack">
      <PageHeading eyebrow="WORKSPACE" title="Settings" description="Manage your workspace details and preferences." />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">{sections.map(({ id, label, icon: Icon }) => <button type="button" className={active === id ? 'settings-nav-active' : ''} key={id} onClick={() => { setActive(id); setSaved(false); setError(''); }}><Icon size={17} />{label}</button>)}</nav>
        <section className="panel settings-panel">
          <form onSubmit={save} noValidate>
            <div className="settings-panel-heading"><div><h2>{title}</h2><p>{active === 'company' ? 'This information appears on your invoices and customer communications.' : active === 'tax' ? 'Configure the tax details used when preparing quotations.' : active === 'profile' ? 'Update your personal details and account password.' : 'Set defaults for dates, currency, and notifications.'}</p></div></div>
            {active === 'company' && <div className="settings-form-grid">{field('Company name', 'companyName')}{field('Billing email', 'email', 'email')}{field('Phone number', 'phone', 'tel')}<div className="form-field field-full"><span>Business address</span><textarea rows={3} value={form.address} onChange={(event) => update('address', event.target.value)} /></div></div>}
            {active === 'tax' && <div className="settings-form-grid">{field('Tax name', 'taxName')}{field('Tax rate (%)', 'taxRate', 'number', 'Enter a percentage from 0 to 100.')}{field('Tax identification number', 'taxId')}<div className="tax-note field-full"><WalletCards size={17} /><span>Tax is included in quotation totals when configured. No payment is processed by this prototype.</span></div></div>}
            {active === 'profile' && <div className="settings-form-grid">{field('Full name', 'fullName')}{field('Email address', 'profileEmail', 'email')}{field('New password', 'newPassword', 'password', 'More than 8 characters, uppercase, lowercase, and a special character.')}{field('Confirm new password', 'confirmPassword', 'password')}</div>}
            {active === 'preferences' && <div className="settings-form-grid">{select('Default currency', 'currency', ['USD — US Dollar', 'EUR — Euro', 'GBP — British Pound', 'INR — Indian Rupee'])}{select('Timezone', 'timezone', ['America/Los_Angeles', 'America/New_York', 'Europe/London', 'Asia/Kolkata'])}{select('Date format', 'dateFormat', ['Oct 31, 2026', '31/10/2026', '2026-10-31'])}{select('Email notifications', 'emailNotifications', ['Enabled', 'Disabled'])}</div>}
            {error && <div className="settings-error" role="alert">{error}</div>}
            <div className="settings-footer">{saved && <span className="save-confirmation"><Check size={16} /> Changes saved locally</span>}<button type="submit" className="button button-primary">Save changes</button></div>
          </form>
        </section>
      </div>
    </div>
  );
}
