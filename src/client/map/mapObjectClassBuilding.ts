import { ABILITIES_FUNCTIONS, Ability, createStatsUisAbilities } from "../ability/ability.js";
import { characterAddExistingCharacterClass, resetCharacter } from "../character/character.js";
import { Character, createCharacter } from "../character/characterModel.js";
import { CharacterClass, PLAYER_CHARACTER_CLASSES_FUNCTIONS, hasCharacterPreventedMultipleClass } from "../character/playerCharacters/playerCharacters.js";
import { TamerPetCharacter, createTamerPetsCharacterStatsUI } from "../character/playerCharacters/tamer/tamerPetCharacter.js";
import { deepCopy, getCameraPosition, getNextId } from "../game.js";
import { CelestialDirection, FACTION_PLAYER, Game, Position } from "../gameModel.js";
import { getPointPaintPosition, paintTextLinesWithKeys } from "../gamePaint.js";
import { GAME_IMAGES, loadImage } from "../imageLoad.js";
import { GameMap, MapChunk, chunkXYToMapKey, mapKeyAndTileXYToPosition } from "./map.js";
import { MAP_OBJECTS_FUNCTIONS, MapTileObject, findMapKeyForMapObject, paintMabObjectDefault } from "./mapObjects.js";
import { localStorageSaveBuildings } from "../permanentData.js";
import { createCharacterClassStatsUI, paintCharacters } from "../character/characterPaint.js";
import { ABILITY_NAME_LEASH, AbilityLeash } from "../ability/abilityLeash.js";
import { getCelestialDirection } from "../character/enemy/bossEnemy.js";
import { Player } from "../player.js";
import { playerInputBindingToDisplayValue } from "../playerInput.js";
import { StatsUIsPartContainer, createDefaultStatsUiContainer } from "../statsUI.js";
import { Building, findBuildingByIdAndType, getBuildingPosition } from "../building.js";

export type MapTileObjectClassBuilding = MapTileObject & {
    buildingId: number,
}

export const MAP_OBJECT_CLASS_BUILDING = "Class Building";
export const BUILDING_CLASS_BUILDING = MAP_OBJECT_CLASS_BUILDING;
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

export function addMapObjectClassBuilding() {
    MAP_OBJECTS_FUNCTIONS[MAP_OBJECT_CLASS_BUILDING] = {
        createStatsUi: createStatsUiClassBuilding,
        interact1: interactBurrow,
        interact2: interactDestroy,
        paint: paintClassBuilding,
        paintInteract: paintInteract,
    }
}

