import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, DefaultAbilityCastData, getAbilityNameUiText, paintAbilityUiDefault } from "../../../ability/ability.js";
import { AbilityUpgradesFunctions, pushAbilityUpgradesOptions, upgradeAbility } from "../../../ability/abilityUpgrade.js";
import { IMAGE_NAME_SWITCH } from "../../../ability/musician/abilityMusicSheetChangeInstrument.js";
import { AbilityDamageBreakdown } from "../../../combatlog.js";
import { addPaintFloatingTextInfoForMyself } from "../../../floatingText.js";
import { autoSendMousePositionHandler, calculateDistance, getNextId } from "../../../game.js";
import { FACTION_PLAYER, Game, IdCounter, Position } from "../../../gameModel.js";
import { getPointPaintPosition, paintTextWithOutline } from "../../../gamePaint.js";
import { GAME_IMAGES, loadImage } from "../../../imageLoad.js";
import { PlayerAbilityActionData, playerInputBindingToDisplayValue } from "../../../input/playerInput.js";
import { createMoreInfosPart, MoreInfoHoverTexts, MoreInfoPart, paintMoreInfosPart } from "../../../moreInfo.js";
import { fixedRandom, nextRandom } from "../../../randomNumberGenerator.js";
import { findMyCharacter } from "../../character.js";
import { Character } from "../../characterModel.js";
import { moveDirectionToCharacterSpriteIndex } from "../../characterPaint.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../../upgrade.js";
import { CHARACTER_PET_TYPE_CLONE } from "../characterPetTypeClone.js";
import { addAbilitySpellmakerUpgradeTools } from "./abilitySpellmakerUpgrades.js";
import { addSpellmakerToolsDefault, SPELLMAKER_MOVE_TOOLS_FUNCTIONS, SPELLMAKER_TOOL_RESET, SPELLMAKER_TOOLS_FUNCTIONS, SpellmakerCreateToolsData } from "./spellmakerTool.js";
import { addSpellmakerToolExplosion, CreateToolObjectExplosionData, SPELLMAKER_TOOL_EXPLOSION } from "./spellmakerToolExplosion.js";
import { addSpellmakerToolFireline, CreateToolObjectFireLineData, SPELLMAKER_TOOL_FIRELINE } from "./spellmakerToolFireLine.js";
import { addSpellmakerToolLightning, CreateToolObjectLightningData, SPELLMAKER_TOOL_LIGHTNING } from "./spellmakerToolLightning.js";
import { addSpellmakerToolMove } from "./spellmakerToolMove.js";
import { addSpellmakerToolOrbiter } from "./spellmakerToolOrbiter.js";
import { addSpellmakerToolSeeker } from "./spellmakerToolSeeker.js";
import { addSpellmakerToolProximity } from "./spellmakerToolTriggerProximity.js";
import { addSpellmakerToolTurret } from "./spellmakerToolTurret.js";

export type AbilitySpellmaker = Ability & {
    mode: "spellmake" | "spellcast",
    mana: number,
    maxMana: number,
    manaRegeneration: number
    attachToIndex?: number[],
    spells: SpellmakerSpell[],
    spellIndex: number,
    autoCastSpellIndex?: number,
    createTools: SpellmakerCreateToolsData,
    spellmakeStage: number,
    availableSpellTypes: string[],
    manaLevelFactor: number,
    damageLevelFactor: number,
    baseDamage: number,
}
export type AbilitySpellmakerObject = AbilityObject & {
    manaFactor: number,
    damageFactor: number,
    toolChain: string[],
}

export type SpellmakerSpell = {
    createdObjects: SpellmakerCreateToolObjectData[],
    spellManaCost: number,
    spellType: string,
}

export type SpellmakerCreateToolObjectData = {
    type: string,
    baseDamage: number,
    castPosOffset?: Position,
    moveAttachment?: SpellmakerCreateToolMoveAttachment,
    nextStage: SpellmakerCreateToolObjectData[],
}

export type SpellmakerCreateToolMoveAttachment = {
    type: string,
}

export type SpellmakerSpelltypeData = {
    name: string,
    description: string[],
}

type SpellmakerAbilityAdditionalCastData = {
    clickedToolRectangleIndex: number,
}

const IMAGE_NAME_WIZARD_HAT = "wizardHat";
GAME_IMAGES[IMAGE_NAME_WIZARD_HAT] = {
    imagePath: "/images/wizardHat.png",
    spriteRowHeights: [50],
    spriteRowWidths: [50],
};

export const ABILITY_NAME_SPELLMAKER = "Spellmaker";
export const SPELLMAKER_SPELLTYPE_INSTANT = "instant";
export const SPELLMAKER_SPELLTYPE_AUTOCAST = "autocast";
export const SPELLMAKER_SPELLTYPES: SpellmakerSpelltypeData[] = [
    { name: SPELLMAKER_SPELLTYPE_INSTANT, description: ["spell is cast instantly"] },
    { name: SPELLMAKER_SPELLTYPE_AUTOCAST, description: ["spell is cast automatically when mana full"] },
];
export const ABILITY_SPELLMAKER_UPGRADE_FUNCTIONS: AbilityUpgradesFunctions = {};
export const SPELLMAKER_MAX_CAST_RANGE = 1000;
const MAX_SPELL_MANA_COST = 99;

export function addAbilitySpellmaker() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_SPELLMAKER] = {
        paintAbilityAccessoire: paintAbilityAccessoire,
        activeAbilityCast: castAbility,
        createAbility: createAbility,
        createAbilityMoreInfos: createAbilityMoreInfos,
        createAbilityBossUpgradeOptions: createAbilityBossUpgradeOptions,
        createDamageBreakDown: createDamageBreakDown,
        executeUpgradeOption: executeAbilityUpgradeOption,
        getCustomCastData: getCustomCastData,
        paintAbility: paintAbility,
        paintAbilityUI: paintAbilityUI,
        resetAbility: resetAbility,
        setAbilityToLevel: setAbilityToLevel,
        setAbilityToBossLevel: setAbilityToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        setUpAbilityForEnemy: setUpAbilityForEnemy,
        tickAbility: tickAbility,
        tickAI: tickAI,
        abilityUpgradeFunctions: ABILITY_SPELLMAKER_UPGRADE_FUNCTIONS,
        sendRelativeCastPosition: true,
        canBeUsedByBosses: true,
        selfLatePaint: true,
    };
    addSpellmakerToolsDefault();
    addSpellmakerToolFireline();
    addSpellmakerToolMove();
    addSpellmakerToolExplosion();
    addSpellmakerToolSeeker();
    addSpellmakerToolProximity();
    addSpellmakerToolLightning();
    addSpellmakerToolTurret();
    addSpellmakerToolOrbiter();
    addAbilitySpellmakerUpgradeTools();
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
        mode: "spellcast",
        spells: [{ createdObjects: [], spellManaCost: 0, spellType: SPELLMAKER_SPELLTYPE_INSTANT }],
        spellIndex: 0,
        createTools: {
            selectedToolIndex: 0,
            createTools: [],
            position: { x: -20, y: +20 },
            size: 40,
            spacing: 5,
        },
        spellmakeStage: 0,
        availableSpellTypes: [SPELLMAKER_SPELLTYPE_INSTANT],
        damageLevelFactor: 1,
        manaLevelFactor: 1,
        baseDamage: 10,
    };
}

function paintAbilityAccessoire(ctx: CanvasRenderingContext2D, ability: Ability, paintPosition: Position, game: Game) {
    paintWizardHat(ctx, paintPosition.x, paintPosition.y, game);
}

function paintWizardHat(ctx: CanvasRenderingContext2D, paintX: number, paintY: number, game: Game, mirrored: boolean = false) {
    const imageRef = GAME_IMAGES[IMAGE_NAME_WIZARD_HAT];
    loadImage(imageRef);
    if (imageRef.imageRef?.complete) {
        const wizardHatImage: HTMLImageElement = imageRef.imageRef;
        const hatSacle = 0.6;
        ctx.save();
        if (mirrored) {
            ctx.translate(paintX, paintY + wizardHatImage.height * hatSacle / 2);
            ctx.scale(-1, 1);
            ctx.translate(-paintX, -paintY - wizardHatImage.height * hatSacle / 2);
        }
        ctx.drawImage(
            wizardHatImage,
            0,
            0,
            wizardHatImage.width,
            wizardHatImage.height,
            paintX - Math.floor(wizardHatImage.width / 2) * hatSacle,
            paintY - Math.floor(wizardHatImage.height / 2) * hatSacle,
            wizardHatImage.width * hatSacle,
            wizardHatImage.height * hatSacle,
        )

        ctx.restore();
    }
}

function createDamageBreakDown(damage: number, ability: Ability, abilityObject: AbilityObject | undefined, damageAbilityName: string, game: Game): AbilityDamageBreakdown[] {
    const damageBreakDown: AbilityDamageBreakdown[] = [];
    if (abilityObject) {
        let name = "Base Damage";
        let abilityObjectSpellmaker = abilityObject as AbilitySpellmakerObject;
        name = abilityObjectSpellmaker.toolChain.join();
        damageBreakDown.push({
            damage: damage,
            name: name,
        });
    } else {
        damageBreakDown.push({
            damage: damage,
            name: damageAbilityName,
        });
    }
    return damageBreakDown;
}


function setUpAbilityForEnemy(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const spellmaker = ability as AbilitySpellmaker;
    if (spellmaker.spells.length === 0) {
        spellmaker.spells.push({ createdObjects: [], spellManaCost: 0, spellType: SPELLMAKER_SPELLTYPE_INSTANT });
    }
    spellmaker.mode = "spellcast";

    const random = Math.floor(fixedRandom(abilityOwner.x, abilityOwner.y, game.state.map.seed!) * 3);
    if (random === 0) {
        let explode: CreateToolObjectExplosionData = {
            type: SPELLMAKER_TOOL_EXPLOSION,
            baseDamage: 10,
            center: { x: 0, y: 0 },
            damageFactor: 1,
            nextStage: [],
            radius: 30,
        }
        spellmaker.spells[0].createdObjects.push(explode);
    } else if (random === 1) {
        let lightning: CreateToolObjectLightningData = {
            type: SPELLMAKER_TOOL_LIGHTNING,
            baseDamage: 10,
            center: { x: 0, y: 0 },
            damageFactor: 1,
            nextStage: [],
            jumps: 1,
        }
        spellmaker.spells[0].createdObjects.push(lightning);
    } else {
        let fireline: CreateToolObjectFireLineData = {
            type: SPELLMAKER_TOOL_FIRELINE,
            baseDamage: 10,
            nextStage: [],
            positions: [{ x: -10, y: -10 }, { x: 10, y: 10 }],
        }
        spellmaker.spells[0].createdObjects.push(fireline);
    }

    spellmaker.spells[0].spellManaCost = abilitySpellmakerCalculateManaCost(spellmaker.spells[0].createdObjects) * 50;
}

function resetAbility(ability: Ability) {
    const spellmaker = ability as AbilitySpellmaker;
    spellmaker.mana = spellmaker.maxMana;
}

function createAbilityBossUpgradeOptions(ability: Ability, character: Character, game: Game): UpgradeOptionAndProbability[] {
    const upgradeOptions: UpgradeOptionAndProbability[] = [];
    pushAbilityUpgradesOptions(ABILITY_SPELLMAKER_UPGRADE_FUNCTIONS, upgradeOptions, ability, character, game);
    return upgradeOptions;
}

function executeAbilityUpgradeOption(ability: Ability, character: Character, upgradeOption: UpgradeOption, game: Game) {
    const abilityUpgradeOption: AbilityUpgradeOption = upgradeOption as AbilityUpgradeOption;
    upgradeAbility(ability, character, abilityUpgradeOption, game);
}

function tickAI(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilitySm = ability as AbilitySpellmaker;
    if (abilitySm.mode === "spellmake") abilitySm.mode = "spellcast";
    if (abilitySm.mana >= abilitySm.maxMana && abilitySm.spells.length > 0) {
        const randomSpellIndex = Math.floor(nextRandom(game.state.randomSeed) * abilitySm.spells.length);
        spellCast(abilityOwner, abilitySm, randomSpellIndex, abilityOwner, game);
    }
}

function tickAbility(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilitySm = ability as AbilitySpellmaker;
    abilitySm.mana = Math.min(abilitySm.mana + abilitySm.manaRegeneration, abilitySm.maxMana);
    if (abilitySm.mode === "spellmake") {
        const tool = abilitySm.createTools.createTools[abilitySm.createTools.selectedToolIndex];
        if (!tool) return;
        if (tool.subType == "default") {
            const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[tool.type];
            if (toolFunctions.onTick) toolFunctions.onTick(tool, abilityOwner, abilitySm, game);
        } else if (tool.subType == "move") {
            const toolFunctions = SPELLMAKER_MOVE_TOOLS_FUNCTIONS[tool.type];
            if (toolFunctions.onTick) toolFunctions.onTick(tool, abilityOwner, abilitySm, game);
        }
    }
    if (abilitySm.autoCastSpellIndex !== undefined) {
        const currentAutoCast = abilitySm.spells[abilitySm.autoCastSpellIndex];
        if (currentAutoCast && currentAutoCast.spellType === SPELLMAKER_SPELLTYPE_AUTOCAST) {
            if (abilitySm.mana >= abilitySm.maxMana - 1 && currentAutoCast.spellManaCost < abilitySm.maxMana) {
                spellCast(abilityOwner, abilitySm, abilitySm.autoCastSpellIndex, abilityOwner, game);
                for (let i = 1; i < abilitySm.spells.length; i++) {
                    const nextIndex = (abilitySm.autoCastSpellIndex + i) % abilitySm.spells.length;
                    const nextAutoCast = abilitySm.spells[nextIndex];
                    if (nextAutoCast.spellType === SPELLMAKER_SPELLTYPE_AUTOCAST) {
                        abilitySm.autoCastSpellIndex = nextIndex;
                        break;
                    }
                }
            }
        } else {
            abilitySm.autoCastSpellIndex = undefined;
            for (let i = 0; i < abilitySm.spells.length; i++) {
                if (abilitySm.spells[i].spellType === SPELLMAKER_SPELLTYPE_AUTOCAST) {
                    abilitySm.autoCastSpellIndex = i;
                    break;
                }
            }
        }
    }
}

export function abilitySpellmakerCalculateManaCostForSpellAndUpdateToolDisplay(ability: AbilitySpellmaker, spell: SpellmakerSpell) {
    spell.spellManaCost = abilitySpellmakerCalculateManaCost(spell.createdObjects) * ability.manaLevelFactor;
    const resetTool = ability.createTools.createTools.find(t => t.type === SPELLMAKER_TOOL_RESET);
    if (resetTool) {
        resetTool.description.texts[3] = resetTool.description.texts[3].substring(0, resetTool.description.texts[3].indexOf(":") + 1) + ` ${spell.spellManaCost.toFixed(2)}`;
    }
}

export function abilitySpellmakerCalculateManaCost(createdObjects: SpellmakerCreateToolObjectData[]): number {
    let spellManaCost = 0;
    for (let createdObject of createdObjects) {
        const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[createdObject.type];
        if (toolFunctions.calculateManaCost) spellManaCost += toolFunctions.calculateManaCost(createdObject);
        if (!toolFunctions.calculateManaCostIncludesNextStage) spellManaCost += abilitySpellmakerCalculateManaCost(createdObject.nextStage);
        if (createdObject.moveAttachment) {
            const moveToolFunctions = SPELLMAKER_MOVE_TOOLS_FUNCTIONS[createdObject.moveAttachment.type];
            if (moveToolFunctions.calculateManaCost) spellManaCost += moveToolFunctions.calculateManaCost(createdObject);
        }
    }
    return spellManaCost;
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
    }
    if (stage < ability.spellmakeStage) {
        for (let stageObjects of createdObject.nextStage) {
            paintToolObjectsRecusive(ctx, stage + 1, stageObjects, ability, ownerPaintPos, game);
        }
    }
}

function paintAbility(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    if (abilityOwner.type === CHARACTER_PET_TYPE_CLONE) return;
    const abilitySm = ability as AbilitySpellmaker;
    let ownerPaintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition, game.UI.zoom);
    const mirrored = moveDirectionToCharacterSpriteIndex(abilityOwner as Character) > 1;
    paintWizardHat(ctx, ownerPaintPos.x, ownerPaintPos.y - abilityOwner.height! * 0.75, game, mirrored);
    if (ability.disabled) return;
    if (abilitySm.mode === "spellmake") {
        const myChar = findMyCharacter(game);
        if (myChar === abilityOwner) {
            const alphaChange = 0.5;
            ctx.globalAlpha *= alphaChange;
            ctx.fillStyle = "gray";
            ctx.beginPath();
            ctx.arc(ownerPaintPos.x, ownerPaintPos.y, SPELLMAKER_MAX_CAST_RANGE, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha /= alphaChange;
        }
        const currentSpell = abilitySm.spells[abilitySm.spellIndex];
        for (let createdObject of currentSpell.createdObjects) {
            paintToolObjectsRecusive(ctx, 0, createdObject, abilitySm, ownerPaintPos, game);
        }
        const tool = abilitySm.createTools.createTools[abilitySm.createTools.selectedToolIndex];
        if (tool && tool.workInProgress) {
            if (tool.subType == "default") {
                const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[tool.type];
                if (toolFunctions.paint) toolFunctions.paint(ctx, tool.workInProgress, ownerPaintPos, abilitySm, game);
            } else if (tool.subType == "move") {
                const toolMoveFunctions = SPELLMAKER_MOVE_TOOLS_FUNCTIONS[tool.type];
                toolMoveFunctions.paint(ctx, tool.workInProgress, ownerPaintPos, abilitySm, game);
            }
        }
    } else {
        ctx.lineWidth = 1;
        ctx.strokeStyle = "black";
        ctx.fillStyle = "blue";
        const fillPerCent = abilitySm.mana / abilitySm.maxMana;
        const sizeWidth = abilityOwner.width != undefined ? abilityOwner.width : 20;
        const sizeHeight = Math.min(sizeWidth / 4, 10);
        const manaBarPos: Position = { x: ownerPaintPos.x - sizeWidth / 2, y: ownerPaintPos.y + abilityOwner.height! / 2 + sizeHeight };
        ctx.fillRect(manaBarPos.x, manaBarPos.y, sizeWidth * fillPerCent, sizeHeight);
        ctx.beginPath();
        ctx.rect(manaBarPos.x, manaBarPos.y, sizeWidth, sizeHeight);
        ctx.stroke();
    }
}

function paintAbilityUI(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    const abilitySm = ability as AbilitySpellmaker;
    paintAbilityUiDefault(ctx, ability, drawStartX, drawStartY, size, game, IMAGE_NAME_WIZARD_HAT, 0, undefined, false, 50);
    const fontSize = abilitySm.createTools.size * 0.8;
    abilitySm.createTools.position.y = drawStartY - abilitySm.createTools.size - 1 - abilitySm.createTools.spacing;
    abilitySm.createTools.position.x = ctx.canvas.width / 2 - ((abilitySm.createTools.createTools.length * (abilitySm.createTools.size + abilitySm.createTools.spacing) - abilitySm.createTools.spacing) / 2);
    if (abilitySm.mode === "spellmake") {
        const headingFontSize = 60;
        ctx.font = `bold ${headingFontSize}px Arial`;
        paintTextWithOutline(ctx, "white", "black", "Mode: Spellmake", ctx.canvas.width / 2, 40 + headingFontSize, true, 1);
        for (let i = 0; i < abilitySm.createTools.createTools.length; i++) {
            ctx.font = fontSize + "px Arial";
            const toolPosition: Position = {
                x: abilitySm.createTools.position.x + (abilitySm.createTools.size + abilitySm.createTools.spacing) * i,
                y: abilitySm.createTools.position.y,
            }
            ctx.lineWidth = 1;
            ctx.strokeStyle = "black";
            ctx.fillStyle = abilitySm.createTools.selectedToolIndex === i ? "gray" : "white";
            ctx.fillRect(toolPosition.x, toolPosition.y, abilitySm.createTools.size, abilitySm.createTools.size);
            ctx.beginPath();
            ctx.rect(toolPosition.x, toolPosition.y, abilitySm.createTools.size, abilitySm.createTools.size);
            ctx.stroke();
            const itTool = abilitySm.createTools.createTools[i];
            const itToolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[itTool.type];
            if (itTool.subType == "default" && itToolFunctions && itToolFunctions.paintButton) {
                itToolFunctions.paintButton(ctx, toolPosition, abilitySm, game);
            } else {
                paintTextWithOutline(ctx, "white", "black", itTool.type.substring(0, 2), toolPosition.x + abilitySm.createTools.size / 2, toolPosition.y + abilitySm.createTools.size * 0.9, true, 1);
            }
            const mousePos = game.mouseRelativeCanvasPosition;
            if (mousePos.y > toolPosition.y && mousePos.y < toolPosition.y + abilitySm.createTools.size
                && mousePos.x > toolPosition.x && mousePos.x < toolPosition.x + abilitySm.createTools.size
            ) {
                const description = abilitySm.createTools.createTools[i].description;
                paintMoreInfosPart(ctx, description, toolPosition.x, toolPosition.y - description.height - 2);
            }
        }
    }
}

function castAbility(abilityOwner: AbilityOwner, ability: Ability, data: PlayerAbilityActionData, game: Game) {
    const isKeydown = data.isKeydown;
    const spellmakerCastData = data as DefaultAbilityCastData;
    const castPositionRelativeToCharacter = spellmakerCastData.castPositionRelativeToCharacter;
    const castPosition = spellmakerCastData.castPosition!;
    const abilitySm = ability as AbilitySpellmaker;
    if (abilitySm.mode === "spellmake") {
        if (castPositionRelativeToCharacter) {
            const distance = calculateDistance({ x: 0, y: 0 }, castPositionRelativeToCharacter);
            const tool = abilitySm.createTools.createTools[abilitySm.createTools.selectedToolIndex];
            if (isKeydown) {
                if (distance > SPELLMAKER_MAX_CAST_RANGE) return;
                if (spellmakerCastData[ABILITY_NAME_SPELLMAKER]) {
                    const tool = abilitySm.createTools.createTools[spellmakerCastData.Spellmaker.clickedToolRectangleIndex];
                    const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[tool.type];
                    if (toolFunctions && toolFunctions.onToolSelect) {
                        if (toolFunctions.onToolSelect(tool, abilityOwner, abilitySm, game)) {
                            abilitySm.createTools.selectedToolIndex = spellmakerCastData.Spellmaker.clickedToolRectangleIndex;
                        }
                    } else {
                        abilitySm.createTools.selectedToolIndex = spellmakerCastData.Spellmaker.clickedToolRectangleIndex;
                    }
                } else {
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
                const currentSpell = abilitySm.spells[abilitySm.spellIndex];
                if (tool.subType == "default") {
                    const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[tool.type];
                    if (toolFunctions.onKeyUp) {
                        const result = toolFunctions.onKeyUp(tool, abilityOwner, abilitySm, castPositionRelativeToCharacter, game);
                        if (result) {
                            if (abilitySm.spellmakeStage == 0) {
                                currentSpell.createdObjects.push(result);
                                abilitySpellmakerCalculateManaCostForSpellAndUpdateToolDisplay(abilitySm, currentSpell);
                                if (currentSpell.spellManaCost > MAX_SPELL_MANA_COST) {
                                    currentSpell.createdObjects.pop();
                                    abilitySpellmakerCalculateManaCostForSpellAndUpdateToolDisplay(abilitySm, currentSpell);
                                    addPaintFloatingTextInfoForMyself(`max mana exceeded`, game, undefined, abilityOwner.id, abilitySm.id, IMAGE_NAME_SWITCH);
                                }
                            } else if (abilitySm.attachToIndex != undefined) {
                                let currentObject = currentSpell.createdObjects[abilitySm.attachToIndex[0]];
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
                                abilitySpellmakerCalculateManaCostForSpellAndUpdateToolDisplay(abilitySm, currentSpell);
                                if (currentSpell.spellManaCost > MAX_SPELL_MANA_COST) {
                                    currentSpell.createdObjects.pop();
                                    abilitySpellmakerCalculateManaCostForSpellAndUpdateToolDisplay(abilitySm, currentSpell);
                                    addPaintFloatingTextInfoForMyself(`max mana exceeded`, game, undefined, abilityOwner.id, abilitySm.id, IMAGE_NAME_SWITCH);
                                }
                            }
                        }
                    }
                } else if (tool.subType == "move") {
                    const toolFunctions = SPELLMAKER_MOVE_TOOLS_FUNCTIONS[tool.type];
                    if (toolFunctions.onKeyUp) {
                        if (abilitySm.attachToIndex != undefined) {
                            const result = toolFunctions.onKeyUp(tool, abilityOwner, abilitySm, castPositionRelativeToCharacter, game);
                            if (result) {
                                let currentObject = currentSpell.createdObjects[abilitySm.attachToIndex[0]];
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
                                abilitySpellmakerCalculateManaCostForSpellAndUpdateToolDisplay(abilitySm, currentSpell);
                            }
                        }
                    }
                }
            }
        }
    }
    if (abilitySm.mode === "spellcast") {
        if (isKeydown) {
            const distance = calculateDistance(abilityOwner, castPosition);
            if (distance > SPELLMAKER_MAX_CAST_RANGE) return;
            spellCast(abilityOwner, abilitySm, abilitySm.spellIndex, castPosition, game);
        }
    }
}

function getCustomCastData(abilityOwner: AbilityOwner, ability: Ability, data: DefaultAbilityCastData, game: Game): SpellmakerAbilityAdditionalCastData | undefined {
    const abilitySm = ability as AbilitySpellmaker;
    const isKeydown = data.isKeydown;
    if (abilitySm.mode === "spellmake") {
        if (isKeydown) {
            const result = clickCreateToolsCheck(abilityOwner, abilitySm, game.mouseRelativeCanvasPosition, game);
            if (result !== -1) return { clickedToolRectangleIndex: result };
        }
    }

    return undefined;
}

function spellCast(abilityOwner: AbilityOwner, abilitySm: AbilitySpellmaker, spellIndex: number, castPosition: Position, game: Game) {
    const currentSpell = abilitySm.spells[spellIndex];
    if (abilitySm.mana > currentSpell.spellManaCost) {
        abilitySm.mana -= currentSpell.spellManaCost;
        for (let createdObject of currentSpell.createdObjects) {
            const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[createdObject.type];
            const damageFactor = abilityOwner.faction === FACTION_PLAYER ? abilitySm.damageLevelFactor : 1;
            if (toolFunctions.spellCast) toolFunctions.spellCast(createdObject, abilitySm.baseDamage, abilityOwner.faction, abilitySm.id, castPosition, damageFactor, abilitySm.manaLevelFactor, [createdObject.type], game);
        }
    } else {
        const missingMana = currentSpell.spellManaCost - abilitySm.mana;
        addPaintFloatingTextInfoForMyself(`${missingMana.toFixed()} missing mana`, game, undefined, abilityOwner.id, abilitySm.id, IMAGE_NAME_SWITCH);
    }
}

export function abilitySpellmakerCastNextStage(nextStage: SpellmakerCreateToolObjectData[], abilityObject: AbilitySpellmakerObject, game: Game) {
    for (let stageObject of nextStage) {
        const spellmakerFunctions = SPELLMAKER_TOOLS_FUNCTIONS[stageObject.type];
        if (spellmakerFunctions.spellCast) {
            const pos: Position = { x: abilityObject.x, y: abilityObject.y };
            if (stageObject.castPosOffset) {
                pos.x += stageObject.castPosOffset.x;
                pos.y += stageObject.castPosOffset.y;
            }
            const toolChain = [...abilityObject.toolChain];
            if (!toolChain.includes(stageObject.type)) toolChain.push(stageObject.type);
            spellmakerFunctions.spellCast(stageObject, stageObject.baseDamage, abilityObject.faction, abilityObject.abilityIdRef!, pos, abilityObject.damageFactor, abilityObject.manaFactor, toolChain, game);
        }
    }
}

function findClosestAttachToIndexRecursive(stage: number, currentStage: SpellmakerCreateToolObjectData[], ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position, moveToAttach: boolean): { closestDistance: number, attachToIndexes: number[] } | undefined {
    let closestDistance = 0;
    let attachToIndexes: number[] | undefined = undefined;
    const stageToReach = moveToAttach ? ability.spellmakeStage : ability.spellmakeStage - 1;
    if (stageToReach > stage) {
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
                if (attachToIndexes === undefined || tempDistance < closestDistance) {
                    closestDistance = tempDistance;
                    attachToIndexes = [objectIndex];
                }
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
    const currentSpell = ability.spells[ability.spellIndex];
    const result = findClosestAttachToIndexRecursive(0, currentSpell.createdObjects, ability, castPositionRelativeToCharacter, moveToAttach);
    if (result && result.closestDistance < 20) {
        return result.attachToIndexes;
    }
    return undefined;
}

/// returns index of tool clicked or -1 if nothing
function clickCreateToolsCheck(abilityOwner: AbilityOwner, ability: AbilitySpellmaker, relativCanvasPosition: Position, game: Game): number {
    for (let i = 0; i < ability.createTools.createTools.length; i++) {
        const pos: Position = { x: ability.createTools.position.x + (ability.createTools.size + ability.createTools.spacing) * i, y: ability.createTools.position.y };
        if (pos.x < relativCanvasPosition.x && pos.x + ability.createTools.size > relativCanvasPosition.x
            && pos.y < relativCanvasPosition.y && pos.y + ability.createTools.size > relativCanvasPosition.y
        ) {
            return i;
        }
    }
    return -1;
}


function setAbilityToLevel(ability: Ability, level: number) {
    const sm = ability as AbilitySpellmaker;
    sm.baseDamage = 10 * level;
}

function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const sm = ability as AbilitySpellmaker;
    sm.baseDamage = 10 * level;
}

function setAbilityToBossLevel(ability: Ability, level: number) {
    const sm = ability as AbilitySpellmaker;
    sm.baseDamage = 10 * level;
}

function createAbilityMoreInfos(ctx: CanvasRenderingContext2D, ability: Ability, game: Game): MoreInfoPart {
    const abilitySpellmaker = ability as AbilitySpellmaker;
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(
        `Key: ${playerInputBindingToDisplayValue(abilitySpellmaker.playerInputBinding!, game)}`,
        `Create spells in spellmake mode and cast them in spellcast mode.`,
        `On Boss kill unlock new tools.`,
        `Base Damage: ${abilitySpellmaker.baseDamage}`,
    );
    if (abilitySpellmaker.level) {
        textLines.push(`Level: ${abilitySpellmaker.level.level}`);
        if (abilitySpellmaker.level.leveling) {
            textLines.push(
                `XP: ${abilitySpellmaker.level.leveling.experience.toFixed(0)}/${abilitySpellmaker.level.leveling.experienceForLevelUp}`,
                `  on level up you gain:`,
                `    +10 Base Damage`,
            );
        }
    }
    textLines.push(`Mana: ${abilitySpellmaker.mana.toFixed()}/${abilitySpellmaker.maxMana}`);
    textLines.push(`Mana Regeneration: ${(abilitySpellmaker.manaRegeneration * game.gameSpeedSettings.desiredUpdatesPerSecond).toFixed()} mana per second`);
    textLines.push(`Spell slots:`);
    for (let i = 0; i < abilitySpellmaker.spells.length; i++) {
        const spell = abilitySpellmaker.spells[i];
        textLines.push(`  Slot ${i + 1}: ${getSpellToolChain(spell)}, manaCost: ${spell.spellManaCost.toFixed(1)}`);
    }

    const upgradeHoverLines: MoreInfoHoverTexts = {};
    // pushAbilityUpgradesUiTexts(ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS, textLines, upgradeHoverLines, ability);

    return createMoreInfosPart(ctx, textLines, undefined, 14, upgradeHoverLines);
}

function getSpellToolChain(spell: SpellmakerSpell): string {
    let toolChain: string[] = [];
    getSpellToolChainRec(spell.createdObjects, toolChain);
    return toolChain.join();
}

function getSpellToolChainRec(createdObjects: SpellmakerCreateToolObjectData[], toolChain: string[]) {
    for (let createObject of createdObjects) {
        if (!toolChain.includes(createObject.type)) {
            toolChain.push(createObject.type);
        }
        getSpellToolChainRec(createObject.nextStage, toolChain);
    }
}
