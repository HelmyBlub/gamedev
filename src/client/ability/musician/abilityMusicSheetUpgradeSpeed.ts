import { Character } from "../../character/characterModel.js";
import { UpgradeOptionAndProbability, AbilityUpgradeOption } from "../../character/upgrade.js";
import { MusicNote } from "../../sound.js";
import { Ability, AbilityOwner } from "../ability.js";
import { AbilityUpgrade, getAbilityUpgradeOptionDefault } from "../abilityUpgrade.js";
import { ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS, AbilityMusicSheets } from "./abilityMusicSheet.js";

export type AbilityMusicSheetUpgradeSpeed = AbilityUpgrade & {
    currentBonusSpeed: number,
}

export const ABILITY_MUSIC_SHEET_UPGRADE_SPEED = "Speed per unique note";
const SPEED_PER_LEVEL_PER_NOTE = 0.1;

export function addAbilityMusicSheetUpgradeSpeed() {
    ABILITY_MUSIC_SHEET_UPGRADE_FUNCTIONS[ABILITY_MUSIC_SHEET_UPGRADE_SPEED] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getMoreInfoText: getAbilityUpgradeUiTextLong,
        getOptions: getOptions,
        executeOption: executeOption,
        reset: reset,
    }
}

export function abilityMusicSheetsUpgradeSpeedSetSpeed(ability: AbilityMusicSheets, abilityOwner: AbilityOwner) {
    const up = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SPEED] as AbilityMusicSheetUpgradeSpeed;
    if (up === undefined) return;
    if (!abilityOwner.baseMoveSpeed) return;
    const count = countUniqueNotes(ability);
    const bonusSpeed = count * up.level * SPEED_PER_LEVEL_PER_NOTE;
    if (up.currentBonusSpeed > 0) {
        abilityOwner.baseMoveSpeed -= up.currentBonusSpeed;
    }
    up.currentBonusSpeed = bonusSpeed;
    abilityOwner.baseMoveSpeed += bonusSpeed;
}

function countUniqueNotes(ability: AbilityMusicSheets): number {
    const uniqueNotes: MusicNote[] = [];
    for (let musicSheet of ability.musicSheets) {
        for (let note of musicSheet.musicSheet.notes) {
            const dup = uniqueNotes.find(un => equalsNoteSound(un, note));
            if (dup) continue;
            uniqueNotes.push(note);
        }
    }
    return uniqueNotes.length;
}

function equalsNoteSound(note1: MusicNote, note2: MusicNote) {
    return note1.note === note2.note
        && note1.durationFactor === note2.durationFactor
        && note1.octave === note2.octave
        && note1.semitone === note2.semitone
        && note1.type === note2.type;
}

function reset(ability: Ability) {
    const up = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SPEED] as AbilityMusicSheetUpgradeSpeed;
    if (up === undefined) return;
    up.currentBonusSpeed = 0;
}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options = getAbilityUpgradeOptionDefault(ability, ABILITY_MUSIC_SHEET_UPGRADE_SPEED);
    options[0].option.displayMoreInfoText = getAbilityUpgradeUiTextLong(ability);
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption, character: Character) {
    const musicSheet = ability as AbilityMusicSheets;
    let up: AbilityMusicSheetUpgradeSpeed;
    if (musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SPEED] === undefined) {
        up = { level: 0, currentBonusSpeed: 0 };
        musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SPEED] = up;
    } else {
        up = musicSheet.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SPEED];
    }
    up.level++;
    abilityMusicSheetsUpgradeSpeedSetSpeed(musicSheet, character);
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilityMusicSheetUpgradeSpeed = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SPEED];
    return `${ABILITY_MUSIC_SHEET_UPGRADE_SPEED}: ${up.level}`;
}

function getAbilityUpgradeUiTextLong(ability: Ability): string[] {
    const textLines: string[] = [];
    const upgrade: AbilityMusicSheetUpgradeSpeed | undefined = ability.upgrades[ABILITY_MUSIC_SHEET_UPGRADE_SPEED];
    if (upgrade) {
        textLines.push(`Gain speed for every unique note.`);
        textLines.push(`Speed increases with upgrade level.`);
    } else {
        textLines.push(`Gain speed for every unique note.`);
    }
    return textLines;
}
