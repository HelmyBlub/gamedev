import { characterTakeDamage, determineCharactersInDistance, determineClosestCharacter, getPlayerCharacters } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { TAMER_PET_CHARACTER, TamerPetCharacter } from "../character/playerCharacters/tamer/tamerPetCharacter.js";
import { getNextId } from "../game.js";
import { FACTION_ENEMY, FACTION_PLAYER, Game, IdCounter } from "../gameModel.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner } from "./ability.js";

type AbilityMelee = Ability & {
    damage: number,
    tickInterval: number,
    nextTickTime?: number,
}
export const ABILITY_NAME_MELEE = "Melee";

export function addAbilityMelee() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_MELEE] = {
        tickAbility: tickAbilityMelee,
        createAbility: createAbilityMelee,
        setAbilityToLevel: setAbilityMeleeToLevel,
        setAbilityToBossLevel: setAbilityMeleeToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        resetAbility: resetAbility,
    };
}

export function createAbilityMelee(
    idCounter: IdCounter,
    playerInputBinding?: string,
    damage: number = 100,
): AbilityMelee {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_MELEE,
        damage: damage,
        passive: true,
        tickInterval: 250,
        upgrades: {},
    };
}

function resetAbility(ability: Ability) {
    const abilityMelee = ability as AbilityMelee;
    abilityMelee.nextTickTime = undefined;
}

function setAbilityMeleeToLevel(ability: Ability, level: number) {
    const abilityMelee = ability as AbilityMelee;
    abilityMelee.damage = level * 100;
}

function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const abilityMelee = ability as AbilityMelee;
    abilityMelee.damage = level * 2 * damageFactor;
}

function setAbilityMeleeToBossLevel(ability: Ability, level: number) {
    const abilityMelee = ability as AbilityMelee;
    abilityMelee.damage = level * 10;
}

function tickAbilityMelee(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityMelee = ability as AbilityMelee;

    if (abilityMelee.nextTickTime === undefined) abilityMelee.nextTickTime = game.state.time + abilityMelee.tickInterval;
    if (abilityMelee.nextTickTime <= game.state.time) {
        let playerCharacters: Character[] = [];
        if (abilityOwner.faction === FACTION_ENEMY) {
            playerCharacters = getPlayerCharacters(game.state.players)
        } else if (abilityOwner.faction === FACTION_PLAYER && abilityOwner.width) {
            playerCharacters = determineCharactersInDistance(abilityOwner, game.state.map, [], game.state.bossStuff.bosses, abilityOwner.width + 40);
        }
        if (playerCharacters.length !== 0) {
            const closest = determineClosestCharacter(abilityOwner, playerCharacters);

            if (abilityOwner.width !== undefined && closest.minDistanceCharacter
                && closest.minDistance <= abilityOwner.width / 2 + closest.minDistanceCharacter.width / 2) {
                let damage = abilityMelee.damage;
                if (abilityOwner.type === TAMER_PET_CHARACTER) {
                    damage *= (abilityOwner as TamerPetCharacter).sizeFactor;
                }
                characterTakeDamage(closest.minDistanceCharacter, damage, game, ability.id);
            }
        }

        abilityMelee.nextTickTime += abilityMelee.tickInterval;
    }
}
