import { Building } from "./map/buildings/building.js";
import { changeCharacterId, resetCharacter } from "./character/character.js";
import { Character } from "./character/characterModel.js";
import { changeCharacterAndAbilityIds, deepCopy, getNextId } from "./game.js";
import { CelestialDirection, Game, GameVersion, IdCounter, NextKings, PastPlayerCharacters, setDefaultNextKings } from "./gameModel.js";
import { BUILDING_CLASS_BUILDING, ClassBuilding } from "./map/buildings/classBuilding.js";
import { PermanentPlayerData, createPlayerWithPlayerCharacter } from "./player.js";
import { GAME_VERSION } from "./main.js";
import { Highscores, createHighscoreBoards } from "./highscores.js";
import { Achievements, createDefaultAchivements } from "./achievements/achievements.js";

export type PermanentDataParts = {
    pastCharacters?: PastPlayerCharacters,
    nextKings?: NextKings,
    buildings?: Building[],
    permanentPlayerData?: PermanentPlayerData,
    highscores?: Highscores,
    achievements?: Achievements,
    gameVersion?: GameVersion,
}

const LOCALSTORAGE_PASTCHARACTERS = "pastCharacters";
const LOCALSTORAGE_NEXTKINGS = "nextKings";
const LOCALSTORAGE_BUILDINGS = "buildings";
const LOCALSTORAGE_PLAYER_DATA = "playerData";
const LOCALSTORAGE_GAME_VERSION = "gameVersion";
const LOCALSTORAGE_HIGHSCORES = "highscores";
const LOCALSTORAGE_ACHIEVEMENTS = "achievements";

export function localStorageLoad(game: Game) {
    if (isDataGameVersionOutdated(GAME_VERSION)) {
        resetPermanentData();
        localStorageSaveGameVersion(game);
    } else {
        const localStoragePastCharacters = localStorage.getItem(LOCALSTORAGE_PASTCHARACTERS);
        loadPastCharacters(jsonParseNullAllowed(localStoragePastCharacters), game);
        const localStorageNextKings = localStorage.getItem(LOCALSTORAGE_NEXTKINGS);
        loadNextKings(jsonParseNullAllowed(localStorageNextKings), game);
        const localStorageBuildings = localStorage.getItem(LOCALSTORAGE_BUILDINGS);
        loadBuildings(jsonParseNullAllowed(localStorageBuildings), game);
        const localStoragePlayerData = localStorage.getItem(LOCALSTORAGE_PLAYER_DATA);
        loadPlayerData(jsonParseNullAllowed(localStoragePlayerData), game);
        const localStorageHighscores = localStorage.getItem(LOCALSTORAGE_HIGHSCORES);
        loadHighscores(jsonParseNullAllowed(localStorageHighscores), game);
        const localStorageAchievements = localStorage.getItem(LOCALSTORAGE_ACHIEVEMENTS);
        loadAchievements(jsonParseNullAllowed(localStorageAchievements), game);
    }
}

export function resetPermanentData() {
    localStorage.removeItem(LOCALSTORAGE_PASTCHARACTERS);
    localStorage.removeItem(LOCALSTORAGE_NEXTKINGS);
    localStorage.removeItem(LOCALSTORAGE_BUILDINGS);
    localStorage.removeItem(LOCALSTORAGE_PLAYER_DATA);
    localStorage.removeItem(LOCALSTORAGE_HIGHSCORES);
    localStorage.removeItem(LOCALSTORAGE_ACHIEVEMENTS);
}

export function copyAndSetPermanentDataForReplay(permanentData: PermanentDataParts, game: Game) {
    permanentData.nextKings = deepCopy(game.state.bossStuff.nextKings);
    permanentData.pastCharacters = deepCopy(game.state.pastPlayerCharacters);
    permanentData.buildings = deepCopy(game.state.buildings);
    permanentData.gameVersion = deepCopy(game.state.gameVersion);
    permanentData.achievements = deepCopy(game.state.achievements);
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

export function localStorageSaveAchievements(game: Game) {
    if (!game.multiplayer.disableLocalStorage && !game.testing.replay) {
        localStorage.setItem(LOCALSTORAGE_ACHIEVEMENTS, JSON.stringify(game.state.achievements));
    }
}

export function setPermanentDataFromReplayData(game: Game) {
    const replay = game.testing.replay;
    if (!replay) return;

    if (game.state.map.kingArea) {
        loadNextKings(replay.data?.permanentData.nextKings, game);
    }
    loadPastCharacters(replay.data?.permanentData.pastCharacters, game);
    loadBuildings(replay.data?.permanentData.buildings, game);
    loadPlayerData(replay.data?.permanentData.permanentPlayerData, game);
    loadAchievements(replay.data?.permanentData.achievements, game);
    if (replay.data?.multiplayerData) {
        game.state.clientInfos = [];
        game.state.players = [];
        for (let replayClient of replay.data.multiplayerData) {
            game.state.clientInfos.push(deepCopy(replayClient.clientInfo));
            const player = createPlayerWithPlayerCharacter(game.state.idCounter, replayClient.clientInfo.id, { x: 0, y: 0 }, game.state.randomSeed, game);
            game.state.players.push(player);
        }
    }
}

function loadPastCharacters(pastPlayerCharacters: PastPlayerCharacters | undefined, game: Game) {
    if (!pastPlayerCharacters) {
        game.state.pastPlayerCharacters.characters = [];
        return;
    }
    game.state.pastPlayerCharacters = pastPlayerCharacters;
    for (let pastChar of pastPlayerCharacters.characters) {
        if (!pastChar) continue;
        resetCharacter(pastChar, game);
        changeCharacterAndAbilityIds(pastChar, game.state.idCounter);
    }
}

function loadNextKings(nextKings: NextKings | undefined, game: Game) {
    if (!nextKings) {
        setDefaultNextKings(game);
        return;
    }
    game.state.bossStuff.nextKings = nextKings;
    const keys = Object.keys(nextKings) as CelestialDirection[];
    for (let key of keys) {
        const king = nextKings[key];
        if (king) changeCharacterAndAbilityIds(king, game.state.idCounter);
    }
}

function loadBuildings(buildings: Building[] | undefined, game: Game) {
    if (!buildings) {
        game.state.buildings = [];
        return;
    }
    game.state.buildings = buildings;
    for (let building of buildings) {
        changeBuildingIds(building, game.state.idCounter, game);
    }
}

function loadPlayerData(playerData: PermanentPlayerData | undefined, game: Game) {
    if (game.state.players.length > 0) {
        if (!playerData) {
            game.state.players[0].permanentData = { money: 0, upgrades: {} };
        } else {
            game.state.players[0].permanentData = playerData;
        }
    }
}

function loadHighscores(highscores: Highscores | undefined, game: Game) {
    if (!highscores) {
        game.state.highscores = createHighscoreBoards();
    } else {
        game.state.highscores = highscores;
    }
}

function loadAchievements(achievements: Achievements | undefined, game: Game) {
    if (!achievements) {
        game.state.achievements = createDefaultAchivements();
    } else {
        game.state.achievements = achievements;
    }
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
            if (classBuilding.characterClass) pet.classIdRef = classBuilding.characterClass.id;
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

function jsonParseNullAllowed(jsonString: string | null): any {
    if (jsonString === null) return undefined;
    const result = JSON.parse(jsonString);
    return result;
}
