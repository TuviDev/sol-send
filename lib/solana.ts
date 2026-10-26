import { Connection, PublicKey, VersionedTransaction, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { MULTIHOPPER_MAX_DESTINATIONS } from './multihopper';

export type Network = 'devnet' | 'mainnet-beta';
export type TokenKind = 'SOL' | 'USDC';

export const TOKEN_DECIMALS: Record<TokenKind, number> = {
  SOL: 9,
  USDC: 6,
};

export const BATCH_SIZE: Record<TokenKind, number> = {
  SOL: MULTIHOPPER_MAX_DESTINATIONS,
  USDC: MULTIHOPPER_MAX_DESTINATIONS,
};

export const BASE_FEE_LAMPORTS = 5000;
export const ATA_RENT_LAMPORTS = 2_039_280;
export const LAMPORTS_PER_SOL = 1_000_000_000;

export const USDC_MINT: Record<Network, string> = {
  'mainnet-beta': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  devnet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
};

export interface RecipientParsed {
  address: string;
  amount: number;
}

export function isValidAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export function amountError(amount: number, token: TokenKind): string | null {
  if (isNaN(amount) || amount <= 0) return 'Amount must be greater than 0';
  const decimals = TOKEN_DECIMALS[token];
  const str = amount.toString();
  if (str.includes('.')) {
    const fraction = str.split('.')[1];
    if (fraction.length > decimals) return `Amount is too precise (max ${decimals} decimals)`;
  }
  return null;
}

export function parseRecipients(input: string, defaultAmount: number): RecipientParsed[] {
  const lines = input.split('\n');
  const results: RecipientParsed[] = [];
  
  for (const line of lines) {
    const cleaned = line.trim();
    if (!cleaned) continue;
    const parts = cleaned.split(/[,;\s\t]+/);
    const address = parts[0];
    
    if (isValidAddress(address)) {
      let amount = defaultAmount;
      if (parts.length > 1) {
        const parsedAmount = parseFloat(parts[1].replace(',', '.'));
        if (!isNaN(parsedAmount) && parsedAmount > 0) {
          amount = parsedAmount;
        }
      }
      results.push({ address, amount });
    }
  }
  return results;
}

export function deriveRecipients(parsed: RecipientParsed[], token: TokenKind) {
  const unique = new Map<string, number>();
  for (const { address, amount } of parsed) {
    unique.set(address, (unique.get(address) || 0) + amount);
  }
  
  const valid: RecipientParsed[] = [];
  let totalAmount = 0;
  let hasErrors = false;
  
  for (const [address, amount] of unique.entries()) {
    if (amountError(amount, token)) {
      hasErrors = true;
    } else {
      valid.push({ address, amount });
      totalAmount += amount;
    }
  }
  
  return { valid, totalAmount, hasErrors };
}

export async function estimateCosts(
  connection: Connection,
  recipients: string[],
  token: TokenKind,
  network: Network
) {
  const txFee = BASE_FEE_LAMPORTS * Math.ceil(recipients.length / BATCH_SIZE[token]);
  let ataRent = 0;
  
  if (token === 'USDC') {
    const mint = new PublicKey(USDC_MINT[network]);
    for (const address of recipients) {
      const pubkey = new PublicKey(address);
      const ata = getAssociatedTokenAddressSync(mint, pubkey);
      const info = await connection.getAccountInfo(ata);
      if (!info) {
        ataRent += ATA_RENT_LAMPORTS;
      }
    }
  }
  
  return {
    networkFeeSol: txFee / LAMPORTS_PER_SOL,
    ataRentSol: ataRent / LAMPORTS_PER_SOL,
    totalFeeSol: (txFee + ataRent) / LAMPORTS_PER_SOL
  };
}

export function toBaseUnits(amount: number, token: TokenKind): number {
  return Math.floor(amount * Math.pow(10, TOKEN_DECIMALS[token]));
}

export function explorerTxUrl(signature: string, network: Network): string {
  const cluster = network === 'devnet' ? '?cluster=devnet' : '';
  return `https://solscan.io/tx/${signature}${cluster}`;
}
