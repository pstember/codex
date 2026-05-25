import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { StorefrontFooter } from "@/app/components/StorefrontFooter";

type StorefrontInfoPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
};

const storefrontInfoStyle = {
  "--storefront-background": "#f7f3ea",
  "--storefront-surface": "#fffdf8",
  "--storefront-text": "#201610",
  "--storefront-muted": "#6b5b4d",
  "--storefront-border": "#d6c7b5",
  "--storefront-accent": "#9a3412",
  "--storefront-secondary": "#d97706",
  "--storefront-button": "#201610",
  "--storefront-button-text": "#fffdf8",
} as CSSProperties;

export function StorefrontInfoPage({ eyebrow, title, intro, children }: StorefrontInfoPageProps) {
  return (
    <main
      className="min-h-screen text-[var(--storefront-text)]"
      style={{
        ...storefrontInfoStyle,
        background:
          "radial-gradient(circle at top right, rgba(217,119,6,0.12), transparent 28%), linear-gradient(180deg, #f7f3ea 0%, #f3ede2 100%)",
      }}
    >
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-6 lg:px-8">
        <nav className="sticky top-0 z-20 -mx-5 border-b border-[var(--storefront-border)] bg-[var(--storefront-background)]/92 px-5 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <Link className="text-lg font-black tracking-wide text-[var(--storefront-text)]" href="/">
            Atlas & Co.
          </Link>
        </nav>

        <section className="py-8 md:py-12">
          <div className="overflow-hidden rounded-[28px] border border-[var(--storefront-border)] bg-[var(--storefront-surface)] shadow-[0_28px_80px_rgba(32,22,16,0.12)]">
            <div className="grid gap-8 p-6 md:p-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(260px,0.55fr)] lg:p-10">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--storefront-accent)]">
                  {eyebrow}
                </p>
                <h1 className="mt-4 text-4xl font-black leading-[0.98] md:text-6xl">{title}</h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--storefront-muted)] md:text-lg">
                  {intro}
                </p>
              </div>
              <aside className="rounded-[24px] border border-[var(--storefront-border)] bg-[color-mix(in_srgb,var(--storefront-surface)_88%,white)] p-5 shadow-[0_16px_50px_rgba(32,22,16,0.08)]">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--storefront-accent)]">
                  Quick note
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--storefront-muted)]">
                  These pages are mock storefront content for the demo, written to feel plausible
                  for shoppers rather than placeholder lorem ipsum.
                </p>
                <Link
                  className="mt-5 inline-flex rounded-md bg-[var(--storefront-button)] px-4 py-3 text-sm font-black text-[var(--storefront-button-text)]"
                  href="/"
                >
                  Back to shop
                </Link>
              </aside>
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-10 text-base leading-7 text-[var(--storefront-muted)]">
          {children}
        </section>

        <StorefrontFooter />
      </div>
    </main>
  );
}
