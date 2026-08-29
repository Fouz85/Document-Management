import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';
import { Dashboard } from '../../core/models';
import { sectionOrDepartment } from '../../core/record-labels';

@Component({
  selector: 'app-admin-dashboard',
  imports: [DatePipe, RouterLink],
  template: `
    @if (data(); as d) {
      <div class="row g-4 mb-4">
        <div class="col-md-3">
          <div class="card" style="border-left:4px solid var(--maroon);">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <div class="text-muted small">{{ i18n.t('admin.total') }}</div>
                  <div class="fw-bold fs-3" style="color:var(--maroon);">{{ d.totalSubmissions }}</div>
                </div>
                <i class="bi bi-clipboard-data" style="font-size:2rem;color:var(--maroon);opacity:0.2;"></i>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card" style="border-left:4px solid #c9a800;">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <div class="text-muted small">{{ i18n.t('admin.submitted') }}</div>
                  <div class="fw-bold fs-3" style="color:#8a6a00;">{{ d.submittedCount }}</div>
                </div>
                <i class="bi bi-hourglass-split" style="font-size:2rem;color:#E8CC84;opacity:0.5;"></i>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card" style="border-left:4px solid #129b82;">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <div class="text-muted small">{{ i18n.t('admin.approved') }}</div>
                  <div class="fw-bold fs-3" style="color:#129b82;">{{ d.approvedCount }}</div>
                </div>
                <i class="bi bi-check-circle" style="font-size:2rem;color:#129b82;opacity:0.2;"></i>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card" style="border-left:4px solid #9e3535;">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <div class="text-muted small">{{ i18n.t('admin.rejected') }}</div>
                  <div class="fw-bold fs-3" style="color:#9e3535;">{{ d.rejectedCount }}</div>
                </div>
                <i class="bi bi-x-circle" style="font-size:2rem;color:#9e3535;opacity:0.2;"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <h6 class="mb-0">
            <i class="bi bi-clock-history me-2" style="color:var(--maroon);"></i>
            {{ i18n.t('admin.recent') }}
          </h6>
          <a routerLink="/admin/submissions" class="btn btn-outline-primary btn-sm">
            {{ i18n.t('admin.viewAll') }}
          </a>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="sys-table">
              <thead>
                <tr>
                  <th style="width:40px;">#</th>
                  <th>{{ i18n.t('request.destructionNo') }}</th>
                  <th class="col-text">{{ i18n.t('request.department') }}</th>
                  <th>{{ i18n.t('request.responsibleOfficer') }}</th>
                  <th style="width:60px;">{{ i18n.t('request.recordsCount') }}</th>
                  <th style="width:125px;white-space:nowrap;">{{ i18n.t('request.submittedAt') }}</th>
                  <th style="width:110px;">{{ i18n.t('common.status') }}</th>
                  <th style="width:120px;">{{ i18n.t('admin.destroyedColumn') }}</th>
                  <th style="width:90px;">{{ i18n.t('common.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (r of d.recentSubmissions; track r.id; let i = $index) {
                  <tr style="cursor:pointer;" (click)="goTo(r.id)">
                    <td class="fw-bold">{{ i + 1 }}</td>
                    <td>{{ r.destructionNo ?? '—' }}</td>
                    <td class="col-text">{{ sectionOrDepartment(r.department) }}</td>
                    <td>{{ r.responsibleOfficer }}</td>
                    <td><span class="badge bg-secondary">{{ r.recordsCount }}</span></td>
                    <td style="white-space:nowrap;">{{ r.submittedAt | date:'dd-MM-yyyy' }}</td>
                    <td><span class="badge-status" [style]="badgeStyle(r.status)">{{ i18n.t('status.' + r.status) }}</span></td>
                    <td>
                      @if (r.status !== 'Approved') {
                        <span class="text-muted">—</span>
                      } @else if (r.isDestroyed) {
                        <span class="badge" style="background:#E6F5F2;color:#0a5c4a;border:1px solid rgba(18,155,130,0.35);font-weight:600;">
                          <i class="bi bi-check-lg me-1"></i>{{ i18n.t('admin.destroyedYes') }}
                        </span>
                      } @else {
                        <span class="badge" style="background:#EFEAE0;color:var(--dune);border:1px solid #E1D8C4;font-weight:600;">
                          {{ i18n.t('admin.destroyedNo') }}
                        </span>
                      }
                    </td>
                    <td class="actions-cell" (click)="$event.stopPropagation()">
                      <div class="d-flex gap-1 flex-nowrap justify-content-center">
                        <a [routerLink]="['/requests', r.id]" class="btn btn-sm btn-outline-primary py-0 px-2">
                          <i class="bi bi-eye"></i>
                        </a>
                        <a [routerLink]="['/requests', r.id, 'edit']" class="btn btn-sm btn-outline-warning py-0 px-2">
                          <i class="bi bi-pencil"></i>
                        </a>
                        @if (r.status === 'Approved') {
                          <button class="btn btn-sm btn-outline-success py-0 px-2" (click)="downloadPdf(r.id, r.destructionNo)">
                            <i class="bi bi-file-earmark-pdf"></i>
                          </button>
                          <button class="btn btn-sm btn-outline-primary py-0 px-2" (click)="downloadDocx(r.id, r.destructionNo)">
                            <i class="bi bi-file-earmark-word"></i>
                          </button>
                        }
                        <button class="btn btn-sm btn-outline-danger py-0 px-2" (click)="remove(r.id)">
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="9" class="text-center text-muted py-5">{{ i18n.t('common.noData') }}</td></tr>
                }
              </tbody>
            </table>
          </div>
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
  readonly sectionOrDepartment = sectionOrDepartment;

  constructor() {
    firstValueFrom(this.api.dashboard()).then(d => this.data.set(d));
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
    window.location.href = `/requests/${id}`;
  }

  async downloadPdf(id: number, destructionNo?: string | null): Promise<void> {
    const blob = await firstValueFrom(this.api.downloadPdf(id));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const noPart = (destructionNo ?? String(id)).replace(/[\\/]/g, '-');
    a.href = url; a.download = `استمارة إتلاف رقم ${noPart}.pdf`; a.click();
    URL.revokeObjectURL(url);
  }

  async downloadDocx(id: number, destructionNo?: string | null): Promise<void> {
    const blob = await firstValueFrom(this.api.downloadRequestDocx(id));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const noPart = (destructionNo ?? String(id)).replace(/[\\/]/g, '-');
    a.href = url; a.download = `استمارة إتلاف رقم ${noPart}.docx`; a.click();
    URL.revokeObjectURL(url);
  }

  async remove(id: number): Promise<void> {
    if (!window.confirm(this.i18n.t('common.confirmDelete'))) return;
    await firstValueFrom(this.api.softDelete(id));
    this.data.set(await firstValueFrom(this.api.dashboard()));
  }
}