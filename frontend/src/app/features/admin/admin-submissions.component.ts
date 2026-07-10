import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';
import { RequestListItem } from '../../core/models';

@Component({
  selector: 'app-admin-submissions',
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
      <div class="section-header m-0" style="flex:1;min-width:220px;">
        <i class="bi bi-list-ul"></i>{{ i18n.t('nav.allSubmissions') }}
      </div>
      <button class="btn btn-outline-success btn-sm" (click)="exportExcel()">
        <i class="bi bi-file-earmark-excel me-1"></i>{{ i18n.t('admin.exportExcel') }}
      </button>
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
              <th class="col-text">{{ i18n.t('request.responsibleOfficer') }}</th>
              <th>{{ i18n.t('request.submittedAt') }}</th>
              <th>{{ i18n.t('admin.updateStatus') }}</th>
              <th>{{ i18n.t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (r of items(); track r.id) {
              <tr>
                <td><a [routerLink]="['/requests', r.id]" style="color:var(--maroon);font-weight:600;">{{ r.destructionNo }}</a></td>
                <td class="col-text">{{ r.department }}</td>
                <td class="col-text">{{ r.responsibleOfficer }}</td>
                <td>{{ r.submittedAt | date:'yyyy-MM-dd' }}</td>
                <td style="min-width:130px;">
                  <select class="form-select form-select-sm" [value]="r.status" (change)="updateStatus(r, $event)">
                    @for (s of statuses; track s) { <option [value]="s">{{ i18n.t('status.' + s) }}</option> }
                  </select>
                </td>
                <td class="actions-cell">
                  <a class="btn btn-outline-secondary btn-sm" [routerLink]="['/requests', r.id]" [title]="i18n.t('common.details')"><i class="bi bi-eye"></i></a>
                  <a class="btn btn-outline-primary btn-sm" [routerLink]="['/requests', r.id, 'edit']" [title]="i18n.t('common.edit')"><i class="bi bi-pencil"></i></a>
                  <button class="btn btn-outline-success btn-sm" (click)="downloadPdf(r)" [title]="i18n.t('admin.downloadPdf')"><i class="bi bi-file-earmark-pdf"></i></button>
                  <button class="btn btn-outline-danger btn-sm" (click)="remove(r)" [title]="i18n.t('common.delete')"><i class="bi bi-trash"></i></button>
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
export class AdminSubmissionsComponent {
  private readonly api = inject(ApiService);
  readonly i18n = inject(I18nService);

  readonly items = signal<RequestListItem[]>([]);
  readonly statuses = ['Draft', 'Submitted', 'Approved', 'Rejected'];
  search = ''; status = '';

  constructor() { this.load(); }

  async load(): Promise<void> {
    this.items.set(await firstValueFrom(this.api.submissions(this.search || undefined, this.status || undefined)));
  }

  async updateStatus(r: RequestListItem, e: Event): Promise<void> {
    const status = (e.target as HTMLSelectElement).value;
    const notes = window.prompt(this.i18n.t('admin.notes')) ?? undefined;
    await firstValueFrom(this.api.updateStatus(r.id, status, notes));
    await this.load();
  }

  async remove(r: RequestListItem): Promise<void> {
    if (!window.confirm(this.i18n.t('common.confirmDelete'))) return;
    await firstValueFrom(this.api.softDelete(r.id));
    await this.load();
  }

  async downloadPdf(r: RequestListItem): Promise<void> {
    const blob = await firstValueFrom(this.api.downloadPdf(r.id));
    this.save(blob, `destruction-request-${r.id}.pdf`);
  }

  async exportExcel(): Promise<void> {
    const blob = await firstValueFrom(this.api.exportExcel());
    this.save(blob, 'destruction-summary.xlsx');
  }

  private save(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
