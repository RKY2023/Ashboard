import { ObjectId } from 'mongodb';
import {
  getExpenseRulesCollection,
  getFinanceCategoriesCollection,
} from '@/src/lib/db';
import type { CategorySource } from '@/src/types';
import { normalisePayee } from './dedupe';

export interface CategoriseInput {
  householdId: ObjectId;
  payee: string;
  type: 'income' | 'expense';
}

export interface CategoriseResult {
  categoryId: ObjectId;
  source: CategorySource;
}

const MERCHANT_DICT: Array<{ pattern: RegExp; key: string }> = [
  { pattern: /\b(zomato|swiggy|dominos|kfc|mcdonald|pizza|burger)\b/i, key: 'food' },
  { pattern: /\b(uber|ola|rapido|metro|irctc|petrol|fuel)\b/i, key: 'transport' },
  { pattern: /\b(bigbasket|blinkit|zepto|dmart|grofers|instamart|grocery)\b/i, key: 'groceries' },
  { pattern: /\b(amazon|flipkart|myntra|ajio|nykaa|meesho)\b/i, key: 'shopping' },
  { pattern: /\b(airtel|jio|vi |vodafone|tata\s*power|adani|bescom|electricity|gas|water)\b/i, key: 'bills' },
  { pattern: /\b(netflix|prime|hotstar|spotify|youtube)\b/i, key: 'entertainment' },
  { pattern: /\b(apollo|pharmeasy|1mg|practo|hospital|clinic)\b/i, key: 'health' },
];

const FALLBACK_NAMES: Record<string, string> = {
  food: 'Food & Dining',
  transport: 'Transport',
  groceries: 'Groceries',
  shopping: 'Shopping',
  bills: 'Bills & Utilities',
  entertainment: 'Entertainment',
  health: 'Health',
};

/**
 * Resolve a categoryId for a parsed transaction. Order:
 *   1. household-defined `expense_rules` (regex on payee)
 *   2. seeded merchant dictionary, mapped to a finance category by name
 *   3. household's "Uncategorized" / Other category for the txn type
 *
 * Always returns a categoryId (the schema requires one). If the household
 * has no matching category at all, an "Uncategorized" category is created
 * lazily so we never block ingestion on missing seed data.
 */
export async function categorise(
  input: CategoriseInput
): Promise<CategoriseResult> {
  const rules = await getExpenseRulesCollection();
  const userRules = await rules
    .find({ householdId: input.householdId, isActive: true })
    .sort({ priority: -1 })
    .toArray();

  for (const rule of userRules) {
    try {
      if (new RegExp(rule.payeeRegex, 'i').test(input.payee)) {
        return { categoryId: rule.categoryId, source: 'rule' };
      }
    } catch {
      // Bad regex stored in DB — skip rather than fail ingestion.
    }
  }

  const categories = await getFinanceCategoriesCollection();
  const householdCategories = await categories
    .find({ householdId: input.householdId, type: input.type })
    .toArray();

  for (const dict of MERCHANT_DICT) {
    if (!dict.pattern.test(input.payee)) continue;
    const target = FALLBACK_NAMES[dict.key];
    const match = householdCategories.find(
      (c) => normalisePayee(c.name) === normalisePayee(target)
    );
    if (match) return { categoryId: match._id, source: 'dict' };
  }

  const uncategorized = householdCategories.find(
    (c) => normalisePayee(c.name) === 'uncategorized'
  );
  if (uncategorized) {
    return { categoryId: uncategorized._id, source: 'manual' };
  }

  const now = new Date();
  const created = await categories.insertOne({
    householdId: input.householdId,
    name: 'Uncategorized',
    type: input.type,
    isSystem: true,
    createdAt: now,
    updatedAt: now,
  } as never);
  return { categoryId: created.insertedId, source: 'manual' };
}
