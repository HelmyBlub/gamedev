import { getPlayerCharacters, moveCharacterTick } from "../character.js";
import { Game, GameState } from "../../gameModel.js";
import { nextRandom, RandomSeed } from "../../randomNumberGenerator.js";
import { Character } from "../characterModel.js";
import { LevelingCharacter, UpgradeOptionLevelingCharacter } from "./levelingCharacterModel.js";
import { ABILITIES_FUNCTIONS, UpgradeOptionAbility } from "../../ability/ability.js";
import { createAbilityLeash } from "../../ability/abilityLeash.js";

export function fillRandomUpgradeOptions(character: LevelingCharacter, randomSeed: RandomSeed) {
    if (character.upgradeOptions.length === 0) {
        let characterOptions = createLevelingCharacterUpgradeOptions();
        let abilitiesOptions: { [key: string]: UpgradeOptionAbility[] } = {};
        for (let ability of character.abilities) {
            abilitiesOptions[ability.name] = ABILITIES_FUNCTIONS[ability.name].createAbiltiyUpgradeOptions();
        }
        for (let i = 0; i < 3; i++) {
            let randomIndex = Math.floor(nextRandom(randomSeed) * (1 + character.abilities.length));
            if (randomIndex === 0 && characterOptions.length === 0) randomIndex++;
            if (randomIndex === 0) {
                randomIndex = Math.floor(nextRandom(randomSeed) * characterOptions.length);
                character.upgradeOptions.push({ name: characterOptions[randomIndex].name });
                characterOptions.splice(randomIndex, 1);
            } else {
                let abilityName = character.abilities[randomIndex - 1].name;
                let abilityOptions = abilitiesOptions[abilityName];
                randomIndex = Math.floor(nextRandom(randomSeed) * abilityOptions.length);
                character.upgradeOptions.push({ name: abilityOptions[randomIndex].name, abilityName: abilityName });
                abilityOptions.splice(randomIndex, 1);
            }
        }
    }
}

export function upgradeLevelingCharacter(character: LevelingCharacter, upgradeOptionIndex: number, randomSeed: RandomSeed) {
    if (character.availableSkillPoints > 0) {
        let upgradeOption = character.upgradeOptions[upgradeOptionIndex];
        if (upgradeOption.abilityName !== undefined) {
            let upgrades = ABILITIES_FUNCTIONS[upgradeOption.abilityName].createAbiltiyUpgradeOptions();
            let ability = character.abilities.find(a => a.name === upgradeOption.abilityName);
            if (ability !== undefined) upgrades.find((e) => e.name === upgradeOption.name)?.upgrade(ability);
        } else {
            let upgrades = createLevelingCharacterUpgradeOptions();
            upgrades.find((e) => e.name === character.upgradeOptions[upgradeOptionIndex].name)?.upgrade(character);
        }
        character.availableSkillPoints--;
        character.upgradeOptions = [];
        if (character.availableSkillPoints > 0) {
            fillRandomUpgradeOptions(character, randomSeed);
        }
    }
}

export function levelingCharacterXpGain(state: GameState, killedCharacter: Character) {
    let playerCharacters: LevelingCharacter[] = getPlayerCharacters(state.players) as LevelingCharacter[];
    for (let i = 0; i < playerCharacters.length; i++) {
        if (playerCharacters[i].experience !== undefined && !playerCharacters[i].isDead && !playerCharacters[i].isPet) {
            playerCharacters[i].experience += killedCharacter.experienceWorth;
            if (playerCharacters[i].experience >= playerCharacters[i].experienceForLevelUp) {
                levelingCharacterLevelUp(playerCharacters[i], state.randomSeed);
            }
        }
    }
}

export function tickLevelingCharacter(character: LevelingCharacter, game: Game) {
    if (character.isDead){ 
        character.isDead = false;
        character.isPet = true;
        character.hp = 100;
        let newPlayerOwnerId: number | undefined = undefined;
        let possibleOwnerCharacters: LevelingCharacter[] = [];
        for(let player of game.state.players){
            let characterIter: LevelingCharacter = player.character as LevelingCharacter;
            if(!characterIter.isPet && !characterIter.isDead){
                possibleOwnerCharacters.push(characterIter);
            }
        }
        if(possibleOwnerCharacters.length > 0){
            let randomOwnerIndex = Math.floor(nextRandom(game.state.randomSeed) * possibleOwnerCharacters.length);
            newPlayerOwnerId = possibleOwnerCharacters[randomOwnerIndex].id;
            character.x = possibleOwnerCharacters[randomOwnerIndex].x;
            character.y = possibleOwnerCharacters[randomOwnerIndex].y;
        }

        character.abilities.push(createAbilityLeash(100, newPlayerOwnerId));
    }
    moveCharacterTick(character, game.state.map, game.state.idCounter, true);
}

function createLevelingCharacterUpgradeOptions(): UpgradeOptionLevelingCharacter[] {
    let upgradeOptions: UpgradeOptionLevelingCharacter[] = [];
    upgradeOptions.push({
        name: "Health+50", upgrade: (c: LevelingCharacter) => {
            c.hp += 50;
        }
    });
    upgradeOptions.push({
        name: "Speed+0.2", upgrade: (c: LevelingCharacter) => {
            c.moveSpeed += 0.2;
        }
    });

    return upgradeOptions;
}

function levelingCharacterLevelUp(character: LevelingCharacter, randomSeed: RandomSeed) {
    character.level++;
    character.availableSkillPoints += 1;
    character.experience -= character.experienceForLevelUp;
    character.experienceForLevelUp += Math.floor(character.level / 2);
    fillRandomUpgradeOptions(character, randomSeed);
}
