import { determineCharactersInDistance, characterTakeDamage, getPlayerCharacters, fillRandomUpgradeOptions } from "../character/character.js"
import { Character } from "../character/characterModel.js"
import { BossEnemyCharacter } from "../character/enemy/bossEnemy.js"
import { calculateDistance, getCameraPosition, takeTimeMeasure } from "../game.js"
import { Game, GameState, IdCounter, Position } from "../gameModel.js"
import { GameMap } from "../map/map.js"
import { findPlayerByCharacterId, findPlayerById, Player } from "../player.js"
import { addDeathCircleAbility } from "./abilityDeathCircle.js"
import { addFireCircleAbility } from "./abilityFireCircle.js"
import { addLeshAbility } from "./abilityLeash.js"
import { addTowerAbility } from "./abilityTower.js"
import { addShootAbility } from "./abilityShoot.js"
import { addSwordAbility } from "./abilitySword.js"
import { addHpRegenAbility } from "./abilityHpRegen.js"
import { addMeleeAbility } from "./abilityMelee.js"
import { addIceAbility } from "./abilityIceAura.js"
import { addSingleTargetAbility } from "./abilitySingleTarget.js"
import { addSnipeAbility } from "./snipe/abilitySnipe.js"
import { addSpeedBoostAbility } from "./speedBoost/abilitySpeedBoost.js"
import { addAbilitySlowTrail } from "./abilitySlowTrail.js"
import { addAbilityFireLine } from "./abilityFireLine.js"
import { AbilityUpgradesFunctions } from "./abilityUpgrade.js"
import { addAbilityExplode } from "./abilityExplode.js"

export type Ability = {
    id: number,
    name: string,
    passive: boolean,
    playerInputBinding?: string,
    leveling?: {
        level: number,
        experience: number,
        experienceForLevelUp: number,
    }
    bossSkillPoints?: number,
    upgrades: {
        [key: string]: any,
    }
}
export type PaintOrderAbility = "beforeCharacterPaint" | "afterCharacterPaint";
export type AbilityObject = Position & {
    type: string,
    size: number,
    color: string,
    damage: number,
    faction: string,
    abilityRefId?: number,
    leveling?: boolean,
}

export type AbilityOwner = Position & Partial<Character> & {
    faction: string,
    id: number,
}

export type AbilityFunctions = {
    tickAbility?: (abilityOwner: AbilityOwner, ability: Ability, game: Game) => void,
    tickAbilityObject?: (abilityObject: AbilityObject, game: Game) => void,
    createAbility: (idCounter: IdCounter, playerInputBinding?: string) => Ability,
    createAbilityUpgradeOptions: (ability: Ability) => AbilityUpgradeOption[],
    createAbilityBossUpgradeOptions?: (ability: Ability) => AbilityUpgradeOption[],
    activeAbilityCast?: (abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, isKeydown: boolean, game: Game) => void,
    deleteAbilityObject?: (abilityObject: AbilityObject, game: Game) => boolean,
    paintAbility?: (ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) => void,
    paintAbilityObject?: (ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) => void,
    paintAbilityUI?: (ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) => void,
    paintAbilityStatsUI?: (ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, game: Game) => { width: number, height: number },
    onHit?: (abilityObject: AbilityObject) => void,
    canHitMore?: (abilityObject: AbilityObject) => boolean,
    setAbilityToLevel?: (ability: Ability, level: number) => void,
    setAbilityToBossLevel?: (ability: Ability, level: number) => void,
    abilityUpgradeFunctions?: AbilityUpgradesFunctions,
    notInheritable?: boolean,
    canBeUsedByBosses?: boolean,
    isPassive: boolean,
    hasAutoCast?: boolean,
}

export type AbilitiesFunctions = {
    [key: string]: AbilityFunctions,
}

export type AbilityUpgradeOption = {
    name: string,
    probabilityFactor: number,
    upgrade: (ability: Ability) => void,
}

export const ABILITIES_FUNCTIONS: AbilitiesFunctions = {};

export function onDomLoadSetAbilitiesFunctions() {
    addShootAbility();
    addFireCircleAbility();
    addSwordAbility();
    addTowerAbility();
    addDeathCircleAbility();
    addLeshAbility();
    addHpRegenAbility();
    addMeleeAbility();
    addIceAbility();
    addSingleTargetAbility();
    addSnipeAbility();
    addSpeedBoostAbility();
    addAbilitySlowTrail();
    addAbilityFireLine();
    addAbilityExplode();
}

