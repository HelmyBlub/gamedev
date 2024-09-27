import { getPlayerCharacters, resetCharacter } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { CHARACTER_TYPE_BOSS_CLONE_ENEMY, setCharacterToBossLevel } from "../character/enemy/bossEnemy.js";
import { CHARACTER_PET_TYPE_CLONE, CharacterPetClone } from "../character/playerCharacters/characterPetTypeClone.js";
import { TAMER_PET_CHARACTER } from "../character/playerCharacters/tamer/tamerPetCharacter.js";
import { changeCharacterAndAbilityIds, deepCopy } from "../game.js";
import { FACTION_ENEMY, Game } from "../gameModel.js";
import { Curse, CURSES_FUNCTIONS } from "./curse.js";

export const CURSE_DARKNESS = "Darkness";
const TIME_TO_TURN_EVIL = 6000;
const CLONE_SPAWN_INTERVAL = 1000;
const EVIL_TRANSFORM_TIME = 3000;

export type CurseDarkness = Curse & {
    cloneCounter: number,
    turnEvilTime?: number,
    evilIdRefs: number[],
    nextCloneSpawnTime?: number,
}

export function addCurseDarkness() {
    CURSES_FUNCTIONS[CURSE_DARKNESS] = {
        tick: tickDarkness,
    };
}

export function createCurseDarkness(): CurseDarkness {
    return {
        level: 1,
        type: CURSE_DARKNESS,
        cloneCounter: 0,
        evilIdRefs: [],
    };
}

export function curseDarknessCloneKillCheck(clone: Character, game: Game) {
    const playerCharacters = getPlayerCharacters(game.state.players);
    for (let char of playerCharacters) {
        if (char.curses === undefined) continue;
        const curse = char.curses.find(c => c.type === CURSE_DARKNESS);
        if (!curse) continue;
        const darkness = curse as CurseDarkness;
        const idIndex = darkness.evilIdRefs.findIndex(id => id === clone.id);
        if (idIndex === -1) continue;
        darkness.evilIdRefs.splice(idIndex, 1);
        return;
    }
}

function createClone(original: Character, game: Game): Character {
    const clone: Character = deepCopy(original);
    if (clone.pets) {
        for (let i = clone.pets.length - 1; i >= 0; i--) {
            if (clone.pets[i].type === TAMER_PET_CHARACTER) continue;
            clone.pets.splice(i, 1);
        }
    }
    if (clone.curses) clone.curses = undefined;
    clone.type = CHARACTER_PET_TYPE_CLONE;
    resetCharacter(clone, game);
    changeCharacterAndAbilityIds(clone, game.state.idCounter);

    return clone;
}

function spawnClone(darkness: CurseDarkness, target: Character, game: Game) {
    if (darkness.evilIdRefs.length > 0 || Math.floor(darkness.level) <= darkness.cloneCounter) return;
    if (darkness.nextCloneSpawnTime !== undefined && darkness.nextCloneSpawnTime > game.state.time) return;
    darkness.nextCloneSpawnTime = game.state.time + CLONE_SPAWN_INTERVAL;
    const clone = createClone(target, game);
    if (!target.pets) target.pets = [];
    target.pets.push(clone);
    darkness.cloneCounter++;
    if (darkness.turnEvilTime === undefined) darkness.turnEvilTime = game.state.time + TIME_TO_TURN_EVIL;
}

function startTurnEvil(darkness: CurseDarkness, target: Character, game: Game) {
    if (darkness.turnEvilTime === undefined || !target.pets) return;
    if (darkness.turnEvilTime > game.state.time) return;
    for (let i = target.pets.length - 1; i >= 0; i--) {
        const pet = target.pets[i];
        if (pet.type !== CHARACTER_PET_TYPE_CLONE) continue;
        const clone = pet as CharacterPetClone;
        if (clone.turnEvilStartedTime !== undefined) return;
        clone.turnEvilDuration = EVIL_TRANSFORM_TIME;
        clone.turnEvilStartedTime = game.state.time;
        createDarkCharacterPaint(clone);
    }
}

function createDarkCharacterPaint(clone: CharacterPetClone) {
    if (clone.paint.randomizedCharacterImage) {
        const orig = clone.paint.randomizedCharacterImage;
        clone.tempDarkCharacterImage = {
            chestIndex: orig.chestIndex,
            clothColor: "black",
            headIndex: orig.headIndex,
            legsIndex: orig.legsIndex,
            skinColor: "black"
        }
    }
}

function turnEvil(darkness: CurseDarkness, target: Character, game: Game) {
    if (darkness.turnEvilTime === undefined || !target.pets) return;
    if (darkness.turnEvilTime + EVIL_TRANSFORM_TIME > game.state.time) return;
    for (let i = target.pets.length - 1; i >= 0; i--) {
        const pet = target.pets[i];
        if (pet.type !== CHARACTER_PET_TYPE_CLONE) continue;
        const clone = target.pets.splice(i, 1)[0] as CharacterPetClone;
        clone.faction = FACTION_ENEMY;
        clone.type = CHARACTER_TYPE_BOSS_CLONE_ENEMY;
        const level = game.state.bossStuff.bossLevelCounter + Math.floor(darkness.level);
        clone.paint.randomizedCharacterImage = clone.tempDarkCharacterImage;
        clone.tempDarkCharacterImage = undefined;
        setCharacterToBossLevel(clone, level);
        game.state.bossStuff.bosses.push(clone);
        darkness.evilIdRefs.push(clone.id);
    }
    darkness.turnEvilTime = undefined;
    darkness.cloneCounter = 0;
}

function tickDarkness(curse: Curse, target: Character, game: Game) {
    const darkness = curse as CurseDarkness;
    spawnClone(darkness, target, game);
    startTurnEvil(darkness, target, game);
    turnEvil(darkness, target, game);
}

