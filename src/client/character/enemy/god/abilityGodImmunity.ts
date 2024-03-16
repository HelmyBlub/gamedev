import { determineClosestCharacter, findCharacterById, getPlayerCharacters } from "../../character.js";
import { calculateDirection, calculateDistance, getCameraPosition, getNextId } from "../../../game.js";
import { Game, IdCounter, Position } from "../../../gameModel.js";
import { getPointPaintPosition, paintTextWithOutline } from "../../../gamePaint.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityObjectCircle, AbilityOwner, PaintOrderAbility, detectAbilityObjectCircleToCharacterHit, findAbilityOwnerById } from "../../../ability/ability.js";
import { GodAbility } from "./godAbility.js";
import { nextRandom } from "../../../randomNumberGenerator.js";
import { CHARACTER_TYPE_GOD_ENEMY, GodEnemyCharacter } from "./godEnemy.js";
import { removeCharacterDebuffs } from "../../../debuff/debuff.js";
import { Character } from "../../characterModel.js";
import { GAME_IMAGES, loadImage } from "../../../imageLoad.js";


export const ABILITY_NAME_GOD_IMMUNITY = "God Immunity";
const IMAGE_SHIELD = "shield";
GAME_IMAGES[IMAGE_SHIELD] = {
    imagePath: "/images/shield.png",
    spriteRowHeights: [],
    spriteRowWidths: [],
};

export type AbilityGodImmunity = GodAbility & {
    cooldown: number,
    cooldownFinishedTime: number,
    groundRadius: number,
}

export type AbilityObjectGodImmunityRemoveGround = AbilityObjectCircle & {
    subType: "GodImmunityRemoveGround",
    tickInterval: number,
    nextTickTime?: number,
    delete: boolean,
}

export type AbilityObjectGodImmunityFlying = AbilityObjectCircle & {
    subType: "GodImmunityFlying",
    moveSpeed: number,
    targetPosition: Position,
    groundCreated?: boolean,
    groundRadius: number,
}

export function addGodAbilityGodImmunity() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_GOD_IMMUNITY] = {
        createAbility: createAbility,
        deleteAbilityObject: deleteObject,
        paintAbility: paintAbility,
        paintAbilityObject: paintAbilityObject,
        setAbilityToBossLevel: setAbilityToBossLevel,
        tickAbilityObject: tickAbilityObject,
        tickBossAI: tickBossAI,
    };
}

function createAbility(
    idCounter: IdCounter,
    playerInputBinding?: string,
): AbilityGodImmunity {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_GOD_IMMUNITY,
        cooldown: 50000,
        cooldownFinishedTime: 0,
        groundRadius: 50,
        pickedUp: false,
        passive: false,
        playerInputBinding: playerInputBinding,
        upgrades: {},
    };
}

function createObjectFlying(targetPosition: Position, owner: AbilityOwner, faction: string, groundRadius: number): AbilityObjectGodImmunityFlying {
    return {
        type: ABILITY_NAME_GOD_IMMUNITY,
        x: owner.x,
        y: owner.y,
        targetPosition: targetPosition,
        radius: 6,
        color: "blue",
        faction: faction,
        subType: "GodImmunityFlying",
        moveSpeed: 3,
        damage: 0,
        groundRadius: groundRadius,
    }
}

function createObjectGround(abilityObject: AbilityObjectGodImmunityFlying, gameTime: number): AbilityObjectGodImmunityRemoveGround {
    return {
        type: ABILITY_NAME_GOD_IMMUNITY,
        x: abilityObject.x,
        y: abilityObject.y,
        radius: abilityObject.groundRadius,
        color: "blue",
        damage: 0,
        faction: abilityObject.faction,
        subType: "GodImmunityRemoveGround",
        tickInterval: 250,
        delete: false,
    }
}

function setAbilityToBossLevel(ability: Ability, level: number) {
    const abilityImmunity = ability as AbilityGodImmunity;
    abilityImmunity.groundRadius = 100 / (level + 1);
    abilityImmunity.cooldown = 120000 / (level + 1);
}

function paintAbility(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    const abiltiyMovingFire = ability as AbilityGodImmunity;
    if (abiltiyMovingFire.pickedUp && abilityOwner.isDamageImmune) {
        const paintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition);
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "black";
        ctx.arc(
            paintPos.x,
            paintPos.y,
            abilityOwner.width!, 0, 2 * Math.PI
        );
        ctx.stroke();
    }
    const position: Position = !abiltiyMovingFire.pickedUp && abiltiyMovingFire.pickUpPosition ? abiltiyMovingFire.pickUpPosition : abilityOwner;
    const paintPos = getPointPaintPosition(ctx, position, cameraPosition);
    if (abiltiyMovingFire.pickedUp) paintPos.x += 20;
    const shieldImageRef = GAME_IMAGES[IMAGE_SHIELD];
    loadImage(shieldImageRef);
    const god = abilityOwner as GodEnemyCharacter;
    const sizeFactor = abiltiyMovingFire.pickedUp ? 0.8 : 1 + god.pickUpCount * 0.2;
    if (shieldImageRef.imageRef?.complete) {
        const shieldImage: HTMLImageElement = shieldImageRef.imageRef;
        ctx.drawImage(
            shieldImage,
            0,
            0,
            shieldImage.width,
            shieldImage.height,
            Math.floor(paintPos.x - shieldImage.width / 2),
            Math.floor(paintPos.y - shieldImage.height / 2),
            shieldImage.width * sizeFactor,
            shieldImage.height * sizeFactor
        )
    }
    if (!abiltiyMovingFire.pickedUp) {
        ctx.font = "bold 16px Arial";
        paintTextWithOutline(ctx, "white", "black", `Lvl ${god.pickUpCount + 1}`, paintPos.x, paintPos.y + 25, true, 2);
    }
}

