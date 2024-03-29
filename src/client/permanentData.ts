import { Building } from "./map/buildings/building.js";
import { changeCharacterId, resetCharacter } from "./character/character.js";
import { Character } from "./character/characterModel.js";
import { changeCharacterAndAbilityIds, deepCopy, getNextId } from "./game.js";
import { CelestialDirection, Game, GameVersion, IdCounter, NextKings, PastPlayerCharacters, setDefaultNextKings } from "./gameModel.js";
import { BUILDING_CLASS_BUILDING, ClassBuilding } from "./map/buildings/classBuilding.js";
import { PermanentPlayerData } from "./player.js";
import { GAME_VERSION } from "./main.js";
import { Highscores } from "./highscores.js";

export type PermanentDataParts = {
    pastCharacters?: PastPlayerCharacters,
    nextKings?: NextKings,
    buildings?: Building[],
    permanentPlayerData?: PermanentPlayerData,
    highscores?: Highscores,
    gameVersion?: GameVersion,
}

const LOCALSTORAGE_PASTCHARACTERS = "pastCharacters";
const LOCALSTORAGE_NEXTKINGS = "nextKings";
const LOCALSTORAGE_BUILDINGS = "buildings";
const LOCALSTORAGE_PLAYER_DATA = "playerData";
const LOCALSTORAGE_GAME_VERSION = "gameVersion";
const LOCALSTORAGE_HIGHSCORES = "highscores";

export function localStorageLoad(game: Game) {
    if (isDataGameVersionOutdated(GAME_VERSION)) {
        localStorage.clear();
        localStorageSaveGameVersion(game);
    } else {
        const localStoragePastCharacters = localStorage.getItem(LOCALSTORAGE_PASTCHARACTERS);
        if (localStoragePastCharacters) loadPastCharacters(JSON.parse(localStoragePastCharacters), game);
        const localStorageNextKings = localStorage.getItem(LOCALSTORAGE_NEXTKINGS);
        if (localStorageNextKings) loadNextKings(JSON.parse(localStorageNextKings), game);
        const localStorageBuildings = localStorage.getItem(LOCALSTORAGE_BUILDINGS);
        if (localStorageBuildings) loadBuildings(JSON.parse(localStorageBuildings), game);
        const localStoragePlayerData = localStorage.getItem(LOCALSTORAGE_PLAYER_DATA);
        if (localStoragePlayerData) loadPlayerData(JSON.parse(localStoragePlayerData), game);
        const localStorageHighscores = localStorage.getItem(LOCALSTORAGE_HIGHSCORES);
        if (localStorageHighscores) loadHighscores(JSON.parse(localStorageHighscores), game);
    }
}

export function copyAndSetPermanentDataForReplay(permanentData: PermanentDataParts, game: Game) {
    permanentData.nextKings = deepCopy(game.state.bossStuff.nextKings);
    permanentData.pastCharacters = deepCopy(game.state.pastPlayerCharacters);
    permanentData.buildings = deepCopy(game.state.buildings);
    permanentData.gameVersion = deepCopy(game.state.gameVersion);
    if (game.state.players.length > 0) permanentData.permanentPlayerData = deepCopy(game.state.players[0].permanentData);
}

export function localStorageSaveNextKings(game: Game) {
    if (!game.multiplayer.disableLocalStorage && !game.testing.replay) {
        localStorage.setItem(LOCALSTORAGE_NEXTKINGS, JSON.stringify(game.state.bossStuff.nextKings));
        localStorageSaveBuildings(game);
    }
}

export function localStorageSaveHighscores(game: Game) {
    if (!game.multiplayer.disableLocalStorage && !game.testing.replay) {
        localStorage.setItem(LOCALSTORAGE_HIGHSCORES, JSON.stringify(game.state.highscores));
    }
}

export function localStorageSavePastCharacters(game: Game) {
    if (!game.multiplayer.disableLocalStorage && !game.testing.replay) {
        localStorage.setItem(LOCALSTORAGE_PASTCHARACTERS, JSON.stringify(game.state.pastPlayerCharacters));
    }
}

export function localStorageSaveBuildings(game: Game) {
    if (!game.multiplayer.disableLocalStorage && !game.testing.replay) {
        localStorage.setItem(LOCALSTORAGE_BUILDINGS, JSON.stringify(game.state.buildings));
    }
}

