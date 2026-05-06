import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';

import { AuthToastService } from '../../../../core/services/auth-toast.service';
import {
  AdminLibrarySettingsApiService,
  LibrarySettingsDto,
} from '../services/admin-library-settings-api.service';

@Component({
  selector: 'app-admin-library-settings-page',
  templateUrl: './admin-library-settings-page.component.html',
  styleUrls: ['./admin-library-settings-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLibrarySettingsPageComponent implements OnInit {
  private readonly api = inject(AdminLibrarySettingsApiService);
  private readonly toast = inject(AuthToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = true;
  error = false;
  pendingSave = false;

  settings: LibrarySettingsDto | null = null;

  formDefaultLoanDays: number | null = 14;
  formMaxActiveLoans: number | null = 5;
  formReservationExpiryDays: number | null = 3;
  formFinePerDay: number | null = 0.5;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = false;
    this.cdr.markForCheck();
    this.api.get().subscribe({
      next: (s) => {
        this.settings = s;
        this.formDefaultLoanDays = (s.defaultLoanDays ?? 14) as number;
        this.formMaxActiveLoans = (s.maxActiveLoansDefault ?? 5) as number;
        this.formReservationExpiryDays = (s.reservationExpiryDays ?? 3) as number;
        this.formFinePerDay = (s.finePerDay ?? 0.5) as number;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.error = true;
        this.settings = null;
        this.cdr.markForCheck();
      },
    });
  }

  save(): void {
    if (this.pendingSave) return;
    this.pendingSave = true;
    this.cdr.markForCheck();
    this.api
      .update({
        defaultLoanDays: this.normInt(this.formDefaultLoanDays),
        maxActiveLoansDefault: this.normInt(this.formMaxActiveLoans),
        reservationExpiryDays: this.normInt(this.formReservationExpiryDays),
        finePerDay: this.normNum(this.formFinePerDay),
      })
      .subscribe({
        next: (s) => {
          this.pendingSave = false;
          this.settings = s;
          this.toast.showPlain('Paramètres enregistrés.', 'success');
          this.cdr.markForCheck();
        },
        error: () => {
          this.pendingSave = false;
          this.toast.showPlain('Impossible d’enregistrer.', 'error');
          this.cdr.markForCheck();
        },
      });
  }

  private normInt(v: number | null): number | null {
    if (v == null || !Number.isFinite(v)) return null;
    return Math.max(0, Math.floor(Number(v)));
  }

  private normNum(v: number | null): number | null {
    if (v == null || !Number.isFinite(v)) return null;
    return Math.max(0, Number(v));
  }
}

