import { Character } from "./character/characterModel.js"
import { Game } from "./gameModel.js"

export type Combatlog = {
    log: CombatlogEntry[],
    maxLogEntries: number,
}

export type CombatlogEntry = {
    message: string,
    timestamp: number,
}

export function createDefaultCombatLog(): Combatlog{
    return {
        log: [],
        maxLogEntries: 30,
    }
}

export function addCombatlogDamageTakenEntry(character: Character, damage: number, abilityName: string, game: Game){
    if(!character.combatlog) return;
    const combatlog = character.combatlog;
    const logMessage = `${abilityName} ${damage}, hp: ${character.hp}`;
    combatlog.log.push({
         message: logMessage,
         timestamp: game.state.time,
    });
    if(combatlog.log.length > combatlog.maxLogEntries){
        combatlog.log.shift();
    }
}

export function consoleLogCombatlog(combatlog: Combatlog){
    for(let entry of combatlog.log){
        console.log(`${entry.timestamp}: ${entry.message}`);
    }
}