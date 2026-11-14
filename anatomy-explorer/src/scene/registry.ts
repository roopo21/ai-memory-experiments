import type { Object3D } from 'three'

/** meshName -> object for the currently displayed model. Lets the camera rig find organs by name. */
export const meshRegistry = new Map<string, Object3D>()
