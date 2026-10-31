import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity, BadgePercent, Banknote, Bell, Boxes, ChevronDown, ChevronLeft, ChevronRight,
  FileText, LayoutDashboard, Menu, Package, Search, Settings, ShieldCheck, Users,
} from 'lucide-react';

const navigation = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Products', path: '/products', icon: Package },
  { label: 'Plans', path: '/plans', icon: Boxes },
  { label: 'Customers', path: '/customers', icon: Users },
  { label: 'Quotations', path: '/quotations', icon: FileText },
  { label: 'Subscriptions', path: '/subscriptions', icon: Activity },
  { label: 'Invoices', path: '/invoices', icon: FileText },
  { label: 'Discounts', path: '/discounts', icon: BadgePercent },
  { label: 'Payments', path: '/payments', icon: Banknote },
  { label: 'Reports', path: '/reports', icon: ShieldCheck },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const location = useLocation();
  const currentPage = navigation.find((item) => item.path === location.pathname)?.label ?? 'Dashboard';

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <NavLink to="/" className="brand" onClick={() => setMobileOpen(false)}>
          <span className="brand-mark">b</span>
          <span className="brand-name">brightloop<span>.</span></span>
        </NavLink>
        <div className="workspace-switcher">
          <div className="workspace-avatar">B</div>
          <div className="workspace-copy"><strong>Brightloop Studio</strong><span>Workspace</span></div>
          <ChevronDown size={15} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map(({ label, path, icon: Icon }) => (
            <NavLink
              to={path}
              key={path}
              end={path === '/'}
              title={collapsed ? label : undefined}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {label === 'Invoices' && <span className="nav-count">3</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><ShieldCheck size={17} /></div>
            <strong>Need a hand?</strong>
            <p>Our team is here to help you grow.</p>
            <button type="button" onClick={() => window.alert('Support resources are available in your Brightloop workspace.')}>Visit help center <span>↗</span></button>
          </div>
          <button type="button" className="collapse-button" onClick={() => setCollapsed((value) => !value)}>
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
            {!collapsed && <span>Collapse menu</span>}
          </button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button type="button" className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{currentPage}</strong></div>
          <div className="topbar-actions">
            <label className="global-search">
              <Search size={16} />
              <input aria-label="Search workspace" placeholder="Search anything..." value={search} onChange={(event) => setSearch(event.target.value)} />
              <kbd>⌘ K</kbd>
            </label>
            <button type="button" className="icon-button notification-button" aria-label="Notifications" onClick={() => window.alert('You’re all caught up.')}>
              <Bell size={18} /><i />
            </button>
            <div className="profile-wrap">
              <button type="button" className="profile-button" onClick={() => setProfileOpen((value) => !value)} aria-expanded={profileOpen}>
                <span className="avatar">OR</span><span className="profile-copy"><strong>Olivia Rhye</strong><small>Admin</small></span><ChevronDown size={15} />
              </button>
              {profileOpen && (
                <div className="profile-menu">
                  <div className="profile-menu-info"><strong>Olivia Rhye</strong><span>olivia@brightloop.io</span></div>
                  <NavLink to="/settings" onClick={() => setProfileOpen(false)}>Profile settings</NavLink>
                  <button type="button" onClick={() => { setProfileOpen(false); window.alert('This prototype does not have a signed-in account.'); }}>Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="main-content"><Outlet /></main>
        <footer className="app-footer"><span>© 2026 Brightloop</span><span>Subscription management, made simple.</span><span>All systems operational <i /></span></footer>
      </div>
    </div>
  );
}
