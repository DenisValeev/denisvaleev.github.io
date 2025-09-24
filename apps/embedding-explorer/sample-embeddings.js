window.embeddingExplorerSamples = [
  {
    id: 'sunny-stroll',
    label: 'Sunny park stroll',
    description: 'A sunny stroll through a park lined with trees and warm light.',
    vector: Array(63)
      .fill(0.0365919)
      .concat([4.0947094]),
  },
  {
    id: 'neon-crosswalk',
    label: 'Neon-lit crosswalk',
    description: 'Busy urban crossing at night with bright signage and a fast tempo.',
    vector: [
      0.82,
      0.51,
      -0.42,
      -0.67,
      0.73,
      1.04,
      -0.38,
      0.29,
      0.61,
      -0.74,
      0.37,
      0.19,
      -0.82,
      0.58,
      0.33,
      -0.91,
      1.18,
      -0.46,
      0.42,
      0.27,
      -0.65,
      0.77,
      -0.32,
      0.18,
      0.94,
      -0.53,
      0.67,
      0.21,
      -0.47,
      0.36,
      -0.29,
      0.15,
    ],
  },
  {
    id: 'midnight-library',
    label: 'Midnight library stacks',
    description: 'Late-night research glow with shelves of books fading into cool shadows.',
    vector: [
      0.42,
      0.31,
      0.27,
      -0.18,
      -0.34,
      0.22,
      0.58,
      -0.41,
      0.16,
      0.09,
      -0.28,
      0.37,
      0.44,
      -0.22,
      0.18,
      -0.15,
      0.63,
      0.52,
      -0.33,
      0.07,
      0.15,
      -0.19,
      0.28,
      0.35,
      -0.24,
      0.31,
      0.26,
      -0.17,
      0.21,
      0.18,
      -0.12,
      0.29,
    ],
  },
];

window.embeddingSources = [
  {
    "id": "jokes-synthetic",
    "label": "Dad jokes — synthetic 64d",
    "collection": "Dad jokes",
    "url": "../../data/jokes-embeddings.json",
    "report": "../../data/similarity-report-jokes.json"
  },
  {
    "id": "jokes-openai",
    "label": "Dad jokes — OpenAI text-embedding-3-large",
    "collection": "Dad jokes",
    "url": "../../data/jokes-embeddings-openai.json",
    "report": "../../data/similarity-report-jokes-openai.json"
  },
  {
    "id": "jokes-cohere",
    "label": "Dad jokes — Cohere embed-english-v3.0",
    "collection": "Dad jokes",
    "url": "../../data/jokes-embeddings-cohere.json",
    "report": "../../data/similarity-report-jokes-cohere.json"
  },
  {
    "id": "quotes-synthetic",
    "label": "Curated quotes — synthetic 64d",
    "collection": "Curated quotes",
    "url": "../../data/quotes-embeddings.json",
    "report": "../../data/similarity-report-quotes.json"
  },
  {
    "id": "quotes-openai",
    "label": "Curated quotes — OpenAI text-embedding-3-large",
    "collection": "Curated quotes",
    "url": "../../data/quotes-embeddings-openai.json",
    "report": "../../data/similarity-report-quotes-openai.json"
  },
  {
    "id": "quotes-cohere",
    "label": "Curated quotes — Cohere embed-english-v3.0",
    "collection": "Curated quotes",
    "url": "../../data/quotes-embeddings-cohere.json",
    "report": "../../data/similarity-report-quotes-cohere.json"
  },
  {
    "id": "slang-synthetic",
    "label": "Internet slang — synthetic 64d",
    "collection": "Internet slang",
    "url": "../../data/slang-embeddings.json",
    "report": "../../data/similarity-report-slang.json"
  },
  {
    "id": "slang-s128",
    "label": "Internet slang — synthetic 128d",
    "collection": "Internet slang",
    "url": "../../data/slang-embeddings-synthetic128.json",
    "report": "../../data/similarity-report-slang-s128.json"
  },
  {
    "id": "slang-hfspace",
    "label": "Internet slang — MiniLM (hf.space)",
    "collection": "Internet slang",
    "url": "../../data/slang-embeddings-hfspace.json",
    "report": "../../data/similarity-report-slang-hfspace.json"
  }
];
