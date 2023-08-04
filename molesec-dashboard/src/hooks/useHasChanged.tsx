import { usePrevious } from "react-use";

export function useHasChanged<T>(
  value: T,
  didUpdate = (prev: T | undefined, curr: T) => prev !== curr
) {
  const previous = usePrevious<T>(value);

  return didUpdate(previous, value);
}
