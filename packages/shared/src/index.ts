export const isObject = (value) => value !== null && typeof value === "object";

export const extend = Object.assign;

export const isArray = Array.isArray;

export const isFunction = (value) => typeof value === "function";
export const isString = (value) => typeof value === "string";
export const isNumber = (value) => typeof value === "number";

export const isIntegerKey = (value) => parseInt(value) + "" === value;

let hasOwnProperty = Object.prototype.hasOwnProperty;

export const hasOwn = (target, key) => hasOwnProperty.call(target, key);

export const hasChanged = (oldValue, newValue) => oldValue !== newValue;
