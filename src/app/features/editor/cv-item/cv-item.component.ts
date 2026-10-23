import { Component, Input, Output, EventEmitter } from '@angular/core';

/**
 * Cáscara reutilizable de un ítem de colección del editor.
 *
 * Encapsula el encabezado repetido (número, nombre, botón de plegar,
 * tirador de arrastre, botón eliminar) y proyecta el cuerpo del formulario
 * con ng-content. Cada colección del editor usa este componente en lugar de
 * copiar el mismo bloque de ~40 líneas.
 */
@Component({
  selector: 'app-cv-item',
  templateUrl: './cv-item.component.html',
  styleUrl: './cv-item.component.scss',
  standalone: true,
})
export class CvItemComponent {
  /** Texto que se muestra como nombre del ítem. */
  @Input({ required: true }) name!: string;
  /** Índice del ítem dentro de la colección (0-based). */
  @Input({ required: true }) index!: number;
  /** Si el ítem está contraído. */
  @Input({ required: true }) folded!: boolean;
  /** Identificador del ítem (para rastreo interno). */
  @Input({ required: true }) id!: string;
  /** Si el tirador de arrastre está habilitado (solo si hay 2+ ítems). */
  @Input() canDrag = false;
  /** Si el botón eliminar está habilitado. */
  @Input() canDelete = true;

  /** El usuario quiere plegar/desplegar este ítem. */
  @Output() readonly toggleFold = new EventEmitter<void>();
  /** El usuario quiere eliminar este ítem. */
  @Output() readonly remove = new EventEmitter<void>();
  /** Mover el ítem una posición arriba. */
  @Output() readonly moveUp = new EventEmitter<void>();
  /** Mover el ítem una posición abajo. */
  @Output() readonly moveDown = new EventEmitter<void>();
}
