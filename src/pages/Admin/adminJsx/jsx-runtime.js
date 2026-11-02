import { Fragment, jsx as baseJsx, jsxs as baseJsxs } from "react/jsx-runtime";
import { transformProps } from "./transform.js";

export { Fragment };
export const jsx = (type, props, key) => baseJsx(type, transformProps(type, props), key);
export const jsxs = (type, props, key) => baseJsxs(type, transformProps(type, props), key);
