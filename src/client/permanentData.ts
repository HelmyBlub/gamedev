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
import { GameMapModifier } from "./map/modifiers/mapModifier.js";

export type PermanentDataParts = {
    pastCharacters?: PastPlayerCharacters,
    nextKings?: NextKings,
    buildings?: Building[],
    permanentPlayerData?: PermanentPlayerData,
    highscores?: Highscores,
    achievements?: Achievements,
    gameVersion?: GameVersion,
    mapModifier?: GameMapModifier[],
}

const LOCALSTORAGE_GAME = "HelmysGame";

export function localStorageLoad(game: Game) {
    if (isDataGameVersionOutdated(GAME_VERSION)) {
        resetPermanentData();
        localStorageSaveAll(game);
    } else {
        const permanentDataParts: PermanentDataParts | undefined = jsonParseNullAllowed(localStorage.getItem(LOCALSTORAGE_GAME));
        loadPermanentDataParts(permanentDataParts, game);
    }
}

export function resetPermanentData() {
    localStorage.removeItem(LOCALSTORAGE_GAME);
}

export function copyAndSetPermanentDataForReplay(permanentData: PermanentDataParts, game: Game) {
    permanentData.nextKings = deepCopy(game.state.bossStuff.nextKings);
    permanentData.pastCharacters = deepCopy(game.state.pastPlayerCharacters);
    permanentData.buildings = deepCopy(game.state.buildings);
    permanentData.gameVersion = deepCopy(game.state.gameVersion);
    permanentData.achievements = deepCopy(game.state.achievements);
    permanentData.mapModifier = deepCopy(game.state.map.mapModifiers);
    if (game.state.players.length > 0) permanentData.permanentPlayerData = deepCopy(game.state.players[0].permanentData);
}

export function localStorageSaveAll(game: Game) {
    if (!game.multiplayer.disableLocalStorage && !game.testing.replay) {
        const permanentData: PermanentDataParts = {};
        permanentData.nextKings = game.state.bossStuff.nextKings;
        permanentData.pastCharacters = game.state.pastPlayerCharacters;
        permanentData.buildings = game.state.buildings;
        permanentData.gameVersion = game.state.gameVersion;
        permanentData.achievements = game.state.achievements;
        permanentData.highscores = game.state.highscores;
        permanentData.permanentPlayerData = game.state.players[0].permanentData;
        permanentData.mapModifier = game.state.map.mapModifiers;
        localStorage.setItem(LOCALSTORAGE_GAME, JSON.stringify(permanentData));
    }
}

export function localStorageSaveMidGame(game: Game) {
    if (!game.multiplayer.disableLocalStorage && !game.testing.replay) {
        const permanentData: PermanentDataParts | undefined = jsonParseNullAllowed(localStorage.getItem(LOCALSTORAGE_GAME));
        if (!permanentData) return;
        permanentData.achievements = game.state.achievements;
        permanentData.permanentPlayerData = game.state.players[0].permanentData;
        permanentData.mapModifier = game.state.map.mapModifiers;
        localStorage.setItem(LOCALSTORAGE_GAME, JSON.stringify(permanentData));
    }
}

export function setPermanentDataFromReplayData(game: Game) {
    const replay = game.testing.replay;
    if (!replay) return;
    loadPermanentDataParts(replay.data?.permanentData, game);
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

function loadPermanentDataParts(permanentDataParts: PermanentDataParts | undefined, game: Game) {
    if (!permanentDataParts) return;
    loadPastCharacters(permanentDataParts, game);
    loadNextKings(permanentDataParts, game);
    loadBuildings(permanentDataParts, game);
    loadPlayerData(permanentDataParts, game);
    loadHighscores(permanentDataParts, game);
    loadAchievements(permanentDataParts, game);
    loadMapModifier(permanentDataParts, game);
}

function loadMapModifier(permanentDataParts: PermanentDataParts, game: Game) {
    const mapModifier = permanentDataParts.mapModifier;
    if (!mapModifier) {
        game.state.map.mapModifiers = [];
        return;
    }
    game.state.map.mapModifiers = mapModifier;
}

function loadPastCharacters(permanentDataParts: PermanentDataParts, game: Game) {
    const pastPlayerCharacters = permanentDataParts.pastCharacters;
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

function loadNextKings(permanentDataParts: PermanentDataParts, game: Game) {
    const nextKings = permanentDataParts.nextKings;
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

function loadBuildings(permanentDataParts: PermanentDataParts, game: Game) {
    const buildings = permanentDataParts.buildings;
    if (!buildings) {
        game.state.buildings = [];
        return;
    }
    game.state.buildings = buildings;
    for (let building of buildings) {
        changeBuildingIds(building, game.state.idCounter, game);
    }
}

function loadPlayerData(permanentDataParts: PermanentDataParts, game: Game) {
    const playerData = permanentDataParts.permanentPlayerData;
    if (game.state.players.length > 0) {
        if (!playerData) {
            game.state.players[0].permanentData = { money: 0, upgrades: {} };
        } else {
            game.state.players[0].permanentData = playerData;
        }
    }
}

function loadHighscores(permanentDataParts: PermanentDataParts, game: Game) {
    const highscores = permanentDataParts.highscores;
    if (!highscores) {
        game.state.highscores = createHighscoreBoards();
    } else {
        game.state.highscores = highscores;
    }
}

function loadAchievements(permanentDataParts: PermanentDataParts, game: Game) {
    const achievements = permanentDataParts.achievements;
    if (!achievements) {
        game.state.achievements = createDefaultAchivements();
    } else {
        game.state.achievements = achievements;
    }
}

function isDataGameVersionOutdated(gameVersion: GameVersion): boolean {
    const permanentDataParts: PermanentDataParts | undefined = jsonParseNullAllowed(localStorage.getItem(LOCALSTORAGE_GAME));
    if (!permanentDataParts || !permanentDataParts.gameVersion) return true;
    const localStorageGameVersion: GameVersion = permanentDataParts.gameVersion;
    if (gameVersion.major !== localStorageGameVersion.major
        || gameVersion.minor !== localStorageGameVersion.minor
    ) {
        return true
    }
    return false;
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
                        if (ability.classIdRef) ability.classIdRef = classBuilding.characterClass!.id;
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
