// Browser-only Monaco setup. Workers are imported via Vite's `?worker` suffix so
// they're bundled and served same-origin — required under our strict CSP
// (script-src 'self'); a CDN/AMD loader would be blocked.
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

self.MonacoEnvironment = {
	getWorker(_: unknown, label: string) {
		if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
		if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
		if (label === 'json') return new jsonWorker();
		if (label === 'typescript' || label === 'javascript') return new tsWorker();
		return new editorWorker();
	}
};

export function languageForPath(path: string): string {
	const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
	switch (ext) {
		case 'html':
			return 'html';
		case 'css':
			return 'css';
		case 'js':
			return 'javascript';
		case 'json':
			return 'json';
		case 'svg':
			return 'xml';
		case 'md':
			return 'markdown';
		default:
			return 'plaintext';
	}
}

export { monaco };
