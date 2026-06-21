import { ccc } from "@ckb-ccc/core";
import { signRawTransaction } from "@joyid/ckb";
import { cccClient } from "./ccc-client";

export const TIME_LOCK = {
  codeHash:
    "0xc7f81eed0c706991e7e54c8c06aa210711ec6ce7d4b65eb00f228a6f5522465c",
  hashType: "type" as const,
  cellDep: {
    outPoint: {
      txHash:
        "0x0ed14b5c390b0d18d67489cf3fb65fb564e4f9d493e629647d03c4c25f6eb41b" as `0x${string}`,
      index: 0,
    },
    depType: "code" as const,
  },
};

function formatCKB(amount: bigint): string {
  return ccc.fixedPointToString(amount);
}

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
  const output = tx.outputs[0];
  const outputData = tx.outputsData[0];
  const requiredCapacity = ccc.fixedPointFrom(
    output.occupiedSize + ccc.bytesFrom(outputData).byteLength,
  );
  if (output.capacity < requiredCapacity) {
    throw new Error(`Amount must be at least ${formatCKB(requiredCapacity)} CKB`);
  }
  tx.addCellDeps(TIME_LOCK.cellDep);
  await tx.completeInputsByCapacity(signer);
  await tx.completeFeeBy(signer, 1000n);

  // every input needs a corresponding witness entry
  const emptyWitness = ccc.hexFrom(new ccc.WitnessArgs().toBytes());
  tx.witnesses = tx.inputs.map(() => emptyWitness);

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
  tx.addCellDeps(TIME_LOCK.cellDep);

  await tx.completeFeeBy(signer, 1000n);

  // every input needs a corresponding witness entry
  const emptyWitness = ccc.hexFrom(new ccc.WitnessArgs().toBytes());
  tx.witnesses = tx.inputs.map(() => emptyWitness);

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
