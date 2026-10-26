"use client";

import { useState, useMemo, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAppNetwork } from './solana-providers';
import { useBalances } from '@/hooks/use-balances';
import { parseRecipients, deriveRecipients, explorerTxUrl, TokenKind, ExecutionResult } from '@/lib/solana';
import { executeMassPayout } from '@/lib/multihopper';
import { AppHeader } from './app-header';
import { RecipientsInput } from './recipients-input';
import { RecipientsTable } from './recipients-table';
import { SummaryCard } from './summary-card';

export function PayoutApp() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { network, setNetwork, connection } = useAppNetwork();
  const wallet = useWallet();
  const balances = useBalances(wallet.publicKey?.toBase58() || null, network);

  const [token, setToken] = useState<TokenKind>('SOL');
  const [defaultAmount, setDefaultAmount] = useState<number>(0.1);
  const [inputText, setInputText] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [results, setResults] = useState<ExecutionResult[]>([]);

  const DEMO_RECIPIENTS = `7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU,0.5\nEjMyNzmFchKNxZBWLqA228CeUS48xZSD72wBdb1Bf34u,1.25`;

  const { valid, totalAmount } = useMemo(() => {
    const parsed = parseRecipients(inputText, defaultAmount);
    return deriveRecipients(parsed, token);
  }, [inputText, defaultAmount, token]);

  useEffect(() => {
    if (valid.length > 0 && results.length === 0) {
      setResults(valid.map(v => ({ address: v.address, status: 'ready' })));
    } else if (valid.length === 0) {
      setResults([]);
    }
  }, [valid.length]);

  const handleExportCSV = () => {
    const header = "Address,Status,ExplorerURL\n";
    const rows = results.map(r => {
      const url = r.signature ? explorerTxUrl(r.signature, network) : '';
      return `${r.address},${r.status},${url}`;
    }).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solsend-export-${Date.now()}.csv`;
    a.click();
  };

  const handleExecute = async () => {
    if (!wallet.connected || !wallet.signAllTransactions) {
      setStatusMsg('Please connect a compatible wallet.');
      return;
    }

    setIsExecuting(true);
    setStatusMsg('Preparing MultiHopper privacy routes...');

    const addresses = valid.map(v => v.address);
    const amounts = valid.map(v => v.amount);

    try {
      const result = await executeMassPayout(wallet as any, connection, {
        recipients: addresses,
        amounts,
        tokenKind: token,
        network,
      });

      if (result.success) {
        setStatusMsg('Payout successfully broadcasted!');
        setResults(prev => prev.map(r => ({ ...r, status: 'completed' })));
        balances.mutate();
      } else {
        setStatusMsg(`Error: ${result.error}`);
        setResults(prev => prev.map(r => ({ ...r, status: 'failed' })));
      }
    } catch (err: any) {
      setStatusMsg(`Execution failed: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const currentBalance = token === 'SOL' ? balances.sol : balances.usdc;
  const isInsufficient = currentBalance !== null && totalAmount > currentBalance;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <AppHeader
        network={network}
        setNetwork={setNetwork}
        solBalance={balances.sol}
        usdcBalance={balances.usdc}
        mounted={mounted}
      />

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <RecipientsInput
            inputText={inputText}
            setInputText={setInputText}
            defaultAmount={defaultAmount}
            setDefaultAmount={setDefaultAmount}
            demoRecipients={DEMO_RECIPIENTS}
          />
        </div>

        <div className="lg:col-span-8 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
          <SummaryCard
            validCount={valid.length}
            totalAmount={totalAmount}
            token={token}
            isConnected={wallet.connected}
            isExecuting={isExecuting}
            isInsufficient={isInsufficient}
            onExecute={handleExecute}
          />

          {statusMsg && (
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-3 rounded-lg border border-blue-200 dark:border-blue-800 text-sm font-medium text-center">
              {statusMsg}
            </div>
          )}

          <RecipientsTable
            results={results}
            token={token}
            network={network}
            handleExportCSV={handleExportCSV}
          />
        </div>
      </main>
    </div>
  );
}
