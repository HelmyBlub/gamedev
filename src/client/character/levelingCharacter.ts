import { getPlayerCharacters, moveCharacterTick } from "./character.js";
import { Game, GameState } from "../gameModel.js";
import { nextRandom, RandomSeed } from "../randomNumberGenerator.js";
import { Character } from "./characterModel.js";
import { createProjectile, Projectile } from "../projectile.js";
import { LevelingCharacter, UpgradeOption } from "./levelingCharacterModel.js";

export function fillRandomUpgradeOptions(character: LevelingCharacter, randomSeed: RandomSeed, upgradeOptions: Map<string, UpgradeOption>) {
    if (character.upgradeOptions.length === 0) {
        let setOfUsedUpgrades = new Set<number>();
        for (let i = 0; i < 3; i++) {
            let randomOption = Math.floor(nextRandom(randomSeed) * upgradeOptions.size);
            while (setOfUsedUpgrades.has(randomOption) && upgradeOptions.size > setOfUsedUpgrades.size) {
                randomOption = Math.floor(nextRandom(randomSeed) * upgradeOptions.size);
            }
            setOfUsedUpgrades.add(randomOption);
            character.upgradeOptions.push({ name: Array.from(upgradeOptions.keys())[randomOption] });
        }
    }
}

export function createDefaultUpgradeOptions(): Map<string, UpgradeOption> {
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
            c.shooting.frequencyIncrease += 0.2;
        }
    });
    upgradeOptions.set("Pierce+1", {
        name: "Piercing+1", upgrade: (c: LevelingCharacter) => {
            c.shooting.pierceCount += 1;
        }
    });
    upgradeOptions.set("MultiShot+1", {
        name: "MultiShot+1", upgrade: (c: LevelingCharacter) => {
            c.shooting.multiShot += 1;
        }
    });

    return upgradeOptions;
}

export function levelingCharacterXpGain(state: GameState, killedCharacter: Character, upgradeOptions: Map<string, UpgradeOption>) {
    let playerCharacters: LevelingCharacter[] = getPlayerCharacters(state.characters, state.players.length) as LevelingCharacter[];
    for (let i = 0; i < playerCharacters.length; i++) {
        if (playerCharacters[i].experience !== undefined) {
            playerCharacters[i].experience += killedCharacter.experienceWorth;
            if (playerCharacters[i].experience >= playerCharacters[i].experienceForLevelUp) {
                levelingCharacterLevelUp(playerCharacters[i], state.randomSeed, upgradeOptions);
            }
        }
    }
}

export function tickPlayerCharacter(character: LevelingCharacter, game: Game) {
    while (character.shooting.nextShotTime <= game.state.time) {
        shoot(character, game.state.projectiles, game.state.time, game.state.randomSeed);
        character.shooting.nextShotTime += character.shooting.baseFrequency / character.shooting.frequencyIncrease;
    }
    moveCharacterTick(character, game.state.map);
}

function shoot(character: LevelingCharacter, projectiles: Projectile[], gameTime: number, randomSeed: RandomSeed) {
    for (let i = 0; i <= character.shooting.multiShot; i++) {
        let shotSpread: number = (nextRandom(randomSeed) - 0.5) / 10 * character.shooting.multiShot;
        projectiles.push(createProjectile(
            character.x,
            character.y,
            character.moveDirection + shotSpread,
            character.damage,
            character.faction,
            character.moveSpeed + 2,
            gameTime,
            character.shooting.pierceCount,
            character.shooting.timeToLive
        ));
    }
}

function levelingCharacterLevelUp(character: LevelingCharacter, randomSeed: RandomSeed, upgradeOptions: Map<string, UpgradeOption>) {
    character.level++;
    character.availableSkillPoints += 1;
    character.experience -= character.experienceForLevelUp;
    character.experienceForLevelUp += 1;
    fillRandomUpgradeOptions(character, randomSeed, upgradeOptions);
}
