import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, getAbilityNameUiText, paintAbilityUiDefault } from "../../../ability/ability.js";
import { IMAGE_NAME_SWITCH } from "../../../ability/musician/abilityMusicSheetChangeInstrument.js";
import { autoSendMousePositionHandler, getNextId } from "../../../game.js";
import { Game, IdCounter, Position } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { playerInputBindingToDisplayValue } from "../../../input/playerInput.js";
import { createMoreInfosPart, MoreInfoHoverTexts, MoreInfoPart } from "../../../moreInfo.js";
import { CHARACTER_PET_TYPE_CLONE } from "../characterPetTypeClone.js";
import { addSpellmakerToolsDefault, SPELLMAKER_MOVE_TOOLS_FUNCTIONS, SPELLMAKER_TOOL_SWITCH_STAGE, SPELLMAKER_TOOLS_FUNCTIONS, SpellmakerCreateToolsData } from "./spellmakerTool.js";
import { addSpellmakerToolExplosion, SPELLMAKER_TOOL_EXPLOSION } from "./spellmakerToolExplosion.js";
import { addSpellmakerToolFireline, SPELLMAKER_TOOL_FIRELINE } from "./spellmakerToolFireLine.js";
import { addSpellmakerToolMove, SPELLMAKER_TOOL_MOVE } from "./spellmakerToolMove.js";
import { addSpellmakerToolSeeker, SPELLMAKER_TOOL_SEEKER } from "./spellmakerToolSeeker.js";
import { addSpellmakerToolProximity, SPELLMAKER_TOOL_PROXIMITY } from "./spellmakerToolTriggerProximity.js";

export type AbilitySpellmaker = Ability & {
    mode: "spellmake" | "spellcast",
    mana: number,
    maxMana: number,
    manaRegeneration: number
    attachToIndex?: number[],
    createdObjects: SpellmakerCreateToolObjectData[],
    spellManaCost: number,
    createTools: SpellmakerCreateToolsData,
    spellmakeStage: number,
}

export type SpellmakerCreateToolObjectData = {
    type: string,
    level: number,
    castPosOffset?: Position,
    moveAttachment?: SpellmakerCreateToolMoveAttachment,
    nextStage: SpellmakerCreateToolObjectData[],
}

export type SpellmakerCreateToolMoveAttachment = {
    type: string,
}

export const ABILITY_NAME_SPELLMAKER = "Spellmaker";

export function addAbilitySpellmaker() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_SPELLMAKER] = {
        activeAbilityCast: castAbility,
        createAbility: createAbility,
        createAbilityMoreInfos: createAbilityMoreInfos,
        paintAbility: paintAbility,
        paintAbilityUI: paintAbilityUI,
        setAbilityToLevel: setAbilityToLevel,
        setAbilityToBossLevel: setAbilityToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        tickAbility: tickAbility,
    };
    addSpellmakerToolsDefault();
    addSpellmakerToolFireline();
    addSpellmakerToolMove();
    addSpellmakerToolExplosion();
    addSpellmakerToolSeeker();
    addSpellmakerToolProximity();
}

function createAbility(
    idCounter: IdCounter,
    playerInputBinding?: string,
): AbilitySpellmaker {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_SPELLMAKER,
        playerInputBinding: playerInputBinding,
        passive: true,
        upgrades: {},
        tradable: true,
        mana: 100,
        maxMana: 100,
        manaRegeneration: 0.1,
        mode: "spellmake",
        createdObjects: [],
        spellManaCost: 0,
        createTools: {
            selectedToolIndex: 0,
            createTools: [
                { type: SPELLMAKER_TOOL_SWITCH_STAGE, subType: "default" },
                { type: SPELLMAKER_TOOL_FIRELINE, subType: "default" },
                { type: SPELLMAKER_TOOL_MOVE, subType: "move" },
                { type: SPELLMAKER_TOOL_EXPLOSION, subType: "default" },
                { type: SPELLMAKER_TOOL_SEEKER, subType: "move" },
                { type: SPELLMAKER_TOOL_PROXIMITY, subType: "default" },
            ],
            position: { x: -20, y: +20 },
            size: 20,
        },
        spellmakeStage: 0,
    };
}

