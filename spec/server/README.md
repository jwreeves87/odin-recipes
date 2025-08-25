# Server Tests

This directory contains organized server tests for the recipe import API.

## File Structure

- **`test-utils.js`** - Shared utilities and test helpers
- **`endpoints.spec.js`** - Basic endpoint testing (GET/POST routes)
- **`error-handling.spec.js`** - Error scenarios and edge cases
- **`file-operations.spec.js`** - Recipe saving and file system operations
- **`static-serving.spec.js`** - Static file serving tests

## Test Coverage

### Endpoints (9 tests)
- ✅ GET / (index page)
- ✅ GET /recipe-import.html 
- ✅ POST /api/scrape-recipe validation
- ✅ POST /api/save-recipe validation

### Error Handling (9 tests)
- ✅ Network timeouts and connection failures
- ✅ Invalid URLs and malformed JSON
- ✅ File system errors and security (path traversal)
- ✅ Large file rejection (>10MB)

### File Operations (6 tests)
- ✅ Recipe file saving and directory creation
- ✅ Index page updates with sanitization
- ✅ Concurrent operations handling

### Static Serving (8 tests)
- ✅ JavaScript and HTML file serving
- ✅ Correct MIME types
- ✅ 404 handling for missing files

## Running Tests

```bash
# Run all server tests
npx jasmine spec/server/*.spec.js

# Run specific test suite
npx jasmine spec/server/endpoints.spec.js
npx jasmine spec/server/error-handling.spec.js
npx jasmine spec/server/file-operations.spec.js
npx jasmine spec/server/static-serving.spec.js

# Run with npm test (includes all specs)
npm test
```

## Test Utilities

The `ServerTestUtils` class provides:
- Test environment setup/teardown
- Mock data creation
- File cleanup utilities
- Common test HTML generation

All tests use these utilities for consistency and maintainability.