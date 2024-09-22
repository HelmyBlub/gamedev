import { getPlayerCharacters, resetCharacter } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { CHARACTER_TYPE_BOSS_CLONE_ENEMY, setCharacterToBossLevel } from "../character/enemy/bossEnemy.js";
import { CHARACTER_PET_TYPE_FOLLOW_ATTACK } from "../character/playerCharacters/characterPetTypeAttackFollow.js";
import { TAMER_PET_CHARACTER } from "../character/playerCharacters/tamer/tamerPetCharacter.js";
import { changeCharacterAndAbilityIds, deepCopy } from "../game.js";
import { FACTION_ENEMY, Game } from "../gameModel.js";
import { Curse, CURSES_FUNCTIONS } from "./curse.js";

export const CURSE_DARKNESS = "Darkness";
const TIME_TO_TURN_EVIL = 15000;
const TRANSFORM_TIME = 3000;

export type CurseDarkness = Curse & {
    cloneIdRefs: number[],
    cloneCreateTimes: number[],
    evilIdRefs: number[],
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
        cloneIdRefs: [],
        cloneCreateTimes: [],
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
    clone.type = CHARACTER_PET_TYPE_FOLLOW_ATTACK;
    resetCharacter(clone, game);
    changeCharacterAndAbilityIds(clone, game.state.idCounter);

    return clone;
}

function spawnClone(darkness: CurseDarkness, target: Character, game: Game) {
    if (Math.floor(darkness.level) <= darkness.cloneIdRefs.length + darkness.evilIdRefs.length) return;
    const clone = createClone(target, game);
    if (!target.pets) target.pets = [];
    target.pets.push(clone);
    darkness.cloneIdRefs.push(clone.id);
    darkness.cloneCreateTimes.push(game.state.time);
}

function turnEvil(darkness: CurseDarkness, target: Character, game: Game) {
    if (darkness.cloneCreateTimes.length <= 0 || !target.pets) return;
    while (darkness.cloneCreateTimes[0] + TIME_TO_TURN_EVIL < game.state.time) {
        const cloneIndex = target.pets.findIndex(c => c.id === darkness.cloneIdRefs[0]);
        const clone = target.pets.splice(cloneIndex, 1)[0];
        clone.faction = FACTION_ENEMY;
        clone.type = CHARACTER_TYPE_BOSS_CLONE_ENEMY;
        const level = game.state.bossStuff.bossLevelCounter + Math.floor(darkness.level);
        setCharacterToBossLevel(clone, level);
        game.state.bossStuff.bosses.push(clone);
        darkness.cloneCreateTimes.shift();
        darkness.evilIdRefs.push(darkness.cloneIdRefs[0]);
        darkness.cloneIdRefs.shift();
    }
}

function tickDarkness(curse: Curse, target: Character, game: Game) {
    const darkness = curse as CurseDarkness;
    spawnClone(darkness, target, game);
    turnEvil(darkness, target, game);
}

