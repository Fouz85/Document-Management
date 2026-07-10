import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="login-page">
      <div class="login-wrapper">
        <div class="lang-switcher">
          <button class="lang-btn" [class.active]="!i18n.isEn()" (click)="i18n.setLang('ar')">العربية</button>
          <button class="lang-btn" [class.active]="i18n.isEn()" (click)="i18n.setLang('en')">English</button>
        </div>

        <div class="login-card card">
          <div class="login-header">
            <img src="images/PrimaryLogo.png" [alt]="i18n.t('app.ministry')"
                 style="max-width:280px; height:auto; filter:brightness(0) invert(1); margin-bottom:0.5rem;" />
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

              <div class="mb-4">
                <label class="form-label" for="password">{{ i18n.t('auth.password') }}</label>
                <div class="input-icon">
                  <i class="bi bi-lock"></i>
                  <input id="password" name="password" type="password" class="form-control"
                         [placeholder]="i18n.t('auth.passwordPlaceholder')" autocomplete="current-password"
                         [(ngModel)]="password" required>
                </div>
              </div>

              <button type="submit" class="btn btn-login w-100 text-white mb-2" [disabled]="busy()">
                <i class="bi bi-box-arrow-in-right me-2"></i>{{ i18n.t('auth.login') }}
              </button>
            </form>
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
      this.router.navigate([this.auth.isAdmin() ? '/admin/dashboard' : '/requests']);
    } catch {
      this.error.set('auth.invalidCredentials');
    } finally {
      this.busy.set(false);
    }
  }
}
