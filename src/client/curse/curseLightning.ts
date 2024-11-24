import { Character } from "../character/characterModel.js";
import { getCameraPosition } from "../game.js";
import { Game } from "../gameModel.js";
import { getPointPaintPosition, paintTextWithOutline } from "../gamePaint.js";
import { Curse, CURSES_FUNCTIONS } from "./curse.js";

export const CURSE_LIGHTNING = "Lightning";

export type CurseLightning = Curse & {
}

export function addCurseLightning() {
    CURSES_FUNCTIONS[CURSE_LIGHTNING] = {
        copy: copy,
        create: create,
        paint: paintCurse,
        reset: reset,
        tick: tickDarkness,
    };
}

function create(): CurseLightning {
    return {
        level: 1,
        type: CURSE_LIGHTNING,
    };
}

function reset(curse: Curse) {
    const darkness = curse as CurseLightning;
}

function copy(curse: Curse): Curse {
    const copy = create();
    copy.level = curse.level;
    return copy;
}

function paintCurse(ctx: CanvasRenderingContext2D, curse: Curse, target: Character, game: Game) {
    const darkness = curse as CurseLightning;
    if (darkness.visualizeFadeTimer !== undefined && darkness.visualizeFadeTimer > game.state.time) {
        const cameraPosition = getCameraPosition(game);
        const paintPos = getPointPaintPosition(ctx, target, cameraPosition, game.UI.zoom);
        ctx.font = "30px Arial";
        paintTextWithOutline(ctx, "white", "black", `Curse ${CURSE_LIGHTNING} Level ${Math.floor(curse.level)}`, paintPos.x, paintPos.y - 30, true, 3);
    }
}

function tickDarkness(curse: Curse, target: Character, game: Game) {
    const darkness = curse as CurseLightning;
}

