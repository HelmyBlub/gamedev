import { getPlayerCharacters } from "../character.js";
import { Game, GameState, UpgradeOptions } from "../../gameModel.js";
import { nextRandom, RandomSeed } from "../../randomNumberGenerator.js";
import { Character } from "../characterModel.js";
import { LevelingCharacter, UpgradeOption } from "./levelingCharacterModel.js";
import { createShooterUpgradeOptions, tickShooterCharacter, upgradeShooterCharacter } from "./shooterCharacterClass.js";

export function fillRandomUpgradeOptions(character: LevelingCharacter, randomSeed: RandomSeed, upgradeOptions: UpgradeOptions) {
    if (character.upgradeOptions.length === 0) {
        let setOfUsedUpgrades = new Set<number>();
        let upgradeOptionsShooter = upgradeOptions["Shooter"];
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

export function createDefaultUpgradeOptions(): UpgradeOptions{
    let allUpgradeOptions: UpgradeOptions = {};
    allUpgradeOptions["Shooter"] = createShooterUpgradeOptions();
    return allUpgradeOptions;
}

export function upgradeLevelingCharacter(character: LevelingCharacter, upgradeOptionIndex: number, upgradeOptions: UpgradeOptions, randomSeed: RandomSeed) {
    if(character.characterClass === "Shooter"){
        upgradeShooterCharacter(character, upgradeOptionIndex, upgradeOptions, randomSeed);
    }
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
    if(character.isDead) return;
    if(character.characterClass === "Shooter"){
        tickShooterCharacter(character, game);
    }
}

function levelingCharacterLevelUp(character: LevelingCharacter, randomSeed: RandomSeed, upgradeOptions: UpgradeOptions) {
    character.level++;
    character.availableSkillPoints += 1;
    character.experience -= character.experienceForLevelUp;
    character.experienceForLevelUp += 1;
    fillRandomUpgradeOptions(character, randomSeed, upgradeOptions);
}
