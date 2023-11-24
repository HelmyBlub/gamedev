import { getRandomAlivePlayerCharacter } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { BUFF_NAME_BALL_PHYSICS, BuffBallPhysics, createBuffBallPhysics, findBallBuff } from "../../debuff/buffBallPhysics.js";
import { applyDebuff, removeCharacterDebuff } from "../../debuff/debuff.js";
import { calculateDirection, getClientInfoByCharacterId, getNextId, modulo } from "../../game.js";
import { Position, Game, IdCounter, FACTION_ENEMY, ClientInfo } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { calculateBounceAngle, calculateMovePosition, isPositionBlocking } from "../../map/map.js";
import { playerInputBindingToDisplayValue } from "../../playerInput.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, detectSomethingToCharacterHit, getAbilityNameUiText, paintDefaultAbilityStatsUI } from "../ability.js";
import { AbilityUpgradesFunctions, getAbilityUpgradesDamageFactor, pushAbilityUpgradesOptions, pushAbilityUpgradesUiTexts, upgradeAbility } from "../abilityUpgrade.js";
import { addAbilityBounceBallUpgradeAngleChange } from "./abilityBounceBallUpgradeAngle.js";
import { abilityBounceBallUpgradeBounceBonusDamageAddBounce, abilityBounceBallUpgradeBounceBonusDamageResetBounces, addAbilityBounceBallUpgradeBounceBonusDamage } from "./abilityBounceBallUpgradeBounceBonusDamage.js";
import { addAbilityBoucneBallUpgradeSpeed } from "./abilityBounceBallUpgradeBounceBonusSpeed.js";
import { addAbilityBounceBallUpgradeBounceShield, bounceBallUpgradeBounceShieldExecute } from "./abilityBounceBallUpgradeBounceShield.js";

export type AbilityBounceBall = Ability & {
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
    startSpeedDecrease: number,
    speedDecreaseIncrease: number,
    currentSpeedDecrease: number,
    tickInterval: number,
    maxAngleChangePetTick: number,
    nextTickTime?: number,
    rolledDistanceAfterLastDamageTick: number,
}

export const ABILITY_NAME_BOUNCE_BALL = "Bounce Ball";
export const ABILITY_BOUNCE_BALL_UPGRADE_FUNCTIONS: AbilityUpgradesFunctions = {};

export function addAbilityBounceBall() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_BOUNCE_BALL] = {
        activeAbilityCast: castBounceBall,
        createAbility: createAbilityBounceBall,
        createAbilityBossUpgradeOptions: createAbilityBossSpeedBoostUpgradeOptions,
        executeUpgradeOption: executeAbilityUpgradeOption,
        paintAbility: paintAbility,
        paintAbilityUI: paintAbilityUI,
        paintAbilityStatsUI: paintAbilityStatsUI,
        setAbilityToLevel: setAbilityToLevel,
        setAbilityToBossLevel: setAbilityToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        tickAbility: tickAbility,
        abilityUpgradeFunctions: ABILITY_BOUNCE_BALL_UPGRADE_FUNCTIONS,
        canBeUsedByBosses: false,
    };
    addAbilityBoucneBallUpgradeSpeed();
    addAbilityBounceBallUpgradeAngleChange();
    addAbilityBounceBallUpgradeBounceBonusDamage();
    addAbilityBounceBallUpgradeBounceShield();
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
        maxSpeed: 40,
        stopSpeed: 2,
        startSpeedDecrease: 0.002,
        currentSpeedDecrease: 0.002,
        speedDecreaseIncrease: 0.00001,
        startSpeed: 6,
        baseRechargeTime: 4000,
        currentCharges: 2,
        maxCharges: 2,
        maxAngleChangePetTick: 0.01,
        rolledDistanceAfterLastDamageTick: 0,
        upgrades: {},
        playerInputBinding: playerInputBinding,
        tradable: true,
    };
}

export function getAbilityBounceBallDamage(abilityBounceBall: AbilityBounceBall) {
    let damage = abilityBounceBall.damage;
    damage *= getAbilityUpgradesDamageFactor(ABILITY_BOUNCE_BALL_UPGRADE_FUNCTIONS, abilityBounceBall, true);
    return damage;
}

