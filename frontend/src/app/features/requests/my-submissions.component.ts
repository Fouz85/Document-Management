import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';
import { RequestListItem } from '../../core/models';

@Component({
  selector: 'app-my-submissions',
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <div class="card">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <h5 class="mb-0">
          <i class="bi bi-clock-history me-2" style="color:var(--maroon);"></i>
          {{ i18n.t('nav.myRequests') }}
        </h5>
        <a routerLink="/requests/new" class="btn btn-primary btn-sm">
          <i class="bi bi-plus me-1"></i>{{ i18n.t('nav.newRequest') }}
        </a>
      </div>
      <div class="card-body p-0">

        <!-- فلتر البحث -->
        <div class="px-4 pt-3 pb-2 border-bottom">
          <div class="row g-2 align-items-end">
            <div class="col-md-3">
              <label class="form-label small mb-1">{{ i18n.t('admin.fromDate') }}</label>
              <input type="date" class="form-control form-control-sm" [(ngModel)]="filterFrom"
                     style="direction:ltr;" name="from">
            </div>
            <div class="col-md-3">
              <label class="form-label small mb-1">{{ i18n.t('admin.toDate') }}</label>
              <input type="date" class="form-control form-control-sm" [(ngModel)]="filterTo"
                     style="direction:ltr;" name="to">
            </div>
            <div class="col-md-3">
              <label class="form-label small mb-1">{{ i18n.t('common.status') }}</label>
              <select class="form-select form-select-sm" [(ngModel)]="filterStatus" name="status">
                <option value="">{{ i18n.t('common.all') }}</option>
                <option value="Submitted">{{ i18n.t('status.Submitted') }}</option>
                <option value="Approved">{{ i18n.t('status.Approved') }}</option>
                <option value="Rejected">{{ i18n.t('status.Rejected') }}</option>
                <option value="Draft">{{ i18n.t('status.Draft') }}</option>
              </select>
            </div>
            <div class="col-md-3 d-flex gap-2">
              <button type="button" class="btn btn-primary btn-sm w-100" (click)="applyFilter()">
                <i class="bi bi-search me-1"></i>{{ i18n.t('common.search') }}
              </button>
              <button type="button" class="btn btn-outline-secondary btn-sm w-100" (click)="clearFilter()">
                <i class="bi bi-x me-1"></i>{{ i18n.t('common.clear') }}
              </button>
            </div>
          </div>
          @if (filterResultText()) {
            <div class="mt-2 small text-muted">{{ filterResultText() }}</div>
          }
        </div>

        @if (items().length === 0 && !filterResultText()) {
          <div class="text-center py-5 text-muted">
            <i class="bi bi-inbox" style="font-size:3rem;color:var(--maroon);opacity:0.4;"></i>
            <p class="mt-3 mb-2">{{ i18n.t('request.noSubmissionsYet') }}</p>
            <a routerLink="/requests/new" class="btn btn-primary btn-sm">
              <i class="bi bi-file-earmark-plus me-1"></i>{{ i18n.t('request.createFirst') }}
            </a>
          </div>
        } @else {
          <div class="table-responsive" style="padding: 0.5rem 0;">
            <table class="sys-table">
              <thead>
                <tr>
                  <th style="width:40px;">#</th>
                  <th>{{ i18n.t('request.destructionNo') }}</th>
                  <th class="col-text">{{ i18n.t('request.department') }}</th>
                  <th style="width:60px;">{{ i18n.t('request.recordsCount') }}</th>
                  <th style="width:100px;">{{ i18n.t('request.submittedAt') }}</th>
                  <th style="width:110px;">{{ i18n.t('common.status') }}</th>
                  <th style="width:130px;">{{ i18n.t('admin.notes') }}</th>
                  <th style="width:70px;">{{ i18n.t('common.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (r of filtered(); track r.id; let i = $index) {
                  <tr style="cursor:pointer;" (click)="goTo(r.id)">
                    <td class="fw-bold">{{ i + 1 }}</td>
                    <td><span class="text-muted">{{ r.destructionNo ?? '—' }}</span></td>
                    <td class="col-text">{{ r.department }}</td>
                    <td><span class="badge bg-secondary">{{ r.recordsCount }}</span></td>
                    <td>{{ r.submittedAt | date:'dd-MM-yyyy' }}</td>
                    <td><span class="badge-status" [style]="badgeStyle(r.status)">{{ i18n.t('status.' + r.status) }}</span></td>
                    <td>{{ r.adminNotes ?? '—' }}</td>
                    <td class="actions-cell" (click)="$event.stopPropagation()">
                      <div class="d-flex gap-1 flex-nowrap justify-content-center">
                        <a [routerLink]="['/requests', r.id]"
                           class="btn btn-sm btn-outline-primary py-0 px-2" [title]="i18n.t('common.details')">
                          <i class="bi bi-eye"></i>
                        </a>
                        @if (r.status === 'Draft' || r.status === 'Rejected' || auth.isAdmin()) {
                          <a [routerLink]="['/requests', r.id, 'edit']"
                             class="btn btn-sm btn-outline-warning py-0 px-2" [title]="i18n.t('common.edit')">
                            <i class="bi bi-pencil"></i>
                          </a>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="8" class="text-center text-muted py-5">{{ i18n.t('common.noData') }}</td></tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `
})
export class MySubmissionsComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);

  readonly items = signal<RequestListItem[]>([]);
  readonly filtered = signal<RequestListItem[]>([]);
  readonly filterResultText = signal('');

  filterFrom = '';
  filterTo = '';
  filterStatus = '';

  constructor() { this.load(); }

  async load(): Promise<void> {
    const data = await firstValueFrom(this.api.myRequests());
    this.items.set(data);
    this.filtered.set(data);
  }

  applyFilter(): void {
    let result = this.items();
    if (this.filterFrom) result = result.filter(r => r.submittedAt.substring(0, 10) >= this.filterFrom);
    if (this.filterTo) result = result.filter(r => r.submittedAt.substring(0, 10) <= this.filterTo);
    if (this.filterStatus) result = result.filter(r => r.status === this.filterStatus);
    this.filtered.set(result);
    this.filterResultText.set(
      this.i18n.lang() === 'en'
        ? `Showing ${result.length} of ${this.items().length} requests`
        : `يظهر ${result.length} من أصل ${this.items().length} طلب`
    );
  }

  clearFilter(): void {
    this.filterFrom = '';
    this.filterTo = '';
    this.filterStatus = '';
    this.filtered.set(this.items());
    this.filterResultText.set('');
  }

  badgeStyle(status: string): string {
    return {
      Approved: 'background:#129b82;color:#fff;',
      Rejected: 'background:#dd7877;color:#000;',
      Draft:    'background:#aaa;color:#fff;',
      Submitted:'background:#E8CC84;color:#000;'
    }[status] ?? 'background:#E8CC84;color:#000;';
  }

  goTo(id: number): void {
    this.router.navigate(['/requests', id]);
  }
}
