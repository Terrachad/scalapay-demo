const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function createRealSeeder() {
  try {
    // Connect to database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'scalapay_user',
      password: 'scalapay_pass',
      database: 'scalapay_demodb',
    });

    console.log('🔌 Connected to database');

    // Generate real bcrypt hash for 'password123'
    console.log('🔐 Generating password hash...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    console.log('✅ Password hash generated');

    const demoUsers = [
      {
        email: 'customer@demo.com',
        password: hashedPassword,
        name: 'Demo Customer',
        role: 'customer',
        creditLimit: 5000,
        availableCredit: 5000,
        isActive: true,
        phone: '+1234567890',
        address: '123 Customer St, Demo City, DC 12345',
        emergencyContact: 'emergency@demo.com',
        notificationPreferences: {
          email: true,
          sms: false,
          push: true,
          paymentReminders: true,
          transactionUpdates: true,
          promotional: false,
        },
        securityPreferences: {
          twoFactorEnabled: false,
          sessionTimeout: 30,
          loginNotifications: true,
          deviceVerification: false,
        },
      },
      {
        email: 'merchant@demo.com',
        password: hashedPassword,
        name: 'Demo Merchant',
        role: 'merchant',
        creditLimit: 10000,
        availableCredit: 10000,
        isActive: true,
        businessName: 'Demo Business Inc',
        businessAddress: '456 Business Ave, Commerce City, CC 67890',
        businessPhone: '+1987654321',
        businessDocuments: {
          businessLicense: 'BL-2024-001',
          taxId: 'TX-123456789',
          bankAccount: 'BA-987654321',
        },
        riskScore: 2.5,
        approvedAt: new Date(),
        approvedBy: 'system',
        approvalNotes: 'Demo merchant account - auto-approved',
      },
      {
        email: 'admin@demo.com',
        password: hashedPassword,
        name: 'Demo Admin',
        role: 'admin',
        creditLimit: 25000,
        availableCredit: 25000,
        isActive: true,
        phone: '+1555000000',
        address: '789 Admin Plaza, Control City, CC 11111',
        emergencyContact: 'admin-emergency@demo.com',
        notificationPreferences: {
          email: true,
          sms: true,
          push: true,
          paymentReminders: true,
          transactionUpdates: true,
          promotional: true,
        },
        securityPreferences: {
          twoFactorEnabled: true,
          sessionTimeout: 15,
          loginNotifications: true,
          deviceVerification: true,
        },
      },
    ];

    console.log('🔄 Creating demo users with real data...');

    for (const user of demoUsers) {
      try {
        // Check if user exists
        const [existing] = await connection.execute('SELECT id FROM users WHERE email = ?', [
          user.email,
        ]);

        if (existing.length > 0) {
          // Update existing user with full data
          await connection.execute(
            `
            UPDATE users SET 
              password = ?, 
              name = ?, 
              role = ?, 
              creditLimit = ?, 
              availableCredit = ?, 
              isActive = ?,
              phone = ?,
              address = ?,
              emergencyContact = ?,
              businessName = ?,
              businessAddress = ?,
              businessPhone = ?,
              businessDocuments = ?,
              riskScore = ?,
              approvedAt = ?,
              approvedBy = ?,
              approvalNotes = ?,
              notificationPreferences = ?,
              securityPreferences = ?,
              updatedAt = NOW() 
            WHERE email = ?
          `,
            [
              user.password,
              user.name,
              user.role,
              user.creditLimit,
              user.availableCredit,
              user.isActive,
              user.phone || null,
              user.address || null,
              user.emergencyContact || null,
              user.businessName || null,
              user.businessAddress || null,
              user.businessPhone || null,
              user.businessDocuments ? JSON.stringify(user.businessDocuments) : null,
              user.riskScore || null,
              user.approvedAt || null,
              user.approvedBy || null,
              user.approvalNotes || null,
              user.notificationPreferences ? JSON.stringify(user.notificationPreferences) : null,
              user.securityPreferences ? JSON.stringify(user.securityPreferences) : null,
              user.email,
            ],
          );
          console.log(`🔄 Updated user: ${user.email} (${user.role})`);
        } else {
          // Create new user with UUID and full data
          const userId = uuidv4();
          await connection.execute(
            `
            INSERT INTO users (
              id, email, password, name, role, isActive, creditLimit, availableCredit,
              phone, address, emergencyContact, businessName, businessAddress, businessPhone,
              businessDocuments, riskScore, approvedAt, approvedBy, approvalNotes,
              notificationPreferences, securityPreferences, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          `,
            [
              userId,
              user.email,
              user.password,
              user.name,
              user.role,
              user.isActive,
              user.creditLimit,
              user.availableCredit,
              user.phone || null,
              user.address || null,
              user.emergencyContact || null,
              user.businessName || null,
              user.businessAddress || null,
              user.businessPhone || null,
              user.businessDocuments ? JSON.stringify(user.businessDocuments) : null,
              user.riskScore || null,
              user.approvedAt || null,
              user.approvedBy || null,
              user.approvalNotes || null,
              user.notificationPreferences ? JSON.stringify(user.notificationPreferences) : null,
              user.securityPreferences ? JSON.stringify(user.securityPreferences) : null,
            ],
          );
          console.log(`✅ Created user: ${user.email} (${user.role})`);
        }
      } catch (error) {
        console.error(`❌ Failed to create/update user ${user.email}:`, error.message);
        console.error('Full error:', error);
      }
    }

    // Verify users were created properly
    console.log('🔍 Verifying users...');
    const [users] = await connection.execute(
      'SELECT id, email, name, role, isActive FROM users WHERE email IN (?, ?, ?)',
      ['customer@demo.com', 'merchant@demo.com', 'admin@demo.com'],
    );

    console.log('📋 Created users:');
    users.forEach((user) => {
      console.log(`   ${user.email} (${user.role}) - Active: ${user.isActive}`);
    });

    console.log('🎉 Real seeder completed successfully!');
    console.log('📋 Demo accounts (all use password: password123):');
    console.log('   Customer: customer@demo.com');
    console.log('   Merchant: merchant@demo.com');
    console.log('   Admin: admin@demo.com');
    console.log('');
    console.log('🧪 Test bcrypt hash verification:');
    const testVerification = await bcrypt.compare('password123', hashedPassword);
    console.log(`   Hash verification test: ${testVerification ? '✅ PASS' : '❌ FAIL'}`);

    await connection.end();
  } catch (error) {
    console.error('❌ Seeder failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

createRealSeeder();
