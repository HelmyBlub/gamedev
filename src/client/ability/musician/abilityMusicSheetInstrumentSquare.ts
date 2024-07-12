import { determineCharactersInDistance } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { UpgradeOptionAndProbability, AbilityUpgradeOption } from "../../character/upgrade.js";
import { Game, FACTION_PLAYER, Position, FACTION_ENEMY } from "../../gameModel.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { MusicNote } from "../../sound.js";
import { Ability, AbilityOwner } from "../ability.js";
import { createAbilityObjectExplode } from "../abilityExplode.js";
import { getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS, ABILITY_NAME_MUSIC_SHEET, AbilityMusicSheetUpgradeInstrument, AbilityMusicSheets, getMusicSheetUpgradeChainPosition } from "./abilityMusicSheet.js";
import { getAbilityMusicSheetsUpgradeMultiplyAmount } from "./abilityMusicSheetUpgradeMultiply.js";
import { getAbilityMusicSheetsUpgradeAreaFactor } from "./abilityMusicSheetUpgradeSize.js";

export type AbilityMusicSheetUpgradeInstrumentSquare = AbilityMusicSheetUpgradeInstrument & {
    lastSpawns: Position[],
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
        paintNoteHead: paintNoteHead,
        reset: reset,
    }
}

function reset(ability: Ability) {
    const upgrade: AbilityMusicSheetUpgradeInstrumentSquare | undefined = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SQUARE];
    if (upgrade) upgrade.lastPlayedNoteTime = undefined;
}

function getChainPosition(abilityOwner: AbilityOwner, abilityMusicSheets: AbilityMusicSheets, game: Game): Position {
    const upgrade: AbilityMusicSheetUpgradeInstrumentSquare | undefined = abilityMusicSheets.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SQUARE];
    if (!upgrade || upgrade.lastSpawns.length < 1) return { x: abilityOwner.x, y: abilityOwner.y };

    const randomIndex = upgrade.lastSpawns.length === 1 ? 0 : Math.floor(upgrade.lastSpawns.length * nextRandom(game.state.randomSeed));
    const randomPos = upgrade.lastSpawns[randomIndex];
    return { x: randomPos.x, y: randomPos.y };
}

function paintNoteHead(ctx: CanvasRenderingContext2D, note: MusicNote, notePaintX: number, notePaintY: number, lineNumber: number, noteRadius: number) {
    ctx.beginPath();
    ctx.rect(notePaintX - noteRadius, notePaintY - noteRadius, noteRadius * 2, noteRadius * 2);
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
            `Instrument Square +Level.`,
            `Damage increase from ${upgrade.level * 100}% to ${(upgrade.level + 1) * 100}%.`,
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
    let damage = abilityMusicSheets.damagePerSecond;
    let timeAreaFactor = 1;
    if (upgrade.lastPlayedNoteTime !== undefined) {
        const passedTime = (game.state.time - upgrade.lastPlayedNoteTime) / 1000;
        damage = abilityMusicSheets.damagePerSecond * passedTime;
        timeAreaFactor *= Math.max(passedTime / notes.length * 4, 0.1);
    }

    let characters: Character[] = [];
    let bosses: Character[] = [];
    const baseSpawnRadius = 200;
    const chainPos = getMusicSheetUpgradeChainPosition(abilityMusicSheets, abilityOwner, game);
    if (abilityOwner.faction === FACTION_PLAYER) {
        bosses = determineCharactersInDistance(chainPos, undefined, [], game.state.bossStuff.bosses, 400, abilityOwner.faction, true);
        characters = determineCharactersInDistance(chainPos, game.state.map, [], [], baseSpawnRadius, abilityOwner.faction, true);
        if (characters.length === 0) {
            characters = determineCharactersInDistance(chainPos, game.state.map, [], [], baseSpawnRadius * 2, abilityOwner.faction, true);
        }
    }
    upgrade.lastSpawns = [];
    const damagePerNote = damage / notes.length * upgrade.level;
    const upgradeAreaFactor = getAbilityMusicSheetsUpgradeAreaFactor(abilityMusicSheets);
    const defaultRadius = 50;
    const area = (defaultRadius * defaultRadius) * Math.PI * upgradeAreaFactor * timeAreaFactor;
    const explodeRadius = Math.sqrt(area / Math.PI);
    const multiply = getAbilityMusicSheetsUpgradeMultiplyAmount(abilityMusicSheets);
    for (let note of notes) {
        for (let i = 0; i < multiply; i++) {
            let randomPos: Position | undefined = undefined;
            if (bosses.length > 0) {
                const charIndex = Math.floor(nextRandom(game.state.randomSeed) * bosses.length);
                const boss = bosses[charIndex];
                randomPos = {
                    x: boss.x,
                    y: boss.y,
                };
                bosses.splice(charIndex, 1);
            } else if (characters.length > 0) {
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
                    x: chainPos.x + nextRandom(game.state.randomSeed) * baseSpawnRadius * 2 - baseSpawnRadius,
                    y: chainPos.y + nextRandom(game.state.randomSeed) * baseSpawnRadius * 2 - baseSpawnRadius,
                }
            }
            upgrade.lastSpawns.push({ x: randomPos.x, y: randomPos.y });
            let explodeDelay = 0;
            if (abilityOwner.faction === FACTION_ENEMY) explodeDelay = 1500;
            const strikeObject = createAbilityObjectExplode(randomPos, damagePerNote, explodeRadius, abilityOwner.faction, abilityMusicSheets.id, explodeDelay, game);
            strikeObject.abilityRefTypeDoOnHit = ABILITY_NAME_MUSIC_SHEET;
            game.state.abilityObjects.push(strikeObject);
        }
    }

    upgrade.lastPlayedNoteTime = game.state.time;
}