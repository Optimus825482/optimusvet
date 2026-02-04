"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { AlertCircle, X, Mail, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// =====================================================
// TYPES
// =====================================================

interface ErrorDetails {
  message: string;
  errorId?: string;
  code?: string;
  timestamp?: string;
}

interface ErrorModalContextType {
  showError: (error: ErrorDetails) => void;
  hideError: () => void;
  handleApiResponse: <T>(response: Response) => Promise<T>;
}

// =====================================================
// CONTEXT
// =====================================================

const ErrorModalContext = createContext<ErrorModalContextType | null>(null);

export function useErrorModal() {
  const context = useContext(ErrorModalContext);
  if (!context) {
    throw new Error("useErrorModal must be used within an ErrorModalProvider");
  }
  return context;
}

// =====================================================
// PROVIDER COMPONENT
// =====================================================

interface ErrorModalProviderProps {
  children: React.ReactNode;
}

export function ErrorModalProvider({ children }: ErrorModalProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<ErrorDetails | null>(null);
  const [copied, setCopied] = useState(false);

  const showError = useCallback((errorDetails: ErrorDetails) => {
    setError(errorDetails);
    setIsOpen(true);
    setCopied(false);
  }, []);

  const hideError = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => setError(null), 300); // Wait for animation
  }, []);

  const handleApiResponse = useCallback(
    async <T,>(response: Response): Promise<T> => {
      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => ({ error: "Beklenmeyen hata" }));

        // 500 errors get the modal treatment
        if (response.status >= 500) {
          showError({
            message: data.error || "Sunucu hatası oluştu",
            errorId: data.errorId,
            code: data.code,
            timestamp: data.timestamp,
          });
        }

        throw new Error(data.error || "İşlem başarısız");
      }
      return response.json();
    },
    [showError],
  );

  const copyErrorId = useCallback(() => {
    if (error?.errorId) {
      navigator.clipboard.writeText(error.errorId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [error?.errorId]);

  return (
    <ErrorModalContext.Provider
      value={{ showError, hideError, handleApiResponse }}
    >
      {children}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Hata Oluştu
            </DialogTitle>
            <DialogDescription>
              Bir hata meydana geldi. Teknik ekip bilgilendirildi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Error Message */}
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-800">{error?.message}</p>
            </div>

            {/* Email Notification Info */}
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 rounded-lg p-3 border border-blue-200">
              <Mail className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span>
                Hata detayları geliştiriciye{" "}
                <strong>email ile bildirildi</strong>.
              </span>
            </div>

            {/* Error ID */}
            {error?.errorId && (
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div>
                  <p className="text-xs text-gray-500">
                    Hata Referans Numarası
                  </p>
                  <code className="text-sm font-mono text-gray-700">
                    {error.errorId}
                  </code>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyErrorId}
                  className="h-8 px-2"
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}

            {/* Error Code & Time */}
            {(error?.code || error?.timestamp) && (
              <div className="flex items-center gap-4 text-xs text-gray-500">
                {error.code && (
                  <span>
                    Kod:{" "}
                    <code className="bg-gray-100 px-1 rounded">
                      {error.code}
                    </code>
                  </span>
                )}
                {error.timestamp && (
                  <span>
                    Zaman: {new Date(error.timestamp).toLocaleString("tr-TR")}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={hideError}>
              <X className="h-4 w-4 mr-2" />
              Kapat
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ErrorModalContext.Provider>
  );
}

// =====================================================
// HOOK FOR API CALLS
// =====================================================

/**
 * Hook for making API calls with automatic error modal handling
 *
 * @example
 * ```tsx
 * const { fetchWithErrorModal } = useApiWithErrorModal();
 *
 * const handleSubmit = async () => {
 *   try {
 *     const result = await fetchWithErrorModal("/api/customers", {
 *       method: "POST",
 *       body: JSON.stringify(data),
 *     });
 *     // Success handling
 *   } catch (error) {
 *     // Error was already shown in modal, just handle local state
 *   }
 * };
 * ```
 */
export function useApiWithErrorModal() {
  const { showError } = useErrorModal();

  const fetchWithErrorModal = useCallback(
    async <T,>(url: string, options?: RequestInit): Promise<T> => {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => ({ error: "Beklenmeyen hata" }));

        // Show modal for 500 errors
        if (response.status >= 500) {
          showError({
            message: data.error || "Sunucu hatası oluştu",
            errorId: data.errorId,
            code: data.code,
            timestamp: data.timestamp,
          });
        }

        throw new Error(data.error || "İşlem başarısız");
      }

      return response.json();
    },
    [showError],
  );

  return { fetchWithErrorModal };
}
