/**
 * Deleting a trip wipes its expenses, clothes, outfits, checklist and bookings for good.
 * Trips that have a built-in guide (the real ones) must have their name typed to confirm;
 * a throw-away trip only needs one extra tap.
 */
export function needsTypedName(hasGuide: boolean): boolean {
  return hasGuide
}

export function deleteAllowed(name: string, typed: string, hasGuide: boolean): boolean {
  if (!needsTypedName(hasGuide)) return true
  return typed.trim() !== '' && typed.trim() === name.trim()
}
