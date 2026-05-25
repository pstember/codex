import type { Product } from "@/domain/product";

export const storefrontCatalogPageSize = 8;

export type StorefrontCatalogFilters = {
  search?: string;
  category?: string;
};

export function getStorefrontCategories(products: Product[]): string[] {
  return [...new Set(products.map((product) => product.category))].sort();
}

export function filterStorefrontCatalog(
  products: Product[],
  filters: StorefrontCatalogFilters,
): Product[] {
  const search = filters.search?.trim().toLowerCase() ?? "";
  const category = filters.category?.trim() ?? "";

  return products.filter((product) => {
    const matchesCategory = !category || product.category === category;
    const searchableText = [product.name, product.category, ...product.tags]
      .join(" ")
      .toLowerCase();
    const matchesSearch = !search || searchableText.includes(search);

    return matchesCategory && matchesSearch;
  });
}

export function paginateStorefrontCatalog(
  products: Product[],
  page: number,
  pageSize = storefrontCatalogPageSize,
) {
  const safePageSize =
    Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : storefrontCatalogPageSize;
  const requestedPage = Number.isFinite(page) ? Math.floor(page) : 1;
  const pageCount = Math.max(1, Math.ceil(products.length / safePageSize));
  const currentPage = Math.min(Math.max(1, requestedPage), pageCount);
  const start = (currentPage - 1) * safePageSize;

  return {
    currentPage,
    pageCount,
    products: products.slice(start, start + safePageSize),
    totalProducts: products.length,
  };
}
