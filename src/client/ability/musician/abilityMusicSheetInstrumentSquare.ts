import { determineCharactersInDistance } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { UpgradeOptionAndProbability, AbilityUpgradeOption } from "../../character/upgrade.js";
import { Game, FACTION_PLAYER, Position } from "../../gameModel.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { MusicNote } from "../../sound.js";
import { Ability, AbilityOwner } from "../ability.js";
import { createAbilityObjectExplode } from "../abilityExplode.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS, AbilityMusicSheets, getMusicSheetUpgradeChainPosition } from "./abilityMusicSheet.js";

export type AbilityMusicSheetUpgradeInstrumentSquare = AbilityUpgrade & {
    lastSpawns: Position[],
    lastPlayedNoteTime?: number,
}

export const ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SQUARE = "Instrument Square";

export function addAbilityMusicSheetUpgradeInstrumentSquare() {
    ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SQUARE] = {
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
    const upgrade: AbilityMusicSheetUpgradeInstrumentSquare | undefined = abilityMusicSheets.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SQUARE];
    if (!upgrade || upgrade.lastSpawns.length < 1) return { x: abilityOwner.x, y: abilityOwner.y };

    const randomIndex = upgrade.lastSpawns.length === 1 ? 0 : Math.floor(upgrade.lastSpawns.length * nextRandom(game.state.randomSeed));
    const randomPos = upgrade.lastSpawns[randomIndex];
    return { x: randomPos.x, y: randomPos.y };
}

function paintNote(ctx: CanvasRenderingContext2D, note: MusicNote, notePaintX: number, notePaintY: number, lineNumber: number, noteRadius: number) {
    const noteStemSize = noteRadius * 5;
    ctx.beginPath();
    ctx.rect(notePaintX - noteRadius, notePaintY - noteRadius, noteRadius * 2, noteRadius * 2);
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
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SQUARE);
    options[0].option.displayMoreInfoText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption) {
    const musicSheet = ability as AbilityMusicSheets;
    let up: AbilityMusicSheetUpgradeInstrumentSquare;
    if (musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SQUARE] === undefined) {
        up = { level: 0, lastSpawns: [] };
        musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SQUARE] = up;
        musicSheet.selectedInstrument = ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SQUARE;
    } else {
        up = musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SQUARE];
    }
    up.level++;
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityMusicSheetUpgradeInstrumentSquare = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SQUARE];
    return `${ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SQUARE}: ${up.level}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityMusicSheetUpgradeInstrumentSquare | undefined = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SQUARE];
    if (upgrade) {
        textLines.push(
            `Instrument Square +Level`,
        );
    } else {
        textLines.push(
            `Get Instrument Square`,
        );
    }
    return textLines;
}

function executeMusicNotesDamage(notes: MusicNote[], abilityOwner: AbilityOwner, abilityMusicSheets: AbilityMusicSheets, game: Game) {
    const upgrade: AbilityMusicSheetUpgradeInstrumentSquare | undefined = abilityMusicSheets.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SQUARE];
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
    const chainPos = getMusicSheetUpgradeChainPosition(abilityMusicSheets, abilityOwner, game);
    if (abilityOwner.faction === FACTION_PLAYER) {
        characters = determineCharactersInDistance(chainPos, game.state.map, game.state.players, game.state.bossStuff.bosses, 320, abilityOwner.faction, true);
    }
    upgrade.lastSpawns = [];
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
                x: chainPos.x + nextRandom(game.state.randomSeed) * 400 - 200,
                y: chainPos.y + nextRandom(game.state.randomSeed) * 400 - 200,
            }
        }
        upgrade.lastSpawns.push({ x: randomPos.x, y: randomPos.y });
        const strikeObject = createAbilityObjectExplode(randomPos, damagePerNote, explodeSize, abilityOwner.faction, abilityMusicSheets.id, 0, game);
        game.state.abilityObjects.push(strikeObject);
    }

    upgrade.lastPlayedNoteTime = game.state.time;
}