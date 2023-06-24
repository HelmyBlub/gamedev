import { addAbilityToCharacter, createAbility } from "../../ability/ability.js";
import { createAbilityHpRegen } from "../../ability/abilityHpRegen.js";
import { Game, IdCounter } from "../../gameModel.js";
import { CHARACTER_TYPE_FUNCTIONS, Character } from "../characterModel.js";
import { PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "./playerCharacters.js";
import { createAbilityLeash } from "../../ability/abilityLeash.js";
import { ABILITY_NAME_MELEE } from "../../ability/abilityMelee.js";
import { TAMER_PET_CHARACTER, TamerPetCharacter, createTamerPetCharacter, tickTamerPetCharacter } from "./tamerPetCharacter.js";
import { ABILITY_NAME_FEED_PET } from "../../ability/abilityFeedPet.js";
import { tickDefaultCharacter } from "../character.js";
import { CharacterUpgradeOption } from "../characterUpgrades.js";
import { ABILITY_NAME_FIRE_CIRCLE } from "../../ability/abilityFireCircle.js";
import { ABILITY_NAME_SHOOT } from "../../ability/abilityShoot.js";
import { ABILITY_NAME_ICE_AURA } from "../../ability/abilityIceAura.js";
import { ABILITY_NAME_SWORD } from "../../ability/abilitySword.js";

export const TAMER_CHARACTER = "Tamer(Work in Progress)";
export function addTamerClass() {
    PLAYER_CHARACTER_CLASSES_FUNCTIONS[TAMER_CHARACTER] = {
        changeCharacterToThisClass: changeCharacterToTamerClass
    }
    CHARACTER_TYPE_FUNCTIONS[TAMER_CHARACTER] = {
        tickFunction: tickDefaultCharacter,
        createBossUpgradeOptions: createTamerBossUpgradeOptions,
    }
    CHARACTER_TYPE_FUNCTIONS[TAMER_PET_CHARACTER] = {
        tickPetFunction: tickTamerPetCharacter
    }
}

function changeCharacterToTamerClass(
    character: Character,
    idCounter: IdCounter,
    game: Game,
) {
    character.type = TAMER_CHARACTER;
    addAbilityToCharacter(character, createAbilityHpRegen(idCounter));
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_FEED_PET, idCounter, false, false, "ability1"));
    addPetToTamer(character, "blue", game);
    addPetToTamer(character, "green", game);
    addPetToTamer(character, "black", game);
}

function createTamerBossUpgradeOptions (character: Character, game: Game): CharacterUpgradeOption[]{
    const options: CharacterUpgradeOption[] = [];
    if(!character.pets) return options;
    for(let pet of character.pets){
        if(pet.bossSkillPoints && pet.bossSkillPoints > 0){
            pushUpgradeOptionForAbilitName(pet, ABILITY_NAME_FIRE_CIRCLE, options, game);
            pushUpgradeOptionForAbilitName(pet, ABILITY_NAME_SHOOT, options, game);
            pushUpgradeOptionForAbilitName(pet, ABILITY_NAME_ICE_AURA, options, game);
            pushUpgradeOptionForAbilitName(pet, ABILITY_NAME_SWORD, options, game);

            return options;
        }
    }
    return options;
}

function pushUpgradeOptionForAbilitName(pet: TamerPetCharacter, abilityName:string, options: CharacterUpgradeOption[], game: Game){
    if(pet.abilities.find((a) => a.name === abilityName) === undefined){
        options.push({
            name: `${abilityName} for ${pet.color}`, probabilityFactor: 1, upgrade: (c: Character) => {
                const ability = createAbility(abilityName, game.state.idCounter, false);
                ability.passive = true;
                pet.abilities.push(ability);
                pet.bossSkillPoints!--;
            }
        });                
    }
}


function addPetToTamer(character: Character, color: string, game: Game) {
    if (character.pets === undefined) character.pets = [];
    const pet: TamerPetCharacter = createTamerPetCharacter(character, color, game);
    pet.abilities.push(createAbilityLeash(game.state.idCounter, undefined, 100, character.id));
    pet.abilities.push(createAbility(ABILITY_NAME_MELEE, game.state.idCounter, false));

    character.pets.push(pet);
}
