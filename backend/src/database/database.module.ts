import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../modules/users/entities/user.entity';
import { PlatformSetting } from '../modules/platform-settings/entities/platform-setting.entity';
import { InitialDataSeeder } from './seeders/initial-data.seeder';

@Module({
  imports: [TypeOrmModule.forFeature([User, PlatformSetting])],
  providers: [InitialDataSeeder],
  exports: [InitialDataSeeder],
})
export class DatabaseModule {}
