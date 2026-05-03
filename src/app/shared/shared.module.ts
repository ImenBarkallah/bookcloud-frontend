import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { UserAvatarComponent } from '../components/user-avatar/user-avatar.component';

@NgModule({
  declarations: [UserAvatarComponent],
  imports: [CommonModule, RouterModule, TranslateModule],
  exports: [CommonModule, RouterModule, TranslateModule, UserAvatarComponent],
})
export class SharedModule {}
