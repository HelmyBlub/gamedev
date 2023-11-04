import { Debuff } from "./debuff.js";

export const BUFF_NAME_BALL_PHYSICS = "Ball Physics";
export type BuffBallPhysics = Debuff & {
    abilityRefId: number,
}

export function createBuffBallPhysics(
    abilityRefId: number,
): BuffBallPhysics {
    return {
        name: BUFF_NAME_BALL_PHYSICS,
        abilityRefId: abilityRefId,
    };
}
