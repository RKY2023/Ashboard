import type { TransactionSource } from '@/src/types';

export type ParsedTxnType = 'expense' | 'income';

export interface ParsedTxn {
  parserId: string;
  source: TransactionSource;
  type: ParsedTxnType;
  // Always positive. Sign is carried by `type`.
  amount: number;
  currency: string;
  date: Date;
  payee: string;
  description?: string;
  accountLast4?: string;
  issuer?: string;
  refId?: string;
  origCurrency?: string;
  origAmount?: number;
  raw?: string;
}

export type ParserChannel = 'email' | 'sms';

export interface ParserInput {
  channel: ParserChannel;
  fromAddress?: string;
  fromSender?: string;
  subject?: string;
  body: string;
  receivedAt?: Date;
}

export interface ExpenseParser {
  id: string;
  issuer: string;
  channels: ParserChannel[];
  matches(input: ParserInput): boolean;
  parse(input: ParserInput): ParsedTxn | null;
}
