import { ABILITIES_FUNCTIONS, addAbilityToCharacter, createAbility } from "../../ability/ability.js";
import { createAbilityHpRegen } from "../../ability/abilityHpRegen.js";
import { ABILITY_NAME_MOVEMENTSPEED, createAbilityMovementSpeed } from "../../ability/abilityMovementSpeed.js";
import { ABILITY_NAME_SNIPE, createAbilitySnipe } from "../../ability/snipe/abilitySnipe.js";
import { IdCounter, PLAYER_CHARACTER_CLASSES } from "../../gameModel.js";
import { RandomSeed } from "../../randomNumberGenerator.js";
import { AbilityLevelingCharacter, createAbilityLevelingCharacter } from "./abilityLevelingCharacter.js";

export function addSniperClass() {
    PLAYER_CHARACTER_CLASSES["Sniper"] = {
        createPlayerCharacter: createSniperCharacter
    }
}

function createSniperCharacter(
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
): AbilityLevelingCharacter {
    const character = createAbilityLevelingCharacter(idCounter, x, y, width, height, color, moveSpeed, hp, faction, seed);
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_SNIPE, idCounter, true, true, "ability1"));
    addAbilityToCharacter(character, createAbilityHpRegen(idCounter));
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_MOVEMENTSPEED, idCounter, true, true, "ability2"));
    return character;
}
