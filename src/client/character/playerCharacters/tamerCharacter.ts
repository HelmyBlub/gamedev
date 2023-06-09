import { addAbilityToCharacter, createAbility } from "../../ability/ability.js";
import { createAbilityHpRegen } from "../../ability/abilityHpRegen.js";
import { ABILITY_NAME_SPEED_BOOST } from "../../ability/speedBoost/abilitySpeedBoost.js";
import { ABILITY_NAME_SNIPE } from "../../ability/snipe/abilitySnipe.js";
import { Game, IdCounter } from "../../gameModel.js";
import { CHARACTER_TYPE_FUNCTIONS, Character, createCharacter } from "../characterModel.js";
import { ABILITY_LEVELING_CHARACTER, AbilityLevelingCharacter } from "./abilityLevelingCharacter.js";
import { PLAYER_CHARACTER_CLASSES_FUNCTIONS } from "./playerCharacters.js";
import { getNextId } from "../../game.js";
import { createAbilityLeash } from "../../ability/abilityLeash.js";
import { determineCharactersInDistance, determineClosestCharacter, determineEnemyMoveDirection, moveCharacterTick } from "../character.js";
import { PathingCache } from "../pathing.js";
import { ABILITY_NAME_MELEE, createAbilityMelee } from "../../ability/abilityMelee.js";
import { nextRandom } from "../../randomNumberGenerator.js";
import { tickLevelingCharacter } from "./levelingCharacter.js";
import { LEVELING_CHARACTER } from "./levelingCharacterModel.js";

export function addTamerClass() {
    PLAYER_CHARACTER_CLASSES_FUNCTIONS["Tamer(Work in Progress)"] = {
        changeCharacterToThisClass: changeCharacterToTamerClass
    }
    CHARACTER_TYPE_FUNCTIONS["PetAggressive"] = {
        tickPetFunction: tickTamerPetCharacter
    }
    CHARACTER_TYPE_FUNCTIONS["PetProtective"] = {
        tickPetFunction: tickTamerPetCharacter
    }
    CHARACTER_TYPE_FUNCTIONS["PetPassive"] = {
        tickPetFunction: tickTamerPetCharacter
    }

}

export function tickTamerPetCharacter(character: Character, petOwner: Character, game: Game, pathingCache: PathingCache | null) {
    if (pathingCache === null) {
        console.log("needs pathing cache");
        return;
    }
    const isPlayer = character.faction === "player";
    if (character.isDead) return;

    if (character.type === "PetAggressive") {
        let playerCharacters = determineCharactersInDistance(character, game.state.map, [], game.state.bossStuff.bosses, 200);
        let closest = determineClosestCharacter(character, playerCharacters);
        if (closest.minDistanceCharacter !== null) {
            determineEnemyMoveDirection(character, closest.minDistanceCharacter, game.state.map, pathingCache, game.state.idCounter, game.state.time);
        } else {
            character.isMoving = true;
            character.moveDirection = nextRandom(game.state.randomSeed) * Math.PI * 2;
        }
    } else if (character.type === "PetProtective") {
        let playerCharacters = determineCharactersInDistance(petOwner, game.state.map, [], game.state.bossStuff.bosses, 200);
        let closest = determineClosestCharacter(petOwner, playerCharacters);
        if (closest.minDistanceCharacter !== null) {
            determineEnemyMoveDirection(character, closest.minDistanceCharacter, game.state.map, pathingCache, game.state.idCounter, game.state.time);
        } else {
            character.isMoving = true;
            character.moveDirection = nextRandom(game.state.randomSeed) * Math.PI * 2;
        }
    } else if (character.type === "PetPassive") {
        //standing around
    }

    moveCharacterTick(character, game.state.map, game.state.idCounter, isPlayer);
}

function changeCharacterToTamerClass(
    character: Character,
    idCounter: IdCounter,
    game: Game,
) {
    addAbilityToCharacter(character, createAbilityHpRegen(idCounter));
    addPetToTamer(character, "blue", "PetAggressive", game);
    addPetToTamer(character, "green", "PetProtective", game);
    addPetToTamer(character, "black", "PetPassive", game);
}

function addPetToTamer(character: Character, color: string, type: string, game: Game) {
    if (character.pets === undefined) character.pets = [];
    const pet = createCharacter(getNextId(game.state.idCounter), character.x, character.y, 15, 15, color, 2, 20, "player", type, 10);
    //pet.isPet = true;
    pet.abilities.push(createAbilityLeash(game.state.idCounter, undefined, 100, character.id));
    pet.abilities.push(createAbility(ABILITY_NAME_MELEE, game.state.idCounter, true));
    character.pets.push(pet);
}

