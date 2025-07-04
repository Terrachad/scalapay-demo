'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentConfigService } from '@/services/payment-config-service';
import { platformSettingsService } from '@/services/platform-settings-service';
import { API_ENDPOINTS } from '@/lib/constants';

interface PaymentConfigPanelProps {
  merchantId?: string;
  context: 'admin' | 'merchant';
  showPlatformSettings?: boolean;
}

export default function PaymentConfigPanel({
  merchantId,
  context,
  showPlatformSettings = false,
}: PaymentConfigPanelProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch payment configuration
  const {
    data: paymentConfig,
    isLoading: configLoading,
    error: configError,
  } = useQuery({
    queryKey: ['payment-config', merchantId],
    queryFn: () =>
      merchantId
        ? paymentConfigService.getPaymentConfig(merchantId)
        : paymentConfigService.getDefaultPaymentConfig(),
    enabled: !!merchantId || context === 'admin',
    retry: 2,
    staleTime: 30000, // 30 seconds
  });

  // Fetch platform settings (admin only)
  const {
    data: platformSettings,
    isLoading: platformLoading,
    error: platformError,
  } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: platformSettingsService.getPlatformSettings,
    enabled: context === 'admin' && showPlatformSettings,
    retry: 2,
    staleTime: 30000, // 30 seconds
  });

  // Update payment config mutation
  const updateConfigMutation = useMutation({
    mutationFn: (data: any) =>
      merchantId
        ? paymentConfigService.updatePaymentConfig(merchantId, data)
        : paymentConfigService.updateDefaultPaymentConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-config'] });
    },
  });

  // Update platform settings mutation
  const updatePlatformMutation = useMutation({
    mutationFn: platformSettingsService.updatePlatformSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
    },
  });

  const handleConfigUpdate = async (section: string, data: any) => {
    setIsLoading(true);
    try {
      await updateConfigMutation.mutateAsync({ [section]: data });
    } catch (error) {
      console.error('Failed to update configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlatformUpdate = async (data: any) => {
    setIsLoading(true);
    try {
      await updatePlatformMutation.mutateAsync(data);
    } catch (error) {
      console.error('Failed to update platform settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show errors if any
  if (configError || platformError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-medium mb-2">Configuration Error</h3>
        <p className="text-red-600 text-sm">
          {configError
            ? `Payment config error: ${configError instanceof Error ? configError.message : 'Unknown error'}`
            : ''}
          {platformError
            ? `Platform settings error: ${platformError instanceof Error ? platformError.message : 'Unknown error'}`
            : ''}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (configLoading || platformLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="h-32 bg-gray-200 rounded mb-4"></div>
        <div className="h-24 bg-gray-200 rounded"></div>
        <p className="text-sm text-gray-500 mt-2">
          Loading {configLoading ? 'payment configuration' : 'platform settings'}...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {context === 'admin' ? 'Payment Configuration' : 'Payment Settings'}
        </h2>
        <p className="text-gray-600">
          {context === 'admin'
            ? 'Configure payment processing and platform settings'
            : 'Manage your payment processing preferences'}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {['general', 'processing', 'security', 'limits'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
          {context === 'admin' && showPlatformSettings && (
            <button
              onClick={() => setActiveTab('platform')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'platform'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Platform
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'general' && (
          <GeneralSettingsPanel
            config={paymentConfig}
            onUpdate={(data) => handleConfigUpdate('general', data)}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'processing' && (
          <ProcessingSettingsPanel
            config={paymentConfig}
            onUpdate={(data) => handleConfigUpdate('processing', data)}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'security' && (
          <SecuritySettingsPanel
            config={paymentConfig}
            onUpdate={(data) => handleConfigUpdate('security', data)}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'limits' && (
          <LimitsSettingsPanel
            config={paymentConfig}
            onUpdate={(data) => handleConfigUpdate('limits', data)}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'platform' && context === 'admin' && (
          <PlatformSettingsPanel
            settings={platformSettings}
            onUpdate={handlePlatformUpdate}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}

// Reusable settings panels
function GeneralSettingsPanel({ config, onUpdate, isLoading }: any) {
  const [formData, setFormData] = useState({
    companyName: config?.companyName || '',
    defaultCurrency: config?.defaultCurrency || 'USD',
    timeZone: config?.timeZone || 'UTC',
    autoSettlement: config?.autoSettlement || true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
        <input
          type="text"
          value={formData.companyName}
          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Currency</label>
          <select
            value={formData.defaultCurrency}
            onChange={(e) => setFormData({ ...formData, defaultCurrency: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="CAD">CAD</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Time Zone</label>
          <select
            value={formData.timeZone}
            onChange={(e) => setFormData({ ...formData, timeZone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
          </select>
        </div>
      </div>

      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.autoSettlement}
            onChange={(e) => setFormData({ ...formData, autoSettlement: e.target.checked })}
            className="mr-2"
          />
          <span className="text-sm text-gray-700">Enable automatic settlement</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Saving...' : 'Save General Settings'}
      </button>
    </form>
  );
}

function ProcessingSettingsPanel({ config, onUpdate, isLoading }: any) {
  const [formData, setFormData] = useState({
    processingMode: config?.processingMode || 'live',
    allowedPaymentMethods: config?.allowedPaymentMethods || ['credit_card', 'bank_transfer'],
    requireCvv: config?.requireCvv || true,
    captureMode: config?.captureMode || 'automatic',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Processing Mode</label>
        <select
          value={formData.processingMode}
          onChange={(e) => setFormData({ ...formData, processingMode: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="test">Test Mode</option>
          <option value="live">Live Mode</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Allowed Payment Methods
        </label>
        <div className="space-y-2">
          {['credit_card', 'bank_transfer', 'digital_wallet'].map((method) => (
            <label key={method} className="flex items-center">
              <input
                type="checkbox"
                checked={formData.allowedPaymentMethods.includes(method)}
                onChange={(e) => {
                  const methods = e.target.checked
                    ? [...formData.allowedPaymentMethods, method]
                    : formData.allowedPaymentMethods.filter((m) => m !== method);
                  setFormData({ ...formData, allowedPaymentMethods: methods });
                }}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 capitalize">{method.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.requireCvv}
              onChange={(e) => setFormData({ ...formData, requireCvv: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Require CVV</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Capture Mode</label>
          <select
            value={formData.captureMode}
            onChange={(e) => setFormData({ ...formData, captureMode: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="automatic">Automatic</option>
            <option value="manual">Manual</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Saving...' : 'Save Processing Settings'}
      </button>
    </form>
  );
}

function SecuritySettingsPanel({ config, onUpdate, isLoading }: any) {
  const [formData, setFormData] = useState({
    fraudDetectionEnabled: config?.fraudDetectionEnabled || true,
    maxRiskScore: config?.maxRiskScore || 70,
    require3ds: config?.require3ds || false,
    allowedCountries: config?.allowedCountries || ['US', 'CA', 'GB'],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.fraudDetectionEnabled}
            onChange={(e) => setFormData({ ...formData, fraudDetectionEnabled: e.target.checked })}
            className="mr-2"
          />
          <span className="text-sm text-gray-700">Enable fraud detection</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Maximum Risk Score (0-100)
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={formData.maxRiskScore}
          onChange={(e) => setFormData({ ...formData, maxRiskScore: parseInt(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Low Risk (0)</span>
          <span>Current: {formData.maxRiskScore}</span>
          <span>High Risk (100)</span>
        </div>
      </div>

      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.require3ds}
            onChange={(e) => setFormData({ ...formData, require3ds: e.target.checked })}
            className="mr-2"
          />
          <span className="text-sm text-gray-700">Require 3D Secure authentication</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Saving...' : 'Save Security Settings'}
      </button>
    </form>
  );
}

function LimitsSettingsPanel({ config, onUpdate, isLoading }: any) {
  const [formData, setFormData] = useState({
    dailyLimit: config?.dailyLimit || 10000,
    monthlyLimit: config?.monthlyLimit || 100000,
    singleTransactionLimit: config?.singleTransactionLimit || 5000,
    minimumAmount: config?.minimumAmount || 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Daily Limit ($)</label>
          <input
            type="number"
            value={formData.dailyLimit}
            onChange={(e) => setFormData({ ...formData, dailyLimit: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Limit ($)</label>
          <input
            type="number"
            value={formData.monthlyLimit}
            onChange={(e) => setFormData({ ...formData, monthlyLimit: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Single Transaction Limit ($)
          </label>
          <input
            type="number"
            value={formData.singleTransactionLimit}
            onChange={(e) =>
              setFormData({ ...formData, singleTransactionLimit: parseInt(e.target.value) })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Amount ($)</label>
          <input
            type="number"
            value={formData.minimumAmount}
            onChange={(e) => setFormData({ ...formData, minimumAmount: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Saving...' : 'Save Limit Settings'}
      </button>
    </form>
  );
}

function PlatformSettingsPanel({ settings, onUpdate, isLoading }: any) {
  const [formData, setFormData] = useState({
    platformName: settings?.platformName || 'ScalaPay',
    supportEmail: settings?.supportEmail || 'support@scalapay.com',
    maintenanceMode: settings?.maintenanceMode || false,
    defaultMerchantCommission: settings?.defaultMerchantCommission || 2.9,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Platform Name</label>
        <input
          type="text"
          value={formData.platformName}
          onChange={(e) => setFormData({ ...formData, platformName: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
        <input
          type="email"
          value={formData.supportEmail}
          onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Default Merchant Commission (%)
        </label>
        <input
          type="number"
          step="0.1"
          value={formData.defaultMerchantCommission}
          onChange={(e) =>
            setFormData({ ...formData, defaultMerchantCommission: parseFloat(e.target.value) })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          min="0"
          max="10"
        />
      </div>

      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.maintenanceMode}
            onChange={(e) => setFormData({ ...formData, maintenanceMode: e.target.checked })}
            className="mr-2"
          />
          <span className="text-sm text-gray-700">Enable maintenance mode</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Saving...' : 'Save Platform Settings'}
      </button>
    </form>
  );
}
