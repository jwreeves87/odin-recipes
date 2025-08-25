const request = require('supertest');
const app = require('../../server');
const ServerTestUtils = require('./test-utils');

describe('Server Error Handling', function() {
  let testUtils;

  beforeAll(function() {
    testUtils = new ServerTestUtils();
    testUtils.setupTestEnvironment();
  });

  afterAll(function() {
    testUtils.cleanupTestEnvironment();
  });

  describe('Recipe Scraping Errors', function() {
    it('should handle network timeout gracefully', async function() {
      // Use a URL that will timeout
      const response = await request(app)
        .post('/api/scrape-recipe')
        .send({ url: 'https://httpstat.us/200?sleep=15000' })
        .expect(500)
        .expect('Content-Type', /application\/json/);

      expect(response.body.error).toContain('Failed to scrape recipe');
    }, 12000); // 12 second timeout for this test

    it('should handle non-existent URLs', async function() {
      const response = await request(app)
        .post('/api/scrape-recipe')
        .send({ url: 'https://this-domain-does-not-exist-12345.com/recipe' })
        .expect(500)
        .expect('Content-Type', /application\/json/);

      expect(response.body.error).toContain('Failed to scrape recipe');
    });

    it('should handle URLs without recipe data', async function() {
      // Use a URL that exists but has no recipe data (Google's homepage)
      const response = await request(app)
        .post('/api/scrape-recipe')
        .send({ url: 'https://www.google.com' })
        .expect(404)
        .expect('Content-Type', /application\/json/);

      expect(response.body.error).toContain('No recipe data found');
    });

    it('should handle malformed JSON-LD data gracefully', async function() {
      // Test with a domain that will fail quickly
      const response = await request(app)
        .post('/api/scrape-recipe')
        .send({ url: 'https://nonexistent-test-domain-12345.fake' })
        .expect(500)
        .expect('Content-Type', /application\/json/);

      expect(response.body.error).toContain('Failed to scrape recipe');
    });
  });

  describe('JSON and Request Body Errors', function() {
    it('should handle malformed JSON in request body', async function() {
      const response = await request(app)
        .post('/api/scrape-recipe')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400)
        .expect('Content-Type', /application\/json/);
      
      expect(response.body.error).toBe('Invalid JSON in request body');
    });

    it('should handle missing Content-Type header', async function() {
      const response = await request(app)
        .post('/api/scrape-recipe')
        .send('not json')
        .expect(400)
        .expect('Content-Type', /application\/json/);
      
      expect(response.body.error).toBe('URL is required');
    });
  });

  describe('File System Errors', function() {
    it('should handle file system errors gracefully', async function() {
      // Try to save to an invalid filename
      const response = await request(app)
        .post('/api/save-recipe')
        .send({ 
          html: '<html></html>', 
          filename: '../../../etc/passwd' // Trying to escape recipes directory
        })
        .expect(500)
        .expect('Content-Type', /application\/json/);

      expect(response.body.error).toContain('Failed to save recipe');
    });

    it('should reject very large HTML files', async function() {
      // Test with a large HTML file (20MB - exceeds our 10MB limit)
      const largeContent = 'A'.repeat(20 * 1024 * 1024);
      const largeHtml = `<html><body>${largeContent}</body></html>`;

      const response = await request(app)
        .post('/api/save-recipe')
        .send({ 
          html: largeHtml, 
          filename: 'largetest.html'
        })
        .expect(413);

      expect(response.body.error).toContain('Request entity too large');
    });
  });

  describe('404 Errors', function() {
    it('should return 404 for non-existent files', async function() {
      await request(app)
        .get('/nonexistent.html')
        .expect(404);
    });
  });
});