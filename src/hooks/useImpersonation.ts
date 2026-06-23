import { useState, useEffect } from 'react';
import { signData, verifySignedData } from '@/lib/security/hmac';

const IMPERSONATION_KEY = 'admin-impersonation';
const IMPERSONATION_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export interface ImpersonationData {
  userId: string;
  userEmail: string;
  userRole: string;
  expiresAt: number;
}

export function useImpersonation() {
  const [impersonation, setImpersonation] = useState<ImpersonationData | null>(() => {
    const stored = sessionStorage.getItem(IMPERSONATION_KEY);
    if (!stored) return null;
    
    try {
      const parsed = JSON.parse(stored);
      
      // Verify HMAC signature synchronously during initial load
      // Note: This uses a synchronous check, full verification happens in useEffect
      if (!parsed.signature || !parsed.data) {
        console.warn('[Impersonation] Missing signature or data, clearing session');
        sessionStorage.removeItem(IMPERSONATION_KEY);
        return null;
      }
      
      const data = parsed.data as ImpersonationData;
      
      // Check if impersonation session has expired
      if (data.expiresAt && Date.now() > data.expiresAt) {
        sessionStorage.removeItem(IMPERSONATION_KEY);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('[Impersonation] Failed to parse stored session:', error);
      sessionStorage.removeItem(IMPERSONATION_KEY);
      return null;
    }
  });

  const startImpersonation = async (data: Omit<ImpersonationData, 'expiresAt'>) => {
    const impersonationData: ImpersonationData = {
      ...data,
      expiresAt: Date.now() + IMPERSONATION_EXPIRY_MS
    };
    
    // Sign the data with HMAC
    const signed = await signData(impersonationData);
    
    sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(signed));
    setImpersonation(impersonationData);
    
    // Reload to apply impersonation across all hooks
    window.location.reload();
  };

  const stopImpersonation = () => {
    sessionStorage.removeItem(IMPERSONATION_KEY);
    setImpersonation(null);
    // Reload to clear impersonation
    window.location.reload();
  };
  
  // Verify HMAC signature on mount and periodically
  useEffect(() => {
    if (!impersonation) return;
    
    const verifyAndCheck = async () => {
      const stored = sessionStorage.getItem(IMPERSONATION_KEY);
      if (!stored) {
        setImpersonation(null);
        return;
      }
      
      try {
        const parsed = JSON.parse(stored);
        const { valid, data } = await verifySignedData<ImpersonationData>(parsed);
        
        if (!valid || !data) {
          console.error('[Impersonation] HMAC verification failed - session may have been tampered with');
          sessionStorage.removeItem(IMPERSONATION_KEY);
          setImpersonation(null);
          window.location.reload();
          return;
        }
        
        // Check expiration
        if (data.expiresAt && Date.now() > data.expiresAt) {
          sessionStorage.removeItem(IMPERSONATION_KEY);
          setImpersonation(null);
          window.location.reload();
        }
      } catch (error) {
        console.error('[Impersonation] Verification error:', error);
        sessionStorage.removeItem(IMPERSONATION_KEY);
        setImpersonation(null);
      }
    };
    
    // Verify immediately
    verifyAndCheck();
    
    // Check every minute
    const interval = setInterval(verifyAndCheck, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [impersonation]);

  const isImpersonating = impersonation !== null;

  return {
    impersonation,
    isImpersonating,
    startImpersonation,
    stopImpersonation,
  };
}
