import { ABILITIES_FUNCTIONS } from "../../ability/ability.js";
import { Game } from "../../gameModel.js";
import { moveCharacterTick, turnCharacterToPet } from "../character.js";
import { Character, CHARACTER_TYPE_FUNCTIONS } from "../characterModel.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../upgrade.js";

export type AbilityLevelingCharacter = Character & {
}

export const ABILITY_LEVELING_CHARACTER = "abilityLevelingCharacter";

export function addAbilityLevelingCharacter(){
    CHARACTER_TYPE_FUNCTIONS[ABILITY_LEVELING_CHARACTER] = {
        tickFunction: tickAbilityLevelingCharacter,
        createBossUpgradeOptions: createBossUpgradeOptionsAbilityLeveling,
        executeUpgradeOption: executeAbilityLevelingCharacterUpgradeOption,
    }
}

function executeAbilityLevelingCharacterUpgradeOption(character: Character, upgradeOption: UpgradeOption, game: Game){
    const abilityUpgradeOption: AbilityUpgradeOption = upgradeOption as AbilityUpgradeOption;
    const functions = ABILITIES_FUNCTIONS[abilityUpgradeOption.name];
    const ability = character.abilities.find((a) => a.name === abilityUpgradeOption.name);
    functions.executeUpgradeOption!(ability! ,character, upgradeOption, game);
}

function createBossUpgradeOptionsAbilityLeveling(character: Character, game: Game): UpgradeOptionAndProbability[]{
    for(let ability of character.abilities){
        const functions = ABILITIES_FUNCTIONS[ability.name];
        if(ability.bossSkillPoints && ability.bossSkillPoints > 0 && functions.createAbilityBossUpgradeOptions){
            return functions.createAbilityBossUpgradeOptions(ability);
        }
    }
    return [];
}

function tickAbilityLevelingCharacter(character: AbilityLevelingCharacter, game: Game) {
    if (character.isDead) {
        if(!character.willTurnToPetOnDeath) return;
        turnCharacterToPet(character, game);
    }
    moveCharacterTick(character, game.state.map, game.state.idCounter);
}