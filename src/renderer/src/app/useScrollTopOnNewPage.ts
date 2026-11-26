import { useLayoutEffect, useRef } from 'react'
import { NavigationType, useLocation, useNavigationType } from 'react-router'

/**
 * A new page starts at its top (D-057): the scroll of <main> no longer passes from one screen
 * to the next. Back and forward leave it alone, and so does a change of the query string only
 * (filters, the page of the guide). Returns the ref to put on the scrolling element.
 */
export function useScrollTopOnNewPage<T extends HTMLElement>() {
  const scroller = useRef<T>(null)
  const { pathname } = useLocation()
  const navigationType = useNavigationType()
  const shown = useRef(pathname)
  useLayoutEffect(() => {
    if (shown.current === pathname) return
    shown.current = pathname
    const element = scroller.current
    if (navigationType !== NavigationType.Pop && element) element.scrollTop = 0
  }, [pathname, navigationType])
  return scroller
}
