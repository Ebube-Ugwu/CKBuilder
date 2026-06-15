import { createFileRoute } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { useWalletStore } from "#/store/wallet-store";
import { TIME_LOCK } from "#/lib/ckb";
import { readEnvNetwork } from "#/lib/ccc-client";

export const Route = createFileRoute("/settings")({
  component: RouteComponent,
});

function RouteComponent() {
  const {
    address,
    balance,
    lockedBalance,
    pubkey,
    keyType,
    alg,
    ethAddress,
    locks,
    disconnect,
  } = useWalletStore();

  const network = readEnvNetwork();

  const algLabel = alg === -7 ? "ES256" : alg === -257 ? "RS256" : String(alg);

  return (
    <div className="p-4 max-w-lg mx-auto text-white">
      <h1 className="text-2xl font-bold mb-8">EC-SafeLock</h1>
      <div className="space-y-6">
        <Section title="Wallet">
          <InfoItem
            label="Address"
            value={
              address
                ? `${address.slice(0, 10)}...${address.slice(-4)}`
                : "Not connected"
            }
          />
          <InfoItem label="Balance" value={`${balance.toFixed(2)} CKB`} />
          <InfoItem label="Locked" value={`${lockedBalance.toFixed(2)} CKB`} />
        </Section>

        <Section title="JoyID">
          <InfoItem
            label="Public Key"
            value={
              pubkey
                ? `${pubkey.slice(0, 10)}...${pubkey.slice(-6)}`
                : "—"
            }
          />
          <InfoItem label="Key Type" value={keyType || "—"} />
          <InfoItem label="Algorithm" value={alg ? algLabel : "—"} />
          <InfoItem
            label="ETH Address"
            value={
              ethAddress
                ? `${ethAddress.slice(0, 8)}...${ethAddress.slice(-4)}`
                : "—"
            }
          />
        </Section>

        <Section title="Contract">
          <InfoItem
            label="Code Hash"
            value={`${TIME_LOCK.codeHash.slice(0, 10)}...${TIME_LOCK.codeHash.slice(-6)}`}
          />
          <InfoItem label="Hash Type" value={TIME_LOCK.hashType} />
        </Section>

        <Section title="Network">
          <InfoItem label="Network" value={network} />
          <InfoItem
            label="Active Locks"
            value={String(locks.length)}
          />
        </Section>
      </div>
      <Button
        variant="secondary"
        className="w-full mt-10 font-bold"
        onClick={disconnect}
      >
        Disconnect
      </Button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">
        {title}
      </h2>
      <div className="bg-zinc-800 rounded-xl p-4 space-y-4">
        {children}
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm font-semibold text-zinc-400">{label}</p>
      <p className="text-sm font-medium text-right break-all max-w-[60%]">
        {value}
      </p>
    </div>
  );
}
