import { Injectable, Injector } from '@angular/core';
import {
  HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse
} from '@angular/common/http';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/throw';
import { Logout, PaymentFailure, StopGettingUnreadMailsCount } from '../actions';
import { AppState } from '../datatypes';

import { UsersService } from './users.service';


@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  private authService: UsersService;

  constructor(private injector: Injector,
              private store: Store<AppState>) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    this.authService = this.injector.get(UsersService);
    const token: string = this.authService.getToken();
    const is_necessary_token = this.authService.getNecessaryTokenUrl(request.url);
    if (is_necessary_token) {
      request = request.clone({
        setHeaders: {
          'Authorization': `JWT ${token}`
        }
      });
    }
    return next.handle(request)
      .catch((error: any) => {
        if (error instanceof HttpErrorResponse) {
          if (error.status === 401) {
            this.store.dispatch(new Logout({ session_expired: true }));
          } else if (error.status === 423) {
            this.store.dispatch(new StopGettingUnreadMailsCount());
            this.store.dispatch(new PaymentFailure());
          }
        }
        if (error.error.error) {
          error.error = error.error.error.error;
        } else if (error.error.detail) {
          error.error = error.error.detail;
        }
        return Observable.throw(error);
      });
  }
}
