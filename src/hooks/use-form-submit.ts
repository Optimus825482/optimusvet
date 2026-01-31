/**
 * FORM SUBMIT HOOK - DOUBLE CLICK PREVENTION
 *
 * Prevents duplicate form submissions by:
 * - Disabling submit button during submission
 * - Preventing multiple simultaneous requests
 * - Showing loading state to user
 */

import { useState, useCallback } from "react";

interface UseFormSubmitOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useFormSubmit<T>(
  submitFn: (data: T) => Promise<void>,
  options?: UseFormSubmitOptions,
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleSubmit = useCallback(
    async (data: T) => {
      // Prevent double submission
      if (isSubmitting) {
        console.warn("[FORM_SUBMIT] Duplicate submission prevented");
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        await submitFn(data);
        options?.onSuccess?.();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options?.onError?.(error);
        throw error; // Re-throw for form error handling
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, submitFn, options],
  );

  const reset = useCallback(() => {
    setIsSubmitting(false);
    setError(null);
  }, []);

  return {
    handleSubmit,
    isSubmitting,
    error,
    reset,
  };
}
