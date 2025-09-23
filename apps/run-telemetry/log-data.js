window.playwrightRunLogFallback = {
  "config": {
    "configFile": "playwright.config.js",
    "rootDir": "tests",
    "forbidOnly": false,
    "fullyParallel": true,
    "globalSetup": null,
    "globalTeardown": null,
    "globalTimeout": 0,
    "grep": {},
    "grepInvert": null,
    "maxFailures": 0,
    "metadata": {
      "actualWorkers": 2
    },
    "preserveOutput": "always",
    "reporter": [
      [
        "json"
      ]
    ],
    "reportSlowTests": {
      "max": 5,
      "threshold": 300000
    },
    "quiet": false,
    "projects": [
      {
        "outputDir": "test-results",
        "repeatEach": 1,
        "retries": 0,
        "metadata": {
          "actualWorkers": 2
        },
        "id": "",
        "name": "",
        "testDir": "tests",
        "testIgnore": [],
        "testMatch": [
          "**/*.@(spec|test).?(c|m)[jt]s?(x)"
        ],
        "timeout": 60000
      }
    ],
    "shard": null,
    "updateSnapshots": "missing",
    "updateSourceMethod": "patch",
    "version": "1.55.0",
    "workers": 2,
    "webServer": {
      "command": "python -m http.server 4173",
      "url": "http://127.0.0.1:4173",
      "reuseExistingServer": true,
      "stdout": "pipe",
      "stderr": "pipe"
    }
  },
  "suites": [
    {
      "title": "index.spec.js",
      "file": "index.spec.js",
      "column": 0,
      "line": 0,
      "specs": [],
      "suites": [
        {
          "title": "Landing page",
          "file": "index.spec.js",
          "line": 3,
          "column": 6,
          "specs": [
            {
              "title": "lists every app including the telemetry console",
              "ok": true,
              "tags": [],
              "tests": [
                {
                  "timeout": 60000,
                  "annotations": [],
                  "expectedStatus": "passed",
                  "projectId": "",
                  "projectName": "",
                  "results": [
                    {
                      "workerIndex": 0,
                      "parallelIndex": 0,
                      "status": "passed",
                      "duration": 568,
                      "errors": [],
                      "stdout": [],
                      "stderr": [],
                      "retry": 0,
                      "startTime": "2025-09-23T01:47:05.704Z",
                      "annotations": [],
                      "attachments": []
                    }
                  ],
                  "status": "expected"
                }
              ],
              "id": "ffca65896366658e04f2-dbc271f7560944b59faf",
              "file": "index.spec.js",
              "line": 4,
              "column": 3
            }
          ]
        }
      ]
    },
    {
      "title": "jokes.spec.js",
      "file": "jokes.spec.js",
      "column": 0,
      "line": 0,
      "specs": [],
      "suites": [
        {
          "title": "Random Jokes app",
          "file": "jokes.spec.js",
          "line": 13,
          "column": 6,
          "specs": [
            {
              "title": "reveals punchlines, resets when moving, and honours keyboard shortcuts",
              "ok": true,
              "tags": [],
              "tests": [
                {
                  "timeout": 60000,
                  "annotations": [],
                  "expectedStatus": "passed",
                  "projectId": "",
                  "projectName": "",
                  "results": [
                    {
                      "workerIndex": 1,
                      "parallelIndex": 1,
                      "status": "passed",
                      "duration": 790,
                      "errors": [],
                      "stdout": [],
                      "stderr": [],
                      "retry": 0,
                      "startTime": "2025-09-23T01:47:05.691Z",
                      "annotations": [],
                      "attachments": []
                    }
                  ],
                  "status": "expected"
                }
              ],
              "id": "02837f281c861f1f3f2f-84fabb5d4f615d29ee31",
              "file": "jokes.spec.js",
              "line": 18,
              "column": 3
            }
          ]
        }
      ]
    },
    {
      "title": "quotes.spec.js",
      "file": "quotes.spec.js",
      "column": 0,
      "line": 0,
      "specs": [],
      "suites": [
        {
          "title": "Quotes app",
          "file": "quotes.spec.js",
          "line": 13,
          "column": 6,
          "specs": [
            {
              "title": "navigates shuffled decks and filters by category",
              "ok": true,
              "tags": [],
              "tests": [
                {
                  "timeout": 60000,
                  "annotations": [],
                  "expectedStatus": "passed",
                  "projectId": "",
                  "projectName": "",
                  "results": [
                    {
                      "workerIndex": 0,
                      "parallelIndex": 0,
                      "status": "passed",
                      "duration": 666,
                      "errors": [],
                      "stdout": [],
                      "stderr": [],
                      "retry": 0,
                      "startTime": "2025-09-23T01:47:06.587Z",
                      "annotations": [],
                      "attachments": []
                    }
                  ],
                  "status": "expected"
                }
              ],
              "id": "52892e90bc80ef7f93e3-f12a55fd8db0bcb70a6e",
              "file": "quotes.spec.js",
              "line": 18,
              "column": 3
            }
          ]
        }
      ]
    },
    {
      "title": "run-telemetry.spec.js",
      "file": "run-telemetry.spec.js",
      "column": 0,
      "line": 0,
      "specs": [],
      "suites": [
        {
          "title": "Playwright Run Telemetry console",
          "file": "run-telemetry.spec.js",
          "line": 3,
          "column": 6,
          "specs": [
            {
              "title": "renders summaries, supports filters, and exposes the activity log",
              "ok": true,
              "tags": [],
              "tests": [
                {
                  "timeout": 60000,
                  "annotations": [],
                  "expectedStatus": "passed",
                  "projectId": "",
                  "projectName": "",
                  "results": [
                    {
                      "workerIndex": 1,
                      "parallelIndex": 1,
                      "status": "passed",
                      "duration": 1811,
                      "errors": [],
                      "stdout": [],
                      "stderr": [],
                      "retry": 0,
                      "startTime": "2025-09-23T01:47:06.845Z",
                      "annotations": [],
                      "attachments": []
                    }
                  ],
                  "status": "expected"
                }
              ],
              "id": "93bf15e4e22678e4dbe2-6843ed3a8496c8de6ada",
              "file": "run-telemetry.spec.js",
              "line": 4,
              "column": 3
            }
          ]
        }
      ]
    },
    {
      "title": "similarity-report.spec.js",
      "file": "similarity-report.spec.js",
      "column": 0,
      "line": 0,
      "specs": [],
      "suites": [
        {
          "title": "Cosine Similarity Lab",
          "file": "similarity-report.spec.js",
          "line": 11,
          "column": 6,
          "specs": [
            {
              "title": "loads similarity data with Levenshtein metrics and range controls",
              "ok": true,
              "tags": [],
              "tests": [
                {
                  "timeout": 60000,
                  "annotations": [],
                  "expectedStatus": "passed",
                  "projectId": "",
                  "projectName": "",
                  "results": [
                    {
                      "workerIndex": 0,
                      "parallelIndex": 0,
                      "status": "passed",
                      "duration": 5695,
                      "errors": [],
                      "stdout": [],
                      "stderr": [],
                      "retry": 0,
                      "startTime": "2025-09-23T01:47:07.332Z",
                      "annotations": [],
                      "attachments": []
                    }
                  ],
                  "status": "expected"
                }
              ],
              "id": "39e27dd49605a46c31e6-c335ca3a90f48574c142",
              "file": "similarity-report.spec.js",
              "line": 12,
              "column": 3
            }
          ]
        }
      ]
    },
    {
      "title": "value-formatter.spec.js",
      "file": "value-formatter.spec.js",
      "column": 0,
      "line": 0,
      "specs": [],
      "suites": [
        {
          "title": "Value Formatter app",
          "file": "value-formatter.spec.js",
          "line": 3,
          "column": 6,
          "specs": [
            {
              "title": "applies presets, custom transforms, and persists the input field",
              "ok": true,
              "tags": [],
              "tests": [
                {
                  "timeout": 60000,
                  "annotations": [],
                  "expectedStatus": "passed",
                  "projectId": "",
                  "projectName": "",
                  "results": [
                    {
                      "workerIndex": 1,
                      "parallelIndex": 1,
                      "status": "passed",
                      "duration": 496,
                      "errors": [],
                      "stdout": [],
                      "stderr": [],
                      "retry": 0,
                      "startTime": "2025-09-23T01:47:08.697Z",
                      "annotations": [],
                      "attachments": []
                    }
                  ],
                  "status": "expected"
                }
              ],
              "id": "3a4141919f418f3b1cdb-92226a802dca8599dd4d",
              "file": "value-formatter.spec.js",
              "line": 4,
              "column": 3
            }
          ]
        }
      ]
    }
  ],
  "errors": [],
  "stats": {
    "startTime": "2025-09-23T01:47:03.947Z",
    "duration": 9263.449,
    "expected": 6,
    "skipped": 0,
    "unexpected": 0,
    "flaky": 0
  },
  "generatedAt": "2025-09-23T01:47:13.267Z"
};
