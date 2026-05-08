import { Injectable, signal } from '@angular/core';

import { User } from './user.model';

const TEMP_USER: User = {
  id: 'temp-user',
  displayName: 'Nova Player',
  login: 'tempUser',
  role: 'player'
};

@Injectable({
  providedIn: 'root'
})
export class UserService {
  readonly currentUser = signal<User>(TEMP_USER);
}
