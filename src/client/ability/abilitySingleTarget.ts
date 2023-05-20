import { characterTakeDamage, determineCharactersInDistance, determineClosestCharacter, findCharacterByIdAroundPosition } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { getNextId } from "../game.js";
import { Position, Game, IdCounter } from "../gameModel.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, AbilityUpgradeOption } from "./ability.js";

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
const ABILITY_NAME_SINGLETARGET = "SingleTarget";

export function addSingleTargetAbility() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_SINGLETARGET] = {
        tickAbility: tickAbilitySingleTarget,
        createAbiltiyUpgradeOptions: createAbilitySingleTargetUpgradeOptions,
        paintAbility: paintAbilitySingleTarget,
        setAbilityToLevel: setAbilitySingleTargetToLevel,
        createAbility: createAbilitySingleTarget,
        isPassive: true,
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

function setAbilitySingleTargetToLevel(ability: Ability, level: number){
    let abilitySingleTarget = ability as AbilitySingleTarget;
    abilitySingleTarget.damage = 100 * level;
    abilitySingleTarget.maxRange = 120 + level * 15;
    abilitySingleTarget.attackTimeDecreaseFaktor = 0.70 + 0.30 * level;
    abilitySingleTarget.damageIncreaseFactorPerAttack = 0.01 * level;
}

function paintAbilitySingleTarget(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    let abilitySingleTarget = ability as AbilitySingleTarget;

    if(abilitySingleTarget.targetId !== undefined){
        ctx.strokeStyle = "black";
        ctx.lineWidth = 1;
        ctx.beginPath();
        let centerX = ctx.canvas.width / 2;
        let centerY = ctx.canvas.height / 2;
        let paintX = Math.floor(abilityOwner.x - cameraPosition.x + centerX);
        let paintY = Math.floor(abilityOwner.y - cameraPosition.y + centerY);
        ctx.moveTo(paintX, paintY);
        let target: Character | null = findCharacterByIdAroundPosition(abilityOwner, abilitySingleTarget.maxRange, game, abilitySingleTarget.targetId);
        if(target){
            paintX = Math.floor(target.x - cameraPosition.x + centerX);
            paintY = Math.floor(target.y - cameraPosition.y + centerY);
            ctx.lineTo(paintX, paintY);
            ctx.stroke();
        }
    }
}

function tickAbilitySingleTarget(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    let abilitySingleTarget = ability as AbilitySingleTarget;

    if(abilitySingleTarget.nextAttackTime === undefined) abilitySingleTarget.nextAttackTime = game.state.time + abilitySingleTarget.attackInterval / abilitySingleTarget.attackTimeDecreaseFaktor;
    if(abilitySingleTarget.nextAttackTime <= game.state.time){        
        let target: Character | null = null;
        if(abilitySingleTarget.targetId === undefined){
            let closest = determineClosestCharacter(abilityOwner, determineCharactersInDistance(abilityOwner, game.state.map, game.state.players, game.state.bossStuff.bosses, abilitySingleTarget.maxRange, abilityOwner.faction));
            if(closest.minDistanceCharacter){
                abilitySingleTarget.targetId = closest.minDistanceCharacter.id;
                target = closest.minDistanceCharacter;
                abilitySingleTarget.sameTargetAttackCounter = 0;
            }
        }else{
            target = findCharacterByIdAroundPosition(abilityOwner, abilitySingleTarget.maxRange, game, abilitySingleTarget.targetId);
        }
        if(target){
            if(!target.isDead){
                let damage = abilitySingleTarget.damage * (1 + abilitySingleTarget.sameTargetAttackCounter * abilitySingleTarget.damageIncreaseFactorPerAttack);
                abilitySingleTarget.sameTargetAttackCounter++;
                characterTakeDamage(target, damage, game);
            }else{
                abilitySingleTarget.targetId = undefined;
            }
        }
    
        abilitySingleTarget.nextAttackTime += abilitySingleTarget.attackInterval / abilitySingleTarget.attackTimeDecreaseFaktor;
        if(abilitySingleTarget.nextAttackTime <= game.state.time){
            abilitySingleTarget.nextAttackTime = game.state.time + abilitySingleTarget.attackInterval / abilitySingleTarget.attackTimeDecreaseFaktor;
        }
    }
}

function createAbilitySingleTargetUpgradeOptions(): AbilityUpgradeOption[] {
    let upgradeOptions: AbilityUpgradeOption[] = [];
    upgradeOptions.push({
        name: "SingleTargetDamage+100", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySingleTarget;
            as.damage += 100;
        }
    });
    upgradeOptions.push({
        name: "SingleTargetRange+", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilitySingleTarget;
            as.maxRange += 10;
        }
    });

    return upgradeOptions;
}
