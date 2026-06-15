import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button.tsx";
import { useWalletStore } from "#/store/wallet-store";
import { useEffect } from "react";

export const Route = createFileRoute("/home")({
  beforeLoad: () => {
    if (!useWalletStore.getState().isConnected) {
      throw redirect({ to: "/" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { balance, lockedBalance, locks, fetchLocks, isLoading } =
    useWalletStore();

  useEffect(() => {
    fetchLocks();
  }, []);



  return (
    <div className="shadow shadow-gray-900 flex flex-col justify-center gap-2 pt-4">
      <div className="flex justify-around">
        <p className="font-bold capitalize text-foreground">Balance</p>
        <div className="flex">
          <p className="text-amber-400 font-bold">{balance.toFixed(2)}</p>
          <p className="uppercase font-bold text-foreground mx-2">ckb</p>
        </div>
      </div>
      <div className="flex justify-around">
        <p className="font-bold capitalize text-foreground">Locked</p>
        <div className="flex">
          <p className="text-amber-400 font-bold">{lockedBalance.toFixed(2)}</p>
          <p className="uppercase font-bold text-foreground mx-2">ckb</p>
        </div>
      </div>
      <Link to="/new">
        <Button className="capitalize font-extrabold px-4 py-2 mt-8 w-full">
          Create Safelock
        </Button>
      </Link>
      {isLoading && (
        <p className="text-center text-sm text-zinc-500 mt-2">Loading...</p>
      )}
      <hr className="my-8 opacity-80 text-foreground" />
      <div>
        <h2 className="capitalize font-extrabold text-xl text-center mb-2">
          My Locks ({locks.length})
        </h2>
        {locks.length === 0 && !isLoading && (
          <p className="text-center text-zinc-500">No locks yet</p>
        )}
        {locks.slice(0, 5).map((lock, i) => (
          <div key={i} className="flex justify-around py-1">
            <p className="uppercase font-bold text-amber-400">
              {lock.capacity}
            </p>
            <p className="capitalize text-foreground text-sm">
              unlocks: {lock.unlocksAt.toLocaleDateString()}
            </p>
          </div>
        ))}
        {locks.length > 5 && (
          <Link
            to="/locks"
            className="block text-center text-sm text-blue-400 mt-2"
          >
            View all {locks.length} locks
          </Link>
        )}
      </div>
    </div>
  );
}
