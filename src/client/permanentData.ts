import { changeCharacterId, resetCharacter } from "./character/character.js";
import { Character } from "./character/characterModel.js";
import { changeCharacterAndAbilityIds, getNextId } from "./game.js";
import { CelestialDirection, Game, IdCounter, NextKings, PastPlayerCharacters } from "./gameModel.js";
import { Building } from "./map/mapObjectClassBuilding.js";

export type PermanentDataParts = {
    pastCharacters?: PastPlayerCharacters,
    nextKings?: NextKings,
    buildings?: Building[],
}

const LOCALSTORAGE_PASTCHARACTERS = "pastCharacters";
const LOCALSTORAGE_NEXTKINGS = "nextKings";
const LOCALSTORAGE_BUILDINGS = "buildings";

export function localStorageLoad(game: Game) {
    const localStoragePastCharacters = localStorage.getItem(LOCALSTORAGE_PASTCHARACTERS);
    if (localStoragePastCharacters) loadPastCharacters(JSON.parse(localStoragePastCharacters), game);
    const localStorageNextKings = localStorage.getItem(LOCALSTORAGE_NEXTKINGS);
    if (localStorageNextKings) loadNextKings(JSON.parse(localStorageNextKings), game);
    const localStorageBuildings = localStorage.getItem(LOCALSTORAGE_BUILDINGS);
    if (localStorageBuildings) loadBuildings(JSON.parse(localStorageBuildings), game);
}

export function localStorageSaveNextKings(game: Game) {
    if (!game.multiplayer.disableLocalStorage) {
        localStorage.setItem(LOCALSTORAGE_NEXTKINGS, JSON.stringify(game.state.bossStuff.nextKings));
        localStorageSaveBuildings(game);
    }
}

export function localStorageSavePastCharacters(game: Game) {
    if (!game.multiplayer.disableLocalStorage) {
        localStorage.setItem(LOCALSTORAGE_PASTCHARACTERS, JSON.stringify(game.state.pastPlayerCharacters));
    }
}

export function localStorageSaveBuildings(game: Game) {
    if (!game.multiplayer.disableLocalStorage) {
        localStorage.setItem(LOCALSTORAGE_BUILDINGS, JSON.stringify(game.state.buildings));
    }
}

export function loadPastCharacters(pastPlayerCharacters: PastPlayerCharacters, game: Game) {
    game.state.pastPlayerCharacters = pastPlayerCharacters;
    for (let pastChar of pastPlayerCharacters.characters) {
        if (!pastChar) continue;
        resetCharacter(pastChar, game);
        changeCharacterAndAbilityIds(pastChar, game.state.idCounter);
    }
}

export function loadNextKings(nextKings: NextKings, game: Game) {
    game.state.bossStuff.nextKings = nextKings;
    const keys = Object.keys(nextKings) as CelestialDirection[];
    for (let key of keys) {
        const king = nextKings[key];
        if (king) changeCharacterAndAbilityIds(king, game.state.idCounter);
    }
}

function loadBuildings(buildings: Building[], game: Game) {
    game.state.buildings = buildings;
    for (let building of buildings) {
        changeBuildingIds(building, game.state.idCounter, game);
    }
}

function changeBuildingIds(building: Building, idCounter: IdCounter, game: Game) {
    const oldBuildingId = building.id;
    let oldCharacterClassId: number | undefined = undefined;
    building.id = getNextId(idCounter);
    if (building.characterClass) {
        oldCharacterClassId = building.characterClass.id;
        building.characterClass.id = getNextId(idCounter);
    }
    for (let ability of building.abilities) {
        ability.id = getNextId(idCounter);
        if (ability.legendary) ability.legendary.buildingIdRef = building.id;
        if (ability.classIdRef !== undefined && building.characterClass) ability.classIdRef = building.characterClass.id;
    }
    for (let pet of building.pets) {
        changeCharacterId(pet, idCounter);
        if (pet.legendary) pet.legendary.buildingIdRef = building.id;
    }
    if(game.state.bossStuff.nextKings){
        const keys = Object.keys(game.state.bossStuff.nextKings);
        for(let key of keys){
            const king: Character | undefined = (game.state.bossStuff.nextKings as any)[key];
            if(!king) continue;
            for (let ability of king.abilities) {
                if (ability.legendary && ability.legendary.buildingIdRef === oldBuildingId){
                    ability.legendary.buildingIdRef = building.id;
                } 
            }
            if(king.pets){
                for (let pet of king.pets) {
                    if (pet.legendary && pet.legendary.buildingIdRef === oldBuildingId){
                        pet.legendary.buildingIdRef = building.id;
                    }
                }
            }
            if(building.characterClass && oldCharacterClassId !== undefined && king.characterClasses){
                for(let charClass of king.characterClasses){
                    if(charClass.id === oldCharacterClassId){
                        charClass.id = building.characterClass.id;
                    }
                }
            }
        }
    }
}