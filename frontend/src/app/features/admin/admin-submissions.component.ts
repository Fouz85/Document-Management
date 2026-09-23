import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';
import { RequestListItem } from '../../core/models';
import { sectionOrDepartment } from '../../core/record-labels';

@Component({
  selector: 'app-admin-submissions',
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <div class="card">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <h6 class="mb-0">{{ i18n.t('nav.allSubmissions') }} ({{ items().length }})</h6>
        <button class="btn btn-sm" style="background:#1D6F42;color:#fff;border:none;" (click)="exportExcel()">
          <i class="bi bi-file-earmark-excel me-1"></i>{{ i18n.t('admin.exportExcel') }}
        </button>
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
                @for (s of statuses; track s) { <option [value]="s">{{ i18n.t('status.' + s) }}</option> }
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

        @if (filtered().length === 0 && items().length === 0) {
          <div class="text-center py-5 text-muted">
            <p>{{ i18n.t('common.noData') }}</p>
          </div>
        } @else {
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
                  <th style="width:150px;">{{ i18n.t('admin.signaturesColumn') }}</th>
                  <th style="width:120px;">{{ i18n.t('admin.destroyedColumn') }}</th>
                  <th style="width:90px;">{{ i18n.t('common.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (r of filtered(); track r.id; let i = $index) {
                  <tr style="cursor:pointer;" (click)="goTo(r.id)">
                    <td class="fw-bold">{{ i + 1 }}</td>
                    <td>{{ r.destructionNo ?? '—' }}</td>
                    <td class="col-text">{{ sectionOrDepartment(r.department) }}</td>
                    <td>{{ r.responsibleOfficer }}</td>
                    <td><span class="badge bg-secondary">{{ r.recordsCount }}</span></td>
                    <td style="white-space:nowrap;">{{ r.submittedAt | date:'dd-MM-yyyy' }}</td>
                    <td><span class="badge-status" [style]="badgeStyle(r.status)">{{ i18n.t('status.' + r.status) }}</span></td>
                    <td>
                      <!-- So the admin can tell which Approved requests are still waiting on Legal
                           Affairs/Internal Audit without opening each one individually. -->
                      @if (r.status !== 'Approved') {
                        <span class="text-muted">—</span>
                      } @else if (r.hasLegalAffairsSignature && r.hasInternalAuditSignature) {
                        <span class="badge" style="background:#E6F5F2;color:#0a5c4a;border:1px solid rgba(18,155,130,0.35);font-weight:600;">
                          <i class="bi bi-check-lg me-1"></i>{{ i18n.t('admin.signaturesComplete') }}
                        </span>
                      } @else {
                        <span class="badge" [title]="signaturesTooltip(r)" style="background:#fdecea;color:#a13a34;border:1px solid rgba(221,120,119,0.4);font-weight:600;">
                          <i class="bi bi-exclamation-circle me-1"></i>{{ i18n.t('admin.signaturesPending') }}
                        </span>
                      }
                    </td>
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
                        <a [routerLink]="['/requests', r.id]" class="btn btn-sm btn-outline-primary py-0 px-2"
                           [title]="i18n.t('common.details')">
                          <i class="bi bi-eye"></i>
                        </a>
                        <a [routerLink]="['/requests', r.id, 'edit']" class="btn btn-sm btn-outline-warning py-0 px-2"
                           [title]="i18n.t('common.edit')">
                          <i class="bi bi-pencil"></i>
                        </a>
                        @if (r.status === 'Approved') {
                          <button class="btn btn-sm btn-outline-success py-0 px-2" title="PDF"
                                  [disabled]="isDownloading(r.id, 'pdf')"
                                  (click)="downloadPdf(r.id, r.destructionNo)">
                            @if (isDownloading(r.id, 'pdf')) {
                              <span class="spinner-border spinner-border-sm"></span>
                            } @else {
                              <i class="bi bi-file-earmark-pdf"></i>
                            }
                          </button>
                          <button class="btn btn-sm btn-outline-primary py-0 px-2" title="Word"
                                  [disabled]="isDownloading(r.id, 'docx')"
                                  (click)="downloadDocx(r.id, r.destructionNo)">
                            @if (isDownloading(r.id, 'docx')) {
                              <span class="spinner-border spinner-border-sm"></span>
                            } @else {
                              <i class="bi bi-file-earmark-word"></i>
                            }
                          </button>
                        }
                        <button class="btn btn-sm btn-outline-danger py-0 px-2"
                                [title]="i18n.t('common.delete')" (click)="remove(r)">
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="10" class="text-center text-muted py-5">{{ i18n.t('common.noData') }}</td></tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `
})
export class AdminSubmissionsComponent {
  private readonly api = inject(ApiService);
  readonly i18n = inject(I18nService);
  readonly sectionOrDepartment = sectionOrDepartment;

  readonly items = signal<RequestListItem[]>([]);
  readonly filtered = signal<RequestListItem[]>([]);
  readonly filterResultText = signal('');
  readonly statuses = ['Submitted', 'Approved', 'Rejected'];

  filterFrom = '';
  filterTo = '';
  filterStatus = '';

  private readonly downloading = signal<{ id: number; type: 'pdf' | 'docx' } | null>(null);

  constructor() { this.load(); }

  isDownloading(id: number, type: 'pdf' | 'docx'): boolean {
    const d = this.downloading();
    return d !== null && d.id === id && d.type === type;
  }

  async load(): Promise<void> {
    const data = await firstValueFrom(this.api.submissions());
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

  /** Which of the two counter-signatures is still missing, for the pending-signature badge's
   * hover tooltip — e.g. "الشؤون القانونية، التدقيق الداخلي" if both are outstanding. */
  signaturesTooltip(r: RequestListItem): string {
    const missing: string[] = [];
    if (!r.hasLegalAffairsSignature) missing.push(this.i18n.t('request.sig_legalAffairs'));
    if (!r.hasInternalAuditSignature) missing.push(this.i18n.t('request.sig_internalAudit'));
    return missing.join('، ');
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
    if (this.downloading()) return;
    this.downloading.set({ id, type: 'pdf' });
    try {
      const blob = await firstValueFrom(this.api.downloadPdf(id));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const noPart = (destructionNo ?? String(id)).replace(/[\\/]/g, '-');
      a.href = url; a.download = `استمارة إتلاف رقم ${noPart}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } finally {
      this.downloading.set(null);
    }
  }

  async downloadDocx(id: number, destructionNo?: string | null): Promise<void> {
    if (this.downloading()) return;
    this.downloading.set({ id, type: 'docx' });
    try {
      const blob = await firstValueFrom(this.api.downloadRequestDocx(id));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const noPart = (destructionNo ?? String(id)).replace(/[\\/]/g, '-');
      a.href = url; a.download = `استمارة إتلاف رقم ${noPart}.docx`; a.click();
      URL.revokeObjectURL(url);
    } finally {
      this.downloading.set(null);
    }
  }

  async remove(r: RequestListItem): Promise<void> {
    if (!window.confirm(this.i18n.t('common.confirmDelete'))) return;
    await firstValueFrom(this.api.softDelete(r.id));
    await this.load();
    this.applyFilter();
  }

  async exportExcel(): Promise<void> {
    const blob = await firstValueFrom(this.api.exportExcel());
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    a.href = url; a.download = `كشف الإتلاف بتاريخ ${today}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  }
}