import { calculateDirection, calculateDistance, getCameraPosition } from "../game.js";
import { Game, Position } from "../gameModel.js";
import { nextRandom } from "../randomNumberGenerator.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, detectAbilityObjectToCharacterHit, UpgradeOptionAbility } from "./ability.js";

const ABILITY_NAME = "FireCircle";
export type AbilityFireCircle = Ability & {
    objectDuration: number,
    damage: number,
    size: number,
    baseRechargeTime: number,
    rechargeTimeDecreaseFaktor: number,
    maxCharges: number,
    currentCharges: number,
    nextRechargeTime: number,
}

export type AbilityObjectFireCircle = AbilityObject & {
    subType: "FireCircel",
    deleteTime: number,
}

export type AbilityObjectFireCircleTraveling = AbilityObject & {
    subType: "FireCircelTraveling",
    targetPosition: Position,
    duration: number,
    moveSpeed: number,
    toDelete: boolean,
}

export function addFireCircleAbility() {
    ABILITIES_FUNCTIONS[ABILITY_NAME] = {
        tickAbility: tickAbilityFireCircle,
        createAbiltiyUpgradeOptions: createAbiltiyFireCircleUpgradeOptions,
        activeAbilityCast: castFireCircle,
        tickAbilityObject: tickAbilityObjectFireCircle,
        deleteAbilityObject: deleteObjectFireCircle,
        paintAbilityUI: paintAbilityFireCircleUI,
        createAbility: createAbilityFireCircle,
        setAbilityToLevel: setAbilityFireCircleToLevel,
        paintAbilityObject: paintAbilityObjectFireCircle,
        isPassive: false,
        hasAutoCast: true,
    };
}

export function createAbilityFireCircle(
    playerInputBinding?: string,
    objectDuration: number = 2000,
    damage: number = 10,
    size: number = 30,
    rechargeTime: number = 2000,
    maxCharges: number = 3
): AbilityFireCircle {
    return {
        name: ABILITY_NAME,
        objectDuration: objectDuration,
        damage: damage,
        size: size,
        baseRechargeTime: rechargeTime,
        rechargeTimeDecreaseFaktor: 1,
        maxCharges: maxCharges,
        currentCharges: 0,
        nextRechargeTime: -1,
        passive: false,
        playerInputBinding: playerInputBinding,
    };
}

function createObjectFireCircleTraveling(x: number, y: number, damage: number, faction: string, duration: number, size: number, owner: AbilityOwner): AbilityObjectFireCircleTraveling {
    return {
        type: ABILITY_NAME,
        x: owner.x,
        y: owner.y,
        size: size,
        color: "red",
        damage: damage,
        faction: faction,
        duration: duration,
        paintOrder: "afterCharacterPaint",
        subType: "FireCircelTraveling",
        moveSpeed: 4,
        targetPosition: { x, y },
        toDelete: false,
    }
}

function createObjectFireCircle(abilityObject: AbilityObjectFireCircleTraveling, gameTime: number): AbilityObjectFireCircle {
    return {
        type: ABILITY_NAME,
        x: abilityObject.targetPosition.x,
        y: abilityObject.targetPosition.y,
        size: abilityObject.size,
        color: "red",
        damage: abilityObject.damage,
        faction: abilityObject.faction,
        deleteTime: gameTime + abilityObject.duration,
        paintOrder: "beforeCharacterPaint",
        subType: "FireCircel",
    }
}

function paintAbilityObjectFireCircle(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, game: Game) {
    let abilityObjectFireCircle = abilityObject as AbilityObjectFireCircle;
    let cameraPosition = getCameraPosition(game);
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;

    ctx.fillStyle = abilityObject.color;
    if(abilityObjectFireCircle.subType === "FireCircel"){
        ctx.globalAlpha = 0.65;
        ctx.beginPath();
        ctx.arc(
            abilityObject.x - cameraPosition.x + centerX,
            abilityObject.y - cameraPosition.y + centerY,
            abilityObject.size / 2, 0, 2 * Math.PI
        );
        ctx.fill();
        ctx.globalAlpha = 1;
    }else if(abilityObjectFireCircle.subType === "FireCircelTraveling"){
        ctx.beginPath();
        ctx.arc(
            abilityObject.x - cameraPosition.x + centerX,
            abilityObject.y - cameraPosition.y + centerY,
            5, 0, 2 * Math.PI
        );
        ctx.fill();
    }

}

function setAbilityFireCircleToLevel(ability: Ability, level: number) {
    let abilityFireCircle = ability as AbilityFireCircle;
    abilityFireCircle.damage = level * 10;
    abilityFireCircle.size = 20 + level * 10;
    abilityFireCircle.objectDuration = 2000 + level * 500;
    abilityFireCircle.rechargeTimeDecreaseFaktor = 1 + 0.30 * level;
}

function tickAbilityFireCircle(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    let abilityFireCircle = ability as AbilityFireCircle;
    if (abilityFireCircle.nextRechargeTime === -1) {
        abilityFireCircle.nextRechargeTime = game.state.time + abilityFireCircle.baseRechargeTime / abilityFireCircle.rechargeTimeDecreaseFaktor;
    }
    if (abilityFireCircle.currentCharges < abilityFireCircle.maxCharges) {
        if (game.state.time >= abilityFireCircle.nextRechargeTime) {
            abilityFireCircle.currentCharges++;
            abilityFireCircle.nextRechargeTime += abilityFireCircle.baseRechargeTime / abilityFireCircle.rechargeTimeDecreaseFaktor;
        }
    }

    if (ability.passive) {
        if (abilityFireCircle.currentCharges > 0) {
            autoCastAbility(abilityOwner, abilityFireCircle, game);
        }
    }
}

