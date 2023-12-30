import { Ability, resetAllCharacterAbilities } from "../ability/ability.js";
import { resetCharacter } from "../character/character.js";
import { Character, createCharacter } from "../character/characterModel.js";
import { PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "../character/playerCharacters/playerCharacters.js";
import { TamerPetCharacter } from "../character/playerCharacters/tamer/tamerPetCharacter.js";
import { getCameraPosition, getNextId } from "../game.js";
import { FACTION_PLAYER, Game, Position } from "../gameModel.js";
import { getPointPaintPosition, paintTextWithOutline } from "../gamePaint.js";
import { GAME_IMAGES, loadImage } from "../imageLoad.js";
import { MapChunk, chunkXYToMapKey, mapKeyAndTileXYToPosition } from "./map.js";
import { MAP_OBJECTS_FUNCTIONS, MapTileObject, findMapKeyForMapObject } from "./mapObjects.js";

export type MapTileObjectClassBuilding = MapTileObject & {
    buildingId: number,
}

export type Building = {
    id: number,
    playerClass?: string,
    abilities: Ability[],
    pets: TamerPetCharacter[],
    isCharacterLeveling: boolean,
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
        paintInteract: paintInteractSign,
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
    const defeatedBossCharacterClass = game.state.bossStuff.bosses[game.state.bossStuff.bosses.length - 2].characterClass;
    if (defeatedBossCharacterClass) {
        placePlayerClassStuffInBuilding(defeatedBossCharacterClass, game);
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
        isCharacterLeveling: false,
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
}

export function classBuildingCheckAllPlayerForLegendaryAbilitiesAndMoveBackToBuilding(game: Game){
    for(let player of game.state.players){
        if(!player.character.becameEndBoss){
            classBuildingPutLegendaryCharacterStuffBackIntoBuilding(player.character, game);
        }
    }    
}

export function classBuildingPutLegendaryCharacterStuffBackIntoBuilding(character: Character, game: Game){
    for(let i = character.abilities.length - 1; i >= 0; i--){
        const ability = character.abilities[i];
        if(ability.legendary){
            const building = findBuildingById(ability.legendary.buildingRefId, game);
            if(building){
                character.abilities.splice(i,1);
                building.abilities.push(ability);
                building.stuffBorrowed = false;
            }
        }
    }
    if(character.pets){
        for(let i = character.pets.length - 1; i >= 0; i--){
            const pet = character.pets[i];
            if(pet.legendary){
                const building = findBuildingById(pet.legendary.buildingRefId, game);
                if(building){
                    character.pets.splice(i,1);
                    building.pets.push(pet);
                    building.stuffBorrowed = false;
                }
            }
        }
    }
}

function placePlayerClassStuffInBuilding(playerClass: string, game: Game) {
    let classFunctions = PLAYER_CHARACTER_CLASSES_FUNCTIONS[playerClass];
    if (classFunctions) {
        const freeBuilding = findFreeBuilding(game);
        if (freeBuilding) {
            const tempCharacter = createCharacter(0, 0, 0, 0, 0, "", 0, 0, FACTION_PLAYER, "", 0);
            classFunctions.changeCharacterToThisClass(tempCharacter, game.state.idCounter, game);
            freeBuilding.playerClass = playerClass;
            freeBuilding.stuffBorrowed = false;
            for (let ability of tempCharacter.abilities) {
                freeBuilding.abilities.push(ability);
                ability.legendary = { buildingRefId: freeBuilding.id };
            }
            if(tempCharacter.pets){
                for (let pet of tempCharacter.pets) {
                    freeBuilding.pets.push(pet);
                    pet.legendary = { buildingRefId: freeBuilding.id };
                }
            }
        }
    }
}

function findFreeBuilding(game: Game): Building | undefined {
    return game.state.buildings.find((b) => b.playerClass === undefined);
}

function interact(interacter: Character, mapObject: MapTileObject, game: Game) {
    const mapObjectClassBuilding = mapObject as MapTileObjectClassBuilding;
    const classBuilding = findBuildingById(mapObjectClassBuilding.buildingId, game);
    if (!classBuilding || classBuilding.playerClass === undefined || classBuilding.stuffBorrowed) return;
    for (let ability of classBuilding.abilities) {
        interacter.abilities.push(ability);
    }
    if(classBuilding.pets.length > 0){
        if(!interacter.pets) interacter.pets = [];
        for (let pet of classBuilding.pets) {
            interacter.pets.push(pet);
        }
    }
    classBuilding.abilities = [];
    classBuilding.pets = [];
    classBuilding.stuffBorrowed = true;
    if(!interacter.characterClass){
        interacter.characterClass = classBuilding.playerClass;
        if(interacter.upgradeChoices && interacter.upgradeChoices[0].type === "Character"){
            interacter.upgradeChoices = [];
        }
    }else{
        if(!interacter.overtakenCharacterClasses) interacter.overtakenCharacterClasses = [];
        interacter.overtakenCharacterClasses.push(classBuilding.playerClass);
    }
    resetCharacter(interacter);
}

function findBuildingById(id: number, game: Game): Building | undefined {
    return game.state.buildings.find((b) => b.id === id);
}

function paintInteractSign(ctx: CanvasRenderingContext2D, mapObject: MapTileObject, game: Game) {
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
    if (!classBuilding.playerClass) {
        texts.push(
            `Defeat king with class`,
            `to unlock legendary.`,
        )
    } else if (!classBuilding.stuffBorrowed) {
        texts.push(`Class ${classBuilding.playerClass}.`);
        texts.push(`Press interact key to burrow`);
    } else if (classBuilding.stuffBorrowed) {
        texts.push(`Class ${classBuilding.playerClass}.`);
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
    }
}

