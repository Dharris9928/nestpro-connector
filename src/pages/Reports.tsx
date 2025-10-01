import { ScoringBreakdownReport } from '@/components/reports/ScoringBreakdownReport';
import { ContactsScoringReport } from '@/components/reports/ContactsScoringReport';

const Reports = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-2">Analytics and reporting</p>
      </div>
      
      <ScoringBreakdownReport />
      
      <ContactsScoringReport />
    </div>
  );
};

export default Reports;
