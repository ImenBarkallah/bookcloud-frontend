import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-admin-page-head',
  templateUrl: './admin-page-head.component.html',
  styleUrls: ['./admin-page-head.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPageHeadComponent {
  @Input() badge = 'ADMIN';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() liveLabel = 'Live';
}

