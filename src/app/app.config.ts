import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideCharts(withDefaultRegisterables()),
    provideNativeDateAdapter(),
    provideAnimations(),
    provideToastr({
      positionClass: 'toast-top-right',
      progressBar: true,
      extendedTimeOut: 5000,
      timeOut: 5000,
      preventDuplicates: true,
    }),
  ],
};
