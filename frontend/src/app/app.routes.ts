import { Routes } from '@angular/router';
import { authGuard, adminGuard, profileCompleteGuard } from './core/guards';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent) },
  {
    path: 'complete-profile',
    canActivate: [authGuard],
    loadComponent: () => import('./features/auth/complete-profile.component').then(m => m.CompleteProfileComponent)
  },
  {
    path: '',
    canActivate: [authGuard, profileCompleteGuard],
    loadComponent: () => import('./layout/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'requests' },
      { path: 'requests', loadComponent: () => import('./features/requests/my-submissions.component').then(m => m.MySubmissionsComponent) },
      { path: 'requests/new', loadComponent: () => import('./features/requests/request-form.component').then(m => m.RequestFormComponent) },
      { path: 'requests/:id', loadComponent: () => import('./features/requests/request-details.component').then(m => m.RequestDetailsComponent) },
      { path: 'requests/:id/edit', loadComponent: () => import('./features/requests/request-form.component').then(m => m.RequestFormComponent) },
      { path: 'admin', canActivate: [adminGuard], children: [
        { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
        { path: 'dashboard', loadComponent: () => import('./features/admin/dashboard.component').then(m => m.DashboardComponent) },
        { path: 'submissions', loadComponent: () => import('./features/admin/admin-submissions.component').then(m => m.AdminSubmissionsComponent) },
        { path: 'users', loadComponent: () => import('./features/admin/users.component').then(m => m.UsersComponent) },
        { path: 'users/:id/edit', loadComponent: () => import('./features/admin/user-form.component').then(m => m.UserFormComponent) }
      ]}
    ]
  },
  { path: '**', redirectTo: '' }
];
