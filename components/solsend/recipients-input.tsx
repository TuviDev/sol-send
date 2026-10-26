"use client";

import React, { useRef } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RecipientsInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  defaultAmount: number;
  setDefaultAmount: (amount: number) => void;
  demoRecipients: string;
}

export function RecipientsInput({
  inputText,
  setInputText,
  defaultAmount,
  setDefaultAmount,
  demoRecipients,
}: RecipientsInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setInputText(inputText ? `${inputText}\n${text}` : text);
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[500px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Recipients</h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setInputText(demoRecipients)}>
            Load Demo
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setInputText('')} className="text-red-500">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <label className="text-xs font-medium text-slate-500 whitespace-nowrap">Default Amount:</label>
        <input
          type="number"
          step="0.01"
          min="0.000001"
          value={defaultAmount}
          onChange={(e) => setDefaultAmount(parseFloat(e.target.value) || 0)}
          className="w-24 px-2 py-1 text-sm bg-slate-100 dark:bg-slate-800 border-0 rounded outline-none"
        />
      </div>

      <div
        className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4 mb-4 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-5 h-5 text-slate-400 mb-1" />
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Upload CSV / TXT File</span>
        <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.txt" onChange={handleFileUpload} />
      </div>

      <textarea
        className="flex-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm font-mono resize-none focus:ring-2 focus:ring-blue-500 outline-none"
        placeholder="Address,Amount&#10;7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU,0.5&#10;EjMyNzmFchKNxZBWLqA228CeUS48xZSD72wBdb1Bf34u,1.25"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
      />
    </div>
  );
}
