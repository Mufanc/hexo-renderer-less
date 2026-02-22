'use strict';

const less = require('less');
const { basename, dirname, join } = require('path');
const micromatch = require('micromatch');

function getProperty(obj, name) {
  name = name.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '');

  const split = name.split('.');
  let key = split.shift();

  if (!Object.prototype.hasOwnProperty.call(obj, key)) return '';

  let result = obj[key];
  const len = split.length;

  if (!len) {
    if (result === 0) return result;
    return result || '';
  }
  if (typeof result !== 'object') return '';

  for (let i = 0; i < len; i++) {
    key = split[i];
    if (!Object.prototype.hasOwnProperty.call(result, key)) return '';

    result = result[split[i]];
    if (typeof result !== 'object') return result;
  }

  return result;
}

async function lessFn(data) {
  const { route, theme } = this;
  const self = this;

  theme.config.less = Object.assign({
    paths: [],
    options: {}
  }, theme.config.less);

  const config = theme.config.less;
  const { options, paths: pathsCfg } = config;
  const cwd = process.cwd();
  const routeList = route.list();
  const tmpPaths = typeof pathsCfg === 'string' ? [pathsCfg] : pathsCfg;

  const paths = tmpPaths.filter(path => !micromatch.scan(path).isGlob)
    .map(path => join(cwd, path)); // assuming paths are relative from the root of the project;
  const match = micromatch(routeList, config.paths).map(path => join(cwd, dirname(path)));
  paths.push(...match, dirname(data.path));

  const hexoConfigPlugin = {
    install(less) {
      less.functions.functionRegistry.add('hexo-config', (name) => { 
        const value = getProperty(self.theme.config, name.value);
        return new less.tree.Anonymous(value);
      });
    }
  };

  const result = await less.render(data.text, {
    paths,
    filename: basename(data.path),
    plugins: [hexoConfigPlugin],
    ...options
  });

  return result.css;
}

lessFn.disableNunjucks = true;

module.exports = lessFn;
