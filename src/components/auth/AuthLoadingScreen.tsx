import React from "react";

interface AuthLoadingScreenProps {
  message?: string;
}

export function AuthLoadingScreen({
  message = "Loading...",
}: AuthLoadingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-breneo-lightgray dark:bg-[#181818]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-breneo-blue mx-auto" />
        <p className="mt-2 text-gray-600 dark:text-gray-400">{message}</p>
      </div>
    </div>
  );
}
