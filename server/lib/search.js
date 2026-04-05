// Lightweight TF-IDF vector search over dataset metadata
function tokenize(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(t => t.length > 2);
}

function buildIndex(datasets) {
  const docs = datasets.map(d => ({
    id: d.id,
    tokens: tokenize([d.id, d.title, d.organism, d.type, d.author, d.relevance, ...(d.tags||[])].join(' ')),
    ref: d
  }));
  const df = new Map();
  for (const doc of docs) {
    const unique = new Set(doc.tokens);
    for (const t of unique) df.set(t, (df.get(t) || 0) + 1);
  }
  const N = docs.length;
  const idf = new Map();
  for (const [term, count] of df) idf.set(term, Math.log(1 + N / count));
  return { docs, idf, N };
}

function score(index, query) {
  const qTokens = tokenize(query);
  if (!qTokens.length) return [];
  const qWeights = new Map();
  for (const t of qTokens) qWeights.set(t, (qWeights.get(t) || 0) + (index.idf.get(t) || 0));

  const results = [];
  for (const doc of index.docs) {
    const tf = new Map();
    for (const t of doc.tokens) tf.set(t, (tf.get(t) || 0) + 1);
    let s = 0;
    for (const [t, qw] of qWeights) {
      const docTf = tf.get(t) || 0;
      if (docTf) s += qw * (docTf / doc.tokens.length) * (index.idf.get(t) || 0);
    }
    if (s > 0) results.push({ score: s, dataset: doc.ref });
  }
  return results.sort((a, b) => b.score - a.score);
}

module.exports = { buildIndex, score };
