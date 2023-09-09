import { ABILITIES_FUNCTIONS, Ability, resetAllCharacterAbilities } from "../../ability/ability.js";
import { ABILITY_NAME_FIRE_CIRCLE } from "../../ability/abilityFireCircle.js";
import { ABILITY_NAME_MELEE, createAbilityMelee } from "../../ability/abilityMelee.js";
import { ABILITY_NAME_SHOOT } from "../../ability/abilityShoot.js";
import { ABILITY_NAME_SWORD } from "../../ability/abilitySword.js";
import { tickCharacterDebuffs } from "../../debuff/debuff.js";
import { deepCopy, getNextId } from "../../game.js";
import { IdCounter, Game, Position, FACTION_ENEMY } from "../../gameModel.js";
import { changeTileIdOfMapChunk } from "../../map/map.js";
import { getBossAreaMiddlePosition, getEntranceChunkAndTileIJForPosition } from "../../map/mapEndBossArea.js";
import { determineClosestCharacter, calculateAndSetMoveDirectionToPositionWithPathing, getPlayerCharacters, moveCharacterTick } from "../character.js";
import { CHARACTER_TYPE_FUNCTIONS, Character, IMAGE_SLIME, createCharacter } from "../characterModel.js";
import { PathingCache } from "../pathing.js";
import { CHARACTER_CLASS_SNIPER_NAME } from "../playerCharacters/sniperCharacter.js";
import { TAMER_CHARACTER } from "../playerCharacters/tamer/tamerCharacter.js";

export type EndBossEnemyCharacter = Character;
export const CHARACTER_TYPE_END_BOSS_ENEMY = "EndBossEnemyCharacter";

export function addEndBossType() {
    CHARACTER_TYPE_FUNCTIONS[CHARACTER_TYPE_END_BOSS_ENEMY] = {
        tickFunction: tickEndBossEnemyCharacter,
    }
}

export function createNextDefaultEndBoss(idCounter: IdCounter, game: Game): EndBossEnemyCharacter {
    let bossSize = 60;
    let color = "black";
    let moveSpeed = 1;
    let hp = 50000000;
    let experienceWorth = 0;
    let bossCharacter = createCharacter(getNextId(idCounter), 0, 0, bossSize, bossSize, color, moveSpeed, hp, FACTION_ENEMY, CHARACTER_TYPE_END_BOSS_ENEMY, experienceWorth);
    bossCharacter.paint.image = IMAGE_SLIME;
    let abilities: Ability[] = createEndBossAbilities(1, game);
    bossCharacter.abilities = abilities;
    return bossCharacter;
}

export function startEndBoss(endBossAreaPosition: Position, game: Game) {
    let entrance = getEntranceChunkAndTileIJForPosition(game.state.players[0].character, game.state.map);
    if (entrance) {
        changeTileIdOfMapChunk(entrance.chunkI, entrance.chunkJ, entrance.tileI, entrance.tileJ, 2, game);
        let spawn: Position = getBossAreaMiddlePosition(endBossAreaPosition, game.state.map)!;
        let endBoss: Character;
        if (game.state.bossStuff.nextEndboss === undefined) {
            endBoss = createNextDefaultEndBoss(game.state.idCounter, game);
            game.state.bossStuff.nextEndboss = deepCopy(endBoss);
            console.log("endboss was missing");
        } else {
            endBoss = deepCopy(game.state.bossStuff.nextEndboss);
        }
        endBoss.x = spawn.x;
        endBoss.y = spawn.y;
        if(endBoss.pets){
            for(let pet of endBoss.pets){
                pet.x = spawn.x;
                pet.y = spawn.y;
            }
        }
        if (Math.abs(spawn.x) < 2000 && Math.abs(spawn.y) < 2000 && !endBoss.characterClass) {
            endBoss.hp = 500;
            endBoss.maxHp = 500;
        }
        game.state.bossStuff.bosses.push(endBoss);
        game.state.bossStuff.closedOfEndBossEntrance = entrance;
        game.state.bossStuff.endBossStarted = true;
    } else {
        throw new Error("bossArea entrance not found, should not be able to happen");
    }
}

