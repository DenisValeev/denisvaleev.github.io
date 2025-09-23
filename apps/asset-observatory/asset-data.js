window.assetObservatoryData = {
  "generatedAt": "2025-09-23T03:41:46.316Z",
  "datasets": [
    {
      "id": "jokes",
      "label": "Dad Jokes",
      "dataset": {
        "path": "apps/jokes/jokes.js",
        "bytes": 144599
      },
      "manifest": {
        "path": "data/jokes-manifest.json",
        "bytes": 657047,
        "generatedAt": "2025-09-22T23:16:21.809Z"
      },
      "entries": 865,
      "embeddings": [
        {
          "path": "data/jokes-embeddings.json",
          "provider": "synthetic",
          "model": "synthetic-64",
          "dimensions": 64,
          "records": 870,
          "bytes": 604839,
          "generatedAt": "2025-09-23T01:02:19.484Z"
        },
        {
          "path": "data/jokes-embeddings-openai.json",
          "provider": "openai",
          "model": "text-embedding-3-large",
          "dimensions": 64,
          "records": 865,
          "bytes": 621944,
          "generatedAt": "2025-09-22T23:16:21.852Z"
        },
        {
          "path": "data/jokes-embeddings-cohere.json",
          "provider": "cohere",
          "model": "embed-english-v3.0",
          "dimensions": 64,
          "records": 865,
          "bytes": 603962,
          "generatedAt": "2025-09-22T23:16:21.862Z"
        }
      ],
      "similarityReports": [
        {
          "path": "data/similarity-report-jokes.json",
          "provider": "hfspace",
          "model": "sentence-transformers/all-MiniLM-L6-v2 (hf.space/BienKieu)",
          "threshold": 0.5,
          "pairs": 137,
          "bytes": 39018,
          "generatedAt": "2025-09-23T01:03:32.987Z"
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
        "embeddingBytes": 1830745,
        "embeddingVectors": 2600,
        "similarityBytes": 183952,
        "similarityPairs": 641
      }
    },
    {
      "id": "genalpha",
      "label": "Gen α Slang",
      "dataset": {
        "path": "apps/gen-alpha/slang.js",
        "bytes": 14209
      },
      "manifest": {
        "path": "data/genalpha-manifest.json",
        "bytes": 39386,
        "generatedAt": "2025-09-23T02:58:09.957Z"
      },
      "entries": 45,
      "embeddings": [
        {
          "path": "data/genalpha-embeddings.json",
          "provider": "synthetic",
          "model": "synthetic-64",
          "dimensions": 64,
          "records": 45,
          "bytes": 31508,
          "generatedAt": "2025-09-23T01:22:46.845Z"
        },
        {
          "path": "data/genalpha-embeddings-hfspace.json",
          "provider": "hfspace",
          "model": "sentence-transformers/all-MiniLM-L6-v2 (hf.space/BienKieu)",
          "dimensions": 384,
          "records": 45,
          "bytes": 110258,
          "generatedAt": "2025-09-23T01:44:54.613Z"
        },
        {
          "path": "data/genalpha-embeddings-synthetic128.json",
          "provider": "synthetic",
          "model": "synthetic-128",
          "dimensions": 128,
          "records": 45,
          "bytes": 46900,
          "generatedAt": "2025-09-23T01:22:57.576Z"
        }
      ],
      "similarityReports": [
        {
          "path": "data/similarity-report-genalpha.json",
          "provider": "synthetic",
          "model": "synthetic-64",
          "threshold": 0.88,
          "pairs": 0,
          "bytes": 165,
          "generatedAt": "2025-09-23T01:23:08.354Z"
        },
        {
          "path": "data/similarity-report-genalpha-hfspace.json",
          "provider": "hfspace",
          "model": "sentence-transformers/all-MiniLM-L6-v2 (hf.space/BienKieu)",
          "threshold": 0.88,
          "pairs": 0,
          "bytes": 209,
          "generatedAt": "2025-09-23T01:44:54.640Z"
        },
        {
          "path": "data/similarity-report-genalpha-s128.json",
          "provider": "synthetic",
          "model": "synthetic-128",
          "threshold": 0.88,
          "pairs": 0,
          "bytes": 166,
          "generatedAt": "2025-09-23T01:44:58.612Z"
        }
      ],
      "sources": [],
      "totals": {
        "embeddingBytes": 188666,
        "embeddingVectors": 135,
        "similarityBytes": 540,
        "similarityPairs": 0
      }
    },
    {
      "id": "quotes",
      "label": "Quotes",
      "dataset": {
        "path": "apps/quotes/quotes-data.js",
        "bytes": 121995
      },
      "manifest": {
        "path": "data/quotes-manifest.json",
        "bytes": 478829,
        "generatedAt": "2025-09-23T01:27:49.602Z"
      },
      "entries": 672,
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
          "provider": "cohere",
          "model": "embed-english-v3.0",
          "threshold": 0.5,
          "pairs": 1358,
          "bytes": 466479,
          "generatedAt": "2025-09-22T23:19:57.697Z"
        }
      ],
      "sources": [
        {
          "path": "data/curated-quotes.json",
          "label": "Curated quotes source",
          "bytes": 22094
        }
      ],
      "totals": {
        "embeddingBytes": 928539,
        "embeddingVectors": 1306,
        "similarityBytes": 483197,
        "similarityPairs": 1408
      }
    }
  ],
  "providers": [
    {
      "id": "synthetic",
      "stores": 4,
      "bytes": 1139830,
      "vectorCount": 1613,
      "dimensions": [
        64,
        128
      ]
    },
    {
      "id": "openai",
      "stores": 2,
      "bytes": 1093900,
      "vectorCount": 1518,
      "dimensions": [
        64
      ]
    },
    {
      "id": "cohere",
      "stores": 1,
      "bytes": 603962,
      "vectorCount": 865,
      "dimensions": [
        64
      ]
    },
    {
      "id": "hfspace",
      "stores": 1,
      "bytes": 110258,
      "vectorCount": 45,
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
      "bytes": 22094
    }
  ],
  "totals": {
    "datasets": 3,
    "entries": 1582,
    "datasetBytes": 280803,
    "manifestBytes": 1175262,
    "embeddingVectors": 4041,
    "embeddingBytes": 2947950,
    "embeddingStores": 8,
    "similarityPairs": 2113,
    "similarityBytes": 688455,
    "similarityReports": 12,
    "totalFiles": 29,
    "totalBytes": 5299615,
    "providerCount": 4
  }
};
