import { Character, createCharacter, ENEMY_FACTION, PLAYER_FACTION } from "./character/characterModel.js";
import { detectProjectileToCharacterHit } from "./game.js";
import { addEnemyToMap, createMap, GameMap } from "./map/map.js";
import { createProjectile, Projectile } from "./projectile.js";
import { nextRandom, RandomSeed } from "./randomNumberGenerator.js";

export function testGame() {
    testDetectProjectileToCharacterHitPerformance();
}


function createTestCharacter(id: number, x: number, y: number) {
    return createCharacter(id, x, y, 5, "black", 0.5, 1, 1, ENEMY_FACTION, "randomSpawnFollowingEnemy", true);
}

function createTestProjectiles(x: number, y: number, pierceCount: number = 10, timeToLive: number = 1000) {
    return createProjectile(x, y, 0, 2, PLAYER_FACTION, 2, 0, pierceCount, timeToLive);
}


// time 4520 4520, firefox
function testDetectProjectileToCharacterHitPerformance() {
    let iterations = 1;
    let numberEnemies = 1000000;
    let numberProjectiles = 100;
    let projectiles: Projectile[] = [];
    let enemies: Character[] = [];
    let map: GameMap = createMap();
    let randomSeed: RandomSeed = { seed: 0 };
    for (let i = 0; i < numberEnemies; i++) {
        addEnemyToMap(map, createTestCharacter(i, nextRandom(randomSeed) * 10000, nextRandom(randomSeed) * 10000));
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
