import { InsightsChat } from "@/app/admin/insights/InsightsChat";
import { requireCurrentUser } from "@/app/auth/session";
import { AppChrome } from "@/app/components/AppChrome";
import { buildSourceDataCatalog } from "@/domain/sourceDataCatalog";
import { commerceData } from "@/fixtures/commerce";
import { products } from "@/fixtures/products";
import {
  baselineStorefront,
  fatherDayStorefront,
  secretSantaStorefront,
} from "@/fixtures/storefront";

export default async function InsightsPage() {
  const user = await requireCurrentUser("ask_deep_metrics");
  const dataCatalog = buildSourceDataCatalog({
    commerceData,
    products,
    storefronts: [baselineStorefront, fatherDayStorefront, secretSantaStorefront],
  });

  return (
    <AppChrome eyebrow="Insight" title="Insight workbench" user={user}>
      <div className="grid w-full max-w-none gap-6">
        <header className="d20-hero relative overflow-hidden rounded-lg border border-white/10 px-5 py-5 text-[#f8fbff] shadow-[0_30px_90px_rgba(8,13,31,0.30)] md:px-7">
          <div className="relative max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#67e8f9]">
              Atlas prism bench
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-normal md:text-6xl">
              Insight workbench
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#dbeafe]">
              A working lab for asking open Atlas commerce questions through generated GraphQL,
              compact evidence, and live Codex traceability.
            </p>
          </div>
        </header>

        <InsightsChat dataCatalog={dataCatalog} />
      </div>
    </AppChrome>
  );
}