function paintAbilityObject(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    const abilityObjectFireCircle = abilityObject as AbilityObjectGodImmunityRemoveGround;
    const cameraPosition = getCameraPosition(game);
    const paintPos = getPointPaintPosition(ctx, abilityObject, cameraPosition);

    if ((paintOrder === "beforeCharacterPaint" && abilityObjectFireCircle.subType === "GodImmunityRemoveGround")
        || (paintOrder === "afterCharacterPaint" && abilityObjectFireCircle.subType !== "GodImmunityRemoveGround")
    ) {
        ctx.fillStyle = abilityObject.color;
        ctx.beginPath();
        ctx.arc(
            paintPos.x,
            paintPos.y,
            abilityObjectFireCircle.radius, 0, 2 * Math.PI
        );
        ctx.fill();
        if (abilityObjectFireCircle.subType !== "GodImmunityRemoveGround") {
            ctx.lineWidth = 1;
            ctx.strokeStyle = "white";
            ctx.stroke();
        }
    }
}

function tickBossAI(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const immunity = ability as AbilityGodImmunity;
    if (!immunity.pickedUp) return;
    if (immunity.cooldownFinishedTime < game.state.time) {
        immunity.cooldownFinishedTime = game.state.time + immunity.cooldown;
        const godArea = game.state.map.godArea;
        if (!godArea || !godArea.spawnTopLeftChunk) return;
        const chunkSize = game.state.map.chunkLength * game.state.map.tileSize;
        const allowedAreaPadding = chunkSize;
        const allowedAreaTopLeft = {
            x: godArea.spawnTopLeftChunk.x * chunkSize + allowedAreaPadding,
            y: godArea.spawnTopLeftChunk.y * chunkSize + allowedAreaPadding,
        }
        const allowedAreaSize = godArea.size * chunkSize - allowedAreaPadding * 2;

        const targetPosition = { x: 0, y: 0 };
        let randomDirection = nextRandom(game.state.randomSeed) * Math.PI * 2;
        const distanceFromGod = 500;
        do {
            targetPosition.x = abilityOwner.x + distanceFromGod * Math.sin(randomDirection);
            targetPosition.y = abilityOwner.y + distanceFromGod * Math.cos(randomDirection);
            randomDirection += Math.PI / 17;
        } while (targetPosition.x < allowedAreaTopLeft.x || targetPosition.x > allowedAreaTopLeft.x + allowedAreaSize
        || targetPosition.y < allowedAreaTopLeft.y || targetPosition.y > allowedAreaTopLeft.y + allowedAreaSize);

        const flying = createObjectFlying(targetPosition, abilityOwner, abilityOwner.faction, immunity.groundRadius);
        abilityOwner.isDamageImmune = true;
        abilityOwner.isDebuffImmune = true;
        removeCharacterDebuffs(abilityOwner as Character, game);
        game.state.abilityObjects.push(flying);
    }
}

function tickAbilityObject(abilityObject: AbilityObject, game: Game) {
    const abilityObjectGround = abilityObject as AbilityObjectGodImmunityRemoveGround;
    if (abilityObjectGround.subType === "GodImmunityRemoveGround") {
        if (abilityObjectGround.nextTickTime === undefined) abilityObjectGround.nextTickTime = game.state.time + abilityObjectGround.tickInterval;
        if (abilityObjectGround.nextTickTime <= game.state.time) {
            abilityObjectGround.nextTickTime += abilityObjectGround.tickInterval;
            const godEnemy = game.state.bossStuff.bosses.find((e) => e.type === CHARACTER_TYPE_GOD_ENEMY);
            if (!godEnemy || !godEnemy.isDamageImmune) return;
            const distance = calculateDistance(godEnemy, abilityObject);
            if (distance <= godEnemy.width / 2 + abilityObjectGround.radius) {
                godEnemy.isDamageImmune = false;
                godEnemy.isDebuffImmune = false;
                abilityObjectGround.delete = true;
            }
        }
    } else if (abilityObjectGround.subType === "GodImmunityFlying") {
        const flying = abilityObject as AbilityObjectGodImmunityFlying;
        const distance = calculateDistance(flying, flying.targetPosition);
        if (distance > flying.moveSpeed + 5) {
            const direction = calculateDirection(flying, flying.targetPosition);
            flying.x = flying.x + Math.cos(direction) * flying.moveSpeed;
            flying.y = flying.y + Math.sin(direction) * flying.moveSpeed;
        } else if (!flying.groundCreated) {
            const groundObject = createObjectGround(flying, game.state.time);
            flying.groundCreated = true;
            game.state.abilityObjects.push(groundObject);
        }
    }
}

function deleteObject(abilityObject: AbilityObject, game: Game): boolean {
    const immunityFlying = abilityObject as AbilityObjectGodImmunityFlying;
    if (immunityFlying.subType === "GodImmunityFlying" && immunityFlying.groundCreated) {
        return true;
    } else if (immunityFlying.subType !== "GodImmunityFlying") {
        const immunityGround = abilityObject as AbilityObjectGodImmunityRemoveGround;
        return immunityGround.delete;
    }
    return false;
}

