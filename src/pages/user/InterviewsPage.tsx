import React from "react";
import { useSearchParams } from "react-router-dom";
import { InterviewContainer } from "@/components/interviews/InterviewContainer";
import { TextInterviewChat } from "@/components/interviews/TextInterviewChat";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

/** Video interviews stay fullscreen. Text chat uses the normal dashboard navbar. */
const InterviewsPage = () => {
  const [searchParams] = useSearchParams();
  if (searchParams.get("mode") === "text") {
    return (
      <DashboardLayout showHeader={false} showMobileNav={false}>
        <div className="flex h-full min-h-0 flex-col pt-[calc(4.25rem+env(safe-area-inset-top))] md:pb-4 md:pt-4">
          <TextInterviewChat />
        </div>
      </DashboardLayout>
    );
  }
  return <InterviewContainer />;
};

export default InterviewsPage;
