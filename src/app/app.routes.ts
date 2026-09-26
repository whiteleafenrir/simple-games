import { Routes } from '@angular/router';

import { HomeComponent } from './home/home.component';
import { ProfileComponent } from './profile/profile.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'animations', loadComponent: () => import('./pet-animations/pet-animations.component').then(m => m.PetAnimationsComponent) },
  { path: 'profile', component: ProfileComponent },
  { path: 'profile/pets/:petId', loadComponent: () => import('./pet-profile/pet-profile.component').then(m => m.PetProfileComponent) },
  { path: 'games/pocket-pet', loadComponent: () => import('./pocket-pet/pocket-pet.component').then(m => m.PocketPetComponent) },
  { path: 'games/pocket-pet/:petId', loadComponent: () => import('./pocket-pet/pocket-pet.component').then(m => m.PocketPetComponent) },
  { path: 'games/tic-tac-toe', loadComponent: () => import('./tic-tac-toe/tic-tac-toe.component').then(m => m.TicTacToeComponent) },
  { path: '**', redirectTo: '' }
];
