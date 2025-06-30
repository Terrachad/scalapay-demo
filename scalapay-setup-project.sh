#!/bin/bash

# Ultimate Scalapay Demo - Project Structure Setup
# This script creates the complete project structure

echo "🚀 Setting up Ultimate Scalapay Demo..."

# Create root directory
mkdir -p scalapay-demo
cd scalapay-demo

# Initialize git
git init

# Create .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output/

# Production
build/
dist/
.next/
out/

# Misc
.DS_Store
*.pem
.env*.local
.env

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/
*.swp
*.swo

# Docker
docker/data/
EOF

# Create root package.json for monorepo
cat > package.json << 'EOF'
{
  "name": "scalapay-demo",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "backend",
    "frontend"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "npm run dev --workspace=backend",
    "dev:frontend": "npm run dev --workspace=frontend",
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "test:e2e": "npm run test:e2e --workspace=backend",
    "lint": "npm run lint --workspaces",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "setup": "npm install && npm run docker:up"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.57.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-prettier": "^5.1.3",
    "prettier": "^3.2.5",
    "husky": "^9.0.11",
    "lint-staged": "^15.2.2"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
EOF

# Create Docker Compose configuration
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: scalapay-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: scalapay_root_pass
      MYSQL_DATABASE: scalapay_db
      MYSQL_USER: scalapay_user
      MYSQL_PASSWORD: scalapay_pass
    ports:
      - "3306:3306"
    volumes:
      - ./docker/data/mysql:/var/lib/mysql
    networks:
      - scalapay-network

  redis:
    image: redis:7-alpine
    container_name: scalapay-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - ./docker/data/redis:/data
    networks:
      - scalapay-network

  localstack:
    image: localstack/localstack:latest
    container_name: scalapay-localstack
    environment:
      - SERVICES=dynamodb
      - DEBUG=1
      - DATA_DIR=/tmp/localstack/data
    ports:
      - "4566:4566"
    volumes:
      - ./docker/data/localstack:/tmp/localstack
    networks:
      - scalapay-network

networks:
  scalapay-network:
    driver: bridge
EOF

# Create environment files
cat > .env.example << 'EOF'
# Application
NODE_ENV=development
PORT=3001

# Database
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=scalapay_db
MYSQL_USERNAME=scalapay_user
MYSQL_PASSWORD=scalapay_pass

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# DynamoDB (LocalStack)
DYNAMODB_ENDPOINT=http://localhost:4566
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Frontend URL
FRONTEND_URL=http://localhost:3000

# WebSocket
WS_PORT=3002
EOF

cp .env.example .env

# Create README
cat > README.md << 'EOF'
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
EOF

# Create TypeScript configurations
cat > tsconfig.base.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": true,
    "incremental": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
EOF

# Create Prettier configuration
cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "endOfLine": "lf"
}
EOF

# Create ESLint configuration
cat > .eslintrc.js << 'EOF'
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist', 'node_modules'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
EOF

# Create GitHub Actions workflow
mkdir -p .github/workflows
cat > .github/workflows/ci.yml << 'EOF'
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: scalapay_test
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
        ports:
          - 3306:3306

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd="redis-cli ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
        ports:
          - 6379:6379

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run tests
      run: npm test
      env:
        NODE_ENV: test
        MYSQL_HOST: localhost
        REDIS_HOST: localhost
    
    - name: Build
      run: npm run build
EOF

echo "✅ Project structure created successfully!"
echo ""
echo "Next steps:"
echo "1. Run: bash setup-backend.sh"
echo "2. Run: bash setup-frontend.sh"
echo "3. Run: npm install"
echo "4. Run: npm run docker:up"
echo "5. Run: npm run dev"