'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Globe, Linkedin, Facebook, Instagram, Youtube, Star } from 'lucide-react';
import { getFieldScoringOptions } from '@/lib/scoring/rangeScoringEngine';

interface DigitalEngagementSectionProps {
  industryType: 'Builder' | 'Contractor' | 'Energy Implementer' | 'Engineer/Architect';
  
  // Website
  websiteUrl: string;
  onWebsiteUrlChange: (value: string) => void;
  websiteQuality: string;
  onWebsiteQualityChange: (value: string) => void;
  websiteHasSmartContent: boolean;
  onWebsiteHasSmartContentChange: (value: boolean) => void;
  
  // LinkedIn
  linkedinUrl: string;
  onLinkedinUrlChange: (value: string) => void;
  linkedinActivityLevel: string;
  onLinkedinActivityLevelChange: (value: string) => void;
  
  // Other Social
  facebookUrl?: string;
  onFacebookUrlChange?: (value: string) => void;
  instagramUrl?: string;
  onInstagramUrlChange?: (value: string) => void;
  youtubeUrl?: string;
  onYoutubeUrlChange?: (value: string) => void;
  
  // Technology
  technologyAdoptionLevel: string;
  onTechnologyAdoptionLevelChange: (value: string) => void;
  nestInstallationVolume: string;
  onNestInstallationVolumeChange: (value: string) => void;
  
  // Smart Home Offerings
  offersSmartThermostats: boolean;
  onOffersSmartThermostatsChange: (value: boolean) => void;
  offersSmartSecurity: boolean;
  onOffersSmartSecurityChange: (value: boolean) => void;
  offersHomeAutomation: boolean;
  onOffersHomeAutomationChange: (value: boolean) => void;
}

