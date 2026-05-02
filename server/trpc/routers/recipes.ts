import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { router } from '@/server/trpc';
import { withPermission } from '@/server/trpc/middleware/auth';
import {
  getRecipesCollection,
  getMealPlansCollection,
  getGroceriesCollection,
} from '@/src/lib/db';
import { auditHelpers } from '@/src/lib/db/audit';
import { AuthContext } from '@/src/types';
import {
  RECIPE_LIBRARY,
  CATEGORY_LABEL,
  type LibraryCategory,
} from '@/src/data/recipe-library';
import { compareInPantry, convert } from '@/src/lib/units';

const ingredientSchema = z.object({
  name: z.string().min(1).max(120),
  quantity: z.number().min(0),
  unit: z.string().min(1).max(20),
  optional: z.boolean().default(false),
  groceryItemId: z.string().optional(),
});

const nutritionSchema = z.object({
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
  fiber: z.number().min(0).optional(),
  sodium: z.number().min(0).optional(),
});

const createRecipeSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(1000).optional(),
  servings: z.number().min(1).max(50),
  prepTime: z.number().min(0),
  cookTime: z.number().min(0),
  ingredients: z.array(ingredientSchema).min(1),
  instructions: z.array(z.string().max(2000)).min(1),
  tags: z.array(z.string().max(40)).default([]),
  cuisine: z.string().max(40).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('easy'),
  nutrition: nutritionSchema.optional(),
  imageUrl: z.string().url().optional(),
  sourceUrl: z.string().url().optional(),
});

const updateRecipeSchema = createRecipeSchema.partial().extend({
  recipeId: z.string(),
});

const listRecipesSchema = z.object({
  search: z.string().optional(),
  cuisine: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  isFavorite: z.boolean().optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
});

const mealTypeEnum = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);

const upsertMealPlanSchema = z.object({
  date: z.string().datetime(),
  meals: z.array(
    z.object({
      type: mealTypeEnum,
      recipeId: z.string().optional(),
      name: z.string().min(1).max(160),
      servings: z.number().min(1).max(50).default(1),
    })
  ),
});

