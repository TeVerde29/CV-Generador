import {
  Directive,
  ElementRef,
  OnDestroy,
  inject,
  input,
  output,
} from '@angular/core';

/** Emitted every time the dragged item should land on a new position. */
export interface SortMove {
  /** Value of `appSortable`, so one handler can serve every list. */
  key: string;
  /** Index the item is leaving. */
  from: number;
  /** Index the item should occupy once removed from `from`. */
  to: number;
}

/**
 * Reorders a list by dragging, with mouse, pen or touch.
 *
 * The sortable items are the direct children that contain an element marked
 * with `data-drag-handle`; any other child (a hint paragraph, the "add" button)
 * is ignored, which means the same directive works on `article.item` lists and
 * on the `li.order-row` list alike. Positions are projected indices, so a
 * caller can map them straight onto a model array as long as the list renders
 * in model order.
 *
 * Reordering is applied live: when the pointer crosses the midpoint of a
 * neighbour the directive emits, the model changes and the DOM follows. That
 * keeps the state in one place (the store, with its undo history) instead of
 * duplicating it in the DOM. Because `@for` tracks by id, Angular moves the
 * existing nodes and the dragged element survives the update.
 *
 * Keyboard users keep the same control through the handle: `ArrowUp` and
 * `ArrowDown` are wired to the plain up/down moves in the template.
 */
@Directive({
  selector: '[appSortable]',
  host: { '(pointerdown)': 'onPointerDown($event)' },
})
export class SortableDirective implements OnDestroy {
  /** Identifier echoed back in every emitted event. */
  readonly key = input.required<string>({ alias: 'appSortable' });

  /** Asks the owner to move an item to a new index. */
  readonly moveTo = output<SortMove>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  private pointerId: number | null = null;
  private item: HTMLElement | null = null;
  private startY = 0;
  private dragging = false;

  ngOnDestroy(): void {
    this.release();
  }

  /* ── Drag lifecycle ──────────────────────────────────────────────────── */

  onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;

    const handle = (event.target as HTMLElement | null)?.closest('[data-drag-handle]');
    if (!handle || !this.host.contains(handle)) return;

    const item = this.items().find((el) => el.contains(handle));
    if (!item) return;

    this.pointerId = event.pointerId;
    this.item = item;
    this.startY = event.clientY;
    this.dragging = false;

    document.addEventListener('pointermove', this.onPointerMove);
    document.addEventListener('pointerup', this.onPointerUp);
    document.addEventListener('pointercancel', this.onPointerUp);
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId || !this.item) return;

    // A few pixels of slack so a plain click on the handle never reorders.
    if (!this.dragging) {
      if (Math.abs(event.clientY - this.startY) < 4) return;
      this.dragging = true;
      this.item.classList.add('is-dragging');
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    }

    event.preventDefault();

    if (!this.host.contains(this.item)) {
      // The list was rebuilt underneath us; give up rather than misbehave.
      this.release();
      return;
    }

    const items = this.items();
    const from = items.indexOf(this.item);
    if (from < 0) return;

    const over = items.find((el) => {
      const rect = el.getBoundingClientRect();
      return event.clientY >= rect.top && event.clientY <= rect.bottom;
    });
    if (!over || over === this.item) return;

    const rect = over.getBoundingClientRect();
    const belowMiddle = event.clientY > rect.top + rect.height / 2;
    let to = items.indexOf(over) + (belowMiddle ? 1 : 0);
    // Dropping below itself means landing after removal, so shift back one.
    if (from < to) to -= 1;
    if (to === from || to < 0 || to > items.length - 1) return;

    this.moveTo.emit({ key: this.key(), from, to });
  };

  private readonly onPointerUp = (): void => this.release();

  private release(): void {
    this.item?.classList.remove('is-dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
    document.removeEventListener('pointercancel', this.onPointerUp);
    this.pointerId = null;
    this.item = null;
    this.dragging = false;
  }

  /** Direct children that carry a drag handle, in DOM order. */
  private items(): HTMLElement[] {
    return Array.from(this.host.children).filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement && el.querySelector('[data-drag-handle]') !== null,
    );
  }
}
