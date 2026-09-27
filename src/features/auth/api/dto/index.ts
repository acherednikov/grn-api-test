export enum InstanceState {
  NotAuthorized = 'notAuthorized',
  Authorized = 'authorized',
  Blocked = 'blocked',
  Starting = 'starting',
  Suspended = 'suspended',
  PendingPassword = 'pendingPassword',
}

export type InstanceStateResponse = {
  stateInstance: InstanceState;
}