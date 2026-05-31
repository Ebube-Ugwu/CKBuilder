import {Outlet, createRootRoute} from '@tanstack/react-router'
import {TanStackRouterDevtoolsPanel} from '@tanstack/react-router-devtools'
import {TanStackDevtools} from '@tanstack/react-devtools'
import NavigationMenu from "@/components/NavigationMenu";
import Header from "@/components/Header";

import '../styles.css'

export const Route = createRootRoute({
    component: RootComponent,
})

function RootComponent() {
    return (
        <>
            <div className="min-h-screen flex flex-col">
            <Header/>
            <main className="flex-1 p-4">
                <Outlet/>
            </main>
            <NavigationMenu/>
            <TanStackDevtools
                config={{
                    position: 'middle-right',
                }}
                plugins={[
                    {
                        name: 'TanStack Router',
                        render: <TanStackRouterDevtoolsPanel/>,
                    },
                ]}
            />
            </div>
        </>
    )
}
