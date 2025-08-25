import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const EmailConfirmed: React.FC = () => {
  useEffect(() => {
    // SEO: Title, description, canonical
    const title = "Email Confirmed | Breneo";
    const description = "Your email has been confirmed. You can now log in to your Breneo account.";
    document.title = title;

    let descTag = document.querySelector('meta[name="description"]');
    if (!descTag) {
      descTag = document.createElement("meta");
      descTag.setAttribute("name", "description");
      document.head.appendChild(descTag);
    }
    descTag.setAttribute("content", description);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `${window.location.origin}/email-confirmed`);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <main className="w-full max-w-md px-4">
        <h1 className="sr-only">Email confirmation successful</h1>
        <Card className="shadow-md">
          <CardHeader className="text-center pt-8">
            <div className="mx-auto mb-4 rounded-full bg-primary/10 p-3 text-primary">
              <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
            </div>
            <p className="text-xl font-semibold text-foreground">Your email is confirmed</p>
            <p className="text-sm text-muted-foreground mt-1">
              Thank you! Your account is now verified.
            </p>
          </CardHeader>
          <CardContent className="pb-8 pt-2">
            <div className="mt-6">
              <Button asChild className="w-full">
                <Link to="/auth/login" aria-label="Go to login page">
                  Go to Login
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EmailConfirmed;
