import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  public constructor(
    private readonly reflector: Reflector,
  ) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    if (this.reflector.get<boolean>('isPublic', context.getHandler())) {
      return true;
    }

    return super.canActivate(context);
  }
}

