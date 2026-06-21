import { createFileRoute } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { useWalletStore } from "#/store/wallet-store";
import { readEnvNetwork } from "#/lib/ccc-client";

export const Route = createFileRoute("/settings")({
  component: RouteComponent,
});

function RouteComponent() {
  const { address, disconnect, isConnected } = useWalletStore();
  const network = readEnvNetwork();

  const handleDisconnect = () => {
    disconnect();
    window.location.href = "/";
  };

  // Truncates the address to show the start + matching dot padding from the design
  const formatAddress = (addr: string | null) => {
    if (!addr) return "Connect wallet...";
    return addr.length > 12
      ? `${addr.slice(0, 12)}........................`
      : addr;
  };

  return (
    <div className="text-foreground">
      {/* Info Stack */}
      <div className="flex-1 flex flex-col justify-center space-y-9 my-2">
        <div>
          <label className="block text-xl font-bold tracking-wide mb-1">Balance:</label>
          <span className="text-[#ebd078] font-semibold text-base block break-all">
            {formatAddress(address)}
          </span>
        </div>

        {isConnected ?
          (<>
            <label className="block text-xl font-bold tracking-wide mb-1">connected via:</label>
            <span className="text-[#ebd078] font-bold text-base block">joyid</span>
          </>) : (
            <label className="block text-xl font-bold tracking-wide mb-1">Not Connected</label>
          )}
      </div>

      <div>
        <label className="block text-xl font-bold tracking-wide mb-1">Network:</label>
        <span className="text-[#ebd078] font-bold text-base block capitalize">
          {network || "Testnet"}
        </span>
      </div>

      {/* Action Button */}
      <div className="pt-4">
        <Button
          onClick={handleDisconnect}
          className="w-full bg-white text-[#100202] hover:bg-zinc-200 transition-colors py-6 text-xl font-extrabold rounded-lg"
        >
          Disconnect
        </Button>
      </div>
    </div>

  );
}
