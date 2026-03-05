import { useState, useMemo, type ReactNode } from 'react';
import { IconSearch, IconX } from '@tabler/icons-react';
import type { CategoryOption } from './types';

type Props<T> = {
  items: T[];
  categories: CategoryOption[];
  searchFields: (item: T) => string;
  matchesCategory: (item: T, category: string) => boolean;
  renderCard: (item: T) => ReactNode;
  emptyMessage?: string;
};

export default function MarketplaceGrid<T>({
  items,
  categories,
  searchFields,
  matchesCategory,
  renderCard,
  emptyMessage = 'No results match your search.',
}: Props<T>) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = items;
    if (activeCategory) {
      result = result.filter((item) => matchesCategory(item, activeCategory));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((item) => searchFields(item).toLowerCase().includes(q));
    }
    return result;
  }, [items, search, activeCategory, searchFields, matchesCategory]);

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[400px]">
          <IconSearch
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full py-2 pl-9 pr-8 border border-border rounded-lg bg-card text-foreground text-sm outline-none transition-colors focus:border-primary"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none text-muted-foreground text-lg cursor-pointer leading-none px-1"
            >
              <IconX size={14} />
            </button>
          )}
        </div>

        {/* Count */}
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {filtered.length} of {items.length}
        </span>
      </div>

      {/* Category filters */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() =>
                setActiveCategory(activeCategory === cat.value ? null : cat.value)
              }
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer transition-all ${
                activeCategory === cat.value
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'border-border bg-transparent text-muted-foreground hover:border-primary hover:text-foreground'
              }`}
            >
              {cat.label}
              <span className="opacity-60">{cat.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(renderCard)}
        </div>
      ) : (
        <p className="text-center text-muted-foreground italic py-12 px-4">
          {emptyMessage}
        </p>
      )}
    </div>
  );
}