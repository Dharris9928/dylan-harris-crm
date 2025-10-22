// Comprehensive error handler with automatic fix suggestions for all error types

export interface ErrorSuggestion {
  field?: string;
  message: string;
  suggestion: string;
  autoFix?: any;
  severity: 'error' | 'warning' | 'info';
  category: 'database' | 'validation' | 'network' | 'authentication' | 'authorization' | 'unknown';
}

// Get comprehensive error suggestion for any type of error
export function getErrorSuggestion(error: any): ErrorSuggestion | null {
  const errorMessage = error?.message || String(error);
  const errorCode = error?.code || error?.status;
  
  // === AUTHENTICATION ERRORS ===
  if (errorMessage.includes('not authenticated') || errorMessage.includes('JWT') || errorCode === 401) {
    return {
      message: 'You are not logged in',
      suggestion: 'Please log in to access this feature. Your session may have expired.',
      severity: 'error',
      category: 'authentication',
    };
  }
  
  if (errorMessage.includes('Invalid login credentials') || errorMessage.includes('Email not confirmed')) {
    return {
      message: 'Login failed',
      suggestion: 'Check your email and password. If you just signed up, please check your email for a confirmation link.',
      severity: 'error',
      category: 'authentication',
    };
  }
  
  // === AUTHORIZATION ERRORS ===
  if (errorMessage.includes('row-level security') || errorMessage.includes('RLS') || errorCode === 403) {
    return {
      message: 'Access denied',
      suggestion: 'You do not have permission to access this data. Contact your administrator if you believe this is an error.',
      severity: 'error',
      category: 'authorization',
    };
  }
  
  if (errorMessage.includes('not approved') || errorMessage.includes('pending approval')) {
    return {
      message: 'Account pending approval',
      suggestion: 'Your account is waiting for administrator approval. You will receive an email once approved.',
      severity: 'warning',
      category: 'authorization',
    };
  }
  
  // === NETWORK ERRORS ===
  if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
    return {
      message: 'Network connection error',
      suggestion: 'Check your internet connection and try again. If the problem persists, the server may be temporarily unavailable.',
      severity: 'error',
      category: 'network',
    };
  }
  
  if (errorCode === 429 || errorMessage.includes('rate limit')) {
    return {
      message: 'Too many requests',
      suggestion: 'You have made too many requests. Please wait a moment before trying again.',
      severity: 'warning',
      category: 'network',
    };
  }
  
  if (errorCode === 500 || errorCode === 502 || errorCode === 503) {
    return {
      message: 'Server error',
      suggestion: 'The server encountered an error. Please try again in a few moments. If the problem persists, contact support.',
      severity: 'error',
      category: 'network',
    };
  }
  
  // === DATABASE ERRORS ===
  // Handle "value too long for type character varying(n)"
  const varcharMatch = errorMessage.match(/value too long for type character varying\((\d+)\)/i);
  if (varcharMatch) {
    const maxLength = parseInt(varcharMatch[1]);
    
    // Detect which field based on common patterns
    let field = 'unknown field';
    let suggestion = `Reduce the length to ${maxLength} characters or less.`;
    
    if (maxLength === 2) {
      field = 'state';
      suggestion = 'Use a 2-letter state code (e.g., CA, TX, NY). Common states: CA (California), TX (Texas), NY (New York), FL (Florida), IL (Illinois).';
    } else if (maxLength === 100) {
      field = 'city, title, or name field';
      suggestion = `Shorten the ${field} to ${maxLength} characters or less.`;
    } else if (maxLength === 255) {
      field = 'email, company name, or address field';
      suggestion = `Shorten the ${field} to ${maxLength} characters or less.`;
    }
    
    return {
      field,
      message: `Value is too long for ${field} (maximum ${maxLength} characters)`,
      suggestion,
      severity: 'error',
      category: 'database',
    };
  }
  
  // Handle "duplicate key value violates unique constraint"
  if (errorMessage.includes('duplicate key value') || errorMessage.includes('unique constraint')) {
    return {
      message: 'This record already exists',
      suggestion: 'Check if this company or contact already exists in the system. Try searching for it first.',
      severity: 'error',
      category: 'database',
    };
  }
  
  // Handle "null value in column violates not-null constraint"
  const nullMatch = errorMessage.match(/null value in column "([^"]+)" violates not-null constraint/i);
  if (nullMatch) {
    const field = nullMatch[1];
    return {
      field,
      message: `${field} is required`,
      suggestion: `Please provide a value for ${field}. This field cannot be empty.`,
      severity: 'error',
      category: 'database',
    };
  }
  
  // Handle foreign key violations
  if (errorMessage.includes('foreign key constraint') || errorMessage.includes('violates foreign key')) {
    return {
      message: 'Referenced record not found',
      suggestion: 'The related record (company, contact, or user) may have been deleted. Please refresh and try again.',
      severity: 'error',
      category: 'database',
    };
  }
  
  // Handle check constraint violations
  if (errorMessage.includes('check constraint')) {
    return {
      message: 'Value does not meet requirements',
      suggestion: 'Please check that all values are in the correct format and within allowed ranges.',
      severity: 'error',
      category: 'database',
    };
  }
  
  // === VALIDATION ERRORS ===
  if (errorMessage.includes('Validation failed') || errorMessage.includes('Invalid')) {
    return {
      message: 'Validation error',
      suggestion: 'Please check the form for errors. Required fields must be filled out correctly.',
      severity: 'error',
      category: 'validation',
    };
  }
  
  // === GENERIC TIMEOUT ===
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return {
      message: 'Operation timed out',
      suggestion: 'The operation took too long. Try again with a smaller dataset or simpler request.',
      severity: 'error',
      category: 'network',
    };
  }
  
  return null;
}

// Format error with suggestion for display
export function formatError(error: any): string {
  const suggestion = getErrorSuggestion(error);
  
  if (suggestion) {
    let message = suggestion.message;
    if (suggestion.field) {
      message = `${suggestion.field}: ${message}`;
    }
    message += `\n\n💡 Suggestion: ${suggestion.suggestion}`;
    return message;
  }
  
  // Fallback with generic suggestion
  const errorMsg = error?.message || String(error);
  return `${errorMsg}\n\n💡 Suggestion: Please check your input and try again. If the problem persists, contact support.`;
}

// Backward compatibility
export const getDatabaseErrorSuggestion = getErrorSuggestion;
export const formatDatabaseError = formatError;
