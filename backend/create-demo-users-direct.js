const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function createDemoUsers() {
  try {
    // Connect to database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'scalapay_user',
      password: 'scalapay_pass',
      database: 'scalapay_demodb',
    });

    console.log('🔌 Connected to database');

    // Pre-hashed password for 'password123'
    const hashedPassword = '$2b$10$8qWX9YqsZ3KZQn6XeQq8Z.YnJ.8KQZ6X.8qWX9YqsZ3KZQn6XeQq8Z';

    const demoUsers = [
      {
        email: 'customer@demo.com',
        password: hashedPassword,
        name: 'Demo Customer',
        role: 'customer',
        creditLimit: 5000,
        availableCredit: 5000,
      },
      {
        email: 'merchant@demo.com',
        password: hashedPassword,
        name: 'Demo Merchant',
        role: 'merchant',
        creditLimit: 10000,
        availableCredit: 10000,
      },
      {
        email: 'admin@demo.com',
        password: hashedPassword,
        name: 'Demo Admin',
        role: 'admin',
        creditLimit: 25000,
        availableCredit: 25000,
      },
    ];

    console.log('🔄 Creating demo users...');

    for (const user of demoUsers) {
      try {
        // Check if user exists
        const [existing] = await connection.execute('SELECT id FROM users WHERE email = ?', [
          user.email,
        ]);

        if (existing.length > 0) {
          // Update existing user
          await connection.execute(
            'UPDATE users SET password = ?, name = ?, role = ?, creditLimit = ?, availableCredit = ?, updatedAt = NOW() WHERE email = ?',
            [
              user.password,
              user.name,
              user.role,
              user.creditLimit,
              user.availableCredit,
              user.email,
            ],
          );
          console.log(`🔄 Updated user: ${user.email} (${user.role})`);
        } else {
          // Create new user - need to generate UUID for id
          const userId = uuidv4();
          await connection.execute(
            'INSERT INTO users (id, email, password, name, role, isActive, creditLimit, availableCredit, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
            [
              userId,
              user.email,
              user.password,
              user.name,
              user.role,
              1,
              user.creditLimit,
              user.availableCredit,
            ],
          );
          console.log(`✅ Created user: ${user.email} (${user.role})`);
        }
      } catch (error) {
        console.error(`❌ Failed to create/update user ${user.email}:`, error.message);
      }
    }

    console.log('🎉 Demo user creation completed!');
    console.log('📋 Demo accounts:');
    console.log('   Customer: customer@demo.com / password123');
    console.log('   Merchant: merchant@demo.com / password123');
    console.log('   Admin: admin@demo.com / password123');

    await connection.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

createDemoUsers();
