window.assetObservatoryData = {
  "generatedAt": "2025-10-02T18:40:24.618Z",
  "datasets": [
    {
      "id": "jokes",
      "label": "Dad Jokes",
      "dataset": {
        "path": "apps/jokes/jokes.js",
        "bytes": 177033
      },
      "manifest": {
        "path": "data/jokes-manifest.json",
        "bytes": 564790,
        "generatedAt": "2025-09-27T03:57:07.825Z"
      },
      "entries": 846,
      "embeddings": [
        {
          "path": "data/jokes-embeddings.json",
          "provider": "synthetic",
          "model": "synthetic-64",
          "dimensions": 64,
          "records": 949,
          "bytes": 659744,
          "generatedAt": "2025-09-27T03:50:55.540Z"
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
          "pairs": 96,
          "bytes": 27279,
          "generatedAt": "2025-09-25T04:12:14.839Z"
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
          "id": "icanhazdadjokes",
          "path": "data/icanhazdadjokes-split.json",
          "label": "I Can Haz Dad Jokes split",
          "bytes": 123300
        },
        {
          "id": "official-jokes",
          "path": "data/official-jokes-index.json",
          "label": "Official Jokes index",
          "bytes": 61751
        },
        {
          "id": "punme-dad-jokes",
          "path": "data/punme-dad-jokes-2025.json",
          "label": "Pun.me dad jokes capture (2025-09-27)",
          "bytes": 988
        }
      ],
      "totals": {
        "embeddingBytes": 1857310,
        "embeddingVectors": 2639,
        "similarityBytes": 172213,
        "similarityPairs": 600
      }
    },
    {
      "id": "quotes",
      "label": "Quotes",
      "dataset": {
        "path": "apps/quotes/quotes-data.js",
        "bytes": 133145
      },
      "manifest": {
        "path": "data/quotes-manifest.json",
        "bytes": 522810,
        "generatedAt": "2025-09-27T03:48:50.454Z"
      },
      "entries": 735,
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
        },
        {
          "path": "data/quotes-embeddings-cohere.json",
          "provider": "hfspace",
          "model": "sentence-transformers/all-MiniLM-L6-v2 (hf.space/BienKieu)",
          "dimensions": 384,
          "records": 129,
          "bytes": 316032,
          "generatedAt": "2025-09-22T00:02:49.928Z"
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
          "pairs": 80,
          "bytes": 26836,
          "generatedAt": "2025-09-22T00:02:49.928Z"
        }
      ],
      "sources": [
        {
          "id": "curated-quotes",
          "path": "data/curated-quotes.json",
          "label": "Curated quotes source",
          "bytes": 31189
        }
      ],
      "totals": {
        "embeddingBytes": 1244571,
        "embeddingVectors": 1435,
        "similarityBytes": 43554,
        "similarityPairs": 130
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
      "bytes": 1366403,
      "vectorCount": 1890,
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
      "stores": 2,
      "bytes": 668346,
      "vectorCount": 273,
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
      "id": "icanhazdadjokes",
      "datasetId": "jokes",
      "label": "I Can Haz Dad Jokes split",
      "path": "data/icanhazdadjokes-split.json",
      "bytes": 123300
    },
    {
      "id": "official-jokes",
      "datasetId": "jokes",
      "label": "Official Jokes index",
      "path": "data/official-jokes-index.json",
      "bytes": 61751
    },
    {
      "id": "punme-dad-jokes",
      "datasetId": "jokes",
      "label": "Pun.me dad jokes capture (2025-09-27)",
      "path": "data/punme-dad-jokes-2025.json",
      "bytes": 988
    },
    {
      "id": "curated-quotes",
      "datasetId": "quotes",
      "label": "Curated quotes source",
      "path": "data/curated-quotes.json",
      "bytes": 31189
    }
  ],
  "totals": {
    "datasets": 3,
    "entries": 1680,
    "datasetBytes": 353764,
    "manifestBytes": 1207513,
    "embeddingVectors": 4506,
    "embeddingBytes": 3704271,
    "embeddingStores": 9,
    "similarityPairs": 794,
    "similarityBytes": 237061,
    "similarityReports": 12,
    "totalFiles": 31,
    "totalBytes": 5719837,
    "providerCount": 4
  }
};
