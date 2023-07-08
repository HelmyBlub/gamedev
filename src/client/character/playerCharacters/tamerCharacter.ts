import { addAbilityToCharacter, createAbility } from "../../ability/ability.js";
import { createAbilityHpRegen } from "../../ability/abilityHpRegen.js";
import { Game, IdCounter } from "../../gameModel.js";
import { CHARACTER_TYPE_FUNCTIONS, Character } from "../characterModel.js";
import { PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "./playerCharacters.js";
import { createAbilityLeash } from "../../ability/abilityLeash.js";
import { ABILITY_NAME_MELEE } from "../../ability/abilityMelee.js";
import { TAMER_PET_CHARACTER, TAMER_PET_TRAITS, TamerPetCharacter, Trait, createTamerPetCharacter, paintTamerPetCharacter, tickTamerPetCharacter } from "./tamerPetCharacter.js";
import { ABILITY_NAME_FEED_PET } from "../../ability/petTamer/abilityFeedPet.js";
import { tickDefaultCharacter } from "../character.js";
import { CharacterUpgradeChoice, CharacterUpgradeOption } from "../characterUpgrades.js";
import { ABILITY_NAME_FIRE_CIRCLE } from "../../ability/abilityFireCircle.js";
import { ABILITY_NAME_SHOOT } from "../../ability/abilityShoot.js";
import { ABILITY_NAME_ICE_AURA } from "../../ability/abilityIceAura.js";
import { ABILITY_NAME_SWORD } from "../../ability/abilitySword.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { ABILITY_NAME_LOVE_PET } from "../../ability/petTamer/abilityLovePet.js";
import { ABILITY_NAME_PET_BREATH } from "../../ability/petTamer/abilityPetBreath.js";
import { ABILITY_NAME_PET_PAINTER } from "../../ability/petTamer/abilityPetPainter.js";

export const TAMER_CHARACTER = "Tamer(Work in Progress)";
export function addTamerClass() {
    PLAYER_CHARACTER_CLASSES_FUNCTIONS[TAMER_CHARACTER] = {
        changeCharacterToThisClass: changeCharacterToTamerClass
    }
    CHARACTER_TYPE_FUNCTIONS[TAMER_CHARACTER] = {
        tickFunction: tickDefaultCharacter,
        createBossUpgradeOptions: createTamerBossUpgradeOptions,
        getUpgradeOptionByUpgradeChoice: getCharacterUpgradeOptionByChoice,
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
    // character.pets![0].abilities.push(ability);
}

function getCharacterUpgradeOptionByChoice(character: Character, characterUpgradeChoice: CharacterUpgradeChoice, game: Game): CharacterUpgradeOption | undefined {
    let values = upgradeNameToValues(characterUpgradeChoice.name);
    let pet = character.pets!.find((p) => p.color === values.petName);
    return getUpgradeOptionForAbilitNameAndTrait(pet!, values.abilityName, values.trait, game);
}

function createTamerBossUpgradeOptions(character: Character, game: Game): CharacterUpgradeOption[] {
    const options: CharacterUpgradeOption[] = [];
    if (!character.pets) return options;
    for (let pet of character.pets) {
        if (pet.bossSkillPoints && pet.bossSkillPoints > 0) {
            const availableTraits = getAvailablePetTraits(pet);
            const availableAbilties = getAvailablePetAbilities(character, pet);

            for (let ability of availableAbilties) {
                const randomTraitIndex = Math.floor(nextRandom(game.state.randomSeed) * availableTraits.length);
                const option = getUpgradeOptionForAbilitNameAndTrait(pet, ability, availableTraits[randomTraitIndex] as Trait, game);
                options.push(option);
            }
            return options;
        }
    }
    return options;
}

function getAvailablePetAbilities(character: Character, pet: TamerPetCharacter): string[] {
    const availableAbilityNames: string[] = [];
    const possibleAbilityNames = [
        ABILITY_NAME_ICE_AURA,
        ABILITY_NAME_SWORD,
        ABILITY_NAME_PET_BREATH,
        ABILITY_NAME_SHOOT,
        ABILITY_NAME_FIRE_CIRCLE,
        ABILITY_NAME_PET_PAINTER
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

function getUpgradeOptionForAbilitNameAndTrait(pet: TamerPetCharacter, abilityName: string, trait: Trait, game: Game): CharacterUpgradeOption {
    const upgradeName = valuesToUpgradeName(pet.color, abilityName, trait);
    return {
        name: upgradeName, probabilityFactor: 1, upgrade: (c: Character) => {
            const ability = createAbility(abilityName, game.state.idCounter, false);
            ability.passive = true;
            pet.abilities.push(ability);
            pet.traits.push(trait);
            pet.bossSkillPoints!--;
        }
    };
}


function addPetToTamer(character: Character, color: string, game: Game) {
    if (character.pets === undefined) character.pets = [];
    const pet: TamerPetCharacter = createTamerPetCharacter(character, color, game);
    pet.abilities.push(createAbilityLeash(game.state.idCounter, undefined, 100, character.id));
    pet.abilities.push(createAbility(ABILITY_NAME_MELEE, game.state.idCounter, false));

    character.pets.push(pet);
}