function autoCastAbility(abilityOwner: AbilityOwner, abilityFireCircle: AbilityFireCircle, game: Game) {
    let areaSize = 20 + abilityFireCircle.size;
    let castRandomPosition = {
        x: abilityOwner.x + nextRandom(game.state.randomSeed) * areaSize * 2 - areaSize,
        y: abilityOwner.y + nextRandom(game.state.randomSeed) * areaSize * 2 - areaSize
    };

    castFireCircle(abilityOwner, abilityFireCircle, castRandomPosition, game);
}

function paintAbilityFireCircleUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    let fireCircle = ability as AbilityFireCircle;
    let fontSize = size;
    let rectSize = size;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.beginPath();
    ctx.rect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.stroke();
    if (fireCircle.currentCharges < fireCircle.maxCharges) {
        ctx.fillStyle = "gray";
        let heightFactor = (fireCircle.nextRechargeTime - game.state.time) / (fireCircle.baseRechargeTime / fireCircle.rechargeTimeDecreaseFaktor);
        ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize * heightFactor);
    }

    ctx.fillStyle = "black";
    ctx.font = fontSize + "px Arial";
    ctx.fillText("" + fireCircle.currentCharges, drawStartX, drawStartY + rectSize - (rectSize - fontSize * 0.9));

    if (fireCircle.playerInputBinding) {
        let keyBind = "";
        game.clientKeyBindings[0].keyCodeToActionPressed.forEach((value, key) => {
            if (value.action === fireCircle.playerInputBinding) {
                keyBind = value.uiDisplayInputValue;
            }
        });
        ctx.fillStyle = "black";
        ctx.font = "10px Arial";
        ctx.fillText(keyBind, drawStartX + 1, drawStartY + 8);
    }
}

function tickAbilityObjectFireCircle(abilityObject: AbilityObject, game: Game) {
    let abilityObjectFireCircle = abilityObject as AbilityObjectFireCircle;
    if (abilityObjectFireCircle.subType === "FireCircel") {
        detectAbilityObjectToCharacterHit(game.state.map, abilityObject, game.state.players);
    } else if (abilityObjectFireCircle.subType === "FireCircelTraveling") {
        let ability = abilityObject as AbilityObjectFireCircleTraveling;
        if (ability.toDelete) return;
        let distance = calculateDistance(ability, ability.targetPosition);
        if (distance <= ability.moveSpeed) {
            let fireCircle = createObjectFireCircle(ability, game.state.time);
            game.state.abilityObjects.push(fireCircle);
            ability.toDelete = true;
        } else {
            let direction = calculateDirection(ability, ability.targetPosition);
            ability.x = ability.x + Math.cos(direction) * ability.moveSpeed;
            ability.y = ability.y + Math.sin(direction) * ability.moveSpeed;
        }
    }
}

function deleteObjectFireCircle(abilityObject: AbilityObject, game: Game): boolean {
    let abilityObjectFireCircle = abilityObject as AbilityObjectFireCircle;
    if (abilityObjectFireCircle.subType === "FireCircel") {
        return abilityObjectFireCircle.deleteTime <= game.state.time;
    } else {
        let abilityObjectFireCircleTraveling = abilityObject as AbilityObjectFireCircleTraveling;
        return abilityObjectFireCircleTraveling.toDelete;
    }
}

function createAbiltiyFireCircleUpgradeOptions(): UpgradeOptionAbility[] {
    let upgradeOptions: UpgradeOptionAbility[] = [];
    upgradeOptions.push({
        name: "Damage+10", upgrade: (a: Ability) => {
            let as = a as AbilityFireCircle;
            as.damage += 10;
        },
    });
    upgradeOptions.push({
        name: "Size+", upgrade: (a: Ability) => {
            let as = a as AbilityFireCircle;
            let addSize = Math.max(1, 10 - (as.size - 30) / 40);
            as.size += addSize;
        },
    });
    upgradeOptions.push({
        name: "Duration+", upgrade: (a: Ability) => {
            let as = a as AbilityFireCircle;
            as.objectDuration += 250;
        },
    });
    upgradeOptions.push({
        name: "RechargeTime-", upgrade: (a: Ability) => {
            let as = a as AbilityFireCircle;
            as.rechargeTimeDecreaseFaktor += 0.15;
        },
    });

    return upgradeOptions;
}

function castFireCircle(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, game: Game) {
    let abilityFireCircle = ability as AbilityFireCircle;
    if (abilityFireCircle.currentCharges > 0) {
        game.state.abilityObjects.push(createObjectFireCircleTraveling(
            castPosition.x,
            castPosition.y,
            abilityFireCircle.damage,
            abilityOwner.faction,
            abilityFireCircle.objectDuration,
            abilityFireCircle.size,
            abilityOwner
        ));
        if (abilityFireCircle.currentCharges === abilityFireCircle.maxCharges) {
            abilityFireCircle.nextRechargeTime = game.state.time + abilityFireCircle.baseRechargeTime / abilityFireCircle.rechargeTimeDecreaseFaktor;
        }
        abilityFireCircle.currentCharges--;
    }
}
