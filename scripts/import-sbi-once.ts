/**
 * One-shot SBI statement importer.
 *
 *   tsx --env-file=.env scripts/import-sbi-once.ts \
 *       <path-to-xlsx>  <password>  [<user-email>]
 *
 * Resolves the user (default: xraj2023@gmail.com), looks up their first
 * active household membership, decrypts the SBI xlsx, runs each row through
 * the same `ingestParsed` pipeline used by the tRPC procedure (so dedupe,
 * categorisation, and account auto-creation behave identically), and prints
 * a summary.
 *
 * Re-running is safe — the dedupe index turns repeats into `duplicate`s.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  getUsersCollection,
  getHouseholdMembersCollection,
} from '@/src/lib/db/collections';
import { closeDatabase } from '@/lib/mongodb';
import {
  parseSbiXlsx,
  sbiXlsxRowToParsed,
} from '@/src/lib/expense/xlsx/sbi-xlsx';
import { ingestParsed } from '@/src/lib/expense/ingest';

async function main() {
  const [filePathArg, passwordArg, emailArg] = process.argv.slice(2);
  const filePath =
    filePathArg ??
    resolve(process.cwd(), 'AccountStatement_03052026_181129.xlsx');
  const password = passwordArg ?? process.env.SBI_STATEMENT_PASSWORD;
  const email = (emailArg ?? 'xraj2023@gmail.com').toLowerCase();

  if (!password) {
    console.error(
      'Password required. Pass as argv[2] or set SBI_STATEMENT_PASSWORD.'
    );
    process.exit(1);
  }

  console.log(`→ Looking up user ${email}...`);
  const users = await getUsersCollection();
  const user = await users.findOne({ email, isActive: true });
  if (!user) {
    console.error(`User ${email} not found (or inactive).`);
    process.exit(1);
  }

  const members = await getHouseholdMembersCollection();
  const member = await members.findOne({
    userId: user._id,
    isActive: true,
  });
  if (!member) {
    console.error(
      `User ${email} has no active household membership. Create a household first.`
    );
    process.exit(1);
  }
  console.log(`  household ${member.householdId.toHexString()} (role: ${member.role})`);

  console.log(`→ Reading + decrypting ${filePath}...`);
  const buf = readFileSync(filePath);
  const parsed = await parseSbiXlsx(buf, { password });
  console.log(
    `  parsed ${parsed.rows.length} rows, ${parsed.skipped} skipped, ` +
      `account ****${parsed.accountLast4 ?? '????'}, ${parsed.errors.length} errors`
  );

  if (!parsed.accountLast4) {
    console.error('Could not detect account last4 from file. Aborting.');
    process.exit(1);
  }

  let created = 0;
  let updated = 0;
  let duplicate = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const row of parsed.rows) {
    const ptx = sbiXlsxRowToParsed(row, parsed.accountLast4);
    const result = await ingestParsed(ptx, { householdId: member.householdId });
    if (!result.ok) {
      failed += 1;
      failures.push(`${row.txnDate.toISOString().slice(0, 10)} ${row.description}: ${result.reason}`);
      continue;
    }
    if (result.status === 'created') created += 1;
    else if (result.status === 'updated') updated += 1;
    else duplicate += 1;
  }

  console.log('\n=== Import summary ===');
  console.log(`  Created:   ${created}`);
  console.log(`  Updated:   ${updated}`);
  console.log(`  Duplicate: ${duplicate}`);
  console.log(`  Failed:    ${failed}`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures.slice(0, 10)) console.log(`  - ${f}`);
    if (failures.length > 10) console.log(`  ... and ${failures.length - 10} more`);
  }

  await closeDatabase();
}

main().catch(async (err) => {
  console.error('Script failed:', err);
  await closeDatabase().catch(() => {});
  process.exit(1);
});
