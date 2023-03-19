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
            abilitiesOptions[ability.name] = ABILITIES_FUNCTIONS[ability.name].createAbiltiyUpgradeOptions(ability);
        }
        for (let i = 0; i < 3; i++) {
            const abilitiesOptionsCount = Object.keys(abilitiesOptions).length;
            let randomIndex = Math.floor(nextRandom(randomSeed) * (1 + abilitiesOptionsCount));
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
                if (abilityOptions.length === 0) {
                    delete abilitiesOptions[abilityName];
                }
            }
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
        name: "Max Health+50", upgrade: (c: LevelingCharacter) => {
            c.hp += 50;
            c.maxHp += 50;
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
