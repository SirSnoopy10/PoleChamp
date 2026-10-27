const path = require('node:path');

// @babel/core z zależności babel-preset-expo (node-linker isolated – brak w apps/mobile).
const babel = require(
  require.resolve('@babel/core', { paths: [path.dirname(require.resolve('babel-preset-expo'))] }),
);

const transform = (env) => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = env;
  try {
    return babel.transformSync("console.log('a'); console.debug('b'); console.error('c');", {
      configFile: path.join(__dirname, '../../babel.config.js'),
      filename: path.join(__dirname, 'example.js'),
      babelrc: false,
    }).code;
  } finally {
    process.env.NODE_ENV = previous;
  }
};

describe('babel – produkcja bez logów debug (IMP-402)', () => {
  it('TC-SEC-018: build produkcyjny usuwa console.* poza console.error', () => {
    const code = transform('production');
    expect(code).not.toMatch(/console\.(log|debug)/);
    expect(code).toContain("console.error('c')");
  });

  it('w trybie deweloperskim logi zostają', () => {
    expect(transform('development')).toContain("console.log('a')");
  });
});
