import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { AuthToastComponent } from './components/auth-toast/auth-toast.component';
import { HeroIconComponent } from './components/hero-icon/hero-icon.component';
import { UserAvatarComponent } from './components/user-avatar/user-avatar.component';

@NgModule({
  declarations: [UserAvatarComponent, AuthToastComponent, HeroIconComponent],
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  exports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    UserAvatarComponent,
    AuthToastComponent,
    HeroIconComponent,
  ],
})
export class SharedModule {}
