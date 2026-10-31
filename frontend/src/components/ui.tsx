import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function StatusBadge({ status }: { status: string }) {
  const tone = /active|paid|completed|confirmed/i.test(status)
    ? 'success'
    : /overdue|expired|closed|cancelled|inactive/i.test(status)
      ? 'danger'
      : /paused|pending|draft|quotation/i.test(status)
        ? 'warning'
        : 'neutral';

  return <span className={`badge badge-${tone}`}><span className="badge-dot" />{status}</span>;
}

export function PageHeading({ eyebrow, title, description, action }: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="page-heading-action">{action}</div>}
    </div>
  );
}

export function Modal({ title, description, onClose, children, size = 'normal' }: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'normal' | 'wide';
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <div>
            <h2 id="modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={19} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><div className="empty-icon">BL</div><strong>{title}</strong><p>{description}</p></div>;
}
