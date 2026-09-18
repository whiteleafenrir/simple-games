import { Pipe, PipeTransform } from '@angular/core';

import { Language } from '../i18n/translations';

@Pipe({ name: 'petDate' })
export class PetDatePipe implements PipeTransform {
  transform(value: string, language: Language): string {
    return new Intl.DateTimeFormat(language, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }
}
