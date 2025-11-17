import { useLocation, Link } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { ImageIcon } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const { user, loading } = useAuth();
  const t = useTranslation();

  // Image loading states
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Image preloading function
  const preloadImage = useCallback((src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }, []);

  // Preload images on component mount
  useEffect(() => {
    const preloadImages = async () => {
      try {
        await Promise.all([
          preloadImage("/lovable-uploads/breneo_logo.png"),
          preloadImage("/lovable-uploads/full-shot-student-library.jpg"),
        ]);
      } catch (error) {
        console.warn("Some images failed to preload:", error);
        setImageError(true);
      }
    };

    preloadImages();
  }, [preloadImage]);

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Background loading skeleton */}
      {!backgroundLoaded && !imageError && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-[#242424] dark:to-[#2a2a2a] animate-pulse z-0" />
      )}

      {/* Background image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: backgroundLoaded
            ? "url('/lovable-uploads/full-shot-student-library.jpg')"
            : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: backgroundLoaded ? 1 : 0,
          transition: "opacity 0.5s ease-in-out",
        }}
      />

      {/* Hidden image for loading detection */}
      <img
        src="/lovable-uploads/full-shot-student-library.jpg"
        alt=""
        className="hidden"
        onLoad={() => setBackgroundLoaded(true)}
        onError={() => {
          setImageError(true);
          setBackgroundLoaded(true);
        }}
      />

      {/* Error fallback background */}
      {imageError && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-[#1a1a1a] dark:to-[#2a2a2a] z-0" />
      )}

      <div className="z-10 relative">
        {/* White content container */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center max-w-md mx-auto">
          {/* Logo */}
          <div className="mb-8">
            {!logoLoaded && !imageError && (
              <div className="h-12 w-32 bg-gray-200 dark:bg-[#242424] animate-pulse rounded flex items-center justify-center mx-auto">
                <ImageIcon className="h-6 w-6 text-gray-400 dark:text-gray-600" />
              </div>
            )}
            <img
              src="/lovable-uploads/breneo_logo.png"
              alt="Breneo Logo"
              className={`h-12 mx-auto transition-opacity duration-300 ${
                logoLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setLogoLoaded(true)}
              onError={() => {
                setImageError(true);
                setLogoLoaded(true);
              }}
            />
            {imageError && (
              <div className="h-12 w-32 bg-gray-100 dark:bg-[#242424] border border-gray-300 dark:border-gray-700 rounded flex items-center justify-center mx-auto">
                <span className="text-sm text-muted-foreground font-semibold">
                  Breneo
                </span>
              </div>
            )}
          </div>

          {/* 404 Content */}
          <div className="mb-8">
            <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
            <h2 className="text-2xl font-semibold mb-2">{t.errors.pageNotFound}</h2>
            <p className="text-muted-foreground mb-6">
              {t.errors.pageNotFoundDescription}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            {!loading && user ? (
              <Link
                to={
                  user.user_type === "academy" ||
                  localStorage.getItem("userRole") === "academy"
                    ? "/academy/dashboard"
                    : "/dashboard"
                }
                className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                {t.common.view} {t.nav.home}
              </Link>
            ) : (
              <Link
                to="/auth/login"
                className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                {t.auth.login}
              </Link>
            )}

            {!loading && !user && (
              <div className="text-sm text-muted-foreground">
                <Link
                  to="/auth/login"
                  className="hover:text-primary transition-colors"
                >
                  {t.auth.login}
                </Link>
                <span className="mx-2">•</span>
                <Link
                  to="/auth/signup"
                  className="hover:text-primary transition-colors"
                >
                  {t.auth.signup}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
