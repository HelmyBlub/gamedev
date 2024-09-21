import { ABILITIES_FUNCTIONS } from "../../ability/ability.js";
import { calculateDirection } from "../../game.js";
import { Game, Position } from "../../gameModel.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { moveCharacterTick } from "../character.js";
import { Character, CHARACTER_TYPE_FUNCTIONS } from "../characterModel.js";
import { PathingCache } from "../pathing.js";

export const CHARACTER_PET_TYPE_FOLLOW_ATTACK = "CharacterPetTypeFollowAttack";

export function addPetTypeFollowAttackFunctions() {
    CHARACTER_TYPE_FUNCTIONS[CHARACTER_PET_TYPE_FOLLOW_ATTACK] = {
        tickPetFunction: tick,
    }
}

function tick(character: Character, petOwner: Character, game: Game, pathingCache: PathingCache | null) {
    const moveTargetPos: Position = {
        x: petOwner.x + nextRandom(game.state.randomSeed) * 100 - 50,
        y: petOwner.y + nextRandom(game.state.randomSeed) * 100 - 50,
    }
    character.moveDirection = calculateDirection(character, moveTargetPos);
    character.isMoving = true;
    moveCharacterTick(character, game.state.map, game.state.idCounter, game);

    for (let ability of character.abilities) {
        let functions = ABILITIES_FUNCTIONS[ability.name];
        if (functions.tickAI) functions.tickAI(character, ability, game);
    }
}
