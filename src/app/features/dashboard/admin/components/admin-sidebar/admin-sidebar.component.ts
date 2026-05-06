import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AdminSidebarUiService } from '../../services/admin-sidebar-ui.service';

@Component({
  selector: 'app-admin-sidebar',
  templateUrl: './admin-sidebar.component.html',
  styleUrls: ['./admin-sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSidebarComponent {
  readonly ui = inject(AdminSidebarUiService);

  onBackdropClick(): void {
    this.ui.closeMobile();
  }

  onAsideNavClick(ev: MouseEvent): void {
    const el = ev.target as HTMLElement | null;
    if (!el?.closest?.('a')) {
      return;
    }
    if (this.ui.mobileOpen()) {
      this.ui.closeMobile();
    }
  }

  toggleCollapse(ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.ui.toggleCollapsed();
  }
}
