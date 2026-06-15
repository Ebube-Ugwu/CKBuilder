import { createFileRoute } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";
import { Button } from "#/components/ui/button";
import { useWalletStore } from "#/store/wallet-store";
import { useEffect } from "react";

export const Route = createFileRoute("/locks")({
  component: RouteComponent,
});

function RouteComponent() {
  const { locks, fetchLocks, unlockLock, isLoading } = useWalletStore();

  useEffect(() => {
    fetchLocks();
  }, []);

  const now = BigInt(Math.floor(Date.now() / 1000));

  const handleWithdraw = async (lock: (typeof locks)[0]) => {
    try {
      await unlockLock(lock);
    } catch (e) {
      console.error("Withdraw failed:", e);
    }
  };

  if (isLoading && locks.length === 0) {
    return (
      <div className="p-4 max-w-lg mx-auto text-center text-zinc-500">
        Loading locks...
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">EC-SafeLock</h1>
      {locks.length === 0 && (
        <p className="text-zinc-500 text-center">No locks found</p>
      )}
      <Accordion type="single" collapsible className="w-full space-y-4">
        {locks.map((lock, i) => {
          const isUnlockable = lock.unlockTime <= now;
          return (
            <AccordionItem
              key={`${lock.outPoint.txHash}:${lock.outPoint.index}`}
              value={`${i}`}
              className="border-none"
            >
              <AccordionTrigger className="text-xl font-bold hover:no-underline py-4 px-4 bg-zinc-900 rounded-lg">
                Lock #{i + 1}
              </AccordionTrigger>
              <AccordionContent className="px-4 pt-4 pb-6 bg-zinc-950 rounded-b-lg space-y-4">
                <div className="space-y-2">
                  <p className="font-semibold text-zinc-400">Amount:</p>
                  <p className="font-bold text-lg">
                    {Number(lock.capacity) / 100_000_000} CKB
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-zinc-400">Unlocks:</p>
                  <p>{lock.unlocksAt.toLocaleString()}</p>
                </div>
                <Button
                  className="w-full mt-4 font-bold"
                  variant={isUnlockable ? "default" : "secondary"}
                  disabled={!isUnlockable || isLoading}
                  onClick={() => handleWithdraw(lock)}
                >
                  {isUnlockable ? "Withdraw" : "Locked"}
                </Button>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
