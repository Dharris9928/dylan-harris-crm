import { useToast } from '@/hooks/use-toast';
import { getErrorSuggestion, formatError, type ErrorSuggestion } from '@/lib/errors/databaseErrorHandler';

/**
 * Custom hook for consistent error handling across the application
 * Automatically provides helpful error messages with fix suggestions
 */
export function useErrorHandler() {
  const { toast } = useToast();

  /**
   * Handle any error and show a toast with automatic fix suggestion
   */
  const handleError = (error: any, customMessage?: string) => {
    console.error('Error occurred:', error);
    
    const suggestion = getErrorSuggestion(error);
    
    if (suggestion) {
      // Show error with category icon
      const icon = {
        database: '🗄️',
        validation: '✏️',
        network: '🌐',
        authentication: '🔐',
        authorization: '🚫',
        unknown: '⚠️',
      }[suggestion.category];

      toast({
        title: `${icon} ${customMessage || suggestion.message}`,
        description: `💡 ${suggestion.suggestion}${suggestion.field ? `\n\nField: ${suggestion.field}` : ''}`,
        variant: suggestion.severity === 'error' ? 'destructive' : 'default',
      });
    } else {
      // Fallback toast
      toast({
        title: customMessage || 'An error occurred',
        description: formatError(error),
        variant: 'destructive',
      });
    }
  };

  /**
   * Handle error for mutations (returns formatted error message)
   */
  const getMutationError = (error: any): string => {
    return formatError(error);
  };

  /**
   * Get error suggestion without showing toast (useful for custom handling)
   */
  const getSuggestion = (error: any): ErrorSuggestion | null => {
    return getErrorSuggestion(error);
  };

  return {
    handleError,
    getMutationError,
    getSuggestion,
  };
}
