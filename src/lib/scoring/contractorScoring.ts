import { supabase } from '@/integrations/supabase/client';
import {
  calculateWebsiteScore,
  calculateSocialMediaScore,
  calculateTechnologyScore,
  calculateDecisionAuthorityScore,
  calculateLinkedInScore,
  calculateConfidence,
  calculateGeographicScore
} from './sharedScoring';

export interface ContractorScoringBreakdown {
  // Firmographic (50 points)
  volumeScore: number; // 0-15
  revenueScore: number; // 0-10
  geographicScore: number; // 0-10
  stabilityScore: number; // 0-10
  businessModelScore: number; // 0-5
  firmographicTotal: number; // 0-50
  
  // Digital (30 points)
  websiteQualityScore: number; // 0-10
  socialMediaScore: number; // 0-10
  technologyAdoptionScore: number; // 0-10
  digitalTotal: number; // 0-30
  
  // Contact (20 points)
  decisionAuthorityScore: number; // 0-10
  linkedinProfessionalScore: number; // 0-10
  contactTotal: number; // 0-20
  
  // Total
  totalScore: number; // 0-100
  priorityTier: 'P1' | 'P2' | 'P3' | 'Unscored';
  confidence: 'High 90%+' | 'Medium 70-89%' | 'Low <70%';
}

/**
 * Calculate lead score for CONTRACTORS
 */
export async function calculateContractorScore(companyId: string): Promise<ContractorScoringBreakdown> {
  // Fetch company with related data
  const { data: company, error } = await supabase
    .from('companies')
    .select(`
      *,
      contacts:contacts(id, title, linkedin_url, linkedin_connections),
      installations:installation_history(product_type, installation_date)
    `)
    .eq('id', companyId)
    .single();

  if (error || !company) {
    throw new Error(`Company not found: ${companyId}`);
  }

  const scoring: ContractorScoringBreakdown = {
    volumeScore: 0,
    revenueScore: 0,
    geographicScore: 0,
    stabilityScore: 0,
    businessModelScore: 0,
    firmographicTotal: 0,
    websiteQualityScore: 0,
    socialMediaScore: 0,
    technologyAdoptionScore: 0,
    digitalTotal: 0,
    decisionAuthorityScore: 0,
    linkedinProfessionalScore: 0,
    contactTotal: 0,
    totalScore: 0,
    priorityTier: 'Unscored',
    confidence: 'Low <70%'
  };

  // ============================================
  // FIRMOGRAPHIC (50 points)
  // ============================================

  // 1. Volume Score (0-15 points) - SERVICE CALLS PER YEAR
  scoring.volumeScore = calculateContractorVolumeScore(company.annual_volume);

  // 2. Revenue Score (0-10 points) - REVENUE RANGE
  scoring.revenueScore = calculateContractorRevenueScore(company.annual_revenue_range);

  // 3. Geographic Score (0-10 points)
  scoring.geographicScore = calculateGeographicScore(company.state);

  // 4. Stability Score (0-10 points)
  scoring.stabilityScore = calculateContractorStabilityScore({
    yearsInBusiness: company.years_in_business,
    employees: company.total_employees
  });

  // 5. Business Model Score (0-5 points) - MAINTENANCE/EMERGENCY MIX
  scoring.businessModelScore = calculateBusinessModelScore({
    maintenancePercentage: company.maintenance_contract_percentage,
    emergencyPercentage: company.emergency_service_percentage
  });

  scoring.firmographicTotal = 
    scoring.volumeScore +
    scoring.revenueScore +
    scoring.geographicScore +
    scoring.stabilityScore +
    scoring.businessModelScore;

  // ============================================
  // DIGITAL ENGAGEMENT (30 points)
  // ============================================

  scoring.websiteQualityScore = calculateWebsiteScore(company.website_url);
  scoring.socialMediaScore = calculateSocialMediaScore(company.linkedin_company_url);
  scoring.technologyAdoptionScore = calculateTechnologyScore(company.installations || []);

  scoring.digitalTotal = 
    scoring.websiteQualityScore +
    scoring.socialMediaScore +
    scoring.technologyAdoptionScore;

  // ============================================
  // CONTACT (20 points)
  // ============================================

  scoring.decisionAuthorityScore = calculateDecisionAuthorityScore(company.contacts || []);
  scoring.linkedinProfessionalScore = calculateLinkedInScore(company.contacts || []);

  scoring.contactTotal = 
    scoring.decisionAuthorityScore +
    scoring.linkedinProfessionalScore;

  // ============================================
  // TOTAL SCORE & PRIORITY TIER
  // ============================================

  scoring.totalScore = 
    scoring.firmographicTotal +
    scoring.digitalTotal +
    scoring.contactTotal;

  if (scoring.totalScore >= 80) {
    scoring.priorityTier = 'P1';
  } else if (scoring.totalScore >= 60) {
    scoring.priorityTier = 'P2';
  } else if (scoring.totalScore >= 40) {
    scoring.priorityTier = 'P3';
  } else {
    scoring.priorityTier = 'Unscored';
  }

  scoring.confidence = calculateConfidence(company);

  // Save to database
  await saveContractorScoreToDatabase(companyId, scoring);

  return scoring;
}

