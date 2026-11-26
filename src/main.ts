import { Game } from "./core/game";

const canvas = document.getElementById("game") as HTMLCanvasElement;
await new Game(canvas).start();

addEventListener("hashchange", () => location.reload());
