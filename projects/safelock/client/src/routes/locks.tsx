import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/locks')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/locks"!</div>
}
