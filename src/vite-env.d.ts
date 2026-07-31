declare module '*.css' {
	const classes: Record<string, string>
	export default classes
}

declare module 'react-dom/client' {
	export function createRoot(
		container: Element | DocumentFragment,
	): {
		render(node: unknown): void
	}
}

declare namespace JSX {
	interface IntrinsicElements {
		[elementName: string]: unknown
	}
}
