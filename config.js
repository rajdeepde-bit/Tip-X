// Wait for SystemJS to be available
if (typeof SystemJS === 'undefined') {
  var script = document.currentScript;
  if (script && script.src) {
    // Wait for SystemJS to load
    var checkSystemJS = setInterval(() => {
      if (typeof SystemJS !== 'undefined') {
        clearInterval(checkSystemJS);
        initSystemJS();
      }
    }, 10);
    setTimeout(() => clearInterval(checkSystemJS), 5000); // Timeout after 5 seconds
  }
} else {
  initSystemJS();
}

function initSystemJS() {
  SystemJS.config({
    defaultExtension: true,
    packages: {
      '.': {
        main: './app.js',
        defaultExtension: 'js'
      }
    },
    meta: {
      '*.js': {
        babelOptions: {
          react: true
        }
      },
      'https://unpkg.com/react@18.3.1/umd/react.development.js': {
        format: 'global',
        exports: 'React'
      },
      'https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js': {
        format: 'global',
        exports: 'ReactDOM'
      }
    },
    map: {
      'plugin-babel': 'https://unpkg.com/systemjs-plugin-babel@latest/plugin-babel.js',
      'systemjs-babel-build': 'https://unpkg.com/systemjs-plugin-babel@latest/systemjs-babel-browser.js',
      'react': 'https://unpkg.com/react@18.3.1/umd/react.development.js',
      'react-dom': 'https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js'
    },
    transpiler: 'plugin-babel'
  });

  SystemJS.import('./app.js').then(() => {
    console.log('TipX app loaded successfully');
  }).catch(err => {
    console.error('Failed to load TipX app:', err);
    document.getElementById('root').innerHTML = '<div style="padding: 20px; color: red; font-family: monospace;"><strong>Error loading app:</strong><br>' + err.message + '</div>';
  });
}
