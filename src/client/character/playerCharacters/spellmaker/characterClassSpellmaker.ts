import { addAbilityToCharacter, createAbility } from "../../../ability/ability.js";
import { createAbilityHpRegen } from "../../../ability/abilityHpRegen.js";
import { getNextId } from "../../../game.js";
import { Position, Game, IdCounter, FACTION_ENEMY } from "../../../gameModel.js";
import { resetCharacter } from "../../character.js";
import { Character, createCharacter, IMAGE_SLIME } from "../../characterModel.js";
import { calculateBossEnemyExperienceWorth, CHARACTER_TYPE_BOSS_ENEMY } from "../../enemy/bossEnemy.js";
import { createBossUpgradeOptionsAbilityLeveling, executeAbilityLevelingCharacterUpgradeOption } from "../abilityLevelingCharacter.js";
import { CharacterClass, paintPlayerAbilityLevelUI, PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "../playerCharacters.js";
import { ABILITY_NAME_SPELLMAKER, AbilitySpellmaker, addAbilitySpellmaker } from "./abilitySpellmaker.js";
import { ABILITY_NAME_SPELLMAKER_CHANGE_MODE, addAbilitySpellmakerChangeMode } from "./abilitySpellmakerChangeMode.js";
import { addAbilitySpellmakerExplode } from "./abilitySpellmakerExplode.js";
import { addAbilitySpellmakerFireLine } from "./abilitySpellmakerFireLine.js";
import { addAbilitySpellmakerLightning } from "./abilitySpellmakerLightning.js";
import { addAbilitySpellmakerProximity } from "./abilitySpellmakerProximity.js";
import { ABILITY_NAME_SPELLMAKER_SWITCH_SPELL, addAbilitySpellmakerSwitchSpell } from "./abilitySpellmakerSwitchSpell.js";
import { addAbilitySpellmakerTurret } from "./abilitySpellmakerTurret.js";
import { SPELLMAKER_MOVE_TOOLS_FUNCTIONS, SPELLMAKER_TOOLS_FUNCTIONS } from "./spellmakerTool.js";

export const CHARACTER_CLASS_SPELLMAKER = "Spellmaker";

export function addSpellmakerClass() {
    PLAYER_CHARACTER_CLASSES_FUNCTIONS[CHARACTER_CLASS_SPELLMAKER] = {
        changeCharacterToThisClass: changeCharacterToSpellmakerClass,
        createBossBasedOnClassAndCharacter: createBossBasedOnClassAndCharacter,
        createBossUpgradeOptions: createBossUpgradeOptionsAbilityLeveling,
        executeUpgradeOption: executeAbilityLevelingCharacterUpgradeOption,
        getMoreInfosText: getLongUiText,
        paintLevelUI: paintLevelUI,
        preventMultiple: true,
    }
    addAbilitySpellmaker();
    addAbilitySpellmakerChangeMode();
    addAbilitySpellmakerSwitchSpell()
    addAbilitySpellmakerFireLine();
    addAbilitySpellmakerProximity();
    addAbilitySpellmakerLightning();
    addAbilitySpellmakerExplode();
    addAbilitySpellmakerTurret();
}

function paintLevelUI(ctx: CanvasRenderingContext2D, character: Character, charClass: CharacterClass, topLeft: Position, width: number, height: number, game: Game) {
    const ability = character.abilities.find(a => a.classIdRef === charClass.id && a.name === ABILITY_NAME_SPELLMAKER);
    if (!ability || ability.level?.leveling === undefined) return;
    paintPlayerAbilityLevelUI(ctx, ability, topLeft, width, height, game);
}

function changeCharacterToSpellmakerClass(
    character: Character,
    idCounter: IdCounter,
    game: Game,
) {
    if (!character.characterClasses) character.characterClasses = [];
    const charClass = {
        id: getNextId(game.state.idCounter),
        className: CHARACTER_CLASS_SPELLMAKER
    };
    character.characterClasses.push(charClass);
    const abilitySm = createAbility(ABILITY_NAME_SPELLMAKER, idCounter, true, true, "ability1") as AbilitySpellmaker;
    if (game.ctx) {
        for (let key of Object.keys(SPELLMAKER_TOOLS_FUNCTIONS)) {
            const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[key];
            if (!toolFunctions.availableFromTheStart) continue;
            abilitySm.createTools.createTools.push(SPELLMAKER_TOOLS_FUNCTIONS[key].createTool(game.ctx));
        }
    }
    if (abilitySm.bossSkillPoints) {
        abilitySm.bossSkillPoints.available++;
        abilitySm.bossSkillPoints.used--;
    }
    addAbilityToCharacter(character, createAbilityHpRegen(idCounter, undefined, 5), charClass);
    addAbilityToCharacter(character, abilitySm, charClass);
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_SPELLMAKER_CHANGE_MODE, idCounter, false, false, "ability2"), charClass);
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_SPELLMAKER_SWITCH_SPELL, idCounter, false, false, "ability3"), charClass);
}

function getLongUiText(): string[] {
    let text: string[] = [];
    text.push("Create spells by drawing");
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
    resetCharacter(bossCharacter, game);

    return bossCharacter;
}
