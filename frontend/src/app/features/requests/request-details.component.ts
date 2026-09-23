import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';
import { RequestDetails, SignatureBlockDto } from '../../core/models';
import { SignaturePadComponent } from '../../shared/signature-pad.component';

@Component({
  selector: 'app-request-details',
  imports: [DatePipe, RouterLink, FormsModule, SignaturePadComponent],
  template: `
    @if (details(); as r) {
      <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div class="section-header m-0" style="flex:1;min-width:220px;">
          <i class="bi bi-file-earmark-text"></i>{{ i18n.t('request.title') }} — {{ r.destructionNo }}
        </div>
        <div class="d-flex align-items-center gap-2">
          <span [class]="badge(r.status)" style="font-size:0.85rem;">{{ i18n.t('status.' + r.status) }}</span>
          @if (r.status === 'Draft' || r.status === 'Rejected' || auth.isAdmin()) {
            <a class="btn btn-outline-primary btn-sm" [routerLink]="['/requests', r.id, 'edit']">
              <i class="bi bi-pencil me-1"></i>{{ i18n.t('common.edit') }}
            </a>
          }
          @if (r.status === 'Approved') {
            <button class="btn btn-outline-success btn-sm" (click)="downloadPdf()" [disabled]="downloadingPdf()">
              @if (downloadingPdf()) {
                <span class="spinner-border spinner-border-sm me-1"></span>
              } @else {
                <i class="bi bi-file-earmark-pdf me-1"></i>
              }PDF
            </button>
            <button class="btn btn-outline-primary btn-sm" (click)="downloadDocx()" [disabled]="downloadingDocx()">
              @if (downloadingDocx()) {
                <span class="spinner-border spinner-border-sm me-1"></span>
              } @else {
                <i class="bi bi-file-earmark-word me-1"></i>
              }Word
            </button>
          }
          <a [routerLink]="backLink()" class="btn-back"><i class="bi bi-arrow-right"></i>{{ i18n.t('common.back') }}</a>
        </div>
      </div>

      @if (r.adminNotes) {
        <div class="alert alert-warning"><i class="bi bi-chat-left-text me-2"></i>{{ r.adminNotes }}</div>
      }

      @if (auth.isAdmin() && r.status !== 'Draft') {
        <div class="card mb-3 border-warning">
          <div class="card-body p-4">
            <div class="section-header"><i class="bi bi-check2-square"></i>{{ i18n.t('admin.reviewAction') }}</div>
            <textarea class="form-control mb-3" rows="2" [(ngModel)]="notesDraft"
                      [placeholder]="i18n.t('admin.notesPlaceholder')"></textarea>
            <div class="d-flex gap-2">
              <button class="btn btn-success" (click)="decide('Approved')" [disabled]="saving() || r.status === 'Approved'">
                <i class="bi bi-check-lg me-1"></i>{{ i18n.t('admin.approve') }}
              </button>
              <button class="btn btn-danger" (click)="decide('Rejected')" [disabled]="saving() || r.status === 'Rejected'">
                <i class="bi bi-x-lg me-1"></i>{{ i18n.t('admin.reject') }}
              </button>
            </div>
          </div>
        </div>
      }

      @if (r.status === 'Approved') {
        <div class="card mb-3" [class.border-success]="r.isDestroyed" [class.border-warning]="!r.isDestroyed">
          <div class="card-body p-4">
            @if (r.isDestroyed) {
              <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div class="d-flex align-items-center gap-3">
                  <div class="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                       style="width:40px;height:40px;background:var(--palm);color:#fff;">
                    <i class="bi bi-check-lg"></i>
                  </div>
                  <div>
                    <div class="fw-bold" style="color:var(--maroon-dark);">{{ i18n.t('admin.destroyedTitle') }}</div>
                    <div class="text-muted small">{{ i18n.t('admin.destroyedBy') }} {{ r.destroyedByName }} — {{ r.destroyedAt | date:'dd-MM-yyyy' }}</div>
                  </div>
                </div>
                @if (auth.isAdmin()) {
                  <button class="btn btn-outline-secondary btn-sm" (click)="toggleDestroyed()" [disabled]="togglingDestroyed()">
                    {{ i18n.t('admin.undoDestroyed') }}
                  </button>
                }
              </div>
              @if (auth.isAdmin()) {
                <div class="alert alert-info small mt-3 mb-0 py-2">
                  <i class="bi bi-info-circle me-1"></i>{{ i18n.t('admin.destroyedExcelNote') }}
                </div>
              }
            } @else {
              <div class="section-header"><i class="bi bi-trash"></i>{{ i18n.t('admin.destroyStatus') }}</div>
              <p class="text-muted small" [class.mb-0]="!auth.isAdmin()" [class.mb-3]="auth.isAdmin()">{{ i18n.t('admin.notDestroyedYet') }}</p>
              @if (auth.isAdmin()) {
                <!-- The two counter-signatures are otherwise only visible by scrolling to the
                     signatures grid at the bottom of the page — surfaced here too so the admin can
                     tell at a glance why "mark as destroyed" is (or isn't) available yet. -->
                <ul class="list-unstyled small mb-3">
                  <li class="mb-1">
                    @if (r.legalAffairs?.signature) {
                      <i class="bi bi-check-circle-fill" style="color:var(--palm);"></i>
                    } @else {
                      <i class="bi bi-x-circle-fill text-danger"></i>
                    }
                    {{ i18n.t('request.sig_legalAffairs') }}
                  </li>
                  <li>
                    @if (r.internalAudit?.signature) {
                      <i class="bi bi-check-circle-fill" style="color:var(--palm);"></i>
                    } @else {
                      <i class="bi bi-x-circle-fill text-danger"></i>
                    }
                    {{ i18n.t('request.sig_internalAudit') }}
                  </li>
                </ul>
                <button class="btn btn-primary" (click)="toggleDestroyed()" [disabled]="togglingDestroyed() || !bothCounterSigned(r)">
                  <i class="bi bi-check-lg me-1"></i>{{ i18n.t('admin.markDestroyed') }}
                </button>
                @if (!bothCounterSigned(r)) {
                  <div class="form-text text-danger mt-1">{{ i18n.t('admin.awaitingCounterSignatures') }}</div>
                }
              }
            }
          </div>
        </div>
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
            <table class="sys-table records-table">
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
                @for (rec of r.records; track rec.serialNo; let i = $index) {
                  <tr>
                    <td>{{ displaySerial(r.records, i) }}</td>
                    <td class="col-text clamp-cell" [title]="rec.recordsTitle">
                      @if (splitNumbered(rec.recordsTitle, startNumberFor(r.records, i)); as lines) {
                        <table class="numbered-lines">
                          @for (item of lines; track item.n) {
                            <tr><td class="num">{{ item.n }}.</td><td>{{ item.text }}</td></tr>
                          }
                        </table>
                      } @else {
                        {{ rec.recordsTitle }}
                      }
                    </td>
                    <td>{{ copyLabel(rec.originalOrCopy) }}</td>
                    <td>{{ typeLabel(rec.recordsType) }}</td>
                    <td>{{ mediumLabel(rec.storageMedium) }}</td>
                    <td>{{ rec.retentionRuleNo || '/' }}</td>
                    <td>{{ year(rec.firstDate) }}</td>
                    <td>{{ year(rec.lastDate) }}</td>
                    <td>{{ rec.recordsVolume }}</td>
                    <td class="col-text clamp-cell" [title]="rec.remarks">{{ rec.remarks }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      @if (myCounterBlock(); as block) {
        <div class="card mb-3 border-primary">
          <div class="card-body p-4">
            <div class="section-header"><i class="bi bi-pen"></i>{{ i18n.t('request.sig_' + block) }} — {{ i18n.t('request.signHere') }}</div>
            <!-- Deliberately the same col-md-3 width as the 4 read-only boxes below: the signature
                 pad's canvas captures its image at whatever width it's drawn in but a fixed height,
                 so signing in a full-width box here would save a very wide/flat image that then
                 looks squashed once displayed at the narrower width those boxes use. -->
            <div class="col-md-3">
              <app-signature-pad name="counterSignature" [(ngModel)]="counterSignatureDraft"></app-signature-pad>
            </div>
            <button class="btn btn-primary mt-3" (click)="signCounter()" [disabled]="signingCounter() || !counterSignatureDraft">
              @if (signingCounter()) {
                <span class="spinner-border spinner-border-sm me-1"></span>
              } @else {
                <i class="bi bi-check-lg me-1"></i>
              }{{ i18n.t('request.sign') }}
            </button>
          </div>
        </div>
      }

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
                      <!-- Fixed height + object-fit:contain instead of plain img-fluid: a saved
                           signature can have any aspect ratio (e.g. an older one saved from a wider
                           box), and without this every box would render a different height instead
                           of the uniform grid these 4 cards are meant to look like. -->
                      <img [src]="b.value?.signature" class="border rounded"
                           style="width:100%;height:110px;object-fit:contain;background:#fff;"
                           [alt]="i18n.t('request.signature')">
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
  `,
  styles: [`
    table.numbered-lines { border-collapse: collapse; width: 100%; }
    table.numbered-lines td { padding: 0 0 4px; vertical-align: top; border: none; }
    table.numbered-lines td.num { width: 1.5em; padding-inline-end: 4px; color: var(--dune, #6c757d); white-space: nowrap; }
  `]
})
export class RequestDetailsComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);

  readonly details = signal<RequestDetails | null>(null);
  readonly saving = signal(false);
  readonly downloadingPdf = signal(false);
  readonly downloadingDocx = signal(false);
  readonly togglingDestroyed = signal(false);
  readonly signingCounter = signal(false);
  notesDraft = '';
  counterSignatureDraft: string | null = null;
  private readonly id: number;

  constructor() {
    this.id = +this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  private load(): void {
    firstValueFrom(this.api.getRequest(this.id)).then(d => {
      this.details.set(d);
      this.notesDraft = d.adminNotes ?? '';
    });
  }

  backLink(): string[] {
    if (this.auth.isAdmin()) return ['/admin/submissions'];
    if (this.auth.isCounterSigner()) return ['/requests/pending-signature'];
    return ['/requests'];
  }

  async downloadPdf(): Promise<void> {
    const r = this.details();
    if (!r || this.downloadingPdf()) return;
    this.downloadingPdf.set(true);
    try {
      const blob = await firstValueFrom(this.api.downloadRequestPdf(r.id));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const noPart = (r.destructionNo ?? String(r.id)).replace(/[\\/]/g, '-');
      a.href = url; a.download = `استمارة إتلاف رقم ${noPart}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } finally {
      this.downloadingPdf.set(false);
    }
  }

  async downloadDocx(): Promise<void> {
    const r = this.details();
    if (!r || this.downloadingDocx()) return;
    this.downloadingDocx.set(true);
    try {
      const blob = await firstValueFrom(this.api.downloadRequestDocx(r.id));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const noPart = (r.destructionNo ?? String(r.id)).replace(/[\\/]/g, '-');
      a.href = url; a.download = `استمارة إتلاف رقم ${noPart}.docx`; a.click();
      URL.revokeObjectURL(url);
    } finally {
      this.downloadingDocx.set(false);
    }
  }

  async decide(status: 'Approved' | 'Rejected'): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.updateStatus(this.id, status, this.notesDraft || undefined));
      this.load();
    } finally {
      this.saving.set(false);
    }
  }

  bothCounterSigned(r: RequestDetails): boolean {
    return !!r.legalAffairs?.signature && !!r.internalAudit?.signature;
  }

  async toggleDestroyed(): Promise<void> {
    if (this.togglingDestroyed()) return;
    this.togglingDestroyed.set(true);
    try {
      await firstValueFrom(this.api.toggleDestroyed(this.id));
      this.load();
    } finally {
      this.togglingDestroyed.set(false);
    }
  }

  /** Which signature block (if any) the logged-in account still needs to sign on this request —
   * null once it's not their turn (wrong role, not yet Approved, or they already signed). */
  myCounterBlock(): 'legalAffairs' | 'internalAudit' | null {
    const r = this.details();
    if (!r || r.status !== 'Approved') return null;
    if (this.auth.hasRole('LegalAffairs') && !r.legalAffairs?.signature) return 'legalAffairs';
    if (this.auth.hasRole('InternalAudit') && !r.internalAudit?.signature) return 'internalAudit';
    return null;
  }

  async signCounter(): Promise<void> {
    if (this.signingCounter() || !this.counterSignatureDraft) return;
    this.signingCounter.set(true);
    try {
      await firstValueFrom(this.api.signCounterSignature(this.id, this.counterSignatureDraft));
      this.counterSignatureDraft = null;
      this.load();
    } finally {
      this.signingCounter.set(false);
    }
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
    return d ? String(new Date(d).getFullYear()) : '/';
  }

  /** How many numbers a records title consumes from the running, per-request item count — 1 for a
   * plain/empty title, or the number of non-blank lines for a multi-school list. */
  private itemCount(text?: string | null): number {
    if (!text) return 1;
    const count = text.split('\n').filter(l => l.trim().length > 0).length;
    return Math.max(count, 1);
  }

  /** The number a given record's list should start counting from — the running total of every
   * record before it in the same request, so a later list continues (e.g. 3, 4, 5...) instead of
   * restarting at 1. */
  startNumberFor(records: { recordsTitle?: string | null }[], index: number): number {
    let n = 1;
    for (let i = 0; i < index; i++) n += this.itemCount(records[i].recordsTitle);
    return n;
  }

  /** The printed "#" column always comes from the running count above, never from the record's own
   * serialNo — serialNo only reflects this record's position among records, not among printed rows,
   * so a single-item record after a multi-school one would otherwise show a smaller number than the
   * rows just above it. A multi-school record has no row of its own (its schools are numbered inline
   * in the title column instead), so it shows the whole range it consumed. */
  displaySerial(records: { recordsTitle?: string | null }[], index: number): string {
    const start = this.startNumberFor(records, index);
    const count = this.itemCount(records[index].recordsTitle);
    return count > 1 ? `${start}-${start + count - 1}` : String(start);
  }

  /** A records title can list several items (e.g. several schools) sharing one row — one per line.
   * Returns them as {n, text} pairs, numbered from startNumber, to render as two aligned columns;
   * null for a single-line/empty title, which isn't a list and stays as ordinary plain text. */
  splitNumbered(text: string | null | undefined, startNumber: number): { n: number; text: string }[] | null {
    if (!text) return null;
    // A blank line (e.g. Enter pressed twice between schools, for spacing while typing) isn't a
    // separate item — without filtering it out, it silently ate a number of its own.
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    return lines.length <= 1 ? null : lines.map((l, i) => ({ n: startNumber + i, text: l }));
  }

  private readonly typeKeys: Record<string, string> = {
    Files: 'typeFiles', Registers: 'typeRegisters', Maps: 'typeMaps',
    'Engineering Designs': 'typeEngineering', Photos: 'typePhotos',
    Booklets: 'typeBooklets', Books: 'typeBooks'
  };
  private readonly mediumKeys: Record<string, string> = {
    Paper: 'mediumPaper', Electronic: 'mediumElectronic', 'Audio-Visual': 'mediumAV'
  };

  typeLabel(v?: string | null): string {
    if (!v) return '';
    const key = this.typeKeys[v];
    return key ? this.i18n.t('request.' + key) : v.trim();
  }
  mediumLabel(v?: string | null): string {
    if (!v) return '';
    const key = this.mediumKeys[v];
    return key ? this.i18n.t('request.' + key) : v.trim();
  }
  copyLabel(v?: string | null): string {
    if (v === 'Original') return this.i18n.t('request.original');
    if (v === 'Copy') return this.i18n.t('request.copy');
    return v ?? '';
  }

  badge(status: string): string {
    return { Approved: 'badge bg-success badge-status', Rejected: 'badge bg-danger badge-status',
             Submitted: 'badge bg-primary badge-status', Draft: 'badge bg-warning badge-status' }[status]
           ?? 'badge bg-secondary badge-status';
  }
}
