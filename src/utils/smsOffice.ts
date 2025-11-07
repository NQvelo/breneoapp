const SMSOFFICE_ENDPOINT = "https://smsoffice.ge/api/v2/send";

interface SendSmsOptions {
  phoneNumber: string;
  code: string;
  sender?: string;
}

/**
 * Sends a verification code via the SMSOffice API.
 *
 * @throws Error if the API key is missing or the request fails.
 */
export const sendSmsVerificationCode = async ({
  phoneNumber,
  code,
  sender = "Breneo",
}: SendSmsOptions): Promise<void> => {
  const apiKey = import.meta.env.VITE_SMSOFFICE_API_KEY;

  if (!apiKey) {
    throw new Error("SMS API key is not configured.");
  }

  if (!phoneNumber) {
    throw new Error("Phone number is required for verification.");
  }

  const params = new URLSearchParams({
    key: apiKey,
    destination: phoneNumber,
    sender,
    content: code,
  });

  const url = `${SMSOFFICE_ENDPOINT}?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      errorText || "Failed to send verification code. Please try again."
    );
  }
};

export default sendSmsVerificationCode;

