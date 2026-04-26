# Phase 5 — Grocery & Recipes

Grocery inventory with location/expiry tracking, shopping lists, recipe management, ingredient-pantry matching ("What's cooking?"), and meal planning.

## What shipped

### Grocery router (`server/trpc/routers/groceries.ts`)
- `list` — filter by `location`, `category`, `search`, `isLow` with pagination
- `stats` — total, expiring (7 days), low stock, count per location
- `create` / `update` / `delete` — full CRUD with `isLow` recomputed against `reorderThreshold`
- `expiring` — items expiring within N days, returned with `daysLeft`
- Sub-router `shopping`: `list`, `get`, `create`, `addItems`, `togglePurchased`, `delete`

### Recipes router (`server/trpc/routers/recipes.ts`)
- `list` / `get` / `create` / `update` / `delete` — recipe CRUD with rich ingredient + instruction arrays
- `toggleFavorite` — quick UX action
- `matching` — **"What can I cook?"** — joins recipes to current pantry by ingredient name (case-insensitive), returns recipes ranked by `matchPct` of required ingredients in stock; includes the missing-ingredient list per recipe
- `missingIngredients(recipeId)` — list of items needed for one recipe, suitable for one-click shopping list creation
- Sub-router `mealPlans`: `listForRange`, `upsert` (idempotent per date), `delete`

### Pages
- `src/app/(dashboard)/dashboard/grocery/page.tsx` — stat cards (total / expiring / low), location filter pills, search, expiring-soon banner, inventory list with delete, add-item modal.
- `src/app/(dashboard)/dashboard/recipes/page.tsx` — three tabs: All / Favorites / What's Cooking. The "What's Cooking" tab shows matched recipes with a colour-coded match percentage (≥90 green, ≥70 yellow, else orange) and a preview of missing ingredients.

## Schemas

```ts
GroceryItem {
  name, category, quantity, unit,
  location: 'pantry' | 'fridge' | 'freezer' | 'other',
  expiryDate?, purchaseDate?, price?, barcode?,
  notes?, isLow, reorderThreshold?
}

ShoppingList {
  name,
  items: { name, quantity, unit, category, isPurchased, groceryItemId?, recipeId? }[],
  isCompleted, completedAt?
}

Recipe {
  name, description?,
  servings, prepTime, cookTime,
  ingredients: { name, quantity, unit, optional, groceryItemId? }[],
  instructions: string[],
  tags: string[], cuisine?, difficulty: 'easy'|'medium'|'hard',
  nutrition?, imageUrl?, sourceUrl?,
  isFavorite
}

MealPlan { date, meals: { type, recipeId?, name, servings }[] }
```

## Permissions

| Permission | Grants |
|------------|--------|
| `grocery:read` / `grocery:write` / `grocery:delete` | Inventory + shopping lists |
| `recipes:read` / `recipes:write` / `recipes:delete` | Recipes + meal plans |

`mealPlans.upsert` reuses `recipes:write` — meal planning is a recipe-adjacent action.

## Matching algorithm

```ts
matchPct = (requiredIngredients ∩ pantryNames).length / requiredIngredients.length
```

- Case-insensitive name matching, ignoring optional ingredients
- Filtered by `minMatchPct` (default 60), capped at `limit` (default 20)
- Ranked descending by `matchPct`

This is intentionally simple — quantities aren't checked yet. A future enhancement would convert units and require `pantry.quantity >= recipe.quantity`.

## Why these choices

- **Soft delete via real delete**: groceries and recipes are deleted hard (the plan has small numbers of items, audit log retains intent). Compare devices/rooms which use `isActive: false` because they have child references.
- **`isLow` derived in-line on update** so list queries don't need a `$expr` filter.
- **Pantry/fridge/freezer as a location enum** rather than separate collections — same item moves between locations without losing history.
- **Recipes own their ingredient list** rather than referencing a `groceryItem`. Recipes survive grocery cleanup; the optional `groceryItemId` link is a hint, not a foreign key.

## Critical files

```
server/trpc/routers/groceries.ts
server/trpc/routers/recipes.ts
src/app/(dashboard)/dashboard/grocery/page.tsx
src/app/(dashboard)/dashboard/recipes/page.tsx
```
