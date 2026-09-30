const catalog = require('../rules/messages.zh-CN.json');
const policy = require('../rules/policy.json');

function hasMessage(id) {
  return Object.hasOwn(catalog.messages, id);
}

function message(id, parameters = {}) {
  if (!hasMessage(id)) throw new Error(`规则文案不存在: ${id}`);
  const context = {...policy, ...parameters};
  return catalog.messages[id].replace(/\{\{([\w.]+)\}\}/gu, (_, path) => {
    const value = path.split('.').reduce((current, key) =>
      current != null && Object.hasOwn(current, key) ? current[key] : undefined, context);
    if (value === undefined || value === null) throw new Error(`规则文案 ${id} 缺少参数 ${path}`);
    return Array.isArray(value) ? value.join('、') : String(value);
  });
}

function gitMessage(reason) {
  return Object.hasOwn(catalog.git, reason) ? catalog.git[reason] : undefined;
}

module.exports = {message, hasMessage, gitMessage};
