import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';
import { RequestDetails, SignatureBlockDto } from '../../core/models';

@Component({
  selector: 'app-request-details',
  imports: [DatePipe, RouterLink],
  template: `
    @if (details(); as r) {
      <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div class="section-header m-0" style="flex:1;min-width:220px;">
          <i class="bi bi-file-earmark-text"></i>{{ i18n.t('request.title') }} — {{ r.destructionNo }}
        </div>
        <div class="d-flex align-items-center gap-2">
          <span [class]="badge(r.status)" style="font-size:0.85rem;">{{ i18n.t('status.' + r.status) }}</span>
          <a class="btn btn-outline-primary btn-sm" [routerLink]="['/requests', r.id, 'edit']">
            <i class="bi bi-pencil me-1"></i>{{ i18n.t('common.edit') }}
          </a>
          <a routerLink="/requests" class="btn-back"><i class="bi bi-arrow-right"></i>{{ i18n.t('common.back') }}</a>
        </div>
      </div>

      @if (r.adminNotes) {
        <div class="alert alert-warning"><i class="bi bi-chat-left-text me-2"></i><strong>{{ i18n.t('request.adminNotes') }}:</strong> {{ r.adminNotes }}</div>
      }

      <div class="card mb-3">
        <div class="card-body p-4 row g-3">
          <div class="col-md-4"><span class="form-label d-block">{{ i18n.t('request.concernedParty') }}</span>{{ r.concernedParty }}</div>
          <div class="col-md-4"><span class="form-label d-block">{{ i18n.t('request.department') }}</span>{{ r.department }}</div>
          <div class="col-md-4"><span class="form-label d-block">{{ i18n.t('request.responsibleOfficer') }}</span>{{ r.responsibleOfficer }}</div>
          <div class="col-md-4"><span class="form-label d-block">{{ i18n.t('request.email') }}</span><span dir="ltr">{{ r.email }}</span></div>
          <div class="col-md-4"><span class="form-label d-block">{{ i18n.t('request.phone') }}</span><span dir="ltr">{{ r.phone }}</span></div>
          <div class="col-md-4"><span class="form-label d-block">{{ i18n.t('request.storageLocation') }}</span>{{ r.storageLocation }}</div>
          <div class="col-md-4"><span class="form-label d-block">{{ i18n.t('request.totalVolume') }}</span>{{ r.totalVolume }}</div>
          <div class="col-md-4"><span class="form-label d-block">{{ i18n.t('request.firstDate') }}</span>{{ year(r.recordsFirstDate) }}</div>
          <div class="col-md-4"><span class="form-label d-block">{{ i18n.t('request.lastDate') }}</span>{{ year(r.recordsLastDate) }}</div>
          <div class="col-md-4"><span class="form-label d-block">{{ i18n.t('request.submittedAt') }}</span>{{ r.submittedAt | date:'yyyy-MM-dd HH:mm' }}</div>
        </div>
      </div>

      <div class="card mb-3">
        <div class="card-body p-4">
          <div class="section-header"><i class="bi bi-table"></i>{{ i18n.t('request.recordsList') }}</div>
          <div class="table-responsive">
            <table class="sys-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th class="col-text">{{ i18n.t('request.recordsTitle') }}</th>
                  <th>{{ i18n.t('request.originalOrCopy') }}</th>
                  <th>{{ i18n.t('request.recordsType') }}</th>
                  <th>{{ i18n.t('request.storageMedium') }}</th>
                  <th>{{ i18n.t('request.retentionRuleNo') }}</th>
                  <th>{{ i18n.t('request.firstYear') }}</th>
                  <th>{{ i18n.t('request.lastYear') }}</th>
                  <th>{{ i18n.t('request.recordsVolume') }}</th>
                  <th class="col-text">{{ i18n.t('request.remarks') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (rec of r.records; track rec.serialNo) {
                  <tr>
                    <td>{{ rec.serialNo }}</td>
                    <td class="col-text">{{ rec.recordsTitle }}</td>
                    <td>{{ rec.originalOrCopy }}</td>
                    <td>{{ rec.recordsType }}</td>
                    <td>{{ rec.storageMedium }}</td>
                    <td>{{ rec.retentionRuleNo }}</td>
                    <td>{{ year(rec.firstDate) }}</td>
                    <td>{{ year(rec.lastDate) }}</td>
                    <td>{{ rec.recordsVolume }}</td>
                    <td class="col-text">{{ rec.remarks }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body p-4">
          <div class="section-header"><i class="bi bi-pen"></i>{{ i18n.t('request.signatures') }}</div>
          <div class="row g-3">
            @for (b of blocks(); track b.key) {
              <div class="col-md-3">
                <div class="card border h-100">
                  <div class="card-header bg-light py-2 text-center">
                    <div class="fw-bold small">{{ i18n.t('request.sig_' + b.key) }}</div>
                  </div>
                  <div class="card-body p-3">
                    <div class="small mb-1"><span class="form-label">{{ i18n.t('request.name') }}:</span> {{ b.value?.name }}</div>
                    <div class="small mb-2"><span class="form-label">{{ i18n.t('request.date') }}:</span> {{ b.value?.date | date:'yyyy-MM-dd' }}</div>
                    @if (b.value?.signature) {
                      <img [src]="b.value?.signature" class="img-fluid border rounded" [alt]="i18n.t('request.signature')">
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    } @else {
      <p class="text-muted">{{ i18n.t('common.loading') }}</p>
    }
  `
})
export class RequestDetailsComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  readonly i18n = inject(I18nService);

  readonly details = signal<RequestDetails | null>(null);

  constructor() {
    const id = +this.route.snapshot.paramMap.get('id')!;
    firstValueFrom(this.api.getRequest(id)).then(d => this.details.set(d));
  }

  blocks(): { key: string; value: SignatureBlockDto | null | undefined }[] {
    const r = this.details();
    return [
      { key: 'creatorUnit', value: r?.creatorUnit },
      { key: 'legalAffairs', value: r?.legalAffairs },
      { key: 'internalAudit', value: r?.internalAudit },
      { key: 'recordsManagement', value: r?.recordsManagement }
    ];
  }

  year(d?: string | null): string {
    return d ? String(new Date(d).getFullYear()) : '';
  }

  badge(status: string): string {
    return { Approved: 'badge bg-success badge-status', Rejected: 'badge bg-danger badge-status',
             Submitted: 'badge bg-primary badge-status', Draft: 'badge bg-warning badge-status' }[status]
           ?? 'badge bg-secondary badge-status';
  }
}
