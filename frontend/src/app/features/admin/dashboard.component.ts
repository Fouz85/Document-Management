import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';
import { Dashboard } from '../../core/models';

@Component({
  selector: 'app-admin-dashboard',
  imports: [DatePipe, RouterLink],
  template: `
    <div class="section-header"><i class="bi bi-grid-1x2"></i>{{ i18n.t('admin.dashboard') }}</div>
    @if (data(); as d) {
      <div class="row g-3 mb-4">
        @for (c of cards(d); track c.label) {
          <div class="col-6 col-lg">
            <div class="card stat-card {{ c.color }}">
              <div class="card-body text-center py-3">
                <i class="bi {{ c.icon }}" style="font-size:1.4rem;color:var(--maroon);"></i>
                <div class="fs-3 fw-bold" style="color:var(--skyline);">{{ c.value }}</div>
                <div class="text-muted small">{{ i18n.t(c.label) }}</div>
              </div>
            </div>
          </div>
        }
      </div>

      <div class="card">
        <div class="card-header fw-bold" style="color:var(--maroon);">
          <i class="bi bi-clock-history me-1"></i>{{ i18n.t('admin.recent') }}
        </div>
        <div class="table-responsive">
          <table class="sys-table">
            <thead>
              <tr>
                <th>{{ i18n.t('request.destructionNo') }}</th>
                <th class="col-text">{{ i18n.t('request.department') }}</th>
                <th>{{ i18n.t('request.submittedAt') }}</th>
                <th>{{ i18n.t('common.status') }}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (r of d.recentSubmissions; track r.id) {
                <tr>
                  <td>{{ r.destructionNo }}</td>
                  <td class="col-text">{{ r.department }}</td>
                  <td>{{ r.submittedAt | date:'yyyy-MM-dd' }}</td>
                  <td><span [class]="badge(r.status)">{{ i18n.t('status.' + r.status) }}</span></td>
                  <td class="actions-cell">
                    <a class="btn btn-outline-secondary btn-sm" [routerLink]="['/requests', r.id]"><i class="bi bi-eye"></i></a>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="text-center text-muted py-3">{{ i18n.t('common.noData') }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    } @else {
      <p class="text-muted">{{ i18n.t('common.loading') }}</p>
    }
  `
})
export class DashboardComponent {
  private readonly api = inject(ApiService);
  readonly i18n = inject(I18nService);
  readonly data = signal<Dashboard | null>(null);

  constructor() {
    firstValueFrom(this.api.dashboard()).then(d => this.data.set(d));
  }

  cards(d: Dashboard) {
    return [
      { label: 'admin.total', value: d.totalSubmissions, color: '', icon: 'bi-files' },
      { label: 'admin.submitted', value: d.submittedCount, color: 'blue', icon: 'bi-send' },
      { label: 'admin.approved', value: d.approvedCount, color: 'green', icon: 'bi-check-circle' },
      { label: 'admin.rejected', value: d.rejectedCount, color: 'red', icon: 'bi-x-circle' },
      { label: 'admin.drafts', value: d.draftCount, color: 'teal', icon: 'bi-pencil-square' }
    ];
  }

  badge(status: string): string {
    return { Approved: 'badge bg-success badge-status', Rejected: 'badge bg-danger badge-status',
             Submitted: 'badge bg-primary badge-status', Draft: 'badge bg-warning badge-status' }[status]
           ?? 'badge bg-secondary badge-status';
  }
}
