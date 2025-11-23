import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityObjectCircle, detectAbilityObjectCircleToCharacterHit, findAbilityOwnerByAbilityIdInPlayers, PaintOrderAbility } from "../../../ability/ability.js";
import { getNextId, getCameraPosition, deepCopy } from "../../../game.js";
import { Position, IdCounter, Game, FACTION_ENEMY, FACTION_PLAYER } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { determineCharactersInDistance } from "../../character.js";
import { abilitySpellmakerCalculateManaCost, abilitySpellmakerCastNextStage, AbilitySpellmakerObject, SpellmakerCreateToolMoveAttachment, SpellmakerCreateToolObjectData } from "./abilitySpellmaker.js";
import { SPELLMAKER_MOVE_TOOLS_FUNCTIONS, SPELLMAKER_TOOLS_FUNCTIONS } from "./spellmakerTool.js";

export type AbilitySpellmakerTurret = Ability & {
}

type AbilityObjectSpellmakerTurret = AbilitySpellmakerObject & {
    mana: number,
    triggerManaCost: number,
    triggerRadius: number,
    removeTime?: number,
    nextTriggerTime?: number,
    triggerInterval: number,
    moveAttachment?: SpellmakerCreateToolMoveAttachment,
    nextStage: SpellmakerCreateToolObjectData[],
    radius: number,
}

export const ABILITY_NAME_SPELLMAKER_TURRET = "SpellmakerTurret";

export function addAbilitySpellmakerTurret() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_SPELLMAKER_TURRET] = {
        tickAbilityObject: tickAbilityObject,
        createAbility: createAbilitySpellmakerTurret,
        deleteAbilityObject: deleteAbilityObject,
        paintAbilityObject: paintAbilityObject,
    };
}

export function createAbilityObjectSpellmakerTurret(
    position: Position,
    moveAttachment: SpellmakerCreateToolMoveAttachment | undefined,
    nextStage: SpellmakerCreateToolObjectData[],
    maxDuration: number,
    mana: number,
    manaFactor: number,
    toolChain: string[],
    faction: string,
    abilityIdRef: number | undefined,
    gametime: number,
): AbilityObjectSpellmakerTurret {
    const spellManaCost = abilitySpellmakerCalculateManaCost(nextStage) * manaFactor;
    return {
        type: ABILITY_NAME_SPELLMAKER_TURRET,
        color: "blue",
        faction: faction,
        x: position.x,
        y: position.y,
        radius: 10,
        abilityIdRef: abilityIdRef,
        damage: 0,
        moveAttachment: deepCopy(moveAttachment),
        nextStage: nextStage,
        mana: mana,
        triggerManaCost: spellManaCost,
        triggerInterval: 250,
        triggerRadius: 200,
        removeTime: gametime + maxDuration,
        manaFactor: manaFactor,
        toolChain: toolChain,
    };
}

function createAbilitySpellmakerTurret(
    idCounter: IdCounter,
    playerInputBinding?: string,
): AbilitySpellmakerTurret {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_SPELLMAKER_TURRET,
        passive: true,
        upgrades: {},
    };
}

function deleteAbilityObject(abilityObject: AbilityObject, game: Game): boolean {
    const turret = abilityObject as AbilityObjectSpellmakerTurret;
    return (turret.removeTime !== undefined && turret.removeTime <= game.state.time) || turret.mana < turret.triggerManaCost;
}

function paintAbilityObject(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder !== "beforeCharacterPaint") return;
    const abilityObjectTurret = abilityObject as AbilityObjectSpellmakerTurret;
    const cameraPosition = getCameraPosition(game);
    const paintPos = getPointPaintPosition(ctx, abilityObject, cameraPosition, game.UI.zoom);
    ctx.fillStyle = abilityObject.faction === FACTION_ENEMY ? "black" : abilityObject.color;
    if (abilityObject.faction === FACTION_PLAYER) ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;
    ctx.beginPath();
    ctx.arc(
        paintPos.x,
        paintPos.y,
        abilityObjectTurret.radius, 0, 2 * Math.PI
    );
    ctx.fill();
    ctx.globalAlpha = 1;
}

function tickAbilityObject(abilityObject: AbilityObject, game: Game) {
    const abilityObjectTurret = abilityObject as AbilityObjectSpellmakerTurret;
    if (abilityObjectTurret.mana < abilityObjectTurret.triggerManaCost) return;
    if (abilityObjectTurret.nextTriggerTime == undefined || abilityObjectTurret.nextTriggerTime <= game.state.time) {
        abilityObjectTurret.nextTriggerTime = game.state.time + abilityObjectTurret.triggerInterval;
        if (abilityObjectTurret.nextStage.length === 0 && abilityObjectTurret.removeTime === undefined) {
            abilityObjectTurret.removeTime = game.state.time + 1000;
        }

        let targets = determineCharactersInDistance(abilityObject, game.state.map, [], game.state.bossStuff.bosses, abilityObjectTurret.triggerRadius, abilityObject.faction, true);
        if (targets.length > 0 || abilityObjectTurret.nextTriggerTime < game.state.time) {
            abilitySpellmakerCastNextStage(abilityObjectTurret.nextStage, abilityObjectTurret, game);
            abilityObjectTurret.mana -= abilityObjectTurret.triggerManaCost;
        }
    }

    if (abilityObjectTurret.moveAttachment) {
        const toolFunctions = SPELLMAKER_MOVE_TOOLS_FUNCTIONS[abilityObjectTurret.moveAttachment.type];
        if (toolFunctions.getMoveAttachmentNextMoveByAmount) {
            const moveXY: Position = toolFunctions.getMoveAttachmentNextMoveByAmount(abilityObjectTurret.moveAttachment, abilityObject, game);
            abilityObjectTurret.x += moveXY.x;
            abilityObjectTurret.y += moveXY.y;
        }
    }
}
