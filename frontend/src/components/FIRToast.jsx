/**
 * FIRToast.jsx
 * Justice Chain — Shared toast notification component
 * Used in both Admin Dashboard and Citizen Portal
 *
 * Position: top-left corner (fixed)
 * Auto-dismisses after 6 seconds with progress bar
 *
 * Props:
 *   toasts   - array from useFIRToast hook
 *   onDismiss - (id) => void
 */

import { useEffect, useRef } from 'react';

const PRIORITY = {
  high:     { bg: '#FCEBEB', text: '#A32D2D', bar: '#E24B4A', label: 'High Priority' },
  medium:   { bg: '#FAEEDA', text: '#854F0B', bar: '#EF9F27', label: 'Medium Priority' },
  low:      { bg: '#EAF3DE', text: '#3B6D11', bar: '#639922', label: 'Low Priority' },
};

const STATUS_STYLE = {
  'Complaint Registered':  { bg: '#E1F5EE', text: '#085041' },
  'Under Investigation':   { bg: '#E6F1FB', text: '#0C447C' },
  'Charge Sheet Filed':    { bg: '#EEEDFE', text: '#3C3489' },
  'Closed':                { bg: '#F1EFE8', text: '#444441' },
  'Hearing Scheduled':     { bg: '#FAEEDA', text: '#633806' },
  default:                 { bg: '#E1F5EE', text: '#085041' },
};

function getStatusStyle(status) {
  return STATUS_STYLE[status] || STATUS_STYLE.default;
}

const toastStyles = `
  @keyframes jc-slide-in-left {
    from { opacity: 0; transform: translateX(-110%); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes jc-slide-out-left {
    from { opacity: 1; transform: translateX(0); }
    to   { opacity: 0; transform: translateX(-110%); }
  }
  @keyframes jc-shrink {
    from { width: 100%; }
    to   { width: 0%; }
  }

  .jc-toast-stack {
    position: fixed !important;
    top: 20px !important;
    left: 20px !important;
    z-index: 9999 !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 10px !important;
    width: 320px !important;
    pointer-events: none !important;
  }

  .jc-toast {
    background: #ffffff !important;
    border: 0.5px solid rgba(0,0,0,0.12) !important;
    border-radius: 12px !important;
    overflow: hidden !important;
    pointer-events: all !important;
    animation: jc-slide-in-left 0.32s cubic-bezier(0.22,1,0.36,1) !important;
    position: relative !important;
  }

  .jc-toast.leaving {
    animation: jc-slide-out-left 0.28s ease forwards;
  }

  .jc-toast-stripe {
    position: absolute;
    right: 0; top: 0; bottom: 0;
    width: 3px;
  }

  .jc-toast-body { padding: 12px 20px 12px 14px; }

  .jc-toast-header {
    display: flex; align-items: center; gap: 7px;
    margin-bottom: 5px;
  }

  .jc-toast-icon {
    width: 22px; height: 22px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .jc-toast-event {
    font-size: 10px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.06em;
    color: #888;
  }

  .jc-fir-id {
    font-size: 11px; font-weight: 600;
    font-family: monospace;
    color: #0F6E56;
    letter-spacing: 0.01em;
    margin-bottom: 3px;
  }

  .jc-detail-row {
    display: flex; align-items: center; gap: 5px;
    flex-wrap: wrap; margin-bottom: 6px;
  }

  .jc-category { font-size: 13px; font-weight: 500; color: #1a1a1a; }
  .jc-sep { font-size: 11px; color: #ccc; }
  .jc-name { font-size: 12px; color: #666; }

  .jc-badge-row { display: flex; gap: 5px; flex-wrap: wrap; }

  .jc-badge {
    font-size: 10px; font-weight: 500;
    padding: 2px 8px; border-radius: 99px;
  }

  .jc-close {
    position: absolute; top: 9px; right: 9px;
    width: 20px; height: 20px; border-radius: 50%;
    background: #f5f5f5; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; color: #999; line-height: 1;
  }
  .jc-close:hover { background: #eee; color: #444; }

  .jc-bar-wrap { height: 3px; background: #f0f0f0; }
  .jc-bar { height: 100%; animation: jc-shrink 10s linear forwards; }
`;

export function FIRToastStack({ toasts, onDismiss }) {
  const styleInjected = useRef(false);

  useEffect(() => {
    if (styleInjected.current) return;
    const style = document.createElement('style');
    style.textContent = toastStyles;
    document.head.appendChild(style);
    styleInjected.current = true;
  }, []);

  return (
    <div className="jc-toast-stack">
      {toasts.map((t) => (
        <FIRToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function FIRToastCard({ toast: t, onDismiss }) {
  const p = PRIORITY[t.priority] || PRIORITY.medium;
  const s = getStatusStyle(t.status);

  function handleDismiss() {
    const el = document.getElementById('jct-' + t.id);
    if (el) {
      el.classList.add('leaving');
      setTimeout(() => onDismiss(t.id), 280);
    } else {
      onDismiss(t.id);
    }
  }

  useEffect(() => {
    const timer = setTimeout(handleDismiss, 10300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="jc-toast" id={'jct-' + t.id}>
      <div className="jc-toast-stripe" style={{ background: p.bar }} />
      <div className="jc-toast-body">
        <div className="jc-toast-header">
          <div className="jc-toast-icon" style={{ background: p.bg }}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L14 5V11L8 14L2 11V5L8 2Z" stroke={p.text} strokeWidth="1.6"/>
            </svg>
          </div>
          <span className="jc-toast-event">{t.eventLabel}</span>
        </div>
        <div className="jc-fir-id">{t.firId}</div>
        <div className="jc-detail-row">
          <span className="jc-category">{t.category}</span>
          <span className="jc-sep">·</span>
          <span className="jc-name">{t.complainant}</span>
          {t.location && (
            <>
              <span className="jc-sep">·</span>
              <span className="jc-name">{t.location}</span>
            </>
          )}
        </div>
        <div className="jc-badge-row">
          <span className="jc-badge" style={{ background: s.bg, color: s.text }}>{t.status}</span>
          <span className="jc-badge" style={{ background: p.bg, color: p.text }}>{p.label}</span>
          {t.txHash && (
            <span className="jc-badge" style={{ background: '#F1EFE8', color: '#5F5E5A', fontFamily: 'monospace' }}
              title={t.txHash}>
              ⛓ {t.txHash.slice(0, 8)}…
            </span>
          )}
        </div>
      </div>
      <div className="jc-bar-wrap">
        <div className="jc-bar" style={{ background: p.bar }} />
      </div>
      <button className="jc-close" onClick={handleDismiss}>×</button>
    </div>
  );
}
