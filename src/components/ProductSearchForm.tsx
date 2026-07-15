export function ProductSearchForm({
  defaultValue = "",
  compact = false,
}: {
  defaultValue?: string;
  compact?: boolean;
}) {
  return (
    <form action="/search" method="get" role="search" className="flex w-full">
      <label htmlFor={compact ? "header-product-search" : "product-search"} className="sr-only">
        商品を検索
      </label>
      <input
        id={compact ? "header-product-search" : "product-search"}
        name="q"
        type="search"
        defaultValue={defaultValue}
        maxLength={48}
        enterKeyHint="search"
        autoComplete="off"
        placeholder="商品名・ブランドから探す"
        className={`min-w-0 flex-1 border border-line bg-white/65 text-sumi outline-none placeholder:text-sumi-soft/65 focus:border-hinomaru focus:ring-1 focus:ring-hinomaru ${
          compact ? "h-10 px-3 text-sm" : "h-12 px-4 text-base"
        }`}
      />
      <button
        type="submit"
        className={`shrink-0 border border-l-0 border-sumi bg-sumi font-medium text-washi transition-colors hover:border-hinomaru hover:bg-hinomaru focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hinomaru ${
          compact ? "h-10 px-4 text-sm" : "h-12 px-5 text-sm"
        }`}
      >
        検索
      </button>
    </form>
  );
}
