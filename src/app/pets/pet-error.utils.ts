import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import { TranslationKey } from '../i18n/translations';

export function petErrorKey(error: unknown): TranslationKey {
  if (error instanceof TimeoutError) return 'petConnectionError';
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'petConnectionError';
    if (error.status === 400) return 'petInvalidRequest';
    if (error.status === 401 || error.status === 403) return 'petSessionError';
    if (error.status === 404) return 'petNotFoundText';
    if (error.status === 409) return 'activePetExists';
  }
  return 'petServerError';
}
