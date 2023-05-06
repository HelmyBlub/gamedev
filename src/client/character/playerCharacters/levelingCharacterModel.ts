import { getNextId } from "../../game.js";
import { Game, IdCounter } from "../../gameModel.js";
import { GAME_IMAGES } from "../../imageLoad.js";
import { createRandomizedCharacterImageData } from "../../randomizedCharacterImage.js";
import { RandomSeed } from "../../randomNumberGenerator.js";
import { Character, CHARACTER_TYPE_FUNCTIONS, createCharacter } from "../characterModel.js";
import { tickLevelingCharacter } from "./levelingCharacter.js";

export type LevelingCharacter = Character & {
    experience: number,
    experienceForLevelUp: number,
    level: number,
    availableSkillPoints: number,
}

export const LEVELING_CHARACTER = "levelingCharacter";

export function changeToLevelingCharacter(character: Character, game: Game): LevelingCharacter {
    const levelingCharacter = {
        ...character,
        type: LEVELING_CHARACTER,
        experience: 0,
        experienceForLevelUp: 10,
        level: 0,
        availableSkillPoints: 0,
    };
    
    let players = game.state.players;
    for(let player of players){
        if(player.character === character){
            player.character = levelingCharacter;
            levelingCharacter.upgradeOptions = [];
            break;
        } 
    }
    return levelingCharacter;
}

export function addLevelingCharacter(){
    CHARACTER_TYPE_FUNCTIONS[LEVELING_CHARACTER] = {
        tickFunction: tickLevelingCharacter
    }
}