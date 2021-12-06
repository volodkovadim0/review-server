import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt/jwt.strategy';
import { ReviewController } from './controllers/review.controller';
import { AuthController } from './controllers/auth.controller';
import { ratingCollection } from './mongoose-models/rating.model';
import { reviewCollection } from './mongoose-models/review.model';
import { userCollection } from './mongoose-models/user.model';
import { GoogleStrategy } from './jwt/google.strategy';
import { YandexStrategy } from './jwt/yandex.strategy';
import { likeCollection } from "./mongoose-models/like.model";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [
        process.env.NODE_ENV !== 'production' && '.env.local',
        '.env',
      ].filter(Boolean),
    }),
    MongooseModule.forRoot(process.env.DATABASE_URL),
    MongooseModule.forFeature([
      reviewCollection,
      ratingCollection,
      userCollection,
      likeCollection,
    ]),
    JwtModule.register({
      secretOrKeyProvider: () => process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [
    ReviewController,
    AuthController,
  ],
  providers: [JwtStrategy, GoogleStrategy, YandexStrategy],
})
export class AppModule {
}
