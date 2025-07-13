import { ABILITIES_FUNCTIONS, addAbilityToCharacter, createAbility, setAbilityToBossLevel } from "../../../ability/ability.js";
import { createAbilityHpRegen } from "../../../ability/abilityHpRegen.js";
import { FACTION_ENEMY, Game, IdCounter, Position } from "../../../gameModel.js";
import { CHARACTER_TYPE_FUNCTIONS, Character, IMAGE_SLIME, createCharacter } from "../../characterModel.js";
import { CharacterClass, PLAYER_CHARACTER_CLASSES_FUNCTIONS, paintPlayerPetLevelUI } from "../playerCharacters.js";
import { ABILITY_NAME_LEASH, AbilityLeash, createAbilityLeash } from "../../../ability/abilityLeash.js";
import { ABILITY_NAME_MELEE, createAbilityMelee } from "../../../ability/abilityMelee.js";
import { TAMER_PET_CHARACTER, TamerPetCharacter, addTamerPetFunctions, createTamerPetCharacter } from "./tamerPetCharacter.js";
import { ABILITY_NAME_FEED_PET } from "../../../ability/petTamer/abilityFeedPet.js";
import { resetCharacter, tickDefaultCharacter } from "../../character.js";
import { RandomSeed, nextRandom } from "../../../randomNumberGenerator.js";
import { ABILITY_NAME_LOVE_PET } from "../../../ability/petTamer/abilityLovePet.js";
import { ABILITY_NAME_PET_BREATH } from "../../../ability/petTamer/abilityPetBreath.js";
import { ABILITY_NAME_PET_PAINTER } from "../../../ability/petTamer/abilityPetPainter.js";
import { ABILITY_NAME_PET_DASH } from "../../../ability/petTamer/abilityPetDash.js";
import { AbilityUpgradeOption, PetAbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../../upgrade.js";
import { addTraitToTamerPet, getAvailableTamerPetTraits, getMoreInfoTextForTamerPetTrait } from "./petTrait.js";
import { changeCharacterAndAbilityIds, deepCopy, getNextId, modulo } from "../../../game.js";
import { CHARACTER_TYPE_BOSS_ENEMY, calculateBossEnemyExperienceWorth } from "../../enemy/bossEnemy.js";
import { AbilityUpgrade } from "../../../ability/abilityUpgrade.js";
import { ABILITY_NAME_UNLEASH_PET } from "../../../ability/petTamer/abilityUnleashPet.js";
import { characterCreateAndAddUpgradeBonusHp } from "../../upgrades/characterUpgradeBonusHealth.js";
import { characterCreateAndAddUpgradeBonusSpeed } from "../../upgrades/characterUpgradeMoveSpeed.js";
import { findPlayerByCharacterId } from "../../../player.js";
import { addCharacterUpgrades } from "../../upgrades/characterUpgrades.js";
import { ABILITY_NAME_PET_BOOMERANG } from "../../../ability/petTamer/abilityPetBoomerang.js";
import { ABILITY_NAME_PET_BOMBARD } from "../../../ability/petTamer/abilityPetBombard.js";

export const CHARACTER_CLASS_TAMER = "Tamer";
export function addTamerClass() {
    PLAYER_CHARACTER_CLASSES_FUNCTIONS[CHARACTER_CLASS_TAMER] = {
        changeCharacterToThisClass: changeCharacterToTamerClass,
        createBossBasedOnClassAndCharacter: createBossBasedOnClassAndCharacter,
        createBossUpgradeOptions: createTamerBossUpgradeOptions,
        executeUpgradeOption: executeTamerBossUpgradeOption,
        getMoreInfosText: getLongUiText,
        kingModification: kingModification,
        paintLevelUI: paintLevelUI,
    }
    CHARACTER_TYPE_FUNCTIONS[CHARACTER_CLASS_TAMER] = {
        tickFunction: tickDefaultCharacter,
    }
    addTamerPetFunctions();
}

function kingModification(character: Character, characterClass: CharacterClass) {
    if (!character.pets) return;
    for (let char of character.pets) {
        const pet = char as TamerPetCharacter;
        if (pet.classIdRef !== characterClass.id) continue;
        const leash = pet.abilities.find((a) => a.name === ABILITY_NAME_LEASH) as AbilityLeash;
        if (!leash) continue;
        const isPainter = pet.abilities.find((a) => a.name === ABILITY_NAME_PET_PAINTER) != undefined;
        if (isPainter) {
            leash.leashedToOwnerId = undefined;
        } else if (!isPainter) {
            leash.leashedToOwnerId = character.id;
        }
    }
}

export function createPetsBasedOnLevelAndCharacter(basedOnCharacter: Character, level: number, petOwner: Character, game: Game): TamerPetCharacter[] {
    const randomPetIndex = Math.floor(nextRandom(game.state.randomSeed) * basedOnCharacter.pets!.length);
    const pet: TamerPetCharacter = deepCopy(basedOnCharacter.pets![randomPetIndex]);
    pet.x = petOwner.x;
    pet.y = petOwner.y;
    pet.faction = petOwner.faction;
    if (level === 1) {
        for (let i = pet.abilities.length - 1; i >= 0; i--) {
            const ability = pet.abilities[i];
            if (ability.name !== ABILITY_NAME_MELEE && ability.name !== ABILITY_NAME_LEASH) {
                pet.abilities.splice(i, 1);
            }
        }
    } else {
        const petLevel = calculatePetLevel(pet);
        if (petLevel > level) {
            reducePetLevel(pet, petLevel - level);
        }
    }
    changeCharacterAndAbilityIds(pet, game.state.idCounter);
    for (let ability of pet.abilities) {
        setAbilityToBossLevel(ability, level);
        if (ability.name === ABILITY_NAME_LEASH) {
            const abilityLeash = ability as AbilityLeash;
            abilityLeash.leashedToOwnerId = petOwner.id;
        }
    }
    resetCharacter(pet, game);

    return [pet];
}

function paintLevelUI(ctx: CanvasRenderingContext2D, character: Character, charClass: CharacterClass, topLeft: Position, width: number, height: number, game: Game) {
    const tempTopLeft = { x: topLeft.x, y: topLeft.y };
    const tempWidth = Math.floor(width / 3);
    if (!character.pets) return;
    for (let petChar of character.pets) {
        if (petChar.type !== TAMER_PET_CHARACTER) continue;
        const tamerPet = petChar as TamerPetCharacter;
        if (tamerPet.classIdRef !== charClass.id) continue;
        paintPlayerPetLevelUI(ctx, tamerPet, tempTopLeft, tempWidth, height, game);
        tempTopLeft.x += tempWidth;
    }
}

function changeCharacterToTamerClass(
    character: Character,
    idCounter: IdCounter,
    game: Game,
) {
    if (!character.characterClasses) character.characterClasses = [];
    const charClass: CharacterClass = {
        className: CHARACTER_CLASS_TAMER,
        id: getNextId(game.state.idCounter),
    };
    character.characterClasses.push(charClass);
    characterCreateAndAddUpgradeBonusSpeed(charClass, character, 0.5);
    characterCreateAndAddUpgradeBonusHp(charClass, character, 100);
    addAbilityToCharacter(character, createAbilityHpRegen(idCounter, undefined, 2), charClass);
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_FEED_PET, idCounter, false, false, "ability1"), charClass);
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_LOVE_PET, idCounter, false, false, "ability2"), charClass);
    addAbilityToCharacter(character, createAbility(ABILITY_NAME_UNLEASH_PET, idCounter, false, false, "ability3"), charClass);
    addPetToTamer(character, "blue", charClass, game);
    addPetToTamer(character, "green", charClass, game);
    addPetToTamer(character, "black", charClass, game);
}

