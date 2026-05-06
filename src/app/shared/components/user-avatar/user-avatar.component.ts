import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-user-avatar',
  templateUrl: './user-avatar.component.html',
  styleUrls: ['./user-avatar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserAvatarComponent {
  @Input() photoURL: string | null = null;
  @Input() displayName = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  imgError = false;

  getInitials(): string {
    const parts = this.displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0]?.[0] ?? '?').toUpperCase();
  }

  onImgError(): void {
    this.imgError = true;
  }
}
