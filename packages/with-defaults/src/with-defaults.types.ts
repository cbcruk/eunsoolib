import type { ComponentPropsWithRef, ElementType } from 'react'

/** Keys of `D` whose default value fits the matching prop of `P`. */
type DefaultedKeys<P, D> = {
  [K in keyof D & keyof P]: Exclude<D[K], undefined> extends P[K] ? K : never
}[keyof D & keyof P]

/** Every key that appears in at least one member of the union `P`. */
type KeysOfUnion<P> = P extends unknown ? keyof P : never

/**
 * Turns every prop that a default was provided for into an optional prop at the
 * call site, while leaving the rest of the component's props untouched.
 *
 * The transform distributes over union props, so each member of a
 * discriminated union keeps its own shape. A key only becomes optional in the
 * members its default value fits: with `{ variant: 'link' }` as defaults,
 * `variant` is optional for the `'link'` member and stays required for the
 * others, so the caller must pass it to pick a different member.
 *
 * @template P - Props of the wrapped component
 * @template D - Type of the defaults object
 *
 * @example
 * ```ts
 * import type { WithDefaults } from '@cbcruk/with-defaults'
 *
 * type ButtonProps = { styleType: 'primary' | 'danger'; label: string }
 *
 * // { label: string; styleType?: 'primary' | 'danger' }
 * type PresetProps = WithDefaults<ButtonProps, { styleType: 'primary' }>
 * ```
 */
export type WithDefaults<P, D> = P extends unknown
  ? Omit<P, DefaultedKeys<P, D>> & Partial<Pick<P, DefaultedKeys<P, D>>>
  : never

/** Default props accepted for component `C`: any subset of its props, including `ref`. */
export type Defaults<C extends ElementType> = Partial<ComponentPropsWithRef<C>>

/**
 * Maps every key of `D` that is not a prop of component `C` to `never`, so
 * passing it is a type error even when `D` is not a fresh object literal.
 *
 * `data-*` keys are allowed because React forwards them to host elements
 * without declaring them in the props type.
 *
 * @template C - Component or tag name being wrapped
 * @template D - Type of the defaults object
 */
export type NoExtraDefaults<C extends ElementType, D> = {
  [K in Exclude<
    keyof D,
    KeysOfUnion<ComponentPropsWithRef<C>> | `data-${string}`
  >]: never
}
