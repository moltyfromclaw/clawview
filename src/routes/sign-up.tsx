import { createFileRoute } from "@tanstack/react-router";
import { SignUp } from "@clerk/tanstack-react-start";

export const Route = createFileRoute("/sign-up")({
  component: SignUpPage,
});

function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <SignUp 
        routing="path" 
        path="/sign-up" 
        signInUrl="/sign-in"
        afterSignUpUrl="/instances"
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
