import { Character } from "../character/characterModel.js";
import { LevelingCharacter } from "../character/levelingCharacters/levelingCharacterModel.js";
import { Game } from "../gameModel.js";
import { Projectile, createProjectile, tickProjectile, deleteProjectile } from "./projectile.js";
import { RandomSeed, nextRandom } from "../randomNumberGenerator.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, UpgradeOptionAbility } from "./ability.js";

const ABILITY_NAME = "Shoot";
export type AbilityShoot = Ability & {
    baseFrequency: number,
    frequencyIncrease: number,
    damage: number,
    nextShotTime: number,
    pierceCount: number,
    multiShot: number,
    timeToLive: number,
}

export function addShootAbility(){
    ABILITIES_FUNCTIONS[ABILITY_NAME] = {
        tickAbility: tickAbilityShoot,
        createAbiltiyUpgradeOptions: createAbiltiyShootUpgradeOptions,
        tickAbilityObject: tickProjectile,
        deleteAbilityObject: deleteProjectile,
    };
}

export function createAbilityShoot(
    baseFrequency: number = 500,
    frequencyIncrease: number = 1,
    damage: number = 10,
    pierceCount: number = 0,
    multiShot: number = 0,
    timeToLive: number = 1000
): AbilityShoot {
    if(ABILITIES_FUNCTIONS[ABILITY_NAME] === undefined) addShootAbility();
    return {
        name: ABILITY_NAME,
        baseFrequency: baseFrequency,
        frequencyIncrease: frequencyIncrease,
        damage: damage,
        nextShotTime: 0,
        pierceCount: pierceCount,
        multiShot: multiShot,
        timeToLive: timeToLive,
        passive: true,
    };
}

export function tickAbilityShoot(character: Character, ability: Ability, game: Game) {
    let abilityShoot = ability as AbilityShoot;
    while (abilityShoot.nextShotTime <= game.state.time) {
        shoot(character, abilityShoot, game.state.abilityObjects, game.state.time, game.state.randomSeed);
        abilityShoot.nextShotTime += abilityShoot.baseFrequency / abilityShoot.frequencyIncrease;
    }
}

function createAbiltiyShootUpgradeOptions(): UpgradeOptionAbility[]{
    let upgradeOptions: UpgradeOptionAbility[] = [];
    upgradeOptions.push({
        name: "Damage+10", upgrade: (a: Ability) => {
            let as = a as AbilityShoot;
            as.damage += 10;
        },
    });
    upgradeOptions.push({
        name: "shootSpeed Up", upgrade: (a: Ability) => {
            let as = a as AbilityShoot;
            as.frequencyIncrease += 0.2;
        }
    });
    upgradeOptions.push({
        name: "Piercing+1", upgrade: (a: Ability) => {
            let as = a as AbilityShoot;
            as.pierceCount += 1;
        }
    });
    upgradeOptions.push({
        name: "MultiShot+1", upgrade: (a: Ability) => {
            let as = a as AbilityShoot;
            as.multiShot += 1;
        }
    });

    return upgradeOptions;
}

function shoot(character: Character, ability: AbilityShoot, abilityObjects: AbilityObject[], gameTime: number, randomSeed: RandomSeed) {
    for (let i = 0; i <= ability.multiShot; i++) {
        let shotSpread: number = (nextRandom(randomSeed) - 0.5) / 10 * ability.multiShot;
        abilityObjects.push(createProjectile(
            character.x,
            character.y,
            character.moveDirection + shotSpread,
            ability.damage,
            character.faction,
            character.moveSpeed + 2,
            gameTime,
            ability.pierceCount,
            ability.timeToLive,
            ABILITY_NAME,
        ));
    }
}