function castBounceBall(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, isKeydown: boolean, game: Game) {
    if (!isKeydown) return;
    const abilityBounceBall = ability as AbilityBounceBall;
    if (abilityBounceBall.currentCharges <= 0) return;
    const buffBallPhyscis = createBuffBallPhysics(ability.id, ability.name);
    let keepCurrentSpeed = false;
    if (abilityOwner.debuffs) {
        const ballPhysics: BuffBallPhysics = abilityOwner.debuffs.find((d) => d.name === BUFF_NAME_BALL_PHYSICS) as any;
        if (ballPhysics && ballPhysics.abilityRefName === ability.name) {
            keepCurrentSpeed = true;
        }
    }
    applyDebuff(buffBallPhyscis, abilityOwner as any, game);
    abilityBounceBallUpgradeBounceBonusDamageResetBounces(abilityBounceBall)
    if (abilityBounceBall.currentSpeed < abilityBounceBall.startSpeed || !keepCurrentSpeed) {
        abilityBounceBall.currentSpeed = abilityBounceBall.startSpeed;
    }
    abilityBounceBall.moveDirection = calculateDirection(abilityOwner, castPosition);
    abilityBounceBall.currentCharges--;
    abilityBounceBall.currentSpeedDecrease = abilityBounceBall.startSpeedDecrease;
    if (abilityBounceBall.nextRechargeTime === undefined) {
        abilityBounceBall.nextRechargeTime = game.state.time + abilityBounceBall.baseRechargeTime;
    }
    const clientInfo: ClientInfo | undefined = getClientInfoByCharacterId(abilityOwner.id, game);
    if (clientInfo) clientInfo.lastMousePosition = castPosition;
}

function createAbilityBossSpeedBoostUpgradeOptions(ability: Ability, character: Character, game: Game): UpgradeOptionAndProbability[] {
    const upgradeOptions: UpgradeOptionAndProbability[] = [];
    pushAbilityUpgradesOptions(ABILITY_BOUNCE_BALL_UPGRADE_FUNCTIONS, upgradeOptions, ability, character, game);
    return upgradeOptions;
}

function executeAbilityUpgradeOption(ability: Ability, character: Character, upgradeOption: UpgradeOption, game: Game) {
    const abilityUpgradeOption: AbilityUpgradeOption = upgradeOption as AbilityUpgradeOption;
    upgradeAbility(ability, character, abilityUpgradeOption);
}

function setAbilityToLevel(ability: Ability, level: number) {
    const abilityBall = ability as AbilityBounceBall;
    abilityBall.damage = level * 100;
}

function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const abilityBall = ability as AbilityBounceBall;
    abilityBall.damage = level / 2 * damageFactor;
}

function setAbilityToBossLevel(ability: Ability, level: number) {
    const abilityBall = ability as AbilityBounceBall;
    abilityBall.damage = level * 10;
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
    rechargeTick(abilityBounceBall, game);

    const ballBuff = findBallBuff(abilityOwner, abilityBounceBall);
    if (!ballBuff) return;
    rollDirectionInfluenceTick(abilityBounceBall, abilityOwner, game);
    speedDrecreaseTick(abilityBounceBall, abilityOwner, ballBuff, game);
    const maxRollTickDistance = game.state.map.tileSize / 2;
    const rollTicks = Math.max(1, Math.round(abilityBounceBall.currentSpeed / maxRollTickDistance));
    const rollTickDistance = abilityBounceBall.currentSpeed / rollTicks;
    for (let i = 0; i < rollTicks; i++) {
        rollTick(abilityBounceBall, abilityOwner, rollTickDistance, game);
        damageTick(abilityBounceBall, abilityOwner, game);
    }
}

function damageTick(abilityBounceBall: AbilityBounceBall, abilityOwner: AbilityOwner, game: Game) {
    if (abilityBounceBall.nextTickTime === undefined) abilityBounceBall.nextTickTime = game.state.time + abilityBounceBall.tickInterval;
    if (abilityBounceBall.nextTickTime <= game.state.time
        || abilityBounceBall.rolledDistanceAfterLastDamageTick > abilityBounceBall.radius * 1.5) {
        abilityBounceBall.rolledDistanceAfterLastDamageTick = 0;
        const damage = getAbilityBounceBallDamage(abilityBounceBall);
        detectSomethingToCharacterHit(
            game.state.map,
            abilityOwner,
            abilityBounceBall.radius * 2,
            abilityOwner.faction,
            damage,
            game.state.players,
            game.state.bossStuff.bosses,
            abilityBounceBall.id,
            undefined,
            game
        );

        abilityBounceBall.nextTickTime += abilityBounceBall.tickInterval;

        if (abilityBounceBall.nextTickTime <= game.state.time) {
            abilityBounceBall.nextTickTime = game.state.time + abilityBounceBall.tickInterval;
        }
    }
}

