import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '../shared/shared.module';
import { FieldMicroAnimDirective } from './directives/field-micro-anim.directive';
import { AuthRoutingModule } from './auth-routing.module';
import { AuthShellComponent } from './auth-shell/auth-shell.component';
import { LoginPageComponent } from './login/login-page.component';
import { RegisterPageComponent } from './register/register-page.component';
import { AuthToastComponent } from './shared/auth-toast.component';

@NgModule({
  declarations: [
    AuthShellComponent,
    FieldMicroAnimDirective,
    LoginPageComponent,
    RegisterPageComponent,
    AuthToastComponent,
  ],
  imports: [SharedModule, ReactiveFormsModule, AuthRoutingModule],
})
export class AuthModule {}
