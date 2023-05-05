import { getNextId } from "../../game.js";
import { Game, GameState, IdCounter } from "../../gameModel.js";
import { GAME_IMAGES } from "../../imageLoad.js";
import { Player } from "../../player.js";
import { createRandomizedCharacterImageData } from "../../randomizedCharacterImage.js";
import { RandomSeed } from "../../randomNumberGenerator.js";
import { fillRandomUpgradeOptions, getPlayerCharacters, moveCharacterTick, turnCharacterToPet } from "../character.js";
import { Character, CHARACTER_TYPE_FUNCTIONS, createCharacter } from "../characterModel.js";

export type AbilityLevelingCharacter = Character & {
}

export const ABILITY_LEVELING_CHARACTER = "abilityLevelingCharacter";

export function createAbilityLevelingCharacter(
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
    seed: RandomSeed
): AbilityLevelingCharacter {
    let character = createCharacter(getNextId(idCounter), x, y, width, height, color, moveSpeed, hp, damage, faction, ABILITY_LEVELING_CHARACTER, 1);
    return {
        ...character,
        randomizedCharacterImage: createRandomizedCharacterImageData(GAME_IMAGES["player"], seed),
    };
}

export function addAbilityLevelingCharacter(){
    CHARACTER_TYPE_FUNCTIONS[ABILITY_LEVELING_CHARACTER] = {
        tickFunction: tickAbilityLevelingCharacter,
    }
}

export function abilityLevelingCharacterAddBossSkillPoint(state: GameState) {
    let playerCharacters: Character[] = getPlayerCharacters(state.players);
    for (let character of playerCharacters) {
        if (character.type === ABILITY_LEVELING_CHARACTER && !character.isDead && !character.isPet) {
            character.maxHp += 100;
            character.hp += 100;
            const abilityLevelingCharacter = character as AbilityLevelingCharacter;
            for(let ability of abilityLevelingCharacter.abilities){
                if(ability.leveling) {
                    ability.leveling.bossSkillPoints++;
                    if(character.upgradeOptions.length === 0){
                        fillRandomUpgradeOptions(character, state.randomSeed, true);
                    }
                }
            }
        }
    }
}

function tickAbilityLevelingCharacter(character: AbilityLevelingCharacter, game: Game) {
    if (character.isDead) {
        if(!character.willTurnToPetOnDeath) return;
        turnCharacterToPet(character, game);
    }
    moveCharacterTick(character, game.state.map, game.state.idCounter, true);
}