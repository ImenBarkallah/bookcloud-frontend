import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '../../shared/shared.module';
import { FieldMicroAnimDirective } from '../../shared/directives/field-micro-anim.directive';
import { AuthShellComponent } from './auth-shell/auth-shell.component';
import { LoginPageComponent } from './login/login-page.component';
import { RegisterPageComponent } from './register/register-page.component';
@NgModule({
  declarations: [
    AuthShellComponent,
    FieldMicroAnimDirective,
    LoginPageComponent,
    RegisterPageComponent,
  ],
  imports: [SharedModule, ReactiveFormsModule],
})
export class AuthModule {}
