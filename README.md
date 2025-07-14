# 🚀 ScalaPay Enterprise BNPL Platform

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.1%2B-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-ea2845.svg)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14.x-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A production-grade **Buy Now, Pay Later (BNPL)** platform built with modern enterprise technologies. This comprehensive solution provides flexible payment splitting, real-time fraud detection, credit assessment, multi-tenant merchant management, and enterprise-grade security features.

## 🆕 Latest Updates

### **7 Major Feature Releases (Recent Commits)**
- **Backend Infrastructure Refactoring**: Enhanced payment processing with enterprise-grade scheduling
- **Payment Gateway Configuration System**: Multi-provider gateway support with encrypted credential storage
- **Customer Dashboard Enhancement**: Early payments, payment methods, and security management
- **Security & Payment Components**: GDPR compliance, MFA setup, and advanced payment method management
- **Enterprise UI Components**: Advanced tables, dialogs, and accessibility-focused components
- **Frontend Services & State Management**: Comprehensive API integration with optimized state management
- **Complete Dashboard Integration**: Real-time analytics, enhanced checkout, and dependency updates

## 🏗️ Architecture Overview

ScalaPay is a full-stack enterprise application designed for high scalability and reliability:

- **Microservices-Ready Architecture**: Modular NestJS backend with domain-driven design
- **Real-Time Processing**: WebSocket integration for live updates and notifications
- **Multi-Database Strategy**: MySQL for transactional data, Redis for caching, DynamoDB for analytics
- **Enterprise Integrations**: Production APIs for credit bureaus and fraud detection
- **Cloud-Native**: Containerized with Docker, ready for Kubernetes deployment

## 🌟 Core Business Features

### 💳 **Advanced Payment Processing**
- **Flexible Payment Plans**: 2x, 3x, or 4x installment options with dynamic scheduling
- **Multi-Gateway Support**: Comprehensive payment gateway configuration system
- **Stripe Integration**: Full payment processing with 3D Secure support and webhooks
- **Smart Retry Logic**: Automated payment retry with exponential backoff and circuit breakers
- **Early Payment Options**: Customer-friendly early payment with real-time discounts and analytics
- **Payment Method Management**: Secure storage and lifecycle management of customer payment methods
- **Multi-Currency Support**: Global payment processing with currency conversion
- **Payment Business Logic**: Gateway-agnostic processing with intelligent routing

### 🛡️ **Enterprise Risk Management & Security**
- **Real-Time Fraud Detection**: Production integration with MaxMind, Sift, and Kount APIs
- **Credit Assessment**: Live integration with Experian, Equifax, and Plaid credit bureaus
- **AI-Powered Risk Scoring**: Composite risk assessment from multiple fraud detection sources
- **Velocity Checking**: Advanced transaction pattern analysis and dynamic limits
- **Device Fingerprinting**: Multi-provider device analysis and threat detection
- **GDPR Compliance**: Comprehensive consent management and data protection controls
- **Multi-Factor Authentication**: Enterprise-grade MFA with setup wizard and recovery options
- **Security Dashboard**: Real-time security monitoring and threat analysis

### 👥 **Multi-Tenant Platform & User Management**
- **Role-Based Access Control**: Customer, Merchant, and Admin with granular permissions
- **Advanced User Profiles**: Comprehensive profile management with preferences and notifications
- **Merchant Settings Management**: Real-time configuration with payment, security, and store settings
- **Platform Settings**: Global configuration management with validation and audit trails
- **White-Label Ready**: Customizable branding, themes, and enterprise configuration
- **API-First Design**: Complete REST API with OpenAPI documentation and rate limiting

### 📊 **Real-Time Analytics & Advanced Dashboards**
- **Live Customer Dashboards**: Real-time payment management, early payment insights, and transaction history
- **Merchant Analytics Portal**: Revenue tracking, conversion metrics, order management, and settlement reporting
- **Admin Control Center**: Platform-wide analytics, user management, and system configuration
- **Early Payment Analytics**: Predictive insights, fee calculations, and payment acceleration trends
- **Payment Gateway Analytics**: Multi-provider performance monitoring and routing optimization
- **Security Analytics**: Fraud detection insights, risk scoring trends, and threat intelligence

