import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Checks the signal to see if a user is logged in
  if (authService.currentUser()) {
    return true;
  } else {
    router.navigate(['/login']);
    return false;
  }
};
