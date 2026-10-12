'use client';
import { useEffect, useRef } from 'react';

export function Modal({
  children,
  onClose,
  canClose = true,
}: {
  children: React.ReactNode;
  onClose: () => void;
  canClose?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const firstInput = container.current?.querySelector<HTMLElement>(
      'input:not([readonly]), textarea:not([readonly]), select',
    );
    const firstButton = container.current?.querySelector<HTMLElement>('button:not([disabled])');
    (firstInput ?? firstButton)?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  function keyboard(event: React.KeyboardEvent) {
    if (event.key === 'Escape' && canClose) {
      event.preventDefault();
      onClose();
    }
    if (event.key !== 'Tab') return;
    const items = Array.from(
      container.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled])',
      ) ?? [],
    ).filter((element) => element.getClientRects().length > 0);
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  return (
    <div
      ref={container}
      className="modal-overlay"
      onKeyDown={keyboard}
      onClick={(event) => {
        if (event.target === event.currentTarget && canClose) onClose();
      }}
    >
      {children}
    </div>
  );
}
