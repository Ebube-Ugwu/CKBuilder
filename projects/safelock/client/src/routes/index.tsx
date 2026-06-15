import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from "#/components/ui/button.tsx";
import { useWalletStore } from '#/store/wallet-store';

export const Route = createFileRoute('/')({
    component: Init
})

function Init() {
    const navigate = useNavigate();
    const connectWallet = useWalletStore((state) => state.connectWallet);

    const handleConnect = async () => {
        try {
            await connectWallet();
            // On success, redirect to the home route
            navigate({ to: '/home' });
        } catch (error) {
            console.error("JoyID Connection Error:", error);
        }
    };


    return (
        <div className="flex flex-col justify-center items-center flex-1 p-4 text-center">
            <h2 className="font-black text-3xl text-foreground ">Welcome!</h2>
            <h2 className="font-extrabold text-2xl text-foreground my-4">Connect with your wallet to Proceed</h2>
            <Button
                className="bg-foreground shadow shadow-gray-400 my-5 font-extrabold p-2 px-4"
                onClick={handleConnect}
            >Connect </Button>
        </div>
    );

}
