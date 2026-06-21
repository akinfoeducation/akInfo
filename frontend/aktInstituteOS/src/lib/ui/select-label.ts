/**
 * Formatter for base-ui <SelectValue>. Without a children formatter, base-ui
 * renders the raw selected value (e.g. an id, or a sentinel like "__none")
 * instead of the item's label. Use as:
 *   <SelectValue placeholder="...">{selectLabel(list, x => x.name, "...")}</SelectValue>
 *
 * `extras` maps non-id sentinel values (e.g. { "__all": "All courses" }) to their
 * label so those render correctly too.
 */
export function selectLabel<T extends { id: number }>(
  list: T[],
  getLabel: (item: T) => string,
  placeholder: string,
  extras?: Record<string, string>,
): (value: string | null) => string {
  return (value) => {
    if (!value) return placeholder;
    if (extras && value in extras) return extras[value];
    const found = list.find((i) => String(i.id) === value);
    return found ? getLabel(found) : value;
  };
}
