import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../core/api.service';
import { I18nService } from '../core/i18n.service';
import { DepartmentNode, UnitNode } from '../core/models';

/** Schools is its own top-level department with no fixed unit list — typed freely as the school's name. */
const SCHOOL_DEPT_NAME = 'المدارس';

/** Unit/section picker producing the same "Unit - Section" (or "المدارس - <school name>") string the
 * rest of the app stores as a department. Shared by the admin edit-user form and the self-service
 * complete-profile page. */
@Component({
  selector: 'app-department-picker',
  template: `
    <select class="form-select mb-2" [value]="selectedDeptId()" (change)="pickDept($event)">
      <option value="">-- {{ i18n.t('admin.selectMainDept') }} --</option>
      @for (d of departments(); track d.id) { <option [value]="d.id">{{ d.name }}</option> }
    </select>
    @if (isSchoolDept()) {
      <input class="form-control mb-2" [value]="schoolName()" (input)="pickSchoolName($event)"
             [placeholder]="i18n.t('request.schoolNamePlaceholder')">
    } @else {
      <select class="form-select mb-2" [value]="selectedUnitId()" (change)="pickUnit($event)"
              [disabled]="!selectedDeptId()">
        <option value="">-- {{ i18n.t('admin.selectUnit') }} --</option>
        @for (u of units(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
      </select>
      <select class="form-select mb-2" [value]="selectedSectionId()" (change)="pickSection($event)"
              [disabled]="sections().length === 0">
        <option value="">-- {{ i18n.t('request.selectSection') }} --</option>
        @for (s of sections(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }
      </select>
    }
    @if (value()) {
      <div class="text-muted small mt-1">✓ {{ value() }}</div>
    }
  `
})
export class DepartmentPickerComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly i18n = inject(I18nService);

  readonly value = input('');
  readonly valueChange = output<string>();

  readonly departments = signal<DepartmentNode[]>([]);
  readonly selectedDeptId = signal<number | ''>('');
  readonly selectedUnitId = signal<number | ''>('');
  readonly selectedSectionId = signal<number | ''>('');
  readonly schoolName = signal('');

  async ngOnInit(): Promise<void> {
    this.departments.set(await firstValueFrom(this.api.departmentsTree()));
  }

  units(): UnitNode[] {
    const id = this.selectedDeptId();
    if (!id) return [];
    return this.departments().find(d => d.id === id)?.units ?? [];
  }

  sections(): UnitNode[] {
    const id = this.selectedUnitId();
    if (!id) return [];
    return this.units().find(u => u.id === id)?.children ?? [];
  }

  isSchoolDept(): boolean {
    return this.departments().find(d => d.id === this.selectedDeptId())?.name === SCHOOL_DEPT_NAME;
  }

  pickDept(e: Event): void {
    const v = (e.target as HTMLSelectElement).value;
    this.selectedDeptId.set(v ? +v : '');
    this.selectedUnitId.set('');
    this.selectedSectionId.set('');
    this.schoolName.set('');
    this.emit();
  }
  pickUnit(e: Event): void {
    const v = (e.target as HTMLSelectElement).value;
    this.selectedUnitId.set(v ? +v : '');
    this.selectedSectionId.set('');
    this.schoolName.set('');
    this.emit();
  }
  pickSection(e: Event): void {
    const v = (e.target as HTMLSelectElement).value;
    this.selectedSectionId.set(v ? +v : '');
    this.emit();
  }
  pickSchoolName(e: Event): void {
    this.schoolName.set((e.target as HTMLInputElement).value);
    this.emit();
  }
  private emit(): void {
    const dept = this.departments().find(d => d.id === this.selectedDeptId());
    if (this.isSchoolDept()) {
      this.valueChange.emit([dept?.name, this.schoolName()].filter(Boolean).join(' - '));
      return;
    }
    const unit = this.units().find(u => u.id === this.selectedUnitId());
    const section = this.sections().find(s => s.id === this.selectedSectionId())?.name;
    this.valueChange.emit([dept?.name, unit?.name, section].filter(Boolean).join(' - '));
  }
}
