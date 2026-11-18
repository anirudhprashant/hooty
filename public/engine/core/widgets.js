// The 129 simulations in explorables.js are the heaviest file in the engine (293 KB, 92 KB over the wire) and only 41% of
// chapters ever show one, so it is fetched when a lesson actually needs it instead of on every page. app.js preloads it
// as soon as a lesson that contains a simulation opens, so the file has arrived long before a child reaches that card.
let loaded = null;
let pending = null;

export const widgetsLoaded = () => !!loaded;

export function loadWidgets() {
  if (loaded) return Promise.resolve(loaded);
  if (!pending) {
    pending = import('./explorables.js')
      .then((m) => { loaded = m; return m; })
      .catch((e) => { pending = null; throw e; });
  }
  return pending;
}

export const widgets = () => loaded;
