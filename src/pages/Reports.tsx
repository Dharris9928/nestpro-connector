import { useState } from 'react';
import { ScoringBreakdownReport } from '@/components/reports/ScoringBreakdownReport';
import { ContactsScoringReport } from '@/components/reports/ContactsScoringReport';
import { RecalculateAllScoresButton } from '@/components/reports/RecalculateAllScoresButton';
import { RecalculateContractorScoresButton } from '@/components/reports/RecalculateContractorScoresButton';
import { BulkEnrichButton } from '@/components/reports/BulkEnrichButton';

const Reports = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRecalculateComplete = () => {
    // Trigger refresh of reports by updating key
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-2">Analytics and reporting</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <BulkEnrichButton onComplete={handleRecalculateComplete} />
          <RecalculateContractorScoresButton onComplete={handleRecalculateComplete} />
          <RecalculateAllScoresButton onComplete={handleRecalculateComplete} />
        </div>
      </div>
      
      <ScoringBreakdownReport key={`scoring-${refreshKey}`} />
      
      <ContactsScoringReport key={`contacts-${refreshKey}`} />
    </div>
  );
};

export default Reports;
