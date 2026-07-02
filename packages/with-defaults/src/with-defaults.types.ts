import type { ComponentPropsWithRef, ElementType } from 'react'

/**
 * Turns every prop that a default was provided for into an optional prop at the
 * call site, while leaving the rest of the component's props untouched.
 */
export type WithDefaults<P, D> = Omit<P, keyof D> &
  Partial<Pick<P, Extract<keyof D, keyof P>>>

export type Defaults<C extends ElementType> = Partial<ComponentPropsWithRef<C>>
