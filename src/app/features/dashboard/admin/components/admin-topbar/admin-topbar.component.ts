import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';

import { AdminSidebarUiService } from '../../services/admin-sidebar-ui.service';

@Component({
  selector: 'app-admin-topbar',
  templateUrl: './admin-topbar.component.html',
  styleUrls: ['./admin-topbar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTopbarComponent {
  readonly sidebarUi = inject(AdminSidebarUiService);

  @Input() section = 'Admin';
  @Input() page = '';
  @Input() showSearch = false;
}

