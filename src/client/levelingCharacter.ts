import { Character, getPlayerCharacters } from "./character.js";
import { Game, GameState, getNextId } from "./game.js";
import { nextRandom } from "./randomNumberGenerator.js";

export type LevelingCharacter = Character & {
    experience: number,
    experienceForLevelUp: number,
    level: number,
    availableSkillPoints: number,
    shooting:{
        frequency: number,
        nextShotTime: number,
        pierceCount: number,
        multiShot: number,
        timeToLive: number,
    }
    upgradeOptions: {
        name: string,
    }[],
}

export type UpgradeOption = {
    name: string,
    upgrade: (character: LevelingCharacter) => void,
}

export function createLevelingCharacter(
    game: Game,
    x: number,
    y: number,
    size: number,
    color: string,
    moveSpeed: number,
    hp: number,
    damage: number,
    faction: string,
    isMoving: boolean = false
): LevelingCharacter {
    return {
        id: getNextId(game.state),
        x: x,
        y: y,
        size: size,
        color: color,
        moveSpeed: moveSpeed,
        moveDirection: 0,
        isMoving: isMoving,
        hp: hp,
        maxHp: hp,
        damage: damage,
        faction: faction,
        experienceWorth: 1,
        experience: 0,
        experienceForLevelUp: 20,
        level: 0,
        availableSkillPoints: 0,
        upgradeOptions: [],
        shooting: {
            frequency: 500,
            nextShotTime: 0,
            pierceCount: 0,
            multiShot: 0,
            timeToLive: 1000,
        }
    };
}

function levelingCharacterLevelUp(character: LevelingCharacter, state: GameState, upgradeOptions: Map<string, UpgradeOption>) {
    character.level++;
    character.availableSkillPoints += 1;
    character.experience -= character.experienceForLevelUp;
    fillRandomUpgradeOptions(character, state, upgradeOptions);
}

export function fillRandomUpgradeOptions(character: LevelingCharacter, state: GameState, upgradeOptions: Map<string, UpgradeOption>){
    if (character.upgradeOptions.length === 0) {
        let setOfUsedUpgrades = new Set<number>();
        for (let i = 0; i < 3; i++) {
            let randomOption = Math.floor(nextRandom(state) * upgradeOptions.size);
            while(setOfUsedUpgrades.has(randomOption) && upgradeOptions.size > setOfUsedUpgrades.size){
                randomOption = Math.floor(nextRandom(state) * upgradeOptions.size);
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
    upgradeOptions.set("Damage+2", {
        name: "Damage+2", upgrade: (c: LevelingCharacter) => {
            c.damage += 2;
        }
    });
    upgradeOptions.set("ShootSpeed+20%", {
        name: "hootSpeed Up", upgrade: (c: LevelingCharacter) => {
            c.shooting.frequency *= 0.8;
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

export function levelingCharacterXpGain(state: GameState, killedCharacter: Character, upgradeOptions: Map<string, UpgradeOption>){
    let playerCharacters: LevelingCharacter[] = getPlayerCharacters(state.characters) as LevelingCharacter[];
    for(let i = 0; i<playerCharacters.length; i++){
        if(playerCharacters[i].experience !== undefined){
            playerCharacters[i].experience += killedCharacter.experienceWorth;
            if(playerCharacters[i].experience >= playerCharacters[i].experienceForLevelUp){
                levelingCharacterLevelUp(playerCharacters[i], state, upgradeOptions);
            }
        }
    }
}