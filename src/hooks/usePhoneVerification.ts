import { useCallback, useEffect, useMemo, useState } from "react";

import sendSmsVerificationCode from "@/utils/smsOffice";

interface UsePhoneVerificationOptions {
  phoneNumber?: string | null;
  ownerId?: string | number;
  role?: string | null;
  initiallyVerified?: boolean;
  sender?: string;
  resendDelaySeconds?: number;
}

interface UsePhoneVerificationResult {
  isPhoneVerified: boolean;
  isSendingCode: boolean;
  isVerifyingCode: boolean;
  codeSent: boolean;
  codeInput: string;
  resendCooldown: number;
  sendCode: () => Promise<void>;
  verifyCode: () => Promise<boolean>;
  setCodeInput: (value: string) => void;
  resetVerification: () => void;
}

const STORAGE_PREFIX = "breneo:phoneVerified";

const isBrowser = typeof window !== "undefined";

const normalizeRole = (role?: string | null) => {
  if (!role) return "user";
  return role.toLowerCase();
};

const buildStorageKey = (
  phoneNumber?: string | null,
  ownerId?: string | number,
  role?: string | null
) => {
  const normalizedRole = normalizeRole(role);
  const identifier = ownerId ?? phoneNumber ?? "unknown";
  return `${STORAGE_PREFIX}:${normalizedRole}:${identifier}`;
};

export const usePhoneVerification = (
  options: UsePhoneVerificationOptions
): UsePhoneVerificationResult => {
  const {
    phoneNumber,
    ownerId,
    role,
    initiallyVerified,
    sender = "Breneo",
    resendDelaySeconds = 60,
  } = options;

  const storageKey = useMemo(
    () => buildStorageKey(phoneNumber ?? undefined, ownerId, role),
    [ownerId, phoneNumber, role]
  );

  const [isPhoneVerified, setIsPhoneVerified] = useState<boolean>(() => {
    if (initiallyVerified) return true;
    if (!isBrowser) return false;
    const stored = localStorage.getItem(storageKey);
    return stored === "true";
  });

  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState<boolean>(false);
  const [codeInput, setCodeInput] = useState<string>("");
  const [isSendingCode, setIsSendingCode] = useState<boolean>(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Keep local state in sync with server-provided verification status
  useEffect(() => {
    if (typeof initiallyVerified === "boolean" && initiallyVerified) {
      setIsPhoneVerified(true);
      if (isBrowser) {
        localStorage.setItem(storageKey, "true");
      }
    }
  }, [initiallyVerified, storageKey]);

  // Reset verification state when phone number changes
  useEffect(() => {
    if (!phoneNumber) {
      setIsPhoneVerified(false);
      setGeneratedCode(null);
      setCodeSent(false);
      setCodeInput("");
      return;
    }

    if (!initiallyVerified && isBrowser) {
      const stored = localStorage.getItem(storageKey);
      setIsPhoneVerified(stored === "true");
    }
  }, [initiallyVerified, phoneNumber, storageKey]);

  // Handle resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const interval = window.setInterval(() => {
      setResendCooldown((current) => {
        const next = current - 1;
        return next >= 0 ? next : 0;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [resendCooldown]);

  const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const sendCode = useCallback(async () => {
    if (!phoneNumber) {
      throw new Error(
        "Phone number is missing. Please add it before verifying."
      );
    }

    if (resendCooldown > 0) {
      throw new Error(
        `Please wait ${resendCooldown} second${
          resendCooldown === 1 ? "" : "s"
        } before requesting a new code.`
      );
    }

    setIsSendingCode(true);
    try {
      const code = generateCode();
      await sendSmsVerificationCode({ phoneNumber, code, sender });

      setGeneratedCode(code);
      setCodeSent(true);
      setResendCooldown(resendDelaySeconds);
    } finally {
      setIsSendingCode(false);
    }
  }, [phoneNumber, resendCooldown, resendDelaySeconds, sender]);

  const verifyCode = useCallback(async () => {
    if (!codeSent || !generatedCode) {
      throw new Error("No verification code has been sent yet.");
    }

    const sanitizedInput = codeInput.replace(/\D/g, "");
    if (sanitizedInput.length !== 6) {
      throw new Error("Please enter the 6-digit verification code.");
    }

    setIsVerifyingCode(true);
    try {
      if (sanitizedInput !== generatedCode) {
        throw new Error("The verification code you entered is incorrect.");
      }

      setIsPhoneVerified(true);
      setCodeSent(false);
      setGeneratedCode(null);
      setCodeInput("");

      if (isBrowser) {
        localStorage.setItem(storageKey, "true");
      }

      return true;
    } finally {
      setIsVerifyingCode(false);
    }
  }, [codeInput, codeSent, generatedCode, storageKey]);

  const resetVerification = useCallback(() => {
    setIsPhoneVerified(false);
    setGeneratedCode(null);
    setCodeSent(false);
    setCodeInput("");
    setResendCooldown(0);

    if (isBrowser) {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  return {
    isPhoneVerified,
    isSendingCode,
    isVerifyingCode,
    codeSent,
    codeInput,
    resendCooldown,
    sendCode,
    verifyCode,
    setCodeInput,
    resetVerification,
  };
};

export default usePhoneVerification;
