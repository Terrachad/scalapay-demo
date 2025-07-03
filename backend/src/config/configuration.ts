export default () => ({
  NODE_ENV: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  database: {
    mysql: {
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      username: process.env.MYSQL_USERNAME || 'scalapay_user',
      password: process.env.MYSQL_PASSWORD || 'scalapay_pass',
      database: process.env.MYSQL_DATABASE || 'scalapay_demodb',
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
    dynamodb: {
      endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:4566',
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
    },
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_51Rf1hcP1x4I62TtzPrlCtiRHmO9hIZVy6e2mKjeQ1W612fII0HFu042gN2JT9GWkUw2iEsZ8MiqeTWk2EyjK9NtV000Tz4wWsM',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_51Rf1hcP1x4I62TtzlUl6ho2uxn0eeeCVBNshhFd6tDOxie4AnKFBU0LTyt7Svgx0K85hCmCyLio5iuwHMpBcMZsW005iKFzqeW',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_971f8d8db7eb8378330c0aa262d97f7baaecec70c9517929211ac3b252d305db',
  },
  integrations: {
    experian: {
      apiKey: process.env.EXPERIAN_API_KEY,
      endpoint: process.env.EXPERIAN_ENDPOINT,
    },
    equifax: {
      apiKey: process.env.EQUIFAX_API_KEY,
      endpoint: process.env.EQUIFAX_ENDPOINT,
    },
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  websocket: {
    port: parseInt(process.env.WS_PORT || '3002', 10),
  },
});
