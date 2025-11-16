import { getCharacterMoveSpeed, getRandomAlivePlayerCharacter, setCharacterPosition } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { paintCharacterDefault } from "../../character/characterPaint.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { BUFF_NAME_BALL_PHYSICS, BuffBallPhysics, createBuffBallPhysics, findBallBuff } from "../../debuff/buffBallPhysics.js";
import { applyDebuff, removeCharacterDebuff } from "../../debuff/debuff.js";
import { calculateDirection, findClientInfoByCharacterId, getNextId, modulo } from "../../game.js";
import { Position, Game, IdCounter, FACTION_ENEMY, ClientInfo, FACTION_PLAYER } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { calculateBounceAngle, calculateMovePosition, getMapMidlePosition, isMoveFromToBlocking, moveByDirectionAndDistance } from "../../map/map.js";
import { playerInputBindingToDisplayValue } from "../../input/playerInput.js";
import { MoreInfoHoverTexts, MoreInfoPart, createMoreInfosPart } from "../../moreInfo.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, detectSomethingToCharacterHit, getAbilityNameUiText, paintAbilityUiDefault, paintAbilityUiKeyBind } from "../ability.js";
import { AbilityUpgradesFunctions, getAbilityUpgradesDamageFactor, pushAbilityUpgradesOptions, pushAbilityUpgradesUiTexts, upgradeAbility } from "../abilityUpgrade.js";
import { ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_BONUS_DAMAGE, abilityBounceBallUpgradeBounceBonusDamageAddBounce, abilityBounceBallUpgradeBounceBonusDamagePaintStacks, abilityBounceBallUpgradeBounceBonusDamageTick, addAbilityBounceBallUpgradeBounceBonusDamage } from "./abilityBounceBallUpgradeBounceBonusDamage.js";
import { addAbilityBounceBallUpgradeBounceShield, bounceBallUpgradeBounceShieldExecute } from "./abilityBounceBallUpgradeBounceShield.js";
import { ABILITY_BOUNCE_BALL_UPGRADE_FIRE_LINE, abilityBounceBallUpgradeFireLinePlace, abilityBounceBallUpgradeFireLineStart, addAbilityBounceBallUpgradeFireLine } from "./abilityBounceBallUpgradeFireLine.js";
import { AbilityDamageBreakdown } from "../../combatlog.js";
import { ABILITY_NAME_FIRE_LINE } from "../abilityFireLine.js";
import { GAME_IMAGES } from "../../imageLoad.js";
import { addPaintFloatingTextInfoForMyself } from "../../floatingText.js";
import { GAME_MODE_BASE_DEFENSE } from "../../gameModeBaseDefense.js";
import { CHARACTER_TYPE_BOT } from "../../character/playerCharacters/characterBot.js";
import { nextRandom } from "../../randomNumberGenerator.js";

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
    visualizeBallAngle: number,
}

export const ABILITY_NAME_BOUNCE_BALL = "Bounce Ball";
export const ABILITY_BOUNCE_BALL_UPGRADE_FUNCTIONS: AbilityUpgradesFunctions = {};
GAME_IMAGES[ABILITY_NAME_BOUNCE_BALL] = {
    imagePath: "/images/bounceBall.png",
    spriteRowHeights: [40],
    spriteRowWidths: [40],
};
const ABILITY_BOUNCE_BALL_DAMAGE_PER_LEVEL = 200;

export function addAbilityBounceBall() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_BOUNCE_BALL] = {
        activeAbilityCast: castBounceBall,
        createAbility: createAbilityBounceBall,
        createAbilityBossUpgradeOptions: createAbilityBossUpgradeOptions,
        createAbilityMoreInfos: createAbilityMoreInfos,
        createDamageBreakDown: createDamageBreakDown,
        executeUpgradeOption: executeAbilityUpgradeOption,
        paintAbility: paintAbility,
        paintAbilityUI: paintAbilityUI,
        paintAbilityAccessoire: paintAbilityAccessoire,
        resetAbility: resetAbility,
        setAbilityToLevel: setAbilityToLevel,
        setAbilityToBossLevel: setAbilityToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        tickAbility: tickAbility,
        tickAI: tickAI,
        abilityUpgradeFunctions: ABILITY_BOUNCE_BALL_UPGRADE_FUNCTIONS,
        canBeUsedByBosses: true,
    };
    addAbilityBounceBallUpgradeBounceBonusDamage();
    addAbilityBounceBallUpgradeBounceShield();
    addAbilityBounceBallUpgradeFireLine();
}

