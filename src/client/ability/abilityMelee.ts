import { characterTakeDamage, determineClosestCharacter, getPlayerCharacters } from "../character/character.js";
import { getNextId } from "../game.js";
import { Game, IdCounter } from "../gameModel.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, UpgradeOptionAbility } from "./ability.js";

type AbilityMelee = Ability & {
    damage: number,
    tickInterval: number,
    nextTickTime?: number,
}
const ABILITY_NAME_MELEE = "Melee";

export function addMeleeAbility() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_MELEE] = {
        tickAbility: tickAbilityMelee,
        createAbiltiyUpgradeOptions: createAbilityMeleeUpgradeOptions,
        setAbilityToLevel: setAbilityMeleeToLevel,
        createAbility: createAbilityMelee,
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
        let playerCharacters = getPlayerCharacters(game.state.players);
        let closest = determineClosestCharacter(abilityOwner, playerCharacters);

        if (abilityOwner.width !== undefined && closest.minDistanceCharacter
            && closest.minDistance <= abilityOwner.width / 2 + closest.minDistanceCharacter.width / 2)
        {
            characterTakeDamage(closest.minDistanceCharacter, abilityMelee.damage, game);
        }

        abilityMelee.nextTickTime += abilityMelee.tickInterval;
    }
}

function createAbilityMeleeUpgradeOptions(): UpgradeOptionAbility[] {
    let upgradeOptions: UpgradeOptionAbility[] = [];
    upgradeOptions.push({
        name: "MeleeDamage+100", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilityMelee;
            as.damage += 100;
        }
    });

    return upgradeOptions;
}