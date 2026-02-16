import { createFileRoute, Link } from "@tanstack/react-router";
import * as ClerkReact from "@clerk/tanstack-react-start";

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
});

const CLERK_ENABLED = typeof window !== 'undefined' 
  ? !!(window as any).__CLERK_PUBLISHABLE_KEY__ || !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
  : !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function SignInPage() {
  if (!CLERK_ENABLED) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Authentication Not Configured</h1>
        <p className="text-gray-400 mb-6">Clerk authentication is not set up yet.</p>
        <Link to="/instances" className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg transition">
          Continue to Instances →
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <ClerkReact.SignIn 
        routing="path" 
        path="/sign-in" 
        signUpUrl="/sign-up"
        afterSignInUrl="/instances"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-gray-900 border border-gray-800",
          }
        }}
      />
    </div>
  );
}
