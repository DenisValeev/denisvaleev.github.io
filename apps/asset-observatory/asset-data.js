window.assetObservatoryData = {
  "generatedAt": "2025-09-23T22:58:58.892Z",
  "datasets": [
    {
      "id": "jokes",
      "label": "Dad Jokes",
      "dataset": {
        "path": "apps/jokes/jokes.js",
        "bytes": 141344
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
          "records": 850,
          "bytes": 590939,
          "generatedAt": "2025-09-23T04:04:56.265Z"
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
          "pairs": 106,
          "bytes": 30044,
          "generatedAt": "2025-09-23T04:03:02.199Z"
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
        "embeddingBytes": 1788505,
        "embeddingVectors": 2540,
        "similarityBytes": 174978,
        "similarityPairs": 610
      }
    },
    {
      "id": "quotes",
      "label": "Quotes",
      "dataset": {
        "path": "apps/quotes/quotes-data.js",
        "bytes": 123746
      },
      "manifest": {
        "path": "data/quotes-manifest.json",
        "bytes": 485291,
        "generatedAt": "2025-09-23T22:58:55.578Z"
      },
      "entries": 682,
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
          "bytes": 23552
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
        "bytes": 19170
      },
      "manifest": {
        "path": "data/slang-manifest.json",
        "bytes": 51910,
        "generatedAt": "2025-09-23T17:59:48.748Z"
      },
      "entries": 45,
      "embeddings": [
        {
          "path": "data/slang-embeddings.json",
          "provider": "synthetic",
          "model": "synthetic-64",
          "dimensions": 64,
          "records": 45,
          "bytes": 31508,
          "generatedAt": "2025-09-23T01:22:46.845Z"
        },
        {
          "path": "data/slang-embeddings-hfspace.json",
          "provider": "hfspace",
          "model": "sentence-transformers/all-MiniLM-L6-v2 (hf.space/BienKieu)",
          "dimensions": 384,
          "records": 45,
          "bytes": 110258,
          "generatedAt": "2025-09-23T01:44:54.613Z"
        },
        {
          "path": "data/slang-embeddings-synthetic128.json",
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
          "path": "data/similarity-report-slang.json",
          "provider": "synthetic",
          "model": "synthetic-64",
          "threshold": 0.88,
          "pairs": 0,
          "bytes": 162,
          "generatedAt": "2025-09-23T01:23:08.354Z"
        },
        {
          "path": "data/similarity-report-slang-hfspace.json",
          "provider": "hfspace",
          "model": "sentence-transformers/all-MiniLM-L6-v2 (hf.space/BienKieu)",
          "threshold": 0.88,
          "pairs": 0,
          "bytes": 206,
          "generatedAt": "2025-09-23T01:44:54.640Z"
        },
        {
          "path": "data/similarity-report-slang-s128.json",
          "provider": "synthetic",
          "model": "synthetic-128",
          "threshold": 0.88,
          "pairs": 0,
          "bytes": 163,
          "generatedAt": "2025-09-23T01:44:58.612Z"
        }
      ],
      "sources": [],
      "totals": {
        "embeddingBytes": 188666,
        "embeddingVectors": 135,
        "similarityBytes": 531,
        "similarityPairs": 0
      }
    }
  ],
  "providers": [
    {
      "id": "synthetic",
      "stores": 4,
      "bytes": 1125930,
      "vectorCount": 1593,
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
      "bytes": 23552
    }
  ],
  "totals": {
    "datasets": 3,
    "entries": 1577,
    "datasetBytes": 284260,
    "manifestBytes": 1104759,
    "embeddingVectors": 3981,
    "embeddingBytes": 2905710,
    "embeddingStores": 8,
    "similarityPairs": 2082,
    "similarityBytes": 679472,
    "similarityReports": 12,
    "totalFiles": 29,
    "totalBytes": 5182804,
    "providerCount": 4
  }
};