export function createAbilityBounceBall(
    idCounter: IdCounter,
    playerInputBinding?: string,
    damage: number = ABILITY_BOUNCE_BALL_DAMAGE_PER_LEVEL,
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
        visualizeBallAngle: 0,
    };
}

export function getAbilityBounceBallDamage(abilityBounceBall: AbilityBounceBall, faction: string) {
    let damage = abilityBounceBall.damage;
    damage *= getAbilityUpgradesDamageFactor(ABILITY_BOUNCE_BALL_UPGRADE_FUNCTIONS, abilityBounceBall, true, faction);
    return damage;
}

function createDamageBreakDown(damage: number, ability: Ability, abilityObject: AbilityObject | undefined, damageAbilityName: string, game: Game): AbilityDamageBreakdown[] {
    const bounceBall = ability as AbilityBounceBall;
    const damageBreakDown: AbilityDamageBreakdown[] = [];
    let openDamage = damage;
    if (!abilityObject) {
        damageBreakDown.push({
            damage: bounceBall.damage,
            name: "Base Damage",
        });
        openDamage -= bounceBall.damage;
        if (openDamage > 0) {
            damageBreakDown.push({
                damage: openDamage,
                name: ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_BONUS_DAMAGE,
            });
        }
    } else {
        if (abilityObject.type === ABILITY_NAME_FIRE_LINE) {
            damageBreakDown.push({
                damage: damage,
                name: ABILITY_BOUNCE_BALL_UPGRADE_FIRE_LINE,
            });
        }
    }
    return damageBreakDown;
}

function paintAbilityAccessoire(ctx: CanvasRenderingContext2D, ability: Ability, paintPosition: Position, game: Game) {
    const abilityBall = ability as AbilityBounceBall;
    paintBall(ctx, abilityBall, FACTION_PLAYER, paintPosition);
}

function tickAI(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    if (abilityOwner.debuffs) {
        const ballPhysics: BuffBallPhysics | undefined = abilityOwner.debuffs.find((d) => d.name === BUFF_NAME_BALL_PHYSICS) as any;
        if (ballPhysics) return;
    }
    if (nextRandom(game.state.randomSeed) > 0.5) return; // randomized so bounce ball and lightning ball get both cast
    let pos: Position = {
        x: abilityOwner.x,
        y: abilityOwner.y
    };
    if (game.state.gameMode === GAME_MODE_BASE_DEFENSE && abilityOwner.type === CHARACTER_TYPE_BOT) {
        pos = getMapMidlePosition(game.state.map);
    } else if (abilityOwner.moveDirection) {
        pos = calculateMovePosition(abilityOwner, abilityOwner.moveDirection, 1, false);
    }

    castBounceBall(abilityOwner, ability, pos, undefined, true, game);
}

function resetAbility(ability: Ability) {
    const ball = ability as AbilityBounceBall;
    ball.nextRechargeTime = undefined;
    ball.currentCharges = ball.maxCharges;
}

