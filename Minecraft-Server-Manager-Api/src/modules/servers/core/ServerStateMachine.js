export const ServerStates = {
  OFFLINE: "OFFLINE",
  STARTING: "STARTING",
  ONLINE: "ONLINE",
  STOPPING: "STOPPING",
  CRASHED: "CRASHED",
  FAILED: "FAILED",
};

const validTransitions = {
  [ServerStates.OFFLINE]: [ServerStates.STARTING, ServerStates.OFFLINE],
  [ServerStates.STARTING]: [
    ServerStates.ONLINE,
    ServerStates.FAILED,
    ServerStates.OFFLINE,
  ],
  [ServerStates.ONLINE]: [
    ServerStates.STOPPING,
    ServerStates.CRASHED,
    ServerStates.OFFLINE,
  ],
  [ServerStates.STOPPING]: [ServerStates.OFFLINE, ServerStates.CRASHED],
  [ServerStates.CRASHED]: [ServerStates.STARTING, ServerStates.OFFLINE],
  [ServerStates.FAILED]: [ServerStates.STARTING, ServerStates.OFFLINE],
};

export default class ServerStateMachine {
  static canTransition(currentState, nextState) {
    if (currentState === nextState) return true;
    const allowed = validTransitions[currentState];
    return allowed ? allowed.includes(nextState) : false;
  }

  static assertValidTransition(currentState, nextState) {
    if (!this.canTransition(currentState, nextState)) {
      throw new Error(
        `Invalid state transition from ${currentState} to ${nextState}`,
      );
    }
  }
}
