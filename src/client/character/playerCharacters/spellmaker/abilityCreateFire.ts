import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, paintAbilityUiDefault } from "../../../ability/ability.js";
import { createAbilityObjectFireLine } from "../../../ability/abilityFireLine.js";
import { IMAGE_NAME_SWITCH } from "../../../ability/musician/abilityMusicSheetChangeInstrument.js";
import { autoSendMousePositionHandler, calculateDistance, findClientInfoByCharacterId, getNextId } from "../../../game.js";
import { ClientInfo, Game, IdCounter, Position } from "../../../gameModel.js";

export type AbilityCreateFire = Ability & {
    tickInterval: number,
    duration: number,
    width: number,
    startPosition?: Position,
}

export const ABILITY_NAME_CREATE_FIRE = "Create Fire";

export function addAbilityCreateFire() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_CREATE_FIRE] = {
        activeAbilityCast: castAbility,
        createAbility: createAbility,
        paintAbilityUI: paintAbilityUI,
        setAbilityToLevel: setAbilityToLevel,
        setAbilityToBossLevel: setAbilityToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        tickAbility: tickAbility,
    };
}

function createAbility(
    idCounter: IdCounter,
    playerInputBinding?: string,
): AbilityCreateFire {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_CREATE_FIRE,
        playerInputBinding: playerInputBinding,
        passive: true,
        upgrades: {},
        tradable: true,
        tickInterval: 250,
        duration: 5000,
        width: 10,
    };
}

function tickAbility(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityCreateFire = ability as AbilityCreateFire;
    const clientInfo: ClientInfo | undefined = findClientInfoByCharacterId(abilityOwner.id, game);
    if (clientInfo) {
        if (abilityCreateFire.startPosition) {
            const distance = calculateDistance(abilityCreateFire.startPosition, clientInfo.lastMousePosition);
            if (distance > 20) {
                const damage = abilityCreateFire.level!.level * 100;
                const fireLine = createAbilityObjectFireLine(abilityOwner.faction, abilityCreateFire.startPosition!, clientInfo.lastMousePosition, damage, abilityCreateFire.width, abilityCreateFire.duration, abilityCreateFire.tickInterval, "red", ability.id, game);
                game.state.abilityObjects.push(fireLine);
                abilityCreateFire.startPosition.x = clientInfo.lastMousePosition.x;
                abilityCreateFire.startPosition.y = clientInfo.lastMousePosition.y;
            }
        }
    }
}

function paintAbilityUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    paintAbilityUiDefault(ctx, ability, drawStartX, drawStartY, size, game, IMAGE_NAME_SWITCH);
}

function castAbility(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, castPositionRelativeToCharacter: Position | undefined, isKeydown: boolean, game: Game) {
    if (!abilityOwner.abilities) return;
    const abilityCreateFire: AbilityCreateFire | undefined = abilityOwner.abilities.find(a => a.name === ABILITY_NAME_CREATE_FIRE) as AbilityCreateFire;
    if (!abilityCreateFire) return;
    if (isKeydown) {
        if (!abilityCreateFire.startPosition) abilityCreateFire.startPosition = castPosition;
        autoSendMousePositionHandler(abilityOwner.id, `${abilityCreateFire.name}`, true, castPosition, game);
    } else {
        autoSendMousePositionHandler(abilityOwner.id, `${abilityCreateFire.name}`, false, castPosition, game);
        const damage = abilityCreateFire.level!.level * 100;
        const fireLine = createAbilityObjectFireLine(abilityOwner.faction, abilityCreateFire.startPosition!, castPosition, damage, abilityCreateFire.width, abilityCreateFire.duration, abilityCreateFire.tickInterval, "red", ability.id, game);
        game.state.abilityObjects.push(fireLine);
        abilityCreateFire.startPosition = undefined;
    }
}


function setAbilityToLevel(ability: Ability, level: number) {
    const abilityCreateFire = ability as AbilityCreateFire;
}

function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const abilityCreateFire = ability as AbilityCreateFire;
}

function setAbilityToBossLevel(ability: Ability, level: number) {
    const abilityCreateFire = ability as AbilityCreateFire;
}