export function mapObjectPlaceClassBuilding(game: Game) {
    let spawnChunk = game.state.map.chunks[chunkXYToMapKey(0, 0)];
    const classToMakeLegendary = findCharacterClassToMakeLegendary(game.state.bossStuff.bosses[game.state.bossStuff.bosses.length - 2]);
    if (classToMakeLegendary) {
        placePlayerClassStuffInBuilding(classToMakeLegendary, game);
        return;
    }
    let freeChunkTile: Position = { x: 0, y: 0 };
    let foundFreeTile = false;
    main: while (!foundFreeTile) {
        for (let object of spawnChunk.objects) {
            if (object.x === freeChunkTile.x && object.y === freeChunkTile.y) {
                freeChunkTile.x++;
                if (freeChunkTile.x >= game.state.map.chunkLength) {
                    return;
                }
                continue main;
            }
        }
        foundFreeTile = true;
    }
    const classBuilding: ClassBuilding = {
        type: BUILDING_CLASS_BUILDING,
        id: getNextId(game.state.idCounter),
        abilities: [],
        pets: [],
        tileX: freeChunkTile.x,
        tileY: freeChunkTile.y,
        image: IMAGE_BUILDING1,
    }
    const mapObject: MapTileObjectClassBuilding = {
        x: freeChunkTile.x,
        y: freeChunkTile.y,
        name: MAP_OBJECT_CLASS_BUILDING,
        interactable: true,
        buildingId: classBuilding.id,
        image: IMAGE_BUILDING1,
    }
    spawnChunk.tiles[mapObject.x][mapObject.y] = 0;
    spawnChunk.objects.push(mapObject);
    game.state.buildings.push(classBuilding);
    localStorageSaveBuildings(game);
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

export function legendaryAbilityGiveBlessing(celestialDirection: CelestialDirection, character: Character) {
    if (character.characterClasses) {
        for (let charClass of character.characterClasses) {
            if (charClass.legendary && !charClass.legendary.blessings.find(blessing => blessing === celestialDirection)) {
                charClass.legendary.blessings.push(celestialDirection);
                charClass.legendary.levelCap += 100;
            }
        }
    }
    for (let ability of character.abilities) {
        if (ability.legendary && !ability.legendary.blessings.find(blessing => blessing === celestialDirection)) {
            ability.legendary.blessings.push(celestialDirection);
            ability.legendary.skillPointCap += 5;
            ability.legendary.levelCap += 100;
        }
    }
    if (character.pets) {
        for (let pet of character.pets) {
            if (pet.legendary && !pet.legendary.blessings.find(blessing => blessing === celestialDirection)) {
                pet.legendary.blessings.push(celestialDirection);
                pet.legendary.skillPointCap += 5;
                pet.legendary.levelCap += 100;
            }
            for (let ability of pet.abilities) {
                if (ability.legendary && !ability.legendary.blessings.find(blessing => blessing === celestialDirection)) {
                    ability.legendary.blessings.push(celestialDirection);
                    ability.legendary.skillPointCap += 5;
                    ability.legendary.levelCap += 100;
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
            const classBuilding = findClassBuildingById(ability.legendary.buildingIdRef, game);
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
            if (pet.legendary) {
                const classBuilding = findClassBuildingById(pet.legendary.buildingIdRef, game);
                if (classBuilding) {
                    if (petCounterPerBuilding.get(classBuilding.id) === undefined) petCounterPerBuilding.set(classBuilding.id, 0);
                    let counter: number = petCounterPerBuilding.get(classBuilding.id) as number;
                    character.pets.splice(i, 1);
                    classBuilding.pets.push(pet);
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
    localStorageSaveBuildings(game);
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
                    const celelstialDirection = getCelestialDirection(player.character);
                    classBuilding.stuffBorrowed.by = `King of the ${celelstialDirection}`;
                    localStorageSaveBuildings(game);
                }
            }
        }
    }
}

function findCharacterClassToMakeLegendary(character: Character): string | undefined {
    if (character.characterClasses) {
        for (let charClass of character.characterClasses) {
            if (!charClass.gifted && !charClass.legendary) return charClass.className;
        }
    }
    return undefined;
}

function placePlayerClassStuffInBuilding(playerClass: string, game: Game) {
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
                    freeBuilding.pets.push(pet);
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
            localStorageSaveBuildings(game);
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

function interactDestroy(interacter: Character, mapObject: MapTileObject, game: Game) {
    const mapObjectClassBuilding = mapObject as MapTileObjectClassBuilding;
    const classBuilding = findClassBuildingById(mapObjectClassBuilding.buildingId, game);
    if (!classBuilding) return;
    if (classBuilding.characterClass === undefined || (classBuilding.stuffBorrowed && classBuilding.stuffBorrowed.burrowed)) return;
    classBuilding.characterClass = undefined;
    classBuilding.pets = [];
    classBuilding.abilities = [];
    classBuilding.stuffBorrowed = undefined;
}

function interactBurrow(interacter: Character, mapObject: MapTileObject, game: Game) {
    const mapObjectClassBuilding = mapObject as MapTileObjectClassBuilding;
    const classBuilding = findClassBuildingById(mapObjectClassBuilding.buildingId, game);
    if (!classBuilding) return;
    if (classBuilding.characterClass === undefined || !classBuilding.stuffBorrowed || classBuilding.stuffBorrowed.burrowed) return;
    if (hasCharacterPreventedMultipleClass(classBuilding.characterClass.className, interacter)) {
        return;
    }
    for (let i = classBuilding.abilities.length - 1; i >= 0; i--) {
        const ability = classBuilding.abilities[i];
        if (ability.unique) {
            const dupAbilityIndex = interacter.abilities.findIndex(a => a.name === ability.name);
            if (dupAbilityIndex > -1) {
                const dupAbility = interacter.abilities[dupAbilityIndex];
                if (dupAbility.legendary) {
                    continue;
                }
                interacter.abilities.splice(dupAbilityIndex, 1);
            }
        }
        interacter.abilities.unshift(ability);
        classBuilding.abilities.splice(i, 1);
    }
    if (classBuilding.pets.length > 0) {
        if (!interacter.pets) interacter.pets = [];
        for (let pet of classBuilding.pets) {
            interacter.pets.push(pet);
            const leash: AbilityLeash = pet.abilities.find(a => a.name === ABILITY_NAME_LEASH) as AbilityLeash;
            if (leash) leash.leashedToOwnerId = interacter.id;
            for (let ability of pet.abilities) {
                ability.disabled = false;
            }
        }
    }
    classBuilding.pets = [];
    classBuilding.stuffBorrowed!.burrowed = true;
    classBuilding.stuffBorrowed!.by = interacter.faction;
    characterAddExistingCharacterClass(interacter, deepCopy(classBuilding.characterClass));
    if (interacter.upgradeChoices.length > 0 && interacter.upgradeChoices[0].type === "ChooseClass") {
        interacter.upgradeChoices = [];
    }
    resetCharacter(interacter, game);
}

function findClassBuildingById(id: number, game: Game): ClassBuilding | undefined {
    const building = findBuildingByIdAndType(id, BUILDING_CLASS_BUILDING, game);
    if (building) return building as ClassBuilding;
    return undefined;
}

function paintInteract(ctx: CanvasRenderingContext2D, mapObject: MapTileObject, interacter: Character, game: Game) {
    const key = findMapKeyForMapObject(mapObject, game.state.map);
    if (!key) return;
    const mapObjectClassBuilding = mapObject as MapTileObjectClassBuilding;
    const classBuilding = findClassBuildingById(mapObjectClassBuilding.buildingId, game);
    if (!classBuilding) return;
    const map = game.state.map;
    const cameraPosition = getCameraPosition(game);
    const topMiddlePos = mapKeyAndTileXYToPosition(key, mapObject.x, mapObject.y, map);
    topMiddlePos.y -= map.tileSize / 2;
    const texts = [];
    if (classBuilding.characterClass === undefined) {
        texts.push(`Empty Class building:`);
        texts.push(
            `Defeat king with class`,
            `to unlock legendary class.`,
        )
    } else {
        texts.push(`Class building ${classBuilding.characterClass.className}:`);
        if (!classBuilding.stuffBorrowed!.burrowed) {
            const interactDestroyKey = playerInputBindingToDisplayValue("interact2", game);
            texts.push(`Press <${interactDestroyKey}> to destroy legendary.`);
            if (hasCharacterPreventedMultipleClass(classBuilding.characterClass.className, interacter)) {
                const infoKey = playerInputBindingToDisplayValue("Info", game);
                texts.push(`Press <${infoKey}> for details.`);
                texts.push(`Can't burrow. Class can only be owned once.`);
            } else {
                const interactBurrowKey = playerInputBindingToDisplayValue("interact1", game);
                const infoKey = playerInputBindingToDisplayValue("Info", game);
                texts.push(`Press <${interactBurrowKey}> to burrow.`);
                texts.push(`Press <${infoKey}> for details.`);
            }
            game.UI.paintClosesInteractableStatsUi = true;
        } else if (classBuilding.stuffBorrowed!.burrowed) {
            texts.push(`Currently burrowed by ${classBuilding.stuffBorrowed!.by}`);
        }
    }
    const paintPos = getPointPaintPosition(ctx, topMiddlePos, cameraPosition);
    paintTextLinesWithKeys(ctx, texts, paintPos, 20, true, true);
}

function createStatsUiClassBuilding(mapObject: MapTileObject, game: Game): StatsUIsPartContainer | undefined {
    const mapObjectClassBuilding = mapObject as MapTileObjectClassBuilding;
    const classBuilding = findClassBuildingById(mapObjectClassBuilding.buildingId, game);
    if (!classBuilding || !game.ctx) return;
    const statsUIContainer = createDefaultStatsUiContainer(game.ctx, mapObject.name, game.UI.statsUIs.headingFontSize);
    if (classBuilding.characterClass && !classBuilding.stuffBorrowed?.burrowed && game.ctx) {
        if (classBuilding.characterClass) {
            statsUIContainer.statsUIs.push(createCharacterClassStatsUI(game.ctx, [classBuilding.characterClass]));
        }

        statsUIContainer.statsUIs.push(...createTamerPetsCharacterStatsUI(game.ctx, classBuilding.pets));
        statsUIContainer.statsUIs.push(...createStatsUisAbilities(game.ctx, classBuilding.abilities, game));
    }

    return statsUIContainer;
}


export function paintClassBuilding(ctx: CanvasRenderingContext2D, mapObject: MapTileObject, paintTopLeft: Position, game: Game) {
    paintMabObjectDefault(ctx, mapObject, paintTopLeft, game);
    const tileSize = game.state.map.tileSize;
    const mapObjectClassBuilding = mapObject as MapTileObjectClassBuilding;
    const classBuilding = findClassBuildingById(mapObjectClassBuilding.buildingId, game);
    if (classBuilding?.abilities && classBuilding?.abilities.length > 0) {
        for (let ability of classBuilding.abilities) {
            const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
            if (abilityFunctions.paintAbilityAccessoire) {
                const paintPos = {
                    x: paintTopLeft.x + mapObject.x * tileSize + 20,
                    y: paintTopLeft.y + mapObject.y * tileSize + 25
                };
                abilityFunctions.paintAbilityAccessoire(ctx, ability, paintPos, game);
            }
        }
    }
    if (classBuilding?.pets && classBuilding?.pets.length > 0) {
        const cameraPosition = getCameraPosition(game);
        paintCharacters(ctx, classBuilding.pets, cameraPosition, game);
    }
}