export function tickEndBossEnemyCharacter(enemy: EndBossEnemyCharacter, game: Game, pathingCache: PathingCache | null) {
    if (enemy.isDead) return;
    let playerCharacters = getPlayerCharacters(game.state.players);
    let closest = determineClosestCharacter(enemy, playerCharacters);

    calculateAndSetMoveDirectionToPositionWithPathing(enemy, closest.minDistanceCharacter, game.state.map, pathingCache, game.state.idCounter, game.state.time);
    moveCharacterTick(enemy, game.state.map, game.state.idCounter);

    for (let ability of enemy.abilities) {
        let abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if(abilityFunctions){
            if (abilityFunctions.tickAbility) abilityFunctions.tickAbility(enemy, ability, game);
            if (abilityFunctions.tickBossAI) abilityFunctions.tickBossAI(enemy, ability, game);
        }
    }
    changeBossAbilityLevelBasedOnHp(enemy);
    tickCharacterDebuffs(enemy, game);
}

export function convertPlayerToEndBoss(game: Game) {
    let nextBoss: Character = deepCopy(game.state.players[0].character);
    if(nextBoss.characterClass !== CHARACTER_CLASS_SNIPER_NAME && nextBoss.characterClass !== TAMER_CHARACTER) return;
    game.state.bossStuff.nextEndboss = nextBoss;
    const boss = game.state.bossStuff.nextEndboss;
    boss.type = CHARACTER_TYPE_END_BOSS_ENEMY;
    boss.maxHp = 50000000;
    boss.hp = boss.maxHp;
    boss.faction = FACTION_ENEMY;
    if(boss.pets){
        for(let pet of boss.pets){
            pet.faction = boss.faction;
        }
    }
    boss.moveSpeed = 1;
    resetAllCharacterAbilities(boss);
    changeBossAbilityLevelBasedOnHp(boss);
}

function changeBossAbilityLevelBasedOnHp(enemy: EndBossEnemyCharacter) {
    const hpLeftPerCent = enemy.hp / enemy.maxHp;
    const abilityLevel = Math.max(Math.floor((1 - hpLeftPerCent) * 10), 1);

    for (let ability of enemy.abilities) {
        let abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions && abilityFunctions.setAbilityToBossLevel) {
            abilityFunctions.setAbilityToBossLevel(ability, abilityLevel);
        }
    }
    if(enemy.pets){
        for(let pet of enemy.pets){
            for (let ability of pet.abilities) {
                let abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
                if (abilityFunctions && abilityFunctions.setAbilityToBossLevel) {
                    abilityFunctions.setAbilityToBossLevel(ability, abilityLevel);
                }
            }           
        }
    }
}

function createEndBossAbilities(level: number, game: Game): Ability[] {
    let abilities: Ability[] = [];
    let abilityKeys: string[] = [
        ABILITY_NAME_MELEE,
        ABILITY_NAME_SHOOT,
        ABILITY_NAME_SWORD,
        ABILITY_NAME_FIRE_CIRCLE,
    ];

    for (let abilityKey of abilityKeys) {
        let abilityFunctions = ABILITIES_FUNCTIONS[abilityKey];
        let ability = abilityFunctions.createAbility(game.state.idCounter);
        setAbilityToEndBossLevel(ability, level);
        if (!abilityFunctions.isPassive) ability.passive = true;
        abilities.push(ability);
    }

    return abilities;
}

function setAbilityToEndBossLevel(ability: Ability, level: number) {
    let abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
    if (abilityFunctions.setAbilityToBossLevel) {
        abilityFunctions.setAbilityToBossLevel(ability, level);
    } else {
        throw new Error("function setAbilityToBossLevel missing for" + ability.name);
    }
}