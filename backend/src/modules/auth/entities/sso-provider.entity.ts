import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// Interfaces for SSO configuration
export interface SAMLConfig {
  entityId: string;
  entryPoint: string; // SSO URL
  logoutUrl?: string;
  certificate: string; // X.509 certificate
  privateKey?: string; // For signing requests
  signatureAlgorithm?: 'sha1' | 'sha256' | 'sha512';
  digestAlgorithm?: 'sha1' | 'sha256' | 'sha512';
  authnRequestBinding?: 'HTTP-POST' | 'HTTP-Redirect';
  responseBinding?: 'HTTP-POST' | 'HTTP-Redirect';
  wantAssertionsSigned?: boolean;
  wantResponseSigned?: boolean;
  nameIdFormat?: string;
  clockSkew?: number; // Allowed clock skew in seconds
}

export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  authorizationURL: string;
  tokenURL: string;
  userInfoURL?: string;
  scope: string[];
  responseType?: 'code' | 'token';
  grantType?: 'authorization_code' | 'client_credentials';
  pkceEnabled?: boolean;
  state?: string;
  redirectURI: string;
}

export interface OpenIDConfig {
  clientId: string;
  clientSecret: string;
  issuer: string;
  discoveryURL?: string;
  authorizationURL?: string;
  tokenURL?: string;
  userInfoURL?: string;
  jwksURI?: string;
  scope: string[];
  responseTypes: string[];
  tokenEndpointAuthMethod?: 'client_secret_basic' | 'client_secret_post' | 'private_key_jwt';
  idTokenSignedResponseAlg?: string;
  clockSkew?: number;
}

export interface AttributeMapping {
  email: string; // SAML attribute or OAuth2/OIDC claim name
  firstName?: string;
  lastName?: string;
  displayName?: string;
  roles?: string;
  department?: string;
  title?: string;
  phoneNumber?: string;
  groups?: string;
  userId?: string;
  customAttributes?: {
    [key: string]: string;
  };
}

export interface ProviderStatistics {
  totalLogins: number;
  successfulLogins: number;
  failedLogins: number;
  lastSuccessfulLogin?: Date;
  lastFailedLogin?: Date;
  activeUsers: number;
  averageResponseTime: number; // milliseconds
  uptimePercentage: number;
  lastChecked: Date;
}

export interface SecuritySettings {
  requireSignedAssertions: boolean;
  requireSignedResponses: boolean;
  allowUnencryptedAssertions: boolean;
  sessionTimeout: number; // minutes
  forceReauthentication: boolean;
  allowPassiveAuthentication: boolean;
  requireMFA: boolean;
  trustedDomains?: string[];
  ipWhitelist?: string[];
  certificateValidation: boolean;
}

export interface ProviderMetadata {
  version: string;
  supportedBindings: string[];
  supportedNameIdFormats?: string[];
  capabilities: string[];
  contact: {
    technical: string;
    support: string;
  };
  organization: {
    name: string;
    displayName: string;
    url: string;
  };
}

@Entity('sso_providers')
export class SSOProvider {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @Index()
  name!: string; // 'Azure AD', 'Google Workspace', 'Okta', etc.

  @Column()
  @Index()
  type!: 'SAML' | 'OAuth2' | 'OpenID';

  @Column({ type: 'json' })
  configuration!: SAMLConfig | OAuth2Config | OpenIDConfig;

