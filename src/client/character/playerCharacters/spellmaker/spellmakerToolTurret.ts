import { AbilityOwner } from "../../../ability/ability.js";
import { calculateDistance, findClientInfoByCharacterId } from "../../../game.js";
import { Position, Game, ClientInfo, FACTION_PLAYER } from "../../../gameModel.js";
import { AbilitySpellmaker, abilitySpellmakerCalculateManaCost, SpellmakerCreateToolMoveAttachment, SpellmakerCreateToolObjectData } from "./abilitySpellmaker.js";
import { SPELLMAKER_MOVE_TOOLS_FUNCTIONS, SPELLMAKER_TOOLS_FUNCTIONS, SpellmakerCreateTool, spellmakerNextStageSetup } from "./spellmakerTool.js";
import { createMoreInfosPart } from "../../../moreInfo.js";
import { createAbilityObjectSpellmakerTurret, IMAGE_TURRET } from "./abilitySpellmakerTurret.js";
import { GAME_IMAGES, getImage, loadImage } from "../../../imageLoad.js";

export type SpellmakerCreateToolObjectTurretData = SpellmakerCreateToolObjectData & {
    mana: number,
    center: Position,
}

export type SpellmakerCreateToolTurret = SpellmakerCreateTool & {
    workInProgress?: SpellmakerCreateToolObjectTurretData,
}

export const SPELLMAKER_TOOL_TURRET = "Turret";
const MAX_DURATION = 60000;

export function addSpellmakerToolTurret() {
    SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_TURRET] = {
        calculateDistance: calculateDistanceTurret,
        calculateManaCost: calculateManaCost,
        createTool: createTool,
        onKeyDown: onKeyDown,
        onKeyUp: onKeyUp,
        onTick: onTick,
        paint: paint,
        spellCast: spellCast,
        calculateManaCostIncludesNextStage: true,
        canHaveMoveAttachment: true,
        canHaveNextStage: true,
        description: [
            "Tool: Turret",
            "Shoots at close enemies",
            "Shoots next stage attachments",
            `Disappears after ${(MAX_DURATION / 1000).toFixed()}sec`,
            "Mouse move horizonzal: mana capacity",
            `can have move attach: Yes`,
            `can have next stage: Yes`,
        ],
        learnedThroughUpgrade: true,
    };
}

function createObjectProximity(center: Position): SpellmakerCreateToolObjectTurretData {
    return {
        type: SPELLMAKER_TOOL_TURRET,
        center: center,
        mana: 1,
        baseDamage: 10,
        nextStage: [],
    }
}

function createTool(ctx: CanvasRenderingContext2D): SpellmakerCreateTool {
    return {
        type: SPELLMAKER_TOOL_TURRET,
        subType: "default",
        description: createMoreInfosPart(ctx, SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_TURRET].description),
        level: 0,
        totalDamage: 0,
        buttonImage: IMAGE_TURRET,
    };
}

function calculateDistanceTurret(relativePosition: Position, createObject: SpellmakerCreateToolObjectData): number {
    const object = createObject as SpellmakerCreateToolObjectTurretData;
    return calculateDistance(relativePosition, object.center);
}

function calculateManaCost(createObject: SpellmakerCreateToolObjectData): number {
    const object = createObject as SpellmakerCreateToolObjectTurretData;
    let manaCost = object.mana;
    let nextStageMana = abilitySpellmakerCalculateManaCost(createObject.nextStage);
    if (nextStageMana > 0) {
        manaCost = Math.max(1, Math.floor(object.mana / nextStageMana)) * nextStageMana + 0.1;
    }
    return manaCost;
}


function onKeyDown(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) {
    const toolTurret = tool as SpellmakerCreateToolTurret;
    toolTurret.workInProgress = createObjectProximity({ x: castPositionRelativeToCharacter.x, y: castPositionRelativeToCharacter.y });
}

function onKeyUp(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game): SpellmakerCreateToolObjectData | undefined {
    const toolTurret = tool as SpellmakerCreateToolTurret;
    if (toolTurret.workInProgress) {
        const turret = toolTurret.workInProgress;
        turret.mana = Math.max(1, Math.abs(castPositionRelativeToCharacter.x - turret.center.x))
        toolTurret.workInProgress = undefined;
        return turret;
    }
    return undefined;
}

function onTick(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game) {
    const clientInfo: ClientInfo | undefined = findClientInfoByCharacterId(abilityOwner.id, game);
    if (clientInfo) {
        const toolTurret = tool as SpellmakerCreateToolTurret;
        if (toolTurret.workInProgress) {
            const relativePos: Position = {
                x: clientInfo.lastMousePosition.x - abilityOwner.x,
                y: clientInfo.lastMousePosition.y - abilityOwner.y,
            };
            const turret = toolTurret.workInProgress;
            turret.mana = Math.max(1, Math.abs(relativePos.x - turret.center.x))
        }
    }
}

function spellCast(createObject: SpellmakerCreateToolObjectData, baseDamage: number, faction: string, abilityId: number, castPosition: Position, damageFactor: number, manaFactor: number, toolChain: string[], game: Game) {
    const toolTurret = createObject as SpellmakerCreateToolObjectTurretData;
    const center: Position = {
        x: toolTurret.center.x + castPosition.x,
        y: toolTurret.center.y + castPosition.y,
    };
    const newToolChain: string[] = [...toolChain];
    let moveAttachment: SpellmakerCreateToolMoveAttachment | undefined = undefined;
    if (toolTurret.moveAttachment) {
        const toolFunctions = SPELLMAKER_MOVE_TOOLS_FUNCTIONS[toolTurret.moveAttachment.type];
        if (toolFunctions.getMoveAttachment) {
            if (!newToolChain.includes(toolTurret.moveAttachment.type)) newToolChain.push(toolTurret.moveAttachment.type);
            moveAttachment = toolFunctions.getMoveAttachment(createObject, castPosition, game);
        }
    }
    const nextStage = spellmakerNextStageSetup(toolTurret.nextStage, baseDamage, toolTurret.center);
    const maxDuration = faction === FACTION_PLAYER ? MAX_DURATION : MAX_DURATION / 4;
    const objectTurret = createAbilityObjectSpellmakerTurret(center, moveAttachment, nextStage, maxDuration, toolTurret.mana, damageFactor, manaFactor, newToolChain, faction, abilityId, game.state.time);
    game.state.abilityObjects.push(objectTurret);
}

function paint(ctx: CanvasRenderingContext2D, createdObject: SpellmakerCreateToolObjectData, ownerPaintPos: Position, ability: AbilitySpellmaker, game: Game) {
    const turret = createdObject as SpellmakerCreateToolObjectTurretData;
    ctx.strokeStyle = "red";
    ctx.fillStyle = "blue";
    const turretImage = getImage(IMAGE_TURRET);

    if (turretImage) {
        ctx.drawImage(turretImage, 0, 0, 40, turretImage.height,
            turret.center.x + ownerPaintPos.x - 20, turret.center.y + ownerPaintPos.y - 20, 40, 40
        );
    }
    ctx.globalAlpha = 0.5;
    ctx.fillRect(turret.center.x + ownerPaintPos.x + 10, turret.center.y + ownerPaintPos.y - turret.mana, 10, 2 + turret.mana);
    ctx.globalAlpha = 1;
}
