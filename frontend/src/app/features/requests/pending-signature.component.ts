import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';
import { RequestListItem } from '../../core/models';
import { sectionOrDepartment } from '../../core/record-labels';

/** Legal Affairs / Internal Audit's queue — every Approved request, whether or not this specific
 * account has already signed it (the list endpoint doesn't distinguish; the signing card on the
 * details page itself disappears once this account's own signature is present). */
@Component({
  selector: 'app-pending-signature',
  imports: [DatePipe],
  template: `
    <div class="card">
      <div class="card-header bg-white py-3">
        <h5 class="mb-0">
          <i class="bi bi-pen me-2" style="color:var(--maroon);"></i>
          {{ i18n.t('nav.pendingSignature') }}
        </h5>
      </div>
      <div class="card-body p-0">
        @if (items().length === 0) {
          <div class="text-center py-5 text-muted">
            <i class="bi bi-inbox" style="font-size:3rem;color:var(--maroon);opacity:0.4;"></i>
            <p class="mt-3 mb-0">{{ i18n.t('request.noPendingSignature') }}</p>
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
                  <th style="width:125px;white-space:nowrap;">{{ i18n.t('request.submittedAt') }}</th>
                  <th style="width:150px;white-space:nowrap;">{{ i18n.t('common.status') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (r of items(); track r.id; let i = $index) {
                  <tr style="cursor:pointer;" (click)="goTo(r.id)">
                    <td class="fw-bold">{{ i + 1 }}</td>
                    <td><span class="text-muted">{{ r.destructionNo ?? '—' }}</span></td>
                    <td class="col-text">{{ sectionOrDepartment(r.department) }}</td>
                    <td><span class="badge bg-secondary">{{ r.recordsCount }}</span></td>
                    <td style="white-space:nowrap;">{{ r.submittedAt | date:'dd-MM-yyyy' }}</td>
                    <td style="white-space:nowrap;">
                      @if (signedByMe(r)) {
                        <span class="badge" style="background:var(--palm);color:#fff;"><i class="bi bi-check-lg me-1"></i>{{ i18n.t('request.signedByMe') }}</span>
                      } @else {
                        <span class="badge" style="background:var(--gold-light);color:#333;">{{ i18n.t('request.awaitingMySignature') }}</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `
})
export class PendingSignatureComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  readonly sectionOrDepartment = sectionOrDepartment;

  readonly items = signal<RequestListItem[]>([]);

  constructor() { this.load(); }

  async load(): Promise<void> {
    this.items.set(await firstValueFrom(this.api.pendingSignature()));
  }

  /** Which flag applies depends on which of the two roles this account holds — a plain "has this
   * request been signed" doesn't mean anything on its own without knowing by whom. */
  signedByMe(r: RequestListItem): boolean {
    return this.auth.hasRole('LegalAffairs') ? r.hasLegalAffairsSignature : r.hasInternalAuditSignature;
  }

  goTo(id: number): void {
    this.router.navigate(['/requests', id]);
  }
}