### 🔧 **Enterprise Configuration & Management**
- **Payment Gateway Configuration**: Dynamic multi-provider setup with encrypted credential storage
- **Platform Settings Management**: Comprehensive system configuration with validation and versioning
- **Settings Audit Trail**: Complete history tracking with compliance reporting
- **Payment Scheduler**: Advanced scheduling with automated retry and notification systems
- **Configuration Validation**: Real-time validation with business rule enforcement

## 🛠️ Technology Stack

### **Backend (NestJS)**
```typescript
Framework         : NestJS 10.x with TypeScript
Databases         : MySQL 8.0, Redis 7, DynamoDB
Authentication    : JWT with Passport strategies
Real-time         : WebSocket with Socket.IO
Message Queue     : Bull Queue with Redis
API Documentation : Swagger/OpenAPI 3.0
Testing           : Jest (Unit/Integration/E2E)
```

### **Frontend (Next.js)**
```typescript
Framework       : Next.js 14 with App Router
UI Components   : Radix UI with shadcn/ui with custom components
State Management: Zustand + React Query for optimized data fetching
Styling         : Tailwind CSS + CSS-in-JS with custom design system
Animation       : Framer Motion for smooth interactions
Charts          : Recharts for analytics and reporting
Payment UI      : Stripe Elements with custom payment forms
Enterprise UI   : Advanced table, dialog, checkbox, and separator components
Route Security  : Route checking and access control utilities
```

### **Infrastructure**
```yaml
Containerization : Docker & Docker Compose
Databases        : MySQL, Redis, LocalStack (DynamoDB)
Monitoring       : Structured logging with Winston
Caching          : Redis with intelligent invalidation
Security         : Helmet, Rate limiting, Input validation
```

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** 20+ and npm 10+
- **Docker** and Docker Compose
- **Git** for version control

### 1. Installation & Setup
```bash
# Clone the repository
git clone <repository-url>
cd scalapay-demo

# Install dependencies for both backend and frontend
npm install

# Start infrastructure services
npm run docker:up

# Verify services are running
docker ps
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Configure required environment variables
# - Database connections
# - Stripe API keys
# - JWT secrets
# - External API keys (optional for development)
```

### 3. Database Setup & Seeding
```bash
# Run database migrations
npm run migration:run --workspace=backend

# Seed development data
npm run seed:all --workspace=backend

# Verify configuration
npm run verify:configs --workspace=backend
```

### 4. Development Server
```bash
# Start both backend and frontend
npm run dev

# Or start individually
npm run dev:backend    # http://localhost:3001
npm run dev:frontend   # http://localhost:3000
```

### 5. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api
- **WebSocket**: ws://localhost:3002

## 📁 Project Structure