  @Column({ default: true })
  active!: boolean;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'json', nullable: true })
  attributeMapping?: AttributeMapping;

  @Column({ type: 'json', nullable: true })
  securitySettings?: SecuritySettings;

  @Column({ type: 'json', nullable: true })
  statistics?: ProviderStatistics;

  @Column({ type: 'json', nullable: true })
  metadata?: ProviderMetadata;

  // Domain-based routing
  @Column({ type: 'json', nullable: true })
  domainConfiguration?: {
    allowedDomains: string[]; // Email domains that should use this provider
    autoRedirect: boolean; // Automatically redirect users from these domains
    domainHint?: string; // Hint for the provider
  };

  // Just-in-time provisioning
  @Column({ type: 'json', nullable: true })
  jitProvisioning?: {
    enabled: boolean;
    createUsers: boolean;
    updateUsers: boolean;
    defaultRole: string;
    roleMapping?: {
      [providerRole: string]: string; // Map provider roles to application roles
    };
    requiredAttributes: string[];
  };

  // Connection testing
  @Column({ nullable: true })
  lastConnectionTest?: Date;

  @Column({ nullable: true })
  connectionStatus?: 'connected' | 'disconnected' | 'error' | 'untested';

  @Column({ type: 'text', nullable: true })
  lastConnectionError?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper methods for SSO functionality
  isConfigurationValid(): boolean {
    if (!this.configuration) return false;

    switch (this.type) {
      case 'SAML':
        const samlConfig = this.configuration as SAMLConfig;
        return !!(samlConfig.entityId && samlConfig.entryPoint && samlConfig.certificate);

      case 'OAuth2':
        const oauth2Config = this.configuration as OAuth2Config;
        return !!(
          oauth2Config.clientId &&
          oauth2Config.clientSecret &&
          oauth2Config.authorizationURL &&
          oauth2Config.tokenURL
        );

      case 'OpenID':
        const oidcConfig = this.configuration as OpenIDConfig;
        return !!(oidcConfig.clientId && oidcConfig.clientSecret && oidcConfig.issuer);

      default:
        return false;
    }
  }

  canHandleDomain(email: string): boolean {
    if (!this.domainConfiguration?.allowedDomains) return false;

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return false;

    return this.domainConfiguration.allowedDomains.some(
      (allowedDomain) => domain === allowedDomain.toLowerCase(),
    );
  }

  shouldAutoRedirect(email: string): boolean {
    return this.canHandleDomain(email) && this.domainConfiguration?.autoRedirect === true;
  }

  getLoginURL(redirectURI?: string, state?: string): string {
    if (!this.isConfigurationValid()) {
      throw new Error('Invalid SSO configuration');
    }

    switch (this.type) {
      case 'SAML':
        const samlConfig = this.configuration as SAMLConfig;
        return samlConfig.entryPoint;

      case 'OAuth2':
        const oauth2Config = this.configuration as OAuth2Config;
        const oauth2Params = new URLSearchParams({
          client_id: oauth2Config.clientId,
          response_type: oauth2Config.responseType || 'code',
          scope: oauth2Config.scope.join(' '),
          redirect_uri: redirectURI || oauth2Config.redirectURI,
        });
        if (state) oauth2Params.set('state', state);
        return `${oauth2Config.authorizationURL}?${oauth2Params.toString()}`;

      case 'OpenID':
        const oidcConfig = this.configuration as OpenIDConfig;
        const oidcParams = new URLSearchParams({
          client_id: oidcConfig.clientId,
          response_type: oidcConfig.responseTypes.join(' '),
          scope: oidcConfig.scope.join(' '),
          redirect_uri: redirectURI || '',
        });
        if (state) oidcParams.set('state', state);
        const authURL = oidcConfig.authorizationURL || `${oidcConfig.issuer}/oauth2/authorize`;
        return `${authURL}?${oidcParams.toString()}`;

      default:
        throw new Error(`Unsupported SSO type: ${this.type}`);
    }
  }

  updateStatistics(loginSuccess: boolean, responseTime?: number): void {
    if (!this.statistics) {
      this.statistics = {
        totalLogins: 0,
        successfulLogins: 0,
        failedLogins: 0,
        activeUsers: 0,
        averageResponseTime: 0,
        uptimePercentage: 100,
        lastChecked: new Date(),
      };
    }

    this.statistics.totalLogins += 1;

    if (loginSuccess) {
      this.statistics.successfulLogins += 1;
      this.statistics.lastSuccessfulLogin = new Date();
    } else {
      this.statistics.failedLogins += 1;
      this.statistics.lastFailedLogin = new Date();
    }

    // Update average response time
    if (responseTime) {
      const totalResponseTime =
        this.statistics.averageResponseTime * (this.statistics.totalLogins - 1);
      this.statistics.averageResponseTime =
        (totalResponseTime + responseTime) / this.statistics.totalLogins;
    }

    // Update uptime percentage
    const successRate = this.statistics.successfulLogins / this.statistics.totalLogins;
    this.statistics.uptimePercentage = Math.round(successRate * 100 * 100) / 100;

    this.statistics.lastChecked = new Date();
  }

  mapAttributes(providerAttributes: any): any {
    if (!this.attributeMapping) return {};

    const mappedAttributes: any = {};

    // Map standard attributes
    if (this.attributeMapping.email) {
      mappedAttributes.email = this.getNestedValue(providerAttributes, this.attributeMapping.email);
    }
    if (this.attributeMapping.firstName) {
      mappedAttributes.firstName = this.getNestedValue(
        providerAttributes,
        this.attributeMapping.firstName,
      );
    }
    if (this.attributeMapping.lastName) {
      mappedAttributes.lastName = this.getNestedValue(
        providerAttributes,
        this.attributeMapping.lastName,
      );
    }
    if (this.attributeMapping.displayName) {
      mappedAttributes.displayName = this.getNestedValue(
        providerAttributes,
        this.attributeMapping.displayName,
      );
    }
    if (this.attributeMapping.roles) {
      mappedAttributes.roles = this.getNestedValue(providerAttributes, this.attributeMapping.roles);
    }
    if (this.attributeMapping.department) {
      mappedAttributes.department = this.getNestedValue(
        providerAttributes,
        this.attributeMapping.department,
      );
    }

    // Map custom attributes
    if (this.attributeMapping.customAttributes) {
      for (const [localAttr, providerAttr] of Object.entries(
        this.attributeMapping.customAttributes,
      )) {
        mappedAttributes[localAttr] = this.getNestedValue(providerAttributes, providerAttr);
      }
    }

    return mappedAttributes;
  }

  canProvisionUser(): boolean {
    return this.jitProvisioning?.enabled === true && this.jitProvisioning?.createUsers === true;
  }

  canUpdateUser(): boolean {
    return this.jitProvisioning?.enabled === true && this.jitProvisioning?.updateUsers === true;
  }

  mapUserRole(providerRoles: string | string[]): string {
    if (!this.jitProvisioning?.roleMapping) {
      return this.jitProvisioning?.defaultRole || 'user';
    }

    const roles = Array.isArray(providerRoles) ? providerRoles : [providerRoles];

    // Find the first matching role in the mapping
    for (const role of roles) {
      if (this.jitProvisioning.roleMapping[role]) {
        return this.jitProvisioning.roleMapping[role];
      }
    }

    return this.jitProvisioning.defaultRole || 'user';
  }

  validateRequiredAttributes(attributes: any): string[] {
    const missing: string[] = [];

    if (!this.jitProvisioning?.requiredAttributes) return missing;

    for (const required of this.jitProvisioning.requiredAttributes) {
      const value = this.getNestedValue(attributes, required);
      if (!value) {
        missing.push(required);
      }
    }

    return missing;
  }

  testConnection(): Promise<boolean> {
    // This would be implemented in the service layer
    // Here we just update the test timestamp
    this.lastConnectionTest = new Date();
    return Promise.resolve(true);
  }

  getHealthStatus(): 'healthy' | 'warning' | 'error' {
    if (!this.statistics) return 'warning';

    if (this.connectionStatus === 'error') return 'error';
    if (this.statistics.uptimePercentage < 95) return 'warning';
    if (this.statistics.averageResponseTime > 5000) return 'warning';

    return 'healthy';
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  // Static method to create default provider configurations
  static createSAMLProvider(
    name: string,
    entityId: string,
    entryPoint: string,
    certificate: string,
  ): Partial<SSOProvider> {
    return {
      name,
      type: 'SAML',
      configuration: {
        entityId,
        entryPoint,
        certificate,
        signatureAlgorithm: 'sha256',
        digestAlgorithm: 'sha256',
        authnRequestBinding: 'HTTP-POST',
        responseBinding: 'HTTP-POST',
        wantAssertionsSigned: true,
        wantResponseSigned: true,
        nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        clockSkew: 300, // 5 minutes
      } as SAMLConfig,
      attributeMapping: {
        email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
        firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
        lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
        displayName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
        roles: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
      },
      securitySettings: {
        requireSignedAssertions: true,
        requireSignedResponses: true,
        allowUnencryptedAssertions: false,
        sessionTimeout: 480, // 8 hours
        forceReauthentication: false,
        allowPassiveAuthentication: true,
        requireMFA: false,
        certificateValidation: true,
      },
    };
  }

  static createOAuth2Provider(
    name: string,
    clientId: string,
    clientSecret: string,
    authURL: string,
    tokenURL: string,
  ): Partial<SSOProvider> {
    return {
      name,
      type: 'OAuth2',
      configuration: {
        clientId,
        clientSecret,
        authorizationURL: authURL,
        tokenURL,
        scope: ['openid', 'profile', 'email'],
        responseType: 'code',
        grantType: 'authorization_code',
        pkceEnabled: true,
        redirectURI: `${process.env.FRONTEND_URL}/auth/callback`,
      } as OAuth2Config,
      attributeMapping: {
        email: 'email',
        firstName: 'given_name',
        lastName: 'family_name',
        displayName: 'name',
      },
    };
  }

  static createOpenIDProvider(
    name: string,
    clientId: string,
    clientSecret: string,
    issuer: string,
  ): Partial<SSOProvider> {
    return {
      name,
      type: 'OpenID',
      configuration: {
        clientId,
        clientSecret,
        issuer,
        discoveryURL: `${issuer}/.well-known/openid_configuration`,
        scope: ['openid', 'profile', 'email'],
        responseTypes: ['code'],
        tokenEndpointAuthMethod: 'client_secret_post',
        idTokenSignedResponseAlg: 'RS256',
        clockSkew: 300,
      } as OpenIDConfig,
      attributeMapping: {
        email: 'email',
        firstName: 'given_name',
        lastName: 'family_name',
        displayName: 'name',
        roles: 'roles',
      },
    };
  }

  // Method to validate provider configuration
  validateConfiguration(): string[] {
    const errors: string[] = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Provider name is required');
    }

    if (!this.type) {
      errors.push('Provider type is required');
    }

    if (!this.isConfigurationValid()) {
      errors.push(`Invalid ${this.type} configuration`);
    }

    if (this.attributeMapping && !this.attributeMapping.email) {
      errors.push('Email attribute mapping is required');
    }

    if (this.jitProvisioning?.enabled) {
      if (!this.jitProvisioning.defaultRole) {
        errors.push('Default role is required when JIT provisioning is enabled');
      }
    }

    return errors;
  }
}