function createBossBasedOnClassAndCharacter(basedOnCharacter: Character, level: number, spawn: Position, game: Game): Character {
    const idCounter = game.state.idCounter;
    const bossSize = 60;
    const color = "black";
    const moveSpeed = Math.min(6, 1.5 + level * 0.5);
    const hp = 1000 * Math.pow(level, 4);
    const experienceWorth = calculateBossEnemyExperienceWorth(level);

    const bossCharacter = createCharacter(getNextId(idCounter), spawn.x, spawn.y, bossSize, bossSize, color, moveSpeed, hp, FACTION_ENEMY, CHARACTER_TYPE_BOSS_ENEMY, experienceWorth);
    addAbilityToCharacter(bossCharacter, createAbility(ABILITY_NAME_FEED_PET, idCounter, false, false, "ability1"));
    addAbilityToCharacter(bossCharacter, createAbility(ABILITY_NAME_LOVE_PET, idCounter, false, false, "ability2"));

    const abilityMelee = createAbilityMelee(game.state.idCounter);
    setAbilityToBossLevel(abilityMelee, level);
    bossCharacter.abilities.push(abilityMelee);

    bossCharacter.pets = createPetsBasedOnLevelAndCharacter(basedOnCharacter, level, bossCharacter, game);
    bossCharacter.paint.image = IMAGE_SLIME;
    bossCharacter.level = { level: level };
    resetCharacter(bossCharacter, game);

    return bossCharacter;
}

