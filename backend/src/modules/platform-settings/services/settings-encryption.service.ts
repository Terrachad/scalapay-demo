import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class SettingsEncryptionService {
  private readonly logger = new Logger(SettingsEncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyDerivationIterations = 100000;

  constructor(private readonly configService: ConfigService) {}

  async encrypt(plaintext: any): Promise<string> {
    try {
      const data = JSON.stringify(plaintext);
      const key = await this.getEncryptionKey();
      const iv = crypto.randomBytes(16);
      const salt = crypto.randomBytes(32);

      const derivedKey = crypto.pbkdf2Sync(key, salt, this.keyDerivationIterations, 32, 'sha256');
      const cipher = crypto.createCipher('aes-256-cbc', derivedKey);

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Combine salt, iv, and encrypted data
      const combined = Buffer.concat([salt, iv, Buffer.from(encrypted, 'hex')]);

      return combined.toString('base64');
    } catch (error) {
      this.logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  async decrypt(ciphertext: string): Promise<any> {
    try {
      const combined = Buffer.from(ciphertext, 'base64');
      const salt = combined.slice(0, 32);
      const iv = combined.slice(32, 48);
      const encrypted = combined.slice(48);

      const key = await this.getEncryptionKey();
      const derivedKey = crypto.pbkdf2Sync(key, salt, this.keyDerivationIterations, 32, 'sha256');

      const decipher = crypto.createDecipher('aes-256-cbc', derivedKey);

      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      this.logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt sensitive data');
    }
  }

  private async getEncryptionKey(): Promise<string> {
    const key =
      this.configService.get<string>('SETTINGS_ENCRYPTION_KEY') ||
      'default-encryption-key-for-development-only';
    if (!key || key === 'default-encryption-key-for-development-only') {
      this.logger.warn('Using default encryption key - not suitable for production');
    }
    return key;
  }

  async rotateEncryptionKey(newKey: string): Promise<void> {
    this.logger.warn('Key rotation initiated - this is a critical operation');
    // Implementation for key rotation would go here
    // This would involve re-encrypting all encrypted settings
  }
}
