import { addAbilityToCharacter } from "../../ability/ability.js";
import { createAbilityHpRegen } from "../../ability/abilityHpRegen.js";
import { ABILITY_NAME_TOWER, createAbilityTower } from "../../ability/abilityTower.js";
import { ABILITY_NAME_SNIPE, AbilitySnipe } from "../../ability/snipe/abilitySnipe.js";
import { getNextId, deepCopy } from "../../game.js";
import { FACTION_ENEMY, Game, IdCounter, Position } from "../../gameModel.js";
import { resetCharacter } from "../character.js";
import { Character, IMAGE_SLIME, createCharacter } from "../characterModel.js";
import { CHARACTER_TYPE_BOSS_ENEMY, setAbilityToBossLevel } from "../enemy/bossEnemy.js";
import { changeToLevelingCharacter } from "./levelingCharacterModel.js";
import { PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "./playerCharacters.js";

const TOWER_BUILDER = "Tower Builder";

export function addTowerClass() {
    PLAYER_CHARACTER_CLASSES_FUNCTIONS[TOWER_BUILDER] = {
        changeCharacterToThisClass: changeCharacterToTowerBuilderClass,
        createBossBasedOnClassAndCharacter: createBossBasedOnClassAndCharacter,
    }
}

function changeCharacterToTowerBuilderClass(
    character: Character,
    idCounter: IdCounter,
    game: Game, 
) {
    const levelingCharacter = changeToLevelingCharacter(character, game);
    character.characterClass = TOWER_BUILDER;
    addAbilityToCharacter(levelingCharacter, createAbilityTower(idCounter, "ability1"));
    addAbilityToCharacter(levelingCharacter, createAbilityHpRegen(idCounter));
}

function createBossBasedOnClassAndCharacter(basedOnCharacter: Character, level: number, spawn: Position, game: Game): Character{
    const idCounter = game.state.idCounter;
    const bossSize = 60;
    const color = "black";
    const moveSpeed = Math.min(6, 1.5 + level * 0.5);
    const hp = 1000 * Math.pow(level, 4);
    const experienceWorth = Math.pow(level, 2) * 100;

    const bossCharacter = createCharacter(getNextId(idCounter), spawn.x, spawn.y, bossSize, bossSize, color, moveSpeed, hp, FACTION_ENEMY, CHARACTER_TYPE_BOSS_ENEMY, experienceWorth);
    bossCharacter.paint.image = IMAGE_SLIME;
    const baseTower = basedOnCharacter.abilities.find((a) => a.name === ABILITY_NAME_TOWER);
    const tower: AbilitySnipe = deepCopy(baseTower);
    bossCharacter.abilities.push(tower);
    setAbilityToBossLevel(tower, level);

    resetCharacter(bossCharacter);

    return bossCharacter;
}
