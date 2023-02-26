import { addAbilityToCharacter } from "../../ability/ability.js";
import { createAbilityRod } from "../../ability/abilityRod.js";
import { IdCounter, LEVELING_CHARACTER_CLASSES } from "../../gameModel.js";
import { RandomSeed } from "../../randomNumberGenerator.js";
import { createLevelingCharacter, LevelingCharacter } from "./levelingCharacterModel.js";

export function addRodClass() {
    LEVELING_CHARACTER_CLASSES["Rod"] = {
        createLevelingCharacter: createRodCharacter
    }
}

function createRodCharacter(
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
    addAbilityToCharacter(character, createAbilityRod("ability1"));
    return character;
}