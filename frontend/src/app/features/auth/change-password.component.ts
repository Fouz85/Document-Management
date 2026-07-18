import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';

@Component({
  selector: 'app-change-password',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="card" style="max-width:450px;margin:auto;">
      <div class="card-header bg-white py-3">
        <h5 class="mb-0">
          <i class="bi bi-key me-2" style="color:var(--maroon);"></i>
          {{ i18n.t('nav.changePassword') }}
        </h5>
      </div>
      <div class="card-body p-4">
        @if (message()) {
          <div class="alert small" [class.alert-success]="ok()" [class.alert-danger]="!ok()">
            {{ i18n.t(message()!) }}
          </div>
        }
        <div class="mb-3">
          <label class="form-label">{{ i18n.t('auth.currentPassword') }} *</label>
          <input type="password" class="form-control" name="current" [(ngModel)]="current" required autocomplete="current-password">
        </div>
        <div class="mb-3">
          <label class="form-label">{{ i18n.t('auth.newPassword') }} *</label>
          <input type="password" class="form-control" name="newPassword" [(ngModel)]="newPassword" required autocomplete="new-password">
          @if (newPassword) {
            <div class="mt-2" style="font-size:0.78rem;">
              <div [class]="newPassword.length >= 8 ? 'text-success' : 'text-danger'">
                <i class="bi" [class.bi-check-circle]="newPassword.length >= 8" [class.bi-x-circle]="newPassword.length < 8"></i>
                {{ i18n.t('admin.chkLen') }}
              </div>
              <div [class]="hasUpper() ? 'text-success' : 'text-danger'">
                <i class="bi" [class.bi-check-circle]="hasUpper()" [class.bi-x-circle]="!hasUpper()"></i>
                {{ i18n.t('admin.chkUpper') }}
              </div>
              <div [class]="hasNumber() ? 'text-success' : 'text-danger'">
                <i class="bi" [class.bi-check-circle]="hasNumber()" [class.bi-x-circle]="!hasNumber()"></i>
                {{ i18n.t('admin.chkNum') }}
              </div>
            </div>
          }
        </div>
        <div class="mb-4">
          <label class="form-label">{{ i18n.t('auth.confirmPassword') }} *</label>
          <input type="password" class="form-control" name="confirm" [(ngModel)]="confirm" required autocomplete="new-password">
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-primary" (click)="submit()">
            <i class="bi bi-check-lg me-1"></i>{{ i18n.t('common.save') }}
          </button>
          <a routerLink="/requests" class="btn btn-sm"
             style="background:rgba(221,120,119,0.15);color:#9e3535;border:1px solid rgba(221,120,119,0.5);">
            {{ i18n.t('common.cancel') }}
          </a>
        </div>
      </div>
    </div>
  `
})
export class ChangePasswordComponent {
  private readonly api = inject(ApiService);
  readonly i18n = inject(I18nService);

  current = ''; newPassword = ''; confirm = '';
  readonly message = signal<string | null>(null);
  readonly ok = signal(false);

  hasUpper(): boolean { return /[A-Z]/.test(this.newPassword); }
  hasNumber(): boolean { return /[0-9]/.test(this.newPassword); }

  async submit(): Promise<void> {
    if (this.newPassword !== this.confirm) {
      this.ok.set(false);
      this.message.set('auth.passwordMismatch');
      return;
    }
    try {
      await firstValueFrom(this.api.changePassword(this.current, this.newPassword));
      this.ok.set(true);
      this.message.set('auth.passwordChanged');
      this.current = this.newPassword = this.confirm = '';
    } catch {
      this.ok.set(false);
      this.message.set('common.error');
    }
  }
}