```
scalapay-demo/
├── backend/                          # NestJS API Server
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/                 # Authentication & authorization
│   │   │   ├── users/                # User management with profiles
│   │   │   ├── merchants/            # Merchant onboarding & settings management
│   │   │   ├── payments/             # Comprehensive payment processing core
│   │   │   │   ├── entities/         # Payment gateway config, method entities
│   │   │   │   ├── services/         # Gateway config, business logic, retry services
│   │   │   │   ├── controllers/      # Payment gateway configuration APIs
│   │   │   │   └── payment-gateway-config.module.ts  # Dedicated gateway module
│   │   │   ├── transactions/         # Transaction lifecycle management
│   │   │   ├── integrations/         # Production API integrations
│   │   │   │   └── services/         # Real credit check & fraud detection APIs
│   │   │   ├── platform-settings/    # Platform configuration management
│   │   │   │   ├── dto/              # Settings validation and configuration DTOs
│   │   │   │   ├── entities/         # Settings history and audit entities
│   │   │   │   └── services/         # Settings validation and audit services
│   │   │   ├── compliance/           # GDPR and regulatory compliance
│   │   │   ├── queues/               # Background job processing
│   │   │   ├── websocket/            # Real-time communication
│   │   │   └── analytics/            # Business intelligence
│   │   ├── shared/                   # Shared types and utilities
│   │   │   └── payment-settings.types.ts  # Cross-module payment types
│   │   ├── common/                   # Shared utilities
│   │   │   ├── guards/               # Security guards
│   │   │   ├── interceptors/         # Request/response interceptors
│   │   │   └── pipes/                # Validation pipes
│   │   └── config/                   # Application configuration
│   └── test/                         # Comprehensive test suite
├── frontend/                         # Next.js Application
│   ├── src/
│   │   ├── app/                      # Next.js 14 App Router
│   │   │   ├── (dashboard)/          # Dashboard layouts
│   │   │   │   ├── admin/            # Admin control panel with settings
│   │   │   │   ├── merchant/         # Merchant portal with analytics
│   │   │   │   └── customer/         # Customer portal with new features
│   │   │   │       ├── early-payments/    # Early payment management
│   │   │   │       ├── payment-methods/   # Payment method management
│   │   │   │       └── security/          # Security settings dashboard
│   │   │   └── (shop)/               # E-commerce interface
│   │   ├── components/
│   │   │   ├── ui/                   # UI component library
│   │   │   │   ├── checkbox.tsx      # Accessible checkbox component
│   │   │   │   ├── table.tsx         # Advanced table with sorting/filtering
│   │   │   │   ├── separator.tsx     # Visual separator component
│   │   │   │   └── payment-config-panel-enterprise.tsx  # Enterprise config panel
│   │   │   ├── payments/             # Comprehensive payment component library
│   │   │   │   ├── add-payment-method-modal.tsx    # Payment method addition
│   │   │   │   ├── early-payment-calculator.tsx    # Real-time calculation
│   │   │   │   ├── early-payment-history.tsx       # Payment history tracking
│   │   │   │   ├── early-payment-insights.tsx      # Analytics dashboard
│   │   │   │   ├── payment-method-*.tsx             # Payment method management
│   │   │   │   └── payment-method-storage.tsx       # Secure storage component
│   │   │   ├── security/             # Security management components
│   │   │   │   ├── gdpr-consent-management.tsx     # GDPR compliance
│   │   │   │   └── mfa-setup-wizard.tsx             # Multi-factor auth setup
│   │   │   ├── checkout/             # Payment processing UI
│   │   │   ├── admin/                # Admin-specific components
│   │   │   └── layout/               # Layout components
│   │   ├── services/                 # API client services
│   │   │   ├── early-payment-service.ts          # Early payment API integration
│   │   │   ├── payment-gateway-config-service.ts # Gateway configuration API
│   │   │   ├── payment-method-service.ts         # Payment method management API
│   │   │   ├── security-service.ts               # Security and compliance API
│   │   │   ├── payment-config-service.ts         # Payment config service
│   │   │   └── platform-settings-service.ts      # Platform settings API
│   │   ├── store/                    # State management
│   │   │   ├── early-payment-store.ts    # Early payment state management
│   │   │   ├── payment-method-store.ts   # Payment method state
│   │   │   ├── security-store.ts         # Security settings state
│   │   │   └── wishlist-store.ts         # Wishlist with payment features
│   │   └── lib/                      # Utilities and helpers
│   │       └── route-check.ts        # Navigation security
├── docker-compose.yml                # Infrastructure definition
└── package.json                      # Monorepo configuration
```

## 🧪 Testing Strategy

### Comprehensive Test Coverage
```bash
# Run all tests
npm test

# Backend testing
npm run test --workspace=backend          # Unit tests
npm run test:integration --workspace=backend  # Integration tests
npm run test:e2e --workspace=backend      # End-to-end tests
npm run test:performance --workspace=backend  # Load testing

# Frontend testing
npm run test --workspace=frontend        # Component tests
npm run test:coverage --workspace=frontend    # Coverage report

# Generate coverage reports
npm run test:cov
```

