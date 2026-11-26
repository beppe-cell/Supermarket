import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

export interface Interactable {
  mesh: AbstractMesh;
  prompt(): string;
  interact(ctx: InteractContext): void;
  /** Se presente: scatta da solo quando il giocatore entra nel raggio `r` (m) attorno a (x,z) e `ready()` (se dato) è vero. */
  auto?: { x: number; z: number; r: number; ready?: () => boolean };
}

export interface InteractContext {
  hasItem(id: string): boolean;
  /** Aggiunge un oggetto raccolto; false se non entra (zaino pieno). */
  addItem(id: string, label: string): boolean;
  /** Eventi di gioco (es. "warehouse_unlocked") per obiettivi e statistiche. */
  event(name: string): void;
  message(text: string): void;
}
