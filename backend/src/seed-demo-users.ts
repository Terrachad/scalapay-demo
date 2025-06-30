import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './modules/users/users.service';
import { UserRole } from './modules/users/entities/user.entity';
import * as bcrypt from 'bcrypt';

async function seedDemoUsers() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const demoUsers = [
    {
      email: 'customer@demo.com',
      password: 'password123',
      name: 'Demo Customer',
      role: UserRole.CUSTOMER,
      creditLimit: 5000,
      availableCredit: 5000,
    },
    {
      email: 'merchant@demo.com',
      password: 'password123',
      name: 'Demo Merchant',
      role: UserRole.MERCHANT,
      creditLimit: 10000,
      availableCredit: 10000,
    },
    {
      email: 'admin@demo.com',
      password: 'password123',
      name: 'Demo Admin',
      role: UserRole.ADMIN,
      creditLimit: 25000,
      availableCredit: 25000,
    },
  ];

  console.log('🔄 Seeding demo users...');

  for (const userData of demoUsers) {
    try {
      // Check if user already exists
      const existingUser = await usersService.findByEmail(userData.email);
      if (existingUser) {
        console.log(`⚠️  User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Hash password and create user
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      await usersService.create({
        ...userData,
        password: hashedPassword,
      });

      console.log(`✅ Created demo user: ${userData.email} (${userData.role})`);
    } catch (error) {
      console.error(`❌ Failed to create user ${userData.email}:`, error instanceof Error ? error.message : String(error));
    }
  }

  console.log('🎉 Demo user seeding completed!');
  await app.close();
}

seedDemoUsers().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});