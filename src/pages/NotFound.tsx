import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative"
      style={{
        backgroundImage:
          "url('/lovable-uploads/full-shot-student-library.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* White content container */}
      <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md mx-auto">
        {/* Logo */}
        <div className="mb-8">
          <img
            src="/lovable-uploads/breneo_logo.png"
            alt="Breneo Logo"
            className="h-12 mx-auto"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              const fallback = target.nextElementSibling as HTMLElement;
              target.style.display = "none";
              fallback.style.display = "block";
            }}
          />
          <div className="h-12 w-32 bg-muted rounded flex items-center justify-center mx-auto hidden">
            <span className="text-sm text-muted-foreground font-semibold">
              Breneo
            </span>
          </div>
        </div>

        {/* 404 Content */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
          <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Link
            to="/dashboard"
            className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Go to Dashboard
          </Link>

          <div className="text-sm text-muted-foreground">
            <Link
              to="/auth/login"
              className="hover:text-primary transition-colors"
            >
              Sign In
            </Link>
            <span className="mx-2">•</span>
            <Link
              to="/auth/signup"
              className="hover:text-primary transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
