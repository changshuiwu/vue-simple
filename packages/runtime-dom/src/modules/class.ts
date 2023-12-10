export const patchClass = (el, nextValue) => {
  if (nextValue == null) {
    nextValue = "";
  }
  el.className = nextValue;
};
