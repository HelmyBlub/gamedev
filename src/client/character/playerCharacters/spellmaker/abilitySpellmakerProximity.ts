import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityObjectCircle, detectAbilityObjectCircleToCharacterHit, findAbilityOwnerByAbilityIdInPlayers, PaintOrderAbility } from "../../../ability/ability.js";
import { getNextId, getCameraPosition, deepCopy } from "../../../game.js";
import { Position, IdCounter, Game, FACTION_ENEMY, FACTION_PLAYER } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { determineCharactersInDistance } from "../../character.js";
import { SpellmakerCreateToolMoveAttachment, SpellmakerCreateToolObjectData } from "./abilitySpellmaker.js";
import { SPELLMAKER_MOVE_TOOLS_FUNCTIONS, SPELLMAKER_TOOLS_FUNCTIONS } from "./spellmakerTool.js";

export type AbilitySpellmakerProximity = Ability & {
    radius: number,
}

type AbilityObjectSpellmakerProximity = AbilityObjectCircle & {
    triggered: boolean,
    triggerRadius: number,
    removeTime?: number,
    latestTriggerTime: number,
    nextTriggerCheckTime?: number,
    moveAttachment?: SpellmakerCreateToolMoveAttachment,
    nextStage: SpellmakerCreateToolObjectData[],
}

export const ABILITY_NAME_SPELLMAKER_PROXIMITY = "SpellmakerProximity";

export function addAbilitySpellmakerProximity() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_SPELLMAKER_PROXIMITY] = {
        tickAbilityObject: tickAbilityObject,
        createAbility: createAbilitySpellmakerProximity,
        deleteAbilityObject: deleteAbilityObject,
        paintAbilityObject: paintAbilityObject,
    };
}

export function createAbilityObjectSpellmakerProximity(
    position: Position,
    triggerRadius: number,
    moveAttachment: SpellmakerCreateToolMoveAttachment | undefined,
    nextStage: SpellmakerCreateToolObjectData[],
    faction: string,
    abilityIdRef: number | undefined,
    gametime: number,
): AbilityObjectSpellmakerProximity {
    return {
        type: ABILITY_NAME_SPELLMAKER_PROXIMITY,
        color: "red",
        faction: faction,
        x: position.x,
        y: position.y,
        triggered: false,
        radius: 10,
        abilityIdRef: abilityIdRef,
        damage: 0,
        triggerRadius: triggerRadius,
        moveAttachment: deepCopy(moveAttachment),
        nextStage: nextStage,
        latestTriggerTime: gametime + 10_000,
    };
}

function createAbilitySpellmakerProximity(
    idCounter: IdCounter,
    playerInputBinding?: string,
): AbilitySpellmakerProximity {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_SPELLMAKER_PROXIMITY,
        radius: 20,
        passive: true,
        upgrades: {},
    };
}

function deleteAbilityObject(abilityObject: AbilityObject, game: Game): boolean {
    const abilityObjectProximity = abilityObject as AbilityObjectSpellmakerProximity;
    return abilityObjectProximity.removeTime !== undefined && abilityObjectProximity.removeTime <= game.state.time;
}

function paintAbilityObject(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "beforeCharacterPaint") return;
    const abilityObjectProximity = abilityObject as AbilityObjectSpellmakerProximity;
    const cameraPosition = getCameraPosition(game);
    const paintPos = getPointPaintPosition(ctx, abilityObject, cameraPosition, game.UI.zoom);
    ctx.fillStyle = abilityObject.faction === FACTION_ENEMY ? "black" : abilityObject.color;
    if (abilityObject.faction === FACTION_PLAYER) ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;
    ctx.beginPath();
    ctx.arc(
        paintPos.x,
        paintPos.y,
        abilityObjectProximity.radius, 0, 2 * Math.PI
    );
    ctx.fill();
    ctx.globalAlpha = 1;
}

function tickAbilityObject(abilityObject: AbilityObject, game: Game) {
    const abilityObjectProximity = abilityObject as AbilityObjectSpellmakerProximity;
    if (abilityObjectProximity.triggered) return;
    if (abilityObjectProximity.nextTriggerCheckTime == undefined || abilityObjectProximity.nextTriggerCheckTime <= game.state.time) {
        abilityObjectProximity.nextTriggerCheckTime = game.state.time + 100;

        let targets = determineCharactersInDistance(abilityObject, game.state.map, [], game.state.bossStuff.bosses, abilityObjectProximity.triggerRadius, abilityObject.faction, true);
        if (targets.length > 0 || abilityObjectProximity.latestTriggerTime < game.state.time) {
            abilityObjectProximity.triggered = true;
            for (let stageObject of abilityObjectProximity.nextStage) {
                const spellmakerFunctions = SPELLMAKER_TOOLS_FUNCTIONS[stageObject.type];
                if (spellmakerFunctions.spellCast) {
                    const pos: Position = { x: abilityObject.x, y: abilityObject.y };
                    if (stageObject.castPosOffset) {
                        pos.x += stageObject.castPosOffset.x;
                        pos.y += stageObject.castPosOffset.y;
                    }
                    spellmakerFunctions.spellCast(stageObject, stageObject.level, abilityObject.faction, abilityObject.abilityIdRef!, pos, game);
                }
            }
            abilityObjectProximity.removeTime = game.state.time;
        }
    }

    if (abilityObjectProximity.moveAttachment) {
        const toolFunctions = SPELLMAKER_MOVE_TOOLS_FUNCTIONS[abilityObjectProximity.moveAttachment.type];
        if (toolFunctions.getMoveAttachmentNextMoveByAmount) {
            const moveXY: Position = toolFunctions.getMoveAttachmentNextMoveByAmount(abilityObjectProximity.moveAttachment, abilityObject, game);
            abilityObjectProximity.x += moveXY.x;
            abilityObjectProximity.y += moveXY.y;
        }
    }
}
