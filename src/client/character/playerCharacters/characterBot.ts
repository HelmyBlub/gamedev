import { ABILITIES_FUNCTIONS } from "../../ability/ability.js";
import { Game } from "../../gameModel.js";
import { Character, CHARACTER_TYPE_FUNCTIONS } from "../characterModel.js";
import { PathingCache } from "../pathing.js";

export const CHARACTER_TYPE_BOT = "CharacterTypeBot";

export function addCharacterTypeBotFunctions() {
    CHARACTER_TYPE_FUNCTIONS[CHARACTER_TYPE_BOT] = {
        tickFunction: tick,
    }
}

function tick(character: Character, game: Game, pathingCache: PathingCache | null) {
    if (character.state !== "alive") return;
    for (let ability of character.abilities) {
        let functions = ABILITIES_FUNCTIONS[ability.name];
        if (functions.tickAI) functions.tickAI(character, ability, game);
    }
}