function rollTick(abilityBounceBall: AbilityBounceBall, abilityOwner: AbilityOwner, moveDistance: number, game: Game) {
    const newPosition = calculateMovePosition(abilityOwner, abilityBounceBall.moveDirection, moveDistance, false);
    if (isPositionBlocking(newPosition, game.state.map, game.state.idCounter, game)) {
        abilityBounceBall.moveDirection = calculateBounceAngle(abilityOwner, abilityBounceBall.moveDirection, game);
        abilityBounceBall.currentSpeed += abilityBounceBall.bounceBonusSpeed;
        abilityBounceBallUpgradeBounceBonusDamageAddBounce(abilityBounceBall);
        bounceBallUpgradeBounceShieldExecute(abilityBounceBall, abilityOwner);
        if (abilityBounceBall.currentSpeed > abilityBounceBall.maxSpeed) {
            abilityBounceBall.currentSpeed = abilityBounceBall.maxSpeed;
        }
    } else {
        abilityBounceBall.rolledDistanceAfterLastDamageTick += moveDistance;
        abilityOwner.x = newPosition.x;
        abilityOwner.y = newPosition.y;
    }
}

function speedDrecreaseTick(abilityBounceBall: AbilityBounceBall, abilityOwner: AbilityOwner, ballBuff: BuffBallPhysics, game: Game) {
    let tickSpeedDecrease = abilityBounceBall.currentSpeed * abilityBounceBall.currentSpeedDecrease;
    abilityBounceBall.currentSpeed -= tickSpeedDecrease;
    abilityBounceBall.currentSpeedDecrease += abilityBounceBall.speedDecreaseIncrease;
    if (abilityBounceBall.currentSpeed <= abilityBounceBall.stopSpeed) {
        removeCharacterDebuff(ballBuff, abilityOwner as any, game);
        return;
    }
}

function rollDirectionInfluenceTick(abilityBounceBall: AbilityBounceBall, abilityOwner: AbilityOwner, game: Game) {
    const clientInfo: ClientInfo | undefined = getClientInfoByCharacterId(abilityOwner.id, game);

    let mapTurnToMousPosition = { x: 0, y: 0 };
    if (clientInfo) {
        mapTurnToMousPosition = clientInfo.lastMousePosition;
    } else {
        const target = getRandomAlivePlayerCharacter(game.state.players, game.state.randomSeed);
        if (target) {
            mapTurnToMousPosition = { x: target.x, y: target.y };
        }
    }

    const mouseDirection = calculateDirection(abilityOwner, mapTurnToMousPosition);
    const angleDiff = modulo((mouseDirection - abilityBounceBall.moveDirection + Math.PI), (Math.PI * 2)) - Math.PI;
    if (Math.abs(angleDiff) < abilityBounceBall.maxAngleChangePetTick) {
        abilityBounceBall.moveDirection = mouseDirection;
    } else if (angleDiff < 0) {
        abilityBounceBall.moveDirection = abilityBounceBall.moveDirection - abilityBounceBall.maxAngleChangePetTick;
    } else if (angleDiff > 0) {
        abilityBounceBall.moveDirection += abilityBounceBall.maxAngleChangePetTick;
    }
}

function rechargeTick(abilityBounceBall: AbilityBounceBall, game: Game) {
    if (abilityBounceBall.nextRechargeTime != undefined && abilityBounceBall.nextRechargeTime <= game.state.time) {
        abilityBounceBall.currentCharges++;
        if (abilityBounceBall.currentCharges < abilityBounceBall.maxCharges) {
            abilityBounceBall.nextRechargeTime = game.state.time + abilityBounceBall.baseRechargeTime;
        } else {
            abilityBounceBall.nextRechargeTime = undefined;
        }
    }
}

function paintAbilityStatsUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, game: Game): { width: number, height: number } {
    const abilityBounceBall = ability as AbilityBounceBall;
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(
        `Key: ${playerInputBindingToDisplayValue(abilityBounceBall.playerInputBinding!, game)}`,
        `Click to become a ball and roll towards click direction.`,
        `Bounces of terrain. Each bounce increases speed.`,
        `Speed decreases over time.`,
        "Ability stats:",
        `Damage: ${abilityBounceBall.damage}`,
        `Bounce Bonus Speed: ${abilityBounceBall.bounceBonusSpeed}`,
        `Angle Change per Second: ${(abilityBounceBall.maxAngleChangePetTick * 60 / Math.PI / 2 * 360).toFixed(0)}°`,
    );
    pushAbilityUpgradesUiTexts(ABILITY_BOUNCE_BALL_UPGRADE_FUNCTIONS, textLines, ability);

    return paintDefaultAbilityStatsUI(ctx, textLines, drawStartX, drawStartY);
}

