import { Body, Controller, Get, Param, Post, Redirect, Req, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserModel } from '../mongoose-models/user.model';
import { IUser } from '../models/user.model';
import { IJwtUser } from '../models/jwt-user.model';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { GoogleGuard } from '../jwt/google.guard';
import { RedirectResponse } from '@nestjs/core/router/router-response-controller';
import { YandexGuard } from '../jwt/yandex.guard';

interface IUserDto {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly password: string;
}

interface ILoginDto {
  readonly email: string;
  readonly password: string;
}

interface ILoginResult {
  readonly token: string;
  readonly success: boolean;
  readonly user: IUser;
}

interface ExternalAuthUser {
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    @InjectModel(UserModel.name) private readonly user: Model<UserModel>,
    private readonly jwtService: JwtService,
  ) {
  }

  @Post('register')
  async register(
    @Body() newUser: IUserDto,
  ) {
    await this.user.create({
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      passwordHash: await bcrypt.hash(newUser.password, 10),
    });
  }

  @Post('login')
  async login(
    @Body() login: ILoginDto,
  ): Promise<ILoginResult> {
    const user = await this.user.findOne({ email: login.email }).exec();

    if (user) {
      const passwordMatch = await bcrypt.compare(login.password, user.passwordHash);

      if (passwordMatch) {
        return this.getJwtLoginResult(user);
      }
    }

    return {
      success: false,
      token: null,
      user: null,
    };
  }

  private getJwtLoginResult(user: IUser): ILoginResult {
    const jwtUser: IJwtUser = { _id: user._id };

    return {
      token: this.jwtService.sign(jwtUser),
      success: true,
      user,
    };
  }

  @Get('one/:id')
  async getUserById(
    @Param('id') id: string,
  ) {
    return this.user.findById(id);
  }

  @Get('google')
  @UseGuards(GoogleGuard)
  async googleAuth(@Req() req) {
  }

  @Redirect()
  @Get('google/redirect')
  @UseGuards(GoogleGuard)
  async googleAuthRedirect(
    @Req() request: any,
  ): Promise<RedirectResponse> {
    const googleUser: ExternalAuthUser = request.user;

    return this.loginByEmail(googleUser);
  }

  @Get('yandex')
  @UseGuards(YandexGuard)
  async yandexAuth(@Req() req) {
  }

  @Redirect()
  @Get('yandex/redirect')
  @UseGuards(YandexGuard)
  async yandexAuthRedirect(
    @Req() request: any,
  ): Promise<RedirectResponse> {
    const googleUser: ExternalAuthUser = request.user;

    return this.loginByEmail(googleUser);
  }
  
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(
    @Req() req,
  ) {
    const user: IJwtUser = req.user;
    return this.user.findById(user._id);
  }

  private async loginByEmail(auth: ExternalAuthUser): Promise<RedirectResponse> {
    const user = await this.user.findOne({ email: auth.email });

    if (!user) {
      return {
        url: `${process.env.ERROR_CALLBACK_CLIENT}?email=${auth.email}&firstName=${auth.firstName}&lastName=${auth.lastName}`,
      };
    }

    const result = this.getJwtLoginResult(user);

    return {
      url: `${process.env.CALLBACK_CLIENT}?token=${result.token}`,
    };
  }
}
