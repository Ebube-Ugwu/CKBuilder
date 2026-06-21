import { connect } from "@joyid/ckb";
import { ccc } from "@ckb-ccc/core";
import { cccClient } from "#/lib/ccc-client";
import {
  createLock as createTimeLock,
  fetchUserLocks,
  unlockLock as withdrawLock,
  capacityOf,
  lockedBalanceOf,
  shannonToCKB,
  type TimeLockCell,
} from "#/lib/ckb";
import { create } from "zustand";

const PRIV_KEY = process.env.CKB_PRIVKEY || localStorage.getItem("ckbPrivKey") || "";
export type SignerMode = "devnet" | "joyid";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms),
    ),
  ]);
}

interface WalletState {
  address: string | null;
  isConnected: boolean;
  signer: ccc.Signer | null;
  signerMode: SignerMode;
  pubkey: string;
  keyType: string;
  alg: number;
  ethAddress: string;
  locks: TimeLockCell[];
  balance: number;
  lockedBalance: number;
  isLoading: boolean;
  error: string | null;
  connectWallet: () => Promise<void>;
  disconnect: () => void;
  fetchLocks: () => Promise<void>;
  createLock: (amount: string, unlockTimestamp: number) => Promise<void>;
  unlockLock: (cell: TimeLockCell) => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  address: null,
  isConnected: false,
  signer: null,
  signerMode: "devnet",
  pubkey: "",
  keyType: "",
  alg: 0,
  ethAddress: "",
  locks: [],
  balance: 0,
  lockedBalance: 0,
  isLoading: false,
  error: null,

  connectWallet: async () => {
    try {
      set({ isLoading: true, error: null });
      const auth = await withTimeout(connect(), 120_000, "Connection");
      const addr = await ccc.Address.fromString(auth.address, cccClient);
      const signer = PRIV_KEY
        ? new ccc.SignerCkbPrivateKey(cccClient, PRIV_KEY)
        : new ccc.SignerCkbScriptReadonly(cccClient, addr.script);
      const mode: SignerMode = PRIV_KEY ? "devnet" : "joyid";
      set({
        address: auth.address,
        isConnected: true,
        signer,
        signerMode: mode,
        pubkey: auth.pubkey,
        keyType: auth.keyType,
        alg: auth.alg,
        ethAddress: auth.ethAddress,
        isLoading: false,
      });
      const [bal, locked] = await Promise.all([
        withTimeout(capacityOf(auth.address), 30_000, "Balance fetch"),
        withTimeout(lockedBalanceOf(auth.address), 30_000, "Locked balance fetch"),
      ]);
      set({
        balance: shannonToCKB(bal),
        lockedBalance: shannonToCKB(locked),
      });
    } catch (e) {
      set({ isLoading: false, error: (e as Error).message });
      throw e;
    }
  },

  disconnect: () => {
    set({
      address: null,
      isConnected: false,
      signer: null,
      signerMode: "devnet",
      pubkey: "",
      keyType: "",
      alg: 0,
      ethAddress: "",
      locks: [],
      balance: 0,
      lockedBalance: 0,
    });
  },

  fetchLocks: async () => {
    const { address } = get();
    if (!address) return;
    try {
      set({ isLoading: true });
      const [locks, bal, locked] = await Promise.all([
        withTimeout(fetchUserLocks(address), 30_000, "Fetch locks"),
        withTimeout(capacityOf(address), 30_000, "Balance fetch"),
        withTimeout(lockedBalanceOf(address), 30_000, "Locked balance fetch"),
      ]);
      set({
        locks,
        balance: shannonToCKB(bal),
        lockedBalance: shannonToCKB(locked),
        isLoading: false,
      });
    } catch (e) {
      set({ isLoading: false, error: (e as Error).message });
    }
  },

  createLock: async (amount: string, unlockTimestamp: number) => {
    const { signer, signerMode, address } = get();
    if (!signer) throw new Error("Wallet not connected");
    try {
      set({ isLoading: true, error: null });
      const joyidAddr = signerMode === "joyid" ? address ?? undefined : undefined;
      const txHash = await createTimeLock(amount, unlockTimestamp, signer, joyidAddr);
      console.log("Lock created, tx:", txHash);
      await get().fetchLocks();
    } catch (e) {
      set({ isLoading: false, error: (e as Error).message });
      throw e;
    }
  },

  unlockLock: async (cell: TimeLockCell) => {
    const { signer, signerMode, address } = get();
    if (!signer) throw new Error("Wallet not connected");
    try {
      set({ isLoading: true, error: null });
      const joyidAddr = signerMode === "joyid" ? address ?? undefined : undefined;
      const txHash = await withdrawLock(cell, signer, joyidAddr);
      console.log("Unlocked, tx:", txHash);
      await get().fetchLocks();
    } catch (e) {
      set({ isLoading: false, error: (e as Error).message });
      throw e;
    }
  },
}));
