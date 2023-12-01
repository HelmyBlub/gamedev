import { addAbilityToCharacter, createAbility, setAbilityToBossLevel } from "../../ability/ability.js";
import { createAbilityHpRegen } from "../../ability/abilityHpRegen.js";
import { AbilitySnipe as AbilityBounceBall } from "../../ability/snipe/abilitySnipe.js";
import { FACTION_ENEMY, Game, IdCounter, Position } from "../../gameModel.js";
import { Character, IMAGE_SLIME, createCharacter } from "../characterModel.js";
import { ABILITY_LEVELING_CHARACTER } from "./abilityLevelingCharacter.js";
import { PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "./playerCharacters.js";
import { deepCopy, getNextId } from "../../game.js";
import { resetCharacter } from "../character.js";
import { CHARACTER_TYPE_BOSS_ENEMY } from "../enemy/bossEnemy.js";
import { ABILITY_NAME_BOUNCE_BALL } from "../../ability/ball/abilityBounceBall.js";
import { ABILITY_NAME_LIGHTNING_BALL, AbilityLightningBall } from "../../ability/ball/abilityLightningBall.js";

export const CHARACTER_CLASS_BALL = "Ball (work in progress)";

export function addBallClass() {
    PLAYER_CHARACTER_CLASSES_FUNCTIONS[CHARACTER_CLASS_BALL] = {
        changeCharacterToThisClass: changeCharacterToBallClass,
        createBossBasedOnClassAndCharacter: createBossBasedOnClassAndCharacter,
        getLongUiText: getLongUiText,
    }
}

function changeCharacterToBallClass(
    character: Character,
    idCounter: IdCounter,
    game: Game,
) {
    character.type = ABILITY_LEVELING_CHARACTER;
    character.characterClass = CHARACTER_CLASS_BALL;
    character.maxHp *= 2;
    character.hp *= 2;
    character.damageTakenModifierFactor *= 0.5;
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_BOUNCE_BALL, idCounter, true, true, "ability1"));
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_LIGHTNING_BALL, idCounter, true, true, "ability2"));
    const hpRegen = createAbilityHpRegen(idCounter);
    hpRegen.amount *= 5;
    addAbilityToCharacter(character, hpRegen);
}

function getLongUiText(): string[]{
    let text: string[] = [];
    text.push("Turn into a ball to quickly roll around.");
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
    const experienceWorth = Math.pow(level, 2) * 100;

    const bossCharacter = createCharacter(getNextId(idCounter), spawn.x, spawn.y, bossSize, bossSize, color, moveSpeed, hp, FACTION_ENEMY, CHARACTER_TYPE_BOSS_ENEMY, experienceWorth);
    bossCharacter.paint.image = IMAGE_SLIME;
    const baseBounceBall = basedOnCharacter.abilities.find((a) => a.name === ABILITY_NAME_BOUNCE_BALL);
    const baseLightningBall = basedOnCharacter.abilities.find((a) => a.name === ABILITY_NAME_LIGHTNING_BALL);
    const bounceBall: AbilityBounceBall = deepCopy(baseBounceBall);
    //bossCharacter.abilities.push(bounceBall);
    setAbilityToBossLevel(bounceBall, level);

    const lightningBall: AbilityLightningBall = deepCopy(baseLightningBall);
    bossCharacter.abilities.push(lightningBall);
    setAbilityToBossLevel(lightningBall, level);

    resetCharacter(bossCharacter);

    return bossCharacter;
}
