import { createEngine } from "./core/engine-factory";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const engine = await createEngine(canvas);
window.addEventListener("resize", () => engine.resize());
