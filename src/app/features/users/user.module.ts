import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '../../shared/shared.module';
import { ProfilePageComponent } from './components/profile/profile-page.component';

@NgModule({
  declarations: [ProfilePageComponent],
  imports: [SharedModule, FormsModule, ReactiveFormsModule],
})
export class UserModule {}
