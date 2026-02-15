import { createFileRoute } from "@tanstack/react-router";
import { SignIn } from "@clerk/tanstack-react-start";

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
});

function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <SignIn 
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
