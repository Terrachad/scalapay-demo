// Enterprise Demo Users Seeder for Authentication Testing
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function createEnterpriseDemoUsers() {
  try {
    // Connect to database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'scalapay_user',
      password: 'scalapay_pass',
      database: 'scalapay_demodb',
    });

    console.log('🔌 Connected to database for enterprise user seeding');

    // Generate proper bcrypt hashes for different passwords for testing
    const passwords = {
      'password123': await bcrypt.hash('password123', 12),
      'admin123': await bcrypt.hash('admin123', 12),
      'merchant123': await bcrypt.hash('merchant123', 12),
      'customer123': await bcrypt.hash('customer123', 12),
      'StrongPass123!': await bcrypt.hash('StrongPass123!', 12),
    };

    console.log('🔐 Generated secure password hashes');

    // Enterprise demo users with varied profiles for testing
    const enterpriseUsers = [
      {
        id: uuidv4(),
        email: 'admin@scalapay.com',
        password: passwords['admin123'],
        name: 'System Administrator',
        role: 'admin',
        creditLimit: 50000,
        availableCredit: 50000,
        isActive: true,
      },
      {
        id: uuidv4(),
        email: 'customer@demo.com',
        password: passwords['password123'],
        name: 'Demo Customer',
        role: 'customer',
        creditLimit: 5000,
        availableCredit: 5000,
        isActive: true,
      },
      {
        id: uuidv4(),
        email: 'merchant@demo.com',
        password: passwords['password123'],
        name: 'Demo Merchant',
        role: 'merchant',
        creditLimit: 15000,
        availableCredit: 15000,
        isActive: true,
      },
      {
        id: uuidv4(),
        email: 'premium.customer@scalapay.com',
        password: passwords['customer123'],
        name: 'Premium Customer',
        role: 'customer',
        creditLimit: 10000,
        availableCredit: 9500,
        isActive: true,
      },
      {
        id: uuidv4(),
        email: 'enterprise.merchant@scalapay.com',
        password: passwords['merchant123'],
        name: 'Enterprise Merchant Ltd.',
        role: 'merchant',
        creditLimit: 25000,
        availableCredit: 22500,
        isActive: true,
      },
      {
        id: uuidv4(),
        email: 'test.admin@scalapay.com',
        password: passwords['StrongPass123!'],
        name: 'Test Administrator',
        role: 'admin',
        creditLimit: 100000,
        availableCredit: 100000,
        isActive: true,
      },
      {
        id: uuidv4(),
        email: 'deactivated.user@demo.com',
        password: passwords['password123'],
        name: 'Deactivated User',
        role: 'customer',
        creditLimit: 1000,
        availableCredit: 1000,
        isActive: false, // For testing deactivated account scenarios
      },
      {
        id: uuidv4(),
        email: 'high.risk.customer@demo.com',
        password: passwords['customer123'],
        name: 'High Risk Customer',
        role: 'customer',
        creditLimit: 500,
        availableCredit: 100,
        isActive: true,
      },
    ];

    console.log('🔄 Creating enterprise demo users...');

    // Clear existing demo users first
    const demoEmails = enterpriseUsers.map(user => user.email);
    if (demoEmails.length > 0) {
      const placeholders = demoEmails.map(() => '?').join(',');
      await connection.execute(
        `DELETE FROM users WHERE email IN (${placeholders})`,
        demoEmails
      );
      console.log('🧹 Cleared existing demo users');
    }

    // Create all enterprise users
    for (const user of enterpriseUsers) {
      try {
        await connection.execute(
          `INSERT INTO users (
            id, email, password, name, role, isActive, 
            creditLimit, availableCredit, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            user.id,
            user.email,
            user.password,
            user.name,
            user.role,
            user.isActive,
            user.creditLimit,
            user.availableCredit,
          ]
        );

        console.log(`✅ Created ${user.role}: ${user.email} (${user.name})`);
        
        // Add additional info for special accounts
        if (user.role === 'admin') {
          console.log(`   👑 Admin privileges - Full system access`);
        } else if (user.role === 'merchant') {
          console.log(`   🏪 Merchant account - Business operations`);
        } else if (!user.isActive) {
          console.log(`   ⚠️  Account deactivated - For testing auth failures`);
        }

      } catch (error) {
        console.error(`❌ Failed to create user ${user.email}:`, error.message);
      }
    }

    // Verify all users were created
    const [users] = await connection.execute(
      'SELECT id, email, name, role, isActive, creditLimit, availableCredit FROM users WHERE email IN (?)', 
      [demoEmails]
    );

    console.log('\n🎉 Enterprise demo users created successfully!');
    console.log('\n📋 Authentication Test Accounts:');
    console.log('='.repeat(60));
    
    users.forEach(user => {
      const status = user.isActive ? '🟢 ACTIVE' : '🔴 INACTIVE';
      const roleIcon = user.role === 'admin' ? '👑' : user.role === 'merchant' ? '🏪' : '👤';
      
      console.log(`${roleIcon} ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role.toUpperCase()}`);
      console.log(`   Status: ${status}`);
      console.log(`   Credit: $${user.availableCredit}/$${user.creditLimit}`);
      console.log('');
    });

    console.log('🔑 Authentication Credentials:');
    console.log('   admin@scalapay.com / admin123');
    console.log('   customer@demo.com / password123');
    console.log('   merchant@demo.com / password123');
    console.log('   premium.customer@scalapay.com / customer123');
    console.log('   enterprise.merchant@scalapay.com / merchant123');
    console.log('   test.admin@scalapay.com / StrongPass123!');
    console.log('   deactivated.user@demo.com / password123 (should fail)');
    console.log('   high.risk.customer@demo.com / customer123');

    console.log('\n🧪 Testing Commands:');
    console.log('curl -X POST http://host.docker.internal:3001/auth/login \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{"email":"customer@demo.com","password":"password123"}\'');
    console.log('');
    console.log('curl -X POST http://host.docker.internal:3001/auth/login \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{"email":"admin@scalapay.com","password":"admin123"}\'');

    await connection.end();
    console.log('\n✨ Database connection closed. Ready for authentication testing!');

  } catch (error) {
    console.error('❌ Enterprise user seeding failed:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 Hint: Make sure MySQL is running and credentials are correct');
    }
    process.exit(1);
  }
}

// Run the seeder
console.log('🚀 Starting Enterprise Demo Users Seeder...');
createEnterpriseDemoUsers();