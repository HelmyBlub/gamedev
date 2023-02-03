import { createAbilityShoot } from "../../ability/abilityShoot.js";
import { IdCounter, LEVELING_CHARACTER_CLASSES } from "../../gameModel.js";
import { RandomSeed } from "../../randomNumberGenerator.js";
import { createLevelingCharacter, LevelingCharacter } from "./levelingCharacterModel.js";

export function addShooterClass(){
    LEVELING_CHARACTER_CLASSES["Shooter"] = {
        createLevelingCharacter: createShooterCharacter,
    }   
}

function createShooterCharacter(
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
    character.abilities.push(createAbilityShoot());
    return character;
}