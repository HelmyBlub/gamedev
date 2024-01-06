import { changeCharacterId, resetCharacter } from "./character/character.js";
import { Character } from "./character/characterModel.js";
import { changeCharacterAndAbilityIds, getNextId } from "./game.js";
import { CelestialDirection, Game, IdCounter, NextEndbosses, PastPlayerCharacters } from "./gameModel.js";
import { Building } from "./map/mapObjectClassBuilding.js";

export type PermanentDataParts = {
    pastCharacters?: PastPlayerCharacters,
    nextEndBosses?: NextEndbosses,
    buildings?: Building[],
}

const LOCALSTORAGE_PASTCHARACTERS = "pastCharacters";
const LOCALSTORAGE_NEXTENDBOSSES = "nextEndBosses";
const LOCALSTORAGE_BUILDINGS = "buildings";

export function localStorageLoad(game: Game) {
    const localStoragePastCharacters = localStorage.getItem(LOCALSTORAGE_PASTCHARACTERS);
    if (localStoragePastCharacters) loadPastCharacters(JSON.parse(localStoragePastCharacters), game);
    const localStorageNextEndbosses = localStorage.getItem(LOCALSTORAGE_NEXTENDBOSSES);
    if (localStorageNextEndbosses) loadNextEnbosses(JSON.parse(localStorageNextEndbosses), game);
    const localStorageBuildings = localStorage.getItem(LOCALSTORAGE_BUILDINGS);
    if (localStorageBuildings) loadBuildings(JSON.parse(localStorageBuildings), game);
}

export function localStorageSaveNextEndbosses(game: Game) {
    if (!game.multiplayer.disableLocalStorage) {
        localStorage.setItem(LOCALSTORAGE_NEXTENDBOSSES, JSON.stringify(game.state.bossStuff.nextEndbosses));
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
        resetCharacter(pastChar);
        changeCharacterAndAbilityIds(pastChar, game.state.idCounter);
    }
}

export function loadNextEnbosses(nextEndbosses: NextEndbosses, game: Game) {
    game.state.bossStuff.nextEndbosses = nextEndbosses;
    const keys = Object.keys(nextEndbosses) as CelestialDirection[];
    for (let key of keys) {
        const endboss = nextEndbosses[key];
        if (endboss) changeCharacterAndAbilityIds(endboss, game.state.idCounter);
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
    for (let ability of building.abilities) {
        ability.id = getNextId(idCounter);
        if (ability.legendary) ability.legendary.buildingIdRef = building.id;
    }
    for (let pet of building.pets) {
        changeCharacterId(pet, idCounter);
        if (pet.legendary) pet.legendary.buildingIdRef = building.id;
    }
    if (building.characterClass) {
        oldCharacterClassId = building.characterClass.id;
        building.characterClass.id = getNextId(idCounter);
    }
    if(game.state.bossStuff.nextEndbosses){
        const keys = Object.keys(game.state.bossStuff.nextEndbosses);
        for(let key of keys){
            const endboss: Character | undefined = (game.state.bossStuff.nextEndbosses as any)[key];
            if(!endboss) continue;
            for (let ability of endboss.abilities) {
                if (ability.legendary && ability.legendary.buildingIdRef === oldBuildingId){
                    ability.legendary.buildingIdRef = building.id;
                } 
            }
            if(endboss.pets){
                for (let pet of endboss.pets) {
                    if (pet.legendary && pet.legendary.buildingIdRef === oldBuildingId){
                        pet.legendary.buildingIdRef = building.id;
                    }
                }
            }
            if(building.characterClass && oldCharacterClassId !== undefined && endboss.characterClasses){
                for(let charClass of endboss.characterClasses){
                    if(charClass.id === oldCharacterClassId){
                        charClass.id = building.characterClass.id;
                    }
                }
            }
        }
    }
}