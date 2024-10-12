import { Ability } from "../../ability/ability.js";
import { resetCharacter } from "../../character/character.js";
import { Character, createCharacter } from "../../character/characterModel.js";
import { getCelestialDirection } from "../../character/enemy/bossEnemy.js";
import { CharacterClass, PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "../../character/playerCharacters/playerCharacters.js";
import { TAMER_PET_CHARACTER, TamerPetCharacter } from "../../character/playerCharacters/tamer/tamerPetCharacter.js";
import { getNextId } from "../../game.js";
import { FACTION_PLAYER, Game, IdCounter } from "../../gameModel.js";
import { GAME_IMAGES } from "../../imageLoad.js";
import { Player } from "../../player.js";
import { Building, findBuildingByIdAndType, getBuildingPosition } from "./building.js";

export const BUILDING_CLASS_BUILDING = "Class Building";
export type ClassBuilding = Building & {
    type: typeof BUILDING_CLASS_BUILDING,
    characterClass?: CharacterClass,
    abilities: Ability[],
    pets: TamerPetCharacter[],
    stuffBorrowed?: {
        burrowed: boolean,
        by: string | undefined,
    },
}
export const IMAGE_BUILDING1 = "Building1";

GAME_IMAGES[IMAGE_BUILDING1] = {
    imagePath: "/images/building1.png",
    spriteRowHeights: [40],
    spriteRowWidths: [40],
};


export function createBuildingClassBuilding(tileX: number, tileY: number, idCounter: IdCounter): ClassBuilding {
    return {
        type: BUILDING_CLASS_BUILDING,
        id: getNextId(idCounter),
        abilities: [],
        pets: [],
        tileX: tileX,
        tileY: tileY,
        image: IMAGE_BUILDING1,
    }
}

export function classBuildingCheckAllPlayerForLegendaryAbilitiesAndMoveBackToBuilding(game: Game) {
    for (let player of game.state.players) {
        if (!player.character.becameKing) {
            classBuildingPutLegendaryCharacterStuffBackIntoBuilding(player.character, game);
        } else {
            setBurrowedByKingIfHasLegendary(player, game);
        }
    }
}

export function legendaryAbilityGiveBlessing(blessing: string, characters: Character[]) {
    for (let character of characters) {
        if (character.characterClasses) {
            for (let charClass of character.characterClasses) {
                if (charClass.legendary && !charClass.legendary.blessings.find(b => b === blessing)) {
                    charClass.legendary.blessings.push(blessing);
                    charClass.legendary.levelCap += 100;
                }
            }
        }
        for (let ability of character.abilities) {
            if (ability.legendary && !ability.legendary.blessings.find(b => b === blessing)) {
                ability.legendary.blessings.push(blessing);
                ability.legendary.skillPointCap += 5;
                ability.legendary.levelCap += 100;
            }
        }
        if (character.pets) {
            for (let pet of character.pets) {
                if (pet.legendary && !pet.legendary.blessings.find(b => b === blessing)) {
                    pet.legendary.blessings.push(blessing);
                    pet.legendary.skillPointCap += 5;
                    pet.legendary.levelCap += 100;
                }
                for (let ability of pet.abilities) {
                    if (ability.legendary && !ability.legendary.blessings.find(b => b === blessing)) {
                        ability.legendary.blessings.push(blessing);
                        ability.legendary.skillPointCap += 5;
                        ability.legendary.levelCap += 100;
                    }
                }
            }
        }
    }
}

export function classBuildingPutLegendaryCharacterStuffBackIntoBuilding(character: Character, game: Game) {
    resetCharacter(character, game);
    for (let i = character.abilities.length - 1; i >= 0; i--) {
        const ability = character.abilities[i];
        if (ability.legendary) {
            const classBuilding = classBuildingFindById(ability.legendary.buildingIdRef, game);
            if (classBuilding) {
                character.abilities.splice(i, 1);
                classBuilding.abilities.unshift(ability);
                classBuilding.stuffBorrowed!.burrowed = false;
                classBuilding.stuffBorrowed!.by = undefined;
            } else {
                console.log("failed to find class Building for ability", ability, game);
            }
        }
    }
    if (character.pets) {
        let petCounterPerBuilding: Map<number, number> = new Map();
        for (let i = character.pets.length - 1; i >= 0; i--) {
            const pet = character.pets[i];
            if (pet.type !== TAMER_PET_CHARACTER) continue;
            const tamerPet = pet as TamerPetCharacter;
            if (pet.legendary) {
                const classBuilding = classBuildingFindById(pet.legendary.buildingIdRef, game);
                if (classBuilding) {
                    if (petCounterPerBuilding.get(classBuilding.id) === undefined) petCounterPerBuilding.set(classBuilding.id, 0);
                    let counter: number = petCounterPerBuilding.get(classBuilding.id) as number;
                    character.pets.splice(i, 1);
                    classBuilding.pets.push(tamerPet);
                    classBuilding.stuffBorrowed!.burrowed = false;
                    classBuilding.stuffBorrowed!.by = undefined;
                    const buildingPos = getBuildingPosition(classBuilding, game.state.map);
                    pet.x = buildingPos.x + counter * 20;
                    pet.y = buildingPos.y + 20;
                    petCounterPerBuilding.set(classBuilding.id, counter + 1);
                    for (let ability of pet.abilities) {
                        ability.disabled = true;
                    }
                } else {
                    console.log("failed to find class Building for pet", pet, game);
                }
            }
        }
    }
    if (character.characterClasses) {
        for (let i = character.characterClasses.length - 1; i >= 0; i--) {
            const charClass = character.characterClasses[i];
            if (charClass.legendary) {
                let classBuilding = undefined;
                for (let building of game.state.buildings) {
                    if (building.type !== BUILDING_CLASS_BUILDING) continue;
                    const tempBuilding = building as ClassBuilding;
                    if (tempBuilding.characterClass && tempBuilding.characterClass.id === charClass.id) {
                        classBuilding = building as ClassBuilding;
                        break;
                    }
                }
                if (classBuilding) {
                    classBuilding.characterClass = charClass;
                    character.characterClasses.splice(i, 1);
                } else {
                    console.log("failed to find class Building for character class", charClass, game);
                }
            }
        }
    }
}

export function classBuildingFindCharacterClassToMakeLegendary(character: Character): string | undefined {
    if (character.characterClasses) {
        for (let charClass of character.characterClasses) {
            if (!charClass.gifted && !charClass.legendary) return charClass.className;
        }
    }
    return undefined;
}

export function classBuildingPlacePlayerClassStuffInBuilding(playerClass: string, game: Game) {
    let classFunctions = PLAYER_CHARACTER_CLASSES_FUNCTIONS[playerClass];
    if (classFunctions) {
        const freeBuilding = findFreeClassBuilding(game);
        if (freeBuilding) {
            const tempCharacter = createCharacter(0, 0, 0, 0, 0, "", 0, 0, FACTION_PLAYER, "", 0);
            classFunctions.changeCharacterToThisClass(tempCharacter, game.state.idCounter, game);
            freeBuilding.characterClass = tempCharacter.characterClasses![0];
            freeBuilding.characterClass.legendary = {
                levelCap: 100,
                blessings: [],
            };
            freeBuilding.stuffBorrowed = { burrowed: false, by: undefined };
            for (let ability of tempCharacter.abilities) {
                freeBuilding.abilities.push(ability);
                ability.legendary = {
                    buildingIdRef: freeBuilding.id,
                    blessings: [],
                    skillPointCap: 5,
                    levelCap: 100,
                };
            }
            if (tempCharacter.pets) {
                let counter = 0;
                for (let pet of tempCharacter.pets) {
                    if (pet.type !== TAMER_PET_CHARACTER) continue;
                    const tamerPet = pet as TamerPetCharacter;
                    freeBuilding.pets.push(tamerPet);
                    pet.legendary = {
                        buildingIdRef: freeBuilding.id,
                        blessings: [],
                        skillPointCap: 5,
                        levelCap: 100,
                    };
                    const buildingPos = getBuildingPosition(freeBuilding, game.state.map);
                    pet.x = buildingPos.x + counter * 20;
                    pet.y = buildingPos.y + 20;
                    counter++;
                }
            }
        }
    }
}

export function classBuildingFindById(id: number, game: Game): ClassBuilding | undefined {
    const building = findBuildingByIdAndType(id, BUILDING_CLASS_BUILDING, game);
    if (building) return building as ClassBuilding;
    return undefined;
}

function setBurrowedByKingIfHasLegendary(player: Player, game: Game) {
    if (player.character.characterClasses) {
        for (let charClass of player.character.characterClasses) {
            if (charClass.legendary) {
                let classBuilding = undefined;
                for (let building of game.state.buildings) {
                    if (building.type !== BUILDING_CLASS_BUILDING) continue;
                    const tempBuilding = building as ClassBuilding;
                    if (tempBuilding.characterClass && tempBuilding.characterClass.id === charClass.id) {
                        classBuilding = building as ClassBuilding;
                        break;
                    }
                }
                if (classBuilding && classBuilding.stuffBorrowed) {
                    const celelstialDirection = getCelestialDirection(player.character, game.state.map);
                    classBuilding.stuffBorrowed.by = `King of the ${celelstialDirection}`;
                }
            }
        }
    }
}

function findFreeClassBuilding(game: Game): ClassBuilding | undefined {
    for (let building of game.state.buildings) {
        if (building.type !== BUILDING_CLASS_BUILDING) continue;
        const tempBuilding = building as ClassBuilding;
        if (tempBuilding.characterClass === undefined) return tempBuilding;
    }
    return undefined;
}
