import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Input } from "#/components/ui/input.tsx";
import { DatePickerDemo } from "#/components/ui/date-picker.tsx";
import { Button } from "#/components/ui/button.tsx";
import { useWalletStore } from "#/store/wallet-store";
import { useState } from "react";

export const Route = createFileRoute("/new")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { createLock, isLoading } = useWalletStore();
  const [amount, setAmount] = useState("");
  const [unlockDate, setUnlockDate] = useState<Date | undefined>(undefined);
  const [error, setError] = useState("");

  const handleLock = async () => {
    setError("");
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (!unlockDate) {
      setError("Select an unlock date");
      return;
    }
    const timestamp = Math.floor(unlockDate.getTime() / 1000);
    try {
      await createLock(amount, timestamp);
      navigate({ to: "/locks" });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="flex flex-col justify-center flex-1">
      <div className="shadow shadow-gray-900 flex flex-col justify-around items-center gap-8">
        <Input
          type="number"
          placeholder="Amount (CKB)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <DatePickerDemo
          message="Unlock Date"
          onDateChange={setUnlockDate}
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button
          className="capitalize shadow shadow-gray-900 font-extrabold mt-4 p-4 px-8 w-full"
          onClick={handleLock}
          disabled={isLoading}
        >
          {isLoading ? "Locking..." : "Lock"}
        </Button>
      </div>
      <div className="opacity-80 text-center text-red-600 my-4 p-4">
        <p>Note:</p>
        <p>You cannot withdraw these funds till the set date.</p>
        <p>Be sure!</p>
      </div>
    </div>
  );
}
