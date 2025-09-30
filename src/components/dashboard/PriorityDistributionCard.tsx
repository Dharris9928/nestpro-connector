import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Target } from 'lucide-react';

interface PriorityStats {
  P1: { count: number; percentage: number };
  P2: { count: number; percentage: number };
  P3: { count: number; percentage: number };
  unscored: { count: number; percentage: number };
  total: number;
}

export function PriorityDistributionCard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PriorityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPriorityStats();

    // Real-time subscription for updates
    const subscription = supabase
      .channel('priority-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'companies' },
        () => loadPriorityStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const loadPriorityStats = async () => {
    try {
      // Query all companies and count by score ranges
      const { data: companies, error } = await supabase
        .from('companies')
        .select('lead_score');

      if (error) throw error;

      const total = companies?.length || 0;
      
      // Count companies in each priority tier based on lead_score
      const P1Count = companies?.filter(c => c.lead_score >= 80).length || 0;
      const P2Count = companies?.filter(c => c.lead_score >= 60 && c.lead_score < 80).length || 0;
      const P3Count = companies?.filter(c => c.lead_score >= 40 && c.lead_score < 60).length || 0;
      const unscoredCount = companies?.filter(c => c.lead_score < 40).length || 0;

      setStats({
        P1: {
          count: P1Count,
          percentage: total > 0 ? Math.round((P1Count / total) * 100) : 0
        },
        P2: {
          count: P2Count,
          percentage: total > 0 ? Math.round((P2Count / total) * 100) : 0
        },
        P3: {
          count: P3Count,
          percentage: total > 0 ? Math.round((P3Count / total) * 100) : 0
        },
        unscored: {
          count: unscoredCount,
          percentage: total > 0 ? Math.round((unscoredCount / total) * 100) : 0
        },
        total
      });
    } catch (error) {
      console.error('Error loading priority stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <CardSkeleton />;
  }

  if (!stats) {
    return null;
  }

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg hover:bg-accent/50 transition-all duration-200"
      onClick={() => navigate('/companies')}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium">Priority Distribution</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.total} companies
          </p>
        </div>
        <Target className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {/* Visual Progress Bar */}
        <div className="mb-4">
          <div className="flex h-8 rounded-lg overflow-hidden bg-muted">
            {stats.P1.count > 0 && (
              <div 
                className="bg-priority-p1 flex items-center justify-center text-priority-p1-foreground text-xs font-semibold"
                style={{ width: `${stats.P1.percentage}%` }}
              >
                {stats.P1.percentage > 10 && `${stats.P1.percentage}%`}
              </div>
            )}
            {stats.P2.count > 0 && (
              <div 
                className="bg-priority-p2 flex items-center justify-center text-priority-p2-foreground text-xs font-semibold"
                style={{ width: `${stats.P2.percentage}%` }}
              >
                {stats.P2.percentage > 10 && `${stats.P2.percentage}%`}
              </div>
            )}
            {stats.P3.count > 0 && (
              <div 
                className="bg-priority-p3 flex items-center justify-center text-priority-p3-foreground text-xs font-semibold"
                style={{ width: `${stats.P3.percentage}%` }}
              >
                {stats.P3.percentage > 10 && `${stats.P3.percentage}%`}
              </div>
            )}
            {stats.unscored.count > 0 && (
              <div 
                className="bg-muted flex items-center justify-center text-muted-foreground text-xs font-semibold"
                style={{ width: `${stats.unscored.percentage}%` }}
              >
                {stats.unscored.percentage > 10 && `${stats.unscored.percentage}%`}
              </div>
            )}
          </div>
        </div>

        {/* Clickable Breakdown */}
        <div className="space-y-2">
          <div
            className="flex items-center justify-between p-2 rounded-lg hover:bg-priority-p1/10 cursor-pointer transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/companies?score_min=80');
            }}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-priority-p1"></div>
              <span className="text-sm font-medium">P1: High Priority</span>
              <span className="text-xs text-muted-foreground">(80-100)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">{stats.P1.count}</span>
              <span className="text-xs text-muted-foreground">{stats.P1.percentage}%</span>
            </div>
          </div>

          <div
            className="flex items-center justify-between p-2 rounded-lg hover:bg-priority-p2/10 cursor-pointer transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/companies?score_min=60&score_max=79');
            }}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-priority-p2"></div>
              <span className="text-sm font-medium">P2: Medium Priority</span>
              <span className="text-xs text-muted-foreground">(60-79)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">{stats.P2.count}</span>
              <span className="text-xs text-muted-foreground">{stats.P2.percentage}%</span>
            </div>
          </div>

          <div
            className="flex items-center justify-between p-2 rounded-lg hover:bg-priority-p3/10 cursor-pointer transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/companies?score_min=40&score_max=59');
            }}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-priority-p3"></div>
              <span className="text-sm font-medium">P3: Standard Priority</span>
              <span className="text-xs text-muted-foreground">(40-59)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">{stats.P3.count}</span>
              <span className="text-xs text-muted-foreground">{stats.P3.percentage}%</span>
            </div>
          </div>

          {stats.unscored.count > 0 && (
            <div
              className="flex items-center justify-between p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/companies?score_max=39');
              }}
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted-foreground"></div>
                <span className="text-sm font-medium">Unscored / Low</span>
                <span className="text-xs text-muted-foreground">(0-39)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{stats.unscored.count}</span>
                <span className="text-xs text-muted-foreground">{stats.unscored.percentage}%</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 bg-muted rounded animate-pulse w-48"></div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="h-8 bg-muted rounded animate-pulse"></div>
          <div className="h-12 bg-muted rounded animate-pulse"></div>
          <div className="h-12 bg-muted rounded animate-pulse"></div>
          <div className="h-12 bg-muted rounded animate-pulse"></div>
        </div>
      </CardContent>
    </Card>
  );
}