export function addAbilityToCharacter(character: Character, ability: Ability) {
    character.abilities.push(ability);
}

export function paintAbilityObjects(ctx: CanvasRenderingContext2D, abilityObjects: AbilityObject[], game: Game, paintOrder: PaintOrderAbility) {
    paintAbilityObjectsForFaction(ctx, abilityObjects, game, paintOrder, "player");
    paintAbilityObjectsForFaction(ctx, abilityObjects, game, paintOrder, "enemy");
}

export function abilityCharacterAddBossSkillPoint(state: GameState) {
    let playerCharacters: Character[] = getPlayerCharacters(state.players);
    for (let character of playerCharacters) {
        if (!character.isDead && !character.isPet) {
            for (let ability of character.abilities) {
                if (ability.bossSkillPoints !== undefined) {
                    ability.bossSkillPoints++;
                    if (character.upgradeChoice.length === 0) {
                        fillRandomUpgradeOptions(character, state.randomSeed, true);
                    }
                }
            }
        }
    }
}

export function createAbility(abilityName: string, idCounter: IdCounter, isLeveling: boolean = false, getsBossSkillPoints: boolean = false, playerInputBinding: string | undefined = undefined): Ability {
    const abilityFunctions = ABILITIES_FUNCTIONS[abilityName];
    const ability = abilityFunctions.createAbility(idCounter, playerInputBinding);

    if (isLeveling) {
        ability.leveling = { experience: 0, experienceForLevelUp: 10, level: 1 };
    }
    if (getsBossSkillPoints) {
        if (abilityFunctions.createAbilityBossUpgradeOptions) {
            ability.bossSkillPoints = 5;
        } else {
            console.log(`${abilityName} is missing bossUpgradeOptions`);
        }
    }
    return ability;
}

export function tickAbilityObjects(abilityObjects: AbilityObject[], game: Game) {
    takeTimeMeasure(game.debug, "", "tickAbilityObjects");
    for (let i = abilityObjects.length - 1; i >= 0; i--) {
        let abilityFunctions = ABILITIES_FUNCTIONS[abilityObjects[i].type];
        if (abilityFunctions.tickAbilityObject !== undefined) {
            abilityFunctions.tickAbilityObject(abilityObjects[i], game);
        } else {
            throw new Error("tickAbilityObject not defined for " + abilityObjects[i].type);
        }
        if (abilityFunctions.deleteAbilityObject !== undefined) {
            if (abilityFunctions.deleteAbilityObject(abilityObjects[i], game)) {
                abilityObjects.splice(i, 1);
            }
        } else {
            throw new Error("deleteAbilityObject not defined for " + abilityObjects[i].type);
        }
    }
    takeTimeMeasure(game.debug, "tickAbilityObjects", "");
}

export function levelingAbilityXpGain(ability: Ability, experience: number) {
    if (ability.leveling) {
        ability.leveling.experience += experience;
        while (ability.leveling.experience >= ability.leveling.experienceForLevelUp) {
            levelUp(ability);
        }
    }
}

export function findAbilityById(abilityId: number, game: Game): Ability | undefined {
    let ability: Ability | undefined = undefined;
    for (let i = 0; i < game.state.players.length; i++) {
        let playerCharacter = game.state.players[i].character;
        for (let ability of playerCharacter.abilities) {
            if (ability.id === abilityId) return ability;
        }
    }

    console.log("TODO?, not searching for abilityId in monsters and bosses yet");
    return ability;
}

export function paintDefaultAbilityStatsUI(ctx: CanvasRenderingContext2D, textLines: string[], drawStartX: number, drawStartY: number): { width: number, height: number } {
    const fontSize = 14;
    ctx.font = fontSize + "px Arial";
    let width = 0;
    for (let text of textLines) {
        let currentWidth = ctx.measureText(text).width + 4;
        if (currentWidth > width) width = currentWidth;
    }
    let height = textLines.length * fontSize + 6;
    ctx.fillStyle = "white";
    ctx.fillRect(drawStartX, drawStartY, width, height);
    ctx.fillStyle = "black";
    for (let i = 0; i < textLines.length; i++) {
        ctx.fillText(textLines[i], drawStartX + 2, drawStartY + fontSize * (i + 1) + 2);
    }
    return { width, height };
}

