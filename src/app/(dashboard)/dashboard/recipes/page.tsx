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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Tab = 'all' | 'favorites' | 'whats-cooking';

export default function RecipesPage() {
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'all'>(
    'all'
  );

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

  const utils = trpc.useUtils();
  const toggleFavorite = trpc.recipes.toggleFavorite.useMutation({
    onSuccess: () => {
      utils.recipes.list.invalidate();
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

      <div className="flex gap-1 p-1 bg-accent rounded-lg w-fit">
        {(
          [
            { value: 'all' as const, label: 'All Recipes' },
            { value: 'favorites' as const, label: 'Favorites' },
            { value: 'whats-cooking' as const, label: "What's Cooking?" },
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

      {tab !== 'whats-cooking' && (
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

      {tab === 'whats-cooking' ? (
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
                  className="rounded-lg border border-border p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium">{r.name}</h4>
                    <span
                      className={cn(
                        'text-xs px-2 py-1 rounded-full font-medium',
                        r.matchPct >= 90
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : r.matchPct >= 70
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                          : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                      )}
                    >
                      {r.matchPct}% match
                    </span>
                  </div>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {r.prepTime + r.cookTime} min · {r.servings} servings
                  </div>
                  {r.missing.length > 0 && (
                    <div className="text-xs">
                      <p className="text-muted-foreground">Missing:</p>
                      <p className="text-orange-700 dark:text-orange-300">
                        {r.missing
                          .slice(0, 3)
                          .map((m) => m.name)
                          .join(', ')}
                        {r.missing.length > 3 && ` +${r.missing.length - 3} more`}
                      </p>
                    </div>
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
