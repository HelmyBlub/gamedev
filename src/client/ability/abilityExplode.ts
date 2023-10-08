import { getCameraPosition, getNextId } from "../game.js";
import { FACTION_ENEMY, Game, IdCounter, Position } from "../gameModel.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, PaintOrderAbility, detectAbilityObjectCircleToCharacterHit, AbilityObjectCircle } from "./ability.js";

export type AbilityExplode = Ability & {
    radius: number,
    damage: number,
}

type AbilityObjectExplode = AbilityObjectCircle & {
    damage: number,
    hasDamageDone: boolean,
    removeTime?: number,
}

const ABILITY_NAME_EXPLODE = "Explode";
const PAINT_FADE_TIME = 500;

export function addAbilityExplode() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_EXPLODE] = {
        tickAbilityObject: tickAbilityObjectExplode,
        createAbility: createAbilityExplode,
        deleteAbilityObject: deleteAbilityObjectExplode,
        paintAbilityObject: paintAbilityObjectExplode,
        isPassive: true,
    };
}

export function createAbilityExplode(
    idCounter: IdCounter,
    playerInputBinding?: string,
    damage: number = 100,
): AbilityExplode {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_EXPLODE,
        radius: 20,
        passive: true,
        damage: damage,
        upgrades: {},
    };
}

export function createAbilityObjectExplode(
    position: Position,
    damage: number,
    radius: number,
    faction: string,
    abilityRefId: number,
    game: Game
): AbilityObjectExplode {
    return {
        type: ABILITY_NAME_EXPLODE,
        color: "red",
        damage: damage,
        faction: faction,
        x: position.x,
        y: position.y,
        hasDamageDone: false,
        radius: radius,
        abilityRefId: abilityRefId,
    };
}

function deleteAbilityObjectExplode(abilityObject: AbilityObject, game: Game): boolean {
    let abilityObjectExplode = abilityObject as AbilityObjectExplode;
    return abilityObjectExplode.removeTime !== undefined && abilityObjectExplode.removeTime <= game.state.time;
}

function paintAbilityObjectExplode(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "beforeCharacterPaint") return;
    let abilityObjectExplode = abilityObject as AbilityObjectExplode;
    if (abilityObjectExplode.removeTime === undefined) return;
    let cameraPosition = getCameraPosition(game);
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;

    const fadeFactor = (abilityObjectExplode.removeTime - game.state.time) / PAINT_FADE_TIME;
    ctx.globalAlpha = 0.75 * fadeFactor;
    ctx.fillStyle = abilityObject.faction === FACTION_ENEMY ? "black" : abilityObject.color;
    ctx.beginPath();
    ctx.arc(
        abilityObject.x - cameraPosition.x + centerX,
        abilityObject.y - cameraPosition.y + centerY,
        abilityObjectExplode.radius, 0, 2 * Math.PI
    );
    ctx.fill();
    ctx.globalAlpha = 1;
}


function tickAbilityObjectExplode(abilityObject: AbilityObject, game: Game) {
    let abilityObjectExplode = abilityObject as AbilityObjectExplode;
    if(abilityObjectExplode.hasDamageDone) return;
    abilityObjectExplode.hasDamageDone = true;
    abilityObjectExplode.removeTime = game.state.time + PAINT_FADE_TIME;
    detectAbilityObjectCircleToCharacterHit(game.state.map, abilityObjectExplode, game);
}
