/**
 * Unit conversion for the recipe matcher.
 *
 * Three dimensions: mass, volume, count. Each unit declares its conversion
 * factor to the canonical unit for its dimension (g for mass, ml for volume,
 * `unit` for count). Conversions across dimensions return null — a recipe
 * calling for "200g flour" cannot be satisfied by "1 cup flour" without a
 * density table, and we'd rather refuse than guess.
 */

export type UnitDimension = 'mass' | 'volume' | 'count';

interface UnitDef {
  dimension: UnitDimension;
  toCanonical: number;
  aliases: string[];
}

const UNITS: Record<string, UnitDef> = {
  // Mass — canonical: g
  g: { dimension: 'mass', toCanonical: 1, aliases: ['gram', 'grams'] },
  kg: { dimension: 'mass', toCanonical: 1000, aliases: ['kilogram', 'kilograms'] },
  mg: { dimension: 'mass', toCanonical: 0.001, aliases: ['milligram', 'milligrams'] },
  oz: { dimension: 'mass', toCanonical: 28.3495, aliases: ['ounce', 'ounces'] },
  lb: { dimension: 'mass', toCanonical: 453.592, aliases: ['pound', 'pounds', 'lbs'] },

  // Volume — canonical: ml
  ml: { dimension: 'volume', toCanonical: 1, aliases: ['milliliter', 'milliliters'] },
  l: { dimension: 'volume', toCanonical: 1000, aliases: ['liter', 'liters', 'litre', 'litres'] },
  tsp: { dimension: 'volume', toCanonical: 4.92892, aliases: ['teaspoon', 'teaspoons'] },
  tbsp: { dimension: 'volume', toCanonical: 14.7868, aliases: ['tablespoon', 'tablespoons'] },
  'fl oz': { dimension: 'volume', toCanonical: 29.5735, aliases: ['fluid ounce', 'fluid ounces', 'floz'] },
  cup: { dimension: 'volume', toCanonical: 236.588, aliases: ['cups', 'c'] },
  pint: { dimension: 'volume', toCanonical: 473.176, aliases: ['pints', 'pt'] },
  quart: { dimension: 'volume', toCanonical: 946.353, aliases: ['quarts', 'qt'] },
  gallon: { dimension: 'volume', toCanonical: 3785.41, aliases: ['gallons', 'gal'] },

  // Count — canonical: unit
  unit: { dimension: 'count', toCanonical: 1, aliases: ['piece', 'pieces', 'item', 'items', 'each', 'whole', 'units'] },
  can: { dimension: 'count', toCanonical: 1, aliases: ['cans', 'tin', 'tins'] },
  slice: { dimension: 'count', toCanonical: 1, aliases: ['slices'] },
  clove: { dimension: 'count', toCanonical: 1, aliases: ['cloves'] },
  pinch: { dimension: 'count', toCanonical: 1, aliases: ['pinches'] },
  dash: { dimension: 'count', toCanonical: 1, aliases: ['dashes'] },
};

const ALIAS_INDEX = (() => {
  const map = new Map<string, string>();
  for (const [key, def] of Object.entries(UNITS)) {
    map.set(key.toLowerCase(), key);
    for (const alias of def.aliases) {
      map.set(alias.toLowerCase(), key);
    }
  }
  return map;
})();

export function normalizeUnit(unit: string | null | undefined): { key: string; dimension: UnitDimension } | null {
  if (!unit) return null;
  const trimmed = unit.trim().toLowerCase();
  if (!trimmed) return null;
  const key = ALIAS_INDEX.get(trimmed);
  if (!key) return null;
  return { key, dimension: UNITS[key].dimension };
}

/**
 * Convert `quantity` from `fromUnit` to `toUnit`. Returns null when units
 * are unknown or belong to different dimensions (caller should treat as
 * "incompatible — can't satisfy this ingredient").
 */
export function convert(quantity: number, fromUnit: string, toUnit: string): number | null {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  if (!from || !to) return null;
  if (from.dimension !== to.dimension) return null;
  const canonical = quantity * UNITS[from.key].toCanonical;
  return canonical / UNITS[to.key].toCanonical;
}

export interface PantryComparison {
  hasEnough: boolean;
  /** Shortfall expressed in the recipe's unit, when comparable. */
  shortfall?: { quantity: number; unit: string };
  /** True when units couldn't be reconciled (different dimensions / unknown). */
  incompatible?: boolean;
}

/**
 * Compare what a recipe needs against what the pantry has. Both sides may
 * use different units within the same dimension.
 */
export function compareInPantry(
  recipeQty: number,
  recipeUnit: string,
  pantryQty: number,
  pantryUnit: string
): PantryComparison {
  // Same unit — fast path.
  if (recipeUnit.trim().toLowerCase() === pantryUnit.trim().toLowerCase()) {
    if (pantryQty >= recipeQty) return { hasEnough: true };
    return {
      hasEnough: false,
      shortfall: { quantity: recipeQty - pantryQty, unit: recipeUnit },
    };
  }

  const pantryInRecipeUnit = convert(pantryQty, pantryUnit, recipeUnit);
  if (pantryInRecipeUnit === null) {
    return { hasEnough: false, incompatible: true };
  }
  if (pantryInRecipeUnit >= recipeQty) return { hasEnough: true };
  return {
    hasEnough: false,
    shortfall: {
      quantity: recipeQty - pantryInRecipeUnit,
      unit: recipeUnit,
    },
  };
}
