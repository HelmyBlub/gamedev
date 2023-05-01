import { addAbilityToCharacter } from "../../ability/ability.js";
import { createAbilityHpRegen } from "../../ability/abilityHpRegen.js";
import { createAbilitySnipe } from "../../ability/snipe/abilitySnipe.js";
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
    damage: number,
    faction: string,
    seed: RandomSeed,
): AbilityLevelingCharacter {
    let character = createAbilityLevelingCharacter(idCounter, x, y, width, height, color, moveSpeed, hp, damage, faction, seed);
    let snipe = createAbilitySnipe(idCounter, "ability1");
    snipe.leveling = {experience: 0, experienceForLevelUp: 10, level: 1, bossSkillPoints: 0};
    addAbilityToCharacter(character, snipe);
    addAbilityToCharacter(character, createAbilityHpRegen(idCounter));
    return character;
}