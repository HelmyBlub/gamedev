import { determineCharactersInDistance } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { UpgradeOptionAndProbability, AbilityUpgradeOption } from "../../character/upgrade.js";
import { Game, FACTION_PLAYER, Position } from "../../gameModel.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { MusicNote } from "../../sound.js";
import { Ability, AbilityOwner } from "../ability.js";
import { createAbilityObjectExplode } from "../abilityExplode.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS, AbilityMusicSheets, MusicInstrumentType } from "./abilityMusicSheet.js";

export type AbilityMusicSheetUpgradeInstrumentTriangle = AbilityUpgrade & {
    lastPlayedNoteTime?: number,
}

export const ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE = "Instrument Triangle";

export function addAbilityMusicSheetUpgradeInstrumentTriangle() {
    ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE] = {
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

function paintNote(ctx: CanvasRenderingContext2D, note: MusicNote, notePaintX: number, notePaintY: number, lineNumber: number, noteRadius: number) {
    const noteStemSize = noteRadius * 5;
    ctx.beginPath();

    const noteStemDirection = lineNumber < 3 ? 1 : -1;
    const offset = noteRadius * noteStemDirection;
    ctx.moveTo(notePaintX + noteRadius, notePaintY + offset);
    ctx.lineTo(notePaintX - noteRadius, notePaintY + offset);
    ctx.lineTo(notePaintX, notePaintY - offset);
    ctx.lineTo(notePaintX + noteRadius, notePaintY + offset);

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
        const noteStemOffsetX = noteStemDirection < 0 ? noteRadius - 1 : -noteRadius + 1;
        ctx.moveTo(notePaintX + noteStemOffsetX, notePaintY + offset);
        ctx.lineTo(notePaintX + noteStemOffsetX, notePaintY + noteStemSize * noteStemDirection);
        ctx.stroke();
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
        up = { level: 0 };
        musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE] = up;
        musicSheet.selectedInstrument = ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE;
    } else {
        up = musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE];
    }
    up.level++;
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityMusicSheetUpgradeInstrumentTriangle = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE];
    return `${ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE}: ${up.level}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityMusicSheetUpgradeInstrumentTriangle | undefined = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE];
    if (upgrade) {
        textLines.push(
            `Instrument Triangle +Level`,
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
    let damage = 0;
    if (upgrade.lastPlayedNoteTime === undefined) {
        damage = abilityMusicSheets.damagePerSecond;
    } else {
        const passedTime = (game.state.time - upgrade.lastPlayedNoteTime) / 1000;
        damage = abilityMusicSheets.damagePerSecond * passedTime;
    }
    let characters: Character[] = [];
    if (abilityOwner.faction === FACTION_PLAYER) {
        characters = determineCharactersInDistance(abilityOwner, game.state.map, game.state.players, game.state.bossStuff.bosses, 320, abilityOwner.faction, true);
    }
    const damagePerNote = damage / notes.length;
    const explodeSize = 50;
    for (let note of notes) {
        let randomPos: Position | undefined = undefined;
        if (characters.length > 0) {
            const charIndex = Math.floor(nextRandom(game.state.randomSeed) * characters.length);
            const character = characters[charIndex];
            randomPos = {
                x: character.x,
                y: character.y,
            };
            characters.splice(charIndex, 1);
        }
        if (!randomPos) {
            randomPos = {
                x: abilityOwner.x + nextRandom(game.state.randomSeed) * 400 - 200,
                y: abilityOwner.y + nextRandom(game.state.randomSeed) * 400 - 200,
            }
        }
        const strikeObject = createAbilityObjectExplode(randomPos, damagePerNote, explodeSize, abilityOwner.faction, abilityMusicSheets.id, 0, game);
        game.state.abilityObjects.push(strikeObject);
    }

    upgrade.lastPlayedNoteTime = game.state.time;
}