function tickAbility(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilitySm = ability as AbilitySpellmaker;
    abilitySm.mana = Math.min(abilitySm.mana + abilitySm.manaRegeneration, abilitySm.maxMana);
    if (abilitySm.mode === "spellmake") {
        const tool = abilitySm.createTools.createTools[abilitySm.createTools.selectedToolIndex];
        if (tool.subType == "default") {
            const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[tool.type];
            if (toolFunctions.onTick) toolFunctions.onTick(tool, abilityOwner, abilitySm, game);
        } else if (tool.subType == "move") {
            const toolFunctions = SPELLMAKER_MOVE_TOOLS_FUNCTIONS[tool.type];
            if (toolFunctions.onTick) toolFunctions.onTick(tool, abilityOwner, abilitySm, game);
        }
    }
}

export function abilitySpellmakerCalculateManaCost(ability: AbilitySpellmaker) {
    ability.spellManaCost = 0;
    for (let createdObject of ability.createdObjects) {
        const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[createdObject.type];
        if (toolFunctions.calculateManaCost) ability.spellManaCost += toolFunctions.calculateManaCost(createdObject);
    }
}

function paintToolObjectsRecusive(ctx: CanvasRenderingContext2D, stage: number, createdObject: SpellmakerCreateToolObjectData, ability: AbilitySpellmaker, ownerPaintPos: Position, game: Game) {
    const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[createdObject.type];
    if ((stage == ability.spellmakeStage - 1 && toolFunctions.canHaveNextStage) || stage == ability.spellmakeStage) {
        if (toolFunctions.paint) {
            toolFunctions.paint(ctx, createdObject, ownerPaintPos, ability, game);
            if (toolFunctions.canHaveMoveAttachment && createdObject.moveAttachment) {
                const toolMoveFunctions = SPELLMAKER_MOVE_TOOLS_FUNCTIONS[createdObject.moveAttachment.type];
                toolMoveFunctions.paint(ctx, createdObject.moveAttachment, ownerPaintPos, ability, game);
            }
        }
    } else if (stage < ability.spellmakeStage) {
        for (let stageObjects of createdObject.nextStage) {
            paintToolObjectsRecusive(ctx, stage + 1, stageObjects, ability, ownerPaintPos, game);
        }
    }
}

function paintAbility(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    if (abilityOwner.type === CHARACTER_PET_TYPE_CLONE) return;
    if (ability.disabled) return;
    const abilitySm = ability as AbilitySpellmaker;
    if (abilitySm.mode === "spellmake") {
        let ownerPaintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition, game.UI.zoom);
        for (let createdObject of abilitySm.createdObjects) {
            paintToolObjectsRecusive(ctx, 0, createdObject, abilitySm, ownerPaintPos, game);
        }
        const tool = abilitySm.createTools.createTools[abilitySm.createTools.selectedToolIndex];
        if (tool.workInProgress) {
            if (tool.subType == "default") {
                const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[tool.type];
                if (toolFunctions.paint) toolFunctions.paint(ctx, tool.workInProgress, ownerPaintPos, abilitySm, game);

            } else if (tool.subType == "move") {
                const toolMoveFunctions = SPELLMAKER_MOVE_TOOLS_FUNCTIONS[tool.type];
                toolMoveFunctions.paint(ctx, tool.workInProgress, ownerPaintPos, abilitySm, game);
            }
        }

        for (let i = 0; i < abilitySm.createTools.createTools.length; i++) {
            ctx.lineWidth = 1;
            ctx.strokeStyle = "black";
            ctx.fillStyle = "white";
            ctx.fillRect(ownerPaintPos.x + abilitySm.createTools.position.x + abilitySm.createTools.size * i, ownerPaintPos.y + abilitySm.createTools.position.y, abilitySm.createTools.size, abilitySm.createTools.size);
            ctx.beginPath();
            ctx.rect(ownerPaintPos.x + abilitySm.createTools.position.x + abilitySm.createTools.size * i, ownerPaintPos.y + abilitySm.createTools.position.y, abilitySm.createTools.size, abilitySm.createTools.size);
            ctx.stroke();
        }
    }
}

function paintAbilityUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    paintAbilityUiDefault(ctx, ability, drawStartX, drawStartY, size, game, IMAGE_NAME_SWITCH);
}

