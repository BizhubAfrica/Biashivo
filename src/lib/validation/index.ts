import type { BusinessType } from '@/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUPPORTED_CURRENCIES = ['KES', 'UGX', 'TZS', 'NGN', 'GHS', 'ZAR', 'USD', 'EUR', 'GBP'];
const SUPPORTED_BUSINESS_TYPES: BusinessType[] = [
  'Retail',
  'Bakery',
  'Salon',
  'Service Business',
  'Wholesale/Distribution',
  'Other',
];

export const SUPPORTED_COUNTRIES = ['KE', 'UG', 'TZ', 'NG', 'GH', 'ZA', 'RW'];

export function validateEmail(email: string): string | null {
  if (!email) return 'Email is required.';
  if (!EMAIL_RE.test(email)) return 'Please enter a valid email address.';
  if (email.length > 320) return 'Email is too long.';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (password.length > 72) return 'Password must be 72 characters or fewer.';
  return null;
}

export function validateRequiredString(
  value: string,
  label: string,
  max = 160
): string | null {
  if (!value || value.trim() === '') return `${label} is required.`;
  if (value.length > max) return `${label} must be ${max} characters or fewer.`;
  return null;
}

export function validateBusinessType(value: string): string | null {
  if (!value) return 'Business type is required.';
  if (!SUPPORTED_BUSINESS_TYPES.includes(value as BusinessType)) {
    return 'Please choose a valid business type.';
  }
  return null;
}

export function validateCurrency(value: string): string | null {
  if (!value) return 'Currency is required.';
  if (!SUPPORTED_CURRENCIES.includes(value.toUpperCase())) {
    return 'Please choose a supported currency.';
  }
  return null;
}

export function validateCountry(value: string): string | null {
  if (!value) return null;
  if (!SUPPORTED_COUNTRIES.includes(value.toUpperCase())) {
    return 'Please choose a supported country.';
  }
  return null;
}

export function validatePhone(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length < 7 || trimmed.length > 20) {
    return 'Please enter a valid phone number.';
  }
  if (!/^[0-9+()\s-]+$/.test(trimmed)) {
    return 'Phone number can only contain digits, spaces, +, -, and ().';
  }
  return null;
}

export function validatePasswordMatch(
  password: string,
  confirm: string
): string | null {
  if (!confirm) return 'Please confirm your password.';
  if (password !== confirm) return 'Passwords do not match.';
  return null;
}

export const BUSINESS_TYPE_OPTIONS = SUPPORTED_BUSINESS_TYPES;
export const CURRENCY_OPTIONS = SUPPORTED_CURRENCIES;
