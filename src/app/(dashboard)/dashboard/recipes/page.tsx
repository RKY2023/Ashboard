'use client';

import { useState } from 'react';
import { trpc } from '@/src/app/providers';
import {
  Search,
  ChefHat,
  Heart,
  Clock,
  Loader2,
  Sparkles,
  BookOpen,
  Plus,
  ChefHat as Cook,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Tab = 'all' | 'favorites' | 'whats-cooking' | 'library';

export default function RecipesPage() {
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'all'>(
    'all'
  );
  const [libraryCategory, setLibraryCategory] = useState<string>('');

  const list = trpc.recipes.list.useQuery({
    search: search || undefined,
    isFavorite: tab === 'favorites' ? true : undefined,
    difficulty: difficulty === 'all' ? undefined : difficulty,
    page: 1,
    pageSize: 50,
  });
  const matching = trpc.recipes.matching.useQuery(
    { minMatchPct: 50, limit: 20 },
    { enabled: tab === 'whats-cooking' }
  );
  const library = trpc.recipes.library.list.useQuery(
    {
      search: search || undefined,
      category: libraryCategory || undefined,
    },
    { enabled: tab === 'library' }
  );

  const utils = trpc.useUtils();
  const toggleFavorite = trpc.recipes.toggleFavorite.useMutation({
    onSuccess: () => {
      utils.recipes.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const cook = trpc.recipes.cook.useMutation({
    onSuccess: ({ ingredientsDeducted }) => {
      toast.success(`Cooked! Pantry updated (${ingredientsDeducted} ingredient${ingredientsDeducted === 1 ? '' : 's'} deducted)`);
      utils.recipes.matching.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const importLibrary = trpc.recipes.library.import.useMutation({
    onSuccess: ({ imported, skipped }) => {
      utils.recipes.list.invalidate();
      if (imported === 0 && skipped > 0) {
        toast.info(`Already in your recipes (${skipped} skipped)`);
      } else if (skipped === 0) {
        toast.success(`Imported ${imported} recipe${imported === 1 ? '' : 's'}`);
      } else {
        toast.success(
          `Imported ${imported}, skipped ${skipped} duplicate${skipped === 1 ? '' : 's'}`
        );
      }
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Recipes</h1>
        <p className="text-muted-foreground">
          Browse, plan meals, and discover what you can cook with your pantry
        </p>
      </div>

      <div className="flex gap-1 p-1 bg-accent rounded-lg w-fit flex-wrap">
        {(
          [
            { value: 'all' as const, label: 'All Recipes' },
            { value: 'favorites' as const, label: 'Favorites' },
            { value: 'whats-cooking' as const, label: "What's Cooking?" },
            { value: 'library' as const, label: 'Library' },
          ]
        ).map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              tab === t.value ? 'bg-background shadow' : 'hover:bg-background/50'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== 'whats-cooking' && tab !== 'library' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search recipes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={difficulty}
            onChange={(e) =>
              setDifficulty(
                e.target.value as 'easy' | 'medium' | 'hard' | 'all'
              )
            }
            className="px-3 py-2 rounded-lg border border-input bg-background"
          >
            <option value="all">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      )}

      {tab === 'library' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search the library..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={libraryCategory}
            onChange={(e) => setLibraryCategory(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background"
          >
            <option value="">All categories</option>
            {library.data?.categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label} ({c.count})
              </option>
            ))}
          </select>
          <button
            disabled={
              importLibrary.isPending ||
              (library.data?.items.length ?? 0) === 0
            }
            onClick={() =>
              importLibrary.mutate({
                ids: (library.data?.items ?? []).map((r) => r.id),
              })
            }
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {importLibrary.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Import all visible
          </button>
        </div>
      )}

      {tab === 'library' ? (
        <div className="widget">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-primary" />
            <h3 className="widget-title">Curated recipe library</h3>
            <span className="text-xs text-muted-foreground">
              · {library.data?.items.length ?? 0} recipes
            </span>
          </div>
          {library.isLoading ? (
            <div className="py-12 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (library.data?.items.length ?? 0) === 0 ? (
            <p className="py-12 text-center text-muted-foreground text-sm">
              No recipes match your filters.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {library.data!.items.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-border p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <h4 className="font-medium leading-tight">{r.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {r.categoryLabel} · {r.cuisine}
                      </p>
                    </div>
                    <button
                      disabled={importLibrary.isPending}
                      onClick={() => importLibrary.mutate({ ids: [r.id] })}
                      className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                      title="Import to my recipes"
                    >
                      {importLibrary.isPending &&
                      importLibrary.variables?.ids[0] === r.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex gap-2 flex-wrap text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {r.prepTime + r.cookTime} min
                    </span>
                    <span>· {r.servings} servings</span>
                    <span>· {r.ingredientCount} ingredients</span>
                    <span className="capitalize">· {r.difficulty}</span>
                  </div>
                  {r.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {r.tags.slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : tab === 'whats-cooking' ? (
        <div className="widget">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="widget-title">Recipes you can cook now</h3>
          </div>
          {matching.isLoading ? (
            <div className="py-12 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (matching.data?.length ?? 0) === 0 ? (
            <p className="py-12 text-center text-muted-foreground text-sm">
              No matches yet. Add pantry items and recipes to see suggestions.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {matching.data!.map((r) => (
                <div
                  key={r._id}
                  className={cn(
                    'rounded-lg border p-4 space-y-2',
                    r.canCook ? 'border-green-500/40 bg-green-50/30 dark:bg-green-900/10' : 'border-border'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium">{r.name}</h4>
                    <span
                      className={cn(
                        'text-xs px-2 py-1 rounded-full font-medium',
                        r.canCook
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : r.matchPct >= 70
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                          : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                      )}
                    >
                      {r.canCook ? 'Ready to cook' : `${r.matchPct}% match`}
                    </span>
                  </div>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {r.prepTime + r.cookTime} min · {r.servings} servings
                  </div>
                  {r.missing.length > 0 && (
                    <div className="text-xs space-y-1">
                      <p className="text-muted-foreground">Missing:</p>
                      <ul className="space-y-0.5">
                        {r.missing.slice(0, 4).map((m, idx) => (
                          <li
                            key={idx}
                            className={cn(
                              'flex items-center gap-1',
                              m.reason === 'incompatible'
                                ? 'text-yellow-700 dark:text-yellow-300'
                                : 'text-orange-700 dark:text-orange-300'
                            )}
                          >
                            {m.reason === 'incompatible' && <AlertTriangle className="w-3 h-3" />}
                            <span>
                              {m.reason === 'short' ? `+${m.quantity.toFixed(1)} ${m.unit} ` : ''}
                              {m.reason === 'absent' ? `${m.quantity} ${m.unit} of ` : ''}
                              <span className="font-medium">{m.name}</span>
                              {m.reason === 'incompatible' && ' (unit mismatch)'}
                            </span>
                          </li>
                        ))}
                        {r.missing.length > 4 && (
                          <li className="text-muted-foreground">+{r.missing.length - 4} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                  {r.canCook && (
                    <button
                      onClick={() => cook.mutate({ recipeId: r._id })}
                      disabled={cook.isPending && cook.variables?.recipeId === r._id}
                      className="w-full mt-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {cook.isPending && cook.variables?.recipeId === r._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Cook className="w-4 h-4" />
                      )}
                      Cook this
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="widget">
          {list.isLoading ? (
            <div className="py-12 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (list.data?.items.length ?? 0) === 0 ? (
            <div className="py-12 text-center">
              <ChefHat className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">
                {tab === 'favorites'
                  ? 'No favorites yet. Star a recipe to add it here.'
                  : 'No recipes yet.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.data!.items.map((r) => (
                <div
                  key={r._id}
                  className="rounded-lg border border-border p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium">{r.name}</h4>
                    <button
                      onClick={() =>
                        toggleFavorite.mutate({ recipeId: r._id })
                      }
                      className="p-1 rounded hover:bg-accent"
                    >
                      <Heart
                        className={cn(
                          'w-4 h-4',
                          r.isFavorite
                            ? 'fill-red-500 text-red-500'
                            : 'text-muted-foreground'
                        )}
                      />
                    </button>
                  </div>
                  {r.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {r.description}
                    </p>
                  )}
                  <div className="flex gap-2 flex-wrap text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {r.prepTime + r.cookTime} min
                    </span>
                    <span>· {r.servings} servings</span>
                    <span>· {r.ingredientCount} ingredients</span>
                    <span className="capitalize">· {r.difficulty}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