function castAbility(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, castPositionRelativeToCharacter: Position | undefined, isKeydown: boolean, game: Game) {
    if (!abilityOwner.abilities) return;
    const abilitySm: AbilitySpellmaker | undefined = abilityOwner.abilities.find(a => a.name === ABILITY_NAME_SPELLMAKER) as AbilitySpellmaker;
    if (!abilitySm) return;
    if (abilitySm.mode === "spellmake") {
        if (castPositionRelativeToCharacter) {
            const tool = abilitySm.createTools.createTools[abilitySm.createTools.selectedToolIndex];
            if (isKeydown) {
                if (!clickCreateToolsCheck(abilityOwner, abilitySm, castPositionRelativeToCharacter, game)) {
                    autoSendMousePositionHandler(abilityOwner.id, `${abilitySm.name}`, true, castPosition, game);
                    if (tool.subType == "default") {
                        if (abilitySm.spellmakeStage == 0) {
                            const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[tool.type];
                            if (toolFunctions.onKeyDown) toolFunctions.onKeyDown(tool, abilityOwner, abilitySm, castPositionRelativeToCharacter, game);
                        } else {
                            abilitySm.attachToIndex = findClosestAttachToIndex(abilitySm, castPositionRelativeToCharacter, false);
                            if (abilitySm.attachToIndex != undefined) {
                                const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[tool.type];
                                if (toolFunctions.onKeyDown) toolFunctions.onKeyDown(tool, abilityOwner, abilitySm, castPositionRelativeToCharacter, game);
                            }
                        }
                    } else if (tool.subType == "move") {
                        abilitySm.attachToIndex = findClosestAttachToIndex(abilitySm, castPositionRelativeToCharacter, true);
                        if (abilitySm.attachToIndex != undefined) {
                            const toolFunctions = SPELLMAKER_MOVE_TOOLS_FUNCTIONS[tool.type];
                            if (toolFunctions.onKeyDown) toolFunctions.onKeyDown(tool, abilityOwner, abilitySm, castPositionRelativeToCharacter, game);
                        }
                    }
                }
            } else {
                autoSendMousePositionHandler(abilityOwner.id, `${abilitySm.name}`, false, castPosition, game);
                if (tool.subType == "default") {
                    const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[tool.type];
                    if (toolFunctions.onKeyUp) {
                        const result = toolFunctions.onKeyUp(tool, abilityOwner, abilitySm, castPositionRelativeToCharacter, game);
                        if (result) {
                            if (abilitySm.spellmakeStage == 0) {
                                abilitySm.createdObjects.push(result);
                            } else if (abilitySm.attachToIndex != undefined) {
                                let currentObject = abilitySm.createdObjects[abilitySm.attachToIndex[0]];
                                let currentStage = 0;
                                while (currentStage < abilitySm.spellmakeStage - 1) {
                                    if (currentObject.nextStage) {
                                        currentStage++;
                                        currentObject = currentObject.nextStage[abilitySm.attachToIndex[currentStage]];
                                    } else {
                                        return;
                                    }
                                }
                                currentObject.nextStage.push(result);
                            }
                        }
                    }
                } else if (tool.subType == "move") {
                    const toolFunctions = SPELLMAKER_MOVE_TOOLS_FUNCTIONS[tool.type];
                    if (toolFunctions.onKeyUp) {
                        if (abilitySm.attachToIndex != undefined) {
                            const result = toolFunctions.onKeyUp(tool, abilityOwner, abilitySm, castPositionRelativeToCharacter, game);
                            if (result) {
                                let currentObject = abilitySm.createdObjects[abilitySm.attachToIndex[0]];
                                let currentStage = 0;
                                while (currentStage < abilitySm.spellmakeStage) {
                                    if (currentObject.nextStage) {
                                        currentStage++;
                                        currentObject = currentObject.nextStage[abilitySm.attachToIndex[currentStage]];
                                    } else {
                                        return;
                                    }
                                }
                                currentObject.moveAttachment = result;
                            }
                        }
                    }
                }
            }
        }
    }
    if (abilitySm.mode === "spellcast") {
        if (isKeydown) {
            if (abilitySm.mana > abilitySm.spellManaCost) {
                abilitySm.mana -= abilitySm.spellManaCost;
                for (let createdObject of abilitySm.createdObjects) {
                    const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[createdObject.type];
                    if (toolFunctions.spellCast) toolFunctions.spellCast(createdObject, ability.level!.level, abilityOwner.faction, ability.id, castPosition, game);
                }
            }
        }
    }
}

