import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '../shared/shared.module';
import { ProfilePageComponent } from './profile/profile-page.component';
import { UserRoutingModule } from './user-routing.module';

@NgModule({
  declarations: [ProfilePageComponent],
  imports: [SharedModule, FormsModule, ReactiveFormsModule, UserRoutingModule],
})
export class UserModule {}
