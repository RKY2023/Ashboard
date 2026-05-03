import type { ExpenseParser, ParsedTxn, ParserInput } from '../types';
import { hdfcDebitParser } from './hdfc-debit';
import { sbiDebitParser } from './sbi-debit';

export const PARSERS: ExpenseParser[] = [hdfcDebitParser, sbiDebitParser];

export interface RunParserResult {
  parsed: ParsedTxn | null;
  parserId?: string;
  matchedButFailed?: boolean;
}

/**
 * Run the parser registry against a single email/SMS body. Returns the first
 * parser that both matches the source and successfully parses the body.
 *
 * `matchedButFailed` is set when a parser claimed the source (e.g. by sender
 * address) but couldn't extract a transaction — that's a parse-failure case
 * worth logging to `expense_sync_failures`.
 */
export function runParsers(input: ParserInput): RunParserResult {
  let firstMatched: string | undefined;
  for (const parser of PARSERS) {
    if (!parser.channels.includes(input.channel)) continue;
    if (!parser.matches(input)) continue;
    if (!firstMatched) firstMatched = parser.id;
    const parsed = parser.parse(input);
    if (parsed) {
      return { parsed, parserId: parser.id };
    }
  }
  if (firstMatched) {
    return { parsed: null, parserId: firstMatched, matchedButFailed: true };
  }
  return { parsed: null };
}

export { hdfcDebitParser } from './hdfc-debit';
export { sbiDebitParser } from './sbi-debit';
