import { Routes } from '@angular/router';

import { HomeComponent } from './home/home.component';
import { TicTacToeComponent } from './tic-tac-toe/tic-tac-toe.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'games/tic-tac-toe', component: TicTacToeComponent },
  { path: '**', redirectTo: '' }
];
