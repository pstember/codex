"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import {
  applyStorefrontSelectionAction,
  clearStorefrontPreviewAction,
  previewStorefrontForCurrentUserAction,
} from "@/app/admin/storefront/actions";
import { logoutAction } from "@/app/auth/actions";
import { StorefrontFooter } from "@/app/components/StorefrontFooter";
import {
  type AnonymousCart,
  addCartItem,
  calculateCart,
  removeCartItem,
  updateCartQuantity,
} from "@/domain/cart";
import type { Product } from "@/domain/product";
import type { Role } from "@/domain/roles";
import {
  getCurrentOfferSection,
  getHeroSection,
  getSpotlightSection,
  resolveHeroProduct,
  resolveSectionProducts,
  resolveSpotlightProduct,
  resolveStorefrontHeroImageComposition,
  resolveStorefrontHeroImageObjectPosition,
  type StorefrontConfig,
  storefrontSectionIntentLabels,
} from "@/domain/storefront";
import {
  filterStorefrontCatalog,
  getStorefrontCategories,
  paginateStorefrontCatalog,
} from "@/domain/storefrontCatalog";
import type {
  GuestStorefrontSelection,
  StaffStorefrontVersionSelection,
} from "@/domain/storefrontPublishing";

type PublicStorefrontExperienceProps = {
  canPreviewVersions: boolean;
  products: Product[];
  selection: GuestStorefrontSelection;
  staffPreview: { label: string } | null;
  staffVersionSelection: StaffStorefrontVersionSelection | null;
  storefront: StorefrontConfig;
  style: CSSProperties;
  user: { name: string; role: Role } | null;
};

