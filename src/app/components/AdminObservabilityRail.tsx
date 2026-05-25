"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

export function AdminObservabilityRail({
  children,
  description,
  eyebrow = "Observability",
  isOpen,
  onToggle,
  title,
}: {
  children: ReactNode;
  description?: string;
  eyebrow?: string;
  isOpen: boolean;
  onToggle: () => void;
  title: string;
}) {
  useEffect(() => {
    if (isOpen) {
      document.documentElement.dataset.adminObservabilityState = "open";
    } else {
      document.documentElement.dataset.adminObservabilityState = "closed";
    }

    return () => {
      delete document.documentElement.dataset.adminObservabilityState;
    };
  }, [isOpen]);

  return (
    <aside
      className={
        isOpen
          ? "d20-ink fixed right-4 top-4 bottom-4 z-40 grid w-[min(400px,calc(100vw-2rem))] content-start gap-4 overflow-y-auto overscroll-contain rounded-lg border border-[#263f7a] p-4 text-white shadow-[0_24px_90px_rgba(8,13,31,0.30)] transition-all lg:right-0 lg:top-0 lg:bottom-0 lg:w-[400px] lg:rounded-none lg:border-y-0 lg:border-r-0"
          : "d20-ink fixed right-4 top-4 bottom-4 z-40 grid w-14 place-items-center overflow-hidden rounded-lg border border-[#263f7a] p-2 text-white shadow-[0_24px_90px_rgba(8,13,31,0.30)] transition-all lg:right-0 lg:top-0 lg:bottom-0 lg:rounded-l-lg lg:rounded-r-none lg:border-r-0"
      }
    >
      {isOpen ? (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#22d3ee]">
                {eyebrow}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#f8fbff]">{title}</h2>
              {description ? (
                <p className="mt-2 text-sm leading-6 text-[#c7d2fe]">{description}</p>
              ) : null}
            </div>
            <button
              aria-label="Collapse observability"
              className="grid size-9 shrink-0 place-items-center rounded-md border border-white/15 bg-white/5 text-lg font-bold text-[#d7ff3f] transition hover:bg-white/10"
              onClick={onToggle}
              type="button"
            >
              &rsaquo;
            </button>
          </div>
          {children}
        </>
      ) : (
        <button
          aria-label="Open observability"
          className="relative grid h-full min-h-72 w-10 place-items-center rounded-md bg-white/[0.03] text-[#d7ff3f] transition hover:bg-white/[0.07]"
          onClick={onToggle}
          type="button"
        >
          <span className="absolute top-4 text-2xl font-bold leading-none">{"<"}</span>
          <span className="[writing-mode:vertical-rl] text-xs font-bold uppercase tracking-[0.18em]">
            Observability
          </span>
        </button>
      )}
    </aside>
  );
}
