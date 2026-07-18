import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';

@Component({
  selector: 'app-forgot-password',
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
            @if (sent()) {
              <div class="alert alert-success mb-3 py-2 small" style="border-radius:10px;">
                {{ i18n.t('auth.forgotPasswordSent') }}
              </div>
              <a routerLink="/login" class="btn btn-login w-100 text-white">{{ i18n.t('auth.backToLogin') }}</a>
            } @else {
              <h5 class="mb-3 text-center" style="color:var(--maroon);">{{ i18n.t('auth.forgotPasswordTitle') }}</h5>
              <p class="text-muted small text-center mb-3">{{ i18n.t('auth.forgotPasswordHint') }}</p>

              <div class="mb-4">
                <label class="form-label" for="fp-email">{{ i18n.t('auth.email') }}</label>
                <div class="input-icon">
                  <i class="bi bi-envelope"></i>
                  <input id="fp-email" type="email" class="form-control" placeholder="name@example.com"
                         dir="ltr" [(ngModel)]="email" name="email" required>
                </div>
              </div>

              <button type="button" class="btn btn-login w-100 text-white mb-2" [disabled]="busy() || !email.trim()"
                      (click)="submit()">
                <i class="bi bi-send me-2"></i>{{ i18n.t('auth.forgotPasswordSubmit') }}
              </button>
              <a routerLink="/login" class="btn btn-outline-secondary w-100">{{ i18n.t('auth.backToLogin') }}</a>
            }
          </div>
        </div>

        <div class="login-footer">
          وزارة التربية والتعليم والتعليم العالي &bull; State of Qatar &bull; دولة قطر
        </div>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  private readonly api = inject(ApiService);
  readonly i18n = inject(I18nService);

  email = '';
  readonly busy = signal(false);
  readonly sent = signal(false);

  async submit(): Promise<void> {
    if (!this.email.trim()) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.forgotPassword(this.email.trim()));
      this.sent.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
