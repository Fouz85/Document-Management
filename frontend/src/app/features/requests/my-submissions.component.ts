import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';
import { RequestListItem } from '../../core/models';

@Component({
  selector: 'app-my-submissions',
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
      <div class="section-header m-0" style="flex:1;min-width:220px;">
        <i class="bi bi-clock-history"></i>{{ i18n.t('nav.myRequests') }}
      </div>
      <a routerLink="/requests/new" class="btn btn-primary btn-sm">
        <i class="bi bi-file-earmark-plus me-1"></i>{{ i18n.t('nav.newRequest') }}
      </a>
    </div>

    <div class="card mb-3">
      <div class="card-body py-3 row g-2">
        <div class="col-md-4">
          <input class="form-control form-control-sm" name="search"
                 [placeholder]="i18n.t('common.search')" [(ngModel)]="search" (change)="load()">
        </div>
        <div class="col-md-3">
          <select class="form-select form-select-sm" name="status" [(ngModel)]="status" (change)="load()">
            <option value="">{{ i18n.t('common.all') }}</option>
            @for (s of statuses; track s) { <option [value]="s">{{ i18n.t('status.' + s) }}</option> }
          </select>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="table-responsive">
        <table class="sys-table">
          <thead>
            <tr>
              <th>{{ i18n.t('request.destructionNo') }}</th>
              <th class="col-text">{{ i18n.t('request.department') }}</th>
              <th>{{ i18n.t('request.submittedAt') }}</th>
              <th>{{ i18n.t('request.recordsCount') }}</th>
              <th>{{ i18n.t('common.status') }}</th>
              <th>{{ i18n.t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (r of items(); track r.id) {
              <tr>
                <td>{{ r.destructionNo }}</td>
                <td class="col-text">{{ r.department }}</td>
                <td>{{ r.submittedAt | date:'yyyy-MM-dd' }}</td>
                <td>{{ r.recordsCount }}</td>
                <td><span class="badge badge-status" [class]="badge(r.status)">{{ i18n.t('status.' + r.status) }}</span></td>
                <td class="actions-cell">
                  <a class="btn btn-outline-secondary btn-sm" [routerLink]="['/requests', r.id]"><i class="bi bi-eye"></i></a>
                  <a class="btn btn-outline-primary btn-sm" [routerLink]="['/requests', r.id, 'edit']"><i class="bi bi-pencil"></i></a>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="text-center text-muted py-4">{{ i18n.t('common.noData') }}</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class MySubmissionsComponent {
  private readonly api = inject(ApiService);
  readonly i18n = inject(I18nService);

  readonly items = signal<RequestListItem[]>([]);
  readonly statuses = ['Draft', 'Submitted', 'Approved', 'Rejected'];
  search = ''; status = '';

  constructor() { this.load(); }

  async load(): Promise<void> {
    this.items.set(await firstValueFrom(this.api.myRequests(this.search || undefined, this.status || undefined)));
  }

  badge(status: string): string {
    return { Approved: 'badge bg-success badge-status', Rejected: 'badge bg-danger badge-status',
             Submitted: 'badge bg-primary badge-status', Draft: 'badge bg-warning badge-status' }[status]
           ?? 'badge bg-secondary badge-status';
  }
}
