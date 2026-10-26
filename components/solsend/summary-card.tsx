"use client";

import { Button } from '@/components/ui/button';
import { TokenKind, BATCH_SIZE } from '@/lib/solana';

interface SummaryCardProps {
  validCount: number;
  totalAmount: number;
  token: TokenKind;
  isConnected: boolean;
  isExecuting: boolean;
  isInsufficient: boolean;
  onExecute: () => void;
}

export function SummaryCard({
  validCount,
  totalAmount,
  token,
  isConnected,
  isExecuting,
  isInsufficient,
  onExecute,
}: SummaryCardProps) {
  const batchCount = Math.ceil(validCount / BATCH_SIZE[token]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="text-sm text-slate-500 mb-1">Valid Recipients</div>
        <div className="text-2xl font-bold">{validCount}</div>
      </div>
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="text-sm text-slate-500 mb-1">Total Amount</div>
        <div className={`text-2xl font-bold ${isInsufficient ? 'text-red-500' : ''}`}>
          {totalAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })} {token}
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="text-sm text-slate-500 mb-1">Batches (API)</div>
        <div className="text-2xl font-bold">{batchCount}</div>
      </div>
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="text-sm text-slate-500 mb-1">Action</div>
        <Button
          className="w-full h-8 mt-1"
          disabled={validCount === 0 || !isConnected || isExecuting || isInsufficient}
          onClick={onExecute}
        >
          {isExecuting ? 'Executing...' : 'Send Now'}
        </Button>
      </div>
    </div>
  );
}
