import { Ability } from "../../../ability/ability.js";
import { AbilityUpgrade } from "../../../ability/abilityUpgrade.js";
import { Game } from "../../../gameModel.js";
import { Character } from "../../characterModel.js";
import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../upgrade.js";
import { ABILITY_SPELLMAKER_UPGRADE_FUNCTIONS, AbilitySpellmaker } from "./abilitySpellmaker.js";
import { SPELLMAKER_MOVE_TOOLS_FUNCTIONS, SPELLMAKER_TOOL_SWITCH_STAGE, SPELLMAKER_TOOLS_FUNCTIONS } from "./spellmakerTool.js";


type AbilitySpellmakerUpgradeTools = AbilityUpgrade & {
}

export const ABILITY_SPELLMAKER_UPGRADE_TOOLS = "Upgrade Tools";

export function addAbilitySpellmakerUpgradeTools() {
    ABILITY_SPELLMAKER_UPGRADE_FUNCTIONS[ABILITY_SPELLMAKER_UPGRADE_TOOLS] = {
        getStatsDisplayText: getAbilityUpgradeUiText,
        getOptions: getOptions,
        executeOption: executeOption,
    }
}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options: UpgradeOptionAndProbability[] = [];
    const abilitySm = ability as AbilitySpellmaker;
    const isFirstUpgradeChoice = (ability.bossSkillPoints && ability.bossSkillPoints.used <= 0) ? true : false;
    for (let key of Object.keys(SPELLMAKER_TOOLS_FUNCTIONS)) {
        if (abilitySm.createTools.createTools.find(ct => ct.type === key)) continue;
        const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[key];
        if (!toolFunctions.learnedThroughUpgrade) continue;
        if (isFirstUpgradeChoice && !toolFunctions.availableOnFirstUpgradeChoice) continue;
        const option: AbilityUpgradeOption = {
            displayText: key,
            identifier: ABILITY_SPELLMAKER_UPGRADE_TOOLS,
            additionalInfo: key,
            name: ability.name,
            type: "Ability",
            boss: true,
        }
        option.displayMoreInfoText = SPELLMAKER_TOOLS_FUNCTIONS[key].description;
        options.push({
            option: option,
            probability: 1,
        });
    }
    for (let key of Object.keys(SPELLMAKER_MOVE_TOOLS_FUNCTIONS)) {
        if (isFirstUpgradeChoice) break;
        if (abilitySm.createTools.createTools.find(ct => ct.type === key)) continue;
        const toolFunctions = SPELLMAKER_MOVE_TOOLS_FUNCTIONS[key];
        if (!toolFunctions.learnedThroughUpgrade) continue;

        const option: AbilityUpgradeOption = {
            displayText: key,
            identifier: ABILITY_SPELLMAKER_UPGRADE_TOOLS,
            additionalInfo: key,
            name: ability.name,
            type: "Ability",
            boss: true,
        }
        option.displayMoreInfoText = SPELLMAKER_MOVE_TOOLS_FUNCTIONS[key].description;
        options.push({
            option: option,
            probability: 1,
        });
    }
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption, character: Character, game: Game) {
    const spellmaker = ability as AbilitySpellmaker;
    if (!game.ctx || !option.additionalInfo) return;
    if (spellmaker.createTools.createTools.find(ct => ct.type === option.additionalInfo)) return;
    if (SPELLMAKER_TOOLS_FUNCTIONS[option.additionalInfo]) {
        const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[option.additionalInfo];
        spellmaker.createTools.createTools.push(toolFunctions.createTool(game.ctx));
        if (toolFunctions.canHaveNextStage) {
            if (!spellmaker.createTools.createTools.find(ct => ct.type === SPELLMAKER_TOOL_SWITCH_STAGE)) {
                const toolStagingFunctions = SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_SWITCH_STAGE];
                spellmaker.createTools.createTools.unshift(toolStagingFunctions.createTool(game.ctx));
            }

        }
    } else if (SPELLMAKER_MOVE_TOOLS_FUNCTIONS[option.additionalInfo]) {
        spellmaker.createTools.createTools.push(SPELLMAKER_MOVE_TOOLS_FUNCTIONS[option.additionalInfo].createTool(game.ctx));
    }
}

function getAbilityUpgradeUiText(ability: Ability): string {
    const up: AbilitySpellmakerUpgradeTools = ability.upgrades[ABILITY_SPELLMAKER_UPGRADE_TOOLS];
    return `${ABILITY_SPELLMAKER_UPGRADE_TOOLS}: ${(up.level)}`;
}