### Test Types
- **Unit Tests**: Individual service and component testing
- **Integration Tests**: API endpoint and database testing
- **E2E Tests**: Complete user workflow testing
- **Performance Tests**: Load testing for payment processing
- **Security Tests**: Authentication and authorization testing

## 🔐 Security & Compliance

### Financial Data Security
- **PCI DSS Compliance**: Through Stripe tokenization
- **Data Encryption**: At rest and in transit
- **No Raw Payment Data**: Tokenized storage only
- **Audit Logging**: Comprehensive financial transaction logs
- **Access Controls**: Role-based permissions and API rate limiting

### Enterprise Security Features
- **JWT Authentication**: Secure token-based authentication
- **Multi-Factor Authentication**: Optional 2FA support
- **Rate Limiting**: API protection against abuse
- **Input Validation**: Comprehensive data sanitization
- **CORS Configuration**: Secure cross-origin requests
- **Helmet Integration**: Security headers and protection

## 🌍 External Integrations

### Payment Processing
- **Stripe**: Complete payment infrastructure
- **Webhooks**: Real-time payment event processing
- **3D Secure**: Enhanced payment security
- **Multi-Currency**: Global payment support

### Risk Assessment APIs
```typescript
// Credit Bureau Integration
Experian API     : Real-time credit scores and reports
Equifax API      : Credit history and risk assessment
Plaid API        : Bank account verification and income

// Fraud Detection
MaxMind          : IP reputation and geolocation
Sift             : Machine learning fraud detection
Kount            : Device fingerprinting and analysis
```

### Communication Services
- **Email Notifications**: Transactional email via SMTP
- **SMS Integration**: Payment reminders and alerts
- **WebSocket**: Real-time dashboard updates
- **Webhook Delivery**: Merchant notification system

## 📊 Demo Accounts & Usage

### Pre-configured Demo Accounts
```bash
# Customer Account
Email: customer@demo.com
Password: password123
Role: Customer with $5,000 credit limit

# Merchant Account  
Email: merchant@demo.com
Password: password123
Role: Verified merchant with payment processing

# Admin Account
Email: admin@demo.com
Password: password123
Role: Platform administrator with full access
```

### Demo Workflows

#### **Customer Journey**
1. **Shopping**: Browse products and add to cart with modern UI
2. **Checkout**: Select BNPL payment option (2x, 3x, or 4x) with real-time calculations
3. **Payment Setup**: Secure payment method management with encrypted storage
4. **Approval**: Real-time credit bureau and fraud detection API checks
5. **Completion**: Automatic installment scheduling with SMS/email notifications
6. **Management**: Access payment methods dashboard, early payment calculator, and security settings
7. **Early Payments**: Calculate and process early payments with discount insights
8. **Security**: Manage GDPR consent, enable MFA, and control payment preferences

#### **Merchant Experience**
1. **Dashboard**: Real-time transaction monitoring with advanced analytics
2. **Analytics**: Revenue tracking, conversion metrics, and order management
3. **Settings**: Comprehensive payment configuration with gateway management
4. **Gateway Config**: Multi-provider payment gateway setup with encrypted credentials
5. **Reports**: Advanced settlement, compliance, and performance reporting
6. **Transaction Management**: Real-time transaction lifecycle monitoring

#### **Admin Controls**
1. **User Management**: Advanced account approval and profile management
2. **Platform Settings**: Global configuration with validation and audit trails
3. **Payment Configuration**: Enterprise payment settings with real-time validation
4. **Gateway Management**: Multi-provider payment gateway configuration and monitoring
5. **Analytics**: System-wide performance monitoring with security insights
6. **Risk Management**: Advanced fraud rules, credit policies, and threat analysis
7. **Compliance**: GDPR management, audit trails, and regulatory reporting

## 🚀 Deployment Guide

### Development Environment
```bash
# Start development environment
npm run setup
npm run dev

# Environment verification
npm run verify:configs --workspace=backend
```

### Production Deployment

#### Docker Deployment
```bash
# Build production images
npm run build
docker-compose -f docker-compose.prod.yml up -d

# Database migration
npm run migration:run --workspace=backend

# Health check
curl http://localhost:3001/health
```

