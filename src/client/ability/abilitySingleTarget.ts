import { characterTakeDamage, determineCharactersInDistance, determineClosestCharacter, findCharacterByIdAroundPosition } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { getNextId } from "../game.js";
import { Position, Game, IdCounter } from "../gameModel.js";
import { getPointPaintPosition } from "../gamePaint.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner } from "./ability.js";

type AbilitySingleTarget = Ability & {
    damage: number,
    maxRange: number,
    attackTimeDecreaseFaktor: number,
    attackInterval: number,
    nextAttackTime?: number,
    targetId?: number,
    sameTargetAttackCounter: number,
    damageIncreaseFactorPerAttack: number,
}

const MAX_SAME_TARGET_ATTACK_COUNTER = 100;
export const ABILITY_NAME_SINGLETARGET = "SingleTarget";

export function addAbilitySingleTarget() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_SINGLETARGET] = {
        createAbility: createAbilitySingleTarget,
        paintAbility: paintAbilitySingleTarget,
        setAbilityToLevel: setAbilitySingleTargetToLevel,
        setAbilityToBossLevel: setAbilitySingleTargetToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        tickAbility: tickAbilitySingleTarget,
        canBeUsedByBosses: false,
    };
}

export function createAbilitySingleTarget(
    idCounter: IdCounter,
    playerInputBinding?: string,
    damage: number = 50,
    maxRange: number = 100
): AbilitySingleTarget {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_SINGLETARGET,
        damage: damage,
        maxRange: maxRange,
        attackTimeDecreaseFaktor: 1,
        passive: true,
        attackInterval: 250,
        sameTargetAttackCounter: 0,
        damageIncreaseFactorPerAttack: 0,
        upgrades: {},
    };
}

function setAbilitySingleTargetToLevel(ability: Ability, level: number) {
    const abilitySingleTarget = ability as AbilitySingleTarget;
    abilitySingleTarget.damage = 100 * level;
    abilitySingleTarget.maxRange = 120 + level * 15;
    abilitySingleTarget.attackTimeDecreaseFaktor = 0.70 + 0.30 * level;
    abilitySingleTarget.damageIncreaseFactorPerAttack = 0.01 * level;
}

function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const abilitySingleTarget = ability as AbilitySingleTarget;
    abilitySingleTarget.damage = 1 * (level / 5) * damageFactor;
    abilitySingleTarget.maxRange = 100 + (level / 5) * 15;
    abilitySingleTarget.attackTimeDecreaseFaktor = 0.70 + 0.30 * (level / 5);
    abilitySingleTarget.damageIncreaseFactorPerAttack = 0.05 * (level / 5);
}

function setAbilitySingleTargetToBossLevel(ability: Ability, level: number) {
    const abilitySingleTarget = ability as AbilitySingleTarget;
    abilitySingleTarget.damage = 5 * level;
    abilitySingleTarget.maxRange = 100 + level * 15;
    abilitySingleTarget.attackTimeDecreaseFaktor = 0.70 + 0.30 * level;
    abilitySingleTarget.damageIncreaseFactorPerAttack = 0.05 * level;
}

function paintAbilitySingleTarget(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    const abilitySingleTarget = ability as AbilitySingleTarget;

    if (abilitySingleTarget.targetId !== undefined) {
        ctx.strokeStyle = "black";
        ctx.lineWidth = 1;
        ctx.beginPath();
        let paintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition, game.UI.zoom);
        ctx.moveTo(paintPos.x, paintPos.y);
        const target: Character | null = findCharacterByIdAroundPosition(abilityOwner, abilitySingleTarget.maxRange, game, abilitySingleTarget.targetId);
        if (target) {
            paintPos = getPointPaintPosition(ctx, target, cameraPosition, game.UI.zoom);
            ctx.lineTo(paintPos.x, paintPos.y);
            ctx.stroke();
        }
    }
}

function tickAbilitySingleTarget(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilitySingleTarget = ability as AbilitySingleTarget;

    if (abilitySingleTarget.nextAttackTime === undefined) abilitySingleTarget.nextAttackTime = game.state.time + abilitySingleTarget.attackInterval / abilitySingleTarget.attackTimeDecreaseFaktor;
    if (abilitySingleTarget.nextAttackTime <= game.state.time) {
        let target: Character | null = null;
        if (abilitySingleTarget.targetId === undefined) {
            const closest = determineClosestCharacter(abilityOwner, determineCharactersInDistance(abilityOwner, game.state.map, game.state.players, game.state.bossStuff.bosses, abilitySingleTarget.maxRange, abilityOwner.faction));
            if (closest.minDistanceCharacter) {
                abilitySingleTarget.targetId = closest.minDistanceCharacter.id;
                target = closest.minDistanceCharacter;
                abilitySingleTarget.sameTargetAttackCounter = 0;
            }
        } else {
            target = findCharacterByIdAroundPosition(abilityOwner, abilitySingleTarget.maxRange, game, abilitySingleTarget.targetId);
            if (!target) {
                abilitySingleTarget.sameTargetAttackCounter -= 2;
                if (abilitySingleTarget.sameTargetAttackCounter < 0) abilitySingleTarget.sameTargetAttackCounter = 0;
            }
        }
        if (target) {
            if (target.state === "alive") {
                const damage = abilitySingleTarget.damage * (1 + abilitySingleTarget.sameTargetAttackCounter * abilitySingleTarget.damageIncreaseFactorPerAttack);
                if (abilitySingleTarget.sameTargetAttackCounter < MAX_SAME_TARGET_ATTACK_COUNTER) abilitySingleTarget.sameTargetAttackCounter++;
                characterTakeDamage(target, damage, game, ability.id, ability.name);
            } else {
                abilitySingleTarget.targetId = undefined;
            }
        }

        abilitySingleTarget.nextAttackTime += abilitySingleTarget.attackInterval / abilitySingleTarget.attackTimeDecreaseFaktor;
        if (abilitySingleTarget.nextAttackTime <= game.state.time) {
            abilitySingleTarget.nextAttackTime = game.state.time + abilitySingleTarget.attackInterval / abilitySingleTarget.attackTimeDecreaseFaktor;
        }
    }
}
