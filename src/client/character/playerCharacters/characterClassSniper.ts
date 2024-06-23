import { addAbilityToCharacter, createAbility, setAbilityToBossLevel } from "../../ability/ability.js";
import { createAbilityHpRegen } from "../../ability/abilityHpRegen.js";
import { ABILITY_NAME_SPEED_BOOST } from "../../ability/speedBoost/abilitySpeedBoost.js";
import { ABILITY_NAME_SNIPE, AbilitySnipe } from "../../ability/snipe/abilitySnipe.js";
import { FACTION_ENEMY, Game, IdCounter, Position } from "../../gameModel.js";
import { Character, IMAGE_SLIME, createCharacter } from "../characterModel.js";
import { createBossUpgradeOptionsAbilityLeveling, executeAbilityLevelingCharacterUpgradeOption } from "./abilityLevelingCharacter.js";
import { CharacterClass, PLAYER_CHARACTER_CLASSES_FUNCTIONS, PlayerCharacterLevelUI, paintPlayerAbilityLevelUI } from "./playerCharacters.js";
import { deepCopy, getNextId } from "../../game.js";
import { resetCharacter } from "../character.js";
import { CHARACTER_TYPE_BOSS_ENEMY, calculateBossEnemyExperienceWorth } from "../enemy/bossEnemy.js";
import { ABILITY_NAME_SNIPE_RELOAD } from "../../ability/snipe/abilitySnipeReload.js";
import { paintTextWithOutline } from "../../gamePaint.js";

export const CHARACTER_CLASS_SNIPER = "Sniper";

export function addSniperClass() {
    PLAYER_CHARACTER_CLASSES_FUNCTIONS[CHARACTER_CLASS_SNIPER] = {
        changeCharacterToThisClass: changeCharacterToSniperClass,
        createBossBasedOnClassAndCharacter: createBossBasedOnClassAndCharacter,
        createBossUpgradeOptions: createBossUpgradeOptionsAbilityLeveling,
        executeUpgradeOption: executeAbilityLevelingCharacterUpgradeOption,
        getMoreInfosText: getLongUiText,
        paintLevelUI: paintLevelUI,
    }
}

function paintLevelUI(ctx: CanvasRenderingContext2D, character: Character, charClass: CharacterClass, topLeft: Position, width: number, height: number, game: Game) {
    const sniperAbility = character.abilities.find(a => a.classIdRef === charClass.id && a.name === ABILITY_NAME_SNIPE);
    if (!sniperAbility || sniperAbility.level?.leveling === undefined) return;
    paintPlayerAbilityLevelUI(ctx, sniperAbility, topLeft, width, height, game);
}

function changeCharacterToSniperClass(
    character: Character,
    idCounter: IdCounter,
    game: Game,
) {
    if (!character.characterClasses) character.characterClasses = [];
    const charClass = {
        className: CHARACTER_CLASS_SNIPER,
        id: getNextId(game.state.idCounter),
    }
    character.characterClasses.push(charClass);
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_SNIPE, idCounter, true, true, "ability1"), charClass);
    addAbilityToCharacter(character, createAbilityHpRegen(idCounter, undefined, 2), charClass);
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_SPEED_BOOST, idCounter, false, true, "ability2"), charClass);
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_SNIPE_RELOAD, idCounter, false, false, "ability3"), charClass);
}

function getLongUiText(): string[] {
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
    const experienceWorth = calculateBossEnemyExperienceWorth(level);

    const bossCharacter = createCharacter(getNextId(idCounter), spawn.x, spawn.y, bossSize, bossSize, color, moveSpeed, hp, FACTION_ENEMY, CHARACTER_TYPE_BOSS_ENEMY, experienceWorth);
    bossCharacter.paint.image = IMAGE_SLIME;
    bossCharacter.level = { level: level };
    const baseSnipe = basedOnCharacter.abilities.find((a) => a.name === ABILITY_NAME_SNIPE);
    const snipe: AbilitySnipe = deepCopy(baseSnipe);
    bossCharacter.abilities.push(snipe);
    setAbilityToBossLevel(snipe, level);
    resetCharacter(bossCharacter, game);

    return bossCharacter;
}
