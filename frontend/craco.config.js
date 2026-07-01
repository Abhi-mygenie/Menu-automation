// craco.config.js
const path = require("path");
require("dotenv").config();

// Check if we're in development/preview mode (not production build)
// Craco sets NODE_ENV=development for start, NODE_ENV=production for build
const isDevServer = process.env.NODE_ENV !== "production";

// Environment variable overrides
const config = {
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true",
};

// Conditionally load health check modules only if enabled
let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
  setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
  healthPluginInstance = new WebpackHealthPlugin();
}

let webpackConfig = {
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {

      // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
        ],
      };

      // Add health check plugin to webpack if enabled
      if (config.enableHealthCheck && healthPluginInstance) {
        webpackConfig.plugins.push(healthPluginInstance);
      }
      return webpackConfig;
    },
  },
};

// Fix: react-scripts uses APIs removed in webpack-dev-server v5
// 1. onBefore/AfterSetupMiddleware -> setupMiddlewares
// 2. https -> server
const fixDevServerCompat = (devServerConfig) => {
  // Fix onBefore/AfterSetupMiddleware
  const onBefore = devServerConfig.onBeforeSetupMiddleware;
  const onAfter = devServerConfig.onAfterSetupMiddleware;
  if (onBefore || onAfter) {
    delete devServerConfig.onBeforeSetupMiddleware;
    delete devServerConfig.onAfterSetupMiddleware;
    const origSetup = devServerConfig.setupMiddlewares;
    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      if (onBefore) onBefore(devServer);
      if (origSetup) middlewares = origSetup(middlewares, devServer);
      if (onAfter) onAfter(devServer);
      return middlewares;
    };
  }
  // Fix https option (removed in v5, replaced by server.type)
  if ('https' in devServerConfig) {
    const httpsVal = devServerConfig.https;
    delete devServerConfig.https;
    if (httpsVal && httpsVal !== false) {
      devServerConfig.server = { type: 'https', options: typeof httpsVal === 'object' ? httpsVal : {} };
    }
  }
  return devServerConfig;
};

if (config.enableHealthCheck) {
  webpackConfig.devServer = (devServerConfig) => {
    devServerConfig = fixDevServerCompat(devServerConfig);
    const originalSetupMiddlewares = devServerConfig.setupMiddlewares;

    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      if (originalSetupMiddlewares) {
        middlewares = originalSetupMiddlewares(middlewares, devServer);
      }
      setupHealthEndpoints(devServer, healthPluginInstance);
      return middlewares;
    };

    return devServerConfig;
  };
} else {
  webpackConfig.devServer = (devServerConfig) => {
    return fixDevServerCompat(devServerConfig);
  };
}

// Wrap with visual edits (automatically adds babel plugin, dev server, and overlay in dev mode)
if (isDevServer) {
  try {
    const { withVisualEdits } = require("@emergentbase/visual-edits/craco");
    webpackConfig = withVisualEdits(webpackConfig);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND' && err.message.includes('@emergentbase/visual-edits/craco')) {
      console.warn(
        "[visual-edits] @emergentbase/visual-edits not installed — visual editing disabled."
      );
    } else {
      throw err;
    }
  }
}

module.exports = webpackConfig;
