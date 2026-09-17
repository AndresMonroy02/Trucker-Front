/**
 * The name and the mark, in one place.
 *
 * Neither is settled yet, so changing them has to be one edit: rename below, or
 * drop a new PNG over `src/assets/logo.png`. Nothing else in the app spells the
 * name out or points at the image.
 *
 * The backend has the same single point in `app/core/branding.py`, for the
 * documents it renders. `logo-wordmark.png` beside this one is the version with
 * the name in it, which is what that copy is made from -- replace both when the
 * mark changes.
 */
import logo from "./assets/logo.png";

export const BRAND_NAME = "Trucker";
export const BRAND_LOGO = logo;
