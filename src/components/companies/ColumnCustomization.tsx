import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export interface ColumnVisibility {
  companyName: boolean;
  type: boolean;
  segment: boolean;
  structure: boolean;
  parentCompany: boolean;
  contractorSpecialty: boolean;
  status: boolean;
  score: boolean;
  priority: boolean;
  phone: boolean;
  website: boolean;
  franchise: boolean;
  annualVolume: boolean;
  revenue: boolean;
}

interface ColumnCustomizationProps {
  visibility: ColumnVisibility;
  onChange: (visibility: ColumnVisibility) => void;
}

export function ColumnCustomization({ visibility, onChange }: ColumnCustomizationProps) {
  const columns = [
    { key: "companyName", label: "Company Name", required: true },
    { key: "type", label: "Company Type", required: false },
    { key: "segment", label: "Segment", required: false },
    { key: "structure", label: "Company Structure", required: false },
    { key: "parentCompany", label: "Parent Company", required: false },
    { key: "contractorSpecialty", label: "Contractor Specialty", required: false },
    { key: "status", label: "Status", required: true },
    { key: "score", label: "Lead Score", required: false },
    { key: "priority", label: "Priority", required: false },
    { key: "annualVolume", label: "Annual Volume", required: false },
    { key: "revenue", label: "Price/Revenue", required: false },
    { key: "phone", label: "Phone", required: false },
    { key: "website", label: "Website", required: false },
    { key: "franchise", label: "Franchise", required: false },
  ];

  const handleToggle = (key: keyof ColumnVisibility) => {
    onChange({
      ...visibility,
      [key]: !visibility[key],
    });
  };

  const handleShowAll = () => {
    const allVisible = columns.reduce((acc, col) => ({
      ...acc,
      [col.key]: true,
    }), {} as ColumnVisibility);
    onChange(allVisible);
  };

  const handleShowRequired = () => {
    const requiredOnly = columns.reduce((acc, col) => ({
      ...acc,
      [col.key]: col.required,
    }), {} as ColumnVisibility);
    onChange(requiredOnly);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="p-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Customize Columns</span>
          </div>
          
          <div className="space-y-2 mb-3">
            {columns.map((column) => (
              <div key={column.key} className="flex items-center space-x-2">
                <Checkbox
                  id={column.key}
                  checked={visibility[column.key as keyof ColumnVisibility]}
                  onCheckedChange={() => handleToggle(column.key as keyof ColumnVisibility)}
                  disabled={column.required}
                />
                <Label
                  htmlFor={column.key}
                  className="text-sm font-normal cursor-pointer flex-1"
                >
                  {column.label}
                  {column.required && (
                    <span className="text-xs text-muted-foreground ml-1">(required)</span>
                  )}
                </Label>
              </div>
            ))}
          </div>

          <Separator className="my-2" />

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs"
              onClick={handleShowAll}
            >
              Show All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs"
              onClick={handleShowRequired}
            >
              Reset
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
