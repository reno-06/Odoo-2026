import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, BadgePercent, Banknote, Bell, Boxes, ChevronDown, ChevronLeft, ChevronRight,
  FileText, LayoutDashboard, Menu, Package, Search, Settings, ShieldCheck, Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  checkHealth,
  getApiError,
  getNotifications,
  getSearchResults,
  markAllNotificationsRead,
  markNotificationRead,
  type Workspace,
} from '../services/api';
import type { ModuleKey } from '../types';

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
const searchable: Array<{ key: ModuleKey; path: string; label: string }> = [
  { key: 'products', path: '/products', label: 'Product' },
  { key: 'plans', path: '/plans', label: 'Plan' },
  { key: 'customers', path: '/customers', label: 'Customer' },
  { key: 'quotations', path: '/quotations', label: 'Quotation' },
  { key: 'subscriptions', path: '/subscriptions', label: 'Subscription' },
  { key: 'invoices', path: '/invoices', label: 'Invoice' },
  { key: 'discounts', path: '/discounts', label: 'Discount' },
  { key: 'payments', path: '/payments', label: 'Payment' },
];
type SearchItem = { key: string; path: string; label: string; detail: string };
type NotificationItem = Record<string, unknown> & { id: string; title?: string; body?: string; readAt?: string | null };

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
}

function getSearchItems(data: Record<string, unknown>): SearchItem[] {
  return searchable.flatMap(({ key, path, label }) => {
    const rows = data[key];
    if (!Array.isArray(rows)) return [];
    return rows.map((row, index) => {
      const item = row as Record<string, unknown>;
      const customer = item.customer as Record<string, unknown> | undefined;
      const plan = item.plan as Record<string, unknown> | undefined;
      const name = String(item.name ?? customer?.name ?? plan?.name ?? item.invoiceNumber ?? item.quoteNumber ?? item.subscriptionNumber ?? item.paymentNumber ?? item.productNumber ?? item.planNumber ?? item.discountNumber ?? item.id);
      const code = String(item.productNumber ?? item.planNumber ?? item.customerNumber ?? item.quoteNumber ?? item.invoiceNumber ?? item.subscriptionNumber ?? item.paymentNumber ?? item.discountNumber ?? '');
      return {
        key: `${key}-${String(item.id ?? index)}`,
        path,
        label: name,
        detail: [label, code, item.status].filter(Boolean).join(' · '),
      };
    });
  });
}

