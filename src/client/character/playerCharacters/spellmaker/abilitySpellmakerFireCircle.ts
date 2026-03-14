import { ABILITIES_FUNCTIONS, Ability, AbilityObject, findAbilityAndOwnerInCharacterById, PaintOrderAbility } from "../../../ability/ability.js";
import { getNextId, getCameraPosition, deepCopy, calculateDistance } from "../../../game.js";
import { FACTION_ENEMY, FACTION_PLAYER, Game, IdCounter, Position } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { getCharactersTouchingLine, characterTakeDamage, determineCharactersInDistance } from "../../character.js";
import { Character } from "../../characterModel.js";
import { AbilitySpellmaker, AbilitySpellmakerObject, SpellmakerCreateToolMoveAttachment } from "./abilitySpellmaker.js";
import { SPELLMAKER_MOVE_TOOLS_FUNCTIONS, spellmakerAddToolDamage } from "./spellmakerTool.js";

export type AbilitySpellmakerFireCircle = Ability & {
}

type AbilityObjectSpellmakerFireCircle = AbilitySpellmakerObject & {
    moveAttachment?: SpellmakerCreateToolMoveAttachment,
    endTime: number,
    tickInterval: number,
    nextTickTime?: number,
    radius: number,
}

export const ABILITY_NAME_SPELLMAKER_FIRE_CIRCLE = "Spellmaker Fire Circle";

export function addAbilitySpellmakerFireCircle() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_SPELLMAKER_FIRE_CIRCLE] = {
        tickAbilityObject: tickAbilityObject,
        createAbility: createAbility,
        deleteAbilityObject: deleteAbilityObject,
        paintAbilityObject: paintAbilityObject,
    };
}

export function createAbilityObjectSpellmakerFireCircle(
    faction: string,
    startPosition: Position,
    moveAttachment: SpellmakerCreateToolMoveAttachment | undefined,
    damage: number,
    radius: number,
    duration: number,
    tickInterval: number,
    color: string,
    damageFactor: number,
    manaFactor: number,
    chargeFactor: number,
    toolChain: string[],
    abilityIdRef: number | undefined,
    stageId: number,
    stageIndex: number,
    game: Game
): AbilityObjectSpellmakerFireCircle {
    return {
        type: ABILITY_NAME_SPELLMAKER_FIRE_CIRCLE,
        radius: radius,
        tickInterval: tickInterval,
        color: color,
        damage: damage,
        faction: faction,
        x: startPosition.x,
        y: startPosition.y,
        moveAttachment: deepCopy(moveAttachment),
        endTime: game.state.time + duration,
        abilityIdRef: abilityIdRef,
        damageFactor: damageFactor,
        manaFactor: manaFactor,
        chargeFactor: chargeFactor,
        toolChain: toolChain,
        stageId: stageId,
        stageIndex: stageIndex,
        id: getNextId(game.state.idCounter),
    };
}

function createAbility(
    idCounter: IdCounter,
): AbilitySpellmakerFireCircle {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_SPELLMAKER_FIRE_CIRCLE,
        passive: true,
        upgrades: {},
    };
}

function deleteAbilityObject(abilityObject: AbilityObject, game: Game): boolean {
    const abilityObjectFireLine = abilityObject as AbilityObjectSpellmakerFireCircle;
    return abilityObjectFireLine.endTime <= game.state.time;
}

function paintAbilityObject(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "beforeCharacterPaint") return;
    const objectFireCircle = abilityObject as AbilityObjectSpellmakerFireCircle;
    const cameraPosition = getCameraPosition(game);
    const paintPos = getPointPaintPosition(ctx, abilityObject, cameraPosition, game.UI.zoom);

    ctx.globalAlpha = 0.50;
    ctx.fillStyle = "red";
    if (abilityObject.faction === FACTION_ENEMY) {
        ctx.fillStyle = "black";
        ctx.globalAlpha = 0.80;
    }
    if (abilityObject.faction === FACTION_PLAYER) ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;
    ctx.beginPath();
    ctx.arc(paintPos.x, paintPos.y, objectFireCircle.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
}

function tickAbilityObject(abilityObject: AbilityObject, game: Game) {
    const objectFireCircle = abilityObject as AbilityObjectSpellmakerFireCircle;

    if (objectFireCircle.nextTickTime === undefined) {
        objectFireCircle.nextTickTime = game.state.time + objectFireCircle.tickInterval;
    }
    if (objectFireCircle.moveAttachment) {
        const toolFunctions = SPELLMAKER_MOVE_TOOLS_FUNCTIONS[objectFireCircle.moveAttachment.type];
        if (toolFunctions.getMoveAttachmentNextMoveByAmount) {
            const moveXY: Position = toolFunctions.getMoveAttachmentNextMoveByAmount(objectFireCircle.moveAttachment, objectFireCircle, game);
            objectFireCircle.x += moveXY.x;
            objectFireCircle.y += moveXY.y;
        }
    }
    if (objectFireCircle.nextTickTime <= game.state.time) {
        const maxEnemySizeEstimate = 40;
        const characters = determineCharactersInDistance(objectFireCircle, game.state.map, game.state.players, game.state.bossStuff.bosses, objectFireCircle.radius * 2 + maxEnemySizeEstimate, abilityObject.faction, true);
        if (characters.length > 0) {
            let ability: AbilitySpellmaker | undefined = undefined;
            if (abilityObject.abilityIdRef !== undefined) {
                for (let player of game.state.players) {
                    const result = findAbilityAndOwnerInCharacterById(player.character, abilityObject.abilityIdRef);
                    if (result) ability = result.ability as AbilitySpellmaker;
                }
            }
            for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
                const c = characters[charIt];
                const distance = calculateDistance(c, abilityObject);
                if (distance < objectFireCircle.radius + c.width / 2) {
                    let takeDamage = objectFireCircle.damage;
                    characterTakeDamage(c, takeDamage, game, abilityObject.abilityIdRef, abilityObject.type, abilityObject);
                    if (ability) spellmakerAddToolDamage(ability, objectFireCircle.damage, objectFireCircle.toolChain, game);
                }
            }

            objectFireCircle.nextTickTime += objectFireCircle.tickInterval;
            if (objectFireCircle.nextTickTime <= game.state.time) {
                objectFireCircle.nextTickTime = game.state.time + objectFireCircle.tickInterval;
            }
        }
    }
}
