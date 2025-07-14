'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import {
  paymentGatewayConfigService,
  Environment,
  ConfigCategory,
  PaymentGatewayConfig,
  PaymentConfigUpdateRequest,
  ValidationResult,
} from '@/services/payment-gateway-config-service';
import {
  CreditCard,
  Shield,
  Settings,
  Webhook,
  Key,
  Globe,
  CheckCircle,
  AlertTriangle,
  Save,
  RefreshCw,
  History,
  Monitor,
  Info,
} from 'lucide-react';

interface EnterprisePaymentConfigPanelProps {
  context: 'admin' | 'merchant';
  merchantId?: string;
}

export default function EnterprisePaymentConfigPanel({
  context,
}: EnterprisePaymentConfigPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [currentEnvironment, setCurrentEnvironment] = useState<Environment>(
    Environment.DEVELOPMENT,
  );
  const [activeTab, setActiveTab] = useState('gateway');
  const [isLoading, setIsLoading] = useState(false);
  const [editingConfigs, setEditingConfigs] = useState<Map<string, string>>(new Map());
  const [validationResults, setValidationResults] = useState<Map<string, ValidationResult>>(
    new Map(),
  );
  const [showAuditDialog, setShowAuditDialog] = useState(false);
  const [showHealthDialog, setShowHealthDialog] = useState(false);
  const [selectedConfigForAudit, setSelectedConfigForAudit] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Map<string, PaymentConfigUpdateRequest>>(
    new Map(),
  );

  // Set environment in service
  useEffect(() => {
    paymentGatewayConfigService.setEnvironment(currentEnvironment);
  }, [currentEnvironment]);

  // Fetch configurations
  const {
    data: configurations,
    isLoading: configLoading,
    error: configError,
  } = useQuery({
    queryKey: ['payment-gateway-configs', currentEnvironment],
    queryFn: () => paymentGatewayConfigService.getAllConfigs(),
    staleTime: 30000, // 30 seconds
  });

  // Fetch configuration schema
  const { data: configSchema, isLoading: schemaLoading } = useQuery({
    queryKey: ['payment-gateway-config-schema', currentEnvironment],
    queryFn: () => paymentGatewayConfigService.getConfigSchema(),
    staleTime: 300000, // 5 minutes
  });

  // Fetch health status
  const { data: healthStatus, isLoading: healthLoading } = useQuery({
    queryKey: ['payment-gateway-health'],
    queryFn: () => paymentGatewayConfigService.getHealthStatus(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch audit trail for selected config
  const { data: auditTrail, isLoading: auditLoading } = useQuery({
    queryKey: ['payment-gateway-audit', selectedConfigForAudit, currentEnvironment],
    queryFn: () =>
      selectedConfigForAudit
        ? paymentGatewayConfigService.getConfigAuditTrail(selectedConfigForAudit)
        : Promise.resolve(null),
    enabled: !!selectedConfigForAudit,
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: (data: { updates: PaymentConfigUpdateRequest[]; reason?: string }) =>
      paymentGatewayConfigService.bulkUpdate(data.updates, data.reason),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['payment-gateway-configs'] });
      setPendingChanges(new Map());
      setEditingConfigs(new Map());
      setValidationResults(new Map());
      toast({
        title: 'Configuration updated',
        description: `Successfully updated ${result.updated} configurations (Batch ID: ${result.batchId})`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update payment configurations.',
        variant: 'destructive',
      });
    },
  });

  // Reset to defaults mutation
  const resetDefaultsMutation = useMutation({
    mutationFn: (reason?: string) => paymentGatewayConfigService.resetToDefaults(reason),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['payment-gateway-configs'] });
      setPendingChanges(new Map());
      setEditingConfigs(new Map());
      setValidationResults(new Map());
      toast({
        title: 'Reset successful',
        description: `Reset ${result.reset} configurations to default values`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Reset failed',
        description: error.message || 'Failed to reset configurations.',
        variant: 'destructive',
      });
    },
  });

  // Handle configuration value change with real-time validation
  const handleConfigChange = useCallback(
    async (configKey: string, value: string, config: PaymentGatewayConfig) => {
      const newEditingConfigs = new Map(editingConfigs);
      newEditingConfigs.set(configKey, value);
      setEditingConfigs(newEditingConfigs);

      // Add to pending changes
      const newPendingChanges = new Map(pendingChanges);
      newPendingChanges.set(configKey, {
        configKey,
        value,
        category: config.category,
        provider: config.provider,
        description: config.description,
        isEncrypted: config.isEncrypted,
        isSensitive: config.isSensitive,
        metadata: config.metadata,
      });
      setPendingChanges(newPendingChanges);

      // Validate in real-time
      try {
        const validationResult = await paymentGatewayConfigService.validateConfigDebounced(
          configKey,
          value,
        );
        const newValidationResults = new Map(validationResults);
        newValidationResults.set(configKey, validationResult);
        setValidationResults(newValidationResults);
      } catch (error) {
        console.error('Validation error:', error);
      }
    },
    [editingConfigs, pendingChanges, validationResults],
  );

  // Handle save all changes
  const handleSaveAll = async () => {
    if (pendingChanges.size === 0) {
      toast({
        title: 'No changes to save',
        description: 'Make some changes before saving.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const updates = Array.from(pendingChanges.values());
      await bulkUpdateMutation.mutateAsync({
        updates,
        reason: `Bulk update from ${context} interface`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle reset to defaults
  const handleResetToDefaults = async () => {
    if (
      !window.confirm(
        'Are you sure you want to reset all configurations to default values? This cannot be undone.',
      )
    ) {
      return;
    }

    setIsLoading(true);
    try {
      await resetDefaultsMutation.mutateAsync(`Reset from ${context} interface`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle environment change
  const handleEnvironmentChange = (environment: Environment) => {
    if (pendingChanges.size > 0) {
      if (
        !window.confirm(
          'You have unsaved changes. Switching environments will lose these changes. Continue?',
        )
      ) {
        return;
      }
    }

    setCurrentEnvironment(environment);
    setPendingChanges(new Map());
    setEditingConfigs(new Map());
    setValidationResults(new Map());
  };

  // Render configuration input based on metadata
  const renderConfigInput = (config: PaymentGatewayConfig, schema: any) => {
    const currentValue = editingConfigs.get(config.configKey) ?? config.value;
    const validation = validationResults.get(config.configKey);
    const inputType = schema?.ui?.inputType || 'text';

    const commonProps = {
      value: currentValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        handleConfigChange(config.configKey, e.target.value, config),
      placeholder: schema?.ui?.placeholder || '',
      disabled: isLoading,
    };

    const inputClassName = `${validation && !validation.isValid ? 'border-red-500' : ''} ${
      pendingChanges.has(config.configKey) ? 'border-yellow-500' : ''
    }`;

    let inputElement;
    switch (inputType) {
      case 'password':
        inputElement = <Input {...commonProps} type="password" className={inputClassName} />;
        break;
      case 'number':
        inputElement = (
          <Input
            {...commonProps}
            type="number"
            min={schema?.validation?.min}
            max={schema?.validation?.max}
            className={inputClassName}
          />
        );
        break;
      case 'textarea':
        inputElement = <Textarea {...commonProps} className={inputClassName} />;
        break;
      case 'select':
        inputElement = (
          <Select
            value={currentValue}
            onValueChange={(value) => handleConfigChange(config.configKey, value, config)}
            disabled={isLoading}
          >
            <SelectTrigger className={inputClassName}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {schema?.validation?.enum?.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
        break;
      case 'switch':
        inputElement = (
          <Switch
            checked={currentValue === 'true'}
            onCheckedChange={(checked) =>
              handleConfigChange(config.configKey, checked.toString(), config)
            }
            disabled={isLoading}
          />
        );
        break;
      default:
        inputElement = (
          <Input
            {...commonProps}
            type={config.isSensitive ? 'password' : 'text'}
            className={inputClassName}
          />
        );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            {schema?.ui?.label || config.configKey}
            {schema?.validation?.required && <span className="text-red-500">*</span>}
            {config.isSensitive && <Key className="w-3 h-3 text-gray-500" />}
            {pendingChanges.has(config.configKey) && (
              <Badge variant="outline" className="text-xs">
                Modified
              </Badge>
            )}
          </Label>
          <div className="flex items-center gap-2">
            {validation && (
              <div className="flex items-center gap-1">
                {validation.isValid ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                )}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedConfigForAudit(config.configKey);
                setShowAuditDialog(true);
              }}
            >
              <History className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {inputElement}

        {schema?.ui?.helpText && <p className="text-xs text-gray-500">{schema.ui.helpText}</p>}

        {config.description && <p className="text-xs text-gray-600">{config.description}</p>}

        {validation && !validation.isValid && validation.errors && (
          <Alert variant="destructive" className="mt-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside text-sm">
                {validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {validation && validation.warnings && validation.warnings.length > 0 && (
          <Alert className="mt-2">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside text-sm">
                {validation.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  // Render configuration category
  const renderConfigCategory = (categoryName: string, configs: PaymentGatewayConfig[]) => {
    const categorySchema = configSchema?.[categoryName] || {};
    const categoryIcon =
      {
        gateway: Globe,
        processing: Settings,
        security: Shield,
        webhooks: Webhook,
        fraud: AlertTriangle,
        compliance: CheckCircle,
      }[categoryName as keyof typeof categorySchema] || Settings;

    const IconComponent = categoryIcon;

    return (
      <Card key={categoryName} className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 capitalize">
            <IconComponent className="w-5 h-5" />
            {categoryName}
            <Badge variant="outline" className="ml-auto">
              {configs.length} configs
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {configs.map((config) => (
              <div key={config.configKey} className="space-y-2">
                {renderConfigInput(config, categorySchema[config.configKey])}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (configLoading || schemaLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
        <div className="h-24 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (configError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load payment gateway configurations. Please check your connection and try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Enterprise Payment Gateway Configuration
          </h3>
          <p className="text-sm text-gray-600">
            Configure payment processing, gateways, and API integrations with enterprise-grade
            controls
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={context === 'admin' ? 'default' : 'secondary'}>
            {context === 'admin' ? 'Platform Admin' : 'Merchant Config'}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => setShowHealthDialog(true)}>
            <Monitor className="w-4 h-4 mr-2" />
            Health
          </Button>
        </div>
      </div>

      {/* Environment and Controls */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label>Environment:</Label>
            <Select value={currentEnvironment} onValueChange={handleEnvironmentChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={Environment.DEVELOPMENT}>Development</SelectItem>
                <SelectItem value={Environment.STAGING}>Staging</SelectItem>
                <SelectItem value={Environment.PRODUCTION}>Production</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Badge
            variant={currentEnvironment === Environment.PRODUCTION ? 'destructive' : 'secondary'}
          >
            {currentEnvironment}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {pendingChanges.size > 0 && (
            <Badge variant="outline" className="text-yellow-600">
              {pendingChanges.size} unsaved changes
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleResetToDefaults} disabled={isLoading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSaveAll} disabled={isLoading || pendingChanges.size === 0}>
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save All Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="gateway" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Gateway
          </TabsTrigger>
          <TabsTrigger value="processing" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Processing
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="w-4 h-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="fraud" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Fraud
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Compliance
          </TabsTrigger>
        </TabsList>

        {/* Gateway Tab */}
        <TabsContent value="gateway" className="space-y-4">
          {configurations?.[ConfigCategory.GATEWAY] &&
            renderConfigCategory(ConfigCategory.GATEWAY, configurations[ConfigCategory.GATEWAY])}
        </TabsContent>

        {/* Processing Tab */}
        <TabsContent value="processing" className="space-y-4">
          {configurations?.[ConfigCategory.PROCESSING] &&
            renderConfigCategory(
              ConfigCategory.PROCESSING,
              configurations[ConfigCategory.PROCESSING],
            )}
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          {configurations?.[ConfigCategory.SECURITY] &&
            renderConfigCategory(ConfigCategory.SECURITY, configurations[ConfigCategory.SECURITY])}
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-4">
          {configurations?.[ConfigCategory.WEBHOOKS] &&
            renderConfigCategory(ConfigCategory.WEBHOOKS, configurations[ConfigCategory.WEBHOOKS])}
        </TabsContent>

        {/* Fraud Tab */}
        <TabsContent value="fraud" className="space-y-4">
          {configurations?.[ConfigCategory.FRAUD] &&
            renderConfigCategory(ConfigCategory.FRAUD, configurations[ConfigCategory.FRAUD])}
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4">
          {configurations?.[ConfigCategory.COMPLIANCE] &&
            renderConfigCategory(
              ConfigCategory.COMPLIANCE,
              configurations[ConfigCategory.COMPLIANCE],
            )}
        </TabsContent>
      </Tabs>

      {/* Audit Trail Dialog */}
      <Dialog open={showAuditDialog} onOpenChange={setShowAuditDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Audit Trail: {selectedConfigForAudit}
            </DialogTitle>
          </DialogHeader>

          {auditLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          ) : auditTrail ? (
            <div className="space-y-4">
              {/* Audit Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">Total Changes</p>
                  <p className="text-lg font-semibold">{auditTrail.summary.totalChanges}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">Last Modified</p>
                  <p className="text-lg font-semibold">
                    {new Date(auditTrail.summary.lastModified).toLocaleDateString()}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">Last Modified By</p>
                  <p className="text-lg font-semibold">{auditTrail.summary.lastModifiedBy}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">Has Errors</p>
                  <p className="text-lg font-semibold">
                    {auditTrail.summary.hasErrors ? '⚠️ Yes' : '✅ No'}
                  </p>
                </div>
              </div>

              {/* Audit History */}
              <div className="space-y-2">
                <h4 className="font-medium">Recent Changes</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Operation</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Old Value</TableHead>
                      <TableHead>New Value</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditTrail.history.slice(0, 10).map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{new Date(record.createdAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{record.operation}</Badge>
                        </TableCell>
                        <TableCell>{record.userEmail || record.userId}</TableCell>
                        <TableCell className="max-w-32 truncate">
                          {record.oldValue || '-'}
                        </TableCell>
                        <TableCell className="max-w-32 truncate">
                          {record.newValue || '-'}
                        </TableCell>
                        <TableCell>
                          {record.isSuccessful ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <p>No audit trail found for this configuration.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Health Status Dialog */}
      <Dialog open={showHealthDialog} onOpenChange={setShowHealthDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              System Health Status
            </DialogTitle>
          </DialogHeader>

          {healthLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          ) : healthStatus ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium">Overall Status: {healthStatus.status}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 border rounded">
                  <p className="font-medium">Database</p>
                  <p className="text-sm text-gray-600">{healthStatus.database.status}</p>
                </div>
                <div className="p-3 border rounded">
                  <p className="font-medium">Configurations</p>
                  <p className="text-sm text-gray-600">{healthStatus.configurations.status}</p>
                </div>
                <div className="p-3 border rounded">
                  <p className="font-medium">Validation</p>
                  <p className="text-sm text-gray-600">{healthStatus.validation.status}</p>
                </div>
                <div className="p-3 border rounded">
                  <p className="font-medium">Audit</p>
                  <p className="text-sm text-gray-600">{healthStatus.audit.status}</p>
                </div>
              </div>
            </div>
          ) : (
            <p>Unable to load health status.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
