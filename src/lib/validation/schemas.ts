import { z } from 'zod';

// Company validation schema
export const companySchema = z.object({
  company_name: z.string()
    .trim()
    .min(1, "Company name is required")
    .max(255, "Company name must be less than 255 characters")
    .regex(/^[a-zA-Z0-9\s\-.,&'()]+$/, "Invalid characters in company name"),
  
  industry_type: z.enum(['Builder', 'Contractor'], {
    required_error: "Industry type is required"
  }),
  
  primary_email: z.string()
    .trim()
    .email("Invalid email format")
    .max(255, "Email must be less than 255 characters")
    .optional()
    .or(z.literal('')),
  
  website_url: z.string()
    .trim()
    .url("Invalid URL format")
    .max(500, "URL must be less than 500 characters")
    .optional()
    .or(z.literal('')),
  
  linkedin_company_url: z.string()
    .trim()
    .url("Invalid URL format")
    .max(500, "URL must be less than 500 characters")
    .optional()
    .or(z.literal('')),
  
  primary_phone: z.string()
    .trim()
    .regex(/^[\d\s\-\+\(\)]+$/, "Invalid phone format")
    .max(20, "Phone number must be less than 20 characters")
    .optional()
    .or(z.literal('')),
  
  address_line1: z.string()
    .trim()
    .max(255, "Address must be less than 255 characters")
    .optional()
    .or(z.literal('')),
  
  city: z.string()
    .trim()
    .max(100, "City must be less than 100 characters")
    .optional()
    .or(z.literal('')),
  
  state: z.string()
    .trim()
    .toUpperCase()
    .refine((val) => val === '' || val.length === 2, {
      message: "State must be exactly 2 characters (e.g., CA, TX, NY)"
    })
    .refine((val) => val === '' || /^[A-Z]{2}$/.test(val), {
      message: "State must be a valid 2-letter code (e.g., CA, TX, NY)"
    })
    .optional()
    .or(z.literal('')),
  
  zip: z.string()
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code format")
    .optional()
    .or(z.literal('')),
  
  notes: z.string()
    .trim()
    .max(5000, "Notes must be less than 5000 characters")
    .optional()
    .or(z.literal('')),
  
  status: z.string().optional(),
  segment: z.string().optional(),
  company_type: z.string().optional(),
  priority_tier: z.string().optional(),
  annual_revenue_range: z.string().optional(),
  total_employees_range: z.string().optional(),
  years_in_business_range: z.string().optional(),
  service_area_type: z.string().optional(),
  segment_confidence: z.string().optional(),
  partner_relationship_status: z.string().optional(),
});

export type CompanyFormData = z.infer<typeof companySchema>;

// Contact validation schema
export const contactSchema = z.object({
  first_name: z.string()
    .trim()
    .min(1, "First name is required")
    .max(100, "First name must be less than 100 characters")
    .regex(/^[a-zA-Z\s\-']+$/, "Invalid characters in first name"),
  
  last_name: z.string()
    .trim()
    .min(1, "Last name is required")
    .max(100, "Last name must be less than 100 characters")
    .regex(/^[a-zA-Z\s\-']+$/, "Invalid characters in last name"),
  
  company_id: z.string().uuid("Invalid company ID"),
  
  email: z.string()
    .trim()
    .email("Invalid email format")
    .max(255, "Email must be less than 255 characters")
    .optional()
    .or(z.literal('')),
  
  phone: z.string()
    .trim()
    .regex(/^[\d\s\-\+\(\)]+$/, "Invalid phone format")
    .max(20, "Phone number must be less than 20 characters")
    .optional()
    .or(z.literal('')),
  
  mobile: z.string()
    .trim()
    .regex(/^[\d\s\-\+\(\)]+$/, "Invalid mobile format")
    .max(20, "Mobile number must be less than 20 characters")
    .optional()
    .or(z.literal('')),
  
  title: z.string()
    .trim()
    .max(100, "Title must be less than 100 characters")
    .optional()
    .or(z.literal('')),
  
  linkedin_url: z.string()
    .trim()
    .url("Invalid LinkedIn URL format")
    .max(500, "URL must be less than 500 characters")
    .optional()
    .or(z.literal('')),
  
  notes: z.string()
    .trim()
    .max(5000, "Notes must be less than 5000 characters")
    .optional()
    .or(z.literal('')),
  
  decision_tier: z.enum(['Primary', 'Secondary', 'Influencer']).optional(),
  preferred_contact_method: z.enum(['Email', 'Phone', 'LinkedIn', 'Text']).optional(),
});

export type ContactFormData = z.infer<typeof contactSchema>;
