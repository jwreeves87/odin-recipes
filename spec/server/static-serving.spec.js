const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../../server');
const ServerTestUtils = require('./test-utils');

describe('Server Static File Serving', function() {
  let testUtils;

  beforeAll(function() {
    testUtils = new ServerTestUtils();
    testUtils.setupTestEnvironment();
  });

  afterAll(function() {
    testUtils.cleanupTestEnvironment();
  });

  describe('JavaScript Files', function() {
    it('should serve static JS files', async function() {
      // This tests that static file serving works
      const response = await request(app)
        .get('/js/Recipe.js')
        .expect(200)
        .expect('Content-Type', /text\/javascript/);

      expect(response.text).toContain('class Recipe');
    });

    it('should serve other JS class files', async function() {
      const response = await request(app)
        .get('/js/RecipeTemplate.js')
        .expect(200)
        .expect('Content-Type', /text\/javascript/);

      expect(response.text).toContain('class RecipeTemplate');
    });
  });

  describe('Recipe HTML Files', function() {
    it('should serve recipe HTML files', async function() {
      // Create a test recipe file first
      const testRecipeHtml = '<html><body><h1>Static Test Recipe</h1></body></html>';
      const testRecipePath = path.join(__dirname, '..', '..', 'recipes', 'statictest.html');
      fs.writeFileSync(testRecipePath, testRecipeHtml, 'utf8');

      const response = await request(app)
        .get('/recipes/statictest.html')
        .expect(200)
        .expect('Content-Type', /text\/html/);

      expect(response.text).toContain('Static Test Recipe');
    });
  });

  describe('Main Application Files', function() {
    it('should serve recipe import page', async function() {
      const response = await request(app)
        .get('/recipe-import.html')
        .expect(200)
        .expect('Content-Type', /text\/html/);

      expect(response.text).toContain('Recipe Import');
    });

    it('should serve CSS files if they exist', async function() {
      // Check if styles.css exists, if so test it
      const stylesPath = path.join(__dirname, '..', '..', 'styles.css');
      
      if (fs.existsSync(stylesPath)) {
        await request(app)
          .get('/styles.css')
          .expect(200)
          .expect('Content-Type', /text\/css/);
      } else {
        // Skip test if file doesn't exist
        pending('styles.css does not exist');
      }
    });
  });

  describe('Error Handling', function() {
    it('should return 404 for non-existent static files', async function() {
      await request(app)
        .get('/nonexistent.js')
        .expect(404);
    });

    it('should return 404 for non-existent recipe files', async function() {
      await request(app)
        .get('/recipes/nonexistent.html')
        .expect(404);
    });
  });

  describe('MIME Types', function() {
    it('should serve HTML files with correct MIME type', async function() {
      await request(app)
        .get('/')
        .expect(200)
        .expect('Content-Type', /text\/html/);
    });

    it('should serve JavaScript files with correct MIME type', async function() {
      await request(app)
        .get('/js/Recipe.js')
        .expect(200)
        .expect('Content-Type', /text\/javascript/);
    });
  });
});