
import React from 'react';
import { DynamicSkillTest } from '@/components/skills/DynamicSkillTest';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const SkillTestPage = () => {
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-breneo-navy mb-6">Skill Assessment</h1>
        <DynamicSkillTest />
      </div>
    </DashboardLayout>
  );
};

export default SkillTestPage;
