import { addAbilityToCharacter, setAbilityToBossLevel } from "../../ability/ability.js";
import { createAbilityHpRegen } from "../../ability/abilityHpRegen.js";
import { ABILITY_NAME_TOWER, createAbilityTower } from "../../ability/abilityTower.js";
import { AbilitySnipe } from "../../ability/snipe/abilitySnipe.js";
import { getNextId, deepCopy } from "../../game.js";
import { FACTION_ENEMY, Game, IdCounter, Position } from "../../gameModel.js";
import { resetCharacter } from "../character.js";
import { Character, IMAGE_SLIME, createCharacter } from "../characterModel.js";
import { CHARACTER_TYPE_BOSS_ENEMY } from "../enemy/bossEnemy.js";
import { createCharacterUpgradeOptionsNew, executeLevelingCharacterUpgradeOption } from "./levelingCharacter.js";
import { PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "./playerCharacters.js";

export const PLAYER_CLASS_TOWER_BUILDER = "Tower Builder";

export function addTowerClass() {
    PLAYER_CHARACTER_CLASSES_FUNCTIONS[PLAYER_CLASS_TOWER_BUILDER] = {
        changeCharacterToThisClass: changeCharacterToTowerBuilderClass,
        createBossBasedOnClassAndCharacter: createBossBasedOnClassAndCharacter,
        createUpgradeOptions: createCharacterUpgradeOptionsNew,
        executeUpgradeOption: executeLevelingCharacterUpgradeOption,
        getLongUiText: getLongUiText,
        preventMultiple: true,
    }
}

function changeCharacterToTowerBuilderClass(
    character: Character,
    idCounter: IdCounter,
    game: Game,
) {
    if(!character.characterClasses) character.characterClasses = [];
    character.characterClasses.push({
        id: getNextId(game.state.idCounter),
        className: PLAYER_CLASS_TOWER_BUILDER,
        level: {
            level: 0,
            leveling: {
                experience: 0,
                experienceForLevelUp: 10,
            }
        },
        availableSkillPoints: 0,
    });
    addAbilityToCharacter(character, createAbilityTower(idCounter, "ability1"));
    addAbilityToCharacter(character, createAbilityHpRegen(idCounter));
}

function getLongUiText(): string[]{
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
    const experienceWorth = Math.pow(level, 2) * 100;

    const bossCharacter = createCharacter(getNextId(idCounter), spawn.x, spawn.y, bossSize, bossSize, color, moveSpeed, hp, FACTION_ENEMY, CHARACTER_TYPE_BOSS_ENEMY, experienceWorth);
    bossCharacter.paint.image = IMAGE_SLIME;
    bossCharacter.level = {level: level};
    const baseTower = basedOnCharacter.abilities.find((a) => a.name === ABILITY_NAME_TOWER);
    const tower: AbilitySnipe = deepCopy(baseTower);
    bossCharacter.abilities.push(tower);
    setAbilityToBossLevel(tower, level);
    resetCharacter(bossCharacter);

    return bossCharacter;
}
