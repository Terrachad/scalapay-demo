const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function createDemoUser() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'scalapay_user',
    password: 'scalapay_pass',
    database: 'scalapay_db'
  });

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Delete existing user if exists
    await connection.execute('DELETE FROM users WHERE email = ?', ['customer@demo.com']);
    
    // Create new user with UUID
    const userId = require('crypto').randomUUID();
    await connection.execute(
      'INSERT INTO users (id, name, email, password, role, creditLimit, availableCredit, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [userId, 'Demo Customer', 'customer@demo.com', hashedPassword, 'customer', 5000, 5000, true]
    );
    
    console.log('✅ Demo user created successfully!');
    console.log('Email: customer@demo.com');
    console.log('Password: password123');
    
  } catch (error) {
    console.error('❌ Error creating demo user:', error.message);
  } finally {
    await connection.end();
  }
}

createDemoUser();