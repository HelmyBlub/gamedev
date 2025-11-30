import { AbilityOwner } from "../../../ability/ability.js";
import { calculateDistance, findClientInfoByCharacterId } from "../../../game.js";
import { Position, Game, ClientInfo } from "../../../gameModel.js";
import { AbilitySpellmaker, SpellmakerCreateToolObjectData } from "./abilitySpellmaker.js";
import { SPELLMAKER_TOOLS_FUNCTIONS, SpellmakerCreateTool } from "./spellmakerTool.js";
import { createAbilityObjectExplode } from "../../../ability/abilityExplode.js";
import { createMoreInfosPart } from "../../../moreInfo.js";
import { createAbilityObjectSpellmakerExplode } from "./abilitySpellmakerExplode.js";

type CreateToolObjectExplosionData = SpellmakerCreateToolObjectData & {
    radius: number,
    center: Position,
    damageFactor: number,
}

export type SpellmakerCreateToolExplosion = SpellmakerCreateTool & {
    workInProgress?: CreateToolObjectExplosionData,
}

export const SPELLMAKER_TOOL_EXPLOSION = "Explosion";

export function addSpellmakerToolExplosion() {
    SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_EXPLOSION] = {
        calculateDistance: calculateDistanceExplosion,
        calculateManaCost: calculateManaCost,
        createTool: createTool,
        onKeyDown: onKeyDown,
        onKeyUp: onKeyUp,
        onTick: onTick,
        paint: paint,
        spellCast: spellCast,
        description: [
            "Tool: Explosion",
            "Mouse Move Vertical: Change Damage",
            "Mouse Move Horizontal: Change Size",
            `can have move attach: No`,
            `can have next stage: No`,
        ],
        learnedThroughUpgrade: true,
        availableOnFirstUpgradeChoice: true,
    };
}

function createObjectExplosion(center: Position): CreateToolObjectExplosionData {
    return {
        type: SPELLMAKER_TOOL_EXPLOSION,
        center: center,
        damageFactor: 1,
        radius: 5,
        level: 1,
        nextStage: [],
    }
}

function createTool(ctx: CanvasRenderingContext2D): SpellmakerCreateTool {
    return {
        type: SPELLMAKER_TOOL_EXPLOSION,
        subType: "default",
        description: createMoreInfosPart(ctx, SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_EXPLOSION].description),
        level: 0,
        totalDamage: 0,
    };
}

function calculateDistanceExplosion(relativePosition: Position, createObject: SpellmakerCreateToolObjectData): number {
    const object = createObject as CreateToolObjectExplosionData;
    return Math.max(0, calculateDistance(relativePosition, object.center) - object.radius);
}

function calculateManaCost(createObject: SpellmakerCreateToolObjectData): number {
    const object = createObject as CreateToolObjectExplosionData;
    let manaCost = (object.radius * object.radius * object.damageFactor) / 10000;
    return manaCost;
}


function onKeyDown(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game) {
    const toolExplode = tool as SpellmakerCreateToolExplosion;
    toolExplode.workInProgress = createObjectExplosion({ x: castPositionRelativeToCharacter.x, y: castPositionRelativeToCharacter.y });
}

function onKeyUp(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, game: Game): SpellmakerCreateToolObjectData | undefined {
    const toolExplode = tool as SpellmakerCreateToolExplosion;
    if (toolExplode.workInProgress) {
        const explode = toolExplode.workInProgress;
        explode.radius = Math.max(5, Math.abs(castPositionRelativeToCharacter.x - explode.center.x))
        explode.damageFactor = Math.min(10, (Math.max(1, Math.abs(castPositionRelativeToCharacter.y - explode.center.y) / 10)));
        toolExplode.workInProgress = undefined;
        return explode;
    }
    return undefined;
}

function onTick(tool: SpellmakerCreateTool, abilityOwner: AbilityOwner, ability: AbilitySpellmaker, game: Game) {
    const clientInfo: ClientInfo | undefined = findClientInfoByCharacterId(abilityOwner.id, game);
    if (clientInfo) {
        const toolExplode = tool as SpellmakerCreateToolExplosion;
        if (toolExplode.workInProgress) {
            const relativePos: Position = {
                x: clientInfo.lastMousePosition.x - abilityOwner.x,
                y: clientInfo.lastMousePosition.y - abilityOwner.y,
            };
            const explode = toolExplode.workInProgress;
            explode.radius = Math.max(5, Math.abs(relativePos.x - explode.center.x))
            explode.damageFactor = Math.min(10, (Math.max(1, Math.abs(relativePos.y - explode.center.y) / 10)));
        }
    }
}

function spellCast(createObject: SpellmakerCreateToolObjectData, level: number, faction: string, abilityId: number, castPosition: Position, damageFactor: number, manaFactor: number, toolChain: string[], game: Game) {
    const explode = createObject as CreateToolObjectExplosionData;
    const damage = level * 10 * explode.damageFactor * damageFactor;
    const center: Position = {
        x: explode.center.x + castPosition.x,
        y: explode.center.y + castPosition.y,
    };
    const explodeObject = createAbilityObjectSpellmakerExplode(center, damage, explode.radius, faction, damageFactor, manaFactor, [...toolChain], abilityId, 0, game);
    game.state.abilityObjects.push(explodeObject);
}

function paint(ctx: CanvasRenderingContext2D, createdObject: SpellmakerCreateToolObjectData, ownerPaintPos: Position, ability: AbilitySpellmaker, game: Game) {
    const explode = createdObject as CreateToolObjectExplosionData;
    ctx.globalAlpha = 0.1 + 0.09 * explode.damageFactor;
    ctx.strokeStyle = "red";
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(explode.center.x + ownerPaintPos.x, explode.center.y + ownerPaintPos.y, explode.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
}
