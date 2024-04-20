import { Character } from "../../character/characterModel.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { getNextId } from "../../game.js";
import { Position, Game, IdCounter, FACTION_PLAYER } from "../../gameModel.js";
import { playerInputBindingToDisplayValue } from "../../playerInput.js";
import { MoreInfoPart, createMoreInfosPart } from "../../moreInfo.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, getAbilityNameUiText } from "../ability.js";
import { AbilityUpgradesFunctions, pushAbilityUpgradesOptions, pushAbilityUpgradesUiTexts, upgradeAbility } from "../abilityUpgrade.js";
import { AbilityDamageBreakdown } from "../../combatlog.js";
import { MusicNote, MusicSheet, Note, notesToFrequencyIndex, playMusicNote } from "../../sound.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { determineCharactersInDistance, findMyCharacter } from "../../character/character.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { createAbilityObjectExplode } from "../abilityExplode.js";

export type AbilityMusicSheets = Ability & {
    musicSheets: AbilityMusicSheet[],
    selectedMusicSheetIndex: number,
    maxMusicSheets: number,
    widthPerNote: number,
    paintHeight: number,
    buttonWidth: number,
    buttons: MusicSheetButton[],
    offestY: number,
    lastPlayedNoteTime?: number,
    damagePerSecond: number,
}

type AbilityMusicSheet = {
    musicSheet: MusicSheet,
    maxPlayTicks: number,
    lastPlayTick: number,
}

type MusicSheetButton = {
    isLeft: boolean,
    height: number,
    action: "+" | "-" | "↑" | "↓",
}

const LINE_COUNT = 5;
const BASE_OCATAVE = 4;
const NOTE_PAINT_OFFSETX = 20;
export const ABILITY_NAME_MUSIC_SHEET = "Music Sheet";
export const ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS: AbilityUpgradesFunctions = {};

export function addAbilityMusicSheet() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_MUSIC_SHEET] = {
        activeAbilityCast: castAbility,
        createAbility: createAbilityMusicSheet,
        createAbilityBossUpgradeOptions: createAbilityBossSpeedBoostUpgradeOptions,
        createAbilityMoreInfos: createAbilityMoreInfos,
        createDamageBreakDown: createDamageBreakDown,
        executeUpgradeOption: executeAbilityUpgradeOption,
        paintAbility: paintAbility,
        paintAbilityUI: paintAbilityUI,
        resetAbility: resetAbility,
        setAbilityToLevel: setAbilityToLevel,
        setAbilityToBossLevel: setAbilityToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        tickAbility: tickAbility,
        tickBossAI: tickBossAI,
        abilityUpgradeFunctions: ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS,
        canBeUsedByBosses: true,
    };
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
            lastPlayTick: 0,
            maxPlayTicks: 8,
        }],
        buttons: [
            { action: "+", isLeft: false, height: 20 },
            { action: "-", isLeft: false, height: 20 },
            { action: "↑", isLeft: true, height: 20 },
            { action: "↓", isLeft: true, height: 20 },
        ],
        maxMusicSheets: 5,
        selectedMusicSheetIndex: 0,
        widthPerNote: 30,
        paintHeight: 80,
        offestY: 50,
        damagePerSecond: 200,
        buttonWidth: 20,
    };
}

function createDamageBreakDown(damage: number, ability: Ability, abilityObject: AbilityObject | undefined, damageAbilityName: string, game: Game): AbilityDamageBreakdown[] {
    const damageBreakDown: AbilityDamageBreakdown[] = [];
    damageBreakDown.push({
        damage: damage,
        name: "Base Damage",
    });
    return damageBreakDown;
}

function tickBossAI(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
}

function resetAbility(ability: Ability) {
    const abilityMusicSheet = ability as AbilityMusicSheets;
    for (let musicSheet of abilityMusicSheet.musicSheets) {
        musicSheet.lastPlayTick = 0;
    }
}

function castAbility(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, isKeydown: boolean, game: Game) {
    if (!isKeydown) return;
    const abilityMusicSheet = ability as AbilityMusicSheets;
    const selectedMusicSheet = abilityMusicSheet.musicSheets[abilityMusicSheet.selectedMusicSheetIndex];
    const musicSheetWidth = abilityMusicSheet.widthPerNote * selectedMusicSheet.maxPlayTicks;
    const didCastNote = castNote(abilityOwner, abilityMusicSheet, selectedMusicSheet, castPosition, musicSheetWidth);
    if (didCastNote) return;
    const clickedButton = determineClickedButton(abilityMusicSheet, abilityOwner, musicSheetWidth, castPosition);
    if (clickedButton) {
        switch (clickedButton.action) {
            case "+":
                selectedMusicSheet.maxPlayTicks += 4;
                const musicSheetTime = (game.state.time) % (selectedMusicSheet.musicSheet.speed * selectedMusicSheet.maxPlayTicks);
                selectedMusicSheet.lastPlayTick = musicSheetTime / selectedMusicSheet.musicSheet.speed;
                break;
            case "-":
                if (selectedMusicSheet.maxPlayTicks > 4) {
                    selectedMusicSheet.maxPlayTicks -= 4;
                    const musicSheetTime = (game.state.time) % (selectedMusicSheet.musicSheet.speed * selectedMusicSheet.maxPlayTicks);
                    selectedMusicSheet.lastPlayTick = musicSheetTime / selectedMusicSheet.musicSheet.speed;
                }
                break;
            case "↑":
                if (abilityMusicSheet.selectedMusicSheetIndex > 0) {
                    abilityMusicSheet.selectedMusicSheetIndex--;
                }
                break;
            case "↓":
                if (abilityMusicSheet.selectedMusicSheetIndex < abilityMusicSheet.maxMusicSheets - 1) {
                    abilityMusicSheet.selectedMusicSheetIndex++;
                    if (abilityMusicSheet.musicSheets[abilityMusicSheet.selectedMusicSheetIndex] === undefined) {
                        abilityMusicSheet.musicSheets[abilityMusicSheet.selectedMusicSheetIndex] = {
                            lastPlayTick: 0,
                            maxPlayTicks: 8,
                            musicSheet: { notes: [], speed: 400 },
                        }
                    }
                }
        }
    }
}

function determineClickedButton(abilityMusicSheets: AbilityMusicSheets, abilityOwner: AbilityOwner, musicSheetWidth: number, castPosition: Position): MusicSheetButton | undefined {
    const musicSheetLeft = abilityOwner.x - musicSheetWidth / 2;
    const musicSheetRight = musicSheetLeft + musicSheetWidth;
    const musicSheetTop = abilityOwner.y + abilityMusicSheets.offestY;
    const leftButtonHit = musicSheetLeft > castPosition.x && castPosition.x > musicSheetLeft - abilityMusicSheets.buttonWidth;
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
    const unroundedTick = (((castPosition.x - abilityOwner.x) + musicSheetWidth / 2 - NOTE_PAINT_OFFSETX + 4) / musicSheetWidth) * selectedSheet.maxPlayTicks;
    const tick = Math.round(unroundedTick);
    if (tick < 0 || tick >= selectedSheet.maxPlayTicks) return false;
    const musicNote = yPosToMusicNote(castPosition.y, abilityOwner.y, musicSheets);
    if (!musicNote) return false;
    musicNote.tick = tick;
    let duplicateNoteIndex = selectedSheet.musicSheet.notes.findIndex(n => n.note === musicNote.note && n.tick === tick && n.octave === musicNote.octave);
    if (duplicateNoteIndex > -1) {
        const dupNote = selectedSheet.musicSheet.notes[duplicateNoteIndex];
        if (unroundedTick < tick - 0.1) {
            if (!dupNote.semitone) {
                dupNote.semitone = "sharp";
            } else if (dupNote.semitone === "sharp") {
                dupNote.semitone = "flat";
            } else {
                dupNote.semitone = undefined;
            }
        } else {
            if (dupNote.durationFactor < 4) {
                dupNote.durationFactor *= 2;
            } else {
                selectedSheet.musicSheet.notes.splice(duplicateNoteIndex, 1);
            }
        }
    } else {
        selectedSheet.musicSheet.notes.push(musicNote);
    }
    return true;
}

function createAbilityBossSpeedBoostUpgradeOptions(ability: Ability, character: Character, game: Game): UpgradeOptionAndProbability[] {
    const upgradeOptions: UpgradeOptionAndProbability[] = [];
    pushAbilityUpgradesOptions(ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS, upgradeOptions, ability, character, game);
    return upgradeOptions;
}

function executeAbilityUpgradeOption(ability: Ability, character: Character, upgradeOption: UpgradeOption, game: Game) {
    const abilityUpgradeOption: AbilityUpgradeOption = upgradeOption as AbilityUpgradeOption;
    upgradeAbility(ability, character, abilityUpgradeOption);
}

function setAbilityToLevel(ability: Ability, level: number) {
    const musicSheet = ability as AbilityMusicSheets;
    musicSheet.damagePerSecond = 200 * level;
}

function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const musicSheet = ability as AbilityMusicSheets;
}

function setAbilityToBossLevel(ability: Ability, level: number) {
    const musicSheet = ability as AbilityMusicSheets;
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
    const abilityMusicSheet = ability as AbilityMusicSheets;
    const selectedSheet = abilityMusicSheet.musicSheets[abilityMusicSheet.selectedMusicSheetIndex];
    const musicSheetWidth = abilityMusicSheet.widthPerNote * selectedSheet.maxPlayTicks;
    const isMyAbility = findMyCharacter(game) === abilityOwner;
    let ownerPaintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition);
    const topLeftMusicSheet = {
        x: Math.floor(ownerPaintPos.x - musicSheetWidth / 2),
        y: ownerPaintPos.y + abilityMusicSheet.offestY,
    }
    if (!isMyAbility) ctx.globalAlpha *= 0.5;
    if (abilityOwner.faction === FACTION_PLAYER) ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;

    paintMusicSheetLines(ctx, topLeftMusicSheet, musicSheetWidth, abilityMusicSheet, selectedSheet);
    paintNotes(ctx, abilityMusicSheet, topLeftMusicSheet, selectedSheet);
    paintMovingLineTimeIndicator(ctx, abilityMusicSheet, topLeftMusicSheet, musicSheetWidth, selectedSheet);

    if (isMyAbility) {
        let spacing = 2;
        let leftOffsetY = 0;
        let rightOffsetY = 0;
        const fontSize = 24;
        ctx.font = `bold ${fontSize}px Arial`;
        for (let button of abilityMusicSheet.buttons) {
            const paintX = button.isLeft ? topLeftMusicSheet.x - abilityMusicSheet.buttonWidth : topLeftMusicSheet.x + musicSheetWidth;
            const paintY = button.isLeft ? topLeftMusicSheet.y + leftOffsetY : topLeftMusicSheet.y + rightOffsetY;
            const textWidth = ctx.measureText(button.action).width;
            ctx.fillStyle = "white";
            ctx.fillRect(paintX, paintY, abilityMusicSheet.buttonWidth, button.height);
            ctx.fillStyle = "black";
            ctx.fillText(button.action, paintX + Math.floor(abilityMusicSheet.buttonWidth / 2 - textWidth / 2), Math.floor(paintY + button.height / 2 + fontSize / 2) - 5);
            if (button.isLeft) {
                leftOffsetY += button.height + spacing;
            } else {
                rightOffsetY += button.height + spacing;
            }
        }
        ctx.fillStyle = "white";
        ctx.fillRect(topLeftMusicSheet.x - abilityMusicSheet.buttonWidth, topLeftMusicSheet.y + leftOffsetY, abilityMusicSheet.buttonWidth, abilityMusicSheet.buttonWidth);
        ctx.fillStyle = "black";
        ctx.fillText((1 + abilityMusicSheet.selectedMusicSheetIndex).toFixed(), topLeftMusicSheet.x - abilityMusicSheet.buttonWidth + 5, Math.floor(topLeftMusicSheet.y + leftOffsetY + abilityMusicSheet.buttonWidth / 2 + fontSize / 2) - 5);
    }
    ctx.globalAlpha = 1;
}

function paintMovingLineTimeIndicator(ctx: CanvasRenderingContext2D, abilityMusicSheet: AbilityMusicSheets, topLeftMusicSheet: Position, musicSheetWidth: number, selectedSheet: AbilityMusicSheet) {
    ctx.lineWidth = 1;
    ctx.fillStyle = "black";
    const xOffset1 = (((selectedSheet.lastPlayTick + selectedSheet.maxPlayTicks) % selectedSheet.maxPlayTicks) / selectedSheet.maxPlayTicks) * musicSheetWidth;
    const xOffset = (xOffset1 + NOTE_PAINT_OFFSETX) % musicSheetWidth;
    ctx.beginPath();
    ctx.moveTo(topLeftMusicSheet.x + xOffset, topLeftMusicSheet.y);
    ctx.lineTo(topLeftMusicSheet.x + xOffset, topLeftMusicSheet.y + abilityMusicSheet.paintHeight);
    ctx.stroke();
}

function paintMusicSheetLines(ctx: CanvasRenderingContext2D, topLeftMusicSheet: Position, musicSheetWidth: number, abilityMusicSheets: AbilityMusicSheets, selectedSheet: AbilityMusicSheet) {
    ctx.globalAlpha *= 0.5;
    ctx.fillStyle = "white";
    ctx.fillRect(topLeftMusicSheet.x, topLeftMusicSheet.y, musicSheetWidth, abilityMusicSheets.paintHeight);
    ctx.globalAlpha *= 2;
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    for (let i = 0; i < LINE_COUNT; i++) {
        ctx.beginPath();
        const tempY = Math.floor(topLeftMusicSheet.y + (abilityMusicSheets.paintHeight / LINE_COUNT) * (i + 0.5));
        ctx.moveTo(topLeftMusicSheet.x, tempY);
        ctx.lineTo(topLeftMusicSheet.x + musicSheetWidth, tempY);
        ctx.stroke();
    }

    const splitterTopY = Math.floor(topLeftMusicSheet.y + (abilityMusicSheets.paintHeight / LINE_COUNT) * 0.5);
    for (let i = 4; i < selectedSheet.maxPlayTicks; i += 4) {
        const xOffset = Math.floor(i / selectedSheet.maxPlayTicks * musicSheetWidth);
        ctx.beginPath();
        ctx.moveTo(topLeftMusicSheet.x + xOffset, splitterTopY);
        ctx.lineTo(topLeftMusicSheet.x + xOffset, splitterTopY + abilityMusicSheets.paintHeight - Math.floor(abilityMusicSheets.paintHeight / LINE_COUNT));
        ctx.stroke();
    }
}

function paintNotes(ctx: CanvasRenderingContext2D, abilityMusicSheet: AbilityMusicSheets, topLeftMusicSheet: Position, selectedSheet: AbilityMusicSheet) {
    const noteRadius = Math.floor(abilityMusicSheet.paintHeight / LINE_COUNT / 2);
    const noteStemSize = Math.floor(abilityMusicSheet.paintHeight / 2);
    const musicSheetWidth = abilityMusicSheet.widthPerNote * selectedSheet.maxPlayTicks;
    for (let note of selectedSheet.musicSheet.notes) {
        ctx.fillStyle = "black";
        ctx.strokeStyle = "black";
        const lineNumber = musicNoteToMusicSheetLine(note) + 0.5;
        const xOffset = (note.tick / selectedSheet.maxPlayTicks) * musicSheetWidth + NOTE_PAINT_OFFSETX;
        if (xOffset > musicSheetWidth) continue;
        ctx.beginPath();
        const noteX = topLeftMusicSheet.x + xOffset;
        const noteY = topLeftMusicSheet.y + lineNumber * (abilityMusicSheet.paintHeight / LINE_COUNT);
        ctx.arc(noteX, noteY, noteRadius, 0, Math.PI * 2);
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
            ctx.moveTo(noteX + noteRadius - 1, noteY);
            ctx.lineTo(noteX + noteRadius - 1, noteY + noteStemSize * noteStemDirection);
            ctx.stroke();
        }
        if (note.semitone) {
            const char = note.semitone === "flat" ? "b" : "#";
            ctx.font = `bold ${noteRadius * 2.5}px Arial`;
            ctx.fillStyle = "black";
            const charWidth = ctx.measureText(char).width;
            ctx.fillText(char, noteX - noteRadius - charWidth, noteY + noteRadius - 2);
        }
    }
}

/** 0 = inside top line | 0.5 = between top line and second top line etc.  */
function musicNoteToMusicSheetLine(musicNote: MusicNote): number {
    const noteToLineMap: { [key: string]: number } = {
        "B": -1.5, "A": -1, "G": -0.5, "F": 0, "E": 0.5, "D": 1, "C": 1.5,
    };
    const line = noteToLineMap[(musicNote.note.charAt(0))];
    const lineWithOctave = line + (BASE_OCATAVE - musicNote.octave) * 3.5;
    return lineWithOctave;
}

function yPosToMusicNote(yClickPos: number, yOwnerPos: number, abilityMusicSheets: AbilityMusicSheets): MusicNote | undefined {
    const indexToNote = ["B", "A", "G", "F", "E", "D", "C"];
    const offsetTopMusciSheet = (yClickPos - yOwnerPos - abilityMusicSheets.offestY);
    const lineNumber = offsetTopMusciSheet / abilityMusicSheets.paintHeight * LINE_COUNT;
    const index = Math.round(lineNumber * 2) + 2;
    const octave = BASE_OCATAVE - (Math.floor(index / indexToNote.length));
    if (octave < BASE_OCATAVE - 1 || octave > BASE_OCATAVE + 1) return undefined;
    const note = indexToNote[(index + indexToNote.length) % indexToNote.length] as Note;
    return {
        durationFactor: 1,
        note: note,
        octave: octave,
        tick: 0,
    }
}

function tickAbility(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityMusicSheet = ability as AbilityMusicSheets;
    const notesDamageTick: MusicNote[] = [];
    for (let selectedMusicSheet of abilityMusicSheet.musicSheets) {
        const musicSheetTime = (game.state.time) % (selectedMusicSheet.musicSheet.speed * selectedMusicSheet.maxPlayTicks);
        const currentTick = musicSheetTime / selectedMusicSheet.musicSheet.speed;
        const lastTick = selectedMusicSheet.lastPlayTick;
        const delayTicks = game.sound ? game.sound.customDelay / selectedMusicSheet.musicSheet.speed : 0;
        for (let i = selectedMusicSheet.musicSheet.notes.length - 1; i >= 0; i--) {
            const note = selectedMusicSheet.musicSheet.notes[i];
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
                //warning: playing sound is client specific delayed. Casting ability must not.
                playMusicNote(selectedMusicSheet.musicSheet, note, game.sound);
            }
            const noteTick = note.tick % selectedMusicSheet.maxPlayTicks;
            if ((lastTick < noteTick && noteTick <= currentTick)
                || (lastTick > currentTick && noteTick <= currentTick)
            ) {
                notesDamageTick.push(note);
            }
        }
        selectedMusicSheet.lastPlayTick = currentTick;
    }
    executeMusicNotesDamage(notesDamageTick, abilityOwner, abilityMusicSheet, game);
}

function executeMusicNotesDamage(notes: MusicNote[], abilityOwner: AbilityOwner, abilityMusicSheets: AbilityMusicSheets, game: Game) {
    if (notes.length === 0) return;
    let damage = 0;
    if (abilityMusicSheets.lastPlayedNoteTime === undefined) {
        damage = abilityMusicSheets.damagePerSecond;
    } else {
        const passedTime = (game.state.time - abilityMusicSheets.lastPlayedNoteTime) / 1000;
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

    abilityMusicSheets.lastPlayedNoteTime = game.state.time;
}

function createAbilityMoreInfos(ctx: CanvasRenderingContext2D, ability: Ability, game: Game): MoreInfoPart {
    const abilityMusicSheet = ability as AbilityMusicSheets;
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(
        `Key: ${playerInputBindingToDisplayValue(abilityMusicSheet.playerInputBinding!, game)}`,
        `Click to place notes in music sheet.`,
    );
    if (abilityMusicSheet.level) {
        textLines.push(`Level: ${abilityMusicSheet.level.level}`);
        if (abilityMusicSheet.level.leveling) {
            textLines.push(
                `XP: ${abilityMusicSheet.level.leveling.experience.toFixed(0)}/${abilityMusicSheet.level.leveling.experienceForLevelUp}`,
            );
        }
    }
    pushAbilityUpgradesUiTexts(ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS, textLines, ability);

    return createMoreInfosPart(ctx, textLines);
}

