import React from "react";
import { ImageIcon } from "lucide-react";
import { BreneoLogo } from "@/components/common/BreneoLogo";
import { AuthHeaderControls } from "@/components/auth/AuthHeaderControls";

export function AuthPageHeader() {
  const [logoLoaded, setLogoLoaded] = React.useState(false);
  const [logoError, setLogoError] = React.useState(false);

  return (
    <header className="flex items-center justify-between px-5 py-4 sm:px-8 sm:py-6">
      <div className="flex items-center">
        {!logoLoaded && !logoError && (
          <div className="h-7 w-24 bg-gray-200 dark:bg-[#242424] animate-pulse rounded flex items-center justify-center">
            <ImageIcon className="h-4 w-4 text-gray-400 dark:text-gray-600" />
          </div>
        )}
        {logoError ? (
          <div className="h-7 w-24 bg-gray-100 dark:bg-[#242424] border border-gray-300 dark:border-gray-700 rounded flex items-center justify-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Breneo
            </span>
          </div>
        ) : (
          <BreneoLogo
            className={`h-7 transition-opacity duration-300 ${
              logoLoaded ? "opacity-100" : "opacity-0 absolute"
            }`}
            onLoad={() => setLogoLoaded(true)}
            onError={() => setLogoError(true)}
          />
        )}
      </div>
      <AuthHeaderControls />
    </header>
  );
}
