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
    <div class="d-flex align-items-center gap-2 mt-1 flex-wrap">
      <button type="button" class="btn btn-sm btn-outline-secondary" (click)="clear()">
        {{ i18n.t('common.clear') }}
      </button>
      <label class="btn btn-sm btn-outline-secondary mb-0">
        {{ i18n.t('request.uploadSignature') }}
        <input type="file" accept="image/*" hidden (change)="onFileSelected($event)">
      </label>
    </div>
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
    canvas.height = canvas.offsetHeight;
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

  onFileSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // A phone-camera photo can be several MB — well beyond what a signature/stamp needs, and
        // with up to 4 of these per request the raw upload can blow past the server's request-size
        // cap. Re-encoding through a small canvas keeps every upload down to tens of KB regardless
        // of the original photo's resolution.
        const dataUrl = this.downscale(img);
        this.writeValue(dataUrl);
        this.dirty = true;
        this.onTouched();
        this.onChange(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    (e.target as HTMLInputElement).value = '';
  }

  private downscale(img: HTMLImageElement, maxDim = 500): string {
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale) || 1;
    const h = Math.round(img.naturalHeight * scale) || 1;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  private ctx(): CanvasRenderingContext2D { return this.canvasRef().nativeElement.getContext('2d')!; }
  private pos(e: PointerEvent): [number, number] {
    const rect = this.canvasRef().nativeElement.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }
}