// ============================================
// CONTRACTOR-SPECIFIC HELPER FUNCTIONS
// ============================================

function calculateContractorVolumeScore(volume?: number): number {
  if (!volume) return 0;

  // Contractors scored on SERVICE CALLS per year
  if (volume >= 2500) return 15;
  if (volume >= 1000) return 12;
  if (volume >= 500) return 10;
  if (volume >= 250) return 8;
  return 5;
}

function calculateContractorRevenueScore(revenueRange?: string): number {
  if (!revenueRange) return 0;

  const revenueMap: Record<string, number> = {
    '$10M+': 10,
    '$6M-$10M': 9,
    '$3M-$5.9M': 8,
    '$1M-$2.9M': 6,
    '$500K-$999K': 4,
    '<$500K': 2
  };

  return revenueMap[revenueRange] || 0;
}

function calculateContractorStabilityScore(data: {
  yearsInBusiness?: number;
  employees?: number;
}): number {
  let score = 0;

  // Years in business (0-5 points)
  if (data.yearsInBusiness) {
    if (data.yearsInBusiness >= 15) score += 5;
    else if (data.yearsInBusiness >= 10) score += 4;
    else if (data.yearsInBusiness >= 5) score += 3;
    else if (data.yearsInBusiness >= 3) score += 2;
  }

  // Employee count (0-5 points)
  if (data.employees) {
    if (data.employees >= 50) score += 5;
    else if (data.employees >= 25) score += 4;
    else if (data.employees >= 10) score += 3;
    else if (data.employees >= 5) score += 2;
  }

  return Math.min(score, 10);
}

function calculateBusinessModelScore(data: {
  maintenancePercentage?: number;
  emergencyPercentage?: number;
}): number {
  let score = 0;

  // Maintenance contracts indicate recurring revenue stability (0-3 points)
  if (data.maintenancePercentage) {
    if (data.maintenancePercentage >= 40) score += 3;
    else if (data.maintenancePercentage >= 25) score += 2;
    else if (data.maintenancePercentage >= 10) score += 1;
  }

  // Emergency service capability indicates full-service offering (0-2 points)
  if (data.emergencyPercentage) {
    if (data.emergencyPercentage >= 20) score += 2;
    else if (data.emergencyPercentage >= 10) score += 1;
  }

  return Math.min(score, 5);
}

async function saveContractorScoreToDatabase(
  companyId: string,
  scoring: ContractorScoringBreakdown
): Promise<void> {
  // Save detailed breakdown to contractor_scoring_details
  await supabase
    .from('contractor_scoring_details')
    .upsert({
      company_id: companyId,
      volume_score: scoring.volumeScore,
      revenue_score: scoring.revenueScore,
      geographic_score: scoring.geographicScore,
      stability_score: scoring.stabilityScore,
      business_model_score: scoring.businessModelScore,
      firmographic_total: scoring.firmographicTotal,
      website_quality_score: scoring.websiteQualityScore,
      social_media_score: scoring.socialMediaScore,
      technology_adoption_score: scoring.technologyAdoptionScore,
      digital_total: scoring.digitalTotal,
      decision_authority_score: scoring.decisionAuthorityScore,
      linkedin_professional_score: scoring.linkedinProfessionalScore,
      contact_total: scoring.contactTotal,
      total_score: scoring.totalScore,
      priority_tier: scoring.priorityTier,
      confidence: scoring.confidence,
      calculated_at: new Date().toISOString()
    });

  // Update company with total score
  await supabase
    .from('companies')
    .update({
      lead_score: scoring.totalScore,
      segment_confidence: scoring.confidence,
      score_calculated_at: new Date().toISOString()
    } as any)
    .eq('id', companyId);
}
