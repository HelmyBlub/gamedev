import { getPlayerCharacters, moveCharacterTick } from "../character.js";
import { Game, GameState } from "../../gameModel.js";
import { nextRandom, RandomSeed } from "../../randomNumberGenerator.js";
import { Character } from "../characterModel.js";
import { LevelingCharacter, UpgradeOptionLevelingCharacter } from "./levelingCharacterModel.js";
import { ABILITIES_FUNCTIONS, UpgradeOptionAbility } from "../../ability/ability.js";
import { createAbilityLeash } from "../../ability/abilityLeash.js";
import { checkForAutoSkill } from "../../game.js";

export function fillRandomUpgradeOptions(character: LevelingCharacter, randomSeed: RandomSeed) {
    if (character.upgradeOptions.length === 0) {
        let characterOptions = createLevelingCharacterUpgradeOptions();
        let characterOptionProbability = 0;
        for(let characterOption of characterOptions){
            characterOptionProbability += characterOption.probabilityFactor;
        }
        let abilitiesOptions: { [key: string]: {options: UpgradeOptionAbility[], probability:number }} = {};
        for (let ability of character.abilities) {
            let options = ABILITIES_FUNCTIONS[ability.name].createAbiltiyUpgradeOptions(ability);
            let abilityOptionProbability = 0;
            for(let abilityOption of options){
                abilityOptionProbability += abilityOption.probabilityFactor;
            }
            abilitiesOptions[ability.name] = {options, probability:abilityOptionProbability};
        }
        for (let i = 0; i < 3; i++) {
            const abilitiesOptionsKeys = Object.keys(abilitiesOptions);
            let totablPropability = characterOptionProbability;
            for(let key of abilitiesOptionsKeys){
                totablPropability += abilitiesOptions[key].probability;
            }
            let randomProbability = nextRandom(randomSeed) * (totablPropability);
            if (randomProbability < characterOptionProbability) {
                let characterOptionIndex = 0;
                for(characterOptionIndex = 0; characterOptionIndex < characterOptions.length; characterOptionIndex++){
                    randomProbability -= characterOptions[characterOptionIndex].probabilityFactor;
                    if(randomProbability < 0) {
                        break;
                    };
                }
                if(randomProbability >= 0) throw new Error("getting random upgrade option with probabilities failed. Probability not fitting to character options");
                character.upgradeOptions.push({ name: characterOptions[characterOptionIndex].name });
                characterOptionProbability -= characterOptions[characterOptionIndex].probabilityFactor;
                characterOptions.splice(characterOptionIndex, 1);
            } else {
                randomProbability -= characterOptionProbability;
                let abilityName = "";
                for(let abilityKeyIndex = 0; abilityKeyIndex < abilitiesOptionsKeys.length; abilityKeyIndex++){
                    if(randomProbability < abilitiesOptions[abilitiesOptionsKeys[abilityKeyIndex]].probability) {
                        abilityName = abilitiesOptionsKeys[abilityKeyIndex];
                        break;
                    };
                    randomProbability -= abilitiesOptions[abilitiesOptionsKeys[abilityKeyIndex]].probability;                    
                }
                let abilityOptions = abilitiesOptions[abilityName];

                for(let abilityOptionIndex = 0; abilityOptionIndex < abilityOptions.options.length; abilityOptionIndex++){
                    randomProbability -= abilityOptions.options[abilityOptionIndex].probabilityFactor;
                    if(randomProbability < 0){
                        character.upgradeOptions.push({ name: abilityOptions.options[abilityOptionIndex].name, abilityName: abilityName });
                        abilityOptions.probability -= abilityOptions.options[abilityOptionIndex].probabilityFactor;
                        abilityOptions.options.splice(abilityOptionIndex, 1);
                        if (abilityOptions.options.length === 0) {
                            delete abilitiesOptions[abilityName];
                        }
                        break;
                    }
                }
            }
            if(randomProbability >= 0) throw new Error("getting random upgrade option with probabilities failed. Random value to high?");
        }
    }
}

export function upgradeLevelingCharacter(character: LevelingCharacter, upgradeOptionIndex: number, randomSeed: RandomSeed) {
    if (character.availableSkillPoints > 0) {
        let upgradeOption = character.upgradeOptions[upgradeOptionIndex];
        if (upgradeOption.abilityName !== undefined) {
            let ability = character.abilities.find(a => a.name === upgradeOption.abilityName);
            if (ability !== undefined){
                let upgrades = ABILITIES_FUNCTIONS[upgradeOption.abilityName].createAbiltiyUpgradeOptions(ability);
                upgrades.find((e) => e.name === upgradeOption.name)?.upgrade(ability);
            }
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
            while (playerCharacters[i].experience >= playerCharacters[i].experienceForLevelUp) {
                levelingCharacterLevelUp(playerCharacters[i], state.randomSeed);
            }
        }
    }
}

export function paintLevelingCharacterStatsUI(ctx: CanvasRenderingContext2D, character: LevelingCharacter, drawStartX: number, drawStartY: number, game: Game): { width: number, height: number } {
    const width = 200;
    const height = 200;
    const fontSize = 14;

    ctx.fillStyle = "white";
    ctx.fillRect(drawStartX, drawStartY, width, height);
    ctx.font = fontSize + "px Arial";
    ctx.fillStyle = "black";
    let textLineCounter = 1;
    ctx.fillText("Character Stats:", drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
    ctx.fillText(`HP: ${character.hp.toFixed(0)}/${character.maxHp.toFixed(0)}`, drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
    ctx.fillText("Movement Speed:" + character.moveSpeed.toFixed(2), drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);

    return { width, height };
}


export function tickLevelingCharacter(character: LevelingCharacter, game: Game) {
    if (character.isDead) {
        character.isDead = false;
        character.hp = character.maxHp;
        if (character.isPet) {
            console.log("character already a pet, should not happen");
            debugger;
        } else {
            character.isPet = true;
            let newPlayerOwnerId: number | undefined = undefined;
            let possibleOwnerCharacters: LevelingCharacter[] = [];
            for (let player of game.state.players) {
                let characterIter: LevelingCharacter = player.character as LevelingCharacter;
                if (!characterIter.isPet && !characterIter.isDead) {
                    possibleOwnerCharacters.push(characterIter);
                }
            }
            if (possibleOwnerCharacters.length > 0) {
                let randomOwnerIndex = Math.floor(nextRandom(game.state.randomSeed) * possibleOwnerCharacters.length);
                newPlayerOwnerId = possibleOwnerCharacters[randomOwnerIndex].id;
                character.x = possibleOwnerCharacters[randomOwnerIndex].x;
                character.y = possibleOwnerCharacters[randomOwnerIndex].y;
            }

            character.abilities.push(createAbilityLeash(100, newPlayerOwnerId));
        }
    }
    moveCharacterTick(character, game.state.map, game.state.idCounter, true);
}

function createLevelingCharacterUpgradeOptions(): UpgradeOptionLevelingCharacter[] {
    let upgradeOptions: UpgradeOptionLevelingCharacter[] = [];
    upgradeOptions.push({
        name: "Max Health+50", probabilityFactor: 1, upgrade: (c: LevelingCharacter) => {
            c.hp += 50;
            c.maxHp += 50;
        }
    });
    upgradeOptions.push({
        name: "Move Speed+0.2", probabilityFactor: 1, upgrade: (c: LevelingCharacter) => {
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
