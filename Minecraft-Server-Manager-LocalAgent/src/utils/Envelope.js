import crypto from "crypto";

export default class Envelope {
  static create(type, payload, requestId = null, agentId = null) {
    return {
      requestId: requestId || crypto.randomUUID(),
      agentId,
      type,
      payload,
      timestamp: Date.now(),
    };
  }
}
