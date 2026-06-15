import { ccc } from "@ckb-ccc/core";
import { signRawTransaction } from "@joyid/ckb";
import { cccClient } from "./ccc-client";

export const TIME_LOCK: Pick<ccc.Script, "codeHash" | "hashType"> = {
  codeHash:
    "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
  hashType: "type",
};

export interface TimeLockCell {
  outPoint: ccc.OutPoint;
  capacity: bigint;
  unlockTime: bigint;
  unlocksAt: Date;
}

function cccTxToCKBTransaction(tx: ccc.Transaction) {
  const h = (n: ccc.Num) => ccc.numToHex(n);
  const mapScript = (s: ccc.Script) => ({
    codeHash: s.codeHash as `0x${string}`,
    hashType: s.hashType as "type" | "data" | "data1",
    args: s.args as `0x${string}`,
  });
  return {
    version: h(tx.version),
    cellDeps: tx.cellDeps.map((d) => ({
      outPoint: { txHash: d.outPoint.txHash as `0x${string}`, index: h(d.outPoint.index) },
      depType: d.depType,
    })),
    headerDeps: tx.headerDeps.map((h) => h as `0x${string}`),
    inputs: tx.inputs.map((i) => ({
      previousOutput: {
        txHash: i.previousOutput.txHash as `0x${string}`,
        index: h(i.previousOutput.index),
      },
      since: h(i.since),
    })),
    outputs: tx.outputs.map((o) => ({
      capacity: h(o.capacity),
      lock: mapScript(o.lock),
      type: o.type ? mapScript(o.type) : undefined,
    })),
    witnesses: tx.witnesses.map((w) => w as `0x${string}`),
    outputsData: tx.outputsData.map((d) => d as `0x${string}`),
  };
}

export async function fetchUserLocks(address: string): Promise<TimeLockCell[]> {
  const addr = await ccc.Address.fromString(address, cccClient);
  const typeScript: ccc.ScriptLike = {
    codeHash: TIME_LOCK.codeHash,
    hashType: TIME_LOCK.hashType,
    args: "0x",
  };
  const cells: ccc.Cell[] = [];
  for await (const cell of cccClient.findCellsByLock(
    addr.script,
    typeScript,
    true,
  )) {
    cells.push(cell);
  }
  return cells.map((cell) => {
    const unlockTime = ccc.numBeFromBytes(cell.outputData);
    return {
      outPoint: cell.outPoint,
      capacity: cell.cellOutput.capacity,
      unlockTime,
      unlocksAt: new Date(Number(unlockTime) * 1000),
    };
  });
}

export async function createLock(
  amountCKB: string,
  unlockTimestamp: number,
  signer: ccc.Signer,
  joyidAddress?: string,
): Promise<string> {
  const addrs = await signer.getAddressObjs();
  const addr = addrs[0];
  const typeScript: ccc.ScriptLike = {
    codeHash: TIME_LOCK.codeHash,
    hashType: TIME_LOCK.hashType,
    args: ccc.hexFrom(ccc.numBeToBytes(unlockTimestamp, 8)),
  };
  const tx = ccc.Transaction.from({
    outputs: [
      {
        lock: addr.script,
        type: typeScript,
        capacity: ccc.fixedPointFrom(amountCKB),
      },
    ],
    outputsData: [ccc.hexFrom(ccc.numBeToBytes(unlockTimestamp, 8))],
  });
  await tx.completeInputsByCapacity(signer);
  await tx.completeFeeBy(signer, 1000n);

  if (joyidAddress) {
    const joyidTx = cccTxToCKBTransaction(tx);
    const signed = await signRawTransaction(joyidTx, joyidAddress);
    return await cccClient.sendTransaction(signed);
  }

  return await signer.sendTransaction(tx);
}

export async function unlockLock(
  cell: TimeLockCell,
  signer: ccc.Signer,
  joyidAddress?: string,
): Promise<string> {
  const addrs = await signer.getAddressObjs();
  const addr = addrs[0];
  const sinceValue = (1n << 60n) | cell.unlockTime;
  const returnAmount = cell.capacity - ccc.fixedPointFrom(1n);

  const tx = ccc.Transaction.from({
    outputs: [{ lock: addr.script, capacity: returnAmount }],
    outputsData: ["0x"],
  });

  await tx.completeFeeBy(signer, 1000n);

  for (const input of tx.inputs) {
    if (input.cellOutput?.type?.codeHash === TIME_LOCK.codeHash) {
      input.since = sinceValue;
      break;
    }
  }

  if (joyidAddress) {
    const joyidTx = cccTxToCKBTransaction(tx);
    const signed = await signRawTransaction(joyidTx, joyidAddress);
    return await cccClient.sendTransaction(signed);
  }

  return await signer.sendTransaction(tx);
}

export async function capacityOf(address: string): Promise<bigint> {
  const addr = await ccc.Address.fromString(address, cccClient);
  const balance = await cccClient.getBalance([addr.script]);
  return balance;
}

export async function lockedBalanceOf(address: string): Promise<bigint> {
  const addr = await ccc.Address.fromString(address, cccClient);
  const typeScript: ccc.ScriptLike = {
    codeHash: TIME_LOCK.codeHash,
    hashType: TIME_LOCK.hashType,
    args: "0x",
  };
  let total = 0n;
  for await (const cell of cccClient.findCellsByLock(addr.script, typeScript)) {
    total += cell.cellOutput.capacity;
  }
  return total;
}

export function shannonToCKB(amount: bigint): number {
  return Number(amount) / 100_000_000;
}
