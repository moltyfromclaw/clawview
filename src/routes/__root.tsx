import { HeadContent, Scripts, createRootRoute, Outlet } from '@tanstack/react-router'
import { ClerkProvider } from '@clerk/tanstack-react-start'

import appCss from '../styles.css?url'

// Clerk key - check window for runtime injection, fallback to build-time env
const getClerkKey = () => {
  if (typeof window !== 'undefined' && (window as any).__CLERK_PUBLISHABLE_KEY__) {
    return (window as any).__CLERK_PUBLISHABLE_KEY__
  }
  return import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || ''
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'ClawView - OpenClaw Dashboard' },
      { name: 'description', content: 'Real-time observability for OpenClaw AI agents' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),

  component: RootComponent,
})

function RootComponent() {
  const clerkKey = getClerkKey()
  
  // If no Clerk key, render without auth wrapper
  if (!clerkKey) {
    return (
      <html lang="en" className="dark">
        <head>
          <HeadContent />
        </head>
        <body className="bg-gray-950 text-white antialiased min-h-screen">
          <Outlet />
          <Scripts />
        </body>
      </html>
    )
  }

  return (
    <ClerkProvider publishableKey={clerkKey}>
      <html lang="en" className="dark">
        <head>
          <HeadContent />
        </head>
        <body className="bg-gray-950 text-white antialiased min-h-screen">
          <Outlet />
          <Scripts />
        </body>
      </html>
    </ClerkProvider>
  )
}
