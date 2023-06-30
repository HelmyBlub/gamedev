import { determineCharactersInDistance, characterTakeDamage } from "../character/character.js"
import { Character } from "../character/characterModel.js"
import { BossEnemyCharacter } from "../character/enemy/bossEnemy.js"
import { calculateDistance, getCameraPosition, takeTimeMeasure } from "../game.js"
import { Game, GameState, IdCounter, Position } from "../gameModel.js"
import { GameMap } from "../map/map.js"
import { findPlayerByCharacterId, findPlayerById, Player } from "../player.js"
import { addAbilityDeathCircle } from "./abilityDeathCircle.js"
import { addAbilityFireCircle } from "./abilityFireCircle.js"
import { addAbilityLesh } from "./abilityLeash.js"
import { addAbilityTower } from "./abilityTower.js"
import { addAbilityShoot } from "./abilityShoot.js"
import { addAbilitySword } from "./abilitySword.js"
import { addAbilityHpRegen } from "./abilityHpRegen.js"
import { addAbilityMelee } from "./abilityMelee.js"
import { addAbilityIceAura } from "./abilityIceAura.js"
import { addAbilitySingleTarget } from "./abilitySingleTarget.js"
import { addAbilitySnipe } from "./snipe/abilitySnipe.js"
import { addAbilitySpeedBoost } from "./speedBoost/abilitySpeedBoost.js"
import { addAbilitySlowTrail } from "./abilitySlowTrail.js"
import { addAbilityFireLine } from "./abilityFireLine.js"
import { AbilityUpgradesFunctions } from "./abilityUpgrade.js"
import { addAbilityExplode } from "./abilityExplode.js"
import { addAbilityFeedPet } from "./petTamer/abilityFeedPet.js"
import { addAbilityLovePet } from "./petTamer/abilityLovePet.js"

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
    isLeveling?: boolean,
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
    upgradeName?: string,
    probabilityFactor: number,
    upgrade: (ability: Ability) => void,
}

export const ABILITIES_FUNCTIONS: AbilitiesFunctions = {};

export function onDomLoadSetAbilitiesFunctions() {
    addAbilityShoot();
    addAbilityFireCircle();
    addAbilitySword();
    addAbilityTower();
    addAbilityDeathCircle();
    addAbilityLesh();
    addAbilityHpRegen();
    addAbilityMelee();
    addAbilityIceAura();
    addAbilitySingleTarget();
    addAbilitySnipe();
    addAbilitySpeedBoost();
    addAbilitySlowTrail();
    addAbilityFireLine();
    addAbilityExplode();
    addAbilityFeedPet();
    addAbilityLovePet();
}

export function addAbilityToCharacter(character: Character, ability: Ability) {
    character.abilities.push(ability);
}

export function paintAbilityObjects(ctx: CanvasRenderingContext2D, abilityObjects: AbilityObject[], game: Game, paintOrder: PaintOrderAbility) {
    paintAbilityObjectsForFaction(ctx, abilityObjects, game, paintOrder, "player");
    paintAbilityObjectsForFaction(ctx, abilityObjects, game, paintOrder, "enemy");
}

export function createAbility(abilityName: string, idCounter: IdCounter, isLeveling: boolean = false, getsBossSkillPoints: boolean = false, playerInputBinding: string | undefined = undefined): Ability {
    const abilityFunctions = ABILITIES_FUNCTIONS[abilityName];
    const ability = abilityFunctions.createAbility(idCounter, playerInputBinding);

    if (isLeveling) {
        ability.leveling = { experience: 0, experienceForLevelUp: 10, level: 1 };
    }
    if (getsBossSkillPoints) {
        if (abilityFunctions.createAbilityBossUpgradeOptions) {
            ability.bossSkillPoints = 0;
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

export function levelingAbilityXpGain(ability: Ability, experience: number, game: Game) {
    if (ability.leveling) {
        let owner = findAbilityOwnerByAbilityId(ability.id, game);
        if (!owner || owner.isDead || owner.isPet) return;
        ability.leveling.experience += experience;
        while (ability.leveling.experience >= ability.leveling.experienceForLevelUp) {
            levelUp(ability);
        }
    }
}

export function findAbilityOwnerByAbilityId(abilityId: number, game: Game): Character | undefined {
    for (let player of game.state.players) {
        let ability = player.character.abilities.find(a => a.id === abilityId);
        if (ability) return player.character;
        if (player.character.pets) {
            for (let pet of player.character.pets) {
                ability = pet.abilities.find(a => a.id === abilityId);
                if (ability) return pet;
            }
        }
    }
    return undefined;
}

export function findAbilityById(abilityId: number, game: Game): Ability | undefined {
    let ability: Ability | undefined = undefined;
    for (let i = 0; i < game.state.players.length; i++) {
        let playerCharacter = game.state.players[i].character;
        for (let ability of playerCharacter.abilities) {
            if (ability.id === abilityId) return ability;
        }
        if (playerCharacter.pets) {
            for (let pet of playerCharacter.pets) {
                for (let ability of pet.abilities) {
                    if (ability.id === abilityId) return ability;
                }        
            }
        }
    }
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
            characterTakeDamage(c, abilityObject.damage, game, abilityObject.abilityRefId);
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
    abilityRefId: number | undefined,
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
            characterTakeDamage(c, damage, game, abilityRefId);
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
        ability.leveling.experienceForLevelUp += ability.leveling.level * 5;
        if (ability.leveling.level > 100) {
            ability.leveling.experienceForLevelUp = Math.floor(ability.leveling.experienceForLevelUp * 1.01);
        }
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions.setAbilityToLevel) {
            abilityFunctions.setAbilityToLevel(ability, ability.leveling.level);
        } else {
            throw new Error("Ability missing function 'setAbilityToLevel' " + ability.name);
        }
    }
}

