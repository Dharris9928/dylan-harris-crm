import { supabase } from '@/integrations/supabase/client';
import { getScoreForRange } from './rangeScoringEngine';
import {
  calculateGeographicScore,
  assignPriorityTier,
  calculateConfidence
} from './sharedScoring';

export interface BuilderScoringBreakdown {
  // Firmographic (50 points)
  volumeScore: number; // 0-15 points
  pricePointScore: number; // 0-15 points
  geographicScore: number; // 0-10 points
  stabilityScore: number; // 0-10 points (employees + years)
  firmographicTotal: number;
  
  // Digital Engagement (30 points)
  websiteQualityScore: number; // 0-10 points
  linkedinActivityScore: number; // 0-10 points
  technologyAdoptionScore: number; // 0-10 points
  digitalTotal: number;
  
  // Contact Quality (20 points)
  decisionAuthorityScore: number; // 0-10 points
  linkedinProfessionalScore: number; // 0-10 points
  contactTotal: number;
  
  totalScore: number;
  priorityTier: 'P1' | 'P2' | 'P3' | 'Unscored';
  confidence: 'High' | 'Medium' | 'Low';
}

/**
 * Calculate lead score for BUILDERS using range-based scoring
 */
export async function calculateBuilderScore(companyId: string): Promise<BuilderScoringBreakdown> {
  const { data: company, error } = await supabase
    .from('companies')
    .select(`
      *,
      contacts:contacts(id, title, linkedin_url, linkedin_connections, linkedin_activity_score)
    `)
    .eq('id', companyId)
    .single();

  if (error || !company) {
    throw new Error('Company not found');
  }

  if (company.industry_type !== 'Builder') {
    throw new Error('Company is not a Builder');
  }

  const scoring: BuilderScoringBreakdown = {
    volumeScore: 0,
    pricePointScore: 0,
    geographicScore: 0,
    stabilityScore: 0,
    firmographicTotal: 0,
    websiteQualityScore: 0,
    linkedinActivityScore: 0,
    technologyAdoptionScore: 0,
    digitalTotal: 0,
    decisionAuthorityScore: 0,
    linkedinProfessionalScore: 0,
    contactTotal: 0,
    totalScore: 0,
    priorityTier: 'Unscored',
    confidence: 'Low'
  };

  // ============================================
  // BUILDER FIRMOGRAPHIC SCORING (50 points)
  // ============================================
  
  // 1. Volume Score (0-15 points) - FROM RANGE
  if (company.annual_volume_range) {
    scoring.volumeScore = await getScoreForRange(
      'annual_volume_range',
      company.annual_volume_range,
      'Builder'
    );
  }
  
  // 2. Price Point Score (0-15 points) - FROM RANGE
  if (company.average_home_price_range) {
    scoring.pricePointScore = await getScoreForRange(
      'average_home_price_range',
      company.average_home_price_range,
      'Builder'
    );
  }
  
  // 3. Geographic Score (0-10 points)
  scoring.geographicScore = calculateGeographicScore(company.state);
  
  // 4. Stability Score (0-10 points) - Employees (5pts) + Years (5pts)
  let stabilityScore = 0;
  
  // Employees component (0-5 points) - FROM RANGE
  if (company.total_employees_range) {
    const employeeScore = await getScoreForRange(
      'total_employees_range',
      company.total_employees_range,
      'Builder'
    );
    stabilityScore += Math.min(employeeScore, 5);
  }
  
  // Years component (0-5 points) - FROM RANGE
  if (company.years_in_business_range) {
    const yearsScore = await getScoreForRange(
      'years_in_business_range',
      company.years_in_business_range,
      'Builder'
    );
    stabilityScore += Math.min(yearsScore, 5);
  }
  
  scoring.stabilityScore = Math.min(stabilityScore, 10);

  scoring.firmographicTotal = 
    scoring.volumeScore +
    scoring.pricePointScore +
    scoring.geographicScore +
    scoring.stabilityScore;

  // ============================================
  // DIGITAL ENGAGEMENT (30 points)
  // ============================================
  
  // 1. Website Quality (0-10 points) - FROM RANGE
  if (company.website_quality) {
    scoring.websiteQualityScore = await getScoreForRange(
      'website_quality',
      company.website_quality,
      'Builder'
    );
  }
  
  // 2. LinkedIn Activity (0-10 points) - FROM RANGE
  if (company.linkedin_activity_level) {
    scoring.linkedinActivityScore = await getScoreForRange(
      'linkedin_activity_level',
      company.linkedin_activity_level,
      'Builder'
    );
  }
  
  // 3. Technology Adoption (0-10 points) - Multiple factors
  let techScore = 0;
  
  // Base technology adoption level (0-10 points) - FROM RANGE
  if (company.technology_adoption_level) {
    techScore = await getScoreForRange(
      'technology_adoption_level',
      company.technology_adoption_level,
      'Builder'
    );
  }
  
  // OR if technology_adoption_level not set, calculate from indicators
  if (!company.technology_adoption_level && company.nest_installation_volume_range) {
    techScore = await getScoreForRange(
      'nest_installation_volume_range',
      company.nest_installation_volume_range,
      'Builder'
    );
  }
  
  scoring.technologyAdoptionScore = Math.min(techScore, 10);
  
  scoring.digitalTotal = 
    scoring.websiteQualityScore +
    scoring.linkedinActivityScore +
    scoring.technologyAdoptionScore;

  // ============================================
  // CONTACT QUALITY (20 points)
  // ============================================
  
  // Find highest scoring contact for role authority and LinkedIn presence
  let maxRoleScore = 0;
  let maxLinkedInScore = 0;
  
  if (company.contacts && company.contacts.length > 0) {
    // Define decision authority scoring by title
    const titleScores: Record<string, number> = {
      'CEO': 10, 'President': 10, 'Owner': 10, 'Founder': 10,
      'COO': 10, 'CFO': 10, 'CMO': 10, 'CTO': 10,
      'VP': 8, 'Vice President': 8,
      'Director': 6,
      'Manager': 4
    };

    company.contacts.forEach((contact: any) => {
      // Role score from contact's job title
      const title = (contact.title || '').toUpperCase();
      for (const [keyword, score] of Object.entries(titleScores)) {
        if (title.includes(keyword.toUpperCase())) {
          maxRoleScore = Math.max(maxRoleScore, score);
        }
      }
      
      // LinkedIn score
      let contactLinkedInScore = 0;
      if (contact.linkedin_url) {
        contactLinkedInScore += 3;
        
        if (contact.linkedin_connections >= 1000) contactLinkedInScore += 4;
        else if (contact.linkedin_connections >= 500) contactLinkedInScore += 3;
        else if (contact.linkedin_connections >= 250) contactLinkedInScore += 2;
        else if (contact.linkedin_connections >= 100) contactLinkedInScore += 1;
        
        if (contact.linkedin_activity_score >= 80) contactLinkedInScore += 3;
        else if (contact.linkedin_activity_score >= 50) contactLinkedInScore += 2;
        else if (contact.linkedin_activity_score >= 20) contactLinkedInScore += 1;
      }
      
      maxLinkedInScore = Math.max(maxLinkedInScore, contactLinkedInScore);
    });
  }
  
  scoring.decisionAuthorityScore = maxRoleScore;
  scoring.linkedinProfessionalScore = Math.min(maxLinkedInScore, 10);
  
  scoring.contactTotal = 
    scoring.decisionAuthorityScore +
    scoring.linkedinProfessionalScore;

  // ============================================
  // TOTAL SCORE
  // ============================================
  
  scoring.totalScore = 
    scoring.firmographicTotal +
    scoring.digitalTotal +
    scoring.contactTotal;

  scoring.priorityTier = assignPriorityTier(scoring.totalScore);
  scoring.confidence = calculateConfidence(company);

  // Save to database
  await saveBuilderScore(companyId, scoring);

  // Update company record
  await supabase
    .from('companies')
    .update({
      lead_score: scoring.totalScore,
      priority_tier: scoring.priorityTier,
      segment_confidence: scoring.confidence,
      score_calculated_at: new Date().toISOString()
    } as any)
    .eq('id', companyId);

  return scoring;
}

async function saveBuilderScore(companyId: string, scoring: BuilderScoringBreakdown) {
  await supabase
    .from('builder_scoring_details')
    .upsert(
      {
        company_id: companyId,
        volume_score: scoring.volumeScore,
        price_point_score: scoring.pricePointScore,
        geographic_score: scoring.geographicScore,
        stability_score: scoring.stabilityScore,
        firmographic_total: scoring.firmographicTotal,
        website_quality_score: scoring.websiteQualityScore,
        social_media_score: scoring.linkedinActivityScore,
        technology_adoption_score: scoring.technologyAdoptionScore,
        digital_total: scoring.digitalTotal,
        decision_authority_score: scoring.decisionAuthorityScore,
        linkedin_professional_score: scoring.linkedinProfessionalScore,
        contact_total: scoring.contactTotal,
        total_score: scoring.totalScore,
        priority_tier: scoring.priorityTier,
        confidence: scoring.confidence,
        calculated_at: new Date().toISOString()
      },
      { onConflict: 'company_id' }
    );
}