export default function AppShell() {
  const { session, workspaces, workspaceId, chooseWorkspace, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchItems, setSearchItems] = useState<SearchItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchError, setSearchError] = useState('');
  const [actionError, setActionError] = useState('');
  const [health, setHealth] = useState<'online' | 'offline' | 'checking'>('checking');
  const [signingOut, setSigningOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const currentPage = navigation.find((item) => item.path === location.pathname)?.label ?? 'Dashboard';
  const activeWorkspace = workspaces.find((workspace) => workspace.id === workspaceId);
  const member = session?.memberships.find((membership) => membership.workspace.id === workspaceId);
  const searchResults = useMemo(() => searchItems, [searchItems]);

  useEffect(() => {
    let active = true;
    void checkHealth().then(() => {
      if (active) setHealth('online');
    }).catch(() => {
      if (active) setHealth('offline');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!search.trim()) {
      setSearchItems([]);
      setSearchError('');
      return () => { active = false; };
    }
    const timer = window.setTimeout(() => {
      void getSearchResults(search.trim()).then((data) => {
        if (active) {
          setSearchItems(getSearchItems(data));
          setSearchError('');
        }
      }).catch((error: unknown) => {
        if (active) setSearchError(getApiError(error));
      });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search, workspaceId]);

  const loadNotifications = async () => {
    const result = await getNotifications();
    const meta = result.meta as Record<string, unknown>;
    setNotifications(result.data as NotificationItem[]);
    setUnreadCount(Number(meta.unreadCount ?? 0));
  };
  useEffect(() => {
    void loadNotifications().catch((error: unknown) => setActionError(getApiError(error)));
  }, [workspaceId]);

  const selectWorkspace = async (id: string) => {
    setActionError('');
    try {
      await chooseWorkspace(id);
      setNotificationsOpen(false);
    } catch (error) {
      setActionError(getApiError(error));
    }
  };

  const openNotification = async (notification: NotificationItem) => {
    if (!notification.readAt) {
      try {
        await markNotificationRead(notification.id);
        await loadNotifications();
      } catch (error) {
        setActionError(getApiError(error));
      }
    }
    setNotificationsOpen(false);
    const type = String(notification.entityType ?? '').toLowerCase();
    const destination = searchable.find(({ key }) =>
      key === type || key.slice(0, -1) === type,
    );
    if (destination) navigate(destination.path);
  };

  const readAllNotifications = async () => {
    try {
      await markAllNotificationsRead();
      await loadNotifications();
    } catch (error) {
      setActionError(getApiError(error));
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      setActionError(getApiError(error));
      navigate('/login', { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  const profileName = session?.fullName ?? '';
  const profileEmail = session?.email ?? '';
  const role = member?.role ?? 'Member';
  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && searchResults[0]) {
      navigate(searchResults[0].path);
      setSearch('');
    }
    if (event.key === 'Escape') setSearch('');
  };

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <NavLink to="/" className="brand" onClick={() => setMobileOpen(false)}>
          <span className="brand-mark">b</span><span className="brand-name">brightloop<span>.</span></span>
        </NavLink>
        <div className="workspace-switcher">
          <div className="workspace-avatar">{initials(activeWorkspace?.name ?? 'Workspace')}</div>
          <div className="workspace-copy">
            <strong>{activeWorkspace?.name ?? 'Workspace'}</strong>
            <span>{role}</span>
          </div>
          {workspaces.length > 1 ? <ChevronDown size={15} /> : null}
          <select aria-label="Select workspace" value={workspaceId ?? ''} onChange={(event) => void selectWorkspace(event.target.value)} disabled={workspaces.length < 2}>
            {workspaces.map((workspace: Workspace) => <option value={workspace.id} key={workspace.id}>{workspace.name}</option>)}
          </select>
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
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><ShieldCheck size={17} /></div>
            <strong>Need a hand?</strong>
            <p>Our team is here to help you grow.</p>
            <button type="button" onClick={() => navigate('/settings')}>Visit workspace settings <span>↗</span></button>
          </div>
          <button type="button" className="collapse-button" onClick={() => setCollapsed((value) => !value)}>
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}{!collapsed && <span>Collapse menu</span>}
          </button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button type="button" className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{currentPage}</strong></div>
          <div className="topbar-actions">
            <div className="search-wrap">
              <label className="global-search">
                <Search size={16} /><input aria-label="Search workspace" placeholder="Search anything..." value={search} onKeyDown={onSearchKeyDown} onChange={(event) => setSearch(event.target.value)} /><kbd>⌘ K</kbd>
              </label>
              {search && <div className="topbar-dropdown search-dropdown" role="listbox" aria-label="Search results">
                {searchError ? <p className="dropdown-error">{searchError}</p> : searchResults.length ? searchResults.map((item) => (
                  <button type="button" role="option" key={item.key} onClick={() => { navigate(item.path); setSearch(''); }}>
                    <strong>{item.label}</strong><small>{item.detail}</small>
                  </button>
                )) : <p>{search.length < 1 ? 'Enter a search term.' : 'No matching records.'}</p>}
              </div>}
            </div>
            <div className="notification-wrap">
              <button type="button" className="icon-button notification-button" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((value) => !value); setProfileOpen(false); }}>
                <Bell size={18} />{unreadCount > 0 && <span className="notification-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}
              </button>
              {notificationsOpen && <div className="topbar-dropdown notifications-dropdown">
                <div className="dropdown-heading"><strong>Notifications</strong>{unreadCount > 0 && <button type="button" onClick={() => void readAllNotifications()}>Mark all read</button>}</div>
                {notifications.length ? notifications.map((notification) => (
                  <button type="button" className={`notification-item ${notification.readAt ? '' : 'notification-unread'}`} key={notification.id} onClick={() => void openNotification(notification)}>
                    <strong>{String(notification.title ?? 'Notification')}</strong><span>{String(notification.body ?? '')}</span><small>{notification.createdAt ? new Date(String(notification.createdAt)).toLocaleString() : ''}</small>
                  </button>
                )) : <p className="empty-notifications">You’re all caught up.</p>}
              </div>}
            </div>
            <div className="profile-wrap">
              <button type="button" className="profile-button" onClick={() => { setProfileOpen((value) => !value); setNotificationsOpen(false); }} aria-expanded={profileOpen}>
                <span className="avatar">{initials(profileName)}</span><span className="profile-copy"><strong>{profileName}</strong><small>{role}</small></span><ChevronDown size={15} />
              </button>
              {profileOpen && <div className="profile-menu">
                <div className="profile-menu-info"><strong>{profileName}</strong><span>{profileEmail}</span></div>
                <NavLink to="/settings" onClick={() => setProfileOpen(false)}>Profile settings</NavLink>
                <button type="button" disabled={signingOut} onClick={() => void handleSignOut()}>{signingOut ? 'Signing out…' : 'Sign out'}</button>
              </div>}
            </div>
          </div>
        </header>
        {actionError && <div className="shell-error" role="alert">{actionError}<button type="button" onClick={() => setActionError('')}>Dismiss</button></div>}
        <main className="main-content"><Outlet /></main>
        <footer className="app-footer"><span>© 2026 Brightloop</span><span>Subscription management, made simple.</span><span className={health === 'offline' ? 'health-offline' : ''}>{health === 'checking' ? 'Checking system status' : health === 'online' ? 'All systems operational' : 'Backend unavailable'} <i /></span></footer>
      </div>
    </div>
  );
}
