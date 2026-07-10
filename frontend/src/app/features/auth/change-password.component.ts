import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';

@Component({
  selector: 'app-change-password',
  imports: [FormsModule],
  template: `
    <div class="card mx-auto" style="max-width: 30rem;">
      <div class="card-header">{{ i18n.t('nav.changePassword') }}</div>
      <div class="card-body">
        @if (message()) { <div class="alert" [class.alert-success]="ok()" [class.alert-danger]="!ok()">{{ i18n.t(message()!) }}</div> }
        <form (ngSubmit)="submit()">
          <div class="mb-3">
            <label class="form-label" for="cur">{{ i18n.t('auth.currentPassword') }}</label>
            <input id="cur" name="cur" type="password" class="form-control" [(ngModel)]="current" required autocomplete="current-password">
          </div>
          <div class="mb-3">
            <label class="form-label" for="new">{{ i18n.t('auth.newPassword') }}</label>
            <input id="new" name="new" type="password" class="form-control" [(ngModel)]="newPassword" required autocomplete="new-password">
          </div>
          <div class="mb-3">
            <label class="form-label" for="confirm">{{ i18n.t('auth.confirmPassword') }}</label>
            <input id="confirm" name="confirm" type="password" class="form-control" [(ngModel)]="confirm" required autocomplete="new-password">
          </div>
          <button class="btn btn-maroon">{{ i18n.t('common.save') }}</button>
        </form>
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
