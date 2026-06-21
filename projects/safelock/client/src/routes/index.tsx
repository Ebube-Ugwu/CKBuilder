import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from "#/components/ui/button.tsx";
import { useWalletStore } from '#/store/wallet-store';

export const Route = createFileRoute('/')({
    component: Init
})

function Init() {
    const navigate = useNavigate();
    const { connectWallet, isLoading, error } = useWalletStore();

    const handleConnect = async () => {
        try {
            await connectWallet();
            navigate({ to: '/home' });
        } catch {
            // error is already set in store, nothing more to do
        }
    };

    return (
        <div className="flex flex-col justify-center items-center flex-1 p-4 text-center">
            <h2 className="font-black text-3xl text-foreground ">Welcome!</h2>
            <h2 className="font-extrabold text-2xl text-foreground my-4">Connect with your wallet to Proceed</h2>
            <Button
                className="bg-foreground text-black shadow shadow-gray-900 my-5 font-extrabold p-2 px-4"
                onClick={handleConnect}
                disabled={isLoading}
            >
                {isLoading ? "Connecting..." : "Connect via JoyId"}
            </Button>
            {error && (
                <div className="mt-4 w-full max-w-sm rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 text-center">
                    <p className="font-semibold">Connection failed</p>
                    <p className="mt-1 text-red-300/80 break-words">{error}</p>
                </div>
            )}
        </div>
    );
}