export function PublicStorefrontExperience({
  canPreviewVersions,
  products,
  selection,
  staffPreview,
  staffVersionSelection,
  storefront,
  style,
  user,
}: PublicStorefrontExperienceProps) {
  const hero = getHeroSection(storefront);
  const currentOffer = getCurrentOfferSection(storefront);
  const spotlight = getSpotlightSection(storefront);
  const heroProduct = resolveHeroProduct(storefront, products);
  const spotlightProduct = resolveSpotlightProduct(storefront, products);
  const heroImageComposition = resolveStorefrontHeroImageComposition(storefront.visualAsset);
  const [cart, setCart] = useState<AnonymousCart>({ items: [] });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [selectedStaffEntryId, setSelectedStaffEntryId] = useState(
    staffVersionSelection?.selectedEntryId ?? "",
  );
  const categories = useMemo(() => getStorefrontCategories(products), [products]);
  const filteredProducts = useMemo(
    () => filterStorefrontCatalog(products, { category, search }),
    [category, products, search],
  );
  const paginated = paginateStorefrontCatalog(filteredProducts, page);
  const pricedCart = useMemo(
    () =>
      calculateCart({
        cart,
        products,
      }),
    [cart, products],
  );
  const cartItemCount = cart.items.reduce((total, item) => total + item.quantity, 0);

  function addProduct(productId: string) {
    setCart((current) => addCartItem(current, productId));
    setIsCartOpen(true);
  }

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function updateCategory(value: string) {
    setCategory(value);
    setPage(1);
  }

  return (
    <main className="min-h-screen text-[var(--storefront-text)]" style={style}>
      <section className="mx-auto max-w-7xl px-5 py-6 sm:px-6 lg:px-8">
        <nav className="sticky top-0 z-30 -mx-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--storefront-border)] bg-[var(--storefront-background)]/90 px-5 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <Link className="text-lg font-black tracking-wide text-[var(--storefront-text)]" href="/">
            Atlas & Co.
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2 text-sm text-[var(--storefront-muted)]">
            <span className="hidden font-semibold text-[var(--storefront-muted)] md:inline">
              {user ? `Signed in as ${user.name} · ${user.role}` : "Atlas & Co. gift shop"}
            </span>
            {user ? (
              <Link className="font-semibold text-[var(--storefront-text)]" href="/admin">
                Staff admin
              </Link>
            ) : null}
            {user ? (
              <form action={logoutAction}>
                <button
                  className="rounded-md border border-[var(--storefront-border)] bg-[var(--storefront-surface)] px-3 py-2 font-semibold text-[var(--storefront-text)] transition hover:border-[var(--storefront-accent)]"
                  type="submit"
                >
                  Logout
                </button>
              </form>
            ) : null}
            <button
              className="rounded-md bg-[var(--storefront-button)] px-4 py-2 font-black text-[var(--storefront-button-text)] shadow-[0_10px_28px_rgba(8,13,31,0.18)]"
              onClick={() => setIsCartOpen((current) => !current)}
              type="button"
            >
              Cart ({cartItemCount})
            </button>
          </div>
        </nav>

        {isCartOpen ? (
          <CartPanel
            cartItemCount={cartItemCount}
            onClose={() => setIsCartOpen(false)}
            pricedCart={pricedCart}
            removeProduct={(productId) => setCart((current) => removeCartItem(current, productId))}
            updateQuantity={(productId, quantity) =>
              setCart((current) => updateCartQuantity(current, productId, quantity))
            }
          />
        ) : null}

        {staffPreview ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--storefront-border)] bg-[var(--storefront-surface)] p-4 text-sm shadow-[0_14px_38px_rgba(8,13,31,0.10)]">
            <p className="font-black text-[var(--storefront-text)]">{staffPreview.label}</p>
            <div className="flex flex-wrap items-center gap-2">
              <form action={clearStorefrontPreviewAction}>
                <button
                  className="rounded-md border border-[var(--storefront-border)] px-4 py-2 font-semibold text-[var(--storefront-text)]"
                  type="submit"
                >
                  Clear preview
                </button>
              </form>
              <Link
                className="rounded-md bg-[var(--storefront-button)] px-4 py-2 font-semibold text-[var(--storefront-button-text)]"
                href="/admin/storefront"
              >
                Open storefront editor
              </Link>
            </div>
          </div>
        ) : null}

        {canPreviewVersions && staffVersionSelection ? (
          <div className="mt-6 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--storefront-border)] pb-5 text-sm">
            <label className="grid min-w-64 gap-2 font-semibold text-[var(--storefront-text)]">
              Preview version
              <select
                className="rounded-md border border-[var(--storefront-border)] bg-[var(--storefront-surface)] px-3 py-2 font-normal text-[var(--storefront-text)] shadow-sm"
                name="storefrontId"
                onChange={(event) => setSelectedStaffEntryId(event.target.value)}
                value={selectedStaffEntryId}
              >
                {staffVersionSelection.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} ({option.status})
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-semibold text-[var(--storefront-muted)]">
                {selection.statusLabel}
              </p>
              <form action={previewStorefrontForCurrentUserAction}>
                <input name="storefrontId" type="hidden" value={selectedStaffEntryId} />
                <button
                  className="rounded-md border border-[var(--storefront-border)] bg-[var(--storefront-surface)] px-4 py-2 font-semibold text-[var(--storefront-text)]"
                  type="submit"
                >
                  {staffVersionSelection.previewActionLabel}
                </button>
              </form>
              <form action={applyStorefrontSelectionAction}>
                <input name="storefrontId" type="hidden" value={selectedStaffEntryId} />
                <button
                  className="rounded-md bg-[var(--storefront-button)] px-4 py-2 font-semibold text-[var(--storefront-button-text)] shadow-[0_10px_28px_rgba(8,13,31,0.20)] transition disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={
                    selectedStaffEntryId === staffVersionSelection.selectedEntryId
                      ? staffVersionSelection.isApplyDisabled
                      : staffVersionSelection.options.find(
                          (option) => option.id === selectedStaffEntryId,
                        )?.status === "current"
                  }
                  type="submit"
                >
                  {selectedStaffEntryId === staffVersionSelection.selectedEntryId
                    ? staffVersionSelection.applyActionLabel
                    : staffVersionSelection.options.find(
                          (option) => option.id === selectedStaffEntryId,
                        )?.status === "current"
                      ? "Current"
                      : "Apply"}
                </button>
              </form>
            </div>
          </div>
        ) : null}

        <section className="py-8 md:py-10">
          <div className="overflow-hidden rounded-[28px] border border-[var(--storefront-border)] bg-[var(--storefront-surface)] shadow-[0_32px_90px_rgba(8,13,31,0.16)]">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
              <div className="grid content-between gap-6 p-6 md:p-8 lg:p-10">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--storefront-accent)]">
                    Curated drops for useful gifting · {storefront.versionName}
                  </p>
                  <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[0.96] md:text-6xl">
                    {hero.title}
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--storefront-muted)] md:text-lg">
                    {hero.body}
                  </p>
                </div>
                {heroProduct ? (
                  <article className="grid gap-4 rounded-[22px] border border-[var(--storefront-border)] bg-[color-mix(in_srgb,var(--storefront-surface)_90%,white)] p-4 shadow-[0_16px_48px_rgba(8,13,31,0.10)] md:grid-cols-[132px_minmax(0,1fr)]">
                    <Image
                      alt={heroProduct.image.alt}
                      className="h-full w-full rounded-2xl border border-[var(--storefront-border)] object-cover"
                      height={264}
                      loading="eager"
                      preload
                      sizes="(min-width: 768px) 132px, calc(100vw - 72px)"
                      src={heroProduct.image.path}
                      width={264}
                    />
                    <div className="grid content-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--storefront-accent)]">
                          Hero product
                        </p>
                        <h2 className="mt-2 text-2xl font-black">{heroProduct.name}</h2>
                        <p className="mt-1 text-sm font-semibold text-[var(--storefront-muted)]">
                          £{heroProduct.price.toFixed(2)} · {heroProduct.category}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-[var(--storefront-muted)]">
                          Chosen to carry the storefront story quickly while still feeling useful
                          beyond the moment.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-3">
                        <button
                          className="rounded-md bg-[var(--storefront-button)] px-4 py-3 text-sm font-black text-[var(--storefront-button-text)]"
                          onClick={() => addProduct(heroProduct.id)}
                          type="button"
                        >
                          Add to cart
                        </button>
                      </div>
                    </div>
                  </article>
                ) : null}
              </div>
              <div className="relative border-t border-[var(--storefront-border)] lg:border-t-0 lg:border-l">
                <Image
                  alt={storefront.visualAsset.alt}
                  className="h-full w-full object-cover"
                  height={900}
                  src={storefront.visualAsset.path}
                  style={{
                    aspectRatio: heroImageComposition.aspectRatio,
                    objectPosition: resolveStorefrontHeroImageObjectPosition(
                      storefront.visualAsset,
                    ),
                  }}
                  width={1400}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-8 pb-10">
          <MerchandisingSection
            eyebrow={storefrontSectionIntentLabels.currentOffer}
            onAdd={addProduct}
            products={resolveSectionProducts(currentOffer, products)}
            section={currentOffer}
          />

          <section className="border-t border-[var(--storefront-border)] pt-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--storefront-accent)]">
                  {storefrontSectionIntentLabels.spotlight}
                </p>
                <h2 className="mt-2 text-2xl font-black">{spotlight.title}</h2>
              </div>
              {spotlight.body ? (
                <p className="max-w-xl text-sm leading-6 text-[var(--storefront-muted)]">
                  {spotlight.body}
                </p>
              ) : null}
            </div>
            {spotlightProduct ? (
              <article className="mt-5 grid overflow-hidden rounded-lg border border-[var(--storefront-border)] bg-[var(--storefront-surface)] shadow-[0_18px_55px_rgba(8,13,31,0.12)] md:grid-cols-[280px_minmax(0,1fr)]">
                <Image
                  alt={spotlightProduct.image.alt}
                  className="aspect-[4/5] h-full w-full border-b border-[var(--storefront-border)] object-cover md:border-b-0 md:border-r"
                  height={640}
                  src={spotlightProduct.image.path}
                  width={512}
                />
                <div className="grid content-center gap-4 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--storefront-accent)]">
                    {spotlightProduct.category}
                  </p>
                  <div>
                    <h3 className="text-3xl font-black leading-tight">{spotlightProduct.name}</h3>
                    <p className="mt-2 text-sm font-semibold text-[var(--storefront-muted)]">
                      £{spotlightProduct.price.toFixed(2)} · {spotlightProduct.inventory} in stock
                    </p>
                  </div>
                  <button
                    className="w-fit rounded-md bg-[var(--storefront-button)] px-4 py-3 text-sm font-black text-[var(--storefront-button-text)]"
                    onClick={() => addProduct(spotlightProduct.id)}
                    type="button"
                  >
                    Add to cart
                  </button>
                </div>
              </article>
            ) : null}
          </section>
        </div>

        <section className="border-t border-[var(--storefront-border)] py-8" id="catalog">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--storefront-accent)]">
                {storefrontSectionIntentLabels.allProducts}
              </p>
              <h2 className="mt-2 text-3xl font-black">Browse all products</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--storefront-muted)]">
                Search every Atlas & Co. product in the current fixture-backed catalog.
              </p>
            </div>
            <p className="text-sm font-bold text-[var(--storefront-muted)]">
              {paginated.totalProducts} of {products.length} products
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
            <label className="grid gap-2 text-sm font-bold">
              Search products
              <input
                className="rounded-md border border-[var(--storefront-border)] bg-[var(--storefront-surface)] px-3 py-3 font-semibold text-[var(--storefront-text)] outline-none focus:ring-4 focus:ring-[var(--storefront-accent)]/20"
                onChange={(event) => updateSearch(event.target.value)}
                placeholder="Coffee, desk, under-50..."
                value={search}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Category
              <select
                className="rounded-md border border-[var(--storefront-border)] bg-[var(--storefront-surface)] px-3 py-3 font-semibold text-[var(--storefront-text)] outline-none focus:ring-4 focus:ring-[var(--storefront-accent)]/20"
                onChange={(event) => updateCategory(event.target.value)}
                value={category}
              >
                <option value="">All categories</option>
                {categories.map((categoryName) => (
                  <option key={categoryName} value={categoryName}>
                    {categoryName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {paginated.products.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {paginated.products.map((product) => (
                <ProductCard key={product.id} onAdd={addProduct} product={product} />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-dashed border-[var(--storefront-border)] bg-[var(--storefront-surface)] p-6 text-sm font-semibold text-[var(--storefront-muted)]">
              No products match those filters. Clear the search or choose another category.
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold text-[var(--storefront-muted)]">
              Page {paginated.currentPage} of {paginated.pageCount}
            </p>
            <div className="flex gap-2">
              <button
                className="rounded-md border border-[var(--storefront-border)] bg-[var(--storefront-surface)] px-4 py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-45"
                disabled={paginated.currentPage === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                Previous
              </button>
              <button
                className="rounded-md border border-[var(--storefront-border)] bg-[var(--storefront-surface)] px-4 py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-45"
                disabled={paginated.currentPage === paginated.pageCount}
                onClick={() => setPage((current) => Math.min(paginated.pageCount, current + 1))}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        <StorefrontFooter />
      </section>
    </main>
  );
}

function MerchandisingSection({
  eyebrow,
  onAdd,
  products,
  section,
}: {
  eyebrow: string;
  onAdd: (productId: string) => void;
  products: Product[];
  section: StorefrontConfig["sections"][number];
}) {
  return (
    <section className="border-t border-[var(--storefront-border)] pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--storefront-accent)]">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-black">{section.title}</h2>
        </div>
        {section.body ? (
          <p className="max-w-xl text-sm leading-6 text-[var(--storefront-muted)]">
            {section.body}
          </p>
        ) : null}
      </div>
      {products.length > 0 ? (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} onAdd={onAdd} product={product} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ProductCard({ onAdd, product }: { onAdd: (productId: string) => void; product: Product }) {
  return (
    <article className="grid min-h-80 content-between gap-4 overflow-hidden rounded-lg border border-[var(--storefront-border)] bg-[var(--storefront-surface)] shadow-[0_12px_34px_rgba(8,13,31,0.08)]">
      <Image
        alt={product.image.alt}
        className="aspect-[4/5] w-full border-b border-[var(--storefront-border)] object-cover"
        height={640}
        src={product.image.path}
        width={512}
      />
      <div>
        <p className="px-4 text-xs font-black uppercase tracking-[0.14em] text-[var(--storefront-accent)]">
          {product.category}
        </p>
        <h3 className="mt-2 px-4 text-lg font-black leading-6">{product.name}</h3>
        <p className="mt-2 px-4 text-sm leading-6 text-[var(--storefront-muted)]">
          £{product.price.toFixed(2)} · {product.inventory} in stock
        </p>
      </div>
      <button
        className="mx-4 mb-4 rounded-md bg-[var(--storefront-button)] px-3 py-2 text-sm font-black text-[var(--storefront-button-text)]"
        onClick={() => onAdd(product.id)}
        type="button"
      >
        Add to cart
      </button>
    </article>
  );
}

function CartPanel({
  cartItemCount,
  onClose,
  pricedCart,
  removeProduct,
  updateQuantity,
}: {
  cartItemCount: number;
  onClose: () => void;
  pricedCart: ReturnType<typeof calculateCart>;
  removeProduct: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
}) {
  return (
    <aside className="fixed right-4 top-20 z-40 w-[min(420px,calc(100vw-2rem))] rounded-lg border border-[var(--storefront-border)] bg-[var(--storefront-surface)] p-5 text-[var(--storefront-text)] shadow-[0_28px_90px_rgba(8,13,31,0.28)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--storefront-accent)]">
            Cart
          </p>
          <h2 className="mt-1 text-2xl font-black">{cartItemCount} items</h2>
        </div>
        <button
          className="rounded-md border border-[var(--storefront-border)] px-3 py-2 text-sm font-black"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>

      {pricedCart.items.length > 0 ? (
        <div className="mt-4 grid max-h-80 gap-3 overflow-auto pr-1">
          {pricedCart.items.map((item) => (
            <div
              className="grid grid-cols-[1fr_auto] gap-3 border-b border-[var(--storefront-border)] pb-3 text-sm"
              key={item.productId}
            >
              <div>
                <p className="font-black">{item.name}</p>
                <p className="mt-1 text-[var(--storefront-muted)]">
                  £{item.unitPrice.toFixed(2)} · qty {item.quantity}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="grid size-8 place-items-center rounded-md border border-[var(--storefront-border)] font-black"
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  type="button"
                >
                  -
                </button>
                <button
                  className="grid size-8 place-items-center rounded-md border border-[var(--storefront-border)] font-black"
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  type="button"
                >
                  +
                </button>
                <button
                  className="rounded-md border border-[var(--storefront-border)] px-2 py-1 text-xs font-black"
                  onClick={() => removeProduct(item.productId)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-[var(--storefront-muted)]">
          Add a product to start a local demo cart.
        </p>
      )}

      <dl className="mt-5 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>£{pricedCart.subtotal.toFixed(2)}</dd>
        </div>
        <div className="flex justify-between border-t border-[var(--storefront-border)] pt-3 text-base font-black">
          <dt>Total</dt>
          <dd>£{pricedCart.total.toFixed(2)}</dd>
        </div>
      </dl>
      <button
        className="mt-5 w-full rounded-md bg-[var(--storefront-button)] px-4 py-3 text-sm font-black text-[var(--storefront-button-text)]"
        type="button"
      >
        Checkout demo
      </button>
    </aside>
  );
}
