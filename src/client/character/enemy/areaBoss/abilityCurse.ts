import { AbilityObject, AbilityObjectCircle, PaintOrderAbility } from "../../../ability/ability.js";
import { applyCurse, createCurse, Curse, increaseCurseLevel } from "../../../curse/curse.js";
import { calculateDistance, getCameraPosition } from "../../../game.js";
import { FACTION_ENEMY, Game } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { findNearNonBlockingPosition } from "../../../map/map.js";
import { findMapModifierById } from "../../../map/modifiers/mapModifier.js";
import { getShapeArea } from "../../../map/modifiers/mapModifierShapes.js";
import { getPlayerCharacters } from "../../character.js";
import { Character } from "../../characterModel.js";
import { AreaBossEnemy } from "./areaBoss.js";

export type AbilityObjectCurse = AbilityObjectCircle & {
    curseType: string,
    strength: number,
    tickInterval: number,
    nextTickTime?: number,
}

export function createObjectCurse(areaBoss: AreaBossEnemy, objectCurseType: string, curseType: string, game: Game): AbilityObjectCurse | undefined {
    const modifier = findMapModifierById(areaBoss.mapModifierIdRef, game);
    if (!modifier) return;
    const curseStrength = Math.max(getShapeArea(modifier.area)! / 10000, 500);
    const spawn = findNearNonBlockingPosition(areaBoss, game.state.map, game.state.idCounter, game);
    const curse: AbilityObjectCurse = {
        type: objectCurseType,
        curseType: curseType,
        strength: curseStrength,
        radius: getRadius(curseStrength),
        color: "darkblue",
        damage: 0,
        faction: FACTION_ENEMY,
        x: spawn.x,
        y: spawn.y,
        tickInterval: 100,
    }
    return curse;
}

export function tickAbilityObjectCurse(abilityObject: AbilityObject, game: Game) {
    const curse = abilityObject as AbilityObjectCurse;
    if (curse.nextTickTime === undefined) curse.nextTickTime = game.state.time + curse.tickInterval;
    if (curse.nextTickTime > game.state.time) return;
    curse.nextTickTime += curse.tickInterval;

    const playerCharacters = getPlayerCharacters(game.state.players);
    let playerHit = false;
    for (let playerCharacter of playerCharacters) {
        const distance = calculateDistance(playerCharacter, abilityObject);
        if (distance < curse.radius) {
            playerHit = true;
            curseIncreaseCharacter(playerCharacter, curse.curseType, game);
        }
    }
    if (playerHit) {
        curse.strength -= 25;
        curse.radius = getRadius(curse.strength);
    }
}

export function deleteObjectCurse(abilityObject: AbilityObject, game: Game): boolean {
    const curse = abilityObject as AbilityObjectCurse;
    return curse.strength <= 0
}

export function paintAbilityObjectCurse(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "beforeCharacterPaint") {
        return;
    }
    const curse = abilityObject as AbilityObjectCurse;
    const cameraPosition = getCameraPosition(game);
    const paintPos = getPointPaintPosition(ctx, abilityObject, cameraPosition, game.UI.zoom);

    ctx.fillStyle = abilityObject.color;
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.arc(
        paintPos.x,
        paintPos.y,
        curse.radius, 0, 2 * Math.PI
    );
    ctx.lineWidth = 5;
    ctx.fill();
    const radius = curse.radius * (1 - (game.state.time % 2048) / 2048);
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.arc(
        paintPos.x,
        paintPos.y,
        radius, 0, 2 * Math.PI
    );
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(
        paintPos.x,
        paintPos.y,
        (curse.radius / 2 + radius) % curse.radius, 0, 2 * Math.PI
    );
    ctx.stroke();
    ctx.globalAlpha = 1;
}

function curseIncreaseCharacter(character: Character, curseType: string, game: Game) {
    let curse: Curse | undefined = undefined;
    if (character.curses) {
        curse = character.curses!.find(c => c.type === curseType) as Curse;
    }
    if (!curse) {
        curse = createCurse(curseType, game.state.idCounter);
        applyCurse(curse, character, game);
    } else {
        increaseCurseLevel(character, curse, 0.2, game);
    }
    curse.visualizeFadeTimer = game.state.time + 2000;
}

function getRadius(curesStrength: number) {
    return Math.sqrt(curesStrength) * 2;
}