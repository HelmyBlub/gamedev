import { Game, IdCounter, LEVELING_CHARACTER_CLASSES, UpgradeOptions } from "../../gameModel.js";
import { Projectile, createProjectile } from "../../projectile.js";
import { RandomSeed, nextRandom } from "../../randomNumberGenerator.js";
import { moveCharacterTick } from "../character.js";
import { createLevelingCharacter, LevelingCharacter, UpgradeOption } from "./levelingCharacterModel.js";

const SHOOTERCLASS = "Shooter";
export function addShooterClass(){
    LEVELING_CHARACTER_CLASSES[SHOOTERCLASS] = {
        fillRandomUpgradeOptions: fillRandomShooterUpgradeOptions,
        createDefaultUpgradeOptions: createShooterUpgradeOptions,
        upgradeLevelingCharacter: upgradeShooterCharacter,
        tickPlayerCharacter: tickShooterCharacter,
        createLevelingCharacter: createShooterCharacter,
    }   
}

export type ShooterCharacterClass = {
    baseFrequency: number,
    frequencyIncrease: number,
    nextShotTime: number,
    pierceCount: number,
    multiShot: number,
    timeToLive: number,
}

export function createShooterCharacter(
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
    seed: RandomSeed,
): LevelingCharacter {
    let characterClass = SHOOTERCLASS;
    let characterClassProperties: ShooterCharacterClass = {
        baseFrequency: 500,
        frequencyIncrease: 1,
        nextShotTime: 0,
        pierceCount: 0,
        multiShot: 0,
        timeToLive: 1000,
    };

    let character = createLevelingCharacter(idCounter, x, y, width, height, color, moveSpeed, hp, damage, faction, seed, characterClass, characterClassProperties);
    return character;
}

export function tickShooterCharacter(character: LevelingCharacter, game: Game) {
    if(character.isDead) return;
    let properties: ShooterCharacterClass = character.characterClassProperties;

    while (properties.nextShotTime <= game.state.time) {
        shoot(character, game.state.projectiles, game.state.time, game.state.randomSeed);
        properties.nextShotTime += properties.baseFrequency / properties.frequencyIncrease;
    }
    moveCharacterTick(character, game.state.map, game.state.idCounter, true);
}

export function createShooterUpgradeOptions(): Map<string, UpgradeOption>{
    let upgradeOptions = new Map<string, UpgradeOption>();
    upgradeOptions.set("Health+50", {
        name: "Health+50", upgrade: (c: LevelingCharacter) => {
            c.hp += 50;
        }
    });
    upgradeOptions.set("Speed+0.2", {
        name: "Speed+0.2", upgrade: (c: LevelingCharacter) => {
            c.moveSpeed += 0.2;
        }
    });
    upgradeOptions.set("Damage+10", {
        name: "Damage+10", upgrade: (c: LevelingCharacter) => {
            c.damage += 10;
        }
    });
    upgradeOptions.set("ShootSpeed+20%", {
        name: "hootSpeed Up", upgrade: (c: LevelingCharacter) => {
            let properties: ShooterCharacterClass =  c.characterClassProperties;
            properties.frequencyIncrease += 0.2;
        }
    });
    upgradeOptions.set("Pierce+1", {
        name: "Piercing+1", upgrade: (c: LevelingCharacter) => {
            let properties: ShooterCharacterClass =  c.characterClassProperties;
            properties.pierceCount += 1;
        }
    });
    upgradeOptions.set("MultiShot+1", {
        name: "MultiShot+1", upgrade: (c: LevelingCharacter) => {
            let properties: ShooterCharacterClass =  c.characterClassProperties;
            properties.multiShot += 1;
        }
    });

    return upgradeOptions;
}

export function upgradeShooterCharacter(character: LevelingCharacter, upgradeOptionIndex: number, upgradeOptions: UpgradeOptions, randomSeed: RandomSeed) {
    if (character.availableSkillPoints > 0) {
        let upgradeOptionsShooter = upgradeOptions[SHOOTERCLASS];
        upgradeOptionsShooter.get(character.upgradeOptions[upgradeOptionIndex].name)?.upgrade(character);
        character.availableSkillPoints--;
        character.upgradeOptions = [];
        if (character.availableSkillPoints > 0) {
            fillRandomShooterUpgradeOptions(character, randomSeed, upgradeOptions);
        }
    }
}

export function fillRandomShooterUpgradeOptions(character: LevelingCharacter, randomSeed: RandomSeed, upgradeOptions: UpgradeOptions) {
    if (character.upgradeOptions.length === 0) {
        let setOfUsedUpgrades = new Set<number>();
        let upgradeOptionsShooter = upgradeOptions[SHOOTERCLASS];
        for (let i = 0; i < 3; i++) {
            let randomOption = Math.floor(nextRandom(randomSeed) * upgradeOptionsShooter.size);
            while (setOfUsedUpgrades.has(randomOption) && upgradeOptionsShooter.size > setOfUsedUpgrades.size) {
                randomOption = Math.floor(nextRandom(randomSeed) * upgradeOptionsShooter.size);
            }
            setOfUsedUpgrades.add(randomOption);
            character.upgradeOptions.push({ name: Array.from(upgradeOptionsShooter.keys())[randomOption] });
        }
    }
}

function shoot(character: LevelingCharacter, projectiles: Projectile[], gameTime: number, randomSeed: RandomSeed) {
    let properties: ShooterCharacterClass = character.characterClassProperties;
    for (let i = 0; i <= properties.multiShot; i++) {
        let shotSpread: number = (nextRandom(randomSeed) - 0.5) / 10 * properties.multiShot;
        projectiles.push(createProjectile(
            character.x,
            character.y,
            character.moveDirection + shotSpread,
            character.damage,
            character.faction,
            character.moveSpeed + 2,
            gameTime,
            properties.pierceCount,
            properties.timeToLive
        ));
    }
}
