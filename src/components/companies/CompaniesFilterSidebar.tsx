import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { BUILDER_SEGMENTS, CONTRACTOR_SEGMENTS, STATUSES } from './formOptions';

interface CompaniesFilterSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  companyCounts?: number;
}

const PRIORITIES = [
  { value: 'P1: Strategic', label: 'P1: Strategic' },
  { value: 'P2: High Value', label: 'P2: High Value' },
  { value: 'P3: Standard', label: 'P3: Standard' }
];

const STATES = [
  { code: 'CA', name: 'California' },
  { code: 'TX', name: 'Texas' },
  { code: 'FL', name: 'Florida' },
  { code: 'NY', name: 'New York' },
  { code: 'IL', name: 'Illinois' },
  { code: 'PA', name: 'Pennsylvania' }
];

function FilterSection({ 
  title, 
  isCollapsed, 
  onToggle, 
  children 
}: { 
  title: string;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Collapsible open={!isCollapsed} onOpenChange={onToggle}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-semibold hover:text-primary">
        <span>{title}</span>
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 pb-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function CompaniesFilterSidebar({ isCollapsed, onToggle }: CompaniesFilterSidebarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [leadScoreRange, setLeadScoreRange] = useState([0, 100]);
  const [stateFilter, setStateFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  const industryType = searchParams.get("industry_type");
  
  const toggleSection = (section: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(section)) {
      newCollapsed.delete(section);
    } else {
      newCollapsed.add(section);
    }
    setCollapsedSections(newCollapsed);
  };

  const handleFilterClick = (filterType: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    const currentValue = newParams.get(filterType);
    
    if (currentValue === value) {
      newParams.delete(filterType);
    } else {
      newParams.set(filterType, value);
    }
    setSearchParams(newParams);
  };

  const isActiveFilter = (filterType: string, value: string) => {
    return searchParams.get(filterType) === value;
  };

  const clearAllFilters = () => {
    const search = searchParams.get("search");
    const newParams = new URLSearchParams();
    if (search) {
      newParams.set("search", search);
    }
    setSearchParams(newParams);
    setLeadScoreRange([0, 100]);
    setStateFilter("");
    setCityFilter("");
  };

  const hasActiveFilters = Array.from(searchParams.keys()).some(
    key => key !== "search"
  );

  if (isCollapsed) {
    return (
      <div className="w-[50px] border-r border-border bg-card p-2 flex flex-col items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="mb-4"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-[280px] border-r border-border bg-card overflow-y-auto">
      <div className="sticky top-0 bg-card border-b border-border p-4 z-10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-foreground">Filters</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={clearAllFilters}
            className="w-full text-xs"
          >
            Clear All Filters
          </Button>
        )}
      </div>

      <div className="p-4 space-y-2">
        {/* Industry Type Filter */}
        <FilterSection
          title="Industry Type"
          isCollapsed={collapsedSections.has('industry')}
          onToggle={() => toggleSection('industry')}
        >
          <div className="space-y-2">
            {['Builder', 'Contractor'].map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={`industry-${type}`}
                  checked={isActiveFilter("industry_type", type)}
                  onCheckedChange={() => handleFilterClick("industry_type", type)}
                />
                <Label
                  htmlFor={`industry-${type}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {type}
                </Label>
              </div>
            ))}
          </div>
        </FilterSection>

        {/* Builder Segments - Only show if Builder industry selected */}
        {industryType === 'Builder' && (
          <FilterSection
            title="Builder Segments"
            isCollapsed={collapsedSections.has('builder-segments')}
            onToggle={() => toggleSection('builder-segments')}
          >
            <div className="space-y-2">
              {BUILDER_SEGMENTS.map(segment => (
                <div key={segment.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`builder-${segment.value}`}
                    checked={isActiveFilter("segment", segment.value)}
                    onCheckedChange={() => handleFilterClick("segment", segment.value)}
                  />
                  <Label
                    htmlFor={`builder-${segment.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {segment.label}
                  </Label>
                </div>
              ))}
            </div>
          </FilterSection>
        )}

        {/* Contractor Segments - Only show if Contractor industry selected */}
        {industryType === 'Contractor' && (
          <FilterSection
            title="Contractor Segments"
            isCollapsed={collapsedSections.has('contractor-segments')}
            onToggle={() => toggleSection('contractor-segments')}
          >
            <div className="space-y-2">
              {CONTRACTOR_SEGMENTS.map(segment => (
                <div key={segment.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`contractor-${segment.value}`}
                    checked={isActiveFilter("segment", segment.value)}
                    onCheckedChange={() => handleFilterClick("segment", segment.value)}
                  />
                  <Label
                    htmlFor={`contractor-${segment.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {segment.label}
                  </Label>
                </div>
              ))}
            </div>
          </FilterSection>
        )}

        {/* Status Filter */}
        <FilterSection
          title="Status"
          isCollapsed={collapsedSections.has('status')}
          onToggle={() => toggleSection('status')}
        >
          <div className="space-y-2">
            {STATUSES.map(status => (
              <div key={status.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${status.value}`}
                  checked={isActiveFilter("status", status.value)}
                  onCheckedChange={() => handleFilterClick("status", status.value)}
                />
                <Label
                  htmlFor={`status-${status.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {status.label}
                </Label>
              </div>
            ))}
          </div>
        </FilterSection>

        {/* Priority Tier Filter */}
        <FilterSection
          title="Priority Tier"
          isCollapsed={collapsedSections.has('priority')}
          onToggle={() => toggleSection('priority')}
        >
          <div className="space-y-2">
            {PRIORITIES.map(priority => (
              <div key={priority.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`priority-${priority.value}`}
                  checked={isActiveFilter("priority", priority.value)}
                  onCheckedChange={() => handleFilterClick("priority", priority.value)}
                />
                <Label
                  htmlFor={`priority-${priority.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {priority.label}
                </Label>
              </div>
            ))}
          </div>
        </FilterSection>

        {/* Geographic Filters */}
        <FilterSection
          title="Geographic"
          isCollapsed={collapsedSections.has('geographic')}
          onToggle={() => toggleSection('geographic')}
        >
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium mb-2 block">State</Label>
              <Select value={stateFilter || undefined} onValueChange={(value) => {
                setStateFilter(value);
                const newParams = new URLSearchParams(searchParams);
                if (value) {
                  newParams.set("state", value);
                } else {
                  newParams.delete("state");
                }
                setSearchParams(newParams);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map(state => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">City</Label>
              <Input
                placeholder="Search cities..."
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                onBlur={() => {
                  if (cityFilter) {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.set("city", cityFilter);
                    setSearchParams(newParams);
                  } else {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete("city");
                    setSearchParams(newParams);
                  }
                }}
              />
            </div>
          </div>
        </FilterSection>

        {/* Score Range Filters */}
        <FilterSection
          title="Score Ranges"
          isCollapsed={collapsedSections.has('scores')}
          onToggle={() => toggleSection('scores')}
        >
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Lead Score: {leadScoreRange[0]} - {leadScoreRange[1]}
              </Label>
              <Slider
                min={0}
                max={100}
                step={5}
                value={leadScoreRange}
                onValueChange={setLeadScoreRange}
                className="w-full"
              />
            </div>
          </div>
        </FilterSection>

        {/* Activity Filters */}
        <FilterSection
          title="Activity"
          isCollapsed={collapsedSections.has('activity')}
          onToggle={() => toggleSection('activity')}
        >
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium mb-2 block">Last Contact</Label>
              <RadioGroup
                value={searchParams.get("last_contact") || ""}
                onValueChange={(value) => {
                  const newParams = new URLSearchParams(searchParams);
                  if (value) {
                    newParams.set("last_contact", value);
                  } else {
                    newParams.delete("last_contact");
                  }
                  setSearchParams(newParams);
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="7d" id="7d" />
                  <Label htmlFor="7d" className="font-normal cursor-pointer">Last 7 days</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="30d" id="30d" />
                  <Label htmlFor="30d" className="font-normal cursor-pointer">Last 30 days</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="90d" id="90d" />
                  <Label htmlFor="90d" className="font-normal cursor-pointer">Last 90 days</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="never" id="never" />
                  <Label htmlFor="never" className="font-normal cursor-pointer">Never contacted</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </FilterSection>

        {/* Data Completeness Filter */}
        <FilterSection
          title="Data Completeness"
          isCollapsed={collapsedSections.has('completeness')}
          onToggle={() => toggleSection('completeness')}
        >
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-website"
                checked={isActiveFilter("has_website", "true")}
                onCheckedChange={() => handleFilterClick("has_website", "true")}
              />
              <Label htmlFor="has-website" className="text-sm font-normal cursor-pointer">
                Has website
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-linkedin"
                checked={isActiveFilter("has_linkedin", "true")}
                onCheckedChange={() => handleFilterClick("has_linkedin", "true")}
              />
              <Label htmlFor="has-linkedin" className="text-sm font-normal cursor-pointer">
                Has LinkedIn
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-partner"
                checked={isActiveFilter("has_partner", "true")}
                onCheckedChange={() => handleFilterClick("has_partner", "true")}
              />
              <Label htmlFor="has-partner" className="text-sm font-normal cursor-pointer">
                Has Nest Pro Partner
              </Label>
            </div>
          </div>
        </FilterSection>
      </div>
    </div>
  );
}
