import { ABILITIES_FUNCTIONS, Ability, AbilityObject, findAbilityAndOwnerInCharacterById, findAbilityById, PaintOrderAbility } from "../../../ability/ability.js";
import { getNextId, getCameraPosition } from "../../../game.js";
import { FACTION_ENEMY, FACTION_PLAYER, Game, IdCounter, Position } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { nextRandom } from "../../../randomNumberGenerator.js";
import { characterTakeDamage, determineCharactersInDistance, getCharactersTouchingLine } from "../../character.js";
import { Character } from "../../characterModel.js";
import { AbilitySpellmaker, AbilitySpellmakerObject } from "./abilitySpellmaker.js";
import { spellmakerAddToolDamage } from "./spellmakerTool.js";

export type AbilitySpellmakerLightning = Ability & {
}

type AbilityObjectSpellmakerLightning = AbilitySpellmakerObject & {
    jumps: number,
    jumpPositions: Position[],
    deleteTime?: number,
    damageDone?: boolean,
}

const FADE_PAINT_TIME = 1000;
const FACTION_ENEMY_HIT_DELAY = 500;
const LIGHTNING_WIDTH = 2;

export const ABILITY_NAME_SPELLMAKER_LIGHTNING = "Spellmaker Lightning";

export function addAbilitySpellmakerLightning() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_SPELLMAKER_LIGHTNING] = {
        tickAbilityObject: tickAbilityObject,
        createAbility: createAbility,
        deleteAbilityObject: deleteAbilityObject,
        paintAbilityObject: paintAbilityObject,
    };
}

export function createAbilityObjectSpellmakerLightning(
    faction: string,
    startPosition: Position,
    jumps: number,
    damage: number,
    abilityIdRef: number | undefined,
    damageFactor: number,
    manaFactor: number,
    toolChain: string[],
    stageId: number,
    stageIndex: number,
    game: Game
): AbilityObjectSpellmakerLightning {
    return {
        type: ABILITY_NAME_SPELLMAKER_LIGHTNING,
        color: "white",
        damage: damage,
        faction: faction,
        x: startPosition.x,
        y: startPosition.y,
        abilityIdRef: abilityIdRef,
        jumpPositions: [],
        jumps: jumps,
        toolChain: toolChain,
        damageFactor: damageFactor,
        manaFactor: manaFactor,
        stageId: stageId,
        stageIndex: stageIndex,
        id: getNextId(game.state.idCounter),
    };
}

function createAbility(
    idCounter: IdCounter,
): AbilitySpellmakerLightning {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_SPELLMAKER_LIGHTNING,
        passive: true,
        upgrades: {},
    };
}

function deleteAbilityObject(abilityObject: AbilityObject, game: Game): boolean {
    const lightning = abilityObject as AbilityObjectSpellmakerLightning;
    return lightning.deleteTime !== undefined && lightning.deleteTime <= game.state.time;
}

function paintAbilityObject(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "beforeCharacterPaint") return;
    const objectLightning = abilityObject as AbilityObjectSpellmakerLightning;
    const cameraPosition = getCameraPosition(game);

    let color = "white";
    if (abilityObject.faction === FACTION_ENEMY) {
        color = "black";
        if (objectLightning.deleteTime) {
            if (objectLightning.damageDone) {
                ctx.globalAlpha *= 0.5;
            } else {
                ctx.globalAlpha *= (objectLightning.deleteTime - game.state.time) / FADE_PAINT_TIME;
            }
        }
    } else {
        ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;
        if (objectLightning.deleteTime) ctx.globalAlpha *= (objectLightning.deleteTime - game.state.time) / FADE_PAINT_TIME;
    }

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = LIGHTNING_WIDTH;
    let paintPos = getPointPaintPosition(ctx, abilityObject, cameraPosition, game.UI.zoom);
    if (objectLightning.jumpPositions.length > 0) {
        ctx.beginPath();
        ctx.moveTo(paintPos.x, paintPos.y);
        for (let joint of objectLightning.jumpPositions) {
            paintPos = getPointPaintPosition(ctx, joint, cameraPosition, game.UI.zoom);
            ctx.lineTo(paintPos.x, paintPos.y);
        }
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.arc(paintPos.x, paintPos.y, 5 + objectLightning.jumps, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function tickAbilityObject(abilityObject: AbilityObject, game: Game) {
    const objectLightning = abilityObject as AbilityObjectSpellmakerLightning;
    if (objectLightning.damageDone) return;
    const lightningJumpRadius = 200;
    if (abilityObject.faction === FACTION_PLAYER) {
        objectLightning.deleteTime = game.state.time + FADE_PAINT_TIME;
        let targets = determineCharactersInDistance(abilityObject, game.state.map, [], game.state.bossStuff.bosses, lightningJumpRadius, abilityObject.faction, true);
        if (targets.length > 0) {
            let ability: AbilitySpellmaker | undefined = undefined;
            if (abilityObject.abilityIdRef !== undefined) {
                for (let player of game.state.players) {
                    const result = findAbilityAndOwnerInCharacterById(player.character, abilityObject.abilityIdRef);
                    if (result) ability = result.ability as AbilitySpellmaker;
                }
            }
            for (let jump = 0; jump < objectLightning.jumps; jump++) {
                if (targets.length > 0) {
                    const randomTargetIndex = Math.floor(nextRandom(game.state.randomSeed) * targets.length);
                    const target = targets[randomTargetIndex];
                    characterTakeDamage(target, objectLightning.damage, game, objectLightning.abilityIdRef, ABILITY_NAME_SPELLMAKER_LIGHTNING, abilityObject);
                    if (ability) spellmakerAddToolDamage(ability, objectLightning.damage, objectLightning.toolChain, game);
                    objectLightning.jumpPositions.push({ x: target.x, y: target.y });
                    targets.splice(randomTargetIndex, 1);
                } else {
                    break;
                }
            }
        }
        objectLightning.damageDone = true;
    } else {
        if (objectLightning.deleteTime === undefined) {
            objectLightning.deleteTime = game.state.time + FADE_PAINT_TIME + FACTION_ENEMY_HIT_DELAY;
            let targets = determineCharactersInDistance(abilityObject, undefined, game.state.players, undefined, lightningJumpRadius, abilityObject.faction, true);
            for (let jump = 0; jump < objectLightning.jumps; jump++) {
                if (targets.length > 0) {
                    const randomTargetIndex = Math.floor(nextRandom(game.state.randomSeed) * targets.length);
                    const target = targets[randomTargetIndex];
                    objectLightning.jumpPositions.push({ x: target.x, y: target.y });
                    targets.splice(randomTargetIndex, 1);
                } else {
                    break;
                }
            }
        } else if (!objectLightning.damageDone && objectLightning.deleteTime - FADE_PAINT_TIME < game.state.time) {
            let currentPos: Position = { x: abilityObject.x, y: abilityObject.y };
            objectLightning.damageDone = true;
            for (let jump = 0; jump < objectLightning.jumpPositions.length; jump++) {
                const characters: Character[] = getCharactersTouchingLine(game, currentPos, objectLightning.jumpPositions[jump], abilityObject.faction, LIGHTNING_WIDTH);
                for (let char of characters) {
                    characterTakeDamage(char, objectLightning.damage, game, objectLightning.abilityIdRef, ABILITY_NAME_SPELLMAKER_LIGHTNING, abilityObject);
                }
            }
        }
    }
}
