import {createFileRoute} from '@tanstack/react-router'
import {Button} from "#/components/ui/button.tsx";

export const Route = createFileRoute('/home')({
    component: RouteComponent,
})

function RouteComponent() {
    return (
        <>
            <div className="shadow shadow-gray-900 flex flex-col justify-center gap-2 pt-4">
                <div className="flex justify-around ">
                    <p className="font-bold capitalize text-foreground">Balance</p>
                    <div className="flex">
                        <p className="text-amber-400 font-bold ">150</p>
                        <p className="uppercase font-bold text-foreground mx-2">ckb</p>
                    </div>
                </div>
                <div className="flex justify-around ">
                    <p className="font-bold capitalize text-foreground">locked</p>
                    <div className="flex">
                        <p className="text-amber-400 font-bold ">150</p>
                        <p className="uppercase font-bold text-foreground mx-2">ckb</p>
                    </div>
                </div>
                <Button className="capitalize font-extrabold px-4 py-2 mt-8">create safelock</Button>
            </div>
            <hr className="my-8 opacity-80 text-foreground"/>
            <div>
                <h2 className="capitalize font-extrabold text-xl text-center mb-2">my locks</h2>
                <div className="flex justify-around ">
                    <p className="uppercase font-bold text-amber-400">100 ckb</p>
                    <p className="capitalize text-foreground">unlocks:  Jun 30, 2026</p>
                </div>
                <div className="flex justify-around ">
                    <p className="uppercase font-bold text-amber-400">100 ckb</p>
                    <p className="capitalize text-foreground">unlocks:  Jun 30, 2026</p>
                </div>
            </div>
        </>
    );
}
