import { unpack } from './analytics.mjs';
const cache = new Map();
export function loadData(id) {
  if (!cache.has(id)) {
    cache.set(id, fetch(`/data/${id}.json`).then(response => {
      if (!response.ok) throw new Error(`The project data could not be loaded (${response.status}).`);
      return response.json();
    }).then(data => ({ ...data, rows: unpack(data), accounts: data.accounts ? unpack(data.accounts) : null })).catch(error => { cache.delete(id); throw error; }));
  }
  return cache.get(id);
}
