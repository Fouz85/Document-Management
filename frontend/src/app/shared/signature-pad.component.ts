import { AfterViewInit, Component, ElementRef, forwardRef, viewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { I18nService } from '../core/i18n.service';

/** Canvas-based signature/stamp pad; value is a PNG data URL (base64). */
@Component({
  selector: 'app-signature-pad',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SignaturePadComponent), multi: true }],
  template: `
    <canvas #canvas class="signature-canvas" height="120"
      (pointerdown)="start($event)" (pointermove)="move($event)"
      (pointerup)="end()" (pointerleave)="end()"></canvas>
    <button type="button" class="btn btn-sm btn-outline-secondary mt-1" (click)="clear()">
      {{ i18n.t('common.clear') }}
    </button>
  `
})
export class SignaturePadComponent implements ControlValueAccessor, AfterViewInit {
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private drawing = false;
  private dirty = false;
  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(readonly i18n: I18nService) {}

  ngAfterViewInit(): void {
    const canvas = this.canvasRef().nativeElement;
    canvas.width = canvas.offsetWidth;
  }

  writeValue(value: string | null): void {
    const canvas = this.canvasRef?.()?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.dirty = false;
    if (value) {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0); this.dirty = true; };
      img.src = value;
    }
  }
  registerOnChange(fn: (value: string | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }

  start(e: PointerEvent): void {
    this.drawing = true;
    const ctx = this.ctx();
    ctx.beginPath();
    ctx.moveTo(...this.pos(e));
  }
  move(e: PointerEvent): void {
    if (!this.drawing) return;
    const ctx = this.ctx();
    ctx.lineTo(...this.pos(e));
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    this.dirty = true;
  }
  end(): void {
    if (!this.drawing) return;
    this.drawing = false;
    this.onTouched();
    this.onChange(this.dirty ? this.canvasRef().nativeElement.toDataURL('image/png') : null);
  }
  clear(): void {
    const canvas = this.canvasRef().nativeElement;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    this.dirty = false;
    this.onChange(null);
  }

  private ctx(): CanvasRenderingContext2D { return this.canvasRef().nativeElement.getContext('2d')!; }
  private pos(e: PointerEvent): [number, number] {
    const rect = this.canvasRef().nativeElement.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }
}
