'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

/**
 * Accessible modal built on <dialog>: focus is trapped by the browser, Esc
 * closes it, and on phones it becomes a bottom sheet.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
  sheet = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
  /** Always render as a bottom sheet (mobile price summary). */
  sheet?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.documentElement.style.overflow = 'hidden';
    } else if (!open && d.open) {
      d.close();
    }
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [open]);

  const position = sheet
    ? 'mt-auto mb-0 w-full max-w-none rounded-t-[14px] animate-sheet max-h-[88dvh]'
    : `mt-auto mb-0 w-full max-w-none rounded-t-[14px] animate-sheet max-h-[92dvh] sm:m-auto sm:rounded-[6px] sm:animate-fade-up sm:max-h-[90dvh] ${wide ? 'sm:max-w-5xl' : 'sm:max-w-xl'}`;

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={() => {
        document.documentElement.style.overflow = '';
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`${position} overflow-hidden bg-paper p-0 text-ink shadow-2xl backdrop:bg-ink/55 backdrop:backdrop-blur-[2px]`}
    >
      {open && (
        <div className="flex max-h-[inherit] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-7">
            <h2 className="text-xl sm:text-2xl">{title}</h2>
            <button type="button" onClick={onClose} className="-mr-2 grid h-11 w-11 place-items-center rounded-full hover:bg-stone" aria-label="Закрыть">
              <Icon name="close" />
            </button>
          </div>
          <div className="overflow-y-auto overscroll-contain">{children}</div>
        </div>
      )}
    </dialog>
  );
}
