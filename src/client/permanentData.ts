import { resetCharacter } from "./character/character.js";
import { changeCharacterAndAbilityIds } from "./game.js";
import { CelestialDirection, Game, NextEndbosses, PastPlayerCharacters } from "./gameModel.js";

export type PermanentDataParts = {

}

const LOCALSTORAGE_PASTCHARACTERS = "pastCharacters";
const LOCALSTORAGE_NEXTENDBOSSES = "nextEndBosses";

export function localStorageLoad(game: Game) {
    const localStoragePastCharacters = localStorage.getItem(LOCALSTORAGE_PASTCHARACTERS);
    if (localStoragePastCharacters) loadPastCharacters(JSON.parse(localStoragePastCharacters), game);
    const localStorageNextEndbosses = localStorage.getItem(LOCALSTORAGE_NEXTENDBOSSES);
    if (localStorageNextEndbosses) loadNextEnbosses(JSON.parse(localStorageNextEndbosses), game);
}

export function localStorageSave(game: Game) {
    localStorageSaveNextEndbosses(game);
    localStorageSavePastCharacters(game);
}

export function localStorageSaveNextEndbosses(game: Game) {
    if (!game.multiplayer.disableLocalStorage) {
        localStorage.setItem(LOCALSTORAGE_NEXTENDBOSSES, JSON.stringify(game.state.bossStuff.nextEndbosses));
    }
}

export function localStorageSavePastCharacters(game: Game) {
    if (!game.multiplayer.disableLocalStorage) {
        localStorage.setItem(LOCALSTORAGE_PASTCHARACTERS, JSON.stringify(game.state.pastPlayerCharacters));
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