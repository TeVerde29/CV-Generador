import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  message: string;
  kind: 'info' | 'ok' | 'err';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly items = signal<Toast[]>([]);

  show(message: string, kind: Toast['kind'] = 'info'): void {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.items.update((list) => [...list, { id, message, kind }]);
    setTimeout(() => this.dismiss(id), 4500);
  }

  ok(message: string): void {
    this.show(message, 'ok');
  }

  err(message: string): void {
    this.show(message, 'err');
  }

  dismiss(id: string): void {
    this.items.update((list) => list.filter((t) => t.id !== id));
  }
}
