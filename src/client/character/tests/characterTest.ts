import { getPlayerCharacters } from "../character.js";
import { Character, createCharacter, createPlayerCharacter, ENEMY_FACTION, PLAYER_FACTION } from "../characterModel.js";

export function testCharacter(){
    testGetPlayerCharactersPerformance();
}

function createTestCharacter(id: number, isEnemyFaction: boolean){
    let faction = isEnemyFaction ? ENEMY_FACTION : PLAYER_FACTION;
    return createCharacter(id, 1, 2, 5, "black", 0.5, 1, 1, faction, "randomSpawnFollowingEnemy", true);
}

//time 0.011060000000009312 110.60000000009313
//time 0.0001300000000745058 1.300000000745058, added playerCount parameter, no longer needs to iterate over complete characters
function testGetPlayerCharactersPerformance() {
    let iterations = 10000;
    let numberPlayerCharacter = 3;
    let numberEnemies = 5000;
    let resultCharacters: Character[];

    let characters: Character[] = [];
    for(let i= 0; i<numberPlayerCharacter;i++){
        characters.push(createTestCharacter(i, false));
    }
    for(let i= 0; i<numberEnemies;i++){
        characters.push(createTestCharacter(i+numberPlayerCharacter, true));
    }

    let startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
        resultCharacters = getPlayerCharacters(characters, numberPlayerCharacter);
        if(resultCharacters.length !== numberPlayerCharacter){
            console.log("wrong number of playerCharacters", resultCharacters.length, resultCharacters);
            break;
        }
    }
    let time = performance.now() - startTime;
    console.log("time", time / iterations, time);
}

