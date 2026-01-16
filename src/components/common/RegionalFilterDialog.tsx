import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { MapPin, X } from "lucide-react";
import { WEST_STATES, EAST_STATES } from "@/lib/regions/regionConstants";

interface RegionalFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyFilters: (filters: RegionalFilters) => void;
  initialFilters?: RegionalFilters;
}

export interface RegionalFilters {
  filterType: 'region' | 'state' | 'metro' | 'city';
  regions?: string[];
  states?: string[];
  metros?: string[];
  cities?: string[];
}

// Binary East vs West regions matching Pipeline Analytics
const REGIONS = {
  West: {
    color: 'bg-purple-500',
    textColor: 'text-purple-600',
    states: [...WEST_STATES] as string[]
  },
  East: {
    color: 'bg-blue-500',
    textColor: 'text-blue-600',
    states: [...EAST_STATES] as string[]
  }
};

const MAJOR_METROS = [
  // West Coast
  { name: 'Los Angeles', region: 'West' },
  { name: 'San Francisco', region: 'West' },
  { name: 'San Diego', region: 'West' },
  { name: 'Seattle', region: 'West' },
  { name: 'Portland', region: 'West' },
  { name: 'Phoenix', region: 'West' },
  { name: 'Denver', region: 'West' },
  { name: 'Las Vegas', region: 'West' },
  { name: 'Austin', region: 'West' },
  { name: 'Dallas', region: 'West' },
  { name: 'Houston', region: 'West' },
  { name: 'San Antonio', region: 'West' },
  // East Coast / Midwest
  { name: 'New York', region: 'East' },
  { name: 'Chicago', region: 'East' },
  { name: 'Philadelphia', region: 'East' },
  { name: 'Boston', region: 'East' },
  { name: 'Washington DC', region: 'East' },
  { name: 'Atlanta', region: 'East' },
  { name: 'Miami', region: 'East' },
  { name: 'Charlotte', region: 'East' },
  { name: 'Minneapolis', region: 'East' },
  { name: 'Detroit', region: 'East' },
  { name: 'Tampa', region: 'East' },
  { name: 'Nashville', region: 'East' },
];

