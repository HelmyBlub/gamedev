import { addAbilityToCharacter, createAbility, setAbilityToBossLevel } from "../../ability/ability.js";
import { createAbilityHpRegen } from "../../ability/abilityHpRegen.js";
import { ABILITY_NAME_SPEED_BOOST } from "../../ability/speedBoost/abilitySpeedBoost.js";
import { ABILITY_NAME_SNIPE, AbilitySnipe } from "../../ability/snipe/abilitySnipe.js";
import { FACTION_ENEMY, Game, IdCounter, Position } from "../../gameModel.js";
import { Character, IMAGE_SLIME, createCharacter } from "../characterModel.js";
import { createBossUpgradeOptionsAbilityLeveling, executeAbilityLevelingCharacterUpgradeOption } from "./abilityLevelingCharacter.js";
import { PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "./playerCharacters.js";
import { deepCopy, getNextId } from "../../game.js";
import { resetCharacter } from "../character.js";
import { CHARACTER_TYPE_BOSS_ENEMY } from "../enemy/bossEnemy.js";
import { ABILITY_NAME_SNIPE_RELOAD } from "../../ability/snipe/abilitySnipeReload.js";

export const CHARACTER_CLASS_SNIPER_NAME = "Sniper";

export function addSniperClass() {
    PLAYER_CHARACTER_CLASSES_FUNCTIONS[CHARACTER_CLASS_SNIPER_NAME] = {
        changeCharacterToThisClass: changeCharacterToSniperClass,
        createBossBasedOnClassAndCharacter: createBossBasedOnClassAndCharacter,
        createBossUpgradeOptions: createBossUpgradeOptionsAbilityLeveling,
        executeUpgradeOption: executeAbilityLevelingCharacterUpgradeOption,
        getLongUiText: getLongUiText,
    }
}

function changeCharacterToSniperClass(
    character: Character,
    idCounter: IdCounter,
    game: Game,
) {
    character.characterClass = CHARACTER_CLASS_SNIPER_NAME;
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_SNIPE, idCounter, true, true, "ability1"));
    addAbilityToCharacter(character, createAbilityHpRegen(idCounter, undefined, 2));
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_SPEED_BOOST, idCounter, false, true, "ability2"));
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_SNIPE_RELOAD, idCounter, false, false, "ability3"));
}

function getLongUiText(): string[]{
    let text: string[] = [];
    text.push("Get a sniper rifle.");
    text.push("Abilities:");
    text.push("- Snipe");
    text.push("- Speed Boost");
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
    const baseSnipe = basedOnCharacter.abilities.find((a) => a.name === ABILITY_NAME_SNIPE);
    const snipe: AbilitySnipe = deepCopy(baseSnipe);
    bossCharacter.abilities.push(snipe);
    setAbilityToBossLevel(snipe, level);
    resetCharacter(bossCharacter);

    return bossCharacter;
}
