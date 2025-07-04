'use client';

import PaymentConfigPanelSimple from '@/components/ui/payment-config-panel-simple';

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
      <PaymentConfigPanelSimple context="admin" showPlatformSettings={true} />
    </div>
  );
}
