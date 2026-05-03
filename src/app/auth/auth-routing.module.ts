import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthShellComponent } from './auth-shell/auth-shell.component';
import { LoginPageComponent } from './login/login-page.component';
import { RegisterPageComponent } from './register/register-page.component';

const routes: Routes = [
  {
    path: '',
    component: AuthShellComponent,
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      { path: 'login', component: LoginPageComponent },
      { path: 'register', component: RegisterPageComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AuthRoutingModule {}
