import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './modules/users/users.service';
import { UserRole, User } from './modules/users/entities/user.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

async function seedDemoUsers() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const usersRepository = app.get<Repository<User>>(getRepositoryToken(User));

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
        // Test if existing password works with bcrypt
        try {
          const passwordWorks = await bcrypt.compare(userData.password, existingUser.password);
          if (passwordWorks) {
            console.log(`✅ User ${userData.email} already exists with working password, skipping...`);
            continue;
          } else {
            console.log(`🔧 User ${userData.email} exists but password doesn't work, updating hash...`);
            // Update with fresh hash
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            await usersRepository.update(existingUser.id, { password: hashedPassword });
            console.log(`✅ Updated password hash for ${userData.email}`);
            continue;
          }
        } catch (error) {
          console.log(`🔧 User ${userData.email} exists but bcrypt test failed, updating hash...`);
          // Update with fresh hash if bcrypt test fails
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          await usersRepository.update(existingUser.id, { password: hashedPassword });
          console.log(`✅ Updated password hash for ${userData.email}`);
          continue;
        }
      }

      // Hash password and create user
      console.log(`🔐 Hashing password for ${userData.email}...`);
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      console.log(`🔐 Password hash created: ${hashedPassword.substring(0, 20)}...`);
      
      await usersService.create({
        ...userData,
        password: hashedPassword,
      });

      console.log(`✅ Created demo user: ${userData.email} (${userData.role})`);
    } catch (error) {
      console.error(`❌ Failed to create user ${userData.email}:`, error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.message.includes('bcrypt')) {
        console.log('💡 Bcrypt error detected. Try running: npm rebuild bcrypt');
      }
    }
  }

  console.log('🎉 Demo user seeding completed!');
  await app.close();
}

seedDemoUsers().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});