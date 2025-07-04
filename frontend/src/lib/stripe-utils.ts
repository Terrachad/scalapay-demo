import { StripeElementsOptions } from '@stripe/stripe-js';

export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface BillingDetails {
  name: string;
  email?: string;
  phone?: string;
  address: BillingAddress;
}

/**
 * Validates a billing address object
 */
export function validateBillingAddress(address: Partial<BillingAddress>): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!address.line1?.trim()) {
    errors.line1 = 'Street address is required';
  }

  if (!address.city?.trim()) {
    errors.city = 'City is required';
  }

  if (!address.state?.trim()) {
    errors.state = 'State is required';
  }

  if (!address.postal_code?.trim()) {
    errors.postal_code = 'ZIP/Postal code is required';
  } else if (address.country === 'US' && !/^\d{5}(-\d{4})?$/.test(address.postal_code)) {
    errors.postal_code = 'Please enter a valid US ZIP code';
  }

  if (!address.country?.trim()) {
    errors.country = 'Country is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates billing details including name and address
 */
export function validateBillingDetails(details: Partial<BillingDetails>): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!details.name?.trim()) {
    errors.name = 'Full name is required';
  } else if (details.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }

  if (details.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (details.phone && !/^[\+]?[\d\s\-\(\)]{10,}$/.test(details.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }

  // Validate address if provided
  if (details.address) {
    const addressValidation = validateBillingAddress(details.address);
    if (!addressValidation.isValid) {
      Object.assign(errors, addressValidation.errors);
    }
  } else {
    errors.address = 'Billing address is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Creates optimized Stripe Elements options for enterprise use
 */
export function createStripeElementsOptions(
  clientSecret: string,
  appearance?: Partial<StripeElementsOptions['appearance']>,
): StripeElementsOptions {
  return {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#7c3aed',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#ef4444',
        colorSuccess: '#10b981',
        colorWarning: '#f59e0b',
        borderRadius: '8px',
        fontFamily: 'system-ui, sans-serif',
        fontSizeBase: '16px',
        fontWeightNormal: '400',
        fontWeightBold: '600',
        spacingUnit: '4px',
        ...appearance?.variables,
      },
      rules: {
        '.Input': {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          border: '1px solid #d1d5db',
          padding: '12px',
          fontSize: '16px',
        },
        '.Input:focus': {
          boxShadow: '0 0 0 2px rgba(124, 58, 237, 0.2)',
          borderColor: '#7c3aed',
          outline: 'none',
        },
        '.Input--invalid': {
          borderColor: '#ef4444',
          boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.2)',
        },
        '.Error': {
          color: '#ef4444',
          fontSize: '14px',
          marginTop: '4px',
        },
        '.Label': {
          color: '#374151',
          fontSize: '14px',
          fontWeight: '500',
          marginBottom: '4px',
        },
        ...appearance?.rules,
      },
      ...appearance,
    },
    locale: 'en',
    fonts: [
      {
        cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
      },
    ],
  };
}

/**
 * Payment Element configuration for enterprise use
 */
export function getPaymentElementOptions() {
  return {
    layout: 'accordion' as const,
    business: {
      name: 'ScalaPay Demo Store',
    },
    fields: {
      billingDetails: {
        name: 'auto' as const,
        email: 'auto' as const,
        phone: 'auto' as const,
        address: 'never' as const, // We use AddressElement for this
      },
    },
    wallets: {
      applePay: 'auto' as const,
      googlePay: 'auto' as const,
    },
    terms: {
      card: 'auto' as const,
      applePay: 'auto' as const,
      googlePay: 'auto' as const,
    },
  };
}

/**
 * Address Element configuration for billing address collection
 */
export function getAddressElementOptions() {
  return {
    mode: 'billing' as const,
    allowedCountries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL'],
    blockPoBox: true,
    fields: {
      phone: 'always' as const,
    },
    validation: {
      phone: {
        required: 'never' as const,
      },
    },
    autocomplete: {
      mode: 'google_maps_api' as const,
    },
    display: {
      name: 'split' as const,
    },
  };
}

/**
 * Link Authentication Element configuration
 */
export function getLinkAuthenticationElementOptions(email?: string) {
  return {
    defaultValues: {
      email: email || '',
    },
  };
}

/**
 * Formats Stripe error messages for better user experience
 */
export function formatStripeError(error: any): string {
  if (!error) return 'An unexpected error occurred';

  switch (error.type) {
    case 'card_error':
      switch (error.code) {
        case 'card_declined':
          return 'Your card was declined. Please try a different payment method.';
        case 'insufficient_funds':
          return 'Your card has insufficient funds. Please try a different payment method.';
        case 'incorrect_cvc':
          return "Your card's security code is incorrect. Please check and try again.";
        case 'expired_card':
          return 'Your card has expired. Please try a different payment method.';
        case 'processing_error':
          return 'An error occurred while processing your card. Please try again.';
        case 'incorrect_number':
          return 'Your card number is incorrect. Please check and try again.';
        default:
          return (
            error.message || 'Your payment was declined. Please try a different payment method.'
          );
      }
    case 'validation_error':
      return error.message || 'Please check your payment information and try again.';
    case 'api_error':
      return "We're experiencing technical difficulties. Please try again in a moment.";
    case 'connection_error':
      return 'Network error. Please check your connection and try again.';
    case 'rate_limit_error':
      return 'Too many requests. Please wait a moment and try again.';
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Determines if 3D Secure authentication is likely required
 */
export function requires3DSecure(amount: number, currency: string, country?: string): boolean {
  // European cards often require 3D Secure for amounts over €30
  if (currency.toLowerCase() === 'eur' && amount >= 30) {
    return true;
  }

  // UK cards require 3D Secure for amounts over £30
  if (currency.toLowerCase() === 'gbp' && amount >= 30) {
    return true;
  }

  // Some countries have lower thresholds
  const lowThresholdCountries = ['IT', 'ES', 'FR', 'DE'];
  if (country && lowThresholdCountries.includes(country.toUpperCase()) && amount >= 20) {
    return true;
  }

  return false;
}

/**
 * Gets the appropriate statement descriptor suffix based on transaction amount
 * Note: statement_descriptor_suffix has a 10 character limit
 */
export function getStatementDescriptor(amount: number, installments: number): string {
  if (installments > 1) {
    return `BNPL ${installments}X`; // e.g., "BNPL 4X"
  }
  return 'BNPL';
}

/**
 * Formats currency for display in payment forms
 */
export function formatPaymentAmount(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
