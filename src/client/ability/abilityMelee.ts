import { characterTakeDamage, determineCharactersInDistance, determineClosestCharacter, getPlayerCharacters } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { TAMER_PET_CHARACTER, TamerPetCharacter } from "../character/playerCharacters/tamerPetCharacter.js";
import { getNextId } from "../game.js";
import { Game, IdCounter } from "../gameModel.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, AbilityUpgradeOption } from "./ability.js";

type AbilityMelee = Ability & {
    damage: number,
    tickInterval: number,
    nextTickTime?: number,
}
export const ABILITY_NAME_MELEE = "Melee";

export function addAbilityMelee() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_MELEE] = {
        tickAbility: tickAbilityMelee,
        createAbilityUpgradeOptions: createAbilityMeleeUpgradeOptions,
        createAbility: createAbilityMelee,
        setAbilityToLevel: setAbilityMeleeToLevel,
        setAbilityToBossLevel: setAbilityMeleeToBossLevel,
        isPassive: true,
        notInheritable: true,
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

function setAbilityMeleeToLevel(ability: Ability, level: number) {
    let abilityMelee = ability as AbilityMelee;
    abilityMelee.damage = level * 100;
}

function setAbilityMeleeToBossLevel(ability: Ability, level: number) {
    let abilityMelee = ability as AbilityMelee;
    abilityMelee.damage = level * 10;
}

function tickAbilityMelee(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    let abilityMelee = ability as AbilityMelee;

    if (abilityMelee.nextTickTime === undefined) abilityMelee.nextTickTime = game.state.time + abilityMelee.tickInterval;
    if (abilityMelee.nextTickTime <= game.state.time) {
        let playerCharacters: Character[] = [];
        if (abilityOwner.faction === "enemy") {
            playerCharacters = getPlayerCharacters(game.state.players)
        } else if (abilityOwner.faction === "player" && abilityOwner.width) {
            playerCharacters = determineCharactersInDistance(abilityOwner, game.state.map, [], game.state.bossStuff.bosses, abilityOwner.width + 40);
        }
        if(playerCharacters.length !== 0){
            let closest = determineClosestCharacter(abilityOwner, playerCharacters);
    
            if (abilityOwner.width !== undefined && closest.minDistanceCharacter
                && closest.minDistance <= abilityOwner.width / 2 + closest.minDistanceCharacter.width / 2) 
            {
                let damage = abilityMelee.damage;
                if(abilityOwner.type === TAMER_PET_CHARACTER){
                    damage *= (abilityOwner as TamerPetCharacter).sizeFactor;
                }
                characterTakeDamage(closest.minDistanceCharacter, damage, game, ability.id);
            }
        }

        abilityMelee.nextTickTime += abilityMelee.tickInterval;
    }
}

function createAbilityMeleeUpgradeOptions(): AbilityUpgradeOption[] {
    let upgradeOptions: AbilityUpgradeOption[] = [];
    upgradeOptions.push({
        name: "MeleeDamage+100", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilityMelee;
            as.damage += 100;
        }
    });

    return upgradeOptions;
}