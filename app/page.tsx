'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useMemo, useCallback } from 'react';
import { useAppNetwork } from '@/components/solsend/solana-providers';
import { 
  parseRecipients, 
  deriveRecipients, 
  estimateCosts, 
  explorerTxUrl, 
  shortAddress,
  toBaseUnits,
  fromBaseUnits,
  type TokenKind,
  type ExecutionResult
} from '@/lib/solana';
import { executeMassPayout } from '@/lib/multihopper';
import { executePayout } from '@/lib/solana';
import { 
  Send, 
  Zap, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ExternalLink, 
  Sparkles,
  Trash2,
  Layers
} from 'lucide-react';

const DEMO_RECIPIENTS = `11111111111111111111111111111111, 0.005
22222222222222222222222222222222, 0.01
4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU, 0.002`;

export default function Home() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { network, setNetwork } = useAppNetwork();

  const [token, setToken] = useState<TokenKind>('SOL');
  const [useMultiHopper, setUseMultiHopper] = useState<boolean>(true);
  const [defaultAmount, setDefaultAmount] = useState<string>('0.01');
  const [inputText, setInputText] = useState<string>(DEMO_RECIPIENTS);
  const [results, setResults] = useState<Record<string, ExecutionResult>>({});
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [globalStatus, setGlobalStatus] = useState<string>('');

  const entries = useMemo(() => parseRecipients(inputText, defaultAmount), [inputText, defaultAmount]);
  const recipients = useMemo(() => deriveRecipients(entries, results, token), [entries, results, token]);

  const readyRecipients = useMemo(() => recipients.filter((r) => r.status === 'ready'), [recipients]);
  
  const totalAmountBaseUnits = useMemo(() => {
    const decimals = token === 'SOL' ? 9 : 6;
    return readyRecipients.reduce((sum, r) => {
      try {
        return sum + toBaseUnits(r.amount, decimals);
      } catch {
        return sum;
      }
    }, BigInt(0));
  }, [readyRecipients, token]);

  const totalAmountFormatted = useMemo(() => {
    const decimals = token === 'SOL' ? 9 : 6;
    return fromBaseUnits(totalAmountBaseUnits, decimals);
  }, [totalAmountBaseUnits, token]);

  const costs = useMemo(() => estimateCosts(readyRecipients.length, token), [readyRecipients.length, token]);

  const handleUpdateResults = useCallback((ids: string[], result: ExecutionResult) => {
    setResults((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        next[id] = result;
      }
      return next;
    });
  }, []);

  const handleExecutePayout = async () => {
    if (!publicKey) {
      setGlobalStatus('Błąd: Podłącz portfel przed rozpoczęciem transakcji.');
      return;
    }

    if (readyRecipients.length === 0) {
      setGlobalStatus('Błąd: Brak prawidłowych odbiorców do wysyłki.');
      return;
    }

    setIsProcessing(true);
    setGlobalStatus('Inicjalizacja wysyłki masowej...');

    try {
      if (useMultiHopper) {
        if (!signTransaction) {
          throw new Error('Wybrany portfel nie wspiera podpisywania transakcji.');
        }

        const signer = { publicKey, signTransaction };
        setGlobalStatus('Przetwarzanie przez trasę MultiHopper API...');
        
        const summary = await executeMassPayout({
          connection,
          signer,
          network,
          token,
          recipients: readyRecipients,
          onUpdate: handleUpdateResults,
        });

        setGlobalStatus(`Zakończono! Udane transakcje: ${summary.confirmed} z ${summary.total}.`);
      } else {
        if (!signAllTransactions) {
          throw new Error('Portfel nie wspiera masowego podpisywania signAllTransactions.');
        }

        const signer = { publicKey, signAllTransactions };
        setGlobalStatus('Wysyłanie bezpośrednich transakcji Solana...');

        const summary = await executePayout({
          connection,
          signer,
          network,
          token,
          recipients: readyRecipients,
          onUpdate: handleUpdateResults,
        });

        setGlobalStatus(`Zakończono! Pomyślnie wysłano: ${summary.confirmed} z ${summary.total}.`);
      }
    } catch (err: any) {
      console.error(err);
      setGlobalStatus(`Wystąpił błąd: ${err.message || 'Nieznany błąd transakcji'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <header className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center pb-6 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Zap className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black tracking-tight text-white">SolSend</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> MultiHopper
              </span>
            </div>
            <p className="text-xs text-slate-400">Web3 Mass Payout & Batch Dispatcher</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 text-sm text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="devnet">Devnet</option>
            <option value="mainnet-beta">Mainnet</option>
          </select>
          <WalletMultiButton />
        </div>
      </header>

      {/* Main Grid */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        
        {/* Left Column: Form & Configuration */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Options Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" /> Konfiguracja Przelewu
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Token</label>
                <div className="flex gap-2">
                  {(['SOL', 'USDC'] as TokenKind[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setToken(t)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-all ${
                        token === t 
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-950/40' 
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Domyślna Kwota ({token})</label>
                <input
                  type="text"
                  value={defaultAmount}
                  onChange={(e) => setDefaultAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  placeholder="np. 0.05"
                />
              </div>
            </div>

            {/* Router Selector */}
            <div className="mt-5 pt-5 border-t border-slate-800/80">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Trasa Wypłaty</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setUseMultiHopper(true)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    useMultiHopper
                      ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-sm flex items-center justify-between">
                    MultiHopper Route
                    {useMultiHopper && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Anonimizacja, batche do 20 adresów</div>
                </button>

                <button
                  onClick={() => setUseMultiHopper(false)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    !useMultiHopper
                      ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-sm flex items-center justify-between">
                    Direct Solana Batch
                    {!useMultiHopper && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Bezpośredni transfer natywny</div>
                </button>
              </div>
            </div>
          </div>

          {/* Recipients Input Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Lista Odbiorców (Adres, Kwota)
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setInputText(DEMO_RECIPIENTS)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                >
                  <Layers className="w-3.5 h-3.5" /> Wczytaj przykłady
                </button>
                <button
                  onClick={() => { setInputText(''); setResults({}); }}
                  className="text-xs text-slate-500 hover:text-slate-300 font-medium flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Wyczyść
                </button>
              </div>
            </div>

            <textarea
              rows={8}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="11111111111111111111111111111111, 0.05&#10;22222222222222222222222222222222, 0.10"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Right Column: Summary & Execution */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Summary Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm flex flex-col gap-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-400" /> Podsumowanie Zrzutu
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Prawidłowi odbiorcy</span>
                <span className="font-semibold text-white">{readyRecipients.length} / {recipients.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Łączna kwota do wysyłki</span>
                <span className="font-bold text-emerald-400">{totalAmountFormatted} {token}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Liczba transakcji (Batche)</span>
                <span className="font-medium text-slate-200">{costs.txCount} tx</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Szacowana opłata sieci</span>
                <span className="font-mono text-xs text-slate-400">~{(Number(costs.networkFeeLamports) / 1e9).toFixed(5)} SOL</span>
              </div>
            </div>

            <button
              onClick={handleExecutePayout}
              disabled={!publicKey || isProcessing || readyRecipients.length === 0}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed rounded-xl text-white font-bold transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Przetwarzanie...
                </>
              ) : publicKey ? (
                <>
                  <Send className="w-5 h-5" /> Wykonaj Zrzut ({readyRecipients.length} adresów)
                </>
              ) : (
                'Podłącz Portfel'
              )}
            </button>

            {globalStatus && (
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Status operacji</span>
                <p className="mt-1 text-xs text-emerald-400 font-mono break-words">{globalStatus}</p>
              </div>
            )}
          </div>

          {/* Recipients List Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm flex flex-col flex-1">
            <h3 className="text-sm font-bold text-white mb-3">Status Odbiorców ({recipients.length})</h3>

            <div className="overflow-y-auto max-h-[300px] space-y-2 pr-1">
              {recipients.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Brak zdefiniowanych odbiorców.</p>
              ) : (
                recipients.map((r) => (
                  <div key={r.id} className="p-2.5 bg-slate-950/80 border border-slate-800/60 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-slate-200">{shortAddress(r.address)}</span>
                      <span className="text-[10px] text-slate-400">{r.amount} {token}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {r.status === 'ready' && <span className="text-slate-400 bg-slate-800 px-2 py-0.5 rounded text-[10px]">Gotowy</span>}
                      {r.status === 'processing' && <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Wysyłanie</span>}
                      {r.status === 'confirmed' && (
                        <div className="flex items-center gap-1">
                          <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Sukces
                          </span>
                          {r.signature && (
                            <a
                              href={explorerTxUrl(r.signature, network)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-white p-1"
                              title="Zobacz w Solana Explorer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      )}
                      {(r.status === 'invalid' || r.status === 'failed' || r.status === 'duplicate') && (
                        <span className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded text-[10px] flex items-center gap-1" title={r.error}>
                          <XCircle className="w-3 h-3" /> {r.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
