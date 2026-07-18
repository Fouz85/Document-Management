import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';

@Component({
  selector: 'app-login',
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
            <form (ngSubmit)="submit()">
              @if (error()) {
                <div class="alert alert-danger mb-3 py-2 small" style="border-radius:10px;">
                  {{ i18n.t(error()!) }}
                </div>
              }

              <div class="mb-3">
                <label class="form-label" for="email">{{ i18n.t('auth.email') }}</label>
                <div class="input-icon">
                  <i class="bi bi-envelope"></i>
                  <input id="email" name="email" type="email" class="form-control"
                         placeholder="name@example.com" autocomplete="email" [(ngModel)]="email" required>
                </div>
              </div>

              <div class="mb-2">
                <label class="form-label" for="password">{{ i18n.t('auth.password') }}</label>
                <div class="input-icon">
                  <i class="bi bi-lock"></i>
                  <input id="password" name="password" type="password" class="form-control"
                         [placeholder]="i18n.t('auth.passwordPlaceholder')" autocomplete="current-password"
                         [(ngModel)]="password" required>
                </div>
              </div>

              <div class="text-end mb-3" style="font-size:0.82rem;">
                <a routerLink="/forgot-password" style="color:var(--maroon);">{{ i18n.t('auth.forgotPasswordLink') }}</a>
              </div>

              <button type="submit" class="btn btn-login w-100 text-white mb-2" [disabled]="busy()">
                <i class="bi bi-box-arrow-in-right me-2"></i>{{ i18n.t('auth.login') }}
              </button>
            </form>
            <div class="text-center mt-2" style="font-size:0.85rem;">
              {{ i18n.t('auth.noAccount') }}
              <a routerLink="/register" style="color:var(--maroon);font-weight:600;">{{ i18n.t('auth.registerLink') }}</a>
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
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly i18n = inject(I18nService);

  email = '';
  password = '';
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  async submit(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.login(this.email, this.password);
      this.router.navigate([this.auth.isAdmin() ? '/admin/dashboard' : '/requests/new']);
    } catch (err: unknown) {
      const httpErr = err as { error?: { error?: string } };
      this.error.set(httpErr?.error?.error ?? 'auth.invalidCredentials');
    } finally {
      this.busy.set(false);
    }
  }
}
