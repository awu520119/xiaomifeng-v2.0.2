import manifest from '../../prototype-pages.json';
import PrototypeExportPage from './PrototypeExportPage';

const componentById = Object.fromEntries(
  manifest.pages.map(({ id }) => [id, PrototypeExportPage]),
) as Record<string, typeof PrototypeExportPage>;

export const prototypePageRegistry = manifest.pages.map((page) => ({
  ...page,
  route: page.hash.split('?')[0].slice(page.hash.split('?')[0].lastIndexOf('/') + 1),
  component: componentById[page.id],
}));

export function findPrototypePage(pathname: string) {
  const prefix = '/demo/export/';
  if (!pathname.startsWith(prefix)) return undefined;
  const route = pathname.slice(prefix.length);
  return prototypePageRegistry.find((page) => page.route === route)
    ?? (['mini-product', 'mini-mine'].includes(route) ? { route, component: PrototypeExportPage } : undefined);
}
