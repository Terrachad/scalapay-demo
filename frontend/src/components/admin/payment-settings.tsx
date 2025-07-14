'use client';

import PaymentConfigPanel from '@/components/ui/payment-config-panel';

export default function PaymentSettings() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure payment processing, platform settings, and security options
        </p>
      </div>

      {/* Reusable Payment Configuration Panel */}
      <PaymentConfigPanel context="admin" />
    </div>
  );
}
