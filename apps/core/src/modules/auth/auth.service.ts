import { compareSync } from 'bcrypt'
import dayjs from 'dayjs'
import { isDate } from 'lodash'
import { nanoid } from 'nanoid'

import { BizException } from '@core/common/exceptions/biz.exception'
import { ErrorCodeEnum } from '@core/constants/error-code.constant'
import { DatabaseService } from '@core/processors/database/database.service'
import { sleep } from '@core/shared/utils/tool.utils'
import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

import { JwtPayload } from './interfaces/jwt-payload.interface'

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  get jwtServicePublic() {
    return this.jwtService
  }

  private async getUserAuthCode(id: string) {
    const result = await this.db.drizzle.query.user.findFirst({
      where: (user, { eq }) => eq(user.id, id),
      columns: {
        authCode: true,
      },
    })

    if (!result) {
      throw new BizException(ErrorCodeEnum.AuthFailUserNotExist)
    }

    return result.authCode
  }

  async validateUsernameAndPassword(username: string, password: string) {
    const user = await this.db.drizzle.query.user.findFirst({
      where: (user, { eq }) => eq(user.username, username),
    })

    if (!user || !compareSync(password, user.password)) {
      await sleep(3000)
      throw new BizException(ErrorCodeEnum.AuthFail)
    }

    return user
  }

  async signToken(id: string) {
    const authCode = await this.getUserAuthCode(id)
    const payload: JwtPayload = {
      id,
      authCode,
    }

    return this.jwtService.sign(payload)
  }
  async verifyPayload(payload: JwtPayload): Promise<boolean> {
    const authCode = await this.getUserAuthCode(payload.id)
    return authCode === payload.authCode
  }

  async generateAuthCode() {
    return nanoid(10)
  }

  isCustomToken(token: string) {
    return token.startsWith('txo') && token.length - 3 === 40
  }

  async verifyCustomToken(token: string) {
    const apiTokenRecord = await this.db.drizzle.query.apiToken.findFirst({
      where: (apiToken, { eq }) => eq(apiToken.token, token),
    })
    if (!apiTokenRecord) {
      return false
    }

    if (typeof apiTokenRecord.expired === 'undefined') {
      return true
    } else if (isDate(apiTokenRecord.expired)) {
      const isExpired = dayjs(new Date()).isAfter(apiTokenRecord.expired)
      return isExpired ? false : true
    }
  }
}
