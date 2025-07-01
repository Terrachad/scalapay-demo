import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from './modules/users/entities/user.entity';
import { Merchant } from './modules/merchants/entities/merchant.entity';

async function seedDemoUsers() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
  const merchantRepository = app.get<Repository<Merchant>>(getRepositoryToken(Merchant));

  const demoUsers = [
    {
      email: 'customer@demo.com',
      password: '$2b$10$8qWX9YqsZ3KZQn6XeQq8Z.YnJ.8KQZ6X.8qWX9YqsZ3KZQn6XeQq8Z', // password123
      name: 'Demo Customer',
      role: UserRole.CUSTOMER,
      creditLimit: 5000,
      availableCredit: 5000,
    },
    {
      email: 'merchant@demo.com',
      password: '$2b$10$8qWX9YqsZ3KZQn6XeQq8Z.YnJ.8KQZ6X.8qWX9YqsZ3KZQn6XeQq8Z', // password123
      name: 'Demo Merchant',
      role: UserRole.MERCHANT,
      creditLimit: 10000,
      availableCredit: 10000,
    },
    {
      email: 'admin@demo.com',
      password: '$2b$10$8qWX9YqsZ3KZQn6XeQq8Z.YnJ.8KQZ6X.8qWX9YqsZ3KZQn6XeQq8Z', // password123
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
      const existingUser = await userRepository.findOne({ where: { email: userData.email } });
      if (existingUser) {
        console.log(`⚠️  User ${userData.email} already exists, updating...`);
        // Update existing user
        await userRepository.update({ email: userData.email }, userData);
        console.log(`🔄 Updated demo user: ${userData.email} (${userData.role})`);
        continue;
      }

      // Create new user
      const user = userRepository.create(userData);
      await userRepository.save(user);

      console.log(`✅ Created demo user: ${userData.email} (${userData.role})`);
    } catch (error) {
      console.error(
        `❌ Failed to create/update user ${userData.email}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  // Create demo merchant
  console.log('🔄 Seeding demo merchant...');
  const demoMerchant = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Demo Electronics Store',
    email: 'store@demo.com',
    businessName: 'Demo Electronics Store',
    feePercentage: 2.5,
    isActive: true,
  };

  try {
    const existingMerchant = await merchantRepository.findOne({ where: { id: demoMerchant.id } });
    if (existingMerchant) {
      console.log(`⚠️  Merchant ${demoMerchant.name} already exists, updating...`);
      await merchantRepository.update({ id: demoMerchant.id }, demoMerchant);
      console.log(`🔄 Updated demo merchant: ${demoMerchant.name}`);
    } else {
      const merchant = merchantRepository.create(demoMerchant);
      await merchantRepository.save(merchant);
      console.log(`✅ Created demo merchant: ${demoMerchant.name}`);
    }
  } catch (error) {
    console.error(
      `❌ Failed to create/update merchant ${demoMerchant.name}:`,
      error instanceof Error ? error.message : String(error),
    );
  }

  console.log('🎉 Demo user seeding completed!');
  console.log('📋 Demo accounts:');
  console.log('   Customer: customer@demo.com / password123');
  console.log('   Merchant: merchant@demo.com / password123');
  console.log('   Admin: admin@demo.com / password123');
  console.log('   Store: Demo Electronics Store (ID: 123e4567-e89b-12d3-a456-426614174000)');

  await app.close();
}

seedDemoUsers().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
