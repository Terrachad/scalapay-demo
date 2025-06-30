# 🚀 Ultimate Scalapay Demo

A production-grade Buy Now Pay Later (BNPL) platform showcasing modern full-stack development with NestJS, Next.js, and TypeScript.

## 🌟 Key Features

- 🔐 **Multi-role Authentication**: Customer, Merchant, and Admin roles
- 💳 **Smart Payment Splitting**: Flexible 2x, 3x, 4x payment plans
- 📊 **Real-time Analytics**: Live dashboard with WebSocket updates
- 🎨 **Beautiful UI**: Modern design with shadcn/ui and micro-animations
- 📱 **Fully Responsive**: Mobile-first design approach
- 🛡️ **Enterprise Security**: JWT auth, rate limiting, input validation
- ⚡ **Optimized Performance**: Redis caching, database indexing
- 🧪 **Comprehensive Testing**: Unit, integration, and E2E tests

## 🛠️ Tech Stack

### Backend
- **Framework**: NestJS with TypeScript
- **Databases**: MySQL (relational), DynamoDB (NoSQL), Redis (cache)
- **Authentication**: JWT with role-based access control
- **Real-time**: WebSocket with Socket.io
- **Testing**: Jest for unit/integration, Supertest for E2E

### Frontend
- **Framework**: Next.js 14 with TypeScript
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Testing**: Jest, React Testing Library

## 🚀 Quick Start

1. **Clone and Install**
   ```bash
   git clone <repository>
   cd scalapay-demo
   npm install
   ```

2. **Start Services**
   ```bash
   npm run docker:up
   ```

3. **Run Development**
   ```bash
   npm run dev
   ```

4. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - API Documentation: http://localhost:3001/api

## 📁 Project Structure

```
scalapay-demo/
├── backend/                 # NestJS backend application
│   ├── src/
│   │   ├── modules/        # Feature modules
│   │   ├── common/         # Shared resources
│   │   └── main.ts         # Application entry
├── frontend/               # Next.js frontend application
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # React components
│   │   └── lib/           # Utilities and hooks
├── docker-compose.yml      # Docker services
└── package.json           # Monorepo configuration
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:cov
```

## 📊 Demo Accounts

- **Customer**: customer@demo.com / password123
- **Merchant**: merchant@demo.com / password123
- **Admin**: admin@demo.com / password123

## 🎯 Key Demonstrations

1. **Customer Flow**: Browse → Add to Cart → Checkout → Select Payment Plan → Complete Purchase
2. **Merchant Dashboard**: View Transactions → Analytics → Settlement Reports
3. **Admin Panel**: User Management → System Analytics → Configuration

## 🏗️ Architecture Highlights

- **Microservices Ready**: Modular design for easy service extraction
- **Event-Driven**: Using NestJS CQRS pattern
- **Scalable**: Horizontal scaling support with Redis sessions
- **Secure**: OWASP compliance, rate limiting, input validation

## 📝 License

MIT License - Created for Scalapay Interview Demo
