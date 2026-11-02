import { iconize, stripEmoji } from "./emojiIcons.jsx";

// Bu teglar ichida faqat matn bo'lishi mumkin
const TEXT_ONLY = new Set(["option", "title", "textarea", "style", "script"]);

const mapChild = (child) => {
  if (typeof child === "string") return iconize(child);
  return Array.isArray(child) ? child.map(mapChild) : child;
};

export function transformProps(type, props) {
  if (!props || TEXT_ONLY.has(type)) return props;
  // Holat belgisida emoji o'zi qoladi
  if (typeof props.className === "string" && /\border-status\b/.test(props.className)) return props;
  const next = { ...props };
  if (typeof next.placeholder === "string") next.placeholder = stripEmoji(next.placeholder);
  if ("children" in next) next.children = mapChild(next.children);
  return next;
}
