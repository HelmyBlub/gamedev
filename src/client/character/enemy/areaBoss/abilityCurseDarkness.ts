import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityObjectCircle, PaintOrderAbility } from "../../../ability/ability.js";
import { applyCurse, Curse } from "../../../curse/curse.js";
import { createCurseDarkness, CURSE_DARKNESS } from "../../../curse/curseDarkness.js";
import { calculateDistance, getCameraPosition, getNextId } from "../../../game.js";
import { FACTION_ENEMY, Game, IdCounter, Rectangle } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { findMapModifierById, GameMapAreaRect } from "../../../map/modifiers/mapModifier.js";
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
        paintAbilityObject: paintAbilityObjectDeathCircle,
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
    if (modifier.area.type !== "rect") return;
    const area = modifier.area as GameMapAreaRect;
    const curse: AbilityObjectCurseDarkness = {
        type: ABILITY_NAME_CURSE_DARKNESS,
        strength: area.width,
        radius: getRadius(area.width),
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
    let apply = false;
    let curse: Curse | undefined = undefined;
    if (!character.curses) {
        apply = true;
    }
    if (!apply) {
        curse = character.curses!.find(c => c.type === CURSE_DARKNESS);
        if (!curse) apply = true;
    }
    if (apply) {
        curse = createCurseDarkness();
        applyCurse(curse, character, game);
    } else {
        curse!.level += 0.1;
    }
    console.log("player cursed", curse!.level);
}

function paintAbilityObjectDeathCircle(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "beforeCharacterPaint") return;

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