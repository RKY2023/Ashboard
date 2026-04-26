# Phase 6 — Finance

Transactions, budgets, categories, accounts, recurring payments, and the analytics that tie it all together — including a grocery-spending bridge to Phase 5.

## What shipped

`server/trpc/routers/finance.ts` is one module exposing four sub-routers:

### `categories`
- `list` — all income/expense categories
- `create` — user-defined, with optional `parentId` and color/icon
- `delete` — refuses to delete `isSystem: true` categories

### `accounts`
- `list` — active accounts (checking/savings/credit/cash/investment) with current balance
- `create` — open a new account

### `transactions`
- `list` — filters: type, category, account, date range, free-text search; paginated, joins category names client-side
- `create` / `update` / `delete` — full CRUD with audit logging
- `groceryItemIds[]` lets a transaction be tagged as a grocery purchase, which feeds the cross-domain "Grocery Spending" widget

### `budgets`
- `list` — all configured budgets sorted by year/month desc
- `forCurrentMonth` — finds the current-month budget, joins it against this month's expense transactions, returns `{ totalLimit, spent, remaining, categories: [...with live spent...] }`
- `upsert` — create or update a monthly budget with per-category limits and alert thresholds

### `recurring`
- `list` — active recurring payments sorted by `nextDueDate`
- `upsert` — create/update a recurring (subscription, bill, salary, etc.)

### `reports`
- `summary({ month?, year? })` — `{ income, expense, net }` for a given month
- `byCategory({ month?, year?, type })` — pie-chart-ready totals per category (with display name & colour)
- `daily({ days })` — line-chart-ready `{ date, income, expense, net }` rows for the last N days
- `grocerySpending({ month?, year? })` — total spend on transactions linked to grocery items

### Page
- `src/app/(dashboard)/dashboard/finance/page.tsx` — stat cards (balance / income / expenses / net), 30-day cash-flow line chart, by-category pie chart, monthly-budget progress with per-category bars, grocery-spending tile, recent-transactions list, and a "New Transaction" modal that picks category by income/expense type.

## Schemas

```ts
Transaction {
  type: 'income' | 'expense',
  amount, currency,
  categoryId, accountId?,
  description, date, payee?,
  isRecurring, recurringId?,
  tags: string[],
  receiptUrl?,
  groceryItemIds?: ObjectId[]      // bridges to Phase 5
}

Budget {
  name, month, year, totalLimit,
  categories: { categoryId, name, limit, spent, alertThreshold }[]
}

RecurringPayment {
  name, type, amount, currency,
  categoryId, accountId?,
  frequency: 'daily'|'weekly'|'biweekly'|'monthly'|'quarterly'|'yearly',
  startDate, endDate?, nextDueDate, isActive
}
```

## Permissions

| Permission | Grants |
|------------|--------|
| `finance:read` | Lists, dashboards, reports |
| `finance:write` | Create / update transactions, budgets, accounts, recurring |
| `finance:delete` | Delete transactions, categories |
| `finance:reports` | Reserved for future "see all members' transactions" |

The current `member` role gets `finance:read + finance:write`, so members can log their own transactions; `finance:delete` is admin/owner only.

## Why these choices

- **Aggregations on the server** (`$group` by category, `$dateToString` by day) keep the page fast even with thousands of transactions and avoid shipping raw rows to the browser.
- **`forCurrentMonth` joins live spent** rather than caching a `spent` field on the budget — no drift, always accurate, and the budget document stays a definition not a counter.
- **`groceryItemIds` link** is intentionally a soft reference (no cascade) so deleting a grocery item doesn't blow up your transaction history.
- **Categories with `isSystem: true`** are reserved for seeded essentials (e.g. "Uncategorized") so the UI always has a fallback.

## Critical files

```
server/trpc/routers/finance.ts
src/app/(dashboard)/dashboard/finance/page.tsx
```
