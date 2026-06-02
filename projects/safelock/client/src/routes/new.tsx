import { createFileRoute } from '@tanstack/react-router'
import {Input} from "#/components/ui/input.tsx";
import {DatePickerDemo} from "#/components/ui/date-picker.tsx";
import {Button} from "#/components/ui/button.tsx";

export const Route = createFileRoute('/new')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
      <div className="flex flex-col justify-center flex-1">
          <div className="shadow shadow-gray-900 flex flex-col justify-around items-center gap-8">
              <Input type="text" placeholder="Amount" />
              <DatePickerDemo message="Unlock Date"/>
              <Button className="capitalize shadow shadow-gray-900 font-extrabold mt-4 p-4 px-8 w-full">Lock</Button>
          </div>
          <div className="opacity-80 text-center text-red-600 my-4 p-4">
          <p>Note:</p>
          <p>You cannot withdraw these funds till the set date.</p>
          <p>Be sure!</p>
              </div>
      </div>
  );
}
