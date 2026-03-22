import { Ability } from "../../../ability/ability.js";
import { AbilityUpgrade } from "../../../ability/abilityUpgrade.js";
import { deepCopy } from "../../../game.js";
import { Game } from "../../../gameModel.js";
import { Character } from "../../characterModel.js";
import { AbilityUpgradeOption, UpgradeOptionAndProbability } from "../../upgrade.js";
import { ABILITY_SPELLMAKER_UPGRADE_FUNCTIONS, AbilitySpellmaker, SPELLMAKER_SPELLTYPES, SpellmakerCreateToolObjectData } from "./abilitySpellmaker.js";
import { SPELLMAKER_DEBUFF_TOOLS_FUNCTIONS, SPELLMAKER_MOVE_TOOLS_FUNCTIONS, SPELLMAKER_TOOL_SPELL_TYPE, SPELLMAKER_TOOL_SWITCH_STAGE, SPELLMAKER_TOOLS_FUNCTIONS, SpellmakerCreateTool } from "./spellmakerTool.js";


type AbilitySpellmakerUpgradeTools = AbilityUpgrade & {
}

export const ABILITY_SPELLMAKER_UPGRADE_TOOLS = "Upgrade Tools";

export function addAbilitySpellmakerUpgradeTools() {
    ABILITY_SPELLMAKER_UPGRADE_FUNCTIONS[ABILITY_SPELLMAKER_UPGRADE_TOOLS] = {
        getOptions: getOptions,
        executeOption: executeOption,
    }
}

function getOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const options: UpgradeOptionAndProbability[] = [];
    const abilitySm = ability as AbilitySpellmaker;
    const isFirstUpgradeChoice = (ability.bossSkillPoints && ability.bossSkillPoints.used < 0) ? true : false;
    for (let key of Object.keys(SPELLMAKER_TOOLS_FUNCTIONS)) {
        const toolFunctions = SPELLMAKER_TOOLS_FUNCTIONS[key];
        const moreInfoText = deepCopy(SPELLMAKER_TOOLS_FUNCTIONS[key].description);
        let probability = 1;
        let displayText = key;
        const tool = abilitySm.createTools.createTools.find(ct => ct.type === key);
        if (tool) {
            if (toolFunctions.doesDamage) {
                displayText += `+${tool.upgrades! + 1}`;
                moreInfoText.splice(1, 0, `Bonus Damage: ${(tool.upgrades! + 1) * 10}%, up from ${tool.upgrades! * 10}%`);
                probability = 0.1;
            } else {
                continue;
            }
        }
        if (!toolFunctions.learnedThroughUpgrade) continue;
        if (isFirstUpgradeChoice && !toolFunctions.doesDamage) continue;
        const option: AbilityUpgradeOption = {
            displayText: displayText,
            identifier: ABILITY_SPELLMAKER_UPGRADE_TOOLS,
            additionalInfo: key,
            name: ability.name,
            type: "Ability",
            boss: true,
        }
        option.displayMoreInfoText = moreInfoText;
        options.push({
            option: option,
            probability: probability,
        });
    }
    if (!isFirstUpgradeChoice) {
        for (let key of Object.keys(SPELLMAKER_MOVE_TOOLS_FUNCTIONS)) {
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
        for (let key of Object.keys(SPELLMAKER_DEBUFF_TOOLS_FUNCTIONS)) {
            if (abilitySm.createTools.createTools.find(ct => ct.type === key)) continue;
            const toolFunctions = SPELLMAKER_DEBUFF_TOOLS_FUNCTIONS[key];
            if (!toolFunctions.learnedThroughUpgrade) continue;

            const option: AbilityUpgradeOption = {
                displayText: key,
                identifier: ABILITY_SPELLMAKER_UPGRADE_TOOLS,
                additionalInfo: key,
                name: ability.name,
                type: "Ability",
                boss: true,
            }
            option.displayMoreInfoText = SPELLMAKER_DEBUFF_TOOLS_FUNCTIONS[key].description;
            options.push({
                option: option,
                probability: 1,
            });
        }
        for (let spelltype of SPELLMAKER_SPELLTYPES) {
            if (abilitySm.availableSpellTypes.find(st => st.type === spelltype.name)) continue;
            const option: AbilityUpgradeOption = {
                displayText: spelltype.name,
                identifier: ABILITY_SPELLMAKER_UPGRADE_TOOLS,
                additionalInfo: spelltype.name,
                name: ability.name,
                type: "Ability",
                boss: true,
            }
            option.displayMoreInfoText = [
                `Add Spelltype: ${spelltype.name}`,
                ...spelltype.description,
            ];
            options.push({
                option: option,
                probability: 1,
            });

        }
    }
    return options;
}

function executeOption(ability: Ability, option: AbilityUpgradeOption, character: Character, game: Game) {
    const spellmaker = ability as AbilitySpellmaker;
    if (!game.ctx || !option.additionalInfo) return;
    const tool = spellmaker.createTools.createTools.find(ct => ct.type === option.additionalInfo);
    if (tool) {
        if (tool.upgrades !== undefined) {
            tool.upgrades++;
            updateExistingCreatedObjectsUpgradeCounts(ability, tool);
        }
        return;
    }
    if (spellmaker.bossSkillPoints?.used === -1) {
        if (spellmaker.createTools.selectedToolIndex === 0) {
            spellmaker.createTools.selectedToolIndex = spellmaker.createTools.createTools.length;
        }
        spellmaker.mode = "spellmake";
    }
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
    } else if (SPELLMAKER_DEBUFF_TOOLS_FUNCTIONS[option.additionalInfo]) {
        spellmaker.createTools.createTools.push(SPELLMAKER_DEBUFF_TOOLS_FUNCTIONS[option.additionalInfo].createTool(game.ctx));
    } else {
        const spelltypeData = SPELLMAKER_SPELLTYPES.find(st => st.name === option.additionalInfo);
        if (spelltypeData) {
            spellmaker.availableSpellTypes.push({ type: option.additionalInfo, data: { totalDamage: 0, level: 0 } });
            if (!spellmaker.createTools.createTools.find(ct => ct.type === SPELLMAKER_TOOL_SPELL_TYPE)) {
                const toolSepllTypeFunctions = SPELLMAKER_TOOLS_FUNCTIONS[SPELLMAKER_TOOL_SPELL_TYPE];
                spellmaker.createTools.createTools.unshift(toolSepllTypeFunctions.createTool(game.ctx));
            }
        }
    }
}


function updateExistingCreatedObjectsUpgradeCounts(ability: Ability, tool: SpellmakerCreateTool) {
    const spellmaker = ability as AbilitySpellmaker;
    for (let spell of spellmaker.spells) {
        recursiveUpdateExistingCreatedObjectsUpgradeCounts(spell.createdObjects, tool);
    }
}

function recursiveUpdateExistingCreatedObjectsUpgradeCounts(createdObjects: SpellmakerCreateToolObjectData[], tool: SpellmakerCreateTool) {
    for (let object of createdObjects) {
        if (object.type === tool.type) object.typeUpgradedCount = tool.upgrades;
        if (object.nextStage) recursiveUpdateExistingCreatedObjectsUpgradeCounts(object.nextStage, tool);
    }
}