function castBounceBall(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, castPositionRelativeToCharacter: Position | undefined, isKeydown: boolean, game: Game) {
    if (!isKeydown) return;
    const abilityBounceBall = ability as AbilityBounceBall;
    if (abilityBounceBall.currentCharges <= 0) {
        const timeUntil = abilityBounceBall.nextRechargeTime! - game.state.time;
        addPaintFloatingTextInfoForMyself(`on cooldown`, game, timeUntil, abilityOwner.id, abilityBounceBall.id, ABILITY_NAME_BOUNCE_BALL);
        return;
    }
    const buffBallPhyscis = createBuffBallPhysics(ability.id, ability.name);
    let keepCurrentSpeed = false;
    if (abilityOwner.debuffs) {
        const ballPhysics: BuffBallPhysics = abilityOwner.debuffs.find((d) => d.name === BUFF_NAME_BALL_PHYSICS) as any;
        if (ballPhysics && ballPhysics.abilityRefName === ability.name) {
            keepCurrentSpeed = true;
        }
    }
    applyDebuff(buffBallPhyscis, abilityOwner as any, game);
    abilityBounceBallUpgradeFireLineStart(abilityBounceBall, abilityOwner, game);
    if (abilityBounceBall.currentSpeed < abilityBounceBall.startSpeed || !keepCurrentSpeed) {
        abilityBounceBall.currentSpeed = abilityBounceBall.startSpeed;
    }
    abilityBounceBall.moveDirection = calculateDirection(abilityOwner, castPosition);
    abilityBounceBall.currentCharges--;
    abilityBounceBall.currentSpeedDecrease = abilityBounceBall.startSpeedDecrease;
    if (abilityBounceBall.nextRechargeTime === undefined) {
        abilityBounceBall.nextRechargeTime = game.state.time + abilityBounceBall.baseRechargeTime;
    }
    const clientInfo: ClientInfo | undefined = findClientInfoByCharacterId(abilityOwner.id, game);
    if (clientInfo) clientInfo.lastMousePosition = castPosition;
}

function createAbilityBossUpgradeOptions(ability: Ability, character: Character, game: Game): UpgradeOptionAndProbability[] {
    const upgradeOptions: UpgradeOptionAndProbability[] = [];
    pushAbilityUpgradesOptions(ABILITY_BOUNCE_BALL_UPGRADE_FUNCTIONS, upgradeOptions, ability, character, game);
    return upgradeOptions;
}

function executeAbilityUpgradeOption(ability: Ability, character: Character, upgradeOption: UpgradeOption, game: Game) {
    const abilityUpgradeOption: AbilityUpgradeOption = upgradeOption as AbilityUpgradeOption;
    upgradeAbility(ability, character, abilityUpgradeOption, game);
}

function setAbilityToLevel(ability: Ability, level: number) {
    const abilityBall = ability as AbilityBounceBall;
    abilityBall.damage = level * ABILITY_BOUNCE_BALL_DAMAGE_PER_LEVEL;
}

function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const abilityBall = ability as AbilityBounceBall;
    abilityBall.damage = level / 2 * damageFactor;
}

function setAbilityToBossLevel(ability: Ability, level: number) {
    const abilityBall = ability as AbilityBounceBall;
    abilityBall.baseRechargeTime = 10000;
    abilityBall.damage = level * 10;
}

function paintAbilityUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    const bounceBall = ability as AbilityBounceBall;
    let heightFactor = 0;
    if (bounceBall.nextRechargeTime !== undefined && game.state.time < bounceBall.nextRechargeTime) {
        heightFactor = Math.max((bounceBall.nextRechargeTime - game.state.time) / bounceBall.baseRechargeTime, 0);
    }
    paintAbilityUiDefault(ctx, ability, drawStartX, drawStartY, size, game, ABILITY_NAME_BOUNCE_BALL, heightFactor, bounceBall.currentCharges);
}

function paintAbility(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    const abilityBall = ability as AbilityBounceBall;
    let color = "red";
    if (abilityOwner.faction === FACTION_ENEMY) {
        color = "black";
    }
    ctx.lineWidth = 2;
    const paintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition, game.UI.zoom);
    const ballBuff = findBallBuff(abilityOwner, abilityBall);
    if (ballBuff === true) return;
    if (!findBallBuff(abilityOwner, abilityBall)) {
        paintPos.y -= 10;
    } else {
        ctx.strokeStyle = color;
        ctx.translate(paintPos.x, paintPos.y);
        ctx.rotate(abilityBall.visualizeBallAngle);
        ctx.translate(-paintPos.x, -paintPos.y);
        paintCharacterDefault(ctx, abilityOwner as Character, cameraPosition, game, false);
        ctx.translate(paintPos.x, paintPos.y);
        ctx.rotate(-abilityBall.visualizeBallAngle);
        ctx.translate(-paintPos.x, -paintPos.y);
    }
    paintBall(ctx, abilityBall, abilityOwner.faction, paintPos);
    abilityBounceBallUpgradeBounceBonusDamagePaintStacks(ctx, abilityBall, abilityOwner, cameraPosition, game);
}

