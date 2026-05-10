import { Routes } from '@angular/router';

import { HomeComponent } from './home/home.component';
import { PetProfileComponent } from './pet-profile/pet-profile.component';
import { PocketPetComponent } from './pocket-pet/pocket-pet.component';
import { ProfileComponent } from './profile/profile.component';
import { TicTacToeComponent } from './tic-tac-toe/tic-tac-toe.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'profile/pets/:petId', component: PetProfileComponent },
  { path: 'games/pocket-pet', component: PocketPetComponent },
  { path: 'games/pocket-pet/:petId', component: PocketPetComponent },
  { path: 'games/tic-tac-toe', component: TicTacToeComponent },
  { path: '**', redirectTo: '' }
];
