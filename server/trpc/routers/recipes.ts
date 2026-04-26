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
   * "What can I cook?" — match recipes against current pantry contents
   * Returns recipes ranked by ingredient match coverage.
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
      const pantryNames = new Set(
        pantry.map((p) => p.name.toLowerCase().trim())
      );

      const all = await recipes
        .find({ householdId: auth.householdId })
        .toArray();

      const ranked = all
        .map((r) => {
          const required = r.ingredients.filter((i) => !i.optional);
          const matches = required.filter((i) =>
            pantryNames.has(i.name.toLowerCase().trim())
          );
          const matchPct =
            required.length === 0
              ? 100
              : (matches.length / required.length) * 100;
          const missing = required
            .filter((i) => !pantryNames.has(i.name.toLowerCase().trim()))
            .map((i) => ({
              name: i.name,
              quantity: i.quantity,
              unit: i.unit,
            }));
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
            missing,
          };
        })
        .filter((r) => r.matchPct >= input.minMatchPct)
        .sort((a, b) => b.matchPct - a.matchPct)
        .slice(0, input.limit);

      return ranked;
    }),

  /**
   * Generate a shopping list of missing ingredients for a recipe
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

      return recipe.ingredients
        .filter((ing) => {
          const stock = pantryByName.get(ing.name.toLowerCase().trim());
          return !stock || stock.quantity < ing.quantity;
        })
        .map((ing) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          category: 'pantry',
        }));
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
});
