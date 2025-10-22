// Database error handler with automatic fix suggestions

interface ErrorSuggestion {
  field?: string;
  message: string;
  suggestion: string;
  autoFix?: any;
}

export function getDatabaseErrorSuggestion(error: any): ErrorSuggestion | null {
  const errorMessage = error?.message || String(error);
  
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
    };
  }
  
  // Handle "duplicate key value violates unique constraint"
  if (errorMessage.includes('duplicate key value') || errorMessage.includes('unique constraint')) {
    return {
      message: 'This record already exists',
      suggestion: 'Check if this company or contact already exists in the system. Try searching for it first.',
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
    };
  }
  
  // Handle foreign key violations
  if (errorMessage.includes('foreign key constraint') || errorMessage.includes('violates foreign key')) {
    return {
      message: 'Referenced record not found',
      suggestion: 'The related record (company, contact, or user) may have been deleted. Please refresh and try again.',
    };
  }
  
  // Handle check constraint violations
  if (errorMessage.includes('check constraint')) {
    return {
      message: 'Value does not meet requirements',
      suggestion: 'Please check that all values are in the correct format and within allowed ranges.',
    };
  }
  
  return null;
}

export function formatDatabaseError(error: any): string {
  const suggestion = getDatabaseErrorSuggestion(error);
  
  if (suggestion) {
    let message = suggestion.message;
    if (suggestion.field) {
      message = `${suggestion.field}: ${message}`;
    }
    message += `\n\n💡 Suggestion: ${suggestion.suggestion}`;
    return message;
  }
  
  // Fallback to original error message
  return error?.message || String(error);
}
