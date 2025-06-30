const mysql = require('mysql2/promise');

async function checkUsers() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'scalapay_user',
    password: 'scalapay_pass',
    database: 'scalapay_db'
  });

  try {
    const [rows] = await connection.execute('SELECT email, name, role, password FROM users');
    console.log('Users in database:');
    rows.forEach(user => {
      console.log(`- ${user.email} (${user.name}) - Role: ${user.role}`);
      console.log(`  Password hash: ${user.password.substring(0, 20)}...`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkUsers();