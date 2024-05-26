import { addAbilityToCharacter, createAbility, setAbilityToBossLevel } from "../../ability/ability.js";
import { createAbilityHpRegen } from "../../ability/abilityHpRegen.js";
import { FACTION_ENEMY, Game, IdCounter, Position } from "../../gameModel.js";
import { Character, IMAGE_SLIME, createCharacter } from "../characterModel.js";
import { createBossUpgradeOptionsAbilityLeveling, executeAbilityLevelingCharacterUpgradeOption } from "./abilityLevelingCharacter.js";
import { PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "./playerCharacters.js";
import { deepCopy, getNextId } from "../../game.js";
import { resetCharacter } from "../character.js";
import { CHARACTER_TYPE_BOSS_ENEMY } from "../enemy/bossEnemy.js";
import { ABILITY_NAME_MUSIC_SHEET, AbilityMusicSheets } from "../../ability/musician/abilityMusicSheet.js";
import { ABILITY_NAME_MUSIC_SHEET_CHANGE_INSTRUMENT } from "../../ability/musician/abilityMusicSheetChangeInstrument.js";
import { createAbilityMelee } from "../../ability/abilityMelee.js";
import { ABILITY_NAME_MUSIC_SHEET_DELETE_NOTE } from "../../ability/musician/abilityMusicSheetDeleteNote.js";

export const CHARACTER_CLASS_MUSICIAN = "Musician";

export function addMusicianClass() {
    PLAYER_CHARACTER_CLASSES_FUNCTIONS[CHARACTER_CLASS_MUSICIAN] = {
        changeCharacterToThisClass: changeCharacterToMusicianClass,
        createBossBasedOnClassAndCharacter: createBossBasedOnClassAndCharacter,
        createBossUpgradeOptions: createBossUpgradeOptionsAbilityLeveling,
        executeUpgradeOption: executeAbilityLevelingCharacterUpgradeOption,
        getMoreInfosText: getLongUiText,
        preventMultiple: true,
    }
}

function changeCharacterToMusicianClass(
    character: Character,
    idCounter: IdCounter,
    game: Game,
) {
    if (!character.characterClasses) character.characterClasses = [];
    const charClass = {
        className: CHARACTER_CLASS_MUSICIAN,
        id: getNextId(game.state.idCounter),
    }
    character.characterClasses.push(charClass);
    const abilityMusicSheets = createAbility(ABILITY_NAME_MUSIC_SHEET, idCounter, true, true, "ability1");
    if (abilityMusicSheets.bossSkillPoints) {
        abilityMusicSheets.bossSkillPoints.available++;
        abilityMusicSheets.bossSkillPoints.used--;
    }
    addAbilityToCharacter(character, abilityMusicSheets, charClass);
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_MUSIC_SHEET_CHANGE_INSTRUMENT, idCounter, false, false, "ability2"), charClass);
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_MUSIC_SHEET_DELETE_NOTE, idCounter, false, false, "ability3"), charClass);
    addAbilityToCharacter(character, createAbilityHpRegen(idCounter, undefined, 2), charClass);
}

function getLongUiText(): string[] {
    let text: string[] = [];
    text.push("Become a musician.");
    text.push("Places Notes in a music sheet");
    text.push("to create music. Music does Damage");
    return text;
}

function createBossBasedOnClassAndCharacter(basedOnCharacter: Character, level: number, spawn: Position, game: Game): Character {
    const idCounter = game.state.idCounter;
    const bossSize = 60;
    const color = "black";
    const moveSpeed = Math.min(6, 1.5 + level * 0.5);
    const hp = 1000 * Math.pow(level, 4);
    const experienceWorth = Math.pow(level, 2) * 100;

    const bossCharacter = createCharacter(getNextId(idCounter), spawn.x, spawn.y, bossSize, bossSize, color, moveSpeed, hp, FACTION_ENEMY, CHARACTER_TYPE_BOSS_ENEMY, experienceWorth);
    bossCharacter.paint.image = IMAGE_SLIME;
    bossCharacter.level = { level: level };
    const baseMusicSheets = basedOnCharacter.abilities.find((a) => a.name === ABILITY_NAME_MUSIC_SHEET);
    const musicSheets: AbilityMusicSheets = deepCopy(baseMusicSheets);
    bossCharacter.abilities.push(musicSheets);
    deleteUpgradesBasedOnBossLevel(musicSheets, level);
    setAbilityToBossLevel(musicSheets, level);
    const abilityMelee = createAbilityMelee(game.state.idCounter);
    setAbilityToBossLevel(abilityMelee, level);
    bossCharacter.abilities.push(abilityMelee);

    resetCharacter(bossCharacter, game);

    return bossCharacter;
}

function deleteUpgradesBasedOnBossLevel(musicSheets: AbilityMusicSheets, level: number) {
    const upgradeKeys = Object.keys(musicSheets.upgrades);
    let counter = level;
    for (let upgradeKey of upgradeKeys) {
        if (counter > 0) {
            counter--;
        } else {
            delete musicSheets.upgrades[upgradeKey];
        }
    }
}
