import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "@/contexts/LanguageContext";

const WebinarsPage = () => {
  const t = useTranslation();

  return (
    <DashboardLayout showSidebar={true} showHeader={true}>
      <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
        <div className="text-center px-4">
          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            {t.webinars.title}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            {t.webinars.comingSoon}
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default WebinarsPage;