#### Environment Variables
```bash
# Required production environment variables
NODE_ENV=production
JWT_SECRET=<secure-random-string>
MYSQL_PASSWORD=<secure-database-password>
STRIPE_SECRET_KEY=<production-stripe-key>
STRIPE_WEBHOOK_SECRET=<webhook-secret>

# External API keys (for production features)
EXPERIAN_API_KEY=<production-key>
MAXMIND_API_KEY=<production-key>
# ... (see .env.example for complete list)
```

### Monitoring & Observability
- **Health Checks**: Built-in health monitoring endpoints
- **Structured Logging**: JSON-formatted logs for aggregation
- **Performance Metrics**: Request timing and throughput
- **Error Tracking**: Comprehensive error reporting
- **Database Monitoring**: Query performance and connection health

## 📈 Performance & Scalability

### Optimization Features
- **Database Indexing**: Optimized queries for high-volume transactions
- **Redis Caching**: Intelligent caching for frequently accessed data
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Efficient TypeORM queries with relations
- **Background Processing**: Async job processing for heavy operations

### Scalability Considerations
- **Horizontal Scaling**: Stateless application design
- **Load Balancing**: Ready for multiple application instances
- **Database Sharding**: Preparation for data partitioning
- **CDN Integration**: Static asset optimization
- **Microservices Ready**: Modular architecture for service extraction

## 🤝 API Documentation

### Complete REST API Endpoints (165+ endpoints)

#### **Authentication & Security** (`/auth`, `/mfa`)
- **Authentication**: `/auth/login`, `/auth/register`, `/auth/logout`, `/auth/refresh`, `/auth/me`
- **Multi-Factor Auth**: `/mfa/setup`, `/mfa/verify`, `/mfa/backup-codes`, `/mfa/trusted-devices`
- **MFA Management**: `/mfa/totp/*`, `/mfa/sms/*`, `/mfa/email/*`, `/mfa/analytics`

#### **User Management** (`/users`)
- **Profile**: `/users/profile`, `/users/profile/update`, `/users/profile/extended`
- **Preferences**: `/users/notification-preferences`, `/users/security-preferences`
- **Admin**: `/users/pending-approvals`, `/users/{id}/approve`, `/users/{id}/reject`

#### **Merchant Management** (`/merchants`)
- **Profile**: `/merchants/profile`, `/merchants/analytics`, `/merchants/api-key/regenerate`
- **Settings**: `/merchants/payment-settings`, `/merchants/notification-settings`
- **Configuration**: `/merchants/security-settings`, `/merchants/store-settings`

#### **Payment Processing** (`/payments`, `/payment-methods`)
- **Payment Flow**: `/payments/intent`, `/payments/{id}/confirm`, `/payments/{id}/retry`
- **Payment Methods**: `/payment-methods/setup-intent`, `/payment-methods/store`
- **Management**: `/payment-methods/{id}/default`, `/payment-methods/bulk`
- **Analytics**: `/payment-methods/analytics/summary`, `/payment-methods/usage-stats`

#### **Early Payments** (`/early-payments`)
- **Calculation**: `/early-payments/options/{transactionId}`, `/early-payments/savings/{transactionId}`
- **Processing**: `/early-payments/process/full`, `/early-payments/process/partial`
- **Configuration**: `/early-payments/config`, `/early-payments/config/{merchantId}`
- **Analytics**: `/early-payments/analytics/statistics`, `/early-payments/insights`

#### **Transaction Management** (`/transactions`)
- **CRUD**: `/transactions`, `/transactions/{id}`, `/transactions/my`, `/transactions/merchant`
- **Lifecycle**: `/transactions/{id}/retry-payment`, `/transactions/{id}/approve`
- **Payments**: `/transactions/{id}/payments`, `/transactions/{id}/cancel`

#### **Platform Administration** (`/admin`)
- **User Admin**: `/admin/merchants/{id}/approve`, `/admin/pending-merchants`
- **Platform Settings**: `/admin/platform-settings`, `/admin/platform-settings/{key}`
- **Gateway Config**: `/admin/payment-gateway-config`, `/admin/payment-gateway-config/validate`
- **Audit**: `/admin/platform-settings/audit/report`, `/admin/platform-settings/{key}/history`

