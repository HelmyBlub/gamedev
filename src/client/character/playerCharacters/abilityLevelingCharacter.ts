import { ABILITIES_FUNCTIONS } from "../../ability/ability.js";
import { Game } from "../../gameModel.js";
import { Character } from "../characterModel.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../upgrade.js";

export function executeAbilityLevelingCharacterUpgradeOption(character: Character, upgradeOption: UpgradeOption, game: Game) {
    const abilityUpgradeOption: AbilityUpgradeOption = upgradeOption as AbilityUpgradeOption;
    const functions = ABILITIES_FUNCTIONS[abilityUpgradeOption.name];
    const ability = character.abilities.find((a) => a.name === abilityUpgradeOption.name && a.bossSkillPoints && a.bossSkillPoints.available > 0);
    functions.executeUpgradeOption!(ability!, character, upgradeOption, game);
}

export function createBossUpgradeOptionsAbilityLeveling(character: Character, game: Game): UpgradeOptionAndProbability[] {
    for (let ability of character.abilities) {
        const functions = ABILITIES_FUNCTIONS[ability.name];
        if (ability.bossSkillPoints
            && ability.bossSkillPoints.available > 0
            && functions.createAbilityBossUpgradeOptions
        ) {
            character.upgradeChoices.displayText = `Choose Upgrade for ${ability.name}:`;
            const upgradeOptions = functions.createAbilityBossUpgradeOptions(ability, character, game);
            if (ability.classIdRef !== undefined) {
                for (let option of upgradeOptions) {
                    option.option.classIdRef = ability.classIdRef;
                }
            }
            return upgradeOptions;
        }
    }
    return [];
}