export function localStorageSavePermanentPlayerData(game: Game) {
    if (!game.multiplayer.disableLocalStorage && !game.testing.replay) {
        localStorage.setItem(LOCALSTORAGE_PLAYER_DATA, JSON.stringify(game.state.players[0].permanentData));
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

export function loadBuildings(buildings: Building[], game: Game) {
    game.state.buildings = buildings;
    for (let building of buildings) {
        changeBuildingIds(building, game.state.idCounter, game);
    }
}

export function loadPlayerData(playerData: PermanentPlayerData, game: Game) {
    if (game.state.players.length > 0) {
        game.state.players[0].permanentData = playerData;
    }
}

function loadHighscores(highscores: Highscores, game: Game) {
    game.state.highscores = highscores;
}

function isDataGameVersionOutdated(gameVersion: GameVersion): boolean {
    const stringGameVersion = localStorage.getItem(LOCALSTORAGE_GAME_VERSION);
    if (stringGameVersion === null) return true;
    const localStorageGameVersion: GameVersion = JSON.parse(stringGameVersion);
    if (gameVersion.major !== localStorageGameVersion.major
        || gameVersion.minor !== localStorageGameVersion.minor
    ) {
        return true
    }
    return false;
}

function localStorageSaveGameVersion(game: Game) {
    if (!game.multiplayer.disableLocalStorage && !game.testing.replay) {
        localStorage.setItem(LOCALSTORAGE_GAME_VERSION, JSON.stringify(game.state.gameVersion));
    }
}

function changeBuildingIds(building: Building, idCounter: IdCounter, game: Game) {
    const oldBuildingId = building.id;
    let oldCharacterClassId: number | undefined = undefined;
    building.id = getNextId(idCounter);
    if (building.type === BUILDING_CLASS_BUILDING) {
        const classBuilding = building as ClassBuilding;
        if (classBuilding.characterClass) {
            oldCharacterClassId = classBuilding.characterClass.id;
            classBuilding.characterClass.id = getNextId(idCounter);
        }
        for (let ability of classBuilding.abilities) {
            ability.id = getNextId(idCounter);
            if (ability.legendary) ability.legendary.buildingIdRef = building.id;
            if (ability.classIdRef !== undefined && classBuilding.characterClass) ability.classIdRef = classBuilding.characterClass.id;
        }
        for (let pet of classBuilding.pets) {
            changeCharacterId(pet, idCounter);
            if (pet.legendary) pet.legendary.buildingIdRef = building.id;
        }
        if (game.state.bossStuff.nextKings) {
            const keys = Object.keys(game.state.bossStuff.nextKings);
            for (let key of keys) {
                const king: Character | undefined = (game.state.bossStuff.nextKings as any)[key];
                if (!king) continue;
                for (let ability of king.abilities) {
                    if (ability.legendary && ability.legendary.buildingIdRef === oldBuildingId) {
                        ability.legendary.buildingIdRef = building.id;
                    }
                }
                if (king.pets) {
                    for (let pet of king.pets) {
                        if (pet.legendary && pet.legendary.buildingIdRef === oldBuildingId) {
                            pet.legendary.buildingIdRef = building.id;
                        }
                    }
                }
                if (classBuilding.characterClass && oldCharacterClassId !== undefined && king.characterClasses) {
                    for (let charClass of king.characterClasses) {
                        if (charClass.id === oldCharacterClassId) {
                            charClass.id = classBuilding.characterClass.id;
                        }
                    }
                }
            }
        }
    }
}

export function setPermanentDataFromReplayData(game: Game) {
    const replay = game.testing.replay;
    if (!replay) return;
    const replayGameVersion = replay.data?.permanentData.gameVersion;
    if (replayGameVersion === undefined || isDataGameVersionOutdated(replayGameVersion)) {
        console.log("Outdated replay!");
    }

    if (game.state.map.kingArea) {
        if (replay.data?.permanentData.nextKings) {
            loadNextKings(replay.data?.permanentData.nextKings, game);
        } else {
            setDefaultNextKings(game);
        }
    }
    if (replay.data?.permanentData.pastCharacters) {
        loadPastCharacters(replay.data.permanentData.pastCharacters, game);
    } else {
        game.state.pastPlayerCharacters.characters = [];
    }
    if (replay.data?.permanentData.buildings) {
        loadBuildings(replay.data.permanentData.buildings, game);
    } else {
        game.state.buildings = [];
    }
    if (replay.data?.permanentData.permanentPlayerData) {
        loadPlayerData(replay.data.permanentData.permanentPlayerData, game);
    } else if (game.state.players.length > 0) {
        game.state.players[0].permanentData = {
            money: 0,
            upgrades: {},
        };
    }
}
