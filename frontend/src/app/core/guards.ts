import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? true : inject(Router).createUrlTree(['/login']);
};

export const roleGuard = (...roles: string[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() && roles.some(r => auth.hasRole(r))
    ? true
    : inject(Router).createUrlTree(['/requests']);
};

export const adminGuard: CanActivateFn = roleGuard('Admin');

/** A self-registered account starts with no FullName/Department — blocks the rest of the app until
 * the user fills those in via /complete-profile. */
export const profileCompleteGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.profileIncomplete() ? inject(Router).createUrlTree(['/complete-profile']) : true;
};
