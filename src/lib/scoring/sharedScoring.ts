import { supabase } from '@/integrations/supabase/client';

/**
 * Shared scoring functions used by both Builder and Contractor scoring
 */

// ============================================
// DIGITAL ENGAGEMENT SCORING (30 points)
// ============================================

export function calculateWebsiteScore(websiteUrl?: string): number {
  if (!websiteUrl) return 0;
  // Has website = 6 points base
  return 6;
}

export function calculateSocialMediaScore(linkedinUrl?: string): number {
  if (!linkedinUrl) return 0;
  // Has LinkedIn = 5 points base
  return 5;
}

export function calculateTechnologyScore(installations: any[]): number {
  if (!installations || installations.length === 0) return 0;

  // Score based on installation count and recency
  const recentInstalls = installations.filter(i => {
    const monthsSince = 
      (Date.now() - new Date(i.installation_date).getTime()) / 
      (1000 * 60 * 60 * 24 * 30);
    return monthsSince <= 12;
  });

  if (recentInstalls.length >= 20) return 10;
  if (recentInstalls.length >= 10) return 8;
  if (recentInstalls.length >= 5) return 6;
  if (recentInstalls.length >= 1) return 4;
  return 0;
}

// ============================================
// CONTACT SCORING (20 points)
// ============================================

export function calculateDecisionAuthorityScore(contacts: any[]): number {
  if (!contacts || contacts.length === 0) return 0;

  let maxScore = 0;

  const titleScores: Record<string, number> = {
    'CEO': 10, 'President': 10, 'Owner': 10, 'Founder': 10,
    'COO': 10, 'CFO': 10, 'CMO': 10, 'CTO': 10,
    'VP': 8, 'Vice President': 8,
    'Director': 6,
    'Manager': 4
  };

  contacts.forEach(contact => {
    const title = (contact.title || '').toUpperCase();
    
    for (const [keyword, score] of Object.entries(titleScores)) {
      if (title.includes(keyword.toUpperCase())) {
        maxScore = Math.max(maxScore, score);
      }
    }
  });

  return maxScore;
}

export function calculateLinkedInScore(contacts: any[]): number {
  if (!contacts || contacts.length === 0) return 0;

  let maxScore = 0;

  contacts.forEach(contact => {
    let contactScore = 0;

    // Has LinkedIn URL = 3 points
    if (contact.linkedin_url) contactScore += 3;

    // 1000+ connections = 4 points
    if (contact.linkedin_connections >= 1000) contactScore += 4;

    maxScore = Math.max(maxScore, contactScore);
  });

  return Math.min(maxScore, 10);
}

// ============================================
// CONFIDENCE CALCULATION
// ============================================

export function calculateConfidence(company: any): 'High' | 'Medium' | 'Low' {
  let dataPoints = 0;

  // Count available data points
  if (company.annual_volume > 0) dataPoints++;
  if (company.annual_revenue_range) dataPoints++;
  if (company.website_url) dataPoints++;
  if (company.linkedin_company_url) dataPoints++;
  if (company.contacts?.length > 0) dataPoints++;
  if (company.installations?.length > 0) dataPoints++;
  if (company.city) dataPoints++;
  if (company.years_in_business) dataPoints++;

  const completeness = (dataPoints / 8) * 100;

  if (completeness >= 90) return 'High';
  if (completeness >= 70) return 'Medium';
  return 'Low';
}

// ============================================
// GEOGRAPHIC SCORING
// ============================================

export function calculateGeographicScore(state?: string): number {
  if (!state) return 0;

  // Primary Sun Belt markets
  const primaryMarkets = ['TX', 'FL', 'NC', 'AZ', 'GA', 'TN'];
  if (primaryMarkets.includes(state.toUpperCase())) return 10;

  // Secondary growth markets
  const secondaryMarkets = ['CO', 'UT', 'VA', 'SC', 'NV', 'ID'];
  if (secondaryMarkets.includes(state.toUpperCase())) return 7;

  // All other locations
  return 4;
}
