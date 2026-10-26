"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Search, Upload, Zap, Trash2, CheckCircle2, XCircle, Clock, ExternalLink, ShieldCheck, FileDown, LogOut } from 'lucide-react';
import { useAppNetwork } from '@/components/solsend/solana-providers';
import { useBalances } from '@/hooks/use-balances';
import { parseRecipients, deriveRecipients, explorerTxUrl, amountError, BATCH_SIZE } from '@/lib/solana';
import { executeMassPayout } from '@/lib/multihopper';
import { Button } from '@/components/ui/button';

export default function AppDashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { network, setNetwork, connection } = useAppNetwork();
  const wallet = useWallet();
  const balances = useBalances(wallet.publicKey?.toBase58() || null, network);
  
  const [token, setToken] = useState<'SOL' | 'USDC'>('SOL');
  const [defaultAmount, setDefaultAmount] = useState<number>(0.1);
  const [inputText, setInputText] = useState('');
  const [routingMode, setRoutingMode] = useState<'multihopper' | 'direct'>('multihopper');
  
  const [isExecuting, setIsExecuting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [results, setResults] = useState<Array<{ address: string; status: 'ready' | 'running' | 'completed' | 'failed'; signature?: string }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ready' | 'completed' | 'failed'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const DEMO_RECIPIENTS = `7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU,0.5\nEjMyNzmFchKNxZBWLqA228CeUS48xZSD72wBdb1Bf34u,1.25`;

  const { valid, totalAmount, hasErrors } = useMemo(() => {
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setInputText((prev) => prev + (prev ? '\n' : '') + text);
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    const header = "Address,Amount,Token,Status,ExplorerURL\n";
    const rows = results.map(r => {
      const v = valid.find(x => x.address === r.address);
      const url = r.signature ? explorerTxUrl(r.signature, network) : '';
      return `${r.address},${v?.amount || 0},${token},${r.status},${url}`;
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
        network
      });
      
      if (result.success) {
        setStatusMsg('Payout successfully broadcasted and confirmed!');
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
  
  const filteredResults = results.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (searchQuery && !r.address.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 rounded-lg text-white"><Zap className="w-5 h-5" /></div>
            <h1 className="text-xl font-bold tracking-tight">SolSend</h1>
            <span className="hidden sm:inline-flex px-2 py-0.5 ml-2 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 rounded-full border border-purple-200 dark:border-purple-500/30">
              MultiHopper Powered
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {mounted && wallet.connected && currentBalance !== null && (
              <div className="hidden sm:block text-sm font-medium px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                {currentBalance.toLocaleString()} {token}
              </div>
            )}
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value as any)}
              className="bg-slate-100 dark:bg-slate-800 text-sm border-0 rounded-md px-3 py-2 outline-none"
            >
              <option value="devnet">Devnet</option>
              <option value="mainnet-beta">Mainnet</option>
            </select>
            
            {mounted ? (
              <div className="flex items-center gap-2">
                <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 !h-10 !rounded-md transition-colors" />
                {wallet.connected && (
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    onClick={() => wallet.disconnect()} 
                    title="Disconnect Wallet"
                    className="h-10 w-10 shrink-0"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ) : (
              <Button disabled className="h-10">Loading...</Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          {/* Config */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-500 mb-1.5 block">Token</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant={token === 'SOL' ? 'default' : 'outline'} onClick={() => setToken('SOL')}>SOL</Button>
                  <Button variant={token === 'USDC' ? 'default' : 'outline'} onClick={() => setToken('USDC')}>USDC</Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500 mb-1.5 block">Routing Engine</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant={routingMode === 'multihopper' ? 'default' : 'outline'} className="bg-purple-600 hover:bg-purple-700" onClick={() => setRoutingMode('multihopper')}>MultiHopper</Button>
                  <Button variant={routingMode === 'direct' ? 'default' : 'outline'} onClick={() => setRoutingMode('direct')} disabled>Direct</Button>
                </div>
              </div>
            </div>
          </div>

          {/* Input Panel */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[500px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recipients</h2>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setInputText(DEMO_RECIPIENTS)}>Load Demo</Button>
                <Button variant="ghost" size="sm" onClick={() => setInputText('')} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
            
            <div 
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 mb-4 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-6 h-6 text-slate-400 mb-2" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Upload CSV / TXT</span>
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.txt" onChange={handleFileUpload} />
            </div>

            <textarea
              className="flex-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm font-mono resize-none focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Address,Amount&#10;7xKXtg2...,0.5&#10;EjMyNzm...,1.25"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>
          
          {/* Edu Panel */}
          {routingMode === 'multihopper' && (
            <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-xl border border-purple-200 dark:border-purple-800/50">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-semibold text-purple-900 dark:text-purple-200">Privacy Enforced</h3>
              </div>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                MultiHopper splits and routes your payout through 3 intermediary wallets (hops) to anonymize the source of funds.
              </p>
            </div>
          )}
        </div>

        <div className="lg:col-span-8 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-sm text-slate-500 mb-1">Valid Recipients</div>
              <div className="text-2xl font-bold">{valid.length}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-sm text-slate-500 mb-1">Total Amount</div>
              <div className={`text-2xl font-bold ${isInsufficient ? 'text-red-500' : ''}`}>
                {totalAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })} {token}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-sm text-slate-500 mb-1">Batches (API)</div>
              <div className="text-2xl font-bold">{Math.ceil(valid.length / BATCH_SIZE[token])}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-sm text-slate-500 mb-1">Action</div>
              <Button 
                className="w-full h-8 mt-1" 
                disabled={valid.length === 0 || !wallet.connected || isExecuting || isInsufficient}
                onClick={handleExecute}
              >
                {isExecuting ? 'Executing...' : 'Send Now'}
              </Button>
            </div>
          </div>
          
          {isInsufficient && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg border border-red-200 dark:border-red-800 text-sm font-medium text-center">
              Insufficient {token} balance in your wallet. (Available: {currentBalance || 0})
            </div>
          )}
          
          {statusMsg && (
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-3 rounded-lg border border-blue-200 dark:border-blue-800 text-sm font-medium text-center">
              {statusMsg}
            </div>
          )}

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex gap-2">
                <Button variant={filterStatus === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus('all')}>All</Button>
                <Button variant={filterStatus === 'ready' ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus('ready')}>Ready</Button>
                <Button variant={filterStatus === 'completed' ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus('completed')}>Confirmed</Button>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search addresses..." 
                    className="pl-9 pr-4 py-1.5 bg-slate-100 dark:bg-slate-800 border-0 rounded-md text-sm outline-none w-48 focus:w-64 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={results.length === 0}>
                  <FileDown className="w-4 h-4 mr-2" /> Export
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-950/90 backdrop-blur-sm z-10 border-b border-slate-200 dark:border-slate-800 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 font-medium text-slate-500">Address</th>
                    <th className="px-4 py-3 font-medium text-slate-500">Amount</th>
                    <th className="px-4 py-3 font-medium text-slate-500">Status</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-right">Explorer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {filteredResults.length > 0 ? filteredResults.map((r, i) => {
                    const parsedData = valid.find(v => v.address === r.address);
                    return (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs truncate max-w-[200px]">{r.address}</td>
                        <td className="px-4 py-3 font-medium">{parsedData?.amount || 0} {token}</td>
                        <td className="px-4 py-3">
                          {r.status === 'ready' && <span className="inline-flex items-center gap-1.5 text-slate-500"><Clock className="w-4 h-4"/> Ready</span>}
                          {r.status === 'running' && <span className="inline-flex items-center gap-1.5 text-blue-500 animate-pulse"><Zap className="w-4 h-4"/> Processing...</span>}
                          {r.status === 'completed' && <span className="inline-flex items-center gap-1.5 text-green-500"><CheckCircle2 className="w-4 h-4"/> Confirmed</span>}
                          {r.status === 'failed' && <span className="inline-flex items-center gap-1.5 text-red-500"><XCircle className="w-4 h-4"/> Failed</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {r.signature ? (
                            <a href={explorerTxUrl(r.signature, network)} target="_blank" rel="noreferrer" className="inline-flex text-blue-500 hover:text-blue-600">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                        {searchQuery ? 'No matching addresses found.' : 'No valid recipients. Paste addresses on the left to begin.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
