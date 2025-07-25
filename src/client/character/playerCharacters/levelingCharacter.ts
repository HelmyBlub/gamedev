import { getPlayerCharacters } from "../character.js";
import { Game, GameState } from "../../gameModel.js";
import { Character } from "../characterModel.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability, fillRandomUpgradeOptionChoices } from "../upgrade.js";
import { ABILITIES_FUNCTIONS } from "../../ability/ability.js";
import { CHARACTER_CLASS_TOWER_BUILDER } from "./characterClassTower.js";
import { CharacterClass } from "./playerCharacters.js";
import { CHARACTER_UPGRADE_FUNCTIONS } from "../upgrades/characterUpgrades.js";
import { CHARACTER_UPGRADE_BONUS_HP } from "../upgrades/characterUpgradeBonusHealth.js";
import { CHARACTER_UPGRADE_BONUS_MOVE_SPEED } from "../upgrades/characterUpgradeMoveSpeed.js";
import { levelUpIncreaseExperienceRequirement } from "../../game.js";

export const LEVELING_CLASS_SKILL_POINT_GAIN_EVERY_X_LEVELS = 3;

export type Leveling = {
    level: number,
    leveling?: {
        experience: number,
        experienceForLevelUp: number,
    }
}

export function levelingCharacterAndClassXpGain(state: GameState, experience: number, game: Game, characters: Character[] | undefined = undefined) {
    let playerCharacters = characters ?? getPlayerCharacters(state.players);
    for (let character of playerCharacters) {
        if (character.level?.leveling !== undefined) {
            character.level.leveling.experience += experience * (character.experienceGainFactor ?? 1);
            while (character.level.leveling.experience >= character.level.leveling.experienceForLevelUp) {
                levelingCharacterLevelUp(character, game);
            }
        }
        if (character.characterClasses) {
            for (let charClass of character.characterClasses) {
                if (charClass.capped) continue;
                if (charClass.level?.leveling !== undefined && !charClass.capped) {
                    if (charClass.legendary) {
                        if (charClass.level.level >= charClass.legendary.levelCap) {
                            continue;
                        }
                    }
                    charClass.level.leveling.experience += experience * (character.experienceGainFactor ?? 1);
                    while (charClass.level.leveling.experience >= charClass.level.leveling.experienceForLevelUp) {
                        levelingClassLevelUp(character, charClass, game);
                    }
                }
            }
        }
    }
}

export function changeToLevelingCharacter(character: Character, game: Game) {
    character.level = {
        level: 0,
        leveling: {
            experience: 0,
            experienceForLevelUp: 10,
        }
    };
    character.availableSkillPoints = 0;
}

function levelingCharacterLevelUp(character: Character, game: Game) {
    if (!character.level?.leveling || character.availableSkillPoints === undefined) return;
    character.level.level++;
    character.availableSkillPoints += 1;
    character.level.leveling.experience -= character.level.leveling.experienceForLevelUp;
    levelUpIncreaseExperienceRequirement(character.level);
    fillRandomUpgradeOptionChoices(character, game);
}

function levelingClassLevelUp(character: Character, charClass: CharacterClass, game: Game) {
    if (!charClass.level?.leveling || charClass.availableSkillPoints === undefined) return;
    charClass.level.level++;
    if (charClass.level.level % LEVELING_CLASS_SKILL_POINT_GAIN_EVERY_X_LEVELS === 0) {
        charClass.availableSkillPoints.available += 1;
    }
    charClass.level.leveling.experience -= charClass.level.leveling.experienceForLevelUp;
    levelUpIncreaseExperienceRequirement(charClass.level);
    fillRandomUpgradeOptionChoices(character, game);
}

export function executeLevelingCharacterUpgradeOption(character: Character, upgradeOption: UpgradeOption, game: Game) {
    const charClass = findCharacterClassById(character, upgradeOption.classIdRef!);
    if (!charClass || !charClass.availableSkillPoints || charClass.availableSkillPoints.available <= 0) return;
    if (upgradeOption.type === "Character") {
        const charUpFunctions = CHARACTER_UPGRADE_FUNCTIONS[upgradeOption.identifier];
        if (charUpFunctions) {
            charUpFunctions.executeOption!(upgradeOption, character);
        }
    } else if (upgradeOption.type === "Ability") {
        const abilityUpgradeOption = upgradeOption as AbilityUpgradeOption;
        const ability = character.abilities.find((a) => a.name === abilityUpgradeOption.name
            && (abilityUpgradeOption.classIdRef === undefined || abilityUpgradeOption.classIdRef === a.classIdRef)
        );
        if (ability) {
            const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
            if (abilityFunctions && abilityFunctions.executeUpgradeOption) {
                abilityFunctions.executeUpgradeOption(ability, character, upgradeOption, game);
            }
        }
    }
    charClass.availableSkillPoints.available--;
    charClass.availableSkillPoints.used++;
}

export function findCharacterClassById(character: Character, classId?: number): CharacterClass | undefined {
    if (classId === undefined) return undefined;
    if (character.characterClasses) {
        for (let charClass of character.characterClasses) {
            if (charClass.id === classId) return charClass;
        }
    }
    return undefined;
}