import { ABILITIES_FUNCTIONS, addAbilityToCharacter, createAbility } from "../../ability/ability.js";
import { createAbilityHpRegen } from "../../ability/abilityHpRegen.js";
import { Game, IdCounter } from "../../gameModel.js";
import { CHARACTER_TYPE_FUNCTIONS, Character } from "../characterModel.js";
import { PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "./playerCharacters.js";
import { ABILITY_NAME_LEASH, AbilityLeash, createAbilityLeash } from "../../ability/abilityLeash.js";
import { ABILITY_NAME_MELEE } from "../../ability/abilityMelee.js";
import { TAMER_PET_CHARACTER, TAMER_PET_TRAITS, TamerPetCharacter, Trait, addTraitToTamerPet, createTamerPetCharacter, paintTamerPetCharacter, tickTamerPetCharacter } from "./tamerPetCharacter.js";
import { ABILITY_NAME_FEED_PET } from "../../ability/petTamer/abilityFeedPet.js";
import { tickDefaultCharacter } from "../character.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { ABILITY_NAME_LOVE_PET } from "../../ability/petTamer/abilityLovePet.js";
import { ABILITY_NAME_PET_BREATH } from "../../ability/petTamer/abilityPetBreath.js";
import { ABILITY_NAME_PET_PAINTER } from "../../ability/petTamer/abilityPetPainter.js";
import { ABILITY_NAME_PET_DASH } from "../../ability/petTamer/abilityPetDash.js";
import { AbilityUpgradeOption, PetAbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../upgrade.js";

export const TAMER_CHARACTER = "Tamer(Work in Progress)";
export function addTamerClass() {
    PLAYER_CHARACTER_CLASSES_FUNCTIONS[TAMER_CHARACTER] = {
        changeCharacterToThisClass: changeCharacterToTamerClass
    }
    CHARACTER_TYPE_FUNCTIONS[TAMER_CHARACTER] = {
        tickFunction: tickDefaultCharacter,
        createBossUpgradeOptions: createTamerBossUpgradeOptions,
        executeUpgradeOption: executeTamerBossUpgradeOption,
    }
    CHARACTER_TYPE_FUNCTIONS[TAMER_PET_CHARACTER] = {
        tickPetFunction: tickTamerPetCharacter,
        paintCharacterType: paintTamerPetCharacter,
    }
}

function changeCharacterToTamerClass(
    character: Character,
    idCounter: IdCounter,
    game: Game,
) {
    character.type = TAMER_CHARACTER;
    character.moveSpeed *= 1.2;
    character.maxHp *= 1.5;
    character.hp *= 1.5;
    addAbilityToCharacter(character, createAbilityHpRegen(idCounter));
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_FEED_PET, idCounter, false, false, "ability1"));
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_LOVE_PET, idCounter, false, false, "ability2"));
    addPetToTamer(character, "blue", game);
    addPetToTamer(character, "green", game);
    addPetToTamer(character, "black", game);

    // const ability = createAbility(ABILITY_NAME_PET_PAINTER, game.state.idCounter, false);
    // ability.upgrades[ABILITY_PET_PAINTER_UPGARDE_DUPLICATE] = {level:1};
    // character.pets![0].abilities.push(ability);
}

function executeTamerBossUpgradeOption(character: Character, upgradeOption: UpgradeOption, game: Game){
    if(upgradeOption.type === "Pet"){
        let upgradeValues = upgradeNameToValues(upgradeOption.identifier);
        const ability = createAbility(upgradeValues.abilityName, game.state.idCounter, false);
        const pet: TamerPetCharacter = character.pets!.find((p) => p.color === upgradeValues.petName)!;
        ability.passive = true;
        pet.abilities.push(ability);
        addTraitToTamerPet(pet, upgradeValues.trait, game);
        pet.bossSkillPoints!--;
        if (upgradeValues.abilityName === ABILITY_NAME_PET_PAINTER) {
            let leash: AbilityLeash | undefined = pet.abilities.find(a => a.name === ABILITY_NAME_LEASH) as AbilityLeash;
            if (leash) leash.leashMaxLength += 100;
        }
    }else if(upgradeOption.type === "PetAbility"){
        const option = upgradeOption as PetAbilityUpgradeOption;
        const pet: TamerPetCharacter = character.pets!.find((p) => p.id === option.petId)!;
        const ability = pet.abilities.find((a) => a.name === option.abilityName)!;
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        const upgradeFunctions = abilityFunctions.abilityUpgradeFunctions![upgradeOption.identifier];
        if(option.additionalInfo){
            const trait = option.additionalInfo as Trait;
            addTraitToTamerPet(pet, trait, game);
        }
        upgradeFunctions.executeOption(ability, upgradeOption as AbilityUpgradeOption);
        pet.bossSkillPoints!--;
    }
}

