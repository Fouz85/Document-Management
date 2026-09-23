import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

// A 401 from these calls means "invalid credentials"/"invalid refresh token" itself, not
// "access token expired" — attempting a silent refresh in response would either be meaningless
// (login/register) or loop back into the same failure (refresh).
const NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const authedReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authedReq).pipe(
    catchError(err => {
      const skipRefresh = NO_REFRESH_PATHS.some(p => req.url.includes(p));
      if (err.status !== 401 || skipRefresh) {
        if (err.status === 401) auth.logout();
        return throwError(() => err);
      }

      // Access token expired mid-session — try one silent refresh, then replay the original
      // request with the new token. If the refresh itself fails, fall back to a full logout.
      return from(auth.refresh()).pipe(
        switchMap(() => {
          const newToken = auth.token();
          const retried = newToken
            ? req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })
            : req;
          return next(retried);
        }),
        catchError(refreshErr => {
          auth.logout();
          return throwError(() => refreshErr);
        })
      );
    })
  );
};