export function detectAbilityObjectToCharacterHit(map: GameMap, abilityObject: AbilityObject, players: Player[], bosses: BossEnemyCharacter[], game: Game) {
    let maxEnemySizeEstimate = 40;

    let characters = determineCharactersInDistance(abilityObject, map, players, bosses, abilityObject.size + maxEnemySizeEstimate);
    for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
        let c = characters[charIt];
        if (c.isDead || c.faction === abilityObject.faction) continue;
        let distance = calculateDistance(c, abilityObject);
        if (distance < abilityObject.size / 2 + c.width / 2) {
            characterTakeDamage(c, abilityObject.damage, game);
            let abilityFunction = ABILITIES_FUNCTIONS[abilityObject.type];
            if (abilityFunction.onHit) {
                abilityFunction.onHit(abilityObject);
                if (abilityFunction.canHitMore && !abilityFunction.canHitMore(abilityObject)) {
                    break;
                }
            }
        }
    }
}

export function detectSomethingToCharacterHit(
    map: GameMap,
    position: Position,
    size: number,
    faction: string,
    damage: number,
    players: Player[],
    bosses: BossEnemyCharacter[],
    onHitAndReturnIfContinue: ((target: Character) => boolean) | undefined,
    game: Game,
) {
    let maxEnemySizeEstimate = 40;

    let characters = determineCharactersInDistance(position, map, players, bosses, size + maxEnemySizeEstimate);
    for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
        let c = characters[charIt];
        if (c.isDead || c.faction === faction) continue;
        let distance = calculateDistance(c, position);
        if (distance < size / 2 + c.width / 2) {
            characterTakeDamage(c, damage, game);
            if (onHitAndReturnIfContinue) {
                let continueHitDetection = onHitAndReturnIfContinue(c);
                if (!continueHitDetection) break;
            }
        }
    }
}


export function paintUiForAbilities(ctx: CanvasRenderingContext2D, game: Game) {
    if (game.camera.characterId === undefined) return;
    let player = findPlayerByCharacterId(game.state.players, game.camera.characterId);
    if (!player) return;

    let size = 40;
    let startX = ctx.canvas.width / 2 - 20;
    let startY = ctx.canvas.height - size - 2;
    for (let ability of player.character.abilities) {
        let abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions?.paintAbilityUI !== undefined) {
            abilityFunctions.paintAbilityUI(ctx, ability, startX, startY, size, game);
            startX += size;
        }
    }
}

function paintAbilityObjectsForFaction(ctx: CanvasRenderingContext2D, abilityObjects: AbilityObject[], game: Game, paintOrder: PaintOrderAbility, faction: string) {
    for (let abilityObject of abilityObjects) {
        if (abilityObject.faction === faction) {
            let abilityFunctions = ABILITIES_FUNCTIONS[abilityObject.type];
            if (abilityFunctions?.paintAbilityObject !== undefined) {
                abilityFunctions.paintAbilityObject(ctx, abilityObject, paintOrder, game);
            } else {
                paintDefault(ctx, abilityObject, getCameraPosition(game), paintOrder);
            }
        }
    }
}

function paintDefault(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, cameraPosition: Position, paintOrder: PaintOrderAbility) {
    if (paintOrder === "afterCharacterPaint") {
        let centerX = ctx.canvas.width / 2;
        let centerY = ctx.canvas.height / 2;

        ctx.fillStyle = abilityObject.faction === "enemy" ? "black" : abilityObject.color;
        ctx.beginPath();
        ctx.arc(
            abilityObject.x - cameraPosition.x + centerX,
            abilityObject.y - cameraPosition.y + centerY,
            abilityObject.size / 2, 0, 2 * Math.PI
        );
        ctx.fill();
    }
}

function levelUp(ability: Ability) {
    if (ability.leveling) {
        ability.leveling.level++;
        ability.leveling.experience -= ability.leveling.experienceForLevelUp;
        ability.leveling.experienceForLevelUp += Math.floor(ability.leveling.level * 5);
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions.setAbilityToLevel) {
            abilityFunctions.setAbilityToLevel(ability, ability.leveling.level);
        } else {
            throw new Error("Ability missing function 'setAbilityToLevel' " + ability.name);
        }
    }
}