function findClosestAttachToIndexRecursive(stage: number, currentStage: SpellmakerCreateToolObjectData[], ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, moveToAttach: boolean): { closestDistance: number, attachToIndexes: number[] } | undefined {
    let closestDistance = 0;
    let attachToIndexes: number[] | undefined = undefined;
    if (ability.spellmakeStage > stage) {
        for (let objectIndex = 0; objectIndex < currentStage.length; objectIndex++) {
            const stageObject = currentStage[objectIndex];
            const result = findClosestAttachToIndexRecursive(stage + 1, stageObject.nextStage, ability, castPositionRelativeToCharacter, moveToAttach);
            if (result && (attachToIndexes === undefined || result.closestDistance < closestDistance)) {
                closestDistance = result.closestDistance;
                attachToIndexes = result.attachToIndexes;
                attachToIndexes.unshift(objectIndex);
            }
        }
    } else {
        for (let objectIndex = 0; objectIndex < currentStage.length; objectIndex++) {
            const stageObject = currentStage[objectIndex];
            const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[stageObject.type];
            if (toolFunctions.calculateDistance && (
                (moveToAttach && toolFunctions.canHaveMoveAttachment)
                || (!moveToAttach && toolFunctions.canHaveNextStage))
            ) {
                const tempDistance = toolFunctions.calculateDistance(castPositionRelativeToCharacter, stageObject);
                closestDistance = tempDistance;
                attachToIndexes = [objectIndex];
            }
        }

    }
    if (attachToIndexes !== undefined) {
        return { closestDistance: closestDistance, attachToIndexes: attachToIndexes };
    } else {
        return undefined;
    }
}


function findClosestAttachToIndex(ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, moveToAttach: boolean): number[] | undefined {
    const result = findClosestAttachToIndexRecursive(0, ability.createdObjects, ability, castPositionRelativeToCharacter, moveToAttach);
    if (result && result.closestDistance < 20) {
        return result.attachToIndexes;
    }
    return undefined;
}

/// returns true if a tool button was clicked
function clickCreateToolsCheck(abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position | undefined, game: Game): boolean {
    if (!castPositionRelativeToCharacter) return false;
    for (let i = 0; i < ability.createTools.createTools.length; i++) {
        const pos: Position = { x: ability.createTools.position.x + ability.createTools.size * i, y: ability.createTools.position.y };
        if (pos.x < castPositionRelativeToCharacter.x && pos.x + ability.createTools.size > castPositionRelativeToCharacter.x && pos.y < castPositionRelativeToCharacter.y && pos.y + ability.createTools.size > castPositionRelativeToCharacter.y) {
            const tool = ability.createTools.createTools[i];
            const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[tool.type];
            if (toolFunctions && toolFunctions.onToolSelect) {
                if (toolFunctions.onToolSelect(tool, abilityOwner, ability, game)) {
                    ability.createTools.selectedToolIndex = i;
                }
            } else {
                ability.createTools.selectedToolIndex = i;
            }
            return true;
        }
    }
    return false;
}


function setAbilityToLevel(ability: Ability, level: number) {
    const sm = ability as AbilitySpellmaker;
}

function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const sm = ability as AbilitySpellmaker;
}

function setAbilityToBossLevel(ability: Ability, level: number) {
    const sm = ability as AbilitySpellmaker;
}

function createAbilityMoreInfos(ctx: CanvasRenderingContext2D, ability: Ability, game: Game): MoreInfoPart {
    const abilitySpellmaker = ability as AbilitySpellmaker;
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(
        `Key: ${playerInputBindingToDisplayValue(abilitySpellmaker.playerInputBinding!, game)}`,
        `Work in Progress`,
    );
    if (abilitySpellmaker.level) {
        textLines.push(`Level: ${abilitySpellmaker.level.level}`);
        if (abilitySpellmaker.level.leveling) {
            textLines.push(
                `XP: ${abilitySpellmaker.level.leveling.experience.toFixed(0)}/${abilitySpellmaker.level.leveling.experienceForLevelUp}`,
                `  on level up you gain:`,
                `    +<placeholder> damage per second`,
            );
        }
    }
    textLines.push(`<placeholder>`);
    const upgradeHoverLines: MoreInfoHoverTexts = {};
    // pushAbilityUpgradesUiTexts(ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS, textLines, upgradeHoverLines, ability);

    return createMoreInfosPart(ctx, textLines, undefined, 14, upgradeHoverLines);
}