type LevelingCharacter = Character & {
    experience: number,
    experienceForLevelUp: number,
    level: number,
    availableSkillPoints: number,
    upgradeOptions: {
        name: string,
    }[],
}

type UpgradeOption = {
    name: string,
    upgrade: (character: Character) => void,
}

function createLevelingCharacter(
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
    };
}

function levelingCharacterLevelUp(character: LevelingCharacter, state: GameState, upgradeOptions: Map<string, UpgradeOption>) {
    character.level++;
    character.availableSkillPoints += 1;
    character.experience -= character.experienceForLevelUp;
    fillRandomUpgradeOptions(character, state, upgradeOptions);
}

function fillRandomUpgradeOptions(character: LevelingCharacter, state: GameState, upgradeOptions: Map<string, UpgradeOption>){
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

function createDefaultUpgradeOptions(): Map<string, UpgradeOption> {
    let upgradeOptions = new Map<string, UpgradeOption>();
    upgradeOptions.set("Health+50", {
        name: "Health+50", upgrade: (c: Character) => {
            c.hp += 50;
        }
    });
    upgradeOptions.set("Speed+0.2", {
        name: "Speed+0.2", upgrade: (c: Character) => {
            c.moveSpeed += 0.2;
        }
    });
    upgradeOptions.set("Damage+2", {
        name: "Damage+2", upgrade: (c: Character) => {
            c.damage += 2;
        }
    });

    return upgradeOptions;
}