export const recipesRouter = router({
  /**
   * List recipes with filters
   */
  list: withPermission('recipes:read')
    .input(listRecipesSchema)
    .query(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const recipes = await getRecipesCollection();

      const query: Record<string, unknown> = { householdId: auth.householdId };
      if (input.search) query.name = { $regex: input.search, $options: 'i' };
      if (input.cuisine) query.cuisine = input.cuisine;
      if (input.difficulty) query.difficulty = input.difficulty;
      if (input.isFavorite !== undefined) query.isFavorite = input.isFavorite;

      const skip = (input.page - 1) * input.pageSize;
      const [total, items] = await Promise.all([
        recipes.countDocuments(query),
        recipes
          .find(query)
          .sort({ name: 1 })
          .skip(skip)
          .limit(input.pageSize)
          .toArray(),
      ]);

      return {
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
        items: items.map((r) => ({
          _id: r._id.toString(),
          name: r.name,
          description: r.description,
          servings: r.servings,
          prepTime: r.prepTime,
          cookTime: r.cookTime,
          tags: r.tags,
          cuisine: r.cuisine,
          difficulty: r.difficulty,
          isFavorite: r.isFavorite,
          imageUrl: r.imageUrl,
          ingredientCount: r.ingredients?.length ?? 0,
        })),
      };
    }),

  get: withPermission('recipes:read')
    .input(z.object({ recipeId: z.string() }))
    .query(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const recipes = await getRecipesCollection();
      const recipe = await recipes.findOne({
        _id: new ObjectId(input.recipeId),
        householdId: auth.householdId,
      });
      if (!recipe) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Recipe not found' });
      }
      return {
        _id: recipe._id.toString(),
        name: recipe.name,
        description: recipe.description,
        servings: recipe.servings,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        ingredients: recipe.ingredients.map((i) => ({
          ...i,
          groceryItemId: i.groceryItemId?.toString(),
        })),
        instructions: recipe.instructions,
        tags: recipe.tags,
        cuisine: recipe.cuisine,
        difficulty: recipe.difficulty,
        nutrition: recipe.nutrition,
        imageUrl: recipe.imageUrl,
        sourceUrl: recipe.sourceUrl,
        isFavorite: recipe.isFavorite,
      };
    }),

  create: withPermission('recipes:write')
    .input(createRecipeSchema)
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const recipes = await getRecipesCollection();
      const now = new Date();
      const doc = {
        householdId: auth.householdId!,
        ...input,
        ingredients: input.ingredients.map((i) => ({
          ...i,
          groceryItemId: i.groceryItemId
            ? new ObjectId(i.groceryItemId)
            : undefined,
        })),
        isFavorite: false,
        createdAt: now,
        updatedAt: now,
      };
      const result = await recipes.insertOne(doc as never);
      await auditHelpers.logCreate(
        auth.userId,
        auth.householdId!,
        'recipe',
        result.insertedId,
        { name: input.name }
      );
      return { _id: result.insertedId.toString(), msg: 'Recipe added' };
    }),

  update: withPermission('recipes:write')
    .input(updateRecipeSchema)
    .mutation(async ({ input, ctx }) => {
      const { recipeId, ...updates } = input;
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const recipes = await getRecipesCollection();

      const updateDoc: Record<string, unknown> = { updatedAt: new Date() };
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined) continue;
        if (key === 'ingredients' && Array.isArray(value)) {
          const ings = value as z.infer<typeof ingredientSchema>[];
          updateDoc.ingredients = ings.map((i) => ({
            ...i,
            groceryItemId: i.groceryItemId
              ? new ObjectId(i.groceryItemId)
              : undefined,
          }));
        } else {
          updateDoc[key] = value;
        }
      }

      const result = await recipes.updateOne(
        { _id: new ObjectId(recipeId), householdId: auth.householdId },
        { $set: updateDoc }
      );
      if (result.matchedCount === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Recipe not found' });
      }
      await auditHelpers.logUpdate(
        auth.userId,
        auth.householdId!,
        'recipe',
        new ObjectId(recipeId),
        updates
      );
      return { msg: 'Recipe updated' };
    }),

  delete: withPermission('recipes:delete')
    .input(z.object({ recipeId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const recipes = await getRecipesCollection();
      const result = await recipes.deleteOne({
        _id: new ObjectId(input.recipeId),
        householdId: auth.householdId,
      });
      if (result.deletedCount === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Recipe not found' });
      }
      await auditHelpers.logDelete(
        auth.userId,
        auth.householdId!,
        'recipe',
        new ObjectId(input.recipeId)
      );
      return { msg: 'Recipe removed' };
    }),

  toggleFavorite: withPermission('recipes:write')
    .input(z.object({ recipeId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const recipes = await getRecipesCollection();
      const recipe = await recipes.findOne({
        _id: new ObjectId(input.recipeId),
        householdId: auth.householdId,
      });
      if (!recipe) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Recipe not found' });
      }
      await recipes.updateOne(
        { _id: recipe._id },
        {
          $set: {
            isFavorite: !recipe.isFavorite,
            updatedAt: new Date(),
          },
        }
      );
      return { isFavorite: !recipe.isFavorite };
    }),

  /**
   * "What can I cook?" — match recipes against current pantry contents,
   * accounting for ingredient quantities and unit conversions. Returns
   * recipes ranked by share of fully-satisfied required ingredients.
   */
  matching: withPermission('recipes:read')
    .input(
      z.object({
        minMatchPct: z.number().min(0).max(100).default(60),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const recipes = await getRecipesCollection();
      const groceries = await getGroceriesCollection();

      const pantry = await groceries
        .find({ householdId: auth.householdId, quantity: { $gt: 0 } })
        .toArray();
      const pantryByName = new Map(
        pantry.map((p) => [p.name.toLowerCase().trim(), p])
      );

      const all = await recipes
        .find({ householdId: auth.householdId })
        .toArray();

      const ranked = all
        .map((r) => {
          const required = r.ingredients.filter((i) => !i.optional);
          const missing: { name: string; quantity: number; unit: string; reason: 'absent' | 'short' | 'incompatible' }[] = [];
          let satisfied = 0;

          for (const ing of required) {
            const stock = pantryByName.get(ing.name.toLowerCase().trim());
            if (!stock) {
              missing.push({ name: ing.name, quantity: ing.quantity, unit: ing.unit, reason: 'absent' });
              continue;
            }
            const cmp = compareInPantry(ing.quantity, ing.unit, stock.quantity, stock.unit);
            if (cmp.hasEnough) {
              satisfied++;
              continue;
            }
            if (cmp.incompatible) {
              missing.push({ name: ing.name, quantity: ing.quantity, unit: ing.unit, reason: 'incompatible' });
            } else if (cmp.shortfall) {
              missing.push({
                name: ing.name,
                quantity: cmp.shortfall.quantity,
                unit: cmp.shortfall.unit,
                reason: 'short',
              });
            }
          }

          const matchPct =
            required.length === 0 ? 100 : (satisfied / required.length) * 100;

          return {
            _id: r._id.toString(),
            name: r.name,
            cuisine: r.cuisine,
            difficulty: r.difficulty,
            servings: r.servings,
            prepTime: r.prepTime,
            cookTime: r.cookTime,
            imageUrl: r.imageUrl,
            matchPct: Math.round(matchPct),
            canCook: missing.length === 0,
            missing,
          };
        })
        .filter((r) => r.matchPct >= input.minMatchPct)
        .sort((a, b) => b.matchPct - a.matchPct)
        .slice(0, input.limit);

      return ranked;
    }),

  /**
   * Generate a shopping list of ingredients the pantry can't currently
   * satisfy. Quantities are expressed as the shortfall in the recipe's unit.
   */
  missingIngredients: withPermission('recipes:read')
    .input(z.object({ recipeId: z.string() }))
    .query(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const recipes = await getRecipesCollection();
      const groceries = await getGroceriesCollection();

      const recipe = await recipes.findOne({
        _id: new ObjectId(input.recipeId),
        householdId: auth.householdId,
      });
      if (!recipe) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Recipe not found' });
      }

      const pantry = await groceries
        .find({ householdId: auth.householdId })
        .toArray();
      const pantryByName = new Map(
        pantry.map((p) => [p.name.toLowerCase().trim(), p])
      );

      const missing: {
        name: string;
        quantity: number;
        unit: string;
        category: string;
        reason: 'absent' | 'short' | 'incompatible';
      }[] = [];

      for (const ing of recipe.ingredients) {
        const stock = pantryByName.get(ing.name.toLowerCase().trim());
        if (!stock) {
          missing.push({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            category: 'pantry',
            reason: 'absent',
          });
          continue;
        }
        const cmp = compareInPantry(ing.quantity, ing.unit, stock.quantity, stock.unit);
        if (cmp.hasEnough) continue;
        if (cmp.incompatible) {
          missing.push({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            category: 'pantry',
            reason: 'incompatible',
          });
        } else if (cmp.shortfall) {
          missing.push({
            name: ing.name,
            quantity: cmp.shortfall.quantity,
            unit: cmp.shortfall.unit,
            category: 'pantry',
            reason: 'short',
          });
        }
      }

      return missing;
    }),

  /**
   * Cook a recipe — validate every required ingredient is in stock (with
   * unit conversion) then deduct from pantry. Optional ingredients are
   * deducted only when present; missing optional ingredients don't block.
   *
   * Validation runs first so a cook either fully succeeds or refuses; the
   * decrement loop is best-effort serial — concurrent cooks of the same
   * recipe can produce a partial deduction in the worst case.
   */
  cook: withPermission('recipes:write')
    .input(z.object({ recipeId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const auth = (ctx as unknown as { auth: AuthContext }).auth;
      const recipes = await getRecipesCollection();
      const groceries = await getGroceriesCollection();

      const recipe = await recipes.findOne({
        _id: new ObjectId(input.recipeId),
        householdId: auth.householdId,
      });
      if (!recipe) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Recipe not found' });
      }

      const pantry = await groceries
        .find({ householdId: auth.householdId })
        .toArray();
      const pantryByName = new Map(
        pantry.map((p) => [p.name.toLowerCase().trim(), p])
      );

      type Plan = { pantryItemId: ObjectId; deductInPantryUnit: number };
      const plan: Plan[] = [];
      const blockers: string[] = [];

      for (const ing of recipe.ingredients) {
        const stock = pantryByName.get(ing.name.toLowerCase().trim());
        if (!stock) {
          if (!ing.optional) blockers.push(`missing ${ing.name}`);
          continue;
        }
        const cmp = compareInPantry(ing.quantity, ing.unit, stock.quantity, stock.unit);
        if (cmp.incompatible) {
          if (!ing.optional) blockers.push(`incompatible units for ${ing.name} (${ing.unit} vs ${stock.unit})`);
          continue;
        }
        if (!cmp.hasEnough) {
          if (!ing.optional) {
            const sf = cmp.shortfall!;
            blockers.push(`need ${sf.quantity.toFixed(1)} more ${sf.unit} of ${ing.name}`);
          }
          continue;
        }
        const deduct = convert(ing.quantity, ing.unit, stock.unit);
        if (deduct === null) {
          if (!ing.optional) blockers.push(`can't convert ${ing.name}`);
          continue;
        }
        plan.push({ pantryItemId: stock._id, deductInPantryUnit: deduct });
      }

      if (blockers.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Can't cook: ${blockers.join('; ')}`,
        });
      }

      let deducted = 0;
      for (const step of plan) {
        const result = await groceries.findOneAndUpdate(
          {
            _id: step.pantryItemId,
            householdId: auth.householdId,
            quantity: { $gte: step.deductInPantryUnit },
          } as never,
          {
            $inc: { quantity: -step.deductInPantryUnit },
            $set: { updatedAt: new Date() },
          }
        );
        const ok = (result as unknown as { value?: unknown } | null)?.value
          ?? (result as unknown as { _id?: unknown } | null);
        if (ok) deducted++;
      }

      await auditHelpers.logUpdate(
        auth.userId,
        auth.householdId!,
        'recipe',
        recipe._id,
        { cooked: true, ingredientsDeducted: deducted }
      );

      return {
        msg: 'Recipe cooked',
        ingredientsDeducted: deducted,
      };
    }),

  /**
   * Meal plan endpoints
   */
  mealPlans: router({
    listForRange: withPermission('recipes:read')
      .input(
        z.object({
          startDate: z.string().datetime(),
          endDate: z.string().datetime(),
        })
      )
      .query(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const plans = await getMealPlansCollection();
        const items = await plans
          .find({
            householdId: auth.householdId,
            date: {
              $gte: new Date(input.startDate),
              $lte: new Date(input.endDate),
            },
          })
          .sort({ date: 1 })
          .toArray();

        return items.map((p) => ({
          _id: p._id.toString(),
          date: p.date.toISOString(),
          meals: p.meals.map((m) => ({
            ...m,
            recipeId: m.recipeId?.toString(),
          })),
        }));
      }),

    upsert: withPermission('recipes:write')
      .input(upsertMealPlanSchema)
      .mutation(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const plans = await getMealPlansCollection();
        const now = new Date();
        const date = new Date(input.date);
        date.setHours(0, 0, 0, 0);

        const meals = input.meals.map((m) => ({
          ...m,
          recipeId: m.recipeId ? new ObjectId(m.recipeId) : undefined,
        }));

        const existing = await plans.findOne({
          householdId: auth.householdId,
          date,
        });

        if (existing) {
          await plans.updateOne(
            { _id: existing._id },
            { $set: { meals, updatedAt: now } }
          );
          return { _id: existing._id.toString(), msg: 'Meal plan updated' };
        }

        const result = await plans.insertOne({
          householdId: auth.householdId!,
          date,
          meals,
          createdAt: now,
          updatedAt: now,
        } as never);
        return { _id: result.insertedId.toString(), msg: 'Meal plan created' };
      }),

    delete: withPermission('recipes:write')
      .input(z.object({ planId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const plans = await getMealPlansCollection();
        const result = await plans.deleteOne({
          _id: new ObjectId(input.planId),
          householdId: auth.householdId,
        });
        if (result.deletedCount === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Plan not found' });
        }
        return { msg: 'Plan removed' };
      }),
  }),

  /**
   * Curated recipe library — read-only catalog shipped with the app.
   * Sourced from `src/data/recipe-library.ts`. Users can browse and
   * import recipes into their household with `library.import`.
   */
  library: router({
    list: withPermission('recipes:read')
      .input(
        z
          .object({
            category: z.string().optional(),
            search: z.string().optional(),
          })
          .optional()
      )
      .query(({ input }) => {
        const search = input?.search?.toLowerCase().trim();
        const category = input?.category as LibraryCategory | undefined;
        const items = RECIPE_LIBRARY.filter((r) => {
          if (category && r.category !== category) return false;
          if (search) {
            const hay = (
              r.name +
              ' ' +
              r.tags.join(' ') +
              ' ' +
              (r.description ?? '')
            ).toLowerCase();
            if (!hay.includes(search)) return false;
          }
          return true;
        });
        return {
          categories: (
            Object.keys(CATEGORY_LABEL) as LibraryCategory[]
          ).map((key) => ({
            key,
            label: CATEGORY_LABEL[key],
            count: RECIPE_LIBRARY.filter((r) => r.category === key).length,
          })),
          items: items.map((r) => ({
            id: r.id,
            name: r.name,
            category: r.category,
            categoryLabel: CATEGORY_LABEL[r.category],
            cuisine: r.cuisine,
            servings: r.servings,
            prepTime: r.prepTime,
            cookTime: r.cookTime,
            difficulty: r.difficulty,
            tags: r.tags,
            ingredientCount: r.ingredients.length,
            sourceUrl: r.sourceUrl,
          })),
        };
      }),

    get: withPermission('recipes:read')
      .input(z.object({ id: z.string() }))
      .query(({ input }) => {
        const recipe = RECIPE_LIBRARY.find((r) => r.id === input.id);
        if (!recipe) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Library recipe not found',
          });
        }
        return {
          ...recipe,
          categoryLabel: CATEGORY_LABEL[recipe.category],
        };
      }),

    /**
     * Import a curated library recipe into the user's household recipes.
     * Skips silently if a recipe with the same name already exists.
     */
    import: withPermission('recipes:write')
      .input(z.object({ ids: z.array(z.string()).min(1) }))
      .mutation(async ({ input, ctx }) => {
        const auth = (ctx as unknown as { auth: AuthContext }).auth;
        const recipes = await getRecipesCollection();
        const now = new Date();

        const existingNames = new Set(
          (
            await recipes
              .find(
                { householdId: auth.householdId },
                { projection: { name: 1 } }
              )
              .toArray()
          ).map((r) => r.name.toLowerCase().trim())
        );

        const toInsert = input.ids
          .map((id) => RECIPE_LIBRARY.find((r) => r.id === id))
          .filter((r): r is (typeof RECIPE_LIBRARY)[number] => Boolean(r))
          .filter((r) => !existingNames.has(r.name.toLowerCase().trim()))
          .map((r) => ({
            householdId: auth.householdId!,
            name: r.name,
            description: r.description,
            servings: r.servings,
            prepTime: r.prepTime,
            cookTime: r.cookTime,
            ingredients: r.ingredients.map((i) => ({
              name: i.name,
              quantity: i.quantity,
              unit: i.unit,
              optional: i.optional ?? false,
            })),
            instructions: r.instructions,
            tags: [...r.tags, r.category],
            cuisine: r.cuisine,
            difficulty: r.difficulty,
            sourceUrl: r.sourceUrl,
            isFavorite: false,
            createdAt: now,
            updatedAt: now,
          }));

        if (toInsert.length === 0) {
          return { imported: 0, skipped: input.ids.length };
        }

        const result = await recipes.insertMany(toInsert as never);
        for (const id of Object.values(result.insertedIds)) {
          await auditHelpers.logCreate(
            auth.userId,
            auth.householdId!,
            'recipe',
            id as ObjectId,
            { source: 'library' }
          );
        }

        return {
          imported: toInsert.length,
          skipped: input.ids.length - toInsert.length,
        };
      }),
  }),
});
