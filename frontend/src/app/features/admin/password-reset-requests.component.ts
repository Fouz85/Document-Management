import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';

interface ResetRequest { id: number; email: string; createdAt: string; isResolved: boolean; }

@Component({
  selector: 'app-password-reset-requests',
  imports: [DatePipe, RouterLink],
  template: `
    <div class="card">
      <div class="card-header bg-white py-3">
        <h5 class="mb-0"><i class="bi bi-key me-2" style="color:var(--maroon);"></i>{{ i18n.t('admin.passwordResetRequests') }}</h5>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="sys-table">
            <thead>
              <tr>
                <th class="col-text">{{ i18n.t('auth.email') }}</th>
                <th style="width:160px;">{{ i18n.t('admin.requestedAt') }}</th>
                <th style="width:110px;">{{ i18n.t('common.status') }}</th>
                <th style="width:180px;">{{ i18n.t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (r of requests(); track r.id) {
                <tr>
                  <td class="col-text" dir="ltr">{{ r.email }}</td>
                  <td>{{ r.createdAt | date:'dd-MM-yyyy HH:mm' }}</td>
                  <td>
                    @if (r.isResolved) {
                      <span class="badge" style="background:#129b82;color:#fff;padding:4px 10px;">{{ i18n.t('admin.resolved') }}</span>
                    } @else {
                      <span class="badge" style="background:#e9c56b;color:#333;padding:4px 10px;">{{ i18n.t('admin.pendingReview') }}</span>
                    }
                  </td>
                  <td class="actions-cell">
                    <div class="d-flex gap-1 flex-nowrap justify-content-center">
                      <a class="btn btn-sm btn-outline-primary py-0 px-2" routerLink="/admin/users"
                         [title]="i18n.t('admin.users')">
                        <i class="bi bi-people"></i>
                      </a>
                      @if (!r.isResolved) {
                        <button class="btn btn-sm btn-outline-success py-0 px-2" (click)="resolve(r)">
                          <i class="bi bi-check-lg"></i><small>{{ i18n.t('admin.markResolved') }}</small>
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="4" class="text-center text-muted py-5">{{ i18n.t('common.noData') }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class PasswordResetRequestsComponent {
  private readonly api = inject(ApiService);
  readonly i18n = inject(I18nService);

  readonly requests = signal<ResetRequest[]>([]);

  constructor() { this.load(); }

  async load(): Promise<void> {
    this.requests.set(await firstValueFrom(this.api.passwordResetRequests()));
  }

  async resolve(r: ResetRequest): Promise<void> {
    await firstValueFrom(this.api.resolvePasswordResetRequest(r.id));
    await this.load();
  }
}