export function DigitalEngagementSection(props: DigitalEngagementSectionProps) {
  const [websiteScoring, setWebsiteScoring] = useState<any[]>([]);
  const [linkedinScoring, setLinkedinScoring] = useState<any[]>([]);
  const [techScoring, setTechScoring] = useState<any[]>([]);
  const [nestScoring, setNestScoring] = useState<any[]>([]);

  useEffect(() => {
    loadScoringOptions();
  }, [props.industryType]);

  const loadScoringOptions = async () => {
    // Map new types to existing scoring (use Contractor as default for new types)
    const scoringType = (props.industryType === 'Builder') ? 'Builder' : 'Contractor';
    
    const website = await getFieldScoringOptions('website_quality', scoringType);
    const linkedin = await getFieldScoringOptions('linkedin_activity_level', scoringType);
    const tech = await getFieldScoringOptions('technology_adoption_level', scoringType);
    const nest = await getFieldScoringOptions('nest_installation_volume_range', scoringType);
    
    setWebsiteScoring(website);
    setLinkedinScoring(linkedin);
    setTechScoring(tech);
    setNestScoring(nest);
  };

  const getScoreForValue = (options: any[], value: string) => {
    const option = options.find(opt => opt.range === value);
    return option?.points || 0;
  };

  return (
    <div className="space-y-6 bg-purple-50 p-4 rounded-lg border border-purple-200">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm uppercase text-purple-700 flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Digital Engagement
          <span className="text-xs font-normal normal-case text-purple-600">
            (Website, Social Media, Technology Adoption - affects scoring)
          </span>
        </h3>
      </div>

      {/* WEBSITE SECTION */}
      <div className="space-y-4 bg-background p-4 rounded-lg border">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-4 w-4 text-blue-600" />
          <h4 className="font-semibold text-sm">Website & Online Presence</h4>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="website_url">Website URL</Label>
            <Input
              id="website_url"
              type="url"
              value={props.websiteUrl}
              onChange={(e) => props.onWebsiteUrlChange(e.target.value)}
              placeholder="https://www.example.com"
            />
          </div>

          <div>
            <Label htmlFor="website_quality">
              Website Quality
              {props.websiteQuality && (
                <Badge className="ml-2" variant="outline">
                  {getScoreForValue(websiteScoring, props.websiteQuality)} pts
                </Badge>
              )}
            </Label>
            <Select value={props.websiteQuality} onValueChange={props.onWebsiteQualityChange}>
              <SelectTrigger id="website_quality">
                <SelectValue placeholder="Assess quality..." />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {websiteScoring.map((option) => (
                  <SelectItem key={option.range} value={option.range}>
                    {option.range}
                    <span className="ml-2 text-xs text-muted-foreground">• {option.points} pts</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              📈 Professional = 10pts, Basic = 6pts, Outdated = 3pts
            </p>
          </div>

          <div className="flex items-center space-x-2 pt-6">
            <Checkbox
              id="website_smart_content"
              checked={props.websiteHasSmartContent}
              onCheckedChange={props.onWebsiteHasSmartContentChange}
            />
            <Label htmlFor="website_smart_content" className="text-sm font-normal cursor-pointer">
              Website mentions smart home products/services
            </Label>
          </div>
        </div>
      </div>

      {/* LINKEDIN & SOCIAL MEDIA SECTION */}
      <div className="space-y-4 bg-background p-4 rounded-lg border">
        <div className="flex items-center gap-2 mb-2">
          <Linkedin className="h-4 w-4 text-blue-600" />
          <h4 className="font-semibold text-sm">LinkedIn & Social Media</h4>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="linkedin_url">
              <Linkedin className="h-3 w-3 inline mr-1" />
              LinkedIn Company URL
            </Label>
            <Input
              id="linkedin_url"
              type="url"
              value={props.linkedinUrl}
              onChange={(e) => props.onLinkedinUrlChange(e.target.value)}
              placeholder="https://linkedin.com/company/..."
            />
          </div>

          <div>
            <Label htmlFor="linkedin_activity">
              LinkedIn Activity Level
              {props.linkedinActivityLevel && (
                <Badge className="ml-2" variant="outline">
                  {getScoreForValue(linkedinScoring, props.linkedinActivityLevel)} pts
                </Badge>
              )}
            </Label>
            <Select value={props.linkedinActivityLevel} onValueChange={props.onLinkedinActivityLevelChange}>
              <SelectTrigger id="linkedin_activity">
                <SelectValue placeholder="Select activity..." />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {linkedinScoring.map((option) => (
                  <SelectItem key={option.range} value={option.range}>
                    {option.range}
                    <span className="ml-2 text-xs text-muted-foreground">• {option.points} pts</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              📈 Very Active = 10pts, Active = 7pts, Moderate = 4pts
            </p>
          </div>

          {/* Other Social Media */}
          {props.onFacebookUrlChange && (
            <div>
              <Label htmlFor="facebook_url">
                <Facebook className="h-3 w-3 inline mr-1" />
                Facebook Page (Optional)
              </Label>
              <Input
                id="facebook_url"
                type="url"
                value={props.facebookUrl || ''}
                onChange={(e) => props.onFacebookUrlChange?.(e.target.value)}
                placeholder="https://facebook.com/..."
              />
            </div>
          )}

          {props.onInstagramUrlChange && (
            <div>
              <Label htmlFor="instagram_url">
                <Instagram className="h-3 w-3 inline mr-1" />
                Instagram (Optional)
              </Label>
              <Input
                id="instagram_url"
                type="url"
                value={props.instagramUrl || ''}
                onChange={(e) => props.onInstagramUrlChange?.(e.target.value)}
                placeholder="https://instagram.com/..."
              />
            </div>
          )}

          {props.onYoutubeUrlChange && (
            <div>
              <Label htmlFor="youtube_url">
                <Youtube className="h-3 w-3 inline mr-1" />
                YouTube Channel (Optional)
              </Label>
              <Input
                id="youtube_url"
                type="url"
                value={props.youtubeUrl || ''}
                onChange={(e) => props.onYoutubeUrlChange?.(e.target.value)}
                placeholder="https://youtube.com/@..."
              />
            </div>
          )}
        </div>
      </div>

      {/* TECHNOLOGY ADOPTION SECTION */}
      <div className="space-y-4 bg-background p-4 rounded-lg border">
        <div className="flex items-center gap-2 mb-2">
          <Star className="h-4 w-4 text-yellow-600" />
          <h4 className="font-semibold text-sm">Technology Adoption & Smart Home Offerings</h4>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="tech_adoption">
              Overall Technology Adoption
              {props.technologyAdoptionLevel && (
                <Badge className="ml-2" variant="outline">
                  {getScoreForValue(techScoring, props.technologyAdoptionLevel)} pts
                </Badge>
              )}
            </Label>
            <Select value={props.technologyAdoptionLevel} onValueChange={props.onTechnologyAdoptionLevelChange}>
              <SelectTrigger id="tech_adoption">
                <SelectValue placeholder="Select level..." />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {techScoring.map((option) => (
                  <SelectItem key={option.range} value={option.range}>
                    {option.range}
                    <span className="ml-2 text-xs text-muted-foreground">• {option.points} pts</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              📈 Industry Leader = 10pts, Early Adopter = 8pts, Mainstream = 5pts
            </p>
          </div>

          <div>
            <Label htmlFor="nest_volume">
              Google Nest Installation Volume
              {props.nestInstallationVolume && (
                <Badge className="ml-2" variant="outline">
                  {getScoreForValue(nestScoring, props.nestInstallationVolume)} pts
                </Badge>
              )}
            </Label>
            <Select value={props.nestInstallationVolume} onValueChange={props.onNestInstallationVolumeChange}>
              <SelectTrigger id="nest_volume">
                <SelectValue placeholder="Select volume..." />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {nestScoring.map((option) => (
                  <SelectItem key={option.range} value={option.range}>
                    {option.range}
                    <span className="ml-2 text-xs text-muted-foreground">• {option.points} pts</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              📈 50+/year = 10pts, 20-49/year = 8pts, 10-19/year = 6pts
            </p>
          </div>

          {/* Smart Home Offerings Checkboxes */}
          <div className="col-span-2 space-y-2">
            <Label className="text-sm font-semibold">Smart Home Products/Services Offered:</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="offers_thermostats"
                checked={props.offersSmartThermostats}
                onCheckedChange={props.onOffersSmartThermostatsChange}
              />
              <Label htmlFor="offers_thermostats" className="text-sm font-normal cursor-pointer">
                Smart Thermostats (Nest, Ecobee, etc.)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="offers_security"
                checked={props.offersSmartSecurity}
                onCheckedChange={props.onOffersSmartSecurityChange}
              />
              <Label htmlFor="offers_security" className="text-sm font-normal cursor-pointer">
                Smart Security (Cameras, Doorbells, Locks)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="offers_automation"
                checked={props.offersHomeAutomation}
                onCheckedChange={props.onOffersHomeAutomationChange}
              />
              <Label htmlFor="offers_automation" className="text-sm font-normal cursor-pointer">
                Home Automation Systems (Lighting, Hubs, Whole Home)
              </Label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
