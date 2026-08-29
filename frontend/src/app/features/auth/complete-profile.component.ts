import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';
import { DepartmentPickerComponent } from '../../shared/department-picker.component';

/** Gate a self-registered account hits right after its first login (see profileCompleteGuard) — the
 * account has no FullName/Department yet since register.component.ts only collects credentials. */
@Component({
  selector: 'app-complete-profile',
  imports: [FormsModule, DepartmentPickerComponent],
  template: `
    <div class="login-page">
      <div class="login-wrapper">
        <div class="lang-switcher">
          <button class="lang-btn" [class.active]="!i18n.isEn()" (click)="i18n.setLang('ar')">العربية</button>
          <button class="lang-btn" [class.active]="i18n.isEn()" (click)="i18n.setLang('en')">English</button>
        </div>

        <div class="login-card card">
          <div class="login-header">
            <img [src]="i18n.isEn() ? 'images/en.png' : 'images/ar.png'" [alt]="i18n.t('app.ministry')"
                 style="max-width:380px; height:auto; margin-bottom:0.5rem;" />
          </div>

          <div class="login-body">
            <h6 class="mb-1 text-center">{{ i18n.t('auth.completeProfileTitle') }}</h6>
            <p class="text-muted small text-center mb-3">{{ i18n.t('auth.completeProfileHint') }}</p>

            @if (error()) {
              <div class="alert alert-danger mb-3 py-2 small" style="border-radius:10px;">
                {{ i18n.t(error()!) }}
              </div>
            }

            <div class="mb-2">
              <label class="form-label">{{ i18n.t('admin.fullName') }} *</label>
              <input class="form-control" name="fullName" [(ngModel)]="fullName"
                     [placeholder]="i18n.t('admin.namePlaceholder')">
            </div>

            <div class="mb-3">
              <label class="form-label">{{ i18n.t('admin.deptSection') }} *</label>
              <app-department-picker [value]="department()" (valueChange)="department.set($event)" />
            </div>

            <button type="button" class="btn btn-login w-100 text-white" [disabled]="busy()" (click)="submit()">
              <i class="bi bi-check-lg me-2"></i>{{ i18n.t('common.save') }}
            </button>
          </div>
        </div>

        <div class="login-footer">
          وزارة التربية والتعليم والتعليم العالي &bull; State of Qatar &bull; دولة قطر
        </div>
      </div>
    </div>
  `
})
export class CompleteProfileComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly i18n = inject(I18nService);

  fullName = '';
  readonly department = signal('');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  async submit(): Promise<void> {
    this.error.set(null);
    if (!this.fullName.trim() || !this.department().trim()) {
      this.error.set('common.fillRequired');
      return;
    }
    this.busy.set(true);
    try {
      await this.auth.completeProfile(this.fullName.trim(), this.department());
      this.router.navigate(['/requests/new']);
    } catch {
      this.error.set('common.error');
    } finally {
      this.busy.set(false);
    }
  }
}
