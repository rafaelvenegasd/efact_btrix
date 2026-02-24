import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

/**
 * AuthService
 *
 * Implementación simplificada para tenant único.
 * Las credenciales se configuran via variables de entorno.
 * Para producción real, implementar con usuarios en DB y bcrypt.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    // Para tenant único, verificar contra variables de entorno o un usuario hardcoded
    // TODO: Reemplazar con validación real contra base de datos
    const isValid = await this.validateCredentials(dto.email, dto.password);

    if (!isValid) {
      this.logger.warn(`Intento de login fallido para: ${dto.email}`);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: JwtPayload = {
      sub: 'admin',
      email: dto.email,
    };

    const expirationStr = this.configService.get<string>(
      'jwt.expiration',
      '86400s',
    );
    const expiresIn = this.parseExpirationToSeconds(expirationStr);

    const accessToken = await this.jwtService.signAsync(payload);

    this.logger.log(`Login exitoso para: ${dto.email}`);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
    };
  }

  verifyToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  private async validateCredentials(
    email: string,
    password: string,
  ): Promise<boolean> {
    // TEMP: Para la versión inicial, usar variables de entorno
    // En producción: implementar con hash bcrypt y tabla de usuarios
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@empresa.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'change-me-in-production';

    return email === adminEmail && password === adminPassword;
  }

  private parseExpirationToSeconds(expiration: string): number {
    const match = expiration.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return 86400;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * (multipliers[unit] || 1);
  }
}
