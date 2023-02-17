import { addAbilityToCharacter } from "../../ability/ability.js";
import { createAbilityFireCircle } from "../../ability/abilityFireCircle.js";
import { IdCounter, LEVELING_CHARACTER_CLASSES } from "../../gameModel.js";
import { RandomSeed } from "../../randomNumberGenerator.js";
import { createLevelingCharacter, LevelingCharacter } from "./levelingCharacterModel.js";

export function addCasterClass() {
    LEVELING_CHARACTER_CLASSES["Caster"] = {
        createLevelingCharacter: createCasterCharacter
    }
}

function createCasterCharacter(
    idCounter: IdCounter,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    moveSpeed: number,
    hp: number,
    damage: number,
    faction: string,
    seed: RandomSeed,
): LevelingCharacter {
    let character = createLevelingCharacter(idCounter, x, y, width, height, color, moveSpeed, hp, damage, faction, seed);
    addAbilityToCharacter(character, createAbilityFireCircle("ability1"));
    return character;
}