import { getPlayerCharacters, resetCharacter } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { CHARACTER_TYPE_BOSS_CLONE_ENEMY, setCharacterToBossLevel } from "../character/enemy/bossEnemy.js";
import { CHARACTER_PET_TYPE_CLONE, CharacterPetClone } from "../character/playerCharacters/characterPetTypeClone.js";
import { TAMER_PET_CHARACTER } from "../character/playerCharacters/tamer/tamerPetCharacter.js";
import { changeCharacterAndAbilityIds, deepCopy, getNextId } from "../game.js";
import { FACTION_ENEMY, FACTION_PLAYER, Game, IdCounter } from "../gameModel.js";
import { MODIFIER_NAME_DARKNESS } from "../map/modifiers/mapModifierDarkness.js";
import { RandomizedCharacterImage } from "../randomizedCharacterImage.js";
import { Curse, CURSES_FUNCTIONS } from "./curse.js";

export const CURSE_DARKNESS = "Curse Darkness";
const TIME_TO_TURN_EVIL = 60000;
const CLONE_SPAWN_INTERVAL = 1000;
const EVIL_TRANSFORM_TIME = 3000;
const AMOUNT_CURSE_PER_CLONE = 10;

export type CurseDarkness = Curse & {
    cloneCounter: number,
    turnEvilTime?: number,
    evilIdRefs: number[],
    nextCloneSpawnTime?: number,
}

export function addCurseDarkness() {
    CURSES_FUNCTIONS[CURSE_DARKNESS] = {
        create: create,
        onCurseIncreased: onCurseDarknessIncrease,
        remove: remove,
        reset: reset,
        tick: tickDarkness,
        mapModifierName: MODIFIER_NAME_DARKNESS,
    };
}

function create(idCounter: IdCounter): CurseDarkness {
    return {
        id: getNextId(idCounter),
        level: 1,
        type: CURSE_DARKNESS,
        cloneCounter: 0,
        evilIdRefs: [],
        color: "black",
    };
}

function remove(curse: Curse, target: Character, game: Game) {
    if (!target.pets) return;
    for (let i = target.pets.length - 1; i >= 0; i--) {
        const pet = target.pets[i];
        if (pet.type === CHARACTER_PET_TYPE_CLONE) {
            target.pets.splice(i, 1);
        }
    }
}

export function curseDarknessCloneKillCheck(clone: Character, game: Game) {
    const playerCharacters = getPlayerCharacters(game.state.players);
    for (let char of playerCharacters) {
        if (checkForCurseAndDelete(char, clone.id)) return;
    }
    for (let boss of game.state.bossStuff.bosses) {
        if (checkForCurseAndDelete(boss, clone.id)) return;
    }
}

export function createDarkClone(toCloneCharacter: Character, level: number, game: Game): Character {
    const clone = createClone(toCloneCharacter, game);
    turnEvil(clone, level);
    return clone;
}

function onCurseDarknessIncrease(curse: Curse, curseTarget: Character, game: Game) {
    const darkness = curse as CurseDarkness;
    if (!curseTarget.pets) return;
    const maxClones = Math.ceil(darkness.level / AMOUNT_CURSE_PER_CLONE);
    if (maxClones > darkness.cloneCounter) return;
    for (let i = curseTarget.pets.length - 1; i >= 0; i--) {
        if (curseTarget.pets[i].type !== CHARACTER_PET_TYPE_CLONE) continue;
        const clone = curseTarget.pets[i];
        scaleCloneWithCurseLevelForLastClone(clone, darkness, curseTarget, game);
        break;
    }
}

function checkForCurseAndDelete(character: Character, cloneId: number): boolean {
    if (character.curses === undefined) return false;
    const curse = character.curses.find(c => c.type === CURSE_DARKNESS);
    if (!curse) return false;
    const darkness = curse as CurseDarkness;
    const idIndex = darkness.evilIdRefs.findIndex(id => id === cloneId);
    if (idIndex === -1) return false;
    darkness.evilIdRefs.splice(idIndex, 1);
    return true;
}

function reset(curse: Curse) {
    const darkness = curse as CurseDarkness;
    darkness.cloneCounter = 0;
    darkness.turnEvilTime = undefined;
    darkness.nextCloneSpawnTime = undefined;
    darkness.evilIdRefs = [];
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
    clone.deleteOnReset = true;
    resetCharacter(clone, game);
    changeCharacterAndAbilityIds(clone, game.state.idCounter);

    return clone;
}