#### **GDPR Compliance** (`/gdpr`)
- **Consent**: `/gdpr/consent`, `/gdpr/consent/withdraw`, `/gdpr/consent-history`
- **Data Rights**: `/gdpr/data-request`, `/gdpr/data-export`, `/gdpr/privacy-settings`
- **Admin**: `/gdpr/admin/statistics`, `/gdpr/admin/compliance/search`

#### **Integration & Webhooks** (`/webhooks`, `/stripe-config`)
- **Webhooks**: `/webhooks/stripe`, `/webhooks/payment-reminders`
- **Stripe Config**: `/stripe-config/public-key`, `/stripe-config/webhook-test`

### WebSocket Events
- **Real-time Updates**: Payment status changes, transaction events
- **Dashboard Updates**: Live analytics and monitoring data
- **Notifications**: Instant alerts and messaging

### API Documentation
- **Swagger UI**: http://localhost:3001/api
- **OpenAPI Spec**: Comprehensive API documentation
- **Postman Collection**: Available for API testing
- **Rate Limiting**: 100 requests/minute per user

## 🔧 Development Tools

### Code Quality
```bash
# Linting and formatting
npm run lint                    # ESLint check
npm run fix                     # Auto-fix linting issues
npm run format                  # Prettier formatting

# Type checking
npm run typecheck              # TypeScript compilation check
```

### Database Management
```bash
# Migration management
npm run migration:generate --workspace=backend
npm run migration:run --workspace=backend
npm run migration:revert --workspace=backend

# Data seeding
npm run seed:demo --workspace=backend      # Demo data
npm run seed:configs --workspace=backend   # System configuration
```

### Debugging & Development
- **Hot Reload**: Automatic restart on code changes
- **Source Maps**: Full debugging support
- **TypeScript**: Complete type safety
- **ESLint + Prettier**: Code quality enforcement
- **Husky**: Pre-commit hooks for quality assurance

## 📄 Documentation & Support

### Interactive API Documentation
- **Swagger UI**: http://localhost:3001/api - Complete interactive API documentation
- **OpenAPI Spec**: Full REST API specification with request/response examples
- **Postman Collection**: Available for comprehensive API testing
- **Rate Limiting**: 100 requests/minute per user with enterprise scaling

### Development Resources
- **Setup Guide**: Complete installation and configuration instructions above
- **Environment Configuration**: `.env.example` with all required variables
- **Database Migrations**: Automated schema management with TypeORM
- **Seed Data**: Demo users, merchants, and transactions for development
- **Testing Suite**: Unit, integration, and E2E tests with coverage reports

### Production Deployment
- **Docker Support**: Complete containerization with docker-compose
- **Health Checks**: Built-in monitoring endpoints for all services
- **Security**: PCI DSS compliance, encryption, and enterprise security features
- **Monitoring**: Structured logging, metrics, and error tracking
- **Scalability**: Horizontal scaling ready with stateless architecture

### Support Channels
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Community Q&A and development discussions
- **Documentation**: Comprehensive README with setup and API documentation
- **Code Examples**: Complete demo workflows and implementation patterns

### License & Contributing
- **License**: MIT License - see [LICENSE](LICENSE) file for details
- **Contributing**: 
  1. Fork the repository
  2. Create feature branch (`git checkout -b feature/payment-enhancement`)
  3. Commit changes (`git commit -m 'Add payment feature'`)
  4. Push to branch (`git push origin feature/payment-enhancement`)
  5. Open Pull Request with detailed description

---

## 🏆 Enterprise BNPL Platform

**ScalaPay** delivers production-ready **Buy Now, Pay Later** capabilities with enterprise-grade security, real-time fraud detection, multi-provider payment gateway support, and comprehensive compliance features.

*Built for financial institutions, e-commerce platforms, and fintech companies requiring robust, scalable, and secure payment processing solutions.*