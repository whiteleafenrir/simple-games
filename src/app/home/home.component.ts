import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { I18nService } from '../i18n/i18n.service';

@Component({
  selector: 'app-home',
  imports: [
    RouterLink
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  constructor(public readonly i18n: I18nService) {}
}
