window.assetObservatoryData = {
  "generatedAt": "2025-09-25T03:21:58.324Z",
  "datasets": [
    {
      "id": "jokes",
      "label": "Dad Jokes",
      "dataset": {
        "path": "apps/jokes/jokes.js",
        "bytes": 151888
      },
      "manifest": {
        "path": "data/jokes-manifest.json",
        "bytes": 567558,
        "generatedAt": "2025-09-23T04:05:28.246Z"
      },
      "entries": 850,
      "embeddings": [
        {
          "path": "data/jokes-embeddings.json",
          "provider": "synthetic",
          "model": "synthetic-64",
          "dimensions": 64,
          "records": 910,
          "bytes": 632639,
          "generatedAt": "2025-09-25T02:54:18.632Z"
        },
        {
          "path": "data/jokes-embeddings-openai.json",
          "provider": "openai",
          "model": "text-embedding-3-large",
          "dimensions": 64,
          "records": 845,
          "bytes": 607564,
          "generatedAt": "2025-09-23T04:06:44.339Z"
        },
        {
          "path": "data/jokes-embeddings-cohere.json",
          "provider": "cohere",
          "model": "embed-english-v3.0",
          "dimensions": 64,
          "records": 845,
          "bytes": 590002,
          "generatedAt": "2025-09-23T04:06:44.318Z"
        }
      ],
      "similarityReports": [
        {
          "path": "data/similarity-report-jokes.json",
          "provider": "hfspace",
          "model": "sentence-transformers/all-MiniLM-L6-v2 (hf.space/BienKieu)",
          "threshold": 0.5,
          "pairs": 120,
          "bytes": 34468,
          "generatedAt": "2025-09-25T02:55:49.612Z"
        },
        {
          "path": "data/similarity-report-jokes-openai.json",
          "provider": "openai",
          "model": "text-embedding-3-large",
          "threshold": 0.5,
          "pairs": 144,
          "bytes": 41841,
          "generatedAt": "2025-09-22T23:19:57.672Z"
        },
        {
          "path": "data/similarity-report-jokes-cohere.json",
          "provider": "cohere",
          "model": "embed-english-v3.0",
          "threshold": 0.5,
          "pairs": 360,
          "bytes": 103093,
          "generatedAt": "2025-09-22T23:19:57.679Z"
        }
      ],
      "sources": [
        {
          "path": "data/icanhazdadjokes-split.json",
          "label": "I Can Haz Dad Jokes split",
          "bytes": 123300
        },
        {
          "path": "data/official-jokes-index.json",
          "label": "Official Jokes index",
          "bytes": 61751
        }
      ],
      "totals": {
        "embeddingBytes": 1830205,
        "embeddingVectors": 2600,
        "similarityBytes": 179402,
        "similarityPairs": 624
      }
    },
    {
      "id": "quotes",
      "label": "Quotes",
      "dataset": {
        "path": "apps/quotes/quotes-data.js",
        "bytes": 132683
      },
      "manifest": {
        "path": "data/quotes-manifest.json",
        "bytes": 520721,
        "generatedAt": "2025-09-24T01:25:03.739Z"
      },
      "entries": 732,
      "embeddings": [
        {
          "path": "data/quotes-embeddings.json",
          "provider": "synthetic",
          "model": "synthetic-64",
          "dimensions": 64,
          "records": 653,
          "bytes": 456583,
          "generatedAt": "2025-09-22T23:16:21.899Z"
        },
        {
          "path": "data/quotes-embeddings-openai.json",
          "provider": "openai",
          "model": "text-embedding-3-large",
          "dimensions": 64,
          "records": 653,
          "bytes": 471956,
          "generatedAt": "2025-09-22T23:16:21.908Z"
        }
      ],
      "similarityReports": [
        {
          "path": "data/similarity-report-quotes.json",
          "provider": "hfspace",
          "model": "sentence-transformers/all-MiniLM-L6-v2 (hf.space/BienKieu)",
          "threshold": 0.5,
          "pairs": 10,
          "bytes": 3233,
          "generatedAt": "2025-09-22T23:19:57.683Z"
        },
        {
          "path": "data/similarity-report-quotes-openai.json",
          "provider": "openai",
          "model": "text-embedding-3-large",
          "threshold": 0.5,
          "pairs": 40,
          "bytes": 13485,
          "generatedAt": "2025-09-22T23:19:57.684Z"
        },
        {
          "path": "data/similarity-report-quotes-cohere.json",
          "provider": "hfspace",
          "model": "sentence-transformers/all-MiniLM-L6-v2 (hf.space/BienKieu)",
          "threshold": 0.5,
          "pairs": 120,
          "bytes": 40673,
          "generatedAt": "2025-09-22T00:02:49.928Z"
        }
      ],
      "sources": [
        {
          "path": "data/curated-quotes.json",
          "label": "Curated quotes source",
          "bytes": 31189
        }
      ],
      "totals": {
        "embeddingBytes": 928539,
        "embeddingVectors": 1306,
        "similarityBytes": 483197,
        "similarityPairs": 1408
      }
    },
    {
      "id": "slang",
      "label": "Slang",
      "dataset": {
        "path": "apps/slang/slang.js",
        "bytes": 43586
      },
      "manifest": {
        "path": "data/slang-manifest.json",
        "bytes": 119913,
        "generatedAt": "2025-09-24T01:07:13.597Z"
      },
      "entries": 99,
      "embeddings": [
        {
          "path": "data/slang-embeddings.json",
          "provider": "synthetic",
          "model": "synthetic-64",
          "dimensions": 64,
          "records": 144,
          "bytes": 100413,
          "generatedAt": "2025-09-24T01:08:32.740Z"
        },
        {
          "path": "data/slang-embeddings-hfspace.json",
          "provider": "hfspace",
          "model": "sentence-transformers/all-MiniLM-L6-v2 (hf.space/BienKieu)",
          "dimensions": 384,
          "records": 144,
          "bytes": 352314,
          "generatedAt": "2025-09-24T01:08:45.204Z"
        },
        {
          "path": "data/slang-embeddings-synthetic128.json",
          "provider": "synthetic",
          "model": "synthetic-128",
          "dimensions": 128,
          "records": 144,
          "bytes": 149663,
          "generatedAt": "2025-09-24T01:08:49.616Z"
        }
      ],
      "similarityReports": [
        {
          "path": "data/similarity-report-slang.json",
          "provider": "synthetic",
          "model": "synthetic-64",
          "threshold": 0.8,
          "pairs": 0,
          "bytes": 161,
          "generatedAt": "2025-09-23T22:56:02.858Z"
        },
        {
          "path": "data/similarity-report-slang-hfspace.json",
          "provider": "hfspace",
          "model": "sentence-transformers/all-MiniLM-L6-v2 (hf.space/BienKieu)",
          "threshold": 0.8,
          "pairs": 0,
          "bytes": 205,
          "generatedAt": "2025-09-24T01:08:45.240Z"
        },
        {
          "path": "data/similarity-report-slang-s128.json",
          "provider": "synthetic",
          "model": "synthetic-128",
          "threshold": 0.8,
          "pairs": 0,
          "bytes": 162,
          "generatedAt": "2025-09-24T01:08:49.636Z"
        }
      ],
      "sources": [],
      "totals": {
        "embeddingBytes": 602390,
        "embeddingVectors": 432,
        "similarityBytes": 528,
        "similarityPairs": 0
      }
    }
  ],
  "providers": [
    {
      "id": "synthetic",
      "stores": 4,
      "bytes": 1339298,
      "vectorCount": 1851,
      "dimensions": [
        64,
        128
      ]
    },
    {
      "id": "openai",
      "stores": 2,
      "bytes": 1079520,
      "vectorCount": 1498,
      "dimensions": [
        64
      ]
    },
    {
      "id": "cohere",
      "stores": 1,
      "bytes": 590002,
      "vectorCount": 845,
      "dimensions": [
        64
      ]
    },
    {
      "id": "hfspace",
      "stores": 1,
      "bytes": 352314,
      "vectorCount": 144,
      "dimensions": [
        384
      ]
    }
  ],
  "crossDeck": [
    {
      "scope": "cross-deck",
      "path": "data/similarity-report-cross-deck.json",
      "provider": "hfspace",
      "model": "sentence-transformers/all-MiniLM-L6-v2 (hf.space/BienKieu)",
      "threshold": 0.5,
      "pairs": 10,
      "bytes": 3322,
      "generatedAt": "2025-09-22T23:19:57.714Z"
    },
    {
      "scope": "cross-deck",
      "path": "data/similarity-report-cross-deck-openai.json",
      "provider": "openai",
      "model": "text-embedding-3-large",
      "threshold": 0.5,
      "pairs": 39,
      "bytes": 12391,
      "generatedAt": "2025-09-22T23:19:57.715Z"
    },
    {
      "scope": "cross-deck",
      "path": "data/similarity-report-cross-deck-cohere.json",
      "provider": "cohere",
      "model": "embed-english-v3.0",
      "threshold": 0.5,
      "pairs": 15,
      "bytes": 5053,
      "generatedAt": "2025-09-22T23:19:57.715Z"
    }
  ],
  "sources": [
    {
      "datasetId": "jokes",
      "label": "I Can Haz Dad Jokes split",
      "path": "data/icanhazdadjokes-split.json",
      "bytes": 123300
    },
    {
      "datasetId": "jokes",
      "label": "Official Jokes index",
      "path": "data/official-jokes-index.json",
      "bytes": 61751
    },
    {
      "datasetId": "quotes",
      "label": "Curated quotes source",
      "path": "data/curated-quotes.json",
      "bytes": 31189
    }
  ],
  "totals": {
    "datasets": 3,
    "entries": 1681,
    "datasetBytes": 328157,
    "manifestBytes": 1208192,
    "embeddingVectors": 4338,
    "embeddingBytes": 3361134,
    "embeddingStores": 8,
    "similarityPairs": 2096,
    "similarityBytes": 683893,
    "similarityReports": 12,
    "totalFiles": 29,
    "totalBytes": 5797616,
    "providerCount": 4
  }
};
