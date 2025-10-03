import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { SegmentCard } from '@/components/prospecting/SegmentCard';
import { ApolloCSVImportDialog } from '@/components/prospecting/ApolloCSVImportDialog';
import { TrendingUp, Home, Wrench, Zap, Award, DollarSign, Building2, FileUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const SEGMENT_CONFIGS = [
  {
    name: 'luxury_custom',
    displayName: 'Premium Builders',
    description: 'High-volume luxury home builders with premium price points',
    icon: <Award className="h-6 w-6 text-primary" />,
    apolloFilters: {
      keywords: ['home builder', 'custom homes', 'luxury homes'],
      employeeRange: '51,500',
      revenueRange: '10M-50M',
      states: undefined,
      countries: ['United States', 'Canada']
    },
    color: 'border-l-primary',
    industryType: 'Builder' as const
  },
  {
    name: 'production_tract',
    displayName: 'Production Builders',
    description: 'High-volume production builders focused on scale',
    icon: <Building2 className="h-6 w-6 text-blue-500" />,
    apolloFilters: {
      keywords: ['home builder', 'production builder', 'residential construction'],
      employeeRange: '201,1000',
      revenueRange: '50M-100M',
      states: undefined,
      countries: ['United States', 'Canada']
    },
    color: 'border-l-blue-500',
    industryType: 'Builder' as const
  },
  {
    name: 'smart_home_champions',
    displayName: 'Smart Home Leaders',
    description: 'Contractors already embracing smart home technology',
    icon: <Zap className="h-6 w-6 text-yellow-500" />,
    apolloFilters: {
      keywords: ['smart home', 'home automation', 'hvac contractor', 'electrical contractor'],
      employeeRange: '11,200',
      revenueRange: '1M-10M',
      states: undefined,
      countries: ['United States', 'Canada']
    },
    color: 'border-l-yellow-500',
    industryType: 'Contractor' as const
  },
  {
    name: 'premium_specialists',
    displayName: 'Premium HVAC',
    description: 'High-end HVAC contractors serving upscale markets',
    icon: <TrendingUp className="h-6 w-6 text-green-500" />,
    apolloFilters: {
      keywords: ['hvac', 'air conditioning', 'heating cooling'],
      employeeRange: '11,100',
      revenueRange: '1M-10M',
      states: undefined,
      countries: ['United States', 'Canada']
    },
    color: 'border-l-green-500',
    industryType: 'Contractor' as const
  },
  {
    name: 'regional_growth',
    displayName: 'Growth Contractors',
    description: 'Fast-growing contractors ready for technology adoption',
    icon: <Wrench className="h-6 w-6 text-purple-500" />,
    apolloFilters: {
      keywords: ['hvac contractor', 'plumbing contractor', 'electrical contractor'],
      employeeRange: '11,50',
      revenueRange: '1M-10M',
      states: undefined,
      countries: ['United States', 'Canada']
    },
    color: 'border-l-purple-500',
    industryType: 'Contractor' as const
  },
  {
    name: 'regional_mid_volume',
    displayName: 'Regional Builders',
    description: 'Mid-size builders with strong regional presence',
    icon: <Home className="h-6 w-6 text-orange-500" />,
    apolloFilters: {
      keywords: ['home builder', 'residential builder'],
      employeeRange: '51,200',
      revenueRange: '10M-50M',
      states: undefined,
      countries: ['United States', 'Canada']
    },
    color: 'border-l-orange-500',
    industryType: 'Builder' as const
  }
];

export default function ProspectingDashboard() {
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Prospecting Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Find and import companies for each target segment using Apollo's database
            </p>
          </div>
          <Button onClick={() => setImportDialogOpen(true)} size="lg">
            <FileUp className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
        </div>

        <Card className="bg-accent/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              How It Works
            </CardTitle>
            <CardDescription>
              Each segment below has pre-configured Apollo search filters tailored to your ideal customer profile.
              Click "Find Companies" to discover prospects, then select and import them directly into your CRM.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <div className="bg-primary/10 p-2 rounded-full">
                  <span className="font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="font-medium">Search by Segment</p>
                  <p className="text-muted-foreground">Each segment has optimized filters</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-primary/10 p-2 rounded-full">
                  <span className="font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="font-medium">Review Prospects</p>
                  <p className="text-muted-foreground">See company details and fit</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-primary/10 p-2 rounded-full">
                  <span className="font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="font-medium">Import to CRM</p>
                  <p className="text-muted-foreground">Add to your pipeline instantly</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {SEGMENT_CONFIGS.map((segment) => (
            <SegmentCard key={segment.name} segment={segment} />
          ))}
        </div>
      </div>

      <ApolloCSVImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImportComplete={() => {
          // Could add refresh logic here if needed
        }}
      />
    </AppLayout>
  );
}
