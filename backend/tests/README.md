# Backend Tests

## Structure

```
tests/
├── conftest.py           # Shared fixtures, env defaults
├── unit/                 # Fast, no I/O (mocked)
│   ├── etl/              # Domain filter, loaders
│   │   └── test_domain_filter.py
│   └── services/         # AI, strategy (mocked)
│       └── test_ai_service.py
└── integration/          # DB, network, or full app
    ├── test_projects_api.py
    ├── test_hf_job_source.py
    └── test_strategy_focus_areas.py
```

## Running Tests

```bash
cd backend

# All tests
uv run pytest

# Unit only (fast)
uv run pytest -m unit

# Integration only
uv run pytest -m integration

# Exclude slow (HF network)
uv run pytest -m "integration and not slow"

# Single file
uv run pytest tests/unit/etl/test_domain_filter.py -v
```

## Markers

| Marker       | Description                    |
|-------------|--------------------------------|
| `unit`      | No DB/network, uses mocks      |
| `integration` | DB, API, or external services |
| `slow`      | Network calls (HuggingFace)    |
