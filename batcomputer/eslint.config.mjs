import eslint from '@electron-toolkit/eslint-config'
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'

export default [
  { ignores: ['**/node_modules', '**/dist', '**/out'] },
  eslint,
  {
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ]
    }
  },
  {
    files: ['src/renderer/public/**/*.{js,jsx}'],
    rules: {
      'no-unused-vars': 'off'
    },
    languageOptions: {
      globals: {
        BatOS: 'readonly',
        BatApps: 'readonly',
        BatMap: 'readonly',
        BatTheme: 'readonly',
        createWindow: 'readonly',
        showNotification: 'readonly',
        showAlert: 'readonly',
        closeAlert: 'readonly',
        appendOutput: 'readonly',
        escapeHtml: 'readonly',
        focusWindow: 'readonly',
        minimizeWindow: 'readonly',
        maximizeWindow: 'readonly',
        closeWindow: 'readonly',
        proceedAfterLogin: 'readonly',
        runBoot: 'readonly',
        initLogin: 'readonly',
        enterFullscreen: 'readonly',
        syncDesktopIcons: 'readonly',
        THREE: 'readonly',
        L: 'readonly',
        weaponGalleryState: 'writable',
        ResizeObserver: 'readonly'
      }
    }
  },
  eslintConfigPrettier
]
