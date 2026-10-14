import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { getCategories, getProducts } from "@/lib/catalog";
import { getRegion } from "@/lib/region";

type SortKey = "featured" | "price-asc" | "price-desc" | "newest";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "newest", label: "Newest" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
];

export async function ShopScreen({
  categorySlug,
  search,
  sort,
}: {
  categorySlug?: string;
  search?: string;
  sort?: string;
}) {
  const [products, categories, region] = await Promise.all([
    getProducts({ categorySlug, search }),
    getCategories(),
    getRegion(),
  ]);

  const activeSort: SortKey = SORTS.some((s) => s.key === sort) ? (sort as SortKey) : "featured";

  const sorted = [...products].sort((a, b) => {
    switch (activeSort) {
      case "price-asc":
        return a.priceUsd - b.priceUsd;
      case "price-desc":
        return b.priceUsd - a.priceUsd;
      case "newest":
        return b.createdAt.localeCompare(a.createdAt);
      default:
        return Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name);
    }
  });

  const activeCategory = categories.find((c) => c.slug === categorySlug) ?? null;
  const heading = activeCategory ? activeCategory.name : "Everything";
  const sub = activeCategory
    ? activeCategory.tagline
    : "Perfume, bags, shoes and clothing — all of it in one place.";

  return (
    <div className="shell pb-8 pt-10 md:pt-14">
      <nav className="flex items-center gap-2 text-[12px] text-muted">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-ink">
          Shop
        </Link>
        {activeCategory ? (
          <>
            <span>/</span>
            <span className="text-ink-soft">{activeCategory.name}</span>
          </>
        ) : null}
      </nav>

      <header className="mt-6 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="title">{heading}</h1>
          <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-muted">{sub}</p>
        </div>
        <p className="nums text-[12.5px] text-muted">
          {sorted.length} {sorted.length === 1 ? "piece" : "pieces"} · {region.currency}
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-4 border-y border-line py-4 md:flex-row md:items-center md:justify-between">
        <div className="no-bar -mx-1 flex items-center gap-1.5 overflow-x-auto px-1">
          <FilterPill href={`/shop${searchParams(search, sort)}`} active={!categorySlug}>
            All
          </FilterPill>
          {categories.map((category) => (
            <FilterPill
              key={category.slug}
              href={`/shop/category/${category.slug}${searchParams(search, sort)}`}
              active={categorySlug === category.slug}
            >
              {category.name}
            </FilterPill>
          ))}
        </div>

        <form className="flex items-center gap-2" action="/shop" method="get">
          {categorySlug ? <input type="hidden" name="category" value={categorySlug} /> : null}
          <input
            type="search"
            name="q"
            defaultValue={search ?? ""}
            placeholder="Search the collection"
            className="field h-10 w-[190px] text-[13px] md:w-[220px]"
            aria-label="Search products"
          />
          <select name="sort" defaultValue={activeSort} className="field h-10 w-[168px] text-[13px]" aria-label="Sort">
            {SORTS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-ghost btn-sm">
            Go
          </button>
        </form>
      </div>

      {sorted.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-[17px] font-medium">Nothing matched that</p>
          <p className="mt-2 text-[13.5px] text-muted">Try a different word, or browse a category.</p>
          <Link href="/shop" className="btn btn-quiet btn-sm mt-6">
            Reset filters
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-11 md:gap-x-6 lg:grid-cols-4">
          {sorted.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 4} />
          ))}
        </div>
      )}
    </div>
  );
}

function searchParams(search?: string, sort?: string) {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (sort && sort !== "featured") params.set("sort", sort);
  const query = params.toString();
  return query ? `?${query}` : "";
}

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors ${
        active ? "bg-ink text-white" : "bg-mist text-ink-soft hover:bg-[#ebe9e5]"
      }`}
    >
      {children}
    </Link>
  );
}
