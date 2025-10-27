import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ImageIcon } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  // Image loading states
  const [logoLoaded, setLogoLoaded] = useState(false);
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

  // Preload image on component mount
  useEffect(() => {
    const preloadImages = async () => {
      try {
        await preloadImage(
          "/lovable-uploads/6bee4aa6-3a7f-4806-98bd-dc73a1955812.png"
        );
      } catch (error) {
        console.warn("Image failed to preload:", error);
        setImageError(true);
      }
    };

    preloadImages();
  }, [preloadImage]);

  useEffect(() => {
    // Redirect to landing page
    navigate("/");
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-breneo-lightgray dark:bg-[#1a1a1a] px-3">
      <div className="text-center">
        {!logoLoaded && !imageError && (
          <div className="h-16 w-64 bg-gray-200 dark:bg-[#242424] animate-pulse rounded flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="h-8 w-8 text-gray-400 dark:text-gray-600" />
          </div>
        )}
        <img
          src="/lovable-uploads/6bee4aa6-3a7f-4806-98bd-dc73a1955812.png"
          alt="Breneo Logo"
          className={`h-16 mx-auto mb-4 transition-opacity duration-300 ${
            logoLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setLogoLoaded(true)}
          onError={() => {
            setImageError(true);
            setLogoLoaded(true);
          }}
        />
        {imageError && (
          <div className="h-16 w-64 bg-gray-100 dark:bg-[#242424] border border-gray-300 dark:border-gray-700 rounded flex items-center justify-center mx-auto mb-4">
            <span className="text-lg text-gray-600 dark:text-gray-400">
              Breneo
            </span>
          </div>
        )}
        <p className="text-xl text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
};

export default Index;
