/** Shared shapes for the stretch and nerve-glide guides. */
export type GuideMode = 'explore' | 'stretch' | 'glide'
export type GuideKind = Exclude<GuideMode, 'explore'>
export type GroupView = 'front' | 'back' | 'side'

export interface GroupDef {
  id: string
  /** Short label used on chips and in result lists. */
  name: string
  /** Body area the group is filed under in the picker. */
  area: string
  /** Side of the body the camera should face to show the group. */
  view: GroupView
  /** Tested against the lower-cased catalogue display name. */
  match?: RegExp
  /** Take every structure in this catalogue region (used for the spinal cord). */
  region?: string
}

export interface Group extends GroupDef {
  /** Catalogue mesh names, both sides. */
  meshes: string[]
  /** Unique member names with the Left/Right prefix removed. */
  members: string[]
}

export type ExerciseType = 'static' | 'dynamic' | 'slider' | 'tensioner' | 'sequence'
export type Position = 'standing' | 'seated' | 'kneeling' | 'floor' | 'lying'

export interface Exercise {
  id: string
  name: string
  type: ExerciseType
  position: Position
  /** Empty when nothing is needed. */
  equipment: string[]
  /** Group ids that the movement is aimed at. */
  primary: string[]
  /** Group ids that are also lengthened or moved. */
  secondary: string[]
  steps: string[]
  /** Where the pull should be felt. */
  feel: string
  dose: string
  tip?: string
  caution?: string
  /** Key into `references` when a public page describes this exact movement. */
  ref?: string
}

export interface Reference {
  id: string
  label: string
  url: string
}
