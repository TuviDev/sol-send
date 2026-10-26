"use client";

import { useState } from 'react';
import { Search, Clock, Zap, CheckCircle2, XCircle, ExternalLink, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Network, TokenKind, ExecutionResult, explorerTxUrl, shortAddress } from '@/lib/solana';

interface RecipientsTableProps {
  results: ExecutionResult[];
  token: TokenKind;
  network: Network;
  handleExportCSV: () => void;
}

export function RecipientsTable({
  results,
  token,
  network,
  handleExportCSV,
}: RecipientsTableProps) {
  const [filterStatus, setFilterStatus] = useState<'all' | 'ready' | 'completed' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = results.filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (searchQuery && !r.address.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
          <Button variant={filterStatus === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus('all')}>
            All
          </Button>
          <Button variant={filterStatus === 'ready' ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus('ready')}>
            Ready
          </Button>
          <Button variant={filterStatus === 'completed' ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus('completed')}>
            Confirmed
          </Button>
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
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-950/90 backdrop-blur-sm z-10 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-500">Address</th>
              <th className="px-4 py-3 font-medium text-slate-500">Status</th>
              <th className="px-4 py-3 font-medium text-slate-500 text-right">Explorer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {filtered.length > 0 ? (
              filtered.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{shortAddress(r.address, 8)}</td>
                  <td className="px-4 py-3">
                    {r.status === 'ready' && <span className="inline-flex items-center gap-1.5 text-slate-500"><Clock className="w-4 h-4" /> Ready</span>}
                    {r.status === 'running' && <span className="inline-flex items-center gap-1.5 text-blue-500 animate-pulse"><Zap className="w-4 h-4" /> Processing...</span>}
                    {r.status === 'completed' && <span className="inline-flex items-center gap-1.5 text-green-500"><CheckCircle2 className="w-4 h-4" /> Confirmed</span>}
                    {r.status === 'failed' && <span className="inline-flex items-center gap-1.5 text-red-500"><XCircle className="w-4 h-4" /> Failed</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.signature ? (
                      <a href={explorerTxUrl(r.signature, network)} target="_blank" rel="noreferrer" className="inline-flex text-blue-500 hover:text-blue-600">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : '-'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-slate-500">
                  {searchQuery ? 'No matching addresses found.' : 'No valid recipients added yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
