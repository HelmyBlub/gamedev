import { ABILITIES_FUNCTIONS, Ability, ABILITY_DEFAULT_SMALL_GROUP, AbilityOwner, getAbilityNameUiText, paintAbilityUiDefault } from "../../../ability/ability.js";
import { createAbilityObjectFireLine } from "../../../ability/abilityFireLine.js";
import { IMAGE_NAME_SWITCH } from "../../../ability/musician/abilityMusicSheetChangeInstrument.js";
import { autoSendMousePositionHandler, calculateDistance, findClientInfoByCharacterId, getNextId } from "../../../game.js";
import { ClientInfo, Game, IdCounter, Position } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { playerInputBindingToDisplayValue } from "../../../input/playerInput.js";
import { createMoreInfosPart, MoreInfoHoverTexts, MoreInfoPart } from "../../../moreInfo.js";
import { CHARACTER_PET_TYPE_CLONE } from "../characterPetTypeClone.js";
import { createAbilityObjectSpellmakerFireLine } from "./abilitySpellmakerFireLine.js";

export type AbilitySpellmaker = Ability & {
    mode: "spellmake" | "spellcast",
    mana: number,
    maxMana: number,
    manaRegeneration: number
    tickInterval: number,
    duration: number,
    width: number,
    startPosition?: Position,
    fireLines: Position[][],
    spellManaCost: number,
    createTools: CreateToolsData,
}

type CreateToolsData = {
    selectedToolIndex: number,
    position: Position,
    size: number,
    createTools: CreateTool[],
}

type CreateTool = {
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
        tickInterval: 250,
        duration: 5000,
        mana: 100,
        maxMana: 100,
        manaRegeneration: 0.1,
        width: 10,
        mode: "spellmake",
        fireLines: [[]],
        spellManaCost: 0,
        createTools: {
            selectedToolIndex: 0,
            createTools: [{ type: "FireLine" }, { type: "Move" }],
            position: { x: -20, y: +20 },
            size: 20,
        },
    };
}

function tickAbility(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilitySm = ability as AbilitySpellmaker;
    if (abilitySm.mode === "spellmake") {
        const clientInfo: ClientInfo | undefined = findClientInfoByCharacterId(abilityOwner.id, game);
        abilitySm.mana = Math.min(abilitySm.mana + abilitySm.manaRegeneration, abilitySm.maxMana);
        if (clientInfo) {
            if (abilitySm.createTools.createTools[abilitySm.createTools.selectedToolIndex].type === "FireLine") {
                if (abilitySm.startPosition) {
                    const end: Position = {
                        x: clientInfo.lastMousePosition.x - abilityOwner.x,
                        y: clientInfo.lastMousePosition.y - abilityOwner.y,
                    };
                    const pushIndex = abilitySm.fireLines.length - 1;
                    const startPos = abilitySm.fireLines[pushIndex].length == 0 ? abilitySm.startPosition : abilitySm.fireLines[pushIndex][abilitySm.fireLines[pushIndex].length - 1];
                    const distance = calculateDistance(startPos, end);
                    if (distance > 40) {
                        if (abilitySm.fireLines[pushIndex].length == 0) {
                            abilitySm.fireLines[pushIndex].push(abilitySm.startPosition);
                        }
                        abilitySm.fireLines[pushIndex].push(end);
                        calculateManaCost(abilitySm);
                    }
                }
            }
        }
    }
}

function calculateManaCost(ability: AbilitySpellmaker) {
    ability.spellManaCost = 0;
    for (let fireLine of ability.fireLines) {
        for (let i = 1; i < fireLine.length; i++) {
            const distance = calculateDistance(fireLine[i - 1], fireLine[i]) / 50;
            ability.spellManaCost += distance;
        }
    }
}

function paintAbility(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    if (abilityOwner.type === CHARACTER_PET_TYPE_CLONE) return;
    if (ability.disabled) return;
    const abilitySm = ability as AbilitySpellmaker;
    if (abilitySm.mode === "spellmake") {
        let ownerPaintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition, game.UI.zoom);
        for (let fireline of abilitySm.fireLines) {
            if (fireline.length < 2) continue;
            ctx.globalAlpha = 0.50;
            let color = "red";
            ctx.strokeStyle = color;
            ctx.lineWidth = abilitySm.width;
            ctx.beginPath();
            ctx.moveTo(ownerPaintPos.x + fireline[0].x, ownerPaintPos.y + fireline[0].y);
            for (let i = 1; i < fireline.length; i++) {
                ctx.lineTo(ownerPaintPos.x + fireline[i].x, ownerPaintPos.y + fireline[i].y);
            }
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        for (let i = 0; i < abilitySm.createTools.createTools.length; i++) {
            const createTool = abilitySm.createTools.createTools;
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
        if (isKeydown) {
            if (!clickCreateToolsCheck(abilityOwner, abilitySm, castPositionRelativeToCharacter)) {
                abilitySm.startPosition = { x: castPositionRelativeToCharacter!.x, y: castPositionRelativeToCharacter!.y };
                if (abilitySm.fireLines[abilitySm.fireLines.length - 1].length > 1) {
                    abilitySm.fireLines.push([]);
                }
                autoSendMousePositionHandler(abilityOwner.id, `${abilitySm.name}`, true, castPosition, game);
            }
        } else {
            autoSendMousePositionHandler(abilityOwner.id, `${abilitySm.name}`, false, castPosition, game);
            if (abilitySm.startPosition) {
                if (abilitySm.createTools.createTools[abilitySm.createTools.selectedToolIndex].type === "FireLine") {
                    const pushIndex = abilitySm.fireLines.length - 1;
                    if (abilitySm.fireLines[pushIndex].length == 0) {
                        abilitySm.fireLines[pushIndex].push(abilitySm.startPosition);
                    }
                    abilitySm.fireLines[pushIndex].push(castPositionRelativeToCharacter!);
                    calculateManaCost(abilitySm);
                } else if (abilitySm.createTools.createTools[abilitySm.createTools.selectedToolIndex].type === "Move") {
                }
            }
            abilitySm.startPosition = undefined;
        }
    }
    if (abilitySm.mode === "spellcast") {
        if (isKeydown) {
            if (abilitySm.mana > abilitySm.spellManaCost) {
                abilitySm.mana -= abilitySm.spellManaCost;
                for (let fireline of abilitySm.fireLines) {
                    if (fireline.length < 2) continue;
                    const damage = abilitySm.level!.level * 100;
                    const start: Position = {
                        x: fireline[0].x + castPosition.x,
                        y: fireline[0].y + castPosition.y,
                    };
                    const joints: Position[] = [];
                    for (let i = 1; i < fireline.length; i++) {
                        joints.push({ x: fireline[i].x + castPosition.x, y: fireline[i].y + castPosition.y });
                    }
                    const moveTo: Position[] = [{ x: 100, y: 0 }];
                    const moveSpeed = 2;

                    const objectFireLine = createAbilityObjectSpellmakerFireLine(abilityOwner.faction, start, joints, moveTo, damage, abilitySm.width, abilitySm.duration, moveSpeed, abilitySm.tickInterval, "red", ability.id, game);
                    game.state.abilityObjects.push(objectFireLine);
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