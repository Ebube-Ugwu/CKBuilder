import {createFileRoute} from '@tanstack/react-router'
import {Button} from "#/components/ui/button.tsx";

export const Route = createFileRoute('/')({ component: Init })

function Init() {
      return <div className="flex flex-col justify-center items-center flex-1 p-4 text-center">
      <h2 className="font-black text-3xl text-foreground ">Welcome!</h2>
      <h2 className="font-extrabold text-2xl text-foreground my-4">Connect with your wallet to Proceed</h2>
      <Button className="bg-foreground shadow shadow-gray-400 my-5 font-extrabold p-2 px-4">Connect </Button>
  </div>
}