function getLongUiText(): string[] {
    let text: string[] = [];
    text.push("You have 3 pets. Feed them.");
    text.push("Love them.");
    text.push("Abilities:");
    text.push("- Feed Pet");
    text.push("- Love Pet");
    return text;
}

function reducePetLevel(pet: TamerPetCharacter, amount: number) {
    for (let i = 0; i < amount; i++) {
        for (let ability of pet.abilities) {
            const upgradeKeys = Object.keys(ability.upgrades);
            for (let upgradeKeyIndex = upgradeKeys.length - 1; upgradeKeyIndex >= 0; upgradeKeyIndex--) {
                const fixedRandomizedIndex = modulo(Math.floor(upgradeKeyIndex + pet.x + pet.y), upgradeKeys.length);
                const upgrade: AbilityUpgrade = ability.upgrades[upgradeKeys[fixedRandomizedIndex]];
                delete ability.upgrades[upgradeKeys[fixedRandomizedIndex]];
                amount -= upgrade.level;
                if (amount <= 0) {
                    return;
                }
            }
        }
    }
}

function calculatePetLevel(pet: TamerPetCharacter): number {
    let level = -1;
    for (let ability of pet.abilities) {
        level += 1;
        const upgradeKeys = Object.keys(ability.upgrades);
        for (let upgradeKey of upgradeKeys) {
            const upgrade: AbilityUpgrade = ability.upgrades[upgradeKey];
            level += upgrade.level;
        }
    }

    return level;
}

function executeTamerBossUpgradeOption(character: Character, upgradeOption: UpgradeOption, game: Game) {
    if (upgradeOption.type === "Pet") {
        const upgradeValues = upgradeNameToValues(upgradeOption.identifier);
        const ability = createAbility(upgradeValues.abilityName, game.state.idCounter, false);
        const pet: TamerPetCharacter = character.pets!.find((p) => p.type === TAMER_PET_CHARACTER && p.paint.color === upgradeValues.petName)! as TamerPetCharacter;
        ability.passive = true;
        addAbilityToCharacter(pet, ability);
        addTraitToTamerPet(pet, upgradeValues.traitName, game);
        pet.bossSkillPoints!.available--;
        pet.bossSkillPoints!.used++;
        if (upgradeValues.abilityName === ABILITY_NAME_PET_PAINTER) {
            const leash: AbilityLeash | undefined = pet.abilities.find(a => a.name === ABILITY_NAME_LEASH) as AbilityLeash;
            pet.collisionOff = true;
            if (leash) leash.leashMaxLength += 100;
        }
    } else if (upgradeOption.type === "PetAbility") {
        const option = upgradeOption as PetAbilityUpgradeOption;
        const pet: TamerPetCharacter = character.pets!.find((p) => p.id === option.petId)! as TamerPetCharacter;
        const ability = pet.abilities.find((a) => a.name === option.abilityName)!;
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        const upgradeFunctions = abilityFunctions.abilityUpgradeFunctions![upgradeOption.identifier];
        if (option.additionalInfo) {
            const trait = option.additionalInfo;
            addTraitToTamerPet(pet, trait, game);
        }
        upgradeFunctions.executeOption(ability, upgradeOption as AbilityUpgradeOption, pet);
        pet.bossSkillPoints!.available--;
        pet.bossSkillPoints!.used++;
    }
}

