import { addAbilityToCharacter } from "../../ability/ability.js";
import { createAbilityShoot } from "../../ability/abilityShoot.js";
import { IdCounter, PLAYER_CHARACTER_CLASSES } from "../../gameModel.js";
import { RandomSeed } from "../../randomNumberGenerator.js";
import { createLevelingCharacter, LevelingCharacter } from "./levelingCharacterModel.js";

export function addShooterClass() {
    PLAYER_CHARACTER_CLASSES["Shooter"] = {
        createPlayerCharacter: createShooterCharacter,
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
    addAbilityToCharacter(character, createAbilityShoot(idCounter));
    return character;
}