function paintBall(ctx: CanvasRenderingContext2D, abilityBall: AbilityBounceBall, faction: string, paintPos: Position) {
    let color = "red";
    if (faction === FACTION_ENEMY) {
        color = "black";
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
        paintPos.x,
        paintPos.y,
        abilityBall.radius, 0, 2 * Math.PI
    );
    ctx.stroke();

    ctx.beginPath();
    let paintPos2 = { x: paintPos.x, y: paintPos.y };
    moveByDirectionAndDistance(paintPos2, abilityBall.visualizeBallAngle, abilityBall.radius, false);
    ctx.moveTo(paintPos2.x, paintPos2.y);
    paintPos2 = { x: paintPos.x, y: paintPos.y };
    moveByDirectionAndDistance(paintPos2, abilityBall.visualizeBallAngle, abilityBall.radius - 8, false);
    ctx.lineTo(paintPos2.x, paintPos2.y);
    ctx.stroke();
}

function tickAbility(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityBounceBall = ability as AbilityBounceBall;
    rechargeTick(abilityBounceBall, game);
    abilityBounceBallUpgradeBounceBonusDamageTick(ability, game);

    const ballBuff = findBallBuff(abilityOwner, abilityBounceBall);
    if (typeof ballBuff !== "object") {
        if (!ballBuff && abilityOwner.isMoving && abilityOwner.baseMoveSpeed !== undefined) {
            turnBall(abilityBounceBall, getCharacterMoveSpeed(abilityOwner as Character), abilityOwner.moveDirection!);
        }
        return;
    };
    rollDirectionInfluenceTick(abilityBounceBall, abilityOwner, game);
    speedDrecreaseTick(abilityBounceBall, abilityOwner, ballBuff, game);
    turnBall(abilityBounceBall, abilityBounceBall.currentSpeed, abilityBounceBall.moveDirection!)
    const maxRollTickDistance = game.state.map.tileSize / 2;
    const rollTicks = Math.max(1, Math.round(abilityBounceBall.currentSpeed / maxRollTickDistance));
    const rollTickDistance = abilityBounceBall.currentSpeed / rollTicks;
    for (let i = 0; i < rollTicks; i++) {
        rollTick(abilityBounceBall, abilityOwner, rollTickDistance, game);
        damageTick(abilityBounceBall, abilityOwner, game);
    }
}

function turnBall(ball: AbilityBounceBall, speed: number, direction: number) {
    const xStep = Math.cos(direction);
    let directionMult = xStep > 0 ? 1 : -1;
    if (ball.visualizeBallAngle === undefined) ball.visualizeBallAngle = 0;
    ball.visualizeBallAngle = (ball.visualizeBallAngle + speed / 30 * directionMult) % (Math.PI * 2);
}

function damageTick(abilityBounceBall: AbilityBounceBall, abilityOwner: AbilityOwner, game: Game) {
    if (abilityBounceBall.nextTickTime === undefined) abilityBounceBall.nextTickTime = game.state.time + abilityBounceBall.tickInterval;
    if (abilityBounceBall.nextTickTime <= game.state.time
        || abilityBounceBall.rolledDistanceAfterLastDamageTick > abilityBounceBall.radius * 1.5) {
        abilityBounceBall.rolledDistanceAfterLastDamageTick = 0;
        const damage = getAbilityBounceBallDamage(abilityBounceBall, abilityOwner.faction);
        detectSomethingToCharacterHit(
            game.state.map,
            abilityOwner,
            abilityBounceBall.radius * 2,
            abilityOwner.faction,
            damage,
            game.state.players,
            game.state.bossStuff.bosses,
            abilityBounceBall.name,
            abilityBounceBall.id,
            undefined,
            game
        );

        abilityBounceBall.nextTickTime += abilityBounceBall.tickInterval;
        abilityBounceBallUpgradeFireLinePlace(abilityBounceBall, abilityOwner, game);

        if (abilityBounceBall.nextTickTime <= game.state.time) {
            abilityBounceBall.nextTickTime = game.state.time + abilityBounceBall.tickInterval;
        }
    }
}

