import eslint from '@eslint/js';
import vuePlugin from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';
import {fileURLToPath} from 'node:url';

const DIRNAME = fileURLToPath(new URL('.', import.meta.url));

export default tseslint.config(
    {ignores: ['**/dist/**', '**/node_modules/**']},

    // --- Base JS + TS ---
    eslint.configs.recommended,
    tseslint.configs.recommendedTypeChecked,

    // --- TS / JS files ---
    {
        files: ['**/*.{ts,tsx,js,mjs,cjs}'],
        languageOptions: {
            parserOptions: {
                projectService: {
                    allowDefaultProject: ["*.mjs"]
                },
                tsconfigRootDir: DIRNAME
            }
        },
        rules: {
            // TS tweaks
            '@typescript-eslint/consistent-type-imports': [
                'warn',
                {prefer: 'type-imports', fixStyle: 'inline-type-imports'}
            ],
            '@typescript-eslint/no-unused-vars': ['warn', {argsIgnorePattern: '^_'}],
            '@typescript-eslint/require-await': 'off'
        }
    },

    // --- Vue SFC files ---
    {
        files: ['**/*.vue'],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tseslint.parser,
                projectService: true,
                tsconfigRootDir: DIRNAME,
                extraFileExtensions: ['.vue']
            }
        },
        plugins: {
            vue: vuePlugin
        },
        rules: {
            ...vuePlugin.configs['vue3-recommended'].rules,

            // Vue style tweaks
            'vue/html-self-closing': [
                'warn',
                {
                    html: {void: 'always', normal: 'never', component: 'always'}
                }
            ],
            'vue/attributes-order': 'warn',
            'vue/component-name-in-template-casing': ['warn', 'PascalCase']
        }
    }
);
