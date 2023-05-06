import { addAbilityToCharacter } from "../../ability/ability.js";
import { createAbilitySword } from "../../ability/abilitySword.js";
import { IdCounter, PLAYER_CHARACTER_CLASSES } from "../../gameModel.js";
import { RandomSeed } from "../../randomNumberGenerator.js";
import { createLevelingCharacter, LevelingCharacter } from "./levelingCharacterModel.js";

export function addSwordClass() {
    PLAYER_CHARACTER_CLASSES["Sword"] = {
        createPlayerCharacter: createSwordCharacter
    }
}

function createSwordCharacter(
    idCounter: IdCounter,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    moveSpeed: number,
    hp: number,
    faction: string,
    seed: RandomSeed,
): LevelingCharacter {
    let character = createLevelingCharacter(idCounter, x, y, width, height, color, moveSpeed, hp, faction, seed);
    addAbilityToCharacter(character, createAbilitySword(idCounter));
    return character;
}