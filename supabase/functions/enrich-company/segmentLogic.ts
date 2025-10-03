// Automatic segment assignment based on enriched company data

interface SegmentCriteria {
  name: string;
  industryType: 'Builder' | 'Contractor';
  employeeMin?: number;
  employeeMax?: number;
  revenueMin?: number;  // in millions
  revenueMax?: number;  // in millions
  keywords?: string[];
  priority: number; // Lower number = higher priority
}

const SEGMENT_DEFINITIONS: SegmentCriteria[] = [
  // Builder Segments
  {
    name: 'production_tract',
    industryType: 'Builder',
    employeeMin: 201,
    employeeMax: 1000,
    revenueMin: 50,
    revenueMax: 100,
    priority: 1
  },
  {
    name: 'luxury_custom',
    industryType: 'Builder',
    employeeMin: 51,
    employeeMax: 500,
    revenueMin: 10,
    revenueMax: 50,
    keywords: ['luxury', 'custom', 'premium', 'high-end'],
    priority: 2
  },
  {
    name: 'regional_mid_volume',
    industryType: 'Builder',
    employeeMin: 51,
    employeeMax: 200,
    revenueMin: 10,
    revenueMax: 50,
    priority: 3
  },
  {
    name: 'multi_family',
    industryType: 'Builder',
    employeeMin: 51,
    employeeMax: 500,
    revenueMin: 10,
    keywords: ['multi-family', 'apartment', 'multifamily'],
    priority: 4
  },
  
  // Contractor Segments (Priority: 30%, 25%, 20%, 10%, 8%, 4%, 3%)
  {
    name: 'smart_home_champions',
    industryType: 'Contractor',
    employeeMin: 15,
    employeeMax: 50,
    revenueMin: 2,
    revenueMax: 8,
    keywords: ['smart home', 'home automation', 'smart living', 'connected home', 'google nest', 'nest certified', 'technology integration', 'iot', 'voice control', 'whole home automation'],
    priority: 1  // 30% allocation
  },
  {
    name: 'customer_experience',
    industryType: 'Contractor',
    employeeMin: 10,
    employeeMax: 40,
    revenueMin: 1.5,
    revenueMax: 6,
    keywords: ['white-glove', 'customer satisfaction', 'peace of mind', 'trusted', 'reliable', 'family-owned', 'customer-first', 'service excellence', 'relationship', 'maintenance plans'],
    priority: 2  // 25% allocation
  },
  {
    name: 'high_volume',
    industryType: 'Contractor',
    employeeMin: 25,
    employeeMax: 100,
    revenueMin: 5,
    revenueMax: 25,
    keywords: ['builder services', 'new construction', 'volume', 'fleet', 'commercial residential', 'multi-family', 'developer', 'licensed and insured'],
    priority: 3  // 20% allocation
  },
  {
    name: 'premium_specialists',
    industryType: 'Contractor',
    employeeMin: 5,
    employeeMax: 25,
    revenueMin: 1,
    revenueMax: 5,
    keywords: ['luxury', 'estate', 'custom', 'bespoke', 'premier', 'exclusive', 'high-end', 'premium', 'sophisticated', 'concierge', 'white-glove', 'architectural'],
    priority: 4  // 10% allocation
  },
  {
    name: 'regional_growth',
    industryType: 'Contractor',
    employeeMin: 8,
    employeeMax: 30,
    revenueMin: 1,
    revenueMax: 4,
    keywords: ['now serving', 'expanding to', 'recently opened', 'new location', 'growing', 'opening soon', 'now hiring', 'join our team', 'career opportunities'],
    priority: 5  // 8% allocation
  },
  {
    name: 'specialty_integrators',
    industryType: 'Contractor',
    employeeMin: 5,
    employeeMax: 20,
    revenueMin: 1,
    revenueMax: 4,
    keywords: ['building automation', 'bms', 'controls', 'integration', 'smart building', 'commercial hvac', 'systems integration', 'automation controls', 'ddc', 'leed', 'energy management', 'bacnet', 'modbus'],
    priority: 6  // 4% allocation
  },
  {
    name: 'traditionalists',
    industryType: 'Contractor',
    employeeMin: 3,
    employeeMax: 15,
    revenueMin: 0.5,
    revenueMax: 2,
    keywords: ['trusted', 'family-owned', 'since', 'local', 'reliable', 'honest', 'fair', 'dependable', 'established', 'traditional', '24/7', 'emergency service'],
    priority: 7  // 3% allocation
  }
];

