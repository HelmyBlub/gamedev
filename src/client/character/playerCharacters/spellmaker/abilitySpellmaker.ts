import { ABILITIES_FUNCTIONS, Ability, ABILITY_DEFAULT_SMALL_GROUP, AbilityOwner, getAbilityNameUiText, paintAbilityUiDefault } from "../../../ability/ability.js";
import { createAbilityObjectFireLine } from "../../../ability/abilityFireLine.js";
import { IMAGE_NAME_SWITCH } from "../../../ability/musician/abilityMusicSheetChangeInstrument.js";
import { autoSendMousePositionHandler, calculateDistance, findClientInfoByCharacterId, getNextId } from "../../../game.js";
import { ClientInfo, Game, IdCounter, Position } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { playerInputBindingToDisplayValue } from "../../../input/playerInput.js";
import { createMoreInfosPart, MoreInfoHoverTexts, MoreInfoPart } from "../../../moreInfo.js";
import { CHARACTER_PET_TYPE_CLONE } from "../characterPetTypeClone.js";

export type AbilitySpellmaker = Ability & {
    mode: "spellmake" | "spellcast",
    mana: number,
    maxMana: number,
    manaRegeneration: number
    tickInterval: number,
    duration: number,
    width: number,
    startPosition?: Position,
    fireLines: DoublePosition[],
    spellManaCost: number,
}

type DoublePosition = {
    start: Position,
    end: Position,
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
        fireLines: [],
        spellManaCost: 0,
    };
}

function tickAbility(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilitySm = ability as AbilitySpellmaker;
    const clientInfo: ClientInfo | undefined = findClientInfoByCharacterId(abilityOwner.id, game);
    abilitySm.mana = Math.min(abilitySm.mana + abilitySm.manaRegeneration, abilitySm.maxMana);
    if (clientInfo) {
        if (abilitySm.startPosition) {
            const end: Position = {
                x: clientInfo.lastMousePosition.x - abilityOwner.x,
                y: clientInfo.lastMousePosition.y - abilityOwner.y,
            };
            const distance = calculateDistance(abilitySm.startPosition, end);
            if (distance > 40) {
                abilitySm.fireLines.push({ start: { x: abilitySm.startPosition!.x, y: abilitySm.startPosition!.y }, end: end });
                calculateManaCost(abilitySm);
                abilitySm.startPosition.x = end.x;
                abilitySm.startPosition.y = end.y;
            }
        }
    }
}

function calculateManaCost(ability: AbilitySpellmaker) {
    ability.spellManaCost = 0;
    for (let fireLine of ability.fireLines) {
        const distance = calculateDistance(fireLine.start, fireLine.end) / 50;
        ability.spellManaCost += distance;
    }
}

function paintAbility(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    if (abilityOwner.type === CHARACTER_PET_TYPE_CLONE) return;
    if (ability.disabled) return;
    const abilitySm = ability as AbilitySpellmaker;
    if (abilitySm.mode === "spellmake") {
        let ownerPaintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition, game.UI.zoom);
        for (let fireline of abilitySm.fireLines) {
            ctx.globalAlpha = 0.50;
            let color = "red";
            ctx.strokeStyle = color;
            ctx.lineWidth = abilitySm.width;
            ctx.beginPath();
            ctx.moveTo(ownerPaintPos.x + fireline.start.x, ownerPaintPos.y + fireline.start.y);
            ctx.lineTo(ownerPaintPos.x + fireline.end.x, ownerPaintPos.y + fireline.end.y);
            ctx.stroke();
            ctx.globalAlpha = 1;
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
            if (!abilitySm.startPosition) abilitySm.startPosition = { x: castPositionRelativeToCharacter!.x, y: castPositionRelativeToCharacter!.y };
            autoSendMousePositionHandler(abilityOwner.id, `${abilitySm.name}`, true, castPosition, game);
        } else {
            autoSendMousePositionHandler(abilityOwner.id, `${abilitySm.name}`, false, castPosition, game);
            abilitySm.fireLines.push({ start: abilitySm.startPosition!, end: castPositionRelativeToCharacter! });
            calculateManaCost(abilitySm);
            abilitySm.startPosition = undefined;
        }
    }
    if (abilitySm.mode === "spellcast") {
        if (isKeydown) {
            if (abilitySm.mana > abilitySm.spellManaCost) {
                abilitySm.mana -= abilitySm.spellManaCost;
                for (let fireline of abilitySm.fireLines) {
                    const damage = abilitySm.level!.level * 100;
                    const start: Position = {
                        x: fireline.start.x + castPosition.x,
                        y: fireline.start.y + castPosition.y,
                    };
                    const end: Position = {
                        x: fireline.end.x + castPosition.x,
                        y: fireline.end.y + castPosition.y
                    };
                    const fireLine = createAbilityObjectFireLine(abilityOwner.faction, start, end, damage, abilitySm.width, abilitySm.duration, abilitySm.tickInterval, "red", ability.id, game);
                    game.state.abilityObjects.push(fireLine);
                }
            }
        }
    }
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