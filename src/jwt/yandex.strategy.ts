import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-yandex';

import { Injectable } from '@nestjs/common';
import { Profile } from 'passport';

@Injectable()
export class YandexStrategy extends PassportStrategy(Strategy, 'yandex') {

  constructor() {
    super({
      clientID: process.env.YANDEX_CLIENT_ID,
      clientSecret: process.env.YANDEX_CLIENT_SECRET,
      callbackURL: `${process.env.CALLBACK_HOST}/auth/yandex/redirect`,
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile): Promise<any> {
    const { emails, name } = profile;

    console.log(name);

    return {
      email: emails[0].value,
      firstName: name.familyName,
      lastName: name.givenName,
    };
  }
}