function createTamerBossUpgradeOptions(character: Character, game: Game): UpgradeOptionAndProbability[] {
    const options: UpgradeOptionAndProbability[] = [];
    const numberChoices = 3;
    if (!character.pets) return options;
    for (let pet of character.pets) {
        if (pet.type !== TAMER_PET_CHARACTER) continue;
        const tamerPet = pet as TamerPetCharacter;
        if (pet.bossSkillPoints !== undefined && pet.bossSkillPoints.available > 0) {
            const availableTraits = getAvailableTamerPetTraits(tamerPet);
            const availableAbilties = getAvailablePetAbilities(character, tamerPet);

            if (availableAbilties.length > 0 && pet.abilities.length < 3) {
                while (options.length < numberChoices) {
                    for (let ability of availableAbilties) {
                        const randomTraitIndex = Math.floor(nextRandom(game.state.randomSeed) * availableTraits.length);
                        const trait = availableTraits[randomTraitIndex];
                        availableTraits.splice(randomTraitIndex, 1);
                        const indentifier = valuesToUpgradeName(pet.paint.color!, ability, trait);
                        const option: UpgradeOptionAndProbability = {
                            option: {
                                type: "Pet",
                                characterClass: CHARACTER_CLASS_TAMER,
                                identifier: indentifier,
                                displayText: indentifier,
                                classIdRef: tamerPet.classIdRef,
                                boss: true,
                            },
                            probability: 1,
                        }
                        const abilityFunctions = ABILITIES_FUNCTIONS[ability];
                        if (abilityFunctions && abilityFunctions.getMoreInfosText) {
                            option.option.displayMoreInfoText = abilityFunctions.getMoreInfosText();
                        }
                        addTraitToUpgradeOption(option.option, trait);
                        options.push(option);
                    }
                }
                character.upgradeChoices.displayText = `Choose new Ability for ${pet.paint.color} Pet:`;
                return options;
            } else {
                for (let ability of pet.abilities) {
                    const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
                    character.upgradeChoices.displayText = `Choose Upgrade for ${pet.paint.color} Pet:`;
                    if (abilityFunctions && abilityFunctions.createAbilityBossUpgradeOptions) {
                        while (options.length < numberChoices) {
                            const abilityOptionsAndProbability = abilityFunctions.createAbilityBossUpgradeOptions(ability, pet, game);
                            if (abilityOptionsAndProbability.length === 0) break;
                            for (let opProb of abilityOptionsAndProbability) {
                                const abilityOption = opProb.option as AbilityUpgradeOption;
                                const petOption = opProb.option as PetAbilityUpgradeOption;
                                petOption.abilityName = abilityOption.name;
                                petOption.petId = pet.id;
                                petOption.type = "PetAbility";
                                petOption.characterClass = CHARACTER_CLASS_TAMER;
                                petOption.classIdRef = tamerPet.classIdRef;

                                if (availableTraits.length > 0) {
                                    const randomTraitIndex = Math.floor(nextRandom(game.state.randomSeed) * availableTraits.length);
                                    const trait = availableTraits[randomTraitIndex];
                                    availableTraits.splice(randomTraitIndex, 1);
                                    petOption.displayText += " & " + trait;
                                    addTraitToUpgradeOption(petOption, trait);
                                }
                                options.push(opProb);
                                if (options.length >= numberChoices) return options;
                            }
                        }
                    }
                    if (options.length > 0) return options;
                }
            }
        }
    }
    return options;
}

function addTraitToUpgradeOption(petOption: UpgradeOption, trait: string) {
    petOption.additionalInfo = trait;
    const moreInfosText = getMoreInfoTextForTamerPetTrait(trait);
    if (moreInfosText) {
        if (!petOption.displayMoreInfoText) {
            petOption.displayMoreInfoText = [];
        } else {
            petOption.displayMoreInfoText.push("");
        }
        petOption.displayMoreInfoText.push(`Trait: '${trait}'`);
        petOption.displayMoreInfoText.push(...moreInfosText);
    }
}

function getAvailablePetAbilities(character: Character, pet: TamerPetCharacter): string[] {
    const availableAbilityNames: string[] = [];
    const possibleAbilityNames = [
        ABILITY_NAME_PET_BREATH,
        ABILITY_NAME_PET_PAINTER,
        ABILITY_NAME_PET_DASH,
        ABILITY_NAME_PET_BOOMERANG,
        ABILITY_NAME_PET_BOMBARD,
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

    //return availableAbilityNames;
    return possibleAbilityNames;
}

function upgradeNameToValues(upgradeName: string): { petName: string, abilityName: string, traitName: string } {
    const seperator1 = upgradeName.indexOf(" & ");
    const seperator2 = upgradeName.indexOf(" for ");
    return {
        abilityName: upgradeName.substring(0, seperator1),
        traitName: upgradeName.substring(seperator1 + 3, seperator2),
        petName: upgradeName.substring(seperator2 + 5),
    }
}

function valuesToUpgradeName(petName: string, abilityName: string, traitName: string) {
    return `${abilityName} & ${traitName} for ${petName}`;
}

function addPetToTamer(character: Character, color: string, characterClass: CharacterClass, game: Game) {
    if (character.pets === undefined) character.pets = [];
    const pet: TamerPetCharacter = createTamerPetCharacter(character, color, characterClass, game);

    addAbilityToCharacter(pet, createAbilityLeash(game.state.idCounter, undefined, 175, character.id));
    addAbilityToCharacter(pet, createAbility(ABILITY_NAME_MELEE, game.state.idCounter, false));

    const player = findPlayerByCharacterId(game.state.players, character.id);
    if (player) {
        addCharacterUpgrades(player.permanentData.upgrades, pet, game, undefined);
    }
    character.pets.push(pet);
}
