import { resetCharacter } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { CHARACTER_PET_TYPE_FOLLOW_ATTACK } from "../character/playerCharacters/characterPetTypeAttackFollow.js";
import { TAMER_PET_CHARACTER } from "../character/playerCharacters/tamer/tamerPetCharacter.js";
import { changeCharacterAndAbilityIds, deepCopy } from "../game.js";
import { Game } from "../gameModel.js";
import { Curse, CURSES_FUNCTIONS } from "./curse.js";

export const CURSE_DARKNESS = "Darkness";
export type CurseDarkness = Curse & {
    cloneIdRefs: number[],
    cloneCreateTimes: number[],
    timeToTurnEvil: number,
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
        timeToTurnEvil: 60000
    };
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

function tickDarkness(curse: Curse, target: Character, game: Game) {
    const darkness = curse as CurseDarkness;
    if (Math.floor(curse.level) <= darkness.cloneIdRefs.length) return;
    const clone = createClone(target, game);
    if (!target.pets) target.pets = [];
    target.pets.push(clone);
    darkness.cloneIdRefs.push(clone.id);
}

