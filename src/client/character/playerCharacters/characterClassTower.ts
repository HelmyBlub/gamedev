import { ABILITIES_FUNCTIONS, addAbilityToCharacter, setAbilityToBossLevel } from "../../ability/ability.js";
import { createAbilityHpRegen } from "../../ability/abilityHpRegen.js";
import { ABILITY_NAME_TOWER, AbilityTower, abilityTowerSubTypeUpgradeChoices, createAbilityTower } from "../../ability/abilityTower.js";
import { AbilitySnipe } from "../../ability/snipe/abilitySnipe.js";
import { getNextId, deepCopy } from "../../game.js";
import { FACTION_ENEMY, Game, IdCounter, Position } from "../../gameModel.js";
import { resetCharacter } from "../character.js";
import { Character, IMAGE_SLIME, createCharacter } from "../characterModel.js";
import { CHARACTER_TYPE_BOSS_ENEMY, calculateBossEnemyExperienceWorth } from "../enemy/bossEnemy.js";
import { UpgradeOptionAndProbability } from "../upgrade.js";
import { CHARACTER_UPGRADE_BONUS_HP } from "../upgrades/characterUpgradeBonusHealth.js";
import { CHARACTER_UPGRADE_BONUS_MOVE_SPEED } from "../upgrades/characterUpgradeMoveSpeed.js";
import { CHARACTER_UPGRADE_FUNCTIONS } from "../upgrades/characterUpgrades.js";
import { executeLevelingCharacterUpgradeOption } from "./levelingCharacter.js";
import { CharacterClass, PLAYER_CHARACTER_CLASSES_FUNCTIONS, paintPlayerLevelUI } from "./playerCharacters.js";

export const CHARACTER_CLASS_TOWER_BUILDER = "Tower Builder";

export function addTowerClass() {
    PLAYER_CHARACTER_CLASSES_FUNCTIONS[CHARACTER_CLASS_TOWER_BUILDER] = {
        changeCharacterToThisClass: changeCharacterToTowerBuilderClass,
        createBossBasedOnClassAndCharacter: createBossBasedOnClassAndCharacter,
        createUpgradeOptions: createCharacterUpgradeOptions,
        executeUpgradeOption: executeLevelingCharacterUpgradeOption,
        getMoreInfosText: getMoreInfoText,
        kingModification: kingModification,
        paintLevelUI: paintLevelUI,
        preventMultiple: true,
    }
}

function paintLevelUI(ctx: CanvasRenderingContext2D, character: Character, charClass: CharacterClass, topLeft: Position, width: number, height: number, game: Game) {
    if (charClass.level?.leveling === undefined) return;
    let capped: number | undefined = undefined;
    if (charClass.legendary) capped = charClass.legendary.levelCap;
    paintPlayerLevelUI(ctx, charClass.level, charClass.id, charClass.id, topLeft, width, height, charClass.className + ":", game, capped);
}

function changeCharacterToTowerBuilderClass(
    character: Character,
    idCounter: IdCounter,
    game: Game,
) {
    if (!character.characterClasses) character.characterClasses = [];
    const charClass: CharacterClass = {
        id: getNextId(game.state.idCounter),
        className: CHARACTER_CLASS_TOWER_BUILDER,
        level: {
            level: 1,
            leveling: {
                experience: 0,
                experienceForLevelUp: 10,
            }
        },
        availableSkillPoints: { available: 1, used: 0 },
    };
    character.characterClasses.push(charClass);
    addAbilityToCharacter(character, createAbilityTower(idCounter, "ability1"), charClass);
    addAbilityToCharacter(character, createAbilityHpRegen(idCounter), charClass);
}

function kingModification(character: Character, characterClass: CharacterClass) {
    for (let ability of character.abilities) {
        if (ability.classIdRef !== characterClass.id) continue;
        if (ability.name === ABILITY_NAME_TOWER) {
            const tower = ability as AbilityTower;
            if (tower.abilityObjectsAttached) {
                for (let attached of tower.abilityObjectsAttached) {
                    attached.faction = character.faction;
                    attached.ownerId = character.id;
                }
            }
        }
    }
}

export function createCharacterUpgradeOptions(character: Character, characterClass: CharacterClass, game: Game): UpgradeOptionAndProbability[] {
    const upgradeOptions: UpgradeOptionAndProbability[] = [];
    if (characterClass.availableSkillPoints === undefined || characterClass.availableSkillPoints.available <= 0) return upgradeOptions;
    character.upgradeChoices.displayText = `Choose Upgrade:`;
    if (characterClass.availableSkillPoints.used === 0) {
        const towerAbility = character.abilities.find(a => a.name === ABILITY_NAME_TOWER);
        if (towerAbility) {
            upgradeOptions.push(...abilityTowerSubTypeUpgradeChoices());
        }
    } else {
        upgradeOptions.push(...CHARACTER_UPGRADE_FUNCTIONS[CHARACTER_UPGRADE_BONUS_HP].getOptions!(character, characterClass, game));
        upgradeOptions.push(...CHARACTER_UPGRADE_FUNCTIONS[CHARACTER_UPGRADE_BONUS_MOVE_SPEED].getOptions!(character, characterClass, game));

        for (let ability of character.abilities) {
            if (ability.classIdRef !== characterClass.id) continue;
            const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
            if (abilityFunctions && abilityFunctions.createAbilityUpgradeOptions) {
                upgradeOptions.push(...abilityFunctions.createAbilityUpgradeOptions(ability));
            }
        }
    }
    for (let option of upgradeOptions) {
        option.option.characterClass = CHARACTER_CLASS_TOWER_BUILDER;
        option.option.classIdRef = characterClass.id;
    }
    return upgradeOptions;
}

function getMoreInfoText(): string[] {
    let text: string[] = [];
    text.push("Build Towers. Tower Connect to each other.");
    text.push("Towers are stronger with more connections.");
    text.push("Abilities:");
    text.push("- Build Tower");
    return text;
}

function createBossBasedOnClassAndCharacter(basedOnCharacter: Character, level: number, spawn: Position, game: Game): Character {
    const idCounter = game.state.idCounter;
    const bossSize = 60;
    const color = "black";
    const moveSpeed = Math.min(6, 1.5 + level * 0.5);
    const hp = 1000 * Math.pow(level, 4);
    const experienceWorth = calculateBossEnemyExperienceWorth(level);

    const bossCharacter = createCharacter(getNextId(idCounter), spawn.x, spawn.y, bossSize, bossSize, color, moveSpeed, hp, FACTION_ENEMY, CHARACTER_TYPE_BOSS_ENEMY, experienceWorth);
    bossCharacter.paint.image = IMAGE_SLIME;
    bossCharacter.level = { level: level };
    const baseTower = basedOnCharacter.abilities.find((a) => a.name === ABILITY_NAME_TOWER) as AbilityTower;
    const tower = deepCopy(baseTower);
    const towerFunctions = ABILITIES_FUNCTIONS[tower.name];
    if (towerFunctions.updateOnCharcterChanges) towerFunctions.updateOnCharcterChanges(bossCharacter, tower, game);
    bossCharacter.abilities.push(tower);
    setAbilityToBossLevel(tower, level);
    resetCharacter(bossCharacter, game);

    return bossCharacter;
}
