import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

export interface Interactable {
  mesh: AbstractMesh;
  prompt(): string;
  interact(ctx: InteractContext): void;
}

export interface InteractContext {
  hasItem(id: string): boolean;
  addItem(id: string, label: string): void;
  message(text: string): void;
}