function rollTick(abilityBounceBall: AbilityBounceBall, abilityOwner: AbilityOwner, moveDistance: number, game: Game) {
    const newPosition = calculateMovePosition(abilityOwner, abilityBounceBall.moveDirection, moveDistance, false);
    if (isMoveFromToBlocking(abilityOwner, newPosition, game.state.map, game)) {
        abilityBounceBall.moveDirection = calculateBounceAngle(abilityOwner, abilityBounceBall.moveDirection, game);
        abilityBounceBall.currentSpeed += abilityBounceBall.bounceBonusSpeed;
        abilityBounceBallUpgradeBounceBonusDamageAddBounce(abilityBounceBall);
        bounceBallUpgradeBounceShieldExecute(abilityBounceBall, abilityOwner);
        if (abilityBounceBall.currentSpeed > abilityBounceBall.maxSpeed) {
            abilityBounceBall.currentSpeed = abilityBounceBall.maxSpeed;
        }
        abilityBounceBallUpgradeFireLinePlace(abilityBounceBall, abilityOwner, game);
    } else {
        abilityBounceBall.rolledDistanceAfterLastDamageTick += moveDistance;
        setCharacterPosition(abilityOwner as Character, newPosition, game.state.map);
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
    const clientInfo: ClientInfo | undefined = findClientInfoByCharacterId(abilityOwner.id, game);

    let influenceDirection: number = 0;
    if (clientInfo) {
        if (abilityOwner.isMoving && abilityOwner.moveDirection !== undefined) {
            influenceDirection = abilityOwner.moveDirection;
        } else {
            influenceDirection = calculateDirection(abilityOwner, clientInfo.lastMousePosition);
        }
    } else {
        const target = getRandomAlivePlayerCharacter(game.state.players, game.state.randomSeed);
        if (target) {
            const enemyTarget = { x: target.x, y: target.y };
            influenceDirection = calculateDirection(abilityOwner, enemyTarget);
        }
    }

    const angleDiff = modulo((influenceDirection - abilityBounceBall.moveDirection + Math.PI), (Math.PI * 2)) - Math.PI;
    if (Math.abs(angleDiff) < abilityBounceBall.maxAngleChangePetTick) {
        abilityBounceBall.moveDirection = influenceDirection;
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
            delete abilityBounceBall.nextRechargeTime;
        }
    }
}

function createAbilityMoreInfos(ctx: CanvasRenderingContext2D, ability: Ability, game: Game): MoreInfoPart {
    const abilityBounceBall = ability as AbilityBounceBall;
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(
        `Key: ${playerInputBindingToDisplayValue(abilityBounceBall.playerInputBinding!, game)}`,
        `Click to become a ball and roll towards click direction.`,
        `Bounces of terrain. Each bounce increases speed.`,
        `Speed decreases over time.`,
        "",
        "Ability stats:",
    );

    if (abilityBounceBall.level) {
        textLines.push(`Level: ${abilityBounceBall.level?.level}`);
        if (abilityBounceBall.level.leveling) {
            textLines.push(
                `  XP: ${abilityBounceBall.level.leveling.experience.toFixed(0)}/${abilityBounceBall.level.leveling.experienceForLevelUp.toFixed(0)}`,
                `  on level up you gain:`,
                `    +${ABILITY_BOUNCE_BALL_DAMAGE_PER_LEVEL} damage`,
            );
        }
    }
    textLines.push(
        `Base Damage: ${abilityBounceBall.damage}`,
        `Bounce Bonus Speed: ${abilityBounceBall.bounceBonusSpeed}`,
        `Angle Change per Second: ${(abilityBounceBall.maxAngleChangePetTick * 60 / Math.PI / 2 * 360).toFixed(0)}°`,
    );

    const upgradeHoverLines: MoreInfoHoverTexts = {};
    pushAbilityUpgradesUiTexts(ABILITY_BOUNCE_BALL_UPGRADE_FUNCTIONS, textLines, upgradeHoverLines, ability);

    return createMoreInfosPart(ctx, textLines, undefined, 14, upgradeHoverLines);
}