function spawnClone(darkness: CurseDarkness, target: Character, game: Game) {
    const maxClones = Math.ceil(darkness.level / AMOUNT_CURSE_PER_CLONE);
    if (darkness.evilIdRefs.length > 0 || maxClones <= darkness.cloneCounter) return;
    if (darkness.nextCloneSpawnTime !== undefined && darkness.nextCloneSpawnTime > game.state.time) return;
    darkness.nextCloneSpawnTime = game.state.time + CLONE_SPAWN_INTERVAL;
    const clone: CharacterPetClone = createClone(target, game);
    if (!target.pets) target.pets = [];
    if (maxClones - 1 === darkness.cloneCounter) {
        scaleCloneWithCurseLevelForLastClone(clone, darkness, target, game);
    }
    if (clone.paint.randomizedCharacterImage) {
        const paintStuff = clone.paint.randomizedCharacterImage;
        paintStuff.clothColor = "white";
        paintStuff.skinColor = "white";
    }
    clone.tempDarkCharacterImage = createDarkCharacterPaint(clone);
    target.pets.push(clone);
    darkness.cloneCounter++;
    const timeToTurn = target.faction === FACTION_PLAYER ? TIME_TO_TURN_EVIL : 3000;
    if (darkness.turnEvilTime === undefined) darkness.turnEvilTime = game.state.time + timeToTurn;
    clone.turnEvilStartTime = darkness.turnEvilTime;
}

function scaleCloneWithCurseLevelForLastClone(clone: CharacterPetClone, darkness: CurseDarkness, original: Character, game: Game) {
    let cloneDamageFactor = 1;
    let cloneSizeFactor = 1;
    cloneDamageFactor = (darkness.level % AMOUNT_CURSE_PER_CLONE) / AMOUNT_CURSE_PER_CLONE;
    cloneSizeFactor = 0.5 + (cloneDamageFactor / 2);
    clone.damageDoneFactor = original.damageDoneFactor * cloneDamageFactor;
    if (clone.spawnTime && clone.spawnTime + clone.spawnDelay! >= game.state.time) {
        clone.originalWidth = original.width * cloneSizeFactor;
        clone.originalHeight = original.height * cloneSizeFactor;
    } else {
        clone.width = original.width * cloneSizeFactor;
        clone.height = original.height * cloneSizeFactor;
    }
}

function startTurnEvil(darkness: CurseDarkness, target: Character, game: Game) {
    if (darkness.turnEvilTime === undefined || !target.pets) return;
    if (darkness.turnEvilTime > game.state.time) return;
    for (let i = target.pets.length - 1; i >= 0; i--) {
        const pet = target.pets[i];
        if (pet.type !== CHARACTER_PET_TYPE_CLONE) continue;
        const clone = pet as CharacterPetClone;
        if (clone.turnEvilStartTime !== undefined) return;
        clone.turnEvilDuration = EVIL_TRANSFORM_TIME;
        clone.turnEvilStartTime = game.state.time;
    }
}

function createDarkCharacterPaint(clone: CharacterPetClone): RandomizedCharacterImage | undefined {
    if (clone.paint.randomizedCharacterImage) {
        const orig = clone.paint.randomizedCharacterImage;
        return {
            chestIndex: orig.chestIndex,
            clothColor: "black",
            headIndex: orig.headIndex,
            legsIndex: orig.legsIndex,
            skinColor: "black"
        }
    }
}

function checkTurnEvil(darkness: CurseDarkness, target: Character, game: Game) {
    if (darkness.turnEvilTime === undefined || !target.pets) return;
    if (darkness.turnEvilTime + EVIL_TRANSFORM_TIME > game.state.time) return;
    for (let i = target.pets.length - 1; i >= 0; i--) {
        const pet = target.pets[i];
        if (pet.type !== CHARACTER_PET_TYPE_CLONE) continue;
        const clone = target.pets.splice(i, 1)[0] as CharacterPetClone;
        if (darkness.cleansed && target.faction === FACTION_PLAYER) continue;
        const level = game.state.bossStuff.bossLevelCounter + Math.floor(darkness.level / 5);
        turnEvil(clone, level);
        game.state.bossStuff.bosses.push(clone);
        darkness.evilIdRefs.push(clone.id);
    }
    darkness.turnEvilTime = undefined;
    darkness.cloneCounter = 0;
}

function turnEvil(character: Character, level: number) {
    character.faction = FACTION_ENEMY;
    const clone = character as CharacterPetClone;
    if (character.type === CHARACTER_PET_TYPE_CLONE && clone.tempDarkCharacterImage) {
        clone.paint.randomizedCharacterImage = clone.tempDarkCharacterImage;
        clone.tempDarkCharacterImage = undefined;
    } else {
        character.paint.randomizedCharacterImage = createDarkCharacterPaint(character);
    }
    character.type = CHARACTER_TYPE_BOSS_CLONE_ENEMY;
    setCharacterToBossLevel(character, level);
}

function tickDarkness(curse: Curse, target: Character, game: Game) {
    const darkness = curse as CurseDarkness;
    spawnClone(darkness, target, game);
    startTurnEvil(darkness, target, game);
    checkTurnEvil(darkness, target, game);
}

