# Automatic Error Fix Suggestions - Usage Guide

## Overview
All errors in the application now automatically provide helpful fix suggestions to users. This reduces support requests and improves user experience.

## Supported Error Categories
- 🗄️ **Database**: SQL errors, constraints, data length issues
- ✏️ **Validation**: Form validation, input format errors
- 🌐 **Network**: Connection issues, timeouts, rate limits
- 🔐 **Authentication**: Login failures, session expiration
- 🚫 **Authorization**: Permission denied, pending approvals

## Using the Error Handler

### In React Components (Recommended)
Use the `useErrorHandler` hook for consistent error handling:

```typescript
import { useErrorHandler } from '@/hooks/useErrorHandler';

function MyComponent() {
  const { handleError } = useErrorHandler();
  
  const handleSubmit = async () => {
    try {
      await someOperation();
    } catch (error) {
      handleError(error); // Automatically shows toast with fix suggestion
    }
  };
}
```

### In Utility Functions
Use `formatError` to format errors with suggestions:

```typescript
import { formatError } from '@/lib/errors/databaseErrorHandler';

export async function myFunction() {
  try {
    // Your code
  } catch (error) {
    console.error('Error:', error);
    throw new Error(formatError(error));
  }
}
```

### Getting Error Suggestions Without Display
For custom error handling logic:

```typescript
import { getErrorSuggestion } from '@/lib/errors/databaseErrorHandler';

try {
  await operation();
} catch (error) {
  const suggestion = getErrorSuggestion(error);
  if (suggestion?.category === 'authentication') {
    // Handle authentication errors specially
    redirectToLogin();
  }
}
```

## Error Suggestion Examples

### Database Errors
- **"value too long for type character varying(2)"**
  - Detects field: state
  - Suggests: "Use a 2-letter state code (e.g., CA, TX, NY)"

- **"duplicate key value violates unique constraint"**
  - Suggests: "Check if this record already exists. Try searching first."

- **"null value in column violates not-null constraint"**
  - Detects field from error message
  - Suggests: "Please provide a value for [field]. This field cannot be empty."

### Authentication Errors
- **401 or "JWT"**
  - Suggests: "Please log in to access this feature. Your session may have expired."

### Network Errors
- **Rate limit (429)**
  - Suggests: "You have made too many requests. Please wait a moment."

- **Timeout**
  - Suggests: "The operation took too long. Try again with a smaller dataset."

## Already Implemented In
✅ Company creation (`src/lib/companies/createCompany.ts`)
✅ Company updates (`src/lib/companies/updateCompany.ts`)
✅ Contact creation (`src/lib/contacts/createContact.ts`)

## TODO: Add to More Places
- Contact updates
- Opportunity operations
- Activity operations
- Import/export operations
- Settings changes
- Edge function calls
- Apollo API calls
- AI feature calls

## Adding New Error Patterns
To add new error patterns, edit `src/lib/errors/databaseErrorHandler.ts`:

```typescript
// Add to getErrorSuggestion function
if (errorMessage.includes('your-error-pattern')) {
  return {
    message: 'User-friendly error message',
    suggestion: 'How to fix it',
    severity: 'error',
    category: 'database', // or other category
    field: 'optional-field-name',
  };
}
```

## Benefits
1. **Reduced Support Requests**: Users get immediate help
2. **Better UX**: Clear, actionable error messages
3. **Cost Savings**: Failed operations show helpful messages
4. **Consistency**: All errors handled the same way
5. **Debugging**: Error categories help identify issues

## State Field Example
Before:
```
Error: value too long for type character varying(2)
```

After:
```
🗄️ state: Value is too long for state (maximum 2 characters)

💡 Suggestion: Use a 2-letter state code (e.g., CA, TX, NY). 
Common states: CA (California), TX (Texas), NY (New York), FL (Florida), IL (Illinois).
```
