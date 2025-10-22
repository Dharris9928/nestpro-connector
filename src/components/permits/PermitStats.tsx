import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface PermitStatsProps {
  permits: any[];
}

export const PermitStats = ({ permits }: PermitStatsProps) => {
  const stateData = permits.reduce((acc: any, permit) => {
    const state = permit.state;
    if (!acc[state]) {
      acc[state] = { state, count: 0, totalUnits: 0, totalValue: 0 };
    }
    acc[state].count += 1;
    acc[state].totalUnits += permit.num_units || 0;
    acc[state].totalValue += permit.estimated_value || 0;
    return acc;
  }, {});

  const chartData = Object.values(stateData)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 10);

  const regionData = permits.reduce((acc: any, permit) => {
    const region = permit.region || 'Unknown';
    if (!acc[region]) {
      acc[region] = { region, count: 0 };
    }
    acc[region].count += 1;
    return acc;
  }, {});

  const regionChartData = Object.values(regionData);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Units</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {permits.reduce((sum, p) => sum + (p.num_units || 0), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Project Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {(
                permits.reduce((sum, p) => sum + (p.estimated_value || 0), 0) / 1000000
              ).toFixed(1)}
              M
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Average Project Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {permits.length > 0
                ? Math.round(
                    permits.reduce((sum, p) => sum + (p.num_units || 0), 0) / permits.length
                  )
                : 0}{' '}
              units
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permits by State</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="state" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permits by Region</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={regionChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="region" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--chart-2))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
