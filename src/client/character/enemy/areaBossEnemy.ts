import { ABILITIES_FUNCTIONS, Ability, setAbilityToBossLevel } from "../../ability/ability.js";
import { createAbilityMelee } from "../../ability/abilityMelee.js";
import { createAbilityShoot } from "../../ability/abilityShoot.js";
import { tickCharacterDebuffs } from "../../debuff/debuff.js";
import { getNextId } from "../../game.js";
import { IdCounter, Game, Position, FACTION_ENEMY } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { addMapModifer, findMapModifierById, GameMapAreaRect, removeMapModifier } from "../../map/modifiers/mapModifier.js";
import { determineClosestCharacter, calculateAndSetMoveDirectionToPositionWithPathing, getPlayerCharacters, moveCharacterTick, resetCharacter } from "../character.js";
import { CHARACTER_TYPE_FUNCTIONS, Character, IMAGE_SLIME, createCharacter } from "../characterModel.js";
import { paintCharacterWithAbilitiesDefault, paintCharacterHpBar, paintCharatersPets } from "../characterPaint.js";
import { PathingCache } from "../pathing.js";

export type AreaBossEnemyCharacter = Character & {
    mapModifierIdRef: number,
};

export const CHARACTER_TYPE_AREA_BOSS_ENEMY = "AreaBossEnemyCharacter";

export function addAreaBossType() {
    CHARACTER_TYPE_FUNCTIONS[CHARACTER_TYPE_AREA_BOSS_ENEMY] = {
        onCharacterKill: onCharacterKill,
        paintCharacterType: paintAreaBossEnemyCharacter,
        tickFunction: tickAreaBossEnemyCharacter,
    }
}

export function createDefaultAreaBossWithLevel(idCounter: IdCounter, spawn: Position, mapModifierIdRef: number, game: Game): AreaBossEnemyCharacter {
    const scaling = 2;
    const bossSize = 60;
    const color = "black";
    const moveSpeed = Math.min(6, 1.5 + scaling * 0.5);
    const hp = 1000 * Math.pow(scaling, 4);
    const experienceWorth = Math.pow(scaling, 3) * 500;

    const bossCharacter = createCharacter(getNextId(idCounter), spawn.x, spawn.y, bossSize, bossSize, color, moveSpeed, hp, FACTION_ENEMY, CHARACTER_TYPE_AREA_BOSS_ENEMY, experienceWorth);
    bossCharacter.paint.image = IMAGE_SLIME;
    const abilities: Ability[] = createBossAbilities(scaling, game);
    bossCharacter.abilities = abilities;
    const areaBoss: AreaBossEnemyCharacter = { ...bossCharacter, mapModifierIdRef: mapModifierIdRef };
    return areaBoss;
}

function onCharacterKill(character: Character, game: Game) {
    const areaBoss = character as AreaBossEnemyCharacter;
    removeMapModifier(areaBoss.mapModifierIdRef, game);
}

function tickAreaBossEnemyCharacter(enemy: Character, game: Game, pathingCache: PathingCache | null) {
    if (enemy.state === "dead") return;
    const areaBoss = enemy as AreaBossEnemyCharacter;
    resetBossIfOutsideModifierArea(areaBoss, game);
    const playerCharacters = getPlayerCharacters(game.state.players);
    let closest = determineClosestCharacter(enemy, playerCharacters);
    if (closest.minDistance > 1200) {
        return;
    }
    calculateAndSetMoveDirectionToPositionWithPathing(enemy, closest.minDistanceCharacter, game.state.map, pathingCache, game.state.idCounter, game.state.time, game);
    moveCharacterTick(enemy, game.state.map, game.state.idCounter, game);

    for (let ability of enemy.abilities) {
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions) {
            if (abilityFunctions.tickBossAI) abilityFunctions.tickBossAI(enemy, ability, game);
        }
    }
    tickCharacterDebuffs(enemy, game);
}

function resetBossIfOutsideModifierArea(areaBoss: AreaBossEnemyCharacter, game: Game) {
    const modifier = findMapModifierById(areaBoss.mapModifierIdRef, game);
    if (modifier === undefined) return;
    if (modifier.area.type !== "rect") return;
    const area = modifier.area as GameMapAreaRect;
    if (areaBoss.x < area.x || areaBoss.x > area.x + area.width
        || areaBoss.y < area.y || areaBoss.y > area.y + area.height
    ) {
        resetAreaBoss(areaBoss, area, game);
        return;
    }
}

function resetAreaBoss(areaBoss: AreaBossEnemyCharacter, area: GameMapAreaRect, game: Game) {
    resetCharacter(areaBoss, game);
    areaBoss.hp = areaBoss.maxHp;
    areaBoss.x = area.x + area.width / 2;
    areaBoss.y = area.y + area.height / 2;
}

function createBossAbilities(abilityLevel: number, game: Game): Ability[] {
    const abilities: Ability[] = [];
    const abilityMelee = createAbilityMelee(game.state.idCounter);
    setAbilityToBossLevel(abilityMelee, abilityLevel);
    abilities.push(abilityMelee);

    const abilityShoot = createAbilityShoot(game.state.idCounter);
    setAbilityToBossLevel(abilityShoot, abilityLevel);
    abilities.push(abilityShoot);

    return abilities;
}

function paintAreaBossEnemyCharacter(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    if (character.state === "dead") return;
    paintCharatersPets(ctx, [character], cameraPosition, game);
    paintCharacterWithAbilitiesDefault(ctx, character, cameraPosition, game);
    const paintPos = getPointPaintPosition(ctx, character, cameraPosition, game.UI.zoom);
    const hpBarPos = {
        x: Math.floor(paintPos.x - character.width / 2),
        y: Math.floor(paintPos.y - character.height / 2)
    };

    paintCharacterHpBar(ctx, character, hpBarPos);
}
