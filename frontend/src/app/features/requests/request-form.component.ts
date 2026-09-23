import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';
import { DepartmentNode, SaveDestructionRequestDto, UnitNode } from '../../core/models';
import { SignaturePadComponent } from '../../shared/signature-pad.component';

const QATAR_PHONE = /^(\+974|974)?[34567]\d{7}$/;

const RECORD_TYPES = ['Files', 'Registers', 'Maps', 'Engineering Designs', 'Photos', 'Booklets', 'Books'];
const STORAGE_MEDIA = ['Paper', 'Electronic', 'Audio-Visual'];
/** Schools have no fixed sub-department list — the section field becomes free text for the school's name. */
const SCHOOL_UNIT_NAME = 'المدارس';

/** Fixed list from the original system (values stored as-is). */
const STORAGE_LOCATIONS = [
  'وزارة التربية والتعليم-الثمامة',
  'برج الوزارة-الخليج الغربي',
  'وزارة التربية و التعليم-لقطيفية',
  'مدرسة زبيدة الابتدائية للبنات (سابقا)-الهلال',
  'مخزن المدرسة'
];

@Component({
  selector: 'app-request-form',
  imports: [ReactiveFormsModule, RouterLink, SignaturePadComponent],
  template: `
    @if (submittedOk()) {
      <div class="card">
        <div class="card-body p-5 text-center">
          <i class="bi bi-check-circle-fill" style="font-size:3rem;color:var(--palm);"></i>
          @if (auth.isAdmin() && editId()) {
            <h4 class="mt-3" style="color:var(--maroon);">{{ i18n.t('request.updatedTitle') }}</h4>
          } @else {
            <h4 class="mt-3" style="color:var(--maroon);">{{ i18n.t('request.thankYouTitle') }}</h4>
            <p class="text-muted">{{ i18n.t('request.thankYouMessage') }}</p>
          }
          <div class="d-flex justify-content-center gap-2 mt-4">
            <a class="btn btn-primary" [routerLink]="['/requests', submittedOk()]">{{ i18n.t('request.viewRequest') }}</a>
            <a class="btn btn-outline-secondary" [routerLink]="auth.isAdmin() ? ['/admin/submissions'] : ['/requests']">
              {{ auth.isAdmin() ? i18n.t('nav.allSubmissions') : i18n.t('nav.myRequests') }}
            </a>
          </div>
        </div>
      </div>
    } @else {
    <form [formGroup]="form" novalidate>
      <!-- SECTION 1 -->
      <div class="card mb-4">
        <div class="card-body p-4">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label" for="ConcernedParty">{{ i18n.t('request.concernedParty') }} <span class="text-danger">*</span></label>
              <input id="ConcernedParty" class="form-control readonly-field" formControlName="concernedParty" readonly>
            </div>
            <div class="col-md-6">
              <label class="form-label" for="DestructionNo">{{ i18n.t('request.destructionNo') }}</label>
              <input id="DestructionNo" class="form-control readonly-field" formControlName="destructionNo" readonly
                     [placeholder]="i18n.t('request.destructionNoPending')">
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION 2 : Administrative Unit -->
      <div class="card mb-4">
        <div class="card-body p-4">
          <div class="section-header"><i class="bi bi-building"></i>{{ i18n.t('request.adminUnit') }}</div>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label" for="UnitSelect">{{ i18n.t('request.department') }} <span class="text-danger">*</span></label>
              <select id="UnitSelect" class="form-control"
                      [class.field-invalid]="submitAttempted() && selectedUnitId() === ''"
                      (change)="pickUnit($event)">
                <option value="" [selected]="selectedUnitId() === ''">-- {{ i18n.t('request.selectDepartment') }} --</option>
                @for (u of rootUnits(); track u.id) { <option [value]="u.id" [selected]="u.id === selectedUnitId()">{{ u.name }}</option> }
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label" for="SubSubSelect">{{ i18n.t('request.section') }}</label>
              @if (isSchoolUnit()) {
                <input id="SubSubSelect" class="form-control"
                       [class.field-invalid]="submitAttempted() && !schoolName().trim()"
                       [value]="schoolName()" (input)="pickSchoolName($event)"
                       [placeholder]="i18n.t('request.schoolNamePlaceholder')">
              } @else {
                <select id="SubSubSelect" class="form-control" (change)="pickSection($event)">
                  <option value="" [selected]="selectedSectionId() === ''">-- {{ i18n.t('request.selectSection') }} --</option>
                  @for (u of sections(); track u.id) { <option [value]="u.id" [selected]="u.id === selectedSectionId()">{{ u.name }}</option> }
                </select>
              }
            </div>
            <div class="col-md-6">
              <label class="form-label" for="ResponsibleOfficer">{{ i18n.t('request.responsibleOfficer') }} <span class="text-danger">*</span></label>
              <input id="ResponsibleOfficer" class="form-control" formControlName="responsibleOfficer" [class.field-invalid]="invalid('responsibleOfficer')">
            </div>
            <div class="col-md-6">
              <label class="form-label" for="Email">{{ i18n.t('request.email') }} <span class="text-danger">*</span></label>
              <input id="Email" type="email" class="form-control" formControlName="email" dir="ltr" [class.field-invalid]="invalid('email')">
            </div>
            <div class="col-md-6">
              <label class="form-label" for="Phone">{{ i18n.t('request.phone') }} <span class="text-danger">*</span></label>
              <input id="Phone" class="form-control" formControlName="phone" dir="ltr" style="text-align:right;"
                     [placeholder]="i18n.t('request.phonePlaceholder')" [class.field-invalid]="invalid('phone')">
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION 3 : Records data -->
      <div class="card mb-4">
        <div class="card-body p-4">
          <div class="section-header"><i class="bi bi-archive"></i>{{ i18n.t('request.recordsData') }}</div>
          <div class="row g-3">
            <div class="col-12">
              <label class="form-label" for="StorageLocation">{{ i18n.t('request.storageLocation') }} <span class="text-danger">*</span></label>
              <select id="StorageLocation" class="form-control"
                      [value]="storageSelect()" (change)="setStorageChoice($event)"
                      [class.field-invalid]="invalid('storageLocation')">
                <option value="">-- {{ i18n.t('request.selectStorage') }} --</option>
                @for (loc of storageLocations; track loc) { <option [value]="loc">{{ loc }}</option> }
                <option value="Other">{{ i18n.t('request.other') }}</option>
              </select>
              @if (storageSelect() === 'Other') {
                <input class="form-control mt-2" [placeholder]="i18n.t('request.specifyStorage')"
                       [value]="otherValue(form, 'storageLocation', storageLocations)"
                       (input)="setOther(form, 'storageLocation', $event)">
              }
            </div>
            <div class="col-md-4">
              <label class="form-label" for="TotalVolume">{{ i18n.t('request.totalVolume') }} <span class="text-danger">*</span></label>
              <input id="TotalVolume" type="number" step="0.01" min="0" class="form-control" formControlName="totalVolume"
                     [placeholder]="i18n.t('request.totalVolumePlaceholder')" [class.field-invalid]="invalid('totalVolume')">
            </div>
            <div class="col-md-4">
              <label class="form-label" for="FirstYear">{{ i18n.t('request.firstDate') }}</label>
              <input id="FirstYear" type="number" class="form-control" formControlName="firstYear"
                     [placeholder]="i18n.t('request.yearExampleFirst')" min="1900" max="2100" [class.field-invalid]="invalid('firstYear')">
            </div>
            <div class="col-md-4">
              <label class="form-label" for="LastYear">{{ i18n.t('request.lastDate') }}</label>
              <input id="LastYear" type="number" class="form-control" formControlName="lastYear"
                     [placeholder]="i18n.t('request.yearExampleLast')" min="1900" max="2100" [class.field-invalid]="invalid('lastYear')">
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION 4 : Records table -->
      <div class="card mb-4">
        <div class="card-body p-4">
          <div class="section-header"><i class="bi bi-table"></i>{{ i18n.t('request.recordsList') }}</div>
          <div class="alert alert-info py-2 small mb-3">
            <span>{{ i18n.t('request.rowsHint') }} </span>
            <a href="https://canva.link/ubx966f45d69z7j" target="_blank"
               style="color:var(--skyline);font-weight:600;">{{ i18n.t('request.rowsHintLink') }}</a>
          </div>
          <div class="table-responsive">
            <table class="table table-bordered records-table align-middle">
              <thead>
                <tr class="text-center" style="vertical-align:middle;">
                  <th style="width:60px;padding:10px 6px;line-height:1.6;">
                    {{ i18n.t('request.serialNo') }}<br><small>No.</small>
                  </th>
                  <th style="min-width:180px;padding:10px 6px;line-height:1.6;">
                    {{ i18n.t('request.recordsTitle') }} <span style="color:var(--gold-light);">*</span><br><small>Records Title/Description</small>
                  </th>
                  <th style="width:95px;padding:10px 6px;line-height:1.6;">
                    {{ i18n.t('request.originalOrCopy') }} <span style="color:var(--gold-light);">*</span><br><small>Original | Copy</small>
                  </th>
                  <th style="width:140px;padding:10px 6px;line-height:1.4;white-space:normal;font-size:0.68rem;">
                    {{ i18n.t('request.recordsType') }} <span style="color:var(--gold-light);">*</span><br><small style="font-size:0.62rem;">Records Type</small>
                  </th>
                  <th style="width:140px;padding:10px 6px;line-height:1.4;white-space:normal;font-size:0.68rem;">
                    {{ i18n.t('request.storageMedium') }} <span style="color:var(--gold-light);">*</span><br><small style="font-size:0.62rem;">Records Storage Medium</small>
                  </th>
                  <th style="width:105px;padding:10px 6px;line-height:1.4;white-space:normal;font-size:0.68rem;">
                    {{ i18n.t('request.retentionRuleNo') }}<br><small style="font-size:0.62rem;">Records Retention Rule No. in R.R.D.S</small>
                  </th>
                  <th style="width:90px;padding:10px 6px;line-height:1.6;">
                    {{ i18n.t('request.firstYear') }}<br><small>First Date</small>
                  </th>
                  <th style="width:90px;padding:10px 6px;line-height:1.6;">
                    {{ i18n.t('request.lastYear') }}<br><small>Last Date</small>
                  </th>
                  <th style="width:80px;padding:10px 6px;line-height:1.6;">
                    {{ i18n.t('request.recordsVolume') }} <span style="color:var(--gold-light);">*</span><br><small>Records Volume (in linear meter)</small>
                  </th>
                  <th style="min-width:130px;padding:10px 6px;line-height:1.6;">
                    {{ i18n.t('request.remarks') }}<br><small>Remarks</small>
                  </th>
                  <th style="width:50px;padding:10px 6px;"></th>
                </tr>
              </thead>
              <tbody formArrayName="records">
                @for (rec of records.controls; track rec; let i = $index) {
                  <tr [formGroupName]="i">
                    <td class="text-center fw-bold">{{ i + 1 }}</td>
                    <td><textarea class="form-control form-control-sm" rows="1" style="resize:vertical;min-height:calc(1.5em + 0.5rem + 2px);" formControlName="recordsTitle" [placeholder]="i18n.t('request.recordsTitlePlaceholder')" [class.field-invalid]="recordInvalid(rec, 'recordsTitle')"></textarea></td>
                    <td>
                      <select class="form-select form-select-sm" formControlName="originalOrCopy" [class.field-invalid]="recordInvalid(rec, 'originalOrCopy')">
                        <option value="">—</option>
                        <option value="Original">{{ i18n.t('request.original') }}</option>
                        <option value="Copy">{{ i18n.t('request.copy') }}</option>
                      </select>
                    </td>
                    <td>
                      <div style="display:flex;gap:5px">
                        <select class="form-select form-select-sm" style="flex:2;" [class.field-invalid]="recordInvalid(rec, 'recordsType')"
                                [value]="typeSelect(rec)" (change)="setTypeChoice(rec, $event)" (blur)="rec.get('recordsType')!.markAsTouched()">
                          <option value="">—</option>
                          <option value="Files">{{ i18n.t('request.typeFiles') }}</option>
                          <option value="Registers">{{ i18n.t('request.typeRegisters') }}</option>
                          <option value="Maps">{{ i18n.t('request.typeMaps') }}</option>
                          <option value="Engineering Designs">{{ i18n.t('request.typeEngineering') }}</option>
                          <option value="Photos">{{ i18n.t('request.typePhotos') }}</option>
                          <option value="Booklets">{{ i18n.t('request.typeBooklets') }}</option>
                          <option value="Books">{{ i18n.t('request.typeBooks') }}</option>
                          <option value="Other">{{ i18n.t('request.other') }}</option>
                        </select>
                        @if (typeSelect(rec) === 'Other') {
                          <input class="form-control form-control-sm" style="flex:1;"
                                 [placeholder]="i18n.t('request.specifyType')"
                                 [value]="otherValue(rec, 'recordsType', recordTypes)"
                                 (input)="setOther(rec, 'recordsType', $event)">
                        }
                      </div>
                    </td>
                    <td>
                      <div style="display:flex;gap:5px">
                        <select class="form-select form-select-sm" style="flex:2;" [class.field-invalid]="recordInvalid(rec, 'storageMedium')"
                                [value]="mediumSelect(rec)" (change)="setMediumChoice(rec, $event)" (blur)="rec.get('storageMedium')!.markAsTouched()">
                          <option value="">—</option>
                          <option value="Paper">{{ i18n.t('request.mediumPaper') }}</option>
                          <option value="Electronic">{{ i18n.t('request.mediumElectronic') }}</option>
                          <option value="Audio-Visual">{{ i18n.t('request.mediumAV') }}</option>
                          <option value="Other">{{ i18n.t('request.other') }}</option>
                        </select>
                        @if (mediumSelect(rec) === 'Other') {
                          <input class="form-control form-control-sm" style="flex:1;"
                                 [placeholder]="i18n.t('request.specifyMedium')"
                                 [value]="otherValue(rec, 'storageMedium', storageMedia)"
                                 (input)="setOther(rec, 'storageMedium', $event)">
                        }
                      </div>
                    </td>
                    <td><input class="form-control form-control-sm" formControlName="retentionRuleNo" [placeholder]="i18n.t('request.ruleNoPlaceholder')"></td>
                    <td><input type="number" class="form-control form-control-sm" formControlName="firstYear" placeholder="2020" min="1900" max="2100" [class.field-invalid]="recordInvalid(rec, 'firstYear')"></td>
                    <td><input type="number" class="form-control form-control-sm" formControlName="lastYear" placeholder="2024" min="1900" max="2100" [class.field-invalid]="recordInvalid(rec, 'lastYear')"></td>
                    <td><input type="number" step="0.01" min="0" class="form-control form-control-sm" formControlName="recordsVolume" placeholder="0.00" [class.field-invalid]="recordInvalid(rec, 'recordsVolume')"></td>
                    <td><input class="form-control form-control-sm" formControlName="remarks" [placeholder]="i18n.t('request.remarks')"></td>
                    <td class="text-center">
                      <button type="button" class="btn btn-outline-danger btn-sm" (click)="removeRecord(i)"><i class="bi bi-trash"></i></button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <button type="button" class="btn btn-outline-primary btn-sm mt-2" (click)="addRecord()">{{ i18n.t('request.addRecord') }}</button>
        </div>
      </div>

      <!-- SECTION 5 : Signatures -->
      <div class="card mb-4">
        <div class="card-body p-4">
          <div class="section-header"><i class="bi bi-pen"></i>{{ i18n.t('request.signatures') }}</div>
          <div class="alert alert-warning py-2 small mb-3">{{ i18n.t('request.drawSignature') }}</div>
          <div class="row g-3">
            @for (block of signatureBlocks; track block.key) {
              <div class="col-md-3" [formGroupName]="block.key">
                <div class="card border">
                  <div class="card-header bg-light py-2 text-center">
                    <div class="fw-bold small">{{ i18n.t('request.sig_' + block.key) }}</div>
                  </div>
                  <div class="card-body p-3">
                    <div class="mb-2">
                      <label class="form-label mb-1" style="font-size:0.75rem;">{{ i18n.t('request.name') }}</label>
                      <input class="form-control form-control-sm" formControlName="name">
                    </div>
                    <div class="mb-2">
                      <label class="form-label mb-1" style="font-size:0.75rem;">{{ i18n.t('request.date') }}</label>
                      <input type="date" class="form-control form-control-sm" formControlName="date" lang="en-GB">
                    </div>
                    <div>
                      <label class="form-label mb-1" style="font-size:0.75rem;">
                        {{ i18n.t('request.signature') }}
                        @if (block.key === 'creatorUnit') { <span class="text-danger">*</span> }
                      </label>
                      <div [class.field-invalid]="block.key === 'creatorUnit' && invalid('creatorUnit.signature')">
                        <app-signature-pad formControlName="signature" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- SUBMIT -->
      @if (message()) { <div class="alert alert-danger mb-3">{{ i18n.t(message()!) }}</div> }
      <div class="card">
        <div class="card-body p-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <small class="text-muted">{{ i18n.t('request.requiredNote') }}</small>
          <div class="d-flex gap-2 flex-wrap">
            <button type="button" class="btn btn-sm" (click)="cancel()"
               style="background:rgba(221,120,119,0.15);color:#9e3535;border:1px solid rgba(221,120,119,0.5);">
              <i class="bi bi-x me-1"></i>{{ i18n.t('common.cancel') }}
            </button>
            @if (!auth.isAdmin() || !editId()) {
              <button type="button" class="btn btn-sm" [disabled]="busy()" (click)="submit(true)"
                      style="background:#e9c56b;border-color:#c9a800;color:#333;font-weight:600;">
                <i class="bi bi-save me-1"></i>{{ i18n.t('request.completeLater') }}
              </button>
            }
            <button type="button" class="btn btn-primary btn-sm px-4" [disabled]="busy()" (click)="submit(false)">
              <i class="bi bi-send me-1"></i>{{ i18n.t('request.submit') }}
            </button>
          </div>
        </div>
      </div>
    </form>
    }
  `
})
export class RequestFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly i18n = inject(I18nService);

  readonly recordTypes = RECORD_TYPES;
  readonly storageMedia = STORAGE_MEDIA;
  readonly storageLocations = STORAGE_LOCATIONS;

  readonly departments = signal<DepartmentNode[]>([]);
  readonly selectedUnitId = signal<number | ''>('');
  readonly selectedSectionId = signal<number | ''>('');
  readonly schoolName = signal('');
  readonly isSchoolUnit = computed(() => this.rootUnits().find(u => u.id === this.selectedUnitId())?.name === SCHOOL_UNIT_NAME);
  readonly busy = signal(false);
  readonly message = signal<string | null>(null);
  readonly submitAttempted = signal(false);
  /** Holds the submitted request's id (truthy) once a final (non-draft) submission succeeds. */
  readonly submittedOk = signal<number | null>(null);
  readonly editId = signal<number | null>(null);

  // Legal Affairs / Internal Audit are shown here as read-only placeholders (matching the paper
  // form's 4-box layout) but are never editable through this form — the backend ignores them here
  // regardless — only via the dedicated counter-signature action on the request-details page, by
  // the two accounts that own those roles. See disabling below in the constructor.
  readonly signatureBlocks = [
    { key: 'creatorUnit' }, { key: 'legalAffairs' }, { key: 'internalAudit' }, { key: 'recordsManagement' }
  ] as const;

  readonly form: FormGroup = this.fb.group({
    concernedParty: ['وزارة التربية والتعليم والتعليم العالي', Validators.required],
    destructionNo: [''],
    department: ['', Validators.required],
    responsibleOfficer: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(QATAR_PHONE)]],
    storageLocation: ['', Validators.required],
    totalVolume: [null as number | null, Validators.required],
    firstYear: [null as number | null],
    lastYear: [null as number | null],
    creatorUnit: this.signatureGroup(true),
    legalAffairs: this.signatureGroup(),
    internalAudit: this.signatureGroup(),
    recordsManagement: this.signatureGroup(),
    records: this.fb.array([] as FormGroup[])
  });

  get records(): FormArray<FormGroup> { return this.form.get('records') as FormArray<FormGroup>; }

  /** Root units across all departments — mirrors the old "UnitSelect". */
  rootUnits(): UnitNode[] {
    return this.departments().flatMap(d => d.units);
  }
  sections(): UnitNode[] {
    const id = this.selectedUnitId();
    return id === '' ? [] : (this.rootUnits().find(u => u.id === id)?.children ?? []);
  }

  constructor() {
    this.load();
    // The submitting employee only signs on behalf of their own Creator Unit — Records Management
    // is filled in later by the admin, acting on their own behalf, during the approval workflow.
    if (!this.auth.isAdmin()) {
      this.form.get('recordsManagement')?.disable();
    } else if (this.editId()) {
      // Conversely, an admin reviewing/editing an existing request must not be able to alter or
      // erase the original submitter's own Creator Unit signature — that's theirs, not the admin's.
      this.form.get('creatorUnit')?.disable();
    }
    // Legal Affairs / Internal Audit are always disabled here, for every role including Admin —
    // they're display-only placeholders. Those two boxes are only ever written via the dedicated
    // counter-signature endpoint, signed in person by the account that owns that role, on the
    // request-details page once the request is Approved (InfoSec finding #4).
    this.form.get('legalAffairs')?.disable();
    this.form.get('internalAudit')?.disable();
    // "New Request" links point at the same "/requests/new" URL as this route: after a
    // submission (submittedOk set), clicking it again is a same-URL navigation, which Angular
    // would otherwise ignore — reset back to a fresh form instead of leaving the thank-you screen up.
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef))
      )
      .subscribe(() => {
        if (this.submittedOk() !== null && !this.route.snapshot.paramMap.get('id')) {
          this.resetForNewRequest();
        }
      });
  }

  private async resetForNewRequest(): Promise<void> {
    this.submittedOk.set(null);
    this.editId.set(null);
    this.message.set(null);
    this.submitAttempted.set(false);
    this.form.reset({ concernedParty: 'وزارة التربية والتعليم والتعليم العالي' });
    this.records.clear();
    await this.initNewRequest();
  }

  private async load(): Promise<void> {
    // Set synchronously (before any await) so templates gated on editId() — e.g. hiding "Complete
    // Later" for admin edits — are correct on the very first render, not just after data arrives.
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) this.editId.set(+idParam);

    this.departments.set(await firstValueFrom(this.api.departmentsTree()));

    if (idParam) {
      const d = await firstValueFrom(this.api.getRequest(+idParam));
      // Once submitted, a request can only be edited again if it was rejected (revision requested) or is still a draft.
      if (!this.auth.isAdmin() && d.status !== 'Draft' && d.status !== 'Rejected') {
        this.router.navigate(['/requests', +idParam]);
        return;
      }
      for (const _ of d.records) this.addRecord();
      this.form.patchValue({
        concernedParty: d.concernedParty,
        destructionNo: d.destructionNo,
        department: d.department,
        responsibleOfficer: d.responsibleOfficer,
        email: d.email,
        phone: d.phone,
        storageLocation: d.storageLocation,
        totalVolume: d.totalVolume,
        firstYear: this.year(d.recordsFirstDate),
        lastYear: this.year(d.recordsLastDate),
        creatorUnit: this.sigIn(d.creatorUnit),
        legalAffairs: this.sigIn(d.legalAffairs),
        internalAudit: this.sigIn(d.internalAudit),
        recordsManagement: this.sigIn(d.recordsManagement),
        records: d.records.map(r => ({
          recordsTitle: r.recordsTitle, originalOrCopy: r.originalOrCopy,
          recordsType: r.recordsType, storageMedium: r.storageMedium,
          retentionRuleNo: r.retentionRuleNo,
          firstYear: this.year(r.firstDate), lastYear: this.year(r.lastDate),
          recordsVolume: r.recordsVolume, remarks: r.remarks
        }))
      });
      this.preselectDepartment(d.department);
    } else {
      await this.initNewRequest();
    }
  }

  private async initNewRequest(): Promise<void> {
    this.selectedUnitId.set('');
    this.selectedSectionId.set('');
    this.schoolName.set('');
    // No real destruction number yet — the server assigns one only once the request is actually
    // submitted (not saved as a draft), so an abandoned draft never burns a number out of the sequence.
    this.addRecord();
  }

  /** Cancel discards in-progress edits: a brand-new (unsaved) request just resets to a fresh blank form. */
  async cancel(): Promise<void> {
    if (this.editId()) {
      this.router.navigate(this.auth.isAdmin() ? ['/admin/submissions'] : ['/requests']);
      return;
    }
    this.message.set(null);
    this.form.reset({ concernedParty: 'وزارة التربية والتعليم والتعليم العالي' });
    this.records.clear();
    await this.initNewRequest();
  }

  /** Restores the unit/section (and school-name) selection from a saved "department" string.
   * Handles both formats seen across the app: this form's own "Unit - Section" (2-part), and the
   * legacy "Department - Unit - Section" (3-part) carried over from a user's profile — by trying
   * each part in turn as the unit name instead of assuming a fixed position. */
  private preselectDepartment(dept: string | null | undefined): void {
    if (!dept) return;
    const parts = dept.split(' - ').map(p => p.trim());
    for (let i = 0; i < parts.length; i++) {
      const unit = this.rootUnits().find(u => u.name === parts[i]);
      if (!unit) continue;
      this.selectedUnitId.set(unit.id);
      const rest = parts.slice(i + 1);
      if (rest.length === 0) return;
      if (unit.name === SCHOOL_UNIT_NAME) {
        this.schoolName.set(rest.join(' - '));
      } else {
        const section = unit.children.find(c => c.name === rest[0]);
        if (section) this.selectedSectionId.set(section.id);
      }
      return;
    }
  }

  pickUnit(e: Event): void {
    const v = (e.target as HTMLSelectElement).value;
    this.selectedUnitId.set(v ? +v : '');
    this.selectedSectionId.set('');
    this.schoolName.set('');
    this.syncDepartment();
  }
  pickSection(e: Event): void {
    const v = (e.target as HTMLSelectElement).value;
    this.selectedSectionId.set(v ? +v : '');
    this.syncDepartment();
  }
  pickSchoolName(e: Event): void {
    this.schoolName.set((e.target as HTMLInputElement).value);
    this.syncDepartment();
  }
  private syncDepartment(): void {
    const unit = this.rootUnits().find(u => u.id === this.selectedUnitId());
    const section = this.isSchoolUnit() ? this.schoolName() : this.sections().find(s => s.id === this.selectedSectionId())?.name;
    this.form.patchValue({ department: [unit?.name, section].filter(Boolean).join(' - ') });
  }

  addRecord(): void {
    this.records.push(this.fb.group({
      recordsTitle: ['', Validators.required], originalOrCopy: ['', Validators.required],
      recordsType: ['', Validators.required], storageMedium: ['', Validators.required],
      retentionRuleNo: [''],
      firstYear: [null as number | null], lastYear: [null as number | null],
      recordsVolume: [null as number | null, Validators.required], remarks: ['']
    }));
  }
  /** Fields whose emptiness always turns them red immediately, draft or not — the volume matters
   * enough to flag right away, even though (like the dates) it doesn't block saving as a draft. */
  private readonly alwaysStrictFields = new Set(['totalVolume', 'recordsVolume']);

  /** A control failing only because it's empty ("required") shouldn't turn red until a final
   * submit was actually attempted — a draft is allowed to leave it blank. A control failing on
   * anything else (format, e.g. email/phone), or listed in alwaysStrictFields, always turns red
   * once touched, draft or not. */
  private isInvalidToShow(c: { invalid: boolean; touched: boolean; dirty: boolean; errors: Record<string, unknown> | null } | null, name: string): boolean {
    if (!c || !c.invalid || !(c.touched || c.dirty)) return false;
    if (this.alwaysStrictFields.has(name)) return true;
    const onlyRequired = Object.keys(c.errors ?? {}).every(k => k === 'required');
    return this.submitAttempted() || !onlyRequired;
  }

  recordInvalid(rec: FormGroup, name: string): boolean {
    return this.isInvalidToShow(rec.get(name), name);
  }
  removeRecord(i: number): void { this.records.removeAt(i); }

  // ── "Other" logic for the storage location select ──
  storageSelect(): string {
    const v = (this.form.get('storageLocation')!.value as string) ?? '';
    return !v ? '' : STORAGE_LOCATIONS.includes(v) ? v : 'Other';
  }
  setStorageChoice(e: Event): void {
    const v = (e.target as HTMLSelectElement).value;
    this.form.patchValue({ storageLocation: v === 'Other' ? ' ' : v });
    this.form.get('storageLocation')!.markAsTouched();
  }

  // ── "Other" logic for type/medium selects (same UX as the old form) ──
  typeSelect(rec: FormGroup): string {
    const v = (rec.get('recordsType')!.value as string) ?? '';
    return !v ? '' : RECORD_TYPES.includes(v) ? v : 'Other';
  }
  mediumSelect(rec: FormGroup): string {
    const v = (rec.get('storageMedium')!.value as string) ?? '';
    return !v ? '' : STORAGE_MEDIA.includes(v) ? v : 'Other';
  }
  setTypeChoice(rec: FormGroup, e: Event): void {
    const v = (e.target as HTMLSelectElement).value;
    rec.patchValue({ recordsType: v === 'Other' ? ' ' : v });
  }
  setMediumChoice(rec: FormGroup, e: Event): void {
    const v = (e.target as HTMLSelectElement).value;
    rec.patchValue({ storageMedium: v === 'Other' ? ' ' : v });
  }
  otherValue(rec: FormGroup, field: string, known: string[]): string {
    const v = ((rec.get(field)!.value as string) ?? '');
    return known.includes(v) ? '' : v.trim();
  }
  setOther(rec: FormGroup, field: string, e: Event): void {
    rec.patchValue({ [field]: (e.target as HTMLInputElement).value || ' ' });
  }

  invalid(name: string): boolean {
    return this.isInvalidToShow(this.form.get(name), name);
  }

  /** A draft may leave required fields empty, but any field that does have a value must still be
   * correctly formatted — drafts skip completeness, not correctness. Email and phone are the only
   * two controls in this form with an actual format validator (everything else is plain "required"
   * or unvalidated free text/signature/date fields), so check exactly those two rather than walking
   * the whole form tree — a generic walk risks tripping on unrelated controls (e.g. a disabled
   * signature block) for no reason. */
  private hasFormatErrors(): boolean {
    const isFormatInvalid = (name: string): boolean => {
      const errors = this.form.get(name)?.errors;
      return !!errors && Object.keys(errors).some(k => k !== 'required');
    };
    return isFormatInvalid('email') || isFormatInvalid('phone');
  }

  /** Walks the whole form tree (including the records rows) looking for any invalid control whose
   * failure isn't just "required" — e.g. a record's first/last year outside 1900–2100. Used to pick
   * an accurate error banner on final submit: "fill required fields" is misleading when the real
   * problem is a value that's present but out of range/format. */
  private hasAnyNonRequiredError(ctrl: AbstractControl = this.form): boolean {
    if (ctrl instanceof FormGroup || ctrl instanceof FormArray) {
      return Object.values(ctrl.controls).some(c => this.hasAnyNonRequiredError(c));
    }
    return !!ctrl.errors && Object.keys(ctrl.errors).some(k => k !== 'required');
  }

  /** Scrolls to and focuses the first field flagged red, so the user isn't left guessing which
   * one the banner message refers to. Deferred a tick so the .field-invalid class (driven by
   * signals/validators updated just above) has actually rendered before we go looking for it. */
  private scrollToFirstInvalid(): void {
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>('.field-invalid');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.focus?.();
    }, 0);
  }

  async submit(asDraft: boolean): Promise<void> {
    this.submitAttempted.set(!asDraft);
    if (!asDraft && this.form.invalid) {
      this.form.markAllAsTouched();
      this.message.set(this.hasAnyNonRequiredError() ? 'common.invalidFormat' : 'common.fillRequired');
      this.scrollToFirstInvalid();
      return;
    }
    if (asDraft && this.hasFormatErrors()) {
      this.form.markAllAsTouched();
      this.message.set('common.invalidFormat');
      this.scrollToFirstInvalid();
      return;
    }
    const schoolNameMissing = !asDraft && this.isSchoolUnit() && !this.schoolName().trim();
    if (schoolNameMissing) {
      this.message.set('common.fillRequired');
      this.scrollToFirstInvalid();
      return;
    }
    this.busy.set(true);
    this.message.set(null);
    try {
      const dto = this.buildDto(asDraft);
      const id = this.editId();
      if (id) {
        await firstValueFrom(this.api.updateRequest(id, dto));
        if (asDraft) { this.router.navigate(['/requests', id]); } else { this.submittedOk.set(id); }
      } else {
        const created = await firstValueFrom(this.api.createRequest(dto));
        if (asDraft) { this.router.navigate(['/requests', created.id]); } else { this.submittedOk.set(created.id); }
      }
    } catch {
      this.message.set('common.error');
    } finally {
      this.busy.set(false);
    }
  }

  private buildDto(asDraft: boolean): SaveDestructionRequestDto {
    const v = this.form.getRawValue();
    const iso = (y: number | null) => (y ? `${y}-01-01` : null);
    return {
      concernedParty: v.concernedParty,
      destructionNo: v.destructionNo,
      department: v.department,
      responsibleOfficer: v.responsibleOfficer,
      email: v.email,
      phone: v.phone,
      storageLocation: v.storageLocation,
      totalVolume: v.totalVolume,
      recordsFirstDate: iso(v.firstYear),
      recordsLastDate: iso(v.lastYear),
      creatorUnit: this.sigOut(v.creatorUnit),
      legalAffairs: this.sigOut(v.legalAffairs),
      internalAudit: this.sigOut(v.internalAudit),
      recordsManagement: this.sigOut(v.recordsManagement),
      saveAsDraft: asDraft,
      records: (v.records as Record<string, unknown>[]).map((r, i) => ({
        serialNo: i + 1,
        recordsTitle: (r['recordsTitle'] as string) || null,
        originalOrCopy: (r['originalOrCopy'] as string) || null,
        recordsType: ((r['recordsType'] as string) || '').trim() || null,
        storageMedium: ((r['storageMedium'] as string) || '').trim() || null,
        retentionRuleNo: (r['retentionRuleNo'] as string)?.trim() || '/',
        firstDate: iso(r['firstYear'] as number | null),
        lastDate: iso(r['lastYear'] as number | null),
        recordsVolume: r['recordsVolume'] as number | null,
        remarks: (r['remarks'] as string) || null
      }))
    };
  }

  private signatureGroup(requireSignature = false): FormGroup {
    return this.fb.group({
      name: [''], date: [null as string | null],
      signature: [null as string | null, requireSignature ? Validators.required : []],
      stamp: [null as string | null]
    });
  }
  private sigIn(b: { name?: string | null; date?: string | null; signature?: string | null; stamp?: string | null } | null | undefined) {
    return b ? { ...b, date: b.date?.substring(0, 10) ?? null } : {};
  }
  private sigOut(b: { name: string; date: string | null; signature: string | null; stamp: string | null }) {
    // A native <input type="date"> reports an untouched/cleared value as "" (never null) — sending
    // that straight through fails server-side JSON binding to DateTime? ("" isn't a valid date).
    return { name: b.name || null, date: b.date || null, signature: b.signature, stamp: b.stamp };
  }
  private year(d?: string | null): number | null {
    return d ? new Date(d).getFullYear() : null;
  }
}
