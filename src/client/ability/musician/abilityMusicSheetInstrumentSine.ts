import { determineCharactersInDistance } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { UpgradeOptionAndProbability, AbilityUpgradeOption } from "../../character/upgrade.js";
import { calculateDirection, getNextId } from "../../game.js";
import { Game, FACTION_PLAYER, Position } from "../../gameModel.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { MusicNote } from "../../sound.js";
import { Ability, AbilityObject, AbilityOwner } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { createProjectile } from "../projectile.js";
import { ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS, ABILITY_NAME_MUSIC_SHEET, AbilityMusicSheets, getMusicSheetUpgradeChainPosition } from "./abilityMusicSheet.js";
import { getAbilityMusicSheetsUpgradeMultiplyAmount } from "./abilityMusicSheetUpgradeMultiply.js";
import { getAbilityMusicSheetsUpgradeAreaFactor } from "./abilityMusicSheetUpgradeSize.js";

export type AbilityMusicSheetUpgradeInstrumentSine = AbilityUpgrade & {
    lastSpawnObjectIds: number[],
    lastPlayedNoteTime?: number,
}

export const ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SINE = "Instrument Sine";

export function addAbilityMusicSheetUpgradeInstrumentSine() {
    ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SINE] = {
        getChainPosition: getChainPosition,
        getStatsDisplayText: getAbilityUpgradeUiText,
        getMoreInfoText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
        executeNoteDamage: executeMusicNotesDamage,
        paintNote: paintNote,
        reset: reset,
    }
}

function reset(ability: Ability) {
}

function getChainPosition(abilityOwner: AbilityOwner, abilityMusicSheets: AbilityMusicSheets, game: Game): Position {
    const up: AbilityMusicSheetUpgradeInstrumentSine = abilityMusicSheets.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SINE];
    if (!up) return { x: abilityOwner.x, y: abilityOwner.y };
    const sineObjects: AbilityObject[] = [];
    for (let object of game.state.abilityObjects) {
        if (object.id !== undefined && up.lastSpawnObjectIds.find(n => n === object.id) !== undefined) {
            sineObjects.push(object);
        }
    }
    if (sineObjects.length < 1) {
        return { x: abilityOwner.x, y: abilityOwner.y };
    } else {
        const randomIndex = sineObjects.length === 1 ? 0 : Math.floor(sineObjects.length * nextRandom(game.state.randomSeed));
        const randomObject = sineObjects[randomIndex];
        return { x: randomObject.x, y: randomObject.y };
    }
}

function paintNote(ctx: CanvasRenderingContext2D, note: MusicNote, notePaintX: number, notePaintY: number, lineNumber: number, noteRadius: number) {
    const noteStemSize = noteRadius * 5;
    ctx.beginPath();
    ctx.arc(notePaintX, notePaintY, noteRadius, 0, Math.PI * 2);
    switch (note.durationFactor) {
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
    if (note.durationFactor < 4) {
        ctx.lineWidth = 2;
        ctx.beginPath();
        const noteStemDirection = lineNumber < 3 ? 1 : -1;
        const noteStemOffsetX = noteStemDirection < 0 ? noteRadius - 1 : -noteRadius + 1;
        ctx.moveTo(notePaintX + noteStemOffsetX, notePaintY);
        ctx.lineTo(notePaintX + noteStemOffsetX, notePaintY + noteStemSize * noteStemDirection);
        ctx.stroke();
    }
}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SINE);
    options[0].option.displayMoreInfoText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const musicSheet = ability as AbilityMusicSheets;
    let up: AbilityMusicSheetUpgradeInstrumentSine;
    if (musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SINE] === undefined) {
        up = { level: 0, lastSpawnObjectIds: [] };
        musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SINE] = up;
        musicSheet.selectedInstrument = ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SINE;
    } else {
        up = musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SINE];
    }
    up.level++;
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityMusicSheetUpgradeInstrumentSine = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SINE];
    return `${ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SINE}: ${up.level}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityMusicSheetUpgradeInstrumentSine | undefined = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SINE];
    if (upgrade) {
        textLines.push(
            `Instrument Sine +Level`,
        );
    } else {
        textLines.push(
            `Get Instrument Sine`,
        );
    }
    return textLines;
}

function executeMusicNotesDamage(notes: MusicNote[], abilityOwner: AbilityOwner, abilityMusicSheets: AbilityMusicSheets, game: Game) {
    const upgrade: AbilityMusicSheetUpgradeInstrumentSine | undefined = abilityMusicSheets.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SINE];
    if (!upgrade) return;

    if (notes.length === 0) return;
    let damage = 0;
    const sineMultiplier = 0.5;
    if (upgrade.lastPlayedNoteTime === undefined) {
        damage = abilityMusicSheets.damagePerSecond;
    } else {
        const passedTime = (game.state.time - upgrade.lastPlayedNoteTime) / 1000;
        damage = abilityMusicSheets.damagePerSecond * passedTime;
    }
    damage *= sineMultiplier;
    let characters: Character[] = [];
    let bosses: Character[] = [];
    const chainPos = getMusicSheetUpgradeChainPosition(abilityMusicSheets, abilityOwner, game);
    if (abilityOwner.faction === FACTION_PLAYER) {
        bosses = determineCharactersInDistance(chainPos, undefined, [], game.state.bossStuff.bosses, 400, abilityOwner.faction, true);
        const baseSearchDistance = 200;
        characters = determineCharactersInDistance(chainPos, game.state.map, [], [], baseSearchDistance, abilityOwner.faction, true);
        if (characters.length === 0) {
            characters = determineCharactersInDistance(chainPos, game.state.map, [], [], baseSearchDistance * 2, abilityOwner.faction, true);
        }
    }
    upgrade.lastSpawnObjectIds = [];
    const damagePerNote = damage / notes.length * upgrade.level;
    const areaFactor = getAbilityMusicSheetsUpgradeAreaFactor(abilityMusicSheets);
    const defaultRadius = 10;
    const area = (defaultRadius * defaultRadius) * Math.PI * areaFactor;
    const radius = Math.sqrt(area / Math.PI);
    const multiply = getAbilityMusicSheetsUpgradeMultiplyAmount(abilityMusicSheets);
    for (let note of notes) {
        for (let i = 0; i < multiply; i++) {
            let randomDirection: number | undefined = undefined;
            if (bosses.length > 0) {
                const charIndex = Math.floor(nextRandom(game.state.randomSeed) * bosses.length);
                const target = bosses[charIndex];
                randomDirection = calculateDirection(chainPos, target);
                bosses.splice(charIndex, 1);
            } else if (characters.length > 0) {
                const charIndex = Math.floor(nextRandom(game.state.randomSeed) * characters.length);
                const target = characters[charIndex];
                randomDirection = calculateDirection(chainPos, target);
                characters.splice(charIndex, 1);
            }
            if (!randomDirection) {
                randomDirection = nextRandom(game.state.randomSeed) * Math.PI * 2;
            }
            const bullet = createProjectile(chainPos.x, chainPos.y, randomDirection, damagePerNote, abilityOwner.faction, 4, game.state.time, 1000, 5000, ABILITY_NAME_MUSIC_SHEET, abilityMusicSheets.id, radius);
            game.state.abilityObjects.push(bullet);
            bullet.id = getNextId(game.state.idCounter);
            upgrade.lastSpawnObjectIds.push(bullet.id);
        }
    }

    upgrade.lastPlayedNoteTime = game.state.time;
}