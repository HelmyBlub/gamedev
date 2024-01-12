import { ABILITIES_FUNCTIONS, Ability } from "../ability/ability.js";
import { characterAddExistingCharacterClass, resetCharacter } from "../character/character.js";
import { Character, createCharacter } from "../character/characterModel.js";
import { CharacterClass, PLAYER_CHARACTER_CLASSES_FUNCTIONS, hasCharacterPreventedMultipleClass } from "../character/playerCharacters/playerCharacters.js";
import { TamerPetCharacter } from "../character/playerCharacters/tamer/tamerPetCharacter.js";
import { deepCopy, getCameraPosition, getNextId } from "../game.js";
import { CelestialDirection, FACTION_PLAYER, Game, Position } from "../gameModel.js";
import { getPointPaintPosition, paintStatsFromAbilityAndPetsAndCharacterClass, paintTextWithOutline } from "../gamePaint.js";
import { GAME_IMAGES, loadImage } from "../imageLoad.js";
import { GameMap, MapChunk, chunkXYToMapKey, mapKeyAndTileXYToPosition } from "./map.js";
import { MAP_OBJECTS_FUNCTIONS, MapTileObject, findMapKeyForMapObject } from "./mapObjects.js";
import { localStorageSaveBuildings } from "../permanentData.js";
import { paintCharacters } from "../character/characterPaint.js";
import { ABILITY_NAME_LEASH, AbilityLeash } from "../ability/abilityLeash.js";

export type MapTileObjectClassBuilding = MapTileObject & {
    buildingId: number,
}

export type Building = {
    id: number,
    characterClass?: CharacterClass,
    abilities: Ability[],
    pets: TamerPetCharacter[],
    stuffBorrowed?: boolean,
    tileX: number,
    tileY: number,
}

export const MAP_OBJECT_CLASS_BUILDING = "Class Building";
export const IMAGE_BUILDING1 = "Building1";

GAME_IMAGES[IMAGE_BUILDING1] = {
    imagePath: "/images/building1.png",
    spriteRowHeights: [40],
    spriteRowWidths: [40],
};


export function addMapObjectClassBuilding() {
    MAP_OBJECTS_FUNCTIONS[MAP_OBJECT_CLASS_BUILDING] = {
        interact: interact,
        paint: paintClassBuilding,
        paintInteract: paintInteract,
    }
}

export function addExistingBuildingsToSpawnChunk(mapChunk: MapChunk, game: Game) {
    for (let building of game.state.buildings) {
        const mapObject: MapTileObjectClassBuilding = {
            x: building.tileX,
            y: building.tileY,
            name: MAP_OBJECT_CLASS_BUILDING,
            interactable: true,
            buildingId: building.id,
        }
        mapChunk.tiles[mapObject.x][mapObject.y] = 0;
        mapChunk.objects.push(mapObject);
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
    const classBuilding: Building = {
        id: getNextId(game.state.idCounter),
        abilities: [],
        pets: [],
        tileX: freeChunkTile.x,
        tileY: freeChunkTile.y,
    }
    const mapObject: MapTileObjectClassBuilding = {
        x: freeChunkTile.x,
        y: freeChunkTile.y,
        name: MAP_OBJECT_CLASS_BUILDING,
        interactable: true,
        buildingId: classBuilding.id,
    }
    spawnChunk.tiles[mapObject.x][mapObject.y] = 0;
    spawnChunk.objects.push(mapObject);
    game.state.buildings.push(classBuilding);
    localStorageSaveBuildings(game);
}

export function classBuildingCheckAllPlayerForLegendaryAbilitiesAndMoveBackToBuilding(game: Game) {
    for (let player of game.state.players) {
        if (!player.character.becameEndBoss) {
            classBuildingPutLegendaryCharacterStuffBackIntoBuilding(player.character, game);
        }
    }
}

export function legendaryAbilityGiveBlessing(celestialDirection: CelestialDirection, character: Character){
    for(let ability of character.abilities){
        if(ability.legendary && !ability.legendary.blessing.find(blessing => blessing === celestialDirection)){
            ability.legendary.blessing.push(celestialDirection);
            ability.legendary.skillPointCap += 5;
        }
    }
    if(character.pets){
        for(let pet of character.pets){
            for(let ability of pet.abilities){
                if(ability.legendary && !ability.legendary.blessing.find(blessing => blessing === celestialDirection)){
                    ability.legendary.blessing.push(celestialDirection);
                    ability.legendary.skillPointCap += 5;
                }       
            }
        }
    }
}

export function classBuildingPutLegendaryCharacterStuffBackIntoBuilding(character: Character, game: Game) {
    for (let i = character.abilities.length - 1; i >= 0; i--) {
        const ability = character.abilities[i];
        if (ability.legendary) {
            const building = findBuildingById(ability.legendary.buildingIdRef, game);
            if (building) {
                character.abilities.splice(i, 1);
                building.abilities.push(ability);
                building.stuffBorrowed = false;
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
                const building = findBuildingById(pet.legendary.buildingIdRef, game);
                if (building) {
                    if (petCounterPerBuilding.get(building.id) === undefined) petCounterPerBuilding.set(building.id, 0);
                    let counter: number = petCounterPerBuilding.get(building.id) as number;
                    character.pets.splice(i, 1);
                    building.pets.push(pet);
                    building.stuffBorrowed = false;
                    const buildingPos = getBuildingPosition(building, game.state.map);
                    pet.x = buildingPos.x + counter * 20;
                    pet.y = buildingPos.y + 20;
                    petCounterPerBuilding.set(building.id, counter + 1);
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
                    if (building.characterClass && building.characterClass.id === charClass.id) {
                        classBuilding = building;
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
        const freeBuilding = findFreeBuilding(game);
        if (freeBuilding) {
            const tempCharacter = createCharacter(0, 0, 0, 0, 0, "", 0, 0, FACTION_PLAYER, "", 0);
            classFunctions.changeCharacterToThisClass(tempCharacter, game.state.idCounter, game);
            freeBuilding.characterClass = tempCharacter.characterClasses![0];
            freeBuilding.characterClass.legendary = true;
            freeBuilding.stuffBorrowed = false;
            for (let ability of tempCharacter.abilities) {
                freeBuilding.abilities.push(ability);
                ability.legendary = { 
                    buildingIdRef: freeBuilding.id,
                    blessing: [],
                    skillPointCap: 5,
                };
            }
            if (tempCharacter.pets) {
                let counter = 0;
                for (let pet of tempCharacter.pets) {
                    freeBuilding.pets.push(pet);
                    pet.legendary = { buildingIdRef: freeBuilding.id };
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

function getBuildingPosition(building: Building, map: GameMap): Position {
    return {
        x: building.tileX * map.tileSize,
        y: building.tileY * map.tileSize,
    }
}

function findFreeBuilding(game: Game): Building | undefined {
    return game.state.buildings.find((b) => b.characterClass === undefined);
}

function interact(interacter: Character, mapObject: MapTileObject, game: Game) {
    const mapObjectClassBuilding = mapObject as MapTileObjectClassBuilding;
    const classBuilding = findBuildingById(mapObjectClassBuilding.buildingId, game);
    if (!classBuilding || classBuilding.characterClass === undefined || classBuilding.stuffBorrowed) return;
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
        interacter.abilities.push(ability);
        classBuilding.abilities.splice(i, 1);
    }
    if (classBuilding.pets.length > 0) {
        if (!interacter.pets) interacter.pets = [];
        for (let pet of classBuilding.pets) {
            interacter.pets.push(pet);
            const leash: AbilityLeash = pet.abilities.find(a => a.name === ABILITY_NAME_LEASH) as AbilityLeash;
            if (leash) leash.leashedToOwnerId = interacter.id;
        }
    }
    classBuilding.pets = [];
    classBuilding.stuffBorrowed = true;
    characterAddExistingCharacterClass(interacter, deepCopy(classBuilding.characterClass));
    if (interacter.upgradeChoices.length > 0 && interacter.upgradeChoices[0].type === "ChooseClass") {
        interacter.upgradeChoices = [];
    }
    resetCharacter(interacter, game);
}

function findBuildingById(id: number, game: Game): Building | undefined {
    return game.state.buildings.find((b) => b.id === id);
}

function paintInteract(ctx: CanvasRenderingContext2D, mapObject: MapTileObject, interacter: Character, game: Game) {
    const key = findMapKeyForMapObject(mapObject, game.state.map);
    if (!key) return;
    const mapObjectClassBuilding = mapObject as MapTileObjectClassBuilding;
    const classBuilding = findBuildingById(mapObjectClassBuilding.buildingId, game);
    if (!classBuilding) return;
    const map = game.state.map;
    const cameraPosition = getCameraPosition(game);
    const topMiddlePos = mapKeyAndTileXYToPosition(key, mapObject.x, mapObject.y, map);
    const fontSize = 20;
    const texts = [];
    if (!classBuilding.characterClass) {
        texts.push(
            `Defeat king with class`,
            `to unlock legendary.`,
        )
    } else if (!classBuilding.stuffBorrowed) {
        texts.push(`Class ${classBuilding.characterClass.className}.`);
        if (hasCharacterPreventedMultipleClass(classBuilding.characterClass.className, interacter)) {
            texts.push(`Can't burrow. Class can only be owned once.`);
        } else {
            texts.push(`Press interact key to burrow`);
        }
    } else if (classBuilding.stuffBorrowed) {
        texts.push(`Class ${classBuilding.characterClass.className}.`);
        texts.push(`Currently burrowed`);
    }
    let textMaxWidth = 0;
    const rectHeight = fontSize * texts.length + 2;
    topMiddlePos.y -= rectHeight + map.tileSize / 2;
    const paintPos = getPointPaintPosition(ctx, topMiddlePos, cameraPosition);

    ctx.font = `${fontSize}px Arial`;
    for (let text of texts) {
        const textWidth = ctx.measureText(text).width;
        if (textWidth > textMaxWidth) textMaxWidth = textWidth;
    }
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = "white";
    ctx.fillRect(paintPos.x - Math.floor(textMaxWidth / 2) - 1, paintPos.y - 1, textMaxWidth + 2, rectHeight)
    ctx.globalAlpha = 1;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "black";
    for (let text of texts) {
        paintPos.y += fontSize;
        topMiddlePos.y += fontSize;
        paintTextWithOutline(ctx, "white", "black", text, paintPos.x, paintPos.y, true);
    }

    if(classBuilding.characterClass){
        paintStatsFromAbilityAndPetsAndCharacterClass(ctx, classBuilding.pets, classBuilding.abilities, [classBuilding.characterClass], game);
    }
}

function paintClassBuilding(ctx: CanvasRenderingContext2D, mapObject: MapTileObject, paintTopLeft: Position, game: Game) {
    const classBuilding = mapObject as MapTileObjectClassBuilding;
    const tileSize = game.state.map.tileSize;
    const signImage = GAME_IMAGES[IMAGE_BUILDING1];
    loadImage(signImage);
    if (signImage.imageRef?.complete) {
        const paintX = paintTopLeft.x + mapObject.x * tileSize;
        const paintY = paintTopLeft.y + mapObject.y * tileSize;
        const spriteWidth = signImage.spriteRowWidths[0];
        const spriteHeight = signImage.spriteRowHeights[0];
        ctx.drawImage(
            signImage.imageRef,
            Math.floor(paintX),
            Math.floor(paintY),
            spriteWidth, spriteHeight
        );
        ctx.resetTransform();
        ctx.restore();
        const building = findBuildingById(classBuilding.buildingId, game);
        if (building?.abilities && building?.abilities.length > 0) {
            for (let ability of building.abilities) {
                const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
                if (abilityFunctions.paintAbilityAccessoire) {
                    const paintPos = { x: paintX + 20, y: paintY + 25 };
                    abilityFunctions.paintAbilityAccessoire(ctx, ability, paintPos, game);
                }
            }
        }
        if (building?.pets && building?.pets.length > 0) {
            const cameraPosition = getCameraPosition(game);
            paintCharacters(ctx, building.pets, cameraPosition, game);
        }
    }
}