export const RegionalFilterDialog = ({ 
  open, 
  onOpenChange, 
  onApplyFilters,
  initialFilters 
}: RegionalFilterDialogProps) => {
  const [filterType, setFilterType] = useState<RegionalFilters['filterType']>(
    initialFilters?.filterType || 'region'
  );
  const [selectedRegions, setSelectedRegions] = useState<string[]>(initialFilters?.regions || []);
  const [selectedStates, setSelectedStates] = useState<string[]>(initialFilters?.states || []);
  const [selectedMetros, setSelectedMetros] = useState<string[]>(initialFilters?.metros || []);

  const handleRegionToggle = (region: string) => {
    setSelectedRegions(prev => 
      prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]
    );
  };

  const handleStateToggle = (state: string) => {
    setSelectedStates(prev =>
      prev.includes(state) ? prev.filter(s => s !== state) : [...prev, state]
    );
  };

  const handleMetroToggle = (metro: string) => {
    setSelectedMetros(prev =>
      prev.includes(metro) ? prev.filter(m => m !== metro) : [...prev, metro]
    );
  };

  const handleApply = () => {
    onApplyFilters({
      filterType,
      regions: filterType === 'region' ? selectedRegions : undefined,
      states: filterType === 'state' ? selectedStates : undefined,
      metros: filterType === 'metro' ? selectedMetros : undefined,
    });
    onOpenChange(false);
  };

  const handleClear = () => {
    setSelectedRegions([]);
    setSelectedStates([]);
    setSelectedMetros([]);
    onApplyFilters({
      filterType: 'region',
      regions: [],
      states: [],
      metros: []
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Regional Search
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filter Type Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Search By</Label>
            <RadioGroup value={filterType} onValueChange={(value) => setFilterType(value as any)}>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="region" id="region" />
                  <Label htmlFor="region" className="cursor-pointer flex-1">Region</Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="state" id="state" />
                  <Label htmlFor="state" className="cursor-pointer flex-1">State</Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="metro" id="metro" />
                  <Label htmlFor="metro" className="cursor-pointer flex-1">Metro Area</Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer opacity-50">
                  <RadioGroupItem value="city" id="city" disabled />
                  <Label htmlFor="city" className="cursor-pointer flex-1">City (Coming Soon)</Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Region Selection - Binary East vs West */}
          {filterType === 'region' && (
            <div>
              <Label className="text-base font-semibold mb-3 block">Select Regions</Label>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(REGIONS).map(([region, data]) => (
                  <div
                    key={region}
                    className={`flex items-center space-x-3 border rounded-lg p-5 hover:bg-accent cursor-pointer transition-all ${
                      selectedRegions.includes(region) ? 'border-primary bg-accent ring-2 ring-primary/20' : ''
                    }`}
                    onClick={() => handleRegionToggle(region)}
                  >
                    <Checkbox
                      checked={selectedRegions.includes(region)}
                      onCheckedChange={() => handleRegionToggle(region)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${data.color}`} />
                        <span className={`font-semibold text-lg ${data.textColor}`}>{region}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {data.states.length} states
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Visual hint about region contents */}
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-purple-600">West:</span>
                    <span className="text-muted-foreground ml-2">
                      Pacific, Mountain, Great Plains, TX
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-600">East:</span>
                    <span className="text-muted-foreground ml-2">
                      Midwest, Southeast, Northeast, Atlantic
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* State Selection - organized by East/West */}
          {filterType === 'state' && (
            <div>
              <Label className="text-base font-semibold mb-3 block">Select States</Label>
              <div className="grid grid-cols-2 gap-6">
                {Object.entries(REGIONS).map(([region, data]) => (
                  <div key={region} className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <div className={`w-3 h-3 rounded-full ${data.color}`} />
                      <span className={`font-semibold ${data.textColor}`}>{region}</span>
                      <span className="text-xs text-muted-foreground">({data.states.length} states)</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 max-h-64 overflow-y-auto">
                      {data.states.map(state => (
                        <div
                          key={state}
                          className={`flex items-center space-x-2 p-2 rounded hover:bg-accent cursor-pointer ${
                            selectedStates.includes(state) ? 'bg-accent' : ''
                          }`}
                          onClick={() => handleStateToggle(state)}
                        >
                          <Checkbox
                            checked={selectedStates.includes(state)}
                            onCheckedChange={() => handleStateToggle(state)}
                          />
                          <span className="text-sm">{state}</span>
                        </div>
                      ))}
                    </div>
                    {/* Quick select all button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => {
                        const allSelected = data.states.every(s => selectedStates.includes(s));
                        if (allSelected) {
                          setSelectedStates(prev => prev.filter(s => !data.states.includes(s)));
                        } else {
                          setSelectedStates(prev => [...new Set([...prev, ...data.states])]);
                        }
                      }}
                    >
                      {data.states.every(s => selectedStates.includes(s)) ? 'Deselect All' : 'Select All'} {region}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metro Area Selection - organized by East/West */}
          {filterType === 'metro' && (
            <div>
              <Label className="text-base font-semibold mb-3 block">Select Metro Areas</Label>
              <div className="grid grid-cols-2 gap-6">
                {['West', 'East'].map(region => {
                  const regionData = REGIONS[region as keyof typeof REGIONS];
                  const regionMetros = MAJOR_METROS.filter(m => m.region === region);
                  return (
                    <div key={region} className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <div className={`w-3 h-3 rounded-full ${regionData.color}`} />
                        <span className={`font-semibold ${regionData.textColor}`}>{region}</span>
                      </div>
                      <div className="space-y-1">
                        {regionMetros.map(metro => (
                          <div
                            key={metro.name}
                            className={`flex items-center space-x-2 p-2 rounded-lg border hover:bg-accent cursor-pointer ${
                              selectedMetros.includes(metro.name) ? 'border-primary bg-accent' : ''
                            }`}
                            onClick={() => handleMetroToggle(metro.name)}
                          >
                            <Checkbox
                              checked={selectedMetros.includes(metro.name)}
                              onCheckedChange={() => handleMetroToggle(metro.name)}
                            />
                            <span>{metro.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Filters Summary */}
          {(selectedRegions.length > 0 || selectedStates.length > 0 || selectedMetros.length > 0) && (
            <div className="border-t pt-4">
              <Label className="text-sm font-semibold mb-2 block">Active Filters</Label>
              <div className="flex flex-wrap gap-2">
                {selectedRegions.map(region => {
                  const regionData = REGIONS[region as keyof typeof REGIONS];
                  return (
                    <Badge key={region} variant="secondary" className="gap-1">
                      <div className={`w-2 h-2 rounded-full ${regionData?.color}`} />
                      {region}
                      <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => handleRegionToggle(region)} />
                    </Badge>
                  );
                })}
                {selectedStates.map(state => (
                  <Badge key={state} variant="secondary">
                    {state}
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => handleStateToggle(state)} />
                  </Badge>
                ))}
                {selectedMetros.map(metro => (
                  <Badge key={metro} variant="secondary">
                    {metro}
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => handleMetroToggle(metro)} />
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClear}>
            Clear All
          </Button>
          <Button onClick={handleApply}>
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
