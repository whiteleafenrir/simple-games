import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withXhr()),
    provideRouter(routes, withComponentInputBinding())
  ]
})
  .catch((error) => console.error(error));
