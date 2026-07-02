import type { ComponentPropsWithRef, ElementType } from 'react'
import type { Defaults, WithDefaults } from './with-defaults.types'

/**
 * Wraps a component with preset default props. Props that receive a default
 * become optional at the call site; anything passed by the caller overrides the
 * default.
 *
 * `ref` is forwarded as an ordinary prop (React 19), so no `forwardRef` wrapper
 * is needed — it flows through `props` like any other.
 *
 * @example
 * const Body2Gray = withDefaults(Text, { type: 'body2_600', color: 'gray' }, 'Body2Gray')
 * <Body2Gray>{name}</Body2Gray>
 */
export function withDefaults<C extends ElementType, D extends Defaults<C>>(
  Component: C,
  defaults: D,
  displayName?: string,
) {
  type P = ComponentPropsWithRef<C>

  function Wrapped(props: WithDefaults<P, D>) {
    const Comp = Component as ElementType

    return <Comp {...defaults} {...props} />
  }

  Wrapped.displayName =
    displayName ??
    `withDefaults(${
      typeof Component === 'string'
        ? Component
        : ((Component as { displayName?: string; name?: string }).displayName ??
          (Component as { name?: string }).name ??
          'Component')
    })`

  return Wrapped
}
