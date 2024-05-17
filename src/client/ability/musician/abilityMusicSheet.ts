import { Character } from "../../character/characterModel.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { calculateDistance, getCameraPosition, getNextId } from "../../game.js";
import { Position, Game, IdCounter, FACTION_PLAYER } from "../../gameModel.js";
import { playerInputBindingToDisplayValue } from "../../playerInput.js";
import { MoreInfoPart, createMoreInfosPart } from "../../moreInfo.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, findAbilityById, getAbilityNameUiText } from "../ability.js";
import { AbilityUpgrade, AbilityUpgradeFunctions, AbilityUpgradesFunctions, getAbilityUpgradeOptionDefault, pushAbilityUpgradesOptions, pushAbilityUpgradesUiTexts, upgradeAbility } from "../abilityUpgrade.js";
import { AbilityDamageBreakdown } from "../../combatlog.js";
import { MusicNote, MusicSheet, Note, playMusicNote } from "../../sound.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SINE, addAbilityMusicSheetUpgradeInstrumentSine } from "./abilityMusicSheetInstrumentSine.js";
import { ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SQUARE, addAbilityMusicSheetUpgradeInstrumentSquare } from "./abilityMusicSheetInstrumentSquare.js";
import { findMyCharacter } from "../../character/character.js";
import { ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE, addAbilityMusicSheetUpgradeInstrumentTriangle } from "./abilityMusicSheetInstrumentTriangle.js";
import { addAbilityMusicSheetUpgradeSize } from "./abilityMusicSheetUpgradeSize.js";
import { addAbilityMusicSheetUpgradeMultiply } from "./abilityMusicSheetUpgradeMultiply.js";
import { abilityMusicSheetsUpgradeSlowApplySlow, addAbilityMusicSheetUpgradeSlow } from "./abilityMusicSheetUpgradeSlow.js";
import { deleteProjectile, tickProjectile } from "../projectile.js";
import { abilityMusicSheetsUpgradeSpeedSetSpeed, addAbilityMusicSheetUpgradeSpeed } from "./abilityMusicSheetUpgradeSpeed.js";
import { addAbilityMusicSheetUpgradeShield, executeAbilityMusicSheetsUpgradeShield } from "./abilityMusicSheetUpgradeShield.js";
import { abilityMusicSheetsUpgradeDamageOverTimeApply, addAbilityMusicSheetUpgradeDamageOverTime } from "./abilityMusicSheetUpgradeDamageOverTime.js";
import { ABILITY_NAME_EXPLODE } from "../abilityExplode.js";
import { ABILITY_NAME_CIRCLE_AROUND } from "../abilityCircleAround.js";
import { mousePositionToMapPosition } from "../../map/map.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { GAME_IMAGES, getImage } from "../../imageLoad.js";

export type AbilityMusicSheets = Ability & {
    nextUpgradeAddInstrument: boolean,
    chainOrder?: string,
    musicSheets: AbilityMusicSheet[],
    selectedMusicSheetIndex: number,
    maxMusicSheets: number,
    widthPerNote: number,
    paintHeight: number,
    maxPaintWidth: number,
    buttonWidth: number,
    buttons: MusicSheetButton[],
    offestY: number,
    damagePerSecond: number,
    selectedInstrument?: string,
}

export type AbilityUpgradeFunctionsMusicSheets = AbilityUpgradeFunctions & {
    executeNoteDamage?: (notes: MusicNote[], abilityOwner: AbilityOwner, abilityMusicSheets: AbilityMusicSheets, game: Game) => void
    paintNoteHead?: (ctx: CanvasRenderingContext2D, note: MusicNote, notePaintX: number, notePaintY: number, lineNumber: number, noteRadius: number) => void,
    getChainPosition?: (abilityOwner: AbilityOwner, abilityMusicSheets: AbilityMusicSheets, game: Game) => Position,
}

export type AbilityUpgradesFunctionsMusicSheets = {
    [key: string]: AbilityUpgradeFunctionsMusicSheets,
}

export type AbilityMusicSheet = {
    musicSheet: MusicSheet,
    clef: "treble" | "bass",
    shortestAllowedNote: 1 | 0.5 | 0.25,
    stopping?: boolean,
    stopped: boolean,
    timePaintOffsetX: number,
    maxPlayTicks: number,
    lastPlayTick?: number,
    lastPlayGameTime?: number,
}

export type AbilityMusicSheetUpgradeInstrument = AbilityUpgrade & {
    lastPlayedNoteTime?: number,
}

type MusicSheetButton = {
    isLeft: boolean,
    height: number,
    action: "+" | "-" | "↑" | "↓" | "start/stop" | "shortestNote" | "nextInterval",
}

const NOTE_LENGTH_1_4 = 1;
const NOTE_LENGTH_1_8 = 0.5;
const NOTE_LENGTH_1_16 = 0.25;
const LINE_COUNT = 5;
const TREBLE_OCTAVE = 5;
const NOTE_PAINT_OFFSETX = 20;
const CLEF_WIDTH = 30;
export const ABILITY_NAME_MUSIC_SHEET = "Music Sheet";
export const ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS: AbilityUpgradesFunctionsMusicSheets = {};
export const IMAGE_TREBLE_CLEF = "treble";
export const IMAGE_TREBLE_BASS = "bass";
GAME_IMAGES[IMAGE_TREBLE_CLEF] = {
    imagePath: "/images/trebleClef.png",
    spriteRowHeights: [100],
    spriteRowWidths: [30],
};
GAME_IMAGES[IMAGE_TREBLE_BASS] = {
    imagePath: "/images/bassClef.png",
    spriteRowHeights: [100],
    spriteRowWidths: [30],
};

export function addAbilityMusicSheet() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_MUSIC_SHEET] = {
        activeAbilityCast: castAbility,
        createAbility: createAbilityMusicSheet,
        createAbilityBossUpgradeOptions: createAbilityBossUpgradeOptions,
        createAbilityMoreInfos: createAbilityMoreInfos,
        createDamageBreakDown: createDamageBreakDown,
        deleteAbilityObject: deleteAbilityObject,
        executeUpgradeOption: executeAbilityUpgradeOption,
        onObjectHit: onObjectHit,
        paintAbility: paintAbility,
        paintAbilityUI: paintAbilityUI,
        resetAbility: resetAbility,
        setAbilityToLevel: setAbilityToLevel,
        setAbilityToBossLevel: setAbilityToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        setUpAbilityForEnemy: setUpAbilityForEnemy,
        tickAbility: tickAbility,
        tickAbilityObject: tickAbilityObject,
        tickBossAI: tickBossAI,
        abilityUpgradeFunctions: ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS,
        canBeUsedByBosses: true,
    };
    addAbilityMusicSheetUpgradeInstrumentSine();
    addAbilityMusicSheetUpgradeInstrumentSquare();
    addAbilityMusicSheetUpgradeInstrumentTriangle();
    addAbilityMusicSheetUpgradeSize();
    addAbilityMusicSheetUpgradeMultiply();
    addAbilityMusicSheetUpgradeSlow();
    addAbilityMusicSheetUpgradeSpeed();
    addAbilityMusicSheetUpgradeShield();
    addAbilityMusicSheetUpgradeDamageOverTime();
}

export function createAbilityMusicSheet(
    idCounter: IdCounter,
    playerInputBinding?: string,
): AbilityMusicSheets {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_MUSIC_SHEET,
        passive: false,
        upgrades: {},
        playerInputBinding: playerInputBinding,
        tradable: true,
        musicSheets: [{
            musicSheet: { speed: 400, notes: [] },
            stopped: true,
            lastPlayTick: -0.5,
            maxPlayTicks: 8,
            shortestAllowedNote: NOTE_LENGTH_1_4,
            clef: "treble",
            timePaintOffsetX: 0,
        }],
        buttons: [
            { action: "+", isLeft: false, height: 20 },
            { action: "-", isLeft: false, height: 20 },
            { action: "↑", isLeft: true, height: 20 },
            { action: "↓", isLeft: true, height: 20 },
            { action: "start/stop", isLeft: true, height: 20 },
            { action: "shortestNote", isLeft: false, height: 20 },
            { action: "nextInterval", isLeft: false, height: 20 },
        ],
        maxMusicSheets: 5,
        selectedMusicSheetIndex: 0,
        widthPerNote: 30,
        paintHeight: 80,
        offestY: 50,
        damagePerSecond: 200,
        buttonWidth: 20,
        nextUpgradeAddInstrument: true,
        maxPaintWidth: 800,
    };
}

export function getMusicSheetUpgradeChainPosition(musicSheets: AbilityMusicSheets, abilityOwner: AbilityOwner, game: Game): Position {
    if (!musicSheets.chainOrder) return { x: abilityOwner.x, y: abilityOwner.y };
    const functions = ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[musicSheets.chainOrder];
    if (!functions.getChainPosition) return { x: abilityOwner.x, y: abilityOwner.y };
    return functions.getChainPosition(abilityOwner, musicSheets, game);
}

function getMusicSheetPaintWidth(ability: AbilityMusicSheets, selectedSheet: AbilityMusicSheet): number {
    let musicSheetWidth = ability.widthPerNote * selectedSheet.maxPlayTicks / selectedSheet.shortestAllowedNote;
    return Math.min(musicSheetWidth, ability.maxPaintWidth);
}

function getQuaterNoteWidth(ability: AbilityMusicSheets, selectedSheet: AbilityMusicSheet): number {
    return ability.widthPerNote / selectedSheet.shortestAllowedNote;
}

function deleteAbilityObject(abilityObject: AbilityObject, game: Game): boolean {
    return deleteProjectile(abilityObject, game);
}

function tickAbilityObject(abilityObject: AbilityObject, game: Game) {
    tickProjectile(abilityObject, game);
}

function onObjectHit(abilityObject: AbilityObject, targetCharacter: Character, game: Game) {
    if (abilityObject.abilityIdRef === undefined) return;
    const ability = findAbilityById(abilityObject.abilityIdRef, game) as AbilityMusicSheets;
    if (!ability) return;
    abilityMusicSheetsUpgradeSlowApplySlow(ability, targetCharacter, game);
    abilityMusicSheetsUpgradeDamageOverTimeApply(ability, targetCharacter, game);
}

function createDamageBreakDown(damage: number, ability: Ability, abilityObject: AbilityObject | undefined, damageAbilityName: string, game: Game): AbilityDamageBreakdown[] {
    const damageBreakDown: AbilityDamageBreakdown[] = [];
    if (abilityObject) {
        let name = "Base Damage";
        switch (abilityObject.type) {
            case ABILITY_NAME_EXPLODE:
                name = ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SQUARE;
                break;
            case ABILITY_NAME_CIRCLE_AROUND:
                name = ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE;
                break;
            case ABILITY_NAME_MUSIC_SHEET:
                name = ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SINE;
                break;
        }
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

function tickBossAI(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityMusicSheets = ability as AbilityMusicSheets;
    let activeSheet: undefined | AbilityMusicSheet = undefined;
    for (let sheet of abilityMusicSheets.musicSheets) {
        if (sheet.stopped) continue;
        if (sheet.musicSheet.notes.length <= 0) continue;
        if (!activeSheet) activeSheet = sheet;
    }
    if (!activeSheet) {
        activeSheet = abilityMusicSheets.musicSheets[abilityMusicSheets.selectedMusicSheetIndex];
        if (activeSheet.stopped) activeSheet.stopping = false;
    }
    if (activeSheet.stopped) return;
    let allInstrumentsLastPlayedNoteTime = -1;
    const upgradeKeys = Object.keys(abilityMusicSheets.upgrades);
    let tempInstrument: AbilityMusicSheetUpgradeInstrument | undefined = undefined;
    for (let key of upgradeKeys) {
        const functions = ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[key];
        if (functions && functions.executeNoteDamage) {
            const instrument: AbilityMusicSheetUpgradeInstrument = abilityMusicSheets.upgrades[key];
            if (instrument.lastPlayedNoteTime !== undefined && allInstrumentsLastPlayedNoteTime < instrument.lastPlayedNoteTime) {
                allInstrumentsLastPlayedNoteTime = instrument.lastPlayedNoteTime;
                tempInstrument = instrument;
            } else {
                instrument.lastPlayedNoteTime = game.state.time;
            }
        }
    }

    const waitTime = 5000;
    if (tempInstrument && allInstrumentsLastPlayedNoteTime >= 0 && allInstrumentsLastPlayedNoteTime + waitTime < game.state.time) {
        addRandomNote(abilityMusicSheets, activeSheet, game);
        tempInstrument.lastPlayedNoteTime = game.state.time - waitTime * 0.9;
    }
}

function resetAbility(ability: Ability) {
    const abilityMusicSheet = ability as AbilityMusicSheets;
    for (let musicSheet of abilityMusicSheet.musicSheets) {
        musicSheet.lastPlayTick = undefined;
        musicSheet.lastPlayGameTime = undefined;
    }
}

function castAbility(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, isKeydown: boolean, game: Game) {
    if (!isKeydown) return;
    const abilityMusicSheets = ability as AbilityMusicSheets;
    if (abilityMusicSheets.selectedInstrument === undefined) return;
    const selectedMusicSheet = abilityMusicSheets.musicSheets[abilityMusicSheets.selectedMusicSheetIndex];
    const musicSheetWidth = getMusicSheetPaintWidth(abilityMusicSheets, selectedMusicSheet);
    const clickedButton = determineClickedButton(abilityMusicSheets, abilityOwner, musicSheetWidth, castPosition);
    if (clickedButton) {
        executeButtonClick(clickedButton, abilityMusicSheets, selectedMusicSheet);
        return;
    }
    const didCastNote = castNote(abilityOwner, abilityMusicSheets, selectedMusicSheet, castPosition, musicSheetWidth);
    if (didCastNote) return;
    const clefClick = determineCleffClick(abilityOwner, abilityMusicSheets, castPosition, musicSheetWidth);
    if (clefClick) {
        selectedMusicSheet.clef = selectedMusicSheet.clef === "bass" ? "treble" : "bass";
        const octaveChange = selectedMusicSheet.clef === "bass" ? -2 : +2;
        for (let note of selectedMusicSheet.musicSheet.notes) {
            if (selectedMusicSheet.clef) {
                note.octave += octaveChange;
            }
        }
    }
}

function determineCleffClick(abilityOwner: AbilityOwner, abilityMusicSheets: AbilityMusicSheets, castPosition: Position, musicSheetWidth: number): boolean {
    const musicSheetLeft = abilityOwner.x - musicSheetWidth / 2;
    const clefXHit = castPosition.x <= musicSheetLeft && castPosition.x > musicSheetLeft - CLEF_WIDTH;
    if (!clefXHit) return false;
    const musicSheetTop = abilityOwner.y + abilityMusicSheets.offestY;
    const clefYHit = castPosition.y >= musicSheetTop && castPosition.y < musicSheetTop + abilityMusicSheets.paintHeight;
    return clefYHit;
}

function executeButtonClick(clickedButton: MusicSheetButton, abilityMusicSheets: AbilityMusicSheets, selectedMusicSheet: AbilityMusicSheet) {
    switch (clickedButton.action) {
        case "+":
            selectedMusicSheet.maxPlayTicks += 4;
            break;
        case "-":
            if (selectedMusicSheet.maxPlayTicks > 4) {
                selectedMusicSheet.maxPlayTicks -= 4;
                const quaterWidth = getQuaterNoteWidth(abilityMusicSheets, selectedMusicSheet);
                const musicSheetWidth = getMusicSheetPaintWidth(abilityMusicSheets, selectedMusicSheet);
                const totalWidth = quaterWidth * selectedMusicSheet.maxPlayTicks;
                if (totalWidth - musicSheetWidth < selectedMusicSheet.timePaintOffsetX) {
                    selectedMusicSheet.timePaintOffsetX = 0;
                }
            }
            break;
        case "↑":
            if (abilityMusicSheets.selectedMusicSheetIndex > 0) {
                abilityMusicSheets.selectedMusicSheetIndex--;
            }
            break;
        case "↓":
            if (abilityMusicSheets.selectedMusicSheetIndex < abilityMusicSheets.maxMusicSheets - 1) {
                abilityMusicSheets.selectedMusicSheetIndex++;
                if (abilityMusicSheets.musicSheets[abilityMusicSheets.selectedMusicSheetIndex] === undefined) {
                    abilityMusicSheets.musicSheets[abilityMusicSheets.selectedMusicSheetIndex] = {
                        lastPlayTick: -0.5,
                        maxPlayTicks: 8,
                        stopped: true,
                        musicSheet: { notes: [], speed: 400 },
                        shortestAllowedNote: NOTE_LENGTH_1_4,
                        clef: "treble",
                        timePaintOffsetX: 0,
                    }
                }
            }
            break;
        case "start/stop":
            selectedMusicSheet.stopping = !selectedMusicSheet.stopping;
            break;
        case "shortestNote":
            switch (selectedMusicSheet.shortestAllowedNote) {
                case NOTE_LENGTH_1_4:
                    selectedMusicSheet.shortestAllowedNote = NOTE_LENGTH_1_8;
                    break;
                case NOTE_LENGTH_1_8:
                    selectedMusicSheet.shortestAllowedNote = NOTE_LENGTH_1_16;
                    break;
                case NOTE_LENGTH_1_16:
                    selectedMusicSheet.shortestAllowedNote = NOTE_LENGTH_1_4;
                    break;
            }
            break;
        case "nextInterval":
            const quaterWidth = getQuaterNoteWidth(abilityMusicSheets, selectedMusicSheet);
            const offsetPerClick = quaterWidth * 4;
            const paintSheetWidth = getMusicSheetPaintWidth(abilityMusicSheets, selectedMusicSheet);
            const totalSheetWidth = quaterWidth * selectedMusicSheet.maxPlayTicks;
            if (selectedMusicSheet.timePaintOffsetX > totalSheetWidth - paintSheetWidth + 20) {
                selectedMusicSheet.timePaintOffsetX = 0;
            } else {
                selectedMusicSheet.timePaintOffsetX += offsetPerClick;
            }
            break;
    }
}

function determineClickedButton(abilityMusicSheets: AbilityMusicSheets, abilityOwner: AbilityOwner, musicSheetWidth: number, castPosition: Position): MusicSheetButton | undefined {
    const musicSheetLeft = abilityOwner.x - musicSheetWidth / 2;
    const musicSheetRight = musicSheetLeft + musicSheetWidth;
    const musicSheetTop = abilityOwner.y + abilityMusicSheets.offestY;
    const leftButtonHit = musicSheetLeft - CLEF_WIDTH > castPosition.x && castPosition.x > musicSheetLeft - abilityMusicSheets.buttonWidth - CLEF_WIDTH;
    const rightButtonHit = musicSheetRight < castPosition.x && castPosition.x < musicSheetRight + abilityMusicSheets.buttonWidth;
    if (!leftButtonHit && !rightButtonHit) return undefined;
    const isLeft = leftButtonHit;
    let offsetY = 0;
    const spacing = 2;
    for (let button of abilityMusicSheets.buttons) {
        if (button.isLeft === isLeft) {
            if (castPosition.y > musicSheetTop + offsetY && castPosition.y < musicSheetTop + offsetY + button.height) {
                return button;
            }
            offsetY += button.height + spacing;
        }
    }
    return undefined;
}

/** returns true if clicked inside music sheet for note placing */
function castNote(abilityOwner: AbilityOwner, musicSheets: AbilityMusicSheets, selectedSheet: AbilityMusicSheet, castPosition: Position, musicSheetWidth: number): boolean {
    const unroundedTick = calculateUnroundedTick(abilityOwner, musicSheets, selectedSheet, castPosition, musicSheetWidth);
    const musicNote = positionToMusicNote(abilityOwner, musicSheets, selectedSheet, castPosition, musicSheetWidth);
    if (!musicNote) return false;
    let duplicateNoteIndex = selectedSheet.musicSheet.notes.findIndex(n => n.note === musicNote.note && n.tick === musicNote.tick && n.octave === musicNote.octave);
    if (duplicateNoteIndex > -1) {
        const dupNote = selectedSheet.musicSheet.notes[duplicateNoteIndex];
        const modifyDelete = modifyNoteClick(dupNote, unroundedTick, musicNote.tick);
        if (modifyDelete) selectedSheet.musicSheet.notes.splice(duplicateNoteIndex, 1);
    } else {
        selectedSheet.musicSheet.notes.push(musicNote);
    }
    abilityMusicSheetsUpgradeSpeedSetSpeed(musicSheets, abilityOwner);
    return true;
}

function calculateUnroundedTick(abilityOwner: AbilityOwner, musicSheets: AbilityMusicSheets, selectedSheet: AbilityMusicSheet, castPosition: Position, musicSheetWidth: number) {
    const widthPerQuaterNote = getQuaterNoteWidth(musicSheets, selectedSheet);
    return ((castPosition.x - abilityOwner.x) + musicSheetWidth / 2 - NOTE_PAINT_OFFSETX + 4 + selectedSheet.timePaintOffsetX) / widthPerQuaterNote;
}

function positionToMusicNote(abilityOwner: AbilityOwner, musicSheets: AbilityMusicSheets, selectedSheet: AbilityMusicSheet, castPosition: Position, musicSheetWidth: number): MusicNote | undefined {
    const unroundedTick = calculateUnroundedTick(abilityOwner, musicSheets, selectedSheet, castPosition, musicSheetWidth);
    const tick = Math.round(unroundedTick / selectedSheet.shortestAllowedNote) * selectedSheet.shortestAllowedNote;
    if (tick < 0 || tick >= selectedSheet.maxPlayTicks) return undefined;
    const musicNote = yPosToMusicNote(castPosition.y, abilityOwner.y, musicSheets, selectedSheet);
    if (!musicNote) return undefined;
    musicNote.tick = tick;
    return musicNote;
}

/** return true if note remove click */
function modifyNoteClick(note: MusicNote, unroundedTick: number, tick: number): boolean {
    if (unroundedTick < tick - 0.1) {
        if (!note.semitone) {
            note.semitone = "sharp";
        } else if (note.semitone === "sharp") {
            note.semitone = "flat";
        } else {
            note.semitone = undefined;
        }
    } else {
        if (note.durationFactor < 4) {
            note.durationFactor *= 2;
        } else {
            return true;
        }
    }
    return false;
}

function positionToHoverNote(abilityOwner: AbilityOwner, musicSheets: AbilityMusicSheets, selectedSheet: AbilityMusicSheet, castPosition: Position, musicSheetWidth: number): { note: MusicNote, delete?: boolean } | undefined {
    const unroundedTick = calculateUnroundedTick(abilityOwner, musicSheets, selectedSheet, castPosition, musicSheetWidth);
    const note = positionToMusicNote(abilityOwner, musicSheets, selectedSheet, castPosition, musicSheetWidth);
    if (!note) return;
    let duplicateNoteIndex = selectedSheet.musicSheet.notes.findIndex(n => n.note === note.note && n.tick === note.tick && n.octave === note.octave);
    if (duplicateNoteIndex > -1) {
        const dupNote = selectedSheet.musicSheet.notes[duplicateNoteIndex];
        note.semitone = dupNote.semitone;
        note.durationFactor = dupNote.durationFactor;
        const modifyDelete = modifyNoteClick(note, unroundedTick, note.tick);
        if (modifyDelete) return { note, delete: true };
    }

    return { note };
}

function createAbilityBossUpgradeOptions(ability: Ability, character: Character, game: Game): UpgradeOptionAndProbability[] {
    const musicSheets = ability as AbilityMusicSheets;
    const upgradeOptions: UpgradeOptionAndProbability[] = [];
    const upgradeFunctionkeys = Object.keys(ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS);
    const upgradeOptionsFuncitons: AbilityUpgradesFunctions = {};
    if (musicSheets.nextUpgradeAddInstrument) {
        for (let upFuncKey of upgradeFunctionkeys) {
            const functions = ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[upFuncKey];
            if (functions.executeNoteDamage) {
                upgradeOptionsFuncitons[upFuncKey] = functions;
            }
        }
        const isFirstInstrument = Object.keys(musicSheets.upgrades).length === 0;
        if (!isFirstInstrument) {
            musicSheets.nextUpgradeAddInstrument = false;
        }
    } else {
        for (let upFuncKey of upgradeFunctionkeys) {
            const functions = ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[upFuncKey];
            if (!functions.executeNoteDamage) {
                upgradeOptionsFuncitons[upFuncKey] = functions;
            }
        }
        musicSheets.nextUpgradeAddInstrument = true;
    }
    pushAbilityUpgradesOptions(upgradeOptionsFuncitons, upgradeOptions, ability, character, game);
    return upgradeOptions;
}

function executeAbilityUpgradeOption(ability: Ability, character: Character, upgradeOption: UpgradeOption, game: Game) {
    const abilityUpgradeOption: AbilityUpgradeOption = upgradeOption as AbilityUpgradeOption;
    const musicSheets = ability as AbilityMusicSheets;
    upgradeAbility(ability, character, abilityUpgradeOption);
    if (!musicSheets.nextUpgradeAddInstrument && ability.bossSkillPoints) {
        ability.bossSkillPoints.available++;
        ability.bossSkillPoints.used--;
    }
}

function setAbilityToLevel(ability: Ability, level: number) {
    const musicSheet = ability as AbilityMusicSheets;
    musicSheet.damagePerSecond = 200 * level;
}

function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const musicSheet = ability as AbilityMusicSheets;
    musicSheet.damagePerSecond = level * 1 * damageFactor;
}

function setUpAbilityForEnemy(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const musicSheets = ability as AbilityMusicSheets;
    musicSheets.musicSheets[0].maxPlayTicks = 4;
    if (Object.keys(musicSheets.upgrades).length > 0) return;
    addRandomInstrument(musicSheets, abilityOwner as Character, game);
    addRandomNote(musicSheets, musicSheets.musicSheets[0], game);
}

function addRandomNote(ability: AbilityMusicSheets, musicSheet: AbilityMusicSheet, game: Game) {
    const indexToNote = ["B", "A", "G", "F", "E", "D", "C"];
    const randomTick = Math.floor(nextRandom(game.state.randomSeed) * musicSheet.maxPlayTicks);
    const randomNoteIndex = Math.floor(nextRandom(game.state.randomSeed) * indexToNote.length);
    const randomNote = indexToNote[randomNoteIndex] as Note;
    const octave = TREBLE_OCTAVE;
    const instrumentKeys = getInstrumentKeys();
    const availableInstrumentKeys: string[] = [];
    for (let instrumentKey of instrumentKeys) {
        if (ability.upgrades[instrumentKey]) {
            availableInstrumentKeys.push(instrumentKey);
        }
    }
    const randomNoteTypeIndex = Math.floor(nextRandom(game.state.randomSeed) * availableInstrumentKeys.length);
    const randomNoteType = availableInstrumentKeys[randomNoteTypeIndex];
    const randomMusicNote: MusicNote = {
        durationFactor: 1,
        note: randomNote,
        octave: octave,
        tick: randomTick,
        type: randomNoteType,
    }
    musicSheet.musicSheet.notes.push(randomMusicNote);
}

function getInstrumentKeys(): string[] {
    const upgradeFunctionsKeys = Object.keys(ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS);
    const instrumentKeys: string[] = [];
    for (let upgradeFunctionsKey of upgradeFunctionsKeys) {
        const functions = ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[upgradeFunctionsKey];
        if (functions.executeNoteDamage) {
            instrumentKeys.push(upgradeFunctionsKey);
        }
    }
    return instrumentKeys;
}

function addRandomInstrument(ability: AbilityMusicSheets, abilityOwner: Character, game: Game) {
    const instrumentKeys = getInstrumentKeys();
    const randomInstrumentKeyIndex = Math.floor(nextRandom(game.state.randomSeed) * instrumentKeys.length);
    const randomInstrumentKey = instrumentKeys[randomInstrumentKeyIndex];
    const functions = ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[randomInstrumentKey];
    const option = getAbilityUpgradeOptionDefault(ability, randomInstrumentKey)[0].option as AbilityUpgradeOption;
    functions.executeOption(ability, option, abilityOwner);
}

function setAbilityToBossLevel(ability: Ability, level: number) {
    const musicSheets = ability as AbilityMusicSheets;
    musicSheets.damagePerSecond = 10 * level;
    const upgradeKeys = Object.keys(musicSheets.upgrades);
    const levelForEachUpgrade = Math.floor(level / upgradeKeys.length);
    const additionalLevelUntilIndex = level % upgradeKeys.length;
    for (let i = 0; i < upgradeKeys.length; i++) {
        const upgrade: AbilityUpgrade = musicSheets.upgrades[upgradeKeys[i]];
        upgrade.level = 1 + levelForEachUpgrade;
        if (i < additionalLevelUntilIndex) upgrade.level++;
    }
}

function paintAbilityUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    const musicSheet = ability as AbilityMusicSheets;
    const rectSize = size;

    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.beginPath();
    ctx.rect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.stroke();

    if (musicSheet.playerInputBinding) {
        const keyBind = playerInputBindingToDisplayValue(musicSheet.playerInputBinding, game);
        ctx.fillStyle = "black";
        ctx.font = "10px Arial";
        ctx.fillText(keyBind, drawStartX + 1, drawStartY + 8);
    }
}

function paintAbility(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    if (ability.disabled) return;
    const abilityMusicSheets = ability as AbilityMusicSheets;
    if (abilityMusicSheets.selectedInstrument === undefined) return;
    const selectedSheet = abilityMusicSheets.musicSheets[abilityMusicSheets.selectedMusicSheetIndex];
    const musicSheetWidth = getMusicSheetPaintWidth(abilityMusicSheets, selectedSheet);
    const isMyAbility = findMyCharacter(game) === abilityOwner;
    let hoverNote: { note: MusicNote, delete?: boolean } | undefined;
    let ownerPaintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition);
    const topLeftMusicSheet = {
        x: Math.floor(ownerPaintPos.x - musicSheetWidth / 2),
        y: ownerPaintPos.y + abilityMusicSheets.offestY,
    }
    let currentMousePosition: undefined | Position;
    if (!isMyAbility) {
        ctx.globalAlpha *= 0.5;
    } else {
        currentMousePosition = mousePositionToMapPosition(game, cameraPosition);
        hoverNote = positionToHoverNote(abilityOwner, abilityMusicSheets, selectedSheet, currentMousePosition, musicSheetWidth);
    }
    if (abilityOwner.faction === FACTION_PLAYER) ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;

    paintMusicSheetLines(ctx, topLeftMusicSheet, musicSheetWidth, abilityMusicSheets, selectedSheet);
    paintNotes(ctx, abilityMusicSheets, topLeftMusicSheet, selectedSheet, hoverNote);
    paintMovingLineTimeIndicator(ctx, abilityMusicSheets, topLeftMusicSheet, musicSheetWidth, selectedSheet);

    if (isMyAbility && currentMousePosition) {
        const clefHover = determineCleffClick(abilityOwner, abilityMusicSheets, currentMousePosition, musicSheetWidth);
        paintClef(ctx, abilityMusicSheets, topLeftMusicSheet, selectedSheet, clefHover);

        paintButtons(ctx, abilityMusicSheets, topLeftMusicSheet, selectedSheet, musicSheetWidth);
        if (hoverNote && !hoverNote.delete) {
            paintNote(ctx, hoverNote.note, abilityMusicSheets, topLeftMusicSheet, selectedSheet, "blue", 0.5);
        }
    } else {
        paintClef(ctx, abilityMusicSheets, topLeftMusicSheet, selectedSheet, false);
    }
    ctx.globalAlpha = 1;
}

function paintClef(ctx: CanvasRenderingContext2D, abilityMusicSheets: AbilityMusicSheets, topLeftMusicSheet: Position, selectedSheet: AbilityMusicSheet, hoverEffect: boolean) {
    const clef = getImage(selectedSheet.clef);
    if (clef) {
        if (hoverEffect) ctx.globalAlpha *= 0.5;
        ctx.drawImage(clef, topLeftMusicSheet.x - CLEF_WIDTH, topLeftMusicSheet.y - 10);
        if (hoverEffect) ctx.globalAlpha /= 0.5;
    }
}

function paintButtons(ctx: CanvasRenderingContext2D, abilityMusicSheets: AbilityMusicSheets, topLeftMusicSheet: Position, selectedSheet: AbilityMusicSheet, musicSheetWidth: number) {
    const buttonsAlpha = 0.8;
    ctx.globalAlpha *= buttonsAlpha;
    const spacing = 2;
    let leftOffsetY = 0;
    let rightOffsetY = 0;
    const fontSize = 24;
    const quaterWidth = getQuaterNoteWidth(abilityMusicSheets, selectedSheet);
    for (let button of abilityMusicSheets.buttons) {
        ctx.font = `bold ${fontSize}px Arial`;
        const paintX = button.isLeft ? topLeftMusicSheet.x - abilityMusicSheets.buttonWidth - CLEF_WIDTH : topLeftMusicSheet.x + musicSheetWidth;
        const paintY = button.isLeft ? topLeftMusicSheet.y + leftOffsetY : topLeftMusicSheet.y + rightOffsetY;
        let buttonText: string = button.action;
        if (button.action === "start/stop") {
            if (selectedSheet.stopping) {
                buttonText = "►";
            } else {
                buttonText = "■";
            }
        } else if (button.action === "shortestNote") {
            buttonText = (1 / selectedSheet.shortestAllowedNote * 4).toFixed();
        } else if (button.action === "nextInterval") {
            const currentInterval = Math.ceil(selectedSheet.timePaintOffsetX / quaterWidth / 4).toFixed();
            const maxInterval = Math.ceil(selectedSheet.maxPlayTicks / 4 - musicSheetWidth / quaterWidth / 4).toFixed();
            buttonText = `${currentInterval}/${maxInterval}`;
            const totalWidth = quaterWidth * selectedSheet.maxPlayTicks;
            if (totalWidth <= musicSheetWidth) continue;
            ctx.font = `bold ${fontSize / 2}px Arial`;
        }

        const textWidth = ctx.measureText(buttonText).width;
        ctx.fillStyle = "white";
        ctx.fillRect(paintX, paintY, abilityMusicSheets.buttonWidth, button.height);
        ctx.fillStyle = "black";
        ctx.fillText(buttonText, paintX + Math.floor(abilityMusicSheets.buttonWidth / 2 - textWidth / 2), Math.floor(paintY + button.height / 2 + fontSize / 2) - 5);
        if (button.isLeft) {
            leftOffsetY += button.height + spacing;
        } else {
            rightOffsetY += button.height + spacing;
        }
    }
    //visualize sheet number
    ctx.fillStyle = "white";
    ctx.fillRect(topLeftMusicSheet.x - abilityMusicSheets.buttonWidth - CLEF_WIDTH, topLeftMusicSheet.y + leftOffsetY, abilityMusicSheets.buttonWidth, abilityMusicSheets.buttonWidth);
    ctx.fillStyle = "black";
    ctx.fillText((1 + abilityMusicSheets.selectedMusicSheetIndex).toFixed(), topLeftMusicSheet.x - CLEF_WIDTH - abilityMusicSheets.buttonWidth + 5, Math.floor(topLeftMusicSheet.y + leftOffsetY + abilityMusicSheets.buttonWidth / 2 + fontSize / 2) - 5);
    ctx.globalAlpha /= buttonsAlpha;
}

function paintMovingLineTimeIndicator(ctx: CanvasRenderingContext2D, abilityMusicSheets: AbilityMusicSheets, topLeftMusicSheet: Position, musicSheetWidth: number, selectedSheet: AbilityMusicSheet) {
    ctx.lineWidth = 1;
    ctx.fillStyle = "black";
    if (selectedSheet.lastPlayTick === undefined) return;
    const widthPerQuaterNote = getQuaterNoteWidth(abilityMusicSheets, selectedSheet);
    const actualMusicSheetWidth = widthPerQuaterNote * selectedSheet.maxPlayTicks;
    const xOffset1 = (selectedSheet.lastPlayTick % selectedSheet.maxPlayTicks) * widthPerQuaterNote;
    const xOffset = (xOffset1 + NOTE_PAINT_OFFSETX) % actualMusicSheetWidth - selectedSheet.timePaintOffsetX;
    if (xOffset < 0 || xOffset > musicSheetWidth) return;
    ctx.beginPath();
    ctx.moveTo(topLeftMusicSheet.x + xOffset, topLeftMusicSheet.y);
    ctx.lineTo(topLeftMusicSheet.x + xOffset, topLeftMusicSheet.y + abilityMusicSheets.paintHeight);
    ctx.stroke();
}

function paintMusicSheetLines(ctx: CanvasRenderingContext2D, topLeftMusicSheet: Position, musicSheetWidth: number, abilityMusicSheets: AbilityMusicSheets, selectedSheet: AbilityMusicSheet) {
    ctx.globalAlpha *= 0.5;
    ctx.fillStyle = "white";
    ctx.fillRect(topLeftMusicSheet.x - CLEF_WIDTH, topLeftMusicSheet.y, musicSheetWidth + CLEF_WIDTH, abilityMusicSheets.paintHeight);
    ctx.globalAlpha *= 2;
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    for (let i = 0; i < LINE_COUNT; i++) {
        ctx.beginPath();
        const tempY = Math.floor(topLeftMusicSheet.y + (abilityMusicSheets.paintHeight / LINE_COUNT) * (i + 0.5));
        ctx.moveTo(topLeftMusicSheet.x - CLEF_WIDTH, tempY);
        ctx.lineTo(topLeftMusicSheet.x + musicSheetWidth, tempY);
        ctx.stroke();
    }

    const splitterTopY = Math.floor(topLeftMusicSheet.y + (abilityMusicSheets.paintHeight / LINE_COUNT) * 0.5);
    const widthPerQuaterNote = getQuaterNoteWidth(abilityMusicSheets, selectedSheet);
    for (let i = 4; i <= selectedSheet.maxPlayTicks; i += 4) {
        const xOffset = Math.floor(i * widthPerQuaterNote - selectedSheet.timePaintOffsetX);
        if (xOffset < 0 || xOffset > musicSheetWidth) continue;
        ctx.beginPath();
        ctx.moveTo(topLeftMusicSheet.x + xOffset, splitterTopY);
        ctx.lineTo(topLeftMusicSheet.x + xOffset, splitterTopY + abilityMusicSheets.paintHeight - Math.floor(abilityMusicSheets.paintHeight / LINE_COUNT));
        ctx.stroke();
        if (i === selectedSheet.maxPlayTicks) {
            const xOffset2 = xOffset + 5;
            if (xOffset2 < 0 || xOffset2 > musicSheetWidth) continue;
            ctx.beginPath();
            ctx.moveTo(topLeftMusicSheet.x + xOffset2, splitterTopY);
            ctx.lineTo(topLeftMusicSheet.x + xOffset2, splitterTopY + abilityMusicSheets.paintHeight - Math.floor(abilityMusicSheets.paintHeight / LINE_COUNT));
            ctx.stroke();
        }
    }
}

function paintNotes(ctx: CanvasRenderingContext2D, abilityMusicSheets: AbilityMusicSheets, topLeftMusicSheet: Position, selectedSheet: AbilityMusicSheet, hoverNote: { note: MusicNote, delete?: boolean } | undefined) {
    for (let note of selectedSheet.musicSheet.notes) {
        let globalAlphaModifier = undefined;
        if (hoverNote && note.note === hoverNote.note.note && note.tick === hoverNote.note.tick && note.octave === hoverNote.note.octave) {
            globalAlphaModifier = 0.5;
        }
        paintNote(ctx, note, abilityMusicSheets, topLeftMusicSheet, selectedSheet, "black", globalAlphaModifier);
    }
}

function paintNote(ctx: CanvasRenderingContext2D, note: MusicNote, abilityMusicSheets: AbilityMusicSheets, topLeftMusicSheet: Position, selectedSheet: AbilityMusicSheet, color: string = "black", globalAlphaModifier: number | undefined = undefined) {
    const musicSheetWidth = getMusicSheetPaintWidth(abilityMusicSheets, selectedSheet);
    const widthPerQuaterNote = getQuaterNoteWidth(abilityMusicSheets, selectedSheet);
    const noteRadius = Math.floor(abilityMusicSheets.paintHeight / LINE_COUNT / 2);
    if (globalAlphaModifier) ctx.globalAlpha *= globalAlphaModifier;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    const lineNumber = musicNoteToMusicSheetLine(note, selectedSheet) + 0.5;
    const xOffset = note.tick * widthPerQuaterNote + NOTE_PAINT_OFFSETX - selectedSheet.timePaintOffsetX;
    if (xOffset < 0 || xOffset > musicSheetWidth) return;

    if (note.type === undefined) return;
    const upgradeFunctions = ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[note.type];
    const noteX = topLeftMusicSheet.x + xOffset;
    const noteY = topLeftMusicSheet.y + lineNumber * (abilityMusicSheets.paintHeight / LINE_COUNT);
    if (upgradeFunctions.paintNoteHead) upgradeFunctions.paintNoteHead(ctx, note, noteX, noteY, lineNumber, noteRadius);
    paintNoteStem(ctx, note, noteX, noteY, abilityMusicSheets, noteRadius, lineNumber);
    if (note.semitone) {
        const char = note.semitone === "flat" ? "b" : "#";
        ctx.font = `bold ${noteRadius * 2.5}px Arial`;
        ctx.fillStyle = color;
        const charWidth = ctx.measureText(char).width;
        ctx.fillText(char, noteX - noteRadius - charWidth, noteY + noteRadius - 2);
    }
    if (lineNumber % 1 !== 0 && (lineNumber < 0 || lineNumber > 5)) {
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.moveTo(noteX - noteRadius * 2, noteY);
        ctx.lineTo(noteX + noteRadius * 2, noteY)
        ctx.stroke();
    }
    if (globalAlphaModifier) ctx.globalAlpha /= globalAlphaModifier;
}

function paintNoteStem(ctx: CanvasRenderingContext2D, note: MusicNote, noteX: number, noteY: number, abilityMusicSheet: AbilityMusicSheets, noteRadius: number, lineNumber: number) {
    if (note.durationFactor >= 4) return;
    const noteStemSize = noteRadius * 5;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const noteStemDirection = lineNumber < 3 ? 1 : -1;
    const noteStemOffsetX = noteStemDirection < 0 ? noteRadius - 1 : -noteRadius + 1;
    ctx.moveTo(noteX + noteStemOffsetX, noteY);
    ctx.lineTo(noteX + noteStemOffsetX, noteY + noteStemSize * noteStemDirection);
    ctx.stroke();
    if (note.durationFactor >= 1) return;
    ctx.beginPath();
    ctx.moveTo(noteX + noteStemOffsetX, noteY + noteStemSize * noteStemDirection);
    ctx.quadraticCurveTo(
        noteX + noteStemOffsetX,
        noteY + (noteStemSize * noteStemDirection) * 0.4,
        noteX + noteStemOffsetX - noteStemDirection * noteRadius,
        noteY + (noteStemSize * noteStemDirection) * 0.7
    );
    ctx.stroke();
    if (note.durationFactor >= 0.5) return;
    const noteStemOffsetY = noteStemSize * noteStemDirection * 0.8;
    ctx.beginPath();
    ctx.moveTo(noteX + noteStemOffsetX, noteY + noteStemOffsetY);
    ctx.quadraticCurveTo(
        noteX + noteStemOffsetX,
        noteY + noteStemOffsetY - noteStemSize * noteStemDirection * 0.6,
        noteX + noteStemOffsetX - noteStemDirection * noteRadius,
        noteY + noteStemOffsetY - noteStemSize * noteStemDirection * 0.3
    );
    ctx.stroke();

}

/** 0 = inside top line | 0.5 = between top line and second top line etc.  */
function musicNoteToMusicSheetLine(musicNote: MusicNote, selectedMusicSheet: AbilityMusicSheet): number {
    const noteToLineMap: { [key: string]: number } = {
        "B": -1.5, "A": -1, "G": -0.5, "F": 0, "E": 0.5, "D": 1, "C": 1.5,
    };
    const line = noteToLineMap[(musicNote.note.charAt(0))];
    let lineWithOctave = line + (TREBLE_OCTAVE - musicNote.octave) * 3.5;
    if (selectedMusicSheet.clef === "bass") {
        lineWithOctave -= 6;
    }
    return lineWithOctave;
}

function yPosToMusicNote(yClickPos: number, yOwnerPos: number, abilityMusicSheets: AbilityMusicSheets, selectedSheet: AbilityMusicSheet): MusicNote | undefined {
    const indexToNote = ["B", "A", "G", "F", "E", "D", "C"];
    const offsetTopMusciSheet = (yClickPos - yOwnerPos - abilityMusicSheets.offestY);
    const lineNumber = offsetTopMusciSheet / abilityMusicSheets.paintHeight * LINE_COUNT;
    if (lineNumber < -1 || lineNumber > 6) return undefined;
    let index = Math.round(lineNumber * 2) + 2;
    if (selectedSheet.clef === "bass") index += 12;
    const octave = TREBLE_OCTAVE - (Math.floor(index / indexToNote.length));
    const note = indexToNote[(index + indexToNote.length) % indexToNote.length] as Note;
    const noteType = abilityMusicSheets.selectedInstrument;
    return {
        durationFactor: selectedSheet.shortestAllowedNote,
        note: note,
        octave: octave,
        tick: 0,
        type: noteType,
    }
}

function tickAbility(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityMusicSheets = ability as AbilityMusicSheets;
    const typeToArrayIndex = new Map<string, number>();
    const notesDamageTypeTicks: MusicNote[][] = [];
    const distanceToCamera = calculateDistance(getCameraPosition(game), abilityOwner);
    for (let selectedMusicSheet of abilityMusicSheets.musicSheets) {
        if (selectedMusicSheet.lastPlayGameTime === undefined) selectedMusicSheet.lastPlayGameTime = game.state.time;
        if (selectedMusicSheet.lastPlayTick === undefined) selectedMusicSheet.lastPlayTick = 0;
        if (selectedMusicSheet.stopped && !selectedMusicSheet.stopping) {
            const interval = selectedMusicSheet.musicSheet.speed * 4;
            const gameTimeInterval = game.state.time % interval;
            if (gameTimeInterval < 16) {
                selectedMusicSheet.lastPlayTick = -0.5;
                selectedMusicSheet.stopped = false;
                selectedMusicSheet.lastPlayGameTime = game.state.time;
            }
        }

        const musicSheetTime = (selectedMusicSheet.musicSheet.speed * selectedMusicSheet.lastPlayTick + (game.state.time - selectedMusicSheet.lastPlayGameTime)) % (selectedMusicSheet.musicSheet.speed * selectedMusicSheet.maxPlayTicks);
        const currentTick = musicSheetTime / selectedMusicSheet.musicSheet.speed;
        if (selectedMusicSheet.stopping) {
            if (currentTick % 4 >= 3.4) {
                selectedMusicSheet.stopped = true;
                selectedMusicSheet.lastPlayTick = -0.5;
            }
        }

        if (selectedMusicSheet.stopped) continue;
        if (selectedMusicSheet.lastPlayTick === undefined) selectedMusicSheet.lastPlayTick = currentTick - 1;
        const lastTick = selectedMusicSheet.lastPlayTick;
        const delayTicks = game.sound ? game.sound.customDelay / selectedMusicSheet.musicSheet.speed : 0;
        for (let i = selectedMusicSheet.musicSheet.notes.length - 1; i >= 0; i--) {
            const note = selectedMusicSheet.musicSheet.notes[i];
            if (note.type === undefined) continue;
            if (note.tick >= selectedMusicSheet.maxPlayTicks) {
                if (note.tick > selectedMusicSheet.maxPlayTicks + 4) {
                    selectedMusicSheet.musicSheet.notes.splice(i, 1);
                }
                continue;
            }
            const delayedNoteTick = (note.tick + delayTicks) % selectedMusicSheet.maxPlayTicks;
            if ((lastTick < delayedNoteTick && delayedNoteTick <= currentTick)
                || (lastTick > currentTick && delayedNoteTick <= currentTick)
            ) {
                //warning: playing sound is client specific delayed. other things should not.
                if (!game.testing.replay) playMusicNote(selectedMusicSheet.musicSheet, note, distanceToCamera, game.sound);
            }
            const noteTick = note.tick % selectedMusicSheet.maxPlayTicks;
            if ((lastTick < noteTick && noteTick <= currentTick)
                || (lastTick > currentTick && noteTick <= currentTick)
            ) {
                if (!typeToArrayIndex.has(note.type)) {
                    typeToArrayIndex.set(note.type, notesDamageTypeTicks.length);
                    notesDamageTypeTicks.push([]);
                }
                const index = typeToArrayIndex.get(note.type);
                if (index !== undefined) notesDamageTypeTicks[index].push(note);
            }
        }

        selectedMusicSheet.lastPlayTick = currentTick;
        selectedMusicSheet.lastPlayGameTime = game.state.time;
    }

    for (let notesDamageTicks of notesDamageTypeTicks) {
        const noteType = notesDamageTicks[0].type;
        if (noteType === undefined) continue;
        let upgradeFunctions = ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[noteType];
        if (upgradeFunctions.executeNoteDamage) {
            upgradeFunctions.executeNoteDamage(notesDamageTicks, abilityOwner, abilityMusicSheets, game);
            executeAbilityMusicSheetsUpgradeShield(abilityMusicSheets, abilityOwner, notesDamageTicks.length);
        }
    }

    if (abilityMusicSheets.musicSheets.length > 0 && abilityMusicSheets.musicSheets[0].lastPlayTick !== undefined) {
        if (abilityMusicSheets.musicSheets[0].lastPlayTick % 4 > 3) {
            abilityMusicSheets.chainOrder = undefined;
        } else if (notesDamageTypeTicks.length > 0 && notesDamageTypeTicks[0].length > 0 && notesDamageTypeTicks[0][0].type) {
            abilityMusicSheets.chainOrder = notesDamageTypeTicks[0][0].type;
        }
    }
}

function createAbilityMoreInfos(ctx: CanvasRenderingContext2D, ability: Ability, game: Game): MoreInfoPart {
    const abilityMusicSheet = ability as AbilityMusicSheets;
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(
        `Key: ${playerInputBindingToDisplayValue(abilityMusicSheet.playerInputBinding!, game)}`,
        `Click to place notes in music sheet.`,
        `Each note creates an damage effect.`,
        `More notes => less damage per Note.`,
    );
    if (abilityMusicSheet.level) {
        textLines.push(`Level: ${abilityMusicSheet.level.level}`);
        if (abilityMusicSheet.level.leveling) {
            textLines.push(
                `XP: ${abilityMusicSheet.level.leveling.experience.toFixed(0)}/${abilityMusicSheet.level.leveling.experienceForLevelUp}`,
            );
        }
    }
    textLines.push(`damage per second: ${abilityMusicSheet.damagePerSecond}`);
    pushAbilityUpgradesUiTexts(ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS, textLines, ability);

    return createMoreInfosPart(ctx, textLines);
}

