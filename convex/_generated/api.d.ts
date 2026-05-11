/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as images from "../images.js";
import type * as inventory from "../inventory.js";
import type * as migrateToProductName from "../migrateToProductName.js";
import type * as orders from "../orders.js";
import type * as registries from "../registries.js";
import type * as settings from "../settings.js";
import type * as showroom from "../showroom.js";
import type * as stainTypes from "../stainTypes.js";
import type * as stripe from "../stripe.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  images: typeof images;
  inventory: typeof inventory;
  migrateToProductName: typeof migrateToProductName;
  orders: typeof orders;
  registries: typeof registries;
  settings: typeof settings;
  showroom: typeof showroom;
  stainTypes: typeof stainTypes;
  stripe: typeof stripe;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
