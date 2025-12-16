import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "@/contexts/LanguageContext";

const WebinarsPage = () => {
  const t = useTranslation();

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
        <div className="text-center px-4">
          <img
            src="/lovable-uploads/3dicons-calender-front-color.png"
            alt="Notebook"
            className="h-40 w-40 mx-auto mb-6" // bigger size and centered
          />
          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            {t.webinars.comingsoon}
          </h1>
          <p className="text-m text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            {t.webinars.comingsoondescription}
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default WebinarsPage;
