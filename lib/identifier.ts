export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const E164_RE = /^\+[1-9]\d{7,14}$/;
export const OTP_RE = /^\d{6}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  return E164_RE.test(value.trim());
}

export function isValidOtp(value: string): boolean {
  return OTP_RE.test(value);
}
