import { getPlayerCharacters } from "../character.js";
import { Game, GameState, LEVELING_CHARACTER_CLASSES, UpgradeOptions } from "../../gameModel.js";
import { nextRandom, RandomSeed } from "../../randomNumberGenerator.js";
import { Character } from "../characterModel.js";
import { LevelingCharacter } from "./levelingCharacterModel.js";

export function fillRandomUpgradeOptions(character: LevelingCharacter, randomSeed: RandomSeed, upgradeOptions: UpgradeOptions) {
    LEVELING_CHARACTER_CLASSES[character.characterClass].fillRandomUpgradeOptions(character, randomSeed, upgradeOptions);
}

export function createDefaultUpgradeOptions(): UpgradeOptions {
    let allUpgradeOptions: UpgradeOptions = {};
    let keys = Object.keys(LEVELING_CHARACTER_CLASSES);

    for(let key of keys){
        allUpgradeOptions[key] = LEVELING_CHARACTER_CLASSES[key].createDefaultUpgradeOptions();
    }
    return allUpgradeOptions;
}

export function upgradeLevelingCharacter(character: LevelingCharacter, upgradeOptionIndex: number, upgradeOptions: UpgradeOptions, randomSeed: RandomSeed) {
    LEVELING_CHARACTER_CLASSES[character.characterClass].upgradeLevelingCharacter(character, upgradeOptionIndex, upgradeOptions, randomSeed);
}

export function levelingCharacterXpGain(state: GameState, killedCharacter: Character, upgradeOptions: UpgradeOptions) {
    let playerCharacters: LevelingCharacter[] = getPlayerCharacters(state.players) as LevelingCharacter[];
    for (let i = 0; i < playerCharacters.length; i++) {
        if (playerCharacters[i].experience !== undefined) {
            playerCharacters[i].experience += killedCharacter.experienceWorth;
            if (playerCharacters[i].experience >= playerCharacters[i].experienceForLevelUp) {
                levelingCharacterLevelUp(playerCharacters[i], state.randomSeed, upgradeOptions);
            }
        }
    }
}

export function tickPlayerCharacter(character: LevelingCharacter, game: Game) {
    if (character.isDead) return;
    LEVELING_CHARACTER_CLASSES[character.characterClass].tickPlayerCharacter(character, game);
}

export function upgradeCharacter(character: LevelingCharacter, upgradeOptionIndex: number, upgradeOptions: UpgradeOptions, randomSeed: RandomSeed) {
    if (character.availableSkillPoints > 0) {
        let upgradeOptionsShooter = upgradeOptions[character.characterClass];
        upgradeOptionsShooter.get(character.upgradeOptions[upgradeOptionIndex].name)?.upgrade(character);
        character.availableSkillPoints--;
        character.upgradeOptions = [];
        if (character.availableSkillPoints > 0) {
            fillRandomUpgradeOptions(character, randomSeed, upgradeOptions);
        }
    }
}

export function defaultFillRandomUpgradeOptions(character: LevelingCharacter, randomSeed: RandomSeed, upgradeOptions: UpgradeOptions) {
    if (character.upgradeOptions.length === 0) {
        let setOfUsedUpgrades = new Set<number>();
        let upgradeOptionsShooter = upgradeOptions[character.characterClass];
        for (let i = 0; i < 3; i++) {
            let randomOption = Math.floor(nextRandom(randomSeed) * upgradeOptionsShooter.size);
            while (setOfUsedUpgrades.has(randomOption) && upgradeOptionsShooter.size > setOfUsedUpgrades.size) {
                randomOption = Math.floor(nextRandom(randomSeed) * upgradeOptionsShooter.size);
            }
            setOfUsedUpgrades.add(randomOption);
            character.upgradeOptions.push({ name: Array.from(upgradeOptionsShooter.keys())[randomOption] });
        }
    }
}
function levelingCharacterLevelUp(character: LevelingCharacter, randomSeed: RandomSeed, upgradeOptions: UpgradeOptions) {
    character.level++;
    character.availableSkillPoints += 1;
    character.experience -= character.experienceForLevelUp;
    character.experienceForLevelUp += Math.floor(character.level/2);
    fillRandomUpgradeOptions(character, randomSeed, upgradeOptions);
}
