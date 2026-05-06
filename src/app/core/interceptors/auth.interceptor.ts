import { Injectable } from '@angular/core';
import {HttpHandler,HttpInterceptor,HttpRequest,} from '@angular/common/http';
import {from, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private auth: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler) {

    const isApi = req.url.startsWith(environment.apiBaseUrl);

    if (!isApi) {
      return next.handle(req);
    }

    return from(this.auth.getIdToken()).pipe(
      switchMap(token => {

        if (!token) {
          return next.handle(req);
        }

        const authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });

        return next.handle(authReq);
      })
    );
  }
}