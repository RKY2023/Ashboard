'use client';

import { useMemo, useRef, useState, type DragEvent } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Lock,
  Upload,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/src/app/providers';
import { cn } from '@/lib/utils';

type Format = 'sbi-csv' | 'sbi-xlsx';

interface ImportResult {
  accountLast4: string;
  rowsParsed: number;
  rowsSkipped: number;
  created: number;
  updated: number;
  duplicate: number;
  failed: number;
}

export default function ImportStatementPage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [accountOverride, setAccountOverride] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const importMut = trpc.integrations.expense.importStatement.useMutation({
    onSuccess: (res) => {
      setResult(res);
      utils.finance.invalidate();
      toast.success(
        `${res.created} new, ${res.duplicate} duplicate${
          res.failed ? `, ${res.failed} failed` : ''
        }`
      );
    },
    onError: (e) => {
      setResult(null);
      toast.error(e.message);
    },
  });

  const format: Format = useMemo<Format>(() => detectFormat(file), [file]);
  const needsPassword = format === 'sbi-xlsx';

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) selectFile(dropped);
  };

  const selectFile = (f: File) => {
    setFile(f);
    setResult(null);
  };

  const handleImport = async () => {
    if (!file) return;
    if (needsPassword && !password) {
      toast.error('Password required for encrypted SBI files');
      return;
    }
    try {
      const content =
        format === 'sbi-csv' ? await file.text() : await fileToBase64(file);
      importMut.mutate({
        format,
        content,
        password: needsPassword ? password : undefined,
        accountLast4Override:
          accountOverride.length === 4 ? accountOverride : undefined,
      });
    } catch (err) {
      toast.error(
        `Could not read file: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href="/dashboard/finance"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Finance
        </Link>
        <h1 className="text-2xl font-bold mt-2">Import statement</h1>
        <p className="text-muted-foreground">
          Drop an SBI account-statement export to ingest its transactions.
          Re-uploading the same file is safe — duplicates are detected
          automatically.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/40 hover:bg-accent/30'
        )}
      >
        <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="font-medium">Drag & drop your statement here</p>
        <p className="text-sm text-muted-foreground mt-1">
          or click to browse — supports .xlsx (encrypted), .xls, .csv
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) selectFile(f);
          }}
        />
      </div>

      {file && (
        <div className="rounded-xl border border-border bg-background p-4 space-y-4">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="w-8 h-8 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(file.size)} · {labelFormat(format)}
              </p>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setResult(null);
                setPassword('');
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Remove
            </button>
          </div>

          {needsPassword && (
            <div>
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Statement password"
                autoComplete="off"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                SBI&apos;s default is the first 4 letters of your name in CAPS
                + your DOB as DDMMYYYY (e.g.{' '}
                <code className="font-mono">RAJK01011990</code>).
              </p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">
              Account last 4 (optional override)
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={accountOverride}
              onChange={(e) =>
                setAccountOverride(e.target.value.replace(/\D/g, ''))
              }
              placeholder="Auto-detected from file"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background"
            />
          </div>

          <button
            onClick={handleImport}
            disabled={importMut.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {importMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Import
          </button>
        </div>
      )}

      {importMut.error && !result && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 flex gap-3">
          <XCircle className="w-5 h-5 text-destructive shrink-0" />
          <div>
            <p className="font-medium text-destructive">Import failed</p>
            <p className="text-sm text-destructive/80">
              {importMut.error.message}
            </p>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-border bg-background p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <p className="font-medium">
              Done — account ****{result.accountLast4}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <ResultStat label="Created" value={result.created} tone="positive" />
            <ResultStat label="Updated" value={result.updated} />
            <ResultStat label="Duplicate" value={result.duplicate} />
            <ResultStat
              label="Failed"
              value={result.failed}
              tone={result.failed ? 'negative' : undefined}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {result.rowsParsed} rows parsed, {result.rowsSkipped} skipped.
          </p>
          <Link
            href="/dashboard/finance"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View transactions →
          </Link>
        </div>
      )}
    </div>
  );
}

function ResultStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'positive' | 'negative';
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'text-xl font-semibold',
          tone === 'positive' && 'text-emerald-600',
          tone === 'negative' && 'text-destructive'
        )}
      >
        {value}
      </p>
    </div>
  );
}

function detectFormat(file: File | null): Format {
  if (!file) return 'sbi-csv';
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.csv')) return 'sbi-csv';
  return 'sbi-xlsx';
}

function labelFormat(f: Format): string {
  return f === 'sbi-csv' ? 'CSV' : 'XLSX (encrypted ok)';
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  // Chunked conversion — `String.fromCharCode(...bytes)` blows the stack on
  // multi-MB files.
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + CHUNK))
    );
  }
  return btoa(binary);
}
