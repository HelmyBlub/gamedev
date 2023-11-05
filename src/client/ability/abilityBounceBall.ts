import { BUFF_NAME_BALL_PHYSICS, BuffBallPhysics, createBuffBallPhysics } from "../debuff/buffBallPhysics.js";
import { applyDebuff, removeCharacterDebuff } from "../debuff/debuff.js";
import { calculateDirection, getNextId } from "../game.js";
import { Position, Game, IdCounter, FACTION_ENEMY } from "../gameModel.js";
import { getPointPaintPosition } from "../gamePaint.js";
import { calculateBounceAngle, calculateBounceAngle2, calculateMovePosition, isPositionBlocking } from "../map/map.js";
import { playerInputBindingToDisplayValue } from "../playerInput.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, detectSomethingToCharacterHit } from "./ability.js";

type AbilityBounceBall = Ability & {
    baseRechargeTime: number,
    nextRechargeTime?: number,
    currentCharges: number,
    maxCharges: number,
    damage: number,
    radius: number,
    moveDirection: number,
    currentSpeed: number,
    startSpeed: number,
    maxSpeed: number,
    stopSpeed: number,
    bounceBonusSpeed: number,
    speedDecrease: number,
    tickInterval: number,
    nextTickTime?: number,
}

export const ABILITY_NAME_BOUNCE_BALL = "Bounce Ball";

export function addAbilityBounceBall() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_BOUNCE_BALL] = {
        activeAbilityCast: castBounceBall,
        createAbility: createAbilityBounceBall,
        paintAbility: paintAbility,
        paintAbilityUI: paintAbilityUI,
        setAbilityToLevel: setAbilityToLevel,
        setAbilityToBossLevel: setAbilityToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        tickAbility: tickAbility,
        canBeUsedByBosses: false,
    };
}

export function createAbilityBounceBall(
    idCounter: IdCounter,
    playerInputBinding?: string,
    damage: number = 50,
    radius: number = 30,
): AbilityBounceBall {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_BOUNCE_BALL,
        damage: damage,
        radius: radius,
        passive: false,
        tickInterval: 250,
        moveDirection: 0,
        currentSpeed: 0,
        bounceBonusSpeed: 1,
        maxSpeed: 20,
        stopSpeed: 2,
        speedDecrease: 0.005,
        startSpeed: 6,
        baseRechargeTime: 4000,
        currentCharges: 2,
        maxCharges: 2,
        upgrades: {},
        playerInputBinding: playerInputBinding,
    };
}

function castBounceBall(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, isKeydown: boolean, game: Game) {
    if (!isKeydown) return;
    const abilityBounceBall = ability as AbilityBounceBall;
    if (abilityBounceBall.currentCharges <= 0) return;
    const buffBallPhyscis = createBuffBallPhysics(ability.id);
    applyDebuff(buffBallPhyscis, abilityOwner as any, game);
    abilityBounceBall.currentSpeed = abilityBounceBall.startSpeed;
    abilityBounceBall.moveDirection = calculateDirection(abilityOwner, castPosition);
    abilityBounceBall.currentCharges--;
    if (abilityBounceBall.nextRechargeTime === undefined) {
        abilityBounceBall.nextRechargeTime = game.state.time + abilityBounceBall.baseRechargeTime;
    }
}

function setAbilityToLevel(ability: Ability, level: number) {
    const abilityIce = ability as AbilityBounceBall;
    abilityIce.damage = level * 100;
}

function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const abilityIce = ability as AbilityBounceBall;
    abilityIce.damage = level / 2 * damageFactor;
}

function setAbilityToBossLevel(ability: Ability, level: number) {
    const abilityIce = ability as AbilityBounceBall;
    abilityIce.damage = level * 10;
}

function paintAbilityUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    const bounceBall = ability as AbilityBounceBall;
    const rectSize = size;

    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.beginPath();
    ctx.rect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.stroke();

    if (bounceBall.nextRechargeTime !== undefined && game.state.time < bounceBall.nextRechargeTime) {
        ctx.fillStyle = "gray";
        const heightFactor = Math.max((bounceBall.nextRechargeTime - game.state.time) / bounceBall.baseRechargeTime, 0);
        ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize * heightFactor);
    }

    const fontSize = Math.floor(size * 0.8);
    ctx.fillStyle = "black";
    ctx.font = fontSize + "px Arial";
    ctx.fillText("" + bounceBall.currentCharges, drawStartX, drawStartY + rectSize - (rectSize - fontSize * 0.9));

    if (bounceBall.playerInputBinding) {
        const keyBind = playerInputBindingToDisplayValue(bounceBall.playerInputBinding, game);
        ctx.fillStyle = "black";
        ctx.font = "10px Arial";
        ctx.fillText(keyBind, drawStartX + 1, drawStartY + 8);
    }
}

function findBallBuff(owner: AbilityOwner, abilityBall: AbilityBounceBall): BuffBallPhysics | undefined {
    if (!owner.debuffs) return undefined;
    for (let buff of owner.debuffs) {
        if (buff.name === BUFF_NAME_BALL_PHYSICS) {
            const ballBuff = buff as BuffBallPhysics;
            if (ballBuff.abilityRefId === abilityBall.id) {
                return ballBuff;
            }
        }
    }
    return undefined;
}

function paintAbility(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    const abilityBall = ability as AbilityBounceBall;
    if (!findBallBuff(abilityOwner, abilityBall)) return;
    const paintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition);
    ctx.fillStyle = "red";
    if (abilityOwner.faction === FACTION_ENEMY) {
        ctx.fillStyle = "darkgray";
    }

    ctx.beginPath();
    ctx.arc(
        paintPos.x,
        paintPos.y,
        abilityBall.radius, 0, 2 * Math.PI
    );
    ctx.fill();
}

function tickAbility(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityBounceBall = ability as AbilityBounceBall;

    if (abilityBounceBall.nextRechargeTime != undefined && abilityBounceBall.nextRechargeTime <= game.state.time) {
        abilityBounceBall.currentCharges++;
        if(abilityBounceBall.currentCharges < abilityBounceBall.maxCharges){
            abilityBounceBall.nextRechargeTime =  game.state.time + abilityBounceBall.baseRechargeTime;
        }else{
            abilityBounceBall.nextRechargeTime = undefined;
        }
    }

    const ballBuff = findBallBuff(abilityOwner, abilityBounceBall);
    if (!ballBuff) return;

    let tickSpeedDecrease = abilityBounceBall.currentSpeed * abilityBounceBall.speedDecrease;
    if (tickSpeedDecrease > 0.02) tickSpeedDecrease = 0.02;
    abilityBounceBall.currentSpeed *= (1 - abilityBounceBall.speedDecrease);
    if (abilityBounceBall.currentSpeed <= abilityBounceBall.stopSpeed) {
        removeCharacterDebuff(ballBuff, abilityOwner as any, game);
        return;
    }
    const newPosition = calculateMovePosition(abilityOwner, abilityBounceBall.moveDirection, abilityBounceBall.currentSpeed, false);
    if (isPositionBlocking(newPosition, game.state.map, game.state.idCounter, game)) {
        abilityBounceBall.moveDirection = calculateBounceAngle2(abilityOwner, abilityBounceBall.moveDirection, game);
        abilityBounceBall.currentSpeed += abilityBounceBall.bounceBonusSpeed;
        if (abilityBounceBall.currentSpeed > abilityBounceBall.maxSpeed) {
            abilityBounceBall.currentSpeed = abilityBounceBall.maxSpeed;
        }
    } else {
        abilityOwner.x = newPosition.x;
        abilityOwner.y = newPosition.y;
    }

    if (abilityBounceBall.nextTickTime === undefined) abilityBounceBall.nextTickTime = game.state.time + abilityBounceBall.tickInterval;
    if (abilityBounceBall.nextTickTime <= game.state.time) {
        detectSomethingToCharacterHit(
            game.state.map,
            abilityOwner,
            abilityBounceBall.radius * 2,
            abilityOwner.faction,
            abilityBounceBall.damage,
            game.state.players,
            game.state.bossStuff.bosses,
            ability.id,
            undefined,
            game
        );

        abilityBounceBall.nextTickTime += abilityBounceBall.tickInterval;

        if (abilityBounceBall.nextTickTime <= game.state.time) {
            abilityBounceBall.nextTickTime = game.state.time + abilityBounceBall.tickInterval;
        }
    }
}
