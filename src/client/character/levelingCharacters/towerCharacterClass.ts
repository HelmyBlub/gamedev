import { addAbilityToCharacter } from "../../ability/ability.js";
import { createAbilityHpRegen } from "../../ability/abilityHpRegen.js";
import { createAbilityTower } from "../../ability/abilityTower.js";
import { IdCounter, LEVELING_CHARACTER_CLASSES } from "../../gameModel.js";
import { RandomSeed } from "../../randomNumberGenerator.js";
import { createLevelingCharacter, LevelingCharacter } from "./levelingCharacterModel.js";

export function addTowerClass() {
    LEVELING_CHARACTER_CLASSES["Tower"] = {
        createLevelingCharacter: createTowerCharacter
    }
}

function createTowerCharacter(
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
    addAbilityToCharacter(character, createAbilityTower("ability1"));
    addAbilityToCharacter(character, createAbilityHpRegen());
    return character;
}