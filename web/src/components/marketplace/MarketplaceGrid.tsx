import { useState, useMemo, type ReactNode } from 'react';
import { Cancel01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CategoryOption } from './types';

type Props<T> = {
  items: T[];
  categories: CategoryOption[];
  searchFields: (item: T) => string;
  matchesCategory: (item: T, category: string) => boolean;
  renderCard: (item: T) => ReactNode;
  emptyMessage?: string;
  toolbarRight?: ReactNode;
};

export default function MarketplaceGrid<T>({
  items,
  categories,
  searchFields,
  matchesCategory,
  renderCard,
  emptyMessage = 'No results match your search.',
  toolbarRight,
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
    <div className="flex min-h-0 flex-1 flex-col rounded-md border border-border bg-card">
      {/* Toolbar */}
      <div className="shrink-0 border-b border-border px-3 py-2.5 space-y-2">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-[400px]">
            <HugeiconsIcon
              icon={Search01Icon}
              size={16}
              strokeWidth={1.8}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full py-1.5 pl-9 pr-8 border border-border rounded-md bg-background text-foreground text-sm outline-none transition-colors focus:border-primary"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none text-muted-foreground text-lg cursor-pointer leading-none px-1"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.8} />
              </button>
            )}
          </div>

          {/* Count */}
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {filtered.length} of {items.length}
          </span>
          {toolbarRight}
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
      </div>

      {/* Grid */}
      <ScrollArea className="min-h-0 flex-1" viewportClass="p-3">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(renderCard)}
          </div>
        ) : (
          <p className="text-center text-muted-foreground italic py-12 px-4">
            {emptyMessage}
          </p>
        )}
      </ScrollArea>
    </div>
  );
}