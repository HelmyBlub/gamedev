import { CHARACTER_TYPE_ENEMY_FIX_RESPAWN_POSITION } from "../../character/enemy/fixPositionRespawnEnemyModel.js";
import { UpgradeOptionAndProbability, AbilityUpgradeOption } from "../../character/upgrade.js";
import { getNextId } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { MusicNote } from "../../sound.js";
import { Ability, AbilityObject, AbilityOwner } from "../ability.js";
import { createAbilityObjectCircleAround } from "../abilityCircleAround.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS, ABILITY_NAME_MUSIC_SHEET, AbilityMusicSheetUpgradeInstrument, AbilityMusicSheets, getMusicSheetUpgradeChainPosition } from "./abilityMusicSheet.js";
import { getAbilityMusicSheetsUpgradeMultiplyAmount } from "./abilityMusicSheetUpgradeMultiply.js";
import { getAbilityMusicSheetsUpgradeAreaFactor } from "./abilityMusicSheetUpgradeSize.js";

export type AbilityMusicSheetUpgradeInstrumentTriangle = AbilityMusicSheetUpgradeInstrument & {
    lastSpawnObjectIds: number[],
}

export const ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE = "Instrument Triangle";

export function addAbilityMusicSheetUpgradeInstrumentTriangle() {
    ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE] = {
        getChainPosition: getChainPosition,
        getStatsDisplayText: getAbilityUpgradeUiText,
        getMoreInfoIncreaseOneLevelText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
        executeNoteDamage: executeMusicNotesDamage,
        paintNoteHead: paintNoteHead,
        reset: reset,
    }
}

function reset(ability: Ability) {
    const upgrade: AbilityMusicSheetUpgradeInstrumentTriangle | undefined = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE];
    if (upgrade) upgrade.lastPlayedNoteTime = undefined;
}

function getChainPosition(abilityOwner: AbilityOwner, abilityMusicSheets: AbilityMusicSheets, game: Game): Position {
    const up: AbilityMusicSheetUpgradeInstrumentTriangle = abilityMusicSheets.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE];
    if (!up) return { x: abilityOwner.x, y: abilityOwner.y };
    const triangleObjects: AbilityObject[] = [];
    for (let object of game.state.abilityObjects) {
        if (object.id !== undefined && up.lastSpawnObjectIds.find(n => n === object.id) !== undefined) {
            triangleObjects.push(object);
        }
    }

    if (triangleObjects.length < 1) {
        return { x: abilityOwner.x, y: abilityOwner.y };
    } else {
        const randomIndex = triangleObjects.length === 1 ? 0 : Math.floor(triangleObjects.length * nextRandom(game.state.randomSeed));
        const randomObject = triangleObjects[randomIndex];
        return { x: randomObject.x, y: randomObject.y };
    }
}

function paintNoteHead(ctx: CanvasRenderingContext2D, note: MusicNote, notePaintX: number, notePaintY: number, lineNumber: number, noteRadius: number) {
    ctx.beginPath();
    const noteStemDirection = lineNumber < 3 ? 1 : -1;
    const offset = noteRadius * noteStemDirection;
    ctx.moveTo(notePaintX + noteRadius, notePaintY + offset);
    ctx.lineTo(notePaintX - noteRadius, notePaintY + offset);
    ctx.lineTo(notePaintX, notePaintY - offset);
    ctx.lineTo(notePaintX + noteRadius, notePaintY + offset);

    switch (note.durationFactor) {
        case 0.25:
        case 0.5:
        case 1:
            ctx.fill();
            break;
        case 2:
            ctx.lineWidth = 3;
            ctx.stroke();
            break;
        case 4:
            ctx.lineWidth = 3;
            ctx.stroke();
            break;
    }
}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE);
    options[0].option.displayMoreInfoText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const musicSheet = ability as AbilityMusicSheets;
    let up: AbilityMusicSheetUpgradeInstrumentTriangle;
    if (musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE] === undefined) {
        up = { level: 0, lastSpawnObjectIds: [] };
        musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE] = up;
        musicSheet.selectedInstrument = ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE;
    } else {
        up = musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE];
    }
    up.level++;
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityMusicSheetUpgradeInstrumentTriangle = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE];
    return `${ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE}: Level ${up.level}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityMusicSheetUpgradeInstrumentTriangle | undefined = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE];
    if (upgrade) {
        textLines.push(
            `Instrument Triangle +Level.`,
            `Damage increase from ${upgrade.level * 100}% to ${(upgrade.level + 1) * 100}%.`,
        );
    } else {
        textLines.push(
            `Get Instrument Triangle`,
        );
    }
    return textLines;
}

function executeMusicNotesDamage(notes: MusicNote[], abilityOwner: AbilityOwner, abilityMusicSheets: AbilityMusicSheets, game: Game) {
    const upgrade: AbilityMusicSheetUpgradeInstrumentTriangle | undefined = abilityMusicSheets.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE];
    if (!upgrade) return;

    if (notes.length === 0) return;
    let damage = abilityMusicSheets.damagePerSecond;
    let timeAreaFactor = 1;
    const triangleMultiplier = 10;
    if (upgrade.lastPlayedNoteTime !== undefined && abilityOwner.type !== CHARACTER_TYPE_ENEMY_FIX_RESPAWN_POSITION) {
        const passedTime = (game.state.time - upgrade.lastPlayedNoteTime) / 1000;
        damage = abilityMusicSheets.damagePerSecond * passedTime;
        timeAreaFactor *= Math.max(passedTime / notes.length * 4, 0.1);
    }

    const damagePerSecondPerNote = damage / notes.length * triangleMultiplier * upgrade.level;
    const chainPos = getMusicSheetUpgradeChainPosition(abilityMusicSheets, abilityOwner, game);
    const upgradeAreaFactor = getAbilityMusicSheetsUpgradeAreaFactor(abilityMusicSheets);
    const defaultRadius = 10;
    const area = (defaultRadius * defaultRadius) * Math.PI * upgradeAreaFactor * timeAreaFactor;
    const radius = Math.sqrt(area / Math.PI);
    const multiply = getAbilityMusicSheetsUpgradeMultiplyAmount(abilityMusicSheets);
    upgrade.lastSpawnObjectIds = [];
    for (let note of notes) {
        for (let i = 0; i < multiply; i++) {
            const strikeObject = createAbilityObjectCircleAround(chainPos, damagePerSecondPerNote, radius, abilityOwner.faction, abilityMusicSheets.id, 5000, game);
            strikeObject.abilityRefTypeDoOnHit = ABILITY_NAME_MUSIC_SHEET;
            game.state.abilityObjects.push(strikeObject);
            strikeObject.id = getNextId(game.state.idCounter);
            upgrade.lastSpawnObjectIds.push(strikeObject.id);
        }
    }

    upgrade.lastPlayedNoteTime = game.state.time;
}