import { addAbilityToCharacter, createAbility, setAbilityToBossLevel } from "../../ability/ability.js";
import { createAbilityHpRegen } from "../../ability/abilityHpRegen.js";
import { AbilitySnipe as AbilityBounceBall } from "../../ability/snipe/abilitySnipe.js";
import { FACTION_ENEMY, Game, IdCounter, Position } from "../../gameModel.js";
import { Character, IMAGE_SLIME, createCharacter } from "../characterModel.js";
import { CharacterClass, PLAYER_CHARACTER_CLASSES_FUNCTIONS, paintPlayerAbilityLevelUI } from "./playerCharacters.js";
import { deepCopy, getNextId } from "../../game.js";
import { resetCharacter } from "../character.js";
import { CHARACTER_TYPE_BOSS_ENEMY, calculateBossEnemyExperienceWorth } from "../enemy/bossEnemy.js";
import { ABILITY_NAME_BOUNCE_BALL } from "../../ability/ball/abilityBounceBall.js";
import { ABILITY_NAME_LIGHTNING_BALL, AbilityLightningBall } from "../../ability/ball/abilityLightningBall.js";
import { createBossUpgradeOptionsAbilityLeveling, executeAbilityLevelingCharacterUpgradeOption } from "./abilityLevelingCharacter.js";
import { characterCreateAndApplyUpgradeDamageReduction } from "../upgrades/characterUpgradeDamageReduction.js";
import { characterCreateAndAddUpgradeBonusHp } from "../upgrades/characterUpgradeBonusHealth.js";

export const CHARACTER_CLASS_BALL = "Ball";

export function addBallClass() {
    PLAYER_CHARACTER_CLASSES_FUNCTIONS[CHARACTER_CLASS_BALL] = {
        changeCharacterToThisClass: changeCharacterToBallClass,
        createBossBasedOnClassAndCharacter: createBossBasedOnClassAndCharacter,
        createBossUpgradeOptions: createBossUpgradeOptionsAbilityLeveling,
        executeUpgradeOption: executeAbilityLevelingCharacterUpgradeOption,
        getMoreInfosText: getLongUiText,
        paintLevelUI: paintLevelUI,
        preventMultiple: true,
    }
}

function paintLevelUI(ctx: CanvasRenderingContext2D, character: Character, charClass: CharacterClass, topLeft: Position, width: number, height: number, game: Game) {
    const tempTopLeft = { x: topLeft.x, y: topLeft.y };
    const tempWidth = Math.floor(width / 2);
    const bounceBall = character.abilities.find(a => a.classIdRef === charClass.id && a.name === ABILITY_NAME_BOUNCE_BALL);
    if (!bounceBall || bounceBall.level?.leveling === undefined) return;
    paintPlayerAbilityLevelUI(ctx, bounceBall, tempTopLeft, tempWidth, height, game);
    tempTopLeft.x += tempWidth;

    const lightningBall = character.abilities.find(a => a.classIdRef === charClass.id && a.name === ABILITY_NAME_LIGHTNING_BALL);
    if (!lightningBall || lightningBall.level?.leveling === undefined) return;
    paintPlayerAbilityLevelUI(ctx, lightningBall, tempTopLeft, tempWidth, height, game);
}

function changeCharacterToBallClass(
    character: Character,
    idCounter: IdCounter,
    game: Game,
) {
    if (!character.characterClasses) character.characterClasses = [];
    const charClass = {
        id: getNextId(game.state.idCounter),
        className: CHARACTER_CLASS_BALL
    };
    character.characterClasses.push(charClass);
    characterCreateAndAddUpgradeBonusHp(charClass, character, 200);
    characterCreateAndApplyUpgradeDamageReduction(charClass, character, game, 0.5);
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_BOUNCE_BALL, idCounter, true, true, "ability1"), charClass);
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_LIGHTNING_BALL, idCounter, true, true, "ability2"), charClass);
    addAbilityToCharacter(character, createAbilityHpRegen(idCounter, undefined, 5), charClass);
}

function getLongUiText(): string[] {
    let text: string[] = [];
    text.push("Turn into a ball to quickly roll around.");
    text.push("All damage taken reduced by 50%.");
    text.push("Abilities:");
    text.push("- Boucne Ball");
    text.push("- Lightning Ball");
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
    const baseBounceBall = basedOnCharacter.abilities.find((a) => a.name === ABILITY_NAME_BOUNCE_BALL);
    const baseLightningBall = basedOnCharacter.abilities.find((a) => a.name === ABILITY_NAME_LIGHTNING_BALL);
    const bounceBall: AbilityBounceBall = deepCopy(baseBounceBall);
    bossCharacter.abilities.push(bounceBall);
    setAbilityToBossLevel(bounceBall, level);

    const lightningBall: AbilityLightningBall = deepCopy(baseLightningBall);
    bossCharacter.abilities.push(lightningBall);
    setAbilityToBossLevel(lightningBall, level);

    resetCharacter(bossCharacter, game);

    return bossCharacter;
}
