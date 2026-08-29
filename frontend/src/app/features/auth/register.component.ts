import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
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
            <h6 class="mb-3 text-center">{{ i18n.t('auth.registerTitle') }}</h6>
            <form (ngSubmit)="submit()">
              @if (error()) {
                <div class="alert alert-danger mb-3 py-2 small" style="border-radius:10px;">
                  {{ i18n.t(error()!) }}
                </div>
              }

              <div class="mb-2">
                <label class="form-label" for="email">{{ i18n.t('auth.email') }}</label>
                <div class="input-icon">
                  <i class="bi bi-envelope"></i>
                  <input id="email" name="email" type="email" class="form-control" [class.is-invalid]="emailInvalid()"
                         placeholder="name@education.qa" autocomplete="email" dir="ltr" [(ngModel)]="email" required>
                </div>
                <div class="form-text" [class.text-muted]="!emailInvalid()" [class.text-danger]="emailInvalid()" style="font-size:0.75rem;">
                  {{ i18n.t('auth.emailDomainNotAllowed') }}
                </div>
              </div>

              <div class="mb-2">
                <label class="form-label" for="password">{{ i18n.t('auth.password') }}</label>
                <div class="input-icon">
                  <i class="bi bi-lock"></i>
                  <input id="password" name="password" type="password" class="form-control"
                         [placeholder]="i18n.t('admin.passwordPlaceholder')" autocomplete="new-password"
                         [(ngModel)]="password" required>
                </div>
                @if (password) {
                  <div class="mt-2" style="font-size:0.78rem;">
                    <div [class]="password.length >= 10 ? 'text-success' : 'text-danger'">
                      <i class="bi" [class.bi-check-circle]="password.length >= 10" [class.bi-x-circle]="password.length < 10"></i>
                      {{ i18n.t('admin.chkLen') }}
                    </div>
                    <div [class]="hasUpper(password) ? 'text-success' : 'text-danger'">
                      <i class="bi" [class.bi-check-circle]="hasUpper(password)" [class.bi-x-circle]="!hasUpper(password)"></i>
                      {{ i18n.t('admin.chkUpper') }}
                    </div>
                    <div [class]="hasLower(password) ? 'text-success' : 'text-danger'">
                      <i class="bi" [class.bi-check-circle]="hasLower(password)" [class.bi-x-circle]="!hasLower(password)"></i>
                      {{ i18n.t('admin.chkLower') }}
                    </div>
                    <div [class]="hasNumber(password) ? 'text-success' : 'text-danger'">
                      <i class="bi" [class.bi-check-circle]="hasNumber(password)" [class.bi-x-circle]="!hasNumber(password)"></i>
                      {{ i18n.t('admin.chkNum') }}
                    </div>
                    <div [class]="hasSymbol(password) ? 'text-success' : 'text-danger'">
                      <i class="bi" [class.bi-check-circle]="hasSymbol(password)" [class.bi-x-circle]="!hasSymbol(password)"></i>
                      {{ i18n.t('auth.chkSymbol') }}
                    </div>
                  </div>
                }
              </div>

              <div class="mb-2">
                <label class="form-label" for="confirmPassword">{{ i18n.t('auth.confirmPassword') }}</label>
                <div class="input-icon">
                  <i class="bi bi-lock"></i>
                  <input id="confirmPassword" name="confirmPassword" type="password" class="form-control"
                         autocomplete="new-password" [(ngModel)]="confirmPassword" required>
                </div>
              </div>

              <button type="submit" class="btn btn-login w-100 text-white mb-2 mt-2" [disabled]="busy()">
                <i class="bi bi-person-plus me-2"></i>{{ i18n.t('auth.registerSubmit') }}
              </button>
            </form>

            <div class="text-center mt-2">
              <a routerLink="/login" class="small">{{ i18n.t('auth.haveAccount') }}</a>
            </div>
          </div>
        </div>

        <div class="login-footer">
          وزارة التربية والتعليم والتعليم العالي &bull; State of Qatar &bull; دولة قطر
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly i18n = inject(I18nService);

  email = '';
  password = '';
  confirmPassword = '';
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  private isAllowedEmailDomain(email: string): boolean {
    return /@(education\.qa|edu\.gov\.qa)$/i.test(email.trim());
  }
  emailInvalid(): boolean {
    return this.email.trim().length > 0 && !this.isAllowedEmailDomain(this.email);
  }
  hasUpper(s: string): boolean { return /[A-Z]/.test(s); }
  hasLower(s: string): boolean { return /[a-z]/.test(s); }
  hasNumber(s: string): boolean { return /[0-9]/.test(s); }
  hasSymbol(s: string): boolean { return /[^A-Za-z0-9]/.test(s); }

  async submit(): Promise<void> {
    this.error.set(null);
    if (!this.isAllowedEmailDomain(this.email)) {
      this.error.set('auth.emailDomainNotAllowed');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error.set('auth.passwordMismatch');
      return;
    }
    this.busy.set(true);
    try {
      await this.auth.register(this.email, this.password);
      this.router.navigate(['/complete-profile']);
    } catch (err: unknown) {
      const httpErr = err as { error?: { errors?: string[] } };
      this.error.set(httpErr?.error?.errors?.length ? 'auth.registerFailed' : 'common.error');
    } finally {
      this.busy.set(false);
    }
  }
}
