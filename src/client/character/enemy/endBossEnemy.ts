import { ABILITIES_FUNCTIONS, Ability } from "../../ability/ability.js";
import { ABILITY_NAME_FIRE_CIRCLE } from "../../ability/abilityFireCircle.js";
import { ABILITY_NAME_MELEE, createAbilityMelee } from "../../ability/abilityMelee.js";
import { ABILITY_NAME_SHOOT } from "../../ability/abilityShoot.js";
import { ABILITY_NAME_SWORD } from "../../ability/abilitySword.js";
import { tickCharacterDebuffs } from "../../debuff/debuff.js";
import { getNextId } from "../../game.js";
import { IdCounter, Game, Position } from "../../gameModel.js";
import { getBossAreaMiddlePosition } from "../../map/mapEndBossArea.js";
import { determineClosestCharacter, calculateAndSetMoveDirectionToPositionWithPathing, getPlayerCharacters, moveCharacterTick } from "../character.js";
import { Character, createCharacter } from "../characterModel.js";
import { PathingCache } from "../pathing.js";

export type EndBossEnemyCharacter = Character;
export const CHARACTER_TYPE_END_BOSS_ENEMY = "EndBossEnemyCharacter";

export function createEndBossWithLevel(endBossAreaPosition: Position, idCounter: IdCounter, level: number, game: Game): EndBossEnemyCharacter {
    let bossSize = 60;
    let color = "black";
    let moveSpeed = 1;
    let hp = 50000000;
    let experienceWorth = Math.pow(level, 2) * 1000;
    let spawn: Position = getBossAreaMiddlePosition(endBossAreaPosition, game.state.map)!;

    let bossCharacter = createCharacter(getNextId(idCounter), spawn.x, spawn.y, bossSize, bossSize, color, moveSpeed, hp, "enemy", CHARACTER_TYPE_END_BOSS_ENEMY, experienceWorth);
    let abilities: Ability[] = createEndBossAbilities(1, game);
    bossCharacter.abilities = abilities;
    return bossCharacter;
}

export function tickEndBossEnemyCharacter(enemy: EndBossEnemyCharacter, game: Game, pathingCache: PathingCache) {
    if (enemy.isDead) return;
    let playerCharacters = getPlayerCharacters(game.state.players);
    let closest = determineClosestCharacter(enemy, playerCharacters);

    calculateAndSetMoveDirectionToPositionWithPathing(enemy, closest.minDistanceCharacter, game.state.map, pathingCache, game.state.idCounter, game.state.time);
    moveCharacterTick(enemy, game.state.map, game.state.idCounter);

    for (let ability of enemy.abilities) {
        let tickAbility = ABILITIES_FUNCTIONS[ability.name].tickAbility;
        if (tickAbility) tickAbility(enemy, ability, game);
    }
    changeBossAbilityLevelBasedOnHp(enemy);
    tickCharacterDebuffs(enemy, game);
}

function changeBossAbilityLevelBasedOnHp(enemy: EndBossEnemyCharacter){
    const hpLeftPerCent = enemy.hp / enemy.maxHp;
    const abilityLevel = Math.max(Math.floor((1 - hpLeftPerCent) * 10), 1);

    for(let ability of enemy.abilities){
        let abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if(abilityFunctions && abilityFunctions.setAbilityToBossLevel){
            abilityFunctions.setAbilityToBossLevel(ability, abilityLevel);
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

    for(let abilityKey of abilityKeys){
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