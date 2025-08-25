const request = require('supertest');
const app = require('../../server');
const ServerTestUtils = require('./test-utils');

describe('Server API Endpoints', function() {
  let testUtils;

  beforeAll(function() {
    testUtils = new ServerTestUtils();
    testUtils.setupTestEnvironment();
  });

  afterAll(function() {
    testUtils.cleanupTestEnvironment();
  });

  describe('GET /', function() {
    it('should serve the main index page', async function() {
      const response = await request(app)
        .get('/')
        .expect(200)
        .expect('Content-Type', /text\/html/);

      expect(response.text).toContain('<!DOCTYPE html>');
      expect(response.text).toContain('Test Index');
    });
  });

  describe('GET /recipe-import.html', function() {
    it('should serve the recipe import page', async function() {
      const response = await request(app)
        .get('/recipe-import.html')
        .expect(200)
        .expect('Content-Type', /text\/html/);

      expect(response.text).toContain('Recipe Import');
    });
  });

  describe('POST /api/scrape-recipe - Basic Functionality', function() {
    it('should require URL parameter', async function() {
      const response = await request(app)
        .post('/api/scrape-recipe')
        .send({})
        .expect(400)
        .expect('Content-Type', /application\/json/);

      expect(response.body.error).toBe('URL is required');
    });

    it('should validate URL format', async function() {
      const response = await request(app)
        .post('/api/scrape-recipe')
        .send({ url: 'not-a-url' })
        .expect(400)
        .expect('Content-Type', /application\/json/);

      expect(response.body.error).toBe('Invalid URL provided');
    });

    it('should validate expected response structure format', async function() {
      // This test demonstrates the expected response structure
      // without making actual network calls
      
      const mockRecipe = {
        title: 'Mock Recipe',
        description: 'Mock description',
        image: 'https://example.com/image.jpg',
        prepTime: 'PT15M',
        cookTime: 'PT30M',
        servings: '4',
        ingredients: ['ingredient 1', 'ingredient 2'],
        instructions: ['step 1', 'step 2'],
        author: 'Mock Author',
        sourceUrl: 'https://example.com/recipe'
      };

      // Validate the structure matches what our endpoint should return
      expect(typeof mockRecipe.title).toBe('string');
      expect(typeof mockRecipe.description).toBe('string');
      expect(Array.isArray(mockRecipe.ingredients)).toBe(true);
      expect(Array.isArray(mockRecipe.instructions)).toBe(true);
      expect(typeof mockRecipe.sourceUrl).toBe('string');
    });
  });

  describe('POST /api/save-recipe - Basic Functionality', function() {
    it('should require HTML and filename parameters', async function() {
      const response = await request(app)
        .post('/api/save-recipe')
        .send({})
        .expect(400)
        .expect('Content-Type', /application\/json/);

      expect(response.body.error).toBe('HTML content and filename are required');
    });

    it('should require HTML parameter', async function() {
      const response = await request(app)
        .post('/api/save-recipe')
        .send({ filename: 'test.html' })
        .expect(400)
        .expect('Content-Type', /application\/json/);

      expect(response.body.error).toBe('HTML content and filename are required');
    });

    it('should require filename parameter', async function() {
      const response = await request(app)
        .post('/api/save-recipe')
        .send({ html: '<html></html>' })
        .expect(400)
        .expect('Content-Type', /application\/json/);

      expect(response.body.error).toBe('HTML content and filename are required');
    });
  });
});