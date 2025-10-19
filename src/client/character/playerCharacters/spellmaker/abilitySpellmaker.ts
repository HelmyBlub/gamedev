import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, getAbilityNameUiText, paintAbilityUiDefault } from "../../../ability/ability.js";
import { IMAGE_NAME_SWITCH } from "../../../ability/musician/abilityMusicSheetChangeInstrument.js";
import { autoSendMousePositionHandler, calculateDistance, getNextId } from "../../../game.js";
import { Game, IdCounter, Position } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { playerInputBindingToDisplayValue } from "../../../input/playerInput.js";
import { createMoreInfosPart, MoreInfoHoverTexts, MoreInfoPart } from "../../../moreInfo.js";
import { CHARACTER_PET_TYPE_CLONE } from "../characterPetTypeClone.js";
import { createAbilityObjectSpellmakerFireLine } from "./abilitySpellmakerFireLine.js";
import { SPELLMAKER_TOOLS_FUNCTIONS, SpellmakerCreateToolsData } from "./spellmakerTool.js";
import { addSpellmakerToolExplosion, SPELLMAKER_TOOL_EXPLOSION } from "./spellmakerToolExplosion.js";
import { addSpellmakerToolFireline, SPELLMAKER_TOOL_FIRELINE } from "./spellmakerToolFireLine.js";
import { addSpellmakerToolMove, SPELLMAKER_TOOL_MOVE } from "./spellmakerToolMove.js";
import { addSpellmakerToolSeeker, SPELLMAKER_TOOL_SEEKER } from "./spellmakerToolSeeker.js";

export type AbilitySpellmaker = Ability & {
    mode: "spellmake" | "spellcast",
    mana: number,
    maxMana: number,
    manaRegeneration: number
    attachToIndex: number,
    createdObjects: SpellmakerCreateToolObjectData[],
    spellManaCost: number,
    createTools: SpellmakerCreateToolsData,
}

export type SpellmakerCreateToolObjectData = {
    type: string,
    moveAttachment?: SpellmakerCreateToolMoveAttachment,
}

export type SpellmakerCreateToolMoveAttachment = {
    type: string,
}

type CreateToolMoveAttachmentSeeker = SpellmakerCreateToolMoveAttachment & {
    direction: number,
    speed: number,
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
    addSpellmakerToolFireline();
    addSpellmakerToolMove();
    addSpellmakerToolExplosion();
    addSpellmakerToolSeeker();
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
                { type: SPELLMAKER_TOOL_FIRELINE },
                { type: SPELLMAKER_TOOL_MOVE },
                { type: SPELLMAKER_TOOL_EXPLOSION },
                { type: SPELLMAKER_TOOL_SEEKER },
            ],
            position: { x: -20, y: +20 },
            size: 20,
        },
        attachToIndex: 0,
    };
}

function tickAbility(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilitySm = ability as AbilitySpellmaker;
    abilitySm.mana = Math.min(abilitySm.mana + abilitySm.manaRegeneration, abilitySm.maxMana);
    if (abilitySm.mode === "spellmake") {
        const tool = abilitySm.createTools.createTools[abilitySm.createTools.selectedToolIndex];
        const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[tool.type];
        if (toolFunctions.onTick) toolFunctions.onTick(tool, abilityOwner, abilitySm, game);
    }
}

export function abilitySpellmakerCalculateManaCost(ability: AbilitySpellmaker) {
    ability.spellManaCost = 0;
    for (let createdObject of ability.createdObjects) {
        const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[createdObject.type];
        if (toolFunctions.calculateManaCost) ability.spellManaCost += toolFunctions.calculateManaCost(createdObject);
    }
}

function paintAbility(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    if (abilityOwner.type === CHARACTER_PET_TYPE_CLONE) return;
    if (ability.disabled) return;
    const abilitySm = ability as AbilitySpellmaker;
    if (abilitySm.mode === "spellmake") {
        let ownerPaintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition, game.UI.zoom);
        for (let createdObject of abilitySm.createdObjects) {
            const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[createdObject.type];
            toolFunctions.paint(ctx, createdObject, ownerPaintPos, abilitySm, game);
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
                if (!clickCreateToolsCheck(abilityOwner, abilitySm, castPositionRelativeToCharacter)) {
                    autoSendMousePositionHandler(abilityOwner.id, `${abilitySm.name}`, true, castPosition, game);
                    const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[tool.type];
                    if (toolFunctions.onKeyDown) toolFunctions.onKeyDown(tool, abilityOwner, abilitySm, castPositionRelativeToCharacter, game);
                }
            } else {
                autoSendMousePositionHandler(abilityOwner.id, `${abilitySm.name}`, false, castPosition, game);
                const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[tool.type];
                if (toolFunctions.onKeyUp) toolFunctions.onKeyUp(tool, abilityOwner, abilitySm, castPositionRelativeToCharacter, game);
            }
        }
    }
    if (abilitySm.mode === "spellcast") {
        if (isKeydown) {
            if (abilitySm.mana > abilitySm.spellManaCost) {
                abilitySm.mana -= abilitySm.spellManaCost;
                for (let createdObject of abilitySm.createdObjects) {
                    const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[createdObject.type];
                    if (toolFunctions.spellCast) toolFunctions.spellCast(createdObject, abilityOwner, abilitySm, castPosition, game);
                }
            }
        }
    }
}

/// returns true if a tool button was clicked
function clickCreateToolsCheck(abilityOwner: AbilityOwner, ability: AbilitySpellmaker, castPositionRelativeToCharacter: Position | undefined): boolean {
    if (!castPositionRelativeToCharacter) return false;
    for (let i = 0; i < ability.createTools.createTools.length; i++) {
        const pos: Position = { x: ability.createTools.position.x + ability.createTools.size * i, y: ability.createTools.position.y };
        if (pos.x < castPositionRelativeToCharacter.x && pos.x + ability.createTools.size > castPositionRelativeToCharacter.x && pos.y < castPositionRelativeToCharacter.y && pos.y + ability.createTools.size > castPositionRelativeToCharacter.y) {
            ability.createTools.selectedToolIndex = i;
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