function createTamerBossUpgradeOptions(character: Character, game: Game): UpgradeOptionAndProbability[] {
    const options: UpgradeOptionAndProbability[] = [];
    const numberChoices = 3;
    if (!character.pets) return options;
    for (let pet of character.pets) {
        if (pet.bossSkillPoints && pet.bossSkillPoints > 0) {
            const availableTraits = getAvailablePetTraits(pet);
            const availableAbilties = getAvailablePetAbilities(character, pet);

            if(availableAbilties.length > 0){
                while (options.length < numberChoices) {
                    for (let ability of availableAbilties) {
                        const randomTraitIndex = Math.floor(nextRandom(game.state.randomSeed) * availableTraits.length);
                        const trait = availableTraits[randomTraitIndex] as Trait;
                        availableTraits.splice(randomTraitIndex,1);
                        const indentifier = valuesToUpgradeName(pet.color, ability, trait);
                        let option: UpgradeOptionAndProbability = {
                            option: {
                                type: "Pet",
                                identifier: indentifier,
                                displayText: indentifier,
                                boss: true,
                            },
                            probability: 1,
                        }
                        options.push(option);
                    }
                }
                return options;
            }else{
                for(let ability of pet.abilities){
                    const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
                    if(abilityFunctions && abilityFunctions.createAbilityBossUpgradeOptions){
                        while (options.length < numberChoices) {
                            let abilityOptionsAndProbability = abilityFunctions.createAbilityBossUpgradeOptions(ability);
                            if(abilityOptionsAndProbability.length === 0) break;
                            for(let opProb of abilityOptionsAndProbability){
                                let abilityOption = opProb.option as AbilityUpgradeOption;
                                let petOption = opProb.option as PetAbilityUpgradeOption;
                                petOption.abilityName = abilityOption.name;
                                petOption.petId = pet.id;
                                petOption.type = "PetAbility";

                                if(availableTraits.length > 0){
                                    const randomTraitIndex = Math.floor(nextRandom(game.state.randomSeed) * availableTraits.length);
                                    const trait = availableTraits[randomTraitIndex] as Trait;    
                                    availableTraits.splice(randomTraitIndex,1);
                                    petOption.additionalInfo = trait;
                                    petOption.displayText += " & " + trait;
                                    if(petOption.displayLongText) petOption.displayLongText.push(trait)
                                }
                                options.push(opProb);
                                if(options.length >= numberChoices) return options;
                            }
                        }
                    }
                    if(options.length > 0) return options;
                }
            }
        }
    }
    return options;
}

function getAvailablePetAbilities(character: Character, pet: TamerPetCharacter): string[] {
    const availableAbilityNames: string[] = [];
    const possibleAbilityNames = [
        // ABILITY_NAME_ICE_AURA,
        // ABILITY_NAME_SWORD,
        // ABILITY_NAME_FIRE_CIRCLE,
        // ABILITY_NAME_SHOOT,
        ABILITY_NAME_PET_BREATH,
        ABILITY_NAME_PET_PAINTER,
        ABILITY_NAME_PET_DASH
    ]

    for (let abilityName of possibleAbilityNames) {
        let available = true;
        for (let pet of character.pets!) {
            if (pet.abilities.find((a) => a.name === abilityName)) {
                available = false;
                break;
            }
        }
        if (available) availableAbilityNames.push(abilityName);
    }

    return availableAbilityNames;
}


function getAvailablePetTraits(pet: TamerPetCharacter): string[] {
    const availableTrais: string[] = [];

    for (let trait of TAMER_PET_TRAITS) {
        if (!pet.traits.find((a) => a === trait)) {
            availableTrais.push(trait);
        }
    }

    return availableTrais;
}

function upgradeNameToValues(upgradeName: string): { petName: string, abilityName: string, trait: Trait } {
    const seperator1 = upgradeName.indexOf(" & ");
    const seperator2 = upgradeName.indexOf(" for ");
    return {
        abilityName: upgradeName.substring(0, seperator1),
        trait: upgradeName.substring(seperator1 + 3, seperator2) as Trait,
        petName: upgradeName.substring(seperator2 + 5),
    }
}

function valuesToUpgradeName(petName: string, abilityName: string, trait: string) {
    return `${abilityName} & ${trait} for ${petName}`;
}

function addPetToTamer(character: Character, color: string, game: Game) {
    if (character.pets === undefined) character.pets = [];
    const pet: TamerPetCharacter = createTamerPetCharacter(character, color, game);
    pet.abilities.push(createAbilityLeash(game.state.idCounter, undefined, 100, character.id));
    pet.abilities.push(createAbility(ABILITY_NAME_MELEE, game.state.idCounter, false));

    character.pets.push(pet);
}
