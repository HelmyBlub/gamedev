import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityObjectCircle, PaintOrderAbility } from "../../../ability/ability.js";
import { applyCurse } from "../../../curse/curse.js";
import { createCurseDarkness, CURSE_DARKNESS, CurseDarkness, increaseCurseDarkness } from "../../../curse/curseDarkness.js";
import { calculateDistance, getCameraPosition, getNextId } from "../../../game.js";
import { FACTION_ENEMY, Game, IdCounter } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { findNearNonBlockingPosition } from "../../../map/map.js";
import { findMapModifierById } from "../../../map/modifiers/mapModifier.js";
import { getShapeArea } from "../../../map/modifiers/mapModifierShapes.js";
import { getPlayerCharacters } from "../../character.js";
import { Character } from "../../characterModel.js";
import { AreaBossEnemyDarknessSpider } from "./areaBossDarknessSpider.js";

export type AbilityCurseDarkness = Ability & {
}

export type AbilityObjectCurseDarkness = AbilityObjectCircle & {
    strength: number,
    tickInterval: number,
    nextTickTime?: number,
}

const ABILITY_NAME_CURSE_DARKNESS = "Curse Darkness";

export function addAbilityCurseDarkness() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_CURSE_DARKNESS] = {
        tickAbilityObject: tickAbilityObject,
        deleteAbilityObject: deleteObject,
        createAbility: createAbilityCurseDarkness,
        paintAbilityObject: paintAbilityObject,
    };
}

export function createAbilityCurseDarkness(idCounter: IdCounter): AbilityCurseDarkness {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_CURSE_DARKNESS,
        passive: true,
        upgrades: {},
    }
}

export function createObjectCurseDarkness(areaBoss: AreaBossEnemyDarknessSpider, game: Game): AbilityObjectCurseDarkness | undefined {
    const modifier = findMapModifierById(areaBoss.mapModifierIdRef, game);
    if (!modifier) return;
    const curseStrength = Math.max(getShapeArea(modifier.area)! / 10000, 500);
    const spawn = findNearNonBlockingPosition(areaBoss, game.state.map, game.state.idCounter, game);
    const curse: AbilityObjectCurseDarkness = {
        type: ABILITY_NAME_CURSE_DARKNESS,
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

function getRadius(curesStrength: number) {
    return Math.sqrt(curesStrength) * 2;
}

function deleteObject(abilityObject: AbilityObject, game: Game): boolean {
    const curse = abilityObject as AbilityObjectCurseDarkness;
    return curse.strength <= 0
}

function tickAbilityObject(abilityObject: AbilityObject, game: Game) {
    const curse = abilityObject as AbilityObjectCurseDarkness;
    if (curse.nextTickTime === undefined) curse.nextTickTime = game.state.time + curse.tickInterval;
    if (curse.nextTickTime > game.state.time) return;
    curse.nextTickTime += curse.tickInterval;

    const playerCharacters = getPlayerCharacters(game.state.players);
    let playerHit = false;
    for (let playerCharacter of playerCharacters) {
        const distance = calculateDistance(playerCharacter, abilityObject);
        if (distance < curse.radius) {
            playerHit = true;
            curseIncreaseCharacter(playerCharacter, game);
        }
    }
    if (playerHit) {
        curse.strength -= 25;
        curse.radius = getRadius(curse.strength);
    }
}

function curseIncreaseCharacter(character: Character, game: Game) {
    let curse: CurseDarkness | undefined = undefined;
    if (character.curses) {
        curse = character.curses!.find(c => c.type === CURSE_DARKNESS) as CurseDarkness;
    }
    if (!curse) {
        curse = createCurseDarkness();
        applyCurse(curse, character, game);
    } else {
        increaseCurseDarkness(character, curse, 0.2, game);
    }
    curse.visualizeFadeTimer = game.state.time + 2000;
}

function paintAbilityObject(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "beforeCharacterPaint") {
        return;
    }
    const curse = abilityObject as AbilityObjectCurseDarkness;
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