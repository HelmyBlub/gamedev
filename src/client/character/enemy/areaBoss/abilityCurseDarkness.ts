import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityObjectCircle, PaintOrderAbility } from "../../../ability/ability.js";
import { applyCurse } from "../../../curse/curse.js";
import { createCurseDarkness, CURSE_DARKNESS, CurseDarkness } from "../../../curse/curseDarkness.js";
import { calculateDistance, getCameraPosition, getNextId } from "../../../game.js";
import { FACTION_ENEMY, Game, IdCounter } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { findMapModifierById } from "../../../map/modifiers/mapModifier.js";
import { getShapeArea } from "../../../map/modifiers/mapModifierShapes.js";
import { GameMapAreaRect } from "../../../map/modifiers/mapShapeRectangle.js";
import { getPlayerCharacters } from "../../character.js";
import { Character } from "../../characterModel.js";
import { AreaBossEnemyCharacter } from "./areaBossEnemy.js";

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

export function createObjectCurseDarkness(areaBoss: AreaBossEnemyCharacter, game: Game): AbilityObjectCurseDarkness | undefined {
    const modifier = findMapModifierById(areaBoss.mapModifierIdRef, game);
    if (!modifier) return;
    const curseStrength = Math.max(getShapeArea(modifier.area)! / 10000, 500);
    const curse: AbilityObjectCurseDarkness = {
        type: ABILITY_NAME_CURSE_DARKNESS,
        strength: curseStrength,
        radius: getRadius(curseStrength),
        color: "black",
        damage: 0,
        faction: FACTION_ENEMY,
        x: areaBoss.x,
        y: areaBoss.y,
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
        curse.level += 0.2;
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
    ctx.fill();
    ctx.globalAlpha = 1;
}