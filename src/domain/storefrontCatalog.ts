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
  const pageCount = Math.max(1, Math.ceil(products.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const start = (currentPage - 1) * pageSize;

  return {
    currentPage,
    pageCount,
    products: products.slice(start, start + pageSize),
    totalProducts: products.length,
  };
}
