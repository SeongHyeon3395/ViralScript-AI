'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
};

declare global {
  interface Window {
    __toastSeq?: number;
  }
}

function getIcon(variant: ToastVariant) {
  if (variant === 'success') return CheckCircle2;
  if (variant === 'error') return AlertTriangle;
  return Info;
}

export default function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    function handleToast(event: Event) {
      const custom = event as CustomEvent<{ message?: string; variant?: ToastVariant }>;
      const message = custom.detail?.message?.trim();
      if (!message) return;

      window.__toastSeq = (window.__toastSeq ?? 0) + 1;
      const id = String(window.__toastSeq);
      const variant = custom.detail?.variant ?? 'info';

      setToasts((current) => [...current, { id, message, variant }].slice(-3));

      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 3200);
    }

    window.addEventListener('app:toast', handleToast as EventListener);
    return () => window.removeEventListener('app:toast', handleToast as EventListener);
  }, []);

  return (
    <div className="fixed right-4 top-4 z-[70] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const Icon = getIcon(toast.variant);
        const variantClass =
          toast.variant === 'success'
            ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-50'
            : toast.variant === 'error'
              ? 'border-red-400/25 bg-red-400/10 text-red-50'
              : 'border-cyan-400/25 bg-cyan-400/10 text-cyan-50';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-2xl shadow-black/30 backdrop-blur-xl fade-in-up ${variantClass}`}
          >
            <div className="mt-0.5">
              <Icon size={16} />
            </div>
            <p className="flex-1 text-sm leading-relaxed">{toast.message}</p>
            <button
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
              className="rounded-lg p-1 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="토스트 닫기"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}