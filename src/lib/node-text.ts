import { Children, isValidElement, type ReactNode } from 'react';

/**
 * The visible text of a React tree, for structured data.
 *
 * Lets a block of copy be authored once as JSX - with links and emphasis - and
 * still be handed to schema.org as the plain string it requires, instead of
 * being maintained twice and allowed to drift. Runs at build time on static
 * pages, over trees the caller authors by hand.
 *
 * It walks `props.children`, which is readable on any element, so text inside
 * a component the caller wrote out - <Link>Safety page</Link> - is picked up.
 * What it cannot see is text a component generates internally from its own
 * props or data; nothing is rendered here. Author answers as markup and
 * children, not as components that hide their copy.
 */
export function nodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);

  if (Array.isArray(node)) return node.map(nodeText).join('');

  if (isValidElement<{ children?: ReactNode }>(node)) {
    // Block-level children run into the next one without a separator.
    const separator = node.type === 'li' || node.type === 'p' ? ' ' : '';
    return Children.toArray(node.props.children).map(nodeText).join('') + separator;
  }

  return '';
}

/** `nodeText` with runs of whitespace collapsed, as a schema.org value wants. */
export function nodeTextCompact(node: ReactNode): string {
  return nodeText(node).replace(/\s+/g, ' ').trim();
}
