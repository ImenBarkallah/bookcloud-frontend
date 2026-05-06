import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Names map to Heroicons v2 outline 24×24 (MIT). */
export type HeroIconName =
  | 'squares-2x2'
  | 'tag'
  | 'book-open'
  | 'pencil-square'
  | 'user'
  | 'users'
  | 'cube'
  | 'bookmark'
  | 'heart'
  | 'credit-card'
  | 'magnifying-glass'
  | 'plus'
  | 'table-cells'
  | 'arrow-path'
  | 'trash'
  | 'eye'
  | 'x-mark'
  | 'check'
  | 'lock-closed'
  | 'lock-open'
  | 'view-columns'
  | 'chevron-left'
  | 'chevron-right'
  | 'bars-3';

@Component({
  selector: 'app-hero-icon',
  templateUrl: './hero-icon.component.html',
  styleUrls: ['./hero-icon.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroIconComponent {
  @Input() name!: HeroIconName;
  /** Visual scale; parents can still size via CSS on :host. */
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
}
