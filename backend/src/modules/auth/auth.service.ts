import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { LoginDto, RegisterDto, AuthResponseDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    console.log(`🔍 Validating user: ${email}, found: ${!!user}`);
    
    if (user) {
      console.log(`🔐 Password hash starts with: ${user.password.substring(0, 20)}`);
      try {
        const isValid = await bcrypt.compare(password, user.password);
        console.log(`🧪 Password validation result: ${isValid}`);
        if (isValid) {
          return user;
        }
      } catch (error) {
        console.error(`❌ Bcrypt error for ${email}:`, error instanceof Error ? error.message : String(error));
      }
    }
    return null;
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        creditLimit: user.creditLimit,
        availableCredit: user.availableCredit,
      },
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        creditLimit: user.creditLimit,
        availableCredit: user.availableCredit,
      },
    };
  }
}
