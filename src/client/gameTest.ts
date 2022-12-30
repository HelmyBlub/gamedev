import { createCharacter, ENEMY_FACTION, PLAYER_FACTION } from "./character/characterModel.js";
import { handleCommand } from "./commands.js";
import { detectProjectileToCharacterHit, gameRestart } from "./game.js";
import { Game } from "./gameModel.js";
import { addEnemyToMap, createMap, GameMap } from "./map/map.js";
import { createNewChunkTiles } from "./map/mapGeneration.js";
import { createProjectile, Projectile } from "./projectile.js";
import { nextRandom, RandomSeed } from "./randomNumberGenerator.js";
import { testInputs } from "./testInputs.js";

export function testGame(game: Game) {
    realTest(game);
}

//---------------------//
// time: 8182.5999999996275, frameSkipAmount: 10
// time: 9342.299999999814 , frameSkipAmount: 0
function realTest(game: Game){
    game.testing = {
        startTime: performance.now(),
        frameSkipAmount: 0,
        testingActive: true,
        zeroTimeout: true
    };
    gameRestart(game);
    for(const input of testInputs){
        handleCommand(game, input);
    }
}







//---------------------//

function createTestCharacter(id: number, x: number, y: number) {
    return createCharacter(id, x, y, 5, "black", 0.5, 1000, 1, ENEMY_FACTION, "randomSpawnFollowingEnemy", true);
}

function createTestProjectiles(x: number, y: number, pierceCount: number = 10, timeToLive: number = 1000) {
    return createProjectile(x, y, 0, 2, PLAYER_FACTION, 2, 0, pierceCount, timeToLive);
}


// time 4520 4520, firefox, only 1 iteration
// time 2.566000000005588 256.6000000005588, firefox, 100 iterations, 
function testDetectProjectileToCharacterHitPerformance() {
    let iterations = 100;
    let numberEnemies = 1000000;
    let numberProjectiles = 100;
    let projectiles: Projectile[] = [];
    let map: GameMap = createMap();
    let randomSeed: RandomSeed = { seed: 0 };
    for (let i = 0; i < numberEnemies; i++) {
        let posX = nextRandom(randomSeed) * 10000;
        let posY = nextRandom(randomSeed) * 10000;
        createNewChunk(map, Math.floor(posY/(map.tileSize*map.chunkLength)), Math.floor(posX/(map.tileSize*map.chunkLength)));
        addEnemyToMap(map, createTestCharacter(i, posX, posY));
    }
    for (let i = 0; i < numberProjectiles; i++) {
        projectiles.push(createTestProjectiles(nextRandom(randomSeed) * 200, nextRandom(randomSeed) * 200));
    }

    let startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
        detectProjectileToCharacterHit(map, projectiles);
    }
    let time = performance.now() - startTime;
    console.log("time", time / iterations, time);
}

function createNewChunk(map: GameMap, chunkI: number, chunkJ: number){
    let key = `${chunkI}_${chunkJ}`;
    if(map.chunks[key] !== undefined) return;
    let newChunk = { tiles:createNewChunkTiles(map.chunkLength, chunkI, chunkJ, map.seed!), characters: []};
    map.chunks[key] = newChunk;
}