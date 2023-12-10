export const nodeOps = {
  // createElement 不同的平台创建的不同

  createElement: (tagName) => document.createElement(tagName),

  remove: (child) => {
    const parent = child.parentNode;
    if (parent) {
      parent.removeChild(child);
    }
  },

  insert: (child, parent, anchor = null) => {
    parent.insertBefore(child, anchor);
  },

  querySelector: (selector) => document.querySelector(selector),

  setElementText: (el, text) => (el.textContent = text),
  //   文本

  createText: (text) => document.createTextNode(text),
  setText: (node, text) => (node.nodeValue = text),
};
