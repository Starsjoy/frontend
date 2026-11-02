import { Fragment, jsxDEV as baseJsxDEV } from "react/jsx-dev-runtime";
import { transformProps } from "./transform.js";

export { Fragment };
export const jsxDEV = (type, props, key, isStatic, source, self) =>
  baseJsxDEV(type, transformProps(type, props), key, isStatic, source, self);
