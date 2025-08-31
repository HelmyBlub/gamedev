import { ABILITIES_FUNCTIONS, resetAllCharacterAbilities } from "../../ability/ability.js";
import { calculateDistance } from "../../game.js";
import { GAME_MODE_BASE_DEFENSE } from "../../gameModeBaseDefense.js";
import { Game } from "../../gameModel.js";
import { getMapMidlePosition } from "../../map/map.js";
import { resetCharacter, teleportCharacterPetsToOwner } from "../character.js";
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
    if (game.state.gameMode === GAME_MODE_BASE_DEFENSE) {
        const mapMiddle = getMapMidlePosition(game.state.map);
        const distance = calculateDistance(mapMiddle, character);
        if (distance > 1500) {
            character.x = mapMiddle.x;
            character.y = mapMiddle.y;
            resetCharacter(character, game);
            teleportCharacterPetsToOwner([character], game);
        }
    }
    for (let ability of character.abilities) {
        let functions = ABILITIES_FUNCTIONS[ability.name];
        if (functions.tickAI) functions.tickAI(character, ability, game);
    }
}
