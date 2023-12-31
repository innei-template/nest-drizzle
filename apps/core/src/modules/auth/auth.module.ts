import { SECURITY } from '@core/app.config'
import { Global, Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'

import { AuthService } from './auth.service'
import { JwtStrategy } from './jwt.strategy'

export const __secret: any = SECURITY.jwtSecret || 'asjhczxiucipoiopiqm2376'

const jwtModule = JwtModule.registerAsync({
  useFactory() {
    return {
      secret: __secret,
      signOptions: {
        expiresIn: SECURITY.jwtExpire,
        algorithm: 'HS256',
      },
    }
  },
})
@Module({
  imports: [PassportModule, jwtModule],
  providers: [AuthService, JwtStrategy],
  exports: [JwtStrategy, AuthService, jwtModule],
})
@Global()
export class AuthModule {}