function parseRevenueRange(revenueRange: string | null): number | null {
  if (!revenueRange) return null;
  
  // Extract the lower bound of the range and convert to millions
  const ranges: Record<string, number> = {
    '<$500K': 0.25,
    '$500K-$999K': 0.75,
    '$1M-$2.9M': 2,
    '$3M-$5.9M': 4.5,
    '$6M-$10M': 8,
    '$10M+': 15,
    '$10M-$50M': 30,
    '$50M-$100M': 75,
    '$100M+': 150
  };
  
  return ranges[revenueRange] || null;
}

function matchesKeywords(company: any, updates: any, keywords: string[]): boolean {
  const textFields = [
    company.company_name,
    company.notes,
    company.website_url,
    company.contractor_specialty,
    updates.company_name,
    updates.notes,
    updates.website_url,
    updates.contractor_specialty
  ].filter(Boolean).join(' ').toLowerCase();
  
  return keywords.some(keyword => textFields.includes(keyword.toLowerCase()));
}

export function determineSegment(company: any, updates: any): string | null {
  const industryType = updates.industry_type || company.industry_type;
  if (!industryType) return null;
  
  // Get enriched employee count
  const employees = updates.total_employees || company.total_employees;
  
  // Get enriched revenue (in millions)
  const revenueRange = updates.annual_revenue_range || company.annual_revenue_range;
  const revenue = parseRevenueRange(revenueRange);
  
  console.log(`Segment matching - Industry: ${industryType}, Employees: ${employees}, Revenue: ${revenue}M`);
  
  // Filter segments by industry type and sort by priority
  const matchingSegments = SEGMENT_DEFINITIONS
    .filter(seg => seg.industryType === industryType)
    .sort((a, b) => a.priority - b.priority);
  
  // Find the best matching segment
  for (const segment of matchingSegments) {
    let matches = true;
    
    // Check employee count
    if (employees) {
      if (segment.employeeMin && employees < segment.employeeMin) matches = false;
      if (segment.employeeMax && employees > segment.employeeMax) matches = false;
    }
    
    // Check revenue
    if (revenue && matches) {
      if (segment.revenueMin && revenue < segment.revenueMin) matches = false;
      if (segment.revenueMax && revenue > segment.revenueMax) matches = false;
    }
    
    // Check keywords (optional, adds specificity)
    if (matches && segment.keywords && segment.keywords.length > 0) {
      const keywordMatch = matchesKeywords(company, updates, segment.keywords);
      // Keywords are a bonus for specific segments, but not required
      if (keywordMatch) {
        console.log(`Matched segment: ${segment.name} (with keywords)`);
        return segment.name;
      }
    }
    
    // If all required criteria match (even without keywords)
    if (matches && (employees || revenue)) {
      console.log(`Matched segment: ${segment.name}`);
      return segment.name;
    }
  }
  
  // Default fallback based on size and revenue if no keyword match
  if (employees || revenue) {
    if (industryType === 'Builder') {
      if (employees >= 201 || (revenue && revenue >= 50)) return 'production_tract';
      if (employees >= 51 || (revenue && revenue >= 10)) return 'regional_mid_volume';
      return 'spec_home'; // Small builders
    } else if (industryType === 'Contractor') {
      // High volume: 25-100+ employees, $5M+ revenue
      if (employees >= 25 && revenue && revenue >= 5) return 'high_volume';
      
      // Smart home champions: 15-50 employees, $2M-$8M revenue
      if (employees >= 15 && employees <= 50 && revenue && revenue >= 2) return 'smart_home_champions';
      
      // Customer experience: 10-40 employees, $1.5M-$6M revenue
      if (employees >= 10 && employees <= 40 && revenue && revenue >= 1.5) return 'customer_experience';
      
      // Regional growth: 8-30 employees, $1M-$4M revenue
      if (employees >= 8 && employees <= 30 && revenue && revenue >= 1) return 'regional_growth';
      
      // Premium specialists: 5-25 employees, $1M-$5M revenue
      if (employees >= 5 && employees <= 25) return 'premium_specialists';
      
      // Traditionalists: 3-15 employees, $500K-$2M revenue (smallest)
      if (employees >= 3) return 'traditionalists';
    }
  }
  
  console.log('No segment match found');
  return null;
}
