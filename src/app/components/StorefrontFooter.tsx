import Link from "next/link";
import { storefrontFooterLinks } from "@/app/components/storefrontFooterLinks";

export function StorefrontFooter() {
  return (
    <footer
      className="border-t border-[var(--storefront-border)] py-8 text-sm text-[var(--storefront-muted)]"
      role="contentinfo"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--storefront-accent)]">
            Atlas & Co.
          </p>
          <p className="mt-2 text-base font-black text-[var(--storefront-text)]">
            Useful gifting for desks, doorsteps, and last-minute saves.
          </p>
          <p className="mt-2 leading-6">
            Built for demo shoppers, with plain-language policies and enough detail to feel like a
            real shop.
          </p>
        </div>
        <div className="grid gap-3 md:justify-items-end">
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {storefrontFooterLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    className="font-semibold text-[var(--storefront-text)] underline-offset-4 transition hover:text-[var(--storefront-accent)] hover:underline"
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p>Copyright © 2026 Atlas & Co. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
