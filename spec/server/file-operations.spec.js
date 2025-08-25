const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../../server');
const ServerTestUtils = require('./test-utils');

describe('Server File Operations', function() {
  let testUtils;

  beforeAll(function() {
    testUtils = new ServerTestUtils();
    testUtils.setupTestEnvironment();
  });

  afterAll(function() {
    testUtils.cleanupTestEnvironment();
  });

  describe('Recipe Saving', function() {
    it('should save recipe file successfully', async function() {
      const testHtml = testUtils.createTestHtml('Server Test Recipe');
      const testFilename = 'servertest.html';

      const response = await request(app)
        .post('/api/save-recipe')
        .send({ 
          html: testHtml, 
          filename: testFilename 
        })
        .expect(200)
        .expect('Content-Type', /application\/json/);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Recipe saved as servertest.html');
      expect(response.body.filepath).toBe('/recipes/servertest.html');

      // Verify file was actually created
      const recipePath = path.join(__dirname, '..', '..', 'recipes', testFilename);
      expect(fs.existsSync(recipePath)).toBe(true);
      
      const savedContent = fs.readFileSync(recipePath, 'utf8');
      expect(savedContent).toBe(testHtml);
    });

    it('should handle moderately large HTML files', async function() {
      // Test with a smaller but still large HTML file (1MB - within our 10MB limit)
      const largeContent = 'A'.repeat(1024 * 1024);
      const largeHtml = `<html><body>${largeContent}</body></html>`;

      const response = await request(app)
        .post('/api/save-recipe')
        .send({ 
          html: largeHtml, 
          filename: 'moderatetest.html'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify large file was saved correctly
      const recipePath = path.join(__dirname, '..', '..', 'recipes', 'moderatetest.html');
      expect(fs.existsSync(recipePath)).toBe(true);
      
      const stats = fs.statSync(recipePath);
      expect(stats.size).toBeGreaterThan(1024 * 1024);
    });

    it('should create recipes directory if it does not exist', async function() {
      // Temporarily remove recipes directory
      const recipesDir = path.join(__dirname, '..', '..', 'recipes');
      const tempBackup = recipesDir + '_backup';
      
      if (fs.existsSync(recipesDir)) {
        fs.renameSync(recipesDir, tempBackup);
      }

      const response = await request(app)
        .post('/api/save-recipe')
        .send({ 
          html: '<html><body>Directory Creation Test</body></html>', 
          filename: 'dirtest.html'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(fs.existsSync(recipesDir)).toBe(true);

      // Restore backup
      if (fs.existsSync(tempBackup)) {
        if (fs.existsSync(recipesDir)) {
          fs.rmSync(recipesDir, { recursive: true });
        }
        fs.renameSync(tempBackup, recipesDir);
      }
    });
  });

  describe('Index Page Updates', function() {
    it('should update index page when recipe data provided', async function() {
      const testHtml = '<html><body><h1>Index Update Test</h1></body></html>';
      const testFilename = 'indexupdatetest.html';
      const recipeData = testUtils.createTestRecipeData();
      recipeData.title = 'Index Update Test Recipe';
      recipeData.description = 'Testing index page updates';

      const response = await request(app)
        .post('/api/save-recipe')
        .send({ 
          html: testHtml, 
          filename: testFilename,
          recipeData: recipeData
        })
        .expect(200)
        .expect('Content-Type', /application\/json/);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('and added to index page');
      expect(response.body.indexUpdated).toBe(true);

      // Verify index page was updated
      const indexPath = path.join(__dirname, '..', '..', 'index.html');
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      expect(indexContent).toContain('Index Update Test Recipe');
      expect(indexContent).toContain('Testing index page updates');
    });

    it('should sanitize recipe data when updating index', async function() {
      const testHtml = '<html><body><h1>Sanitization Test</h1></body></html>';
      const testFilename = 'sanitizationtest.html';
      const maliciousRecipeData = {
        title: '<script>alert("xss")</script>Malicious Recipe',
        description: '<img src="x" onerror="alert(1)">Bad description',
        image: 'https://example.com/test.jpg'
      };

      const response = await request(app)
        .post('/api/save-recipe')
        .send({ 
          html: testHtml, 
          filename: testFilename,
          recipeData: maliciousRecipeData
        })
        .expect(200)
        .expect('Content-Type', /application\/json/);

      expect(response.body.success).toBe(true);

      // Verify malicious content was sanitized in index
      const indexPath = path.join(__dirname, '..', '..', 'index.html');
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      expect(indexContent).not.toContain('<script>alert("xss")</script>');
      expect(indexContent).not.toContain('<img src="x" onerror="alert(1)">');
      expect(indexContent).toContain('Malicious Recipe');
    });
  });

  describe('Concurrent Operations', function() {
    it('should handle concurrent recipe saving', async function() {
      const promises = [];
      
      // Create 5 concurrent save requests
      for (let i = 0; i < 5; i++) {
        const promise = request(app)
          .post('/api/save-recipe')
          .send({ 
            html: `<html><body><h1>Concurrent Test ${i}</h1></body></html>`, 
            filename: `concurrent${i}.html`
          });
        promises.push(promise);
      }

      const responses = await Promise.all(promises);
      
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain(`concurrent${index}.html`);
      });

      // Verify all files were created
      for (let i = 0; i < 5; i++) {
        const recipePath = path.join(__dirname, '..', '..', 'recipes', `concurrent${i}.html`);
        expect(fs.existsSync(recipePath)).toBe(true);
      }
    });
  });
});