import { AbilityOwner } from "../../../ability/ability.js";
import { calculateDistance, findClientInfoByCharacterId } from "../../../game.js";
import { Position, Game, ClientInfo } from "../../../gameModel.js";
import { AbilitySpellmaker, SpellmakerCreateToolObjectData } from "./abilitySpellmaker.js";
import { SPELLMAKER_TOOLS_FUNCTIONS, SpellmakerCreateTool } from "./spellmakerTool.js";
import { createMoreInfosPart } from "../../../moreInfo.js";
import { createAbilityObjectSpellmakerLightning } from "./abilitySpellmakerLightning.js";
import { IMAGE_NAME_LIGHTNING } from "../../../ability/ball/abilityLightningBall.js";

export type CreateToolObjectLightningData = SpellmakerCreateToolObjectData & {
    jumps: number,
    center: Position,
    damageFactor: number,
}

export type SpellmakerCreateToolLightning = SpellmakerCreateTool & {
    workInProgress?: CreateToolObjectLightningData,
}

export const SPELLMAKER_TOOL_LIGHTNING = "Lightning";

export function addSpellmakerToolLightning() {
    SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_LIGHTNING] = {
        calculateDistance: calculateDistanceLightning,
        calculateManaCost: calculateManaCost,
        createTool: createTool,
        onKeyDown: onKeyDown,
        onKeyUp: onKeyUp,
        onTick: onTick,
        paint: paint,
        spellCast: spellCast,
        description: [
            "Tool: Lightning",
            "Mouse Move Vertical: Change Damage",
            "Mouse Move Horizontal: Change Jumps",
            `can have move attach: No`,
            `can have next stage: No`,
        ],
        learnedThroughUpgrade: true,
        availableOnFirstUpgradeChoice: true,
    };
}

function createObjectLightning(center: Position): CreateToolObjectLightningData {
    return {
        type: SPELLMAKER_TOOL_LIGHTNING,
        center: center,
        damageFactor: 1,
        jumps: 1,
        baseDamage: 10,
        nextStage: [],
    }
}

function createTool(ctx: CanvasRenderingContext2D): SpellmakerCreateTool {
    return {
        type: SPELLMAKER_TOOL_LIGHTNING,
        subType: "default",
        level: 0,
        totalDamage: 0,
        buttonImage: IMAGE_NAME_LIGHTNING,
    };
}

function calculateDistanceLightning(relativePosition: Position, createObject: SpellmakerCreateToolObjectData): number {
    const object = createObject as CreateToolObjectLightningData;
    return Math.max(0, calculateDistance(relativePosition, object.center));
}

function calculateManaCost(createObject: SpellmakerCreateToolObjectData): number {
    const object = createObject as CreateToolObjectLightningData;
    let manaCost = (object.jumps * object.damageFactor) / 10;
    return manaCost;
}


function onKeyDown(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) {
    const toolLightning = tool as SpellmakerCreateToolLightning;
    toolLightning.workInProgress = createObjectLightning({ x: castPositionRelativeToCharacter.x, y: castPositionRelativeToCharacter.y });
}

function onKeyUp(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game): SpellmakerCreateToolObjectData | undefined {
    const toolLightning = tool as SpellmakerCreateToolLightning;
    if (toolLightning.workInProgress) {
        const lightning = toolLightning.workInProgress as CreateToolObjectLightningData;
        lightning.jumps = Math.round(Math.min(20, Math.max(1, Math.abs((castPositionRelativeToCharacter.x - lightning.center.x) / 10))));
        lightning.damageFactor = Math.min(10, (Math.max(1, Math.abs(castPositionRelativeToCharacter.y - lightning.center.y) / 10)));
        toolLightning.workInProgress = undefined;
        return lightning;
    }
    return undefined;
}

function onTick(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game) {
    const clientInfo: ClientInfo | undefined = findClientInfoByCharacterId(abilityOwner.id, game);
    if (clientInfo) {
        const toolLightning = tool as SpellmakerCreateToolLightning;
        if (toolLightning.workInProgress) {
            const relativePos: Position = {
                x: clientInfo.lastMousePosition.x - abilityOwner.x,
                y: clientInfo.lastMousePosition.y - abilityOwner.y,
            };
            const lightning = toolLightning.workInProgress as CreateToolObjectLightningData;
            lightning.jumps = Math.round(Math.min(20, Math.max(1, Math.abs((relativePos.x - lightning.center.x) / 10))));
            lightning.damageFactor = Math.min(10, (Math.max(1, Math.abs(relativePos.y - lightning.center.y) / 10)));
        }
    }
}

function spellCast(createObject: SpellmakerCreateToolObjectData, baseDamage: number, faction: string, abilityId: number, castPosition: Position, damageFactor: number, manaFactor: number, toolChain: string[], stageId: number, stageIndex: number, game: Game) {
    const lightning = createObject as CreateToolObjectLightningData;
    const damage = baseDamage * lightning.damageFactor * damageFactor;
    const center: Position = {
        x: lightning.center.x + castPosition.x,
        y: lightning.center.y + castPosition.y,
    };
    const lightningObject = createAbilityObjectSpellmakerLightning(faction, center, lightning.jumps, damage, abilityId, damageFactor, manaFactor, [...toolChain], stageId, stageIndex, game);
    game.state.abilityObjects.push(lightningObject);
}

function paint(ctx: CanvasRenderingContext2D, createdObject: SpellmakerCreateToolObjectData, ownerPaintPos: Position, ability: AbilitySpellmaker, game: Game) {
    const lightning = createdObject as CreateToolObjectLightningData;
    ctx.globalAlpha = 0.3 + 0.07 * lightning.damageFactor;
    ctx.strokeStyle = "white";
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(lightning.center.x + ownerPaintPos.x, lightning.center.y + ownerPaintPos.y, 5 + lightning.jumps, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
}
