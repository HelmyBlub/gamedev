import { ABILITIES_FUNCTIONS, createStatsUisAbilities } from "../ability/ability.js";
import { characterAddExistingCharacterClass, resetCharacter } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { hasCharacterPreventedMultipleClass } from "../character/playerCharacters/playerCharacters.js";
import { createTamerPetsCharacterStatsUI } from "../character/playerCharacters/tamer/tamerPetCharacter.js";
import { deepCopy, getCameraPosition } from "../game.js";
import { Game, Position } from "../gameModel.js";
import { getPointPaintPosition, paintTextLinesWithKeys } from "../gamePaint.js";
import { chunkXYToMapKey, mapKeyAndTileXYToPosition } from "./map.js";
import { MAP_OBJECTS_FUNCTIONS, MapTileObject, findMapKeyForMapObject, paintMabObjectDefault } from "./mapObjects.js";
import { localStorageSaveBuildings } from "../permanentData.js";
import { createCharacterClassStatsUI, paintCharacters } from "../character/characterPaint.js";
import { ABILITY_NAME_LEASH, AbilityLeash } from "../ability/abilityLeash.js";
import { playerInputBindingToDisplayValue } from "../playerInput.js";
import { StatsUIsPartContainer, createDefaultStatsUiContainer } from "../statsUI.js";
import { IMAGE_BUILDING1, createBuildingClassBuilding, classBuildingFindCharacterClassToMakeLegendary, classBuildingPlacePlayerClassStuffInBuilding, classBuildingFindById, BUILDING_CLASS_BUILDING } from "./buildings/classBuilding.js";

export type MapTileObjectClassBuilding = MapTileObject & {
    buildingId: number,
}

export function addMapObjectClassBuilding() {
    MAP_OBJECTS_FUNCTIONS[BUILDING_CLASS_BUILDING] = {
        createStatsUi: createStatsUiClassBuilding,
        interact1: interactBurrow,
        interact2: interactDestroy,
        paint: paintClassBuilding,
        paintInteract: paintInteract,
    }
}

export function mapObjectPlaceClassBuilding(game: Game) {
    let spawnChunk = game.state.map.chunks[chunkXYToMapKey(0, 0)];
    const classToMakeLegendary = classBuildingFindCharacterClassToMakeLegendary(game.state.bossStuff.bosses[game.state.bossStuff.bosses.length - 2]);
    if (classToMakeLegendary) {
        classBuildingPlacePlayerClassStuffInBuilding(classToMakeLegendary, game);
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
    const classBuilding = createBuildingClassBuilding(freeChunkTile.x, freeChunkTile.y, game.state.idCounter);
    const mapObject: MapTileObjectClassBuilding = {
        x: freeChunkTile.x,
        y: freeChunkTile.y,
        type: classBuilding.type,
        interactable: true,
        buildingId: classBuilding.id,
        image: IMAGE_BUILDING1,
    }
    spawnChunk.tiles[mapObject.x][mapObject.y] = 0;
    spawnChunk.objects.push(mapObject);
    game.state.buildings.push(classBuilding);
    localStorageSaveBuildings(game);
}

function createStatsUiClassBuilding(mapObject: MapTileObject, game: Game): StatsUIsPartContainer | undefined {
    const mapObjectClassBuilding = mapObject as MapTileObjectClassBuilding;
    const classBuilding = classBuildingFindById(mapObjectClassBuilding.buildingId, game);
    if (!classBuilding || !game.ctx) return;
    const statsUIContainer = createDefaultStatsUiContainer(game.ctx, mapObject.type, game.UI.statsUIs.headingFontSize);
    if (classBuilding.characterClass && !classBuilding.stuffBorrowed?.burrowed && game.ctx) {
        if (classBuilding.characterClass) {
            statsUIContainer.statsUIs.push(createCharacterClassStatsUI(game.ctx, [classBuilding.characterClass]));
        }

        statsUIContainer.statsUIs.push(...createTamerPetsCharacterStatsUI(game.ctx, classBuilding.pets));
        statsUIContainer.statsUIs.push(...createStatsUisAbilities(game.ctx, classBuilding.abilities, game));
    }

    return statsUIContainer;
}


function interactDestroy(interacter: Character, mapObject: MapTileObject, game: Game) {
    const mapObjectClassBuilding = mapObject as MapTileObjectClassBuilding;
    const classBuilding = classBuildingFindById(mapObjectClassBuilding.buildingId, game);
    if (!classBuilding) return;
    if (classBuilding.characterClass === undefined || (classBuilding.stuffBorrowed && classBuilding.stuffBorrowed.burrowed)) return;
    classBuilding.characterClass = undefined;
    classBuilding.pets = [];
    classBuilding.abilities = [];
    classBuilding.stuffBorrowed = undefined;
}

function interactBurrow(interacter: Character, mapObject: MapTileObject, game: Game) {
    const mapObjectClassBuilding = mapObject as MapTileObjectClassBuilding;
    const classBuilding = classBuildingFindById(mapObjectClassBuilding.buildingId, game);
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

function paintInteract(ctx: CanvasRenderingContext2D, mapObject: MapTileObject, interacter: Character, game: Game) {
    const key = findMapKeyForMapObject(mapObject, game.state.map);
    if (!key) return;
    const mapObjectClassBuilding = mapObject as MapTileObjectClassBuilding;
    const classBuilding = classBuildingFindById(mapObjectClassBuilding.buildingId, game);
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

export function paintClassBuilding(ctx: CanvasRenderingContext2D, mapObject: MapTileObject, paintTopLeft: Position, game: Game) {
    paintMabObjectDefault(ctx, mapObject, paintTopLeft, game);
    const tileSize = game.state.map.tileSize;
    const mapObjectClassBuilding = mapObject as MapTileObjectClassBuilding;
    const classBuilding = classBuildingFindById(mapObjectClassBuilding.buildingId, game);
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