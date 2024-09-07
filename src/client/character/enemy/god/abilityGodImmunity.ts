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
    spriteRowWidths: [40],
};

export type AbilityGodImmunity = GodAbility & {
    cooldown: number,
    cooldownFinishedTime: number,
    groundRadius: number,
    firstActivation: boolean,
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
        level: { level: 1 },
        firstActivation: true,
    };
}

function createObjectFlying(targetPosition: Position, owner: AbilityOwner, faction: string, groundRadius: number): AbilityObjectGodImmunityFlying {
    return {
        type: ABILITY_NAME_GOD_IMMUNITY,
        x: owner.x,
        y: owner.y,
        targetPosition: { x: targetPosition.x, y: targetPosition.y },
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
    abilityImmunity.level.level = level;
    abilityImmunity.groundRadius = Math.max(100 / (level + 1), 25);
    abilityImmunity.cooldown = 120000 / (level + 1);
}

function paintAbility(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    const abiltiyImmunity = ability as AbilityGodImmunity;
    const position: Position = !abiltiyImmunity.pickedUp && abiltiyImmunity.pickUpPosition ? abiltiyImmunity.pickUpPosition : abilityOwner;
    const paintPos = getPointPaintPosition(ctx, position, cameraPosition, game.UI.zoom);
    const shieldImageRef = GAME_IMAGES[IMAGE_SHIELD];
    loadImage(shieldImageRef);
    const god = abilityOwner as GodEnemyCharacter;
    let sizeFactor = abiltiyImmunity.pickedUp ? 0.4 : 0.5 + abiltiyImmunity.level.level * 0.1;
    if (shieldImageRef.imageRef?.complete) {
        const shieldImage: HTMLImageElement = shieldImageRef.imageRef;
        if (abiltiyImmunity.pickedUp && !god.isDamageImmune) {
            paintPos.x += 25;
            paintPos.y += 28;
        }
        if (god.isDamageImmune) sizeFactor = 1.4;
        const width = shieldImageRef.spriteRowWidths[0];
        ctx.drawImage(
            shieldImage,
            0,
            0,
            width,
            shieldImage.height,
            Math.floor(paintPos.x - width / 2),
            Math.floor(paintPos.y - shieldImage.height / 2),
            width * sizeFactor,
            shieldImage.height * sizeFactor
        );
    }
    if (!abiltiyImmunity.pickedUp) {
        ctx.font = "bold 16px Arial";
        paintTextWithOutline(ctx, "white", "black", `Lvl ${abiltiyImmunity.level.level}`, paintPos.x, paintPos.y + 25, true, 2);
    }
}

function paintAbilityObject(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
    const abilityObjectFireCircle = abilityObject as AbilityObjectGodImmunityRemoveGround;
    const cameraPosition = getCameraPosition(game);
    const paintPos = getPointPaintPosition(ctx, abilityObject, cameraPosition, game.UI.zoom);

    const shieldImageRef = GAME_IMAGES[IMAGE_SHIELD];
    loadImage(shieldImageRef);
    if (!shieldImageRef.imageRef?.complete) return;
    const shieldImage: HTMLImageElement = shieldImageRef.imageRef;
    const width = shieldImageRef.spriteRowWidths[0];
    if (paintOrder === "beforeCharacterPaint" && abilityObjectFireCircle.subType === "GodImmunityRemoveGround") {
        ctx.fillStyle = abilityObject.color;
        ctx.beginPath();
        ctx.arc(
            paintPos.x,
            paintPos.y,
            abilityObjectFireCircle.radius, 0, 2 * Math.PI
        );
        ctx.fill();
        ctx.drawImage(
            shieldImage,
            width,
            0,
            width,
            shieldImage.height,
            Math.floor(paintPos.x - width / 2),
            Math.floor(paintPos.y - shieldImage.height / 2),
            width,
            shieldImage.height
        );
    } else if (paintOrder === "afterCharacterPaint" && abilityObjectFireCircle.subType !== "GodImmunityRemoveGround") {
        ctx.drawImage(
            shieldImage,
            width,
            0,
            width,
            shieldImage.height,
            Math.floor(paintPos.x - width / 2),
            Math.floor(paintPos.y - shieldImage.height / 2),
            width,
            shieldImage.height
        );
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
        const repeat = immunity.firstActivation ? 2 : 1;
        immunity.firstActivation = false;
        for (let i = 0; i < repeat; i++) {
            do {
                targetPosition.x = abilityOwner.x + distanceFromGod * Math.sin(randomDirection);
                targetPosition.y = abilityOwner.y + distanceFromGod * Math.cos(randomDirection);
                randomDirection += Math.PI / 17;
            } while (targetPosition.x < allowedAreaTopLeft.x || targetPosition.x > allowedAreaTopLeft.x + allowedAreaSize
            || targetPosition.y < allowedAreaTopLeft.y || targetPosition.y > allowedAreaTopLeft.y + allowedAreaSize);

            const flying = createObjectFlying(targetPosition, abilityOwner, abilityOwner.faction, immunity.groundRadius);
            game.state.abilityObjects.push(flying);
        }
        abilityOwner.isDamageImmune = true;
        abilityOwner.isDebuffImmune = true;
        removeCharacterDebuffs(abilityOwner as Character, game);
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

