import { Connection, VersionedTransaction, Transaction } from '@solana/web3.js';
import { Network, TokenKind, Recipient, ExecutionResult, toBaseUnits, USDC_MINT } from './solana';

export const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112';
export const MULTIHOPPER_MAX_DESTINATIONS = 20;

export interface ExecutePayoutOptions {
  recipients: string[];
  amounts: number[];
  tokenKind: TokenKind;
  network: Network;
  onUpdate?: (updatedIds: string[], update: Partial<ExecutionResult>) => void;
}

export interface MultiHopperTransferResponse {
  transferId: string;
  status: string;
  keeperFundingTx?: string;
  routeInitTxs?: string[];
  orchestratorInitTx?: string;
  sessionInitTxs?: string[];
  dispersionInitTxs?: string[];
  error?: string;
}

function getApiBaseUrl(network: Network): string {
  return network === 'devnet'
    ? 'https://devnet.multihopper.com/api/v1'
    : 'https://multihopper.com/api/v1';
}

export async function deployTransfer(
  network: Network,
  payload: Record<string, any>
): Promise<MultiHopperTransferResponse> {
  const baseUrl = getApiBaseUrl(network);
  const response = await fetch(`${baseUrl}/transfers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`MultiHopper API Error (${response.status}): ${errText}`);
  }
  return response.json();
}

export async function signSendConfirm(
  wallet: any,
  network: Network,
  transferId: string,
  txs: {
    keeperFundingTx?: string;
    routeInitTxs?: string[];
    orchestratorInitTx?: string;
    sessionInitTxs?: string[];
    dispersionInitTxs?: string[];
  }
): Promise<void> {
  const baseUrl = getApiBaseUrl(network);
  const signedPayload: Record<string, any> = {};

  if (txs.keeperFundingTx) {
    const txBuf = Buffer.from(txs.keeperFundingTx, 'base64');
    let vtx: VersionedTransaction;
    try {
      vtx = VersionedTransaction.deserialize(txBuf);
    } catch {
      vtx = VersionedTransaction.deserialize(txBuf);
    }
    const signed = await wallet.signTransaction(vtx);
    signedPayload.keeperFundingSignature = Buffer.from(signed.serialize()).toString('base64');
  }

  const res = await fetch(`${baseUrl}/transfers/${transferId}/confirm-broadcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signedPayload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Confirm-broadcast failed (${res.status}): ${errText}`);
  }
}

export async function waitForTransfer(
  network: Network,
  transferId: string,
  timeoutMs = 480000
): Promise<MultiHopperTransferResponse> {
  const baseUrl = getApiBaseUrl(network);
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const res = await fetch(`${baseUrl}/transfers/${transferId}`);
    if (res.ok) {
      const data: MultiHopperTransferResponse = await res.json();
      if (['completed', 'failed', 'expired', 'refunded'].includes(data.status)) {
        return data;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error('MultiHopper transfer monitoring timed out.');
}

export async function executeMassPayout(
  wallet: any,
  connection: Connection,
  options: ExecutePayoutOptions
): Promise<{ success: boolean; confirmed: number; total: number; error?: string }> {
  const { recipients, amounts, tokenKind, network, onUpdate } = options;
  const tokenMint = tokenKind === 'SOL' ? NATIVE_SOL_MINT : USDC_MINT[network];

  const destinations = recipients.map((address, index) => ({
    address,
    amount: toBaseUnits(amounts[index], tokenKind).toString(),
  }));

  try {
    if (onUpdate) {
      recipients.forEach((address) => {
        onUpdate([address], { address, status: 'processing' });
      });
    }

    const payload = {
      tokenMint,
      hops: 3,
      arrivalSeconds: 600,
      destinations,
    };

    const transfer = await deployTransfer(network, payload);
    if (transfer.error) {
      throw new Error(transfer.error);
    }

    if (transfer.keeperFundingTx) {
      await signSendConfirm(wallet, network, transfer.transferId, {
        keeperFundingTx: transfer.keeperFundingTx,
      });
    }

    const finalState = await waitForTransfer(network, transfer.transferId);

    if (finalState.status === 'completed') {
      if (onUpdate) {
        recipients.forEach((address) => {
          onUpdate([address], { address, status: 'completed' });
        });
      }
      return { success: true, confirmed: recipients.length, total: recipients.length };
    } else {
      if (onUpdate) {
        recipients.forEach((address) => {
          onUpdate([address], { address, status: 'failed', error: `Status: ${finalState.status}` });
        });
      }
      return {
        success: false,
        confirmed: 0,
        total: recipients.length,
        error: `Transfer finished with status: ${finalState.status}`,
      };
    }
  } catch (err: any) {
    if (onUpdate) {
      recipients.forEach((address) => {
        onUpdate([address], { address, status: 'failed', error: err.message });
      });
    }
    return {
      success: false,
      confirmed: 0,
      total: recipients.length,
      error: err.message || 'Mass payout failed',
    };
  }
}
