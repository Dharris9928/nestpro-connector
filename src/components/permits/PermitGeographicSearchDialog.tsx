import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search } from "lucide-react";

interface PermitGeographicSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearchComplete: () => void;
}

export const PermitGeographicSearchDialog = ({
  open,
  onOpenChange,
  onSearchComplete
}: PermitGeographicSearchDialogProps) => {
  const [searchType, setSearchType] = useState<'region' | 'state' | 'metro' | 'city'>('region');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedMetro, setSelectedMetro] = useState('');
  const [minUnits, setMinUnits] = useState(90);
  const [dateRange, setDateRange] = useState('30_days');
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const { data: regions } = useQuery({
    queryKey: ['permit-regions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permit_regions')
        .select('*')
        .eq('is_active', true)
        .order('region_name');
      if (error) throw error;
      return data;
    }
  });

  const { data: metros } = useQuery({
    queryKey: ['metro-areas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metro_areas')
        .select('*')
        .eq('is_active', true)
        .order('metro_name');
      if (error) throw error;
      return data;
    }
  });

  const US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  const handleSearch = async () => {
    if (searchType === 'region' && !selectedRegion) {
      toast({
        title: "Region Required",
        description: "Please select a region to search",
        variant: "destructive"
      });
      return;
    }

    if (searchType === 'state' && selectedStates.length === 0) {
      toast({
        title: "State Required",
        description: "Please select at least one state",
        variant: "destructive"
      });
      return;
    }

    if (searchType === 'metro' && !selectedMetro) {
      toast({
        title: "Metro Required",
        description: "Please select a metro area",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);

    try {
      const { data, error } = await supabase.functions.invoke('permit-discovery-ai', {
        body: {
          searchType,
          region: searchType === 'region' ? selectedRegion : undefined,
          states: searchType === 'state' ? selectedStates : undefined,
          metroArea: searchType === 'metro' ? selectedMetro : undefined,
          minUnits,
          dateRange
        }
      });

      if (error) throw error;

      toast({
        title: "Search Complete",
        description: `Found ${data.permitsFound} permits. ${data.permitsMatched} matched to existing companies, ${data.newCompaniesCreated} new leads created.`
      });

      onSearchComplete();
    } catch (error: any) {
      console.error('Search error:', error);
      toast({
        title: "Search Failed",
        description: error.message || "Failed to search for permits",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Search Building Permits</DialogTitle>
          <DialogDescription>
            Configure your geographic search to discover new residential development opportunities
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label>Search Type</Label>
            <RadioGroup value={searchType} onValueChange={(value: any) => setSearchType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="region" id="region" />
                <Label htmlFor="region" className="font-normal cursor-pointer">
                  Search by Region (Multi-state areas)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="state" id="state" />
                <Label htmlFor="state" className="font-normal cursor-pointer">
                  Search by State(s)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="metro" id="metro" />
                <Label htmlFor="metro" className="font-normal cursor-pointer">
                  Search by Metro Area
                </Label>
              </div>
            </RadioGroup>
          </div>

          {searchType === 'region' && (
            <div className="space-y-2">
              <Label>Select Region</Label>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a region..." />
                </SelectTrigger>
                <SelectContent>
                  {regions?.map(region => (
                    <SelectItem key={region.id} value={region.region_name}>
                      {region.region_name} ({region.states.join(', ')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {searchType === 'state' && (
            <div className="space-y-2">
              <Label>Select State(s)</Label>
              <Select
                value={selectedStates[0] || ''}
                onValueChange={(value) => setSelectedStates([value])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a state..." />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map(state => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {searchType === 'metro' && (
            <div className="space-y-2">
              <Label>Select Metro Area</Label>
              <Select value={selectedMetro} onValueChange={setSelectedMetro}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a metro area..." />
                </SelectTrigger>
                <SelectContent>
                  {metros?.map(metro => (
                    <SelectItem key={metro.id} value={metro.metro_name}>
                      {metro.metro_name} ({metro.state})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Minimum Units: {minUnits}</Label>
            <Slider
              value={[minUnits]}
              onValueChange={([value]) => setMinUnits(value)}
              min={50}
              max={500}
              step={10}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>Date Range</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7_days">Last 7 Days</SelectItem>
                <SelectItem value="30_days">Last 30 Days</SelectItem>
                <SelectItem value="90_days">Last 90 Days</SelectItem>
                <SelectItem value="6_months">Last 6 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSearching}>
              Cancel
            </Button>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search Permits
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
