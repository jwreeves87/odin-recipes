const IndexPageUpdater = require('../js/IndexPageUpdater');
const fs = require('fs');
const path = require('path');

describe('IndexPageUpdater - Critical Missing Methods', function() {
  let updater;
  let testIndexPath;
  let testIndexContent;

  beforeEach(function() {
    updater = new IndexPageUpdater();
    
    // Create a test index file to avoid modifying the real one
    testIndexPath = path.join(__dirname, 'test-index.html');
    testIndexContent = `<!DOCTYPE html>
<html>
<head><title>Test Index</title></head>
<body>
  <div class="container">
    <div class="recipe-grid">
      <!-- Existing recipes would go here -->
    </div>
    
    <sl-card style="margin-top: 3rem; background: #ffffff; border: 2px solid #ff6b35; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"
      <h3 slot="header">Testimonials</h3>
    </sl-card>
  </div>
</body>
</html>`;
    
    fs.writeFileSync(testIndexPath, testIndexContent, 'utf8');
    
    // Override the indexPath for testing
    updater.indexPath = testIndexPath;
  });

  afterEach(function() {
    // Clean up test file
    if (fs.existsSync(testIndexPath)) {
      fs.unlinkSync(testIndexPath);
    }
  });

  describe('addRecipeToIndex', function() {
    it('should add recipe card to index.html successfully', function() {
      const recipeData = {
        title: 'Test Recipe for Index',
        description: 'A test recipe to verify index updating',
        image: 'https://example.com/test-image.jpg',
        cookTime: 'PT45M'
      };
      const filename = 'testrecipeforindex.html';

      const result = updater.addRecipeToIndex(recipeData, filename);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Recipe added to index page');

      // Verify the file was actually modified
      const updatedContent = fs.readFileSync(testIndexPath, 'utf8');
      expect(updatedContent).toContain('Test Recipe for Index');
      expect(updatedContent).toContain('A test recipe to verify index updating');
      expect(updatedContent).toContain('https://example.com/test-image.jpg');
      expect(updatedContent).toContain('testrecipeforindex.html');
      expect(updatedContent).toContain('45-Min Process');
      expect(updatedContent).toContain('recipe-card');
    });

    it('should handle missing insertion marker gracefully', function() {
      // Create index file without the insertion marker
      const badIndexContent = '<html><body>No marker here</body></html>';
      fs.writeFileSync(testIndexPath, badIndexContent, 'utf8');

      const recipeData = { title: 'Test Recipe' };
      const result = updater.addRecipeToIndex(recipeData, 'test.html');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not find insertion point');
    });

    it('should handle file system errors', function() {
      // Point to a directory that doesn't exist
      updater.indexPath = '/nonexistent/path/index.html';

      const recipeData = { title: 'Test Recipe' };
      const result = updater.addRecipeToIndex(recipeData, 'test.html');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should escape HTML in recipe data when adding to index', function() {
      const maliciousRecipe = {
        title: '<script>alert("xss")</script>Malicious Recipe',
        description: '<img src="x" onerror="alert(1)">Bad description',
        image: 'https://example.com/image.jpg'
      };
      const filename = 'malicious.html';

      const result = updater.addRecipeToIndex(maliciousRecipe, filename);

      expect(result.success).toBe(true);

      const updatedContent = fs.readFileSync(testIndexPath, 'utf8');
      expect(updatedContent).not.toContain('<script>alert("xss")</script>');
      expect(updatedContent).not.toContain('<img src="x" onerror="alert(1)">');
      expect(updatedContent).toContain('&lt;script&gt;');
      expect(updatedContent).toContain('&lt;img');
    });

    it('should preserve existing content when adding new recipe', function() {
      const recipeData = {
        title: 'New Recipe',
        description: 'A new recipe to add'
      };

      const result = updater.addRecipeToIndex(recipeData, 'newrecipe.html');

      expect(result.success).toBe(true);

      const updatedContent = fs.readFileSync(testIndexPath, 'utf8');
      expect(updatedContent).toContain('New Recipe');
      expect(updatedContent).toContain('Testimonials'); // Existing content preserved
      expect(updatedContent).toContain('<!DOCTYPE html>'); // Structure preserved
    });

    it('should handle recipes with minimal data', function() {
      const minimalRecipe = {
        title: 'Minimal Recipe'
        // No description, image, or timing data
      };

      const result = updater.addRecipeToIndex(minimalRecipe, 'minimal.html');

      expect(result.success).toBe(true);

      const updatedContent = fs.readFileSync(testIndexPath, 'utf8');
      expect(updatedContent).toContain('Minimal Recipe');
      expect(updatedContent).toContain('No description available');
      expect(updatedContent).toContain('Unknown Time');
    });

    it('should handle very long recipe titles and descriptions', function() {
      const longRecipe = {
        title: 'A'.repeat(200),
        description: 'B'.repeat(1000),
        image: 'https://example.com/long.jpg'
      };

      const result = updater.addRecipeToIndex(longRecipe, 'long.html');

      expect(result.success).toBe(true);

      const updatedContent = fs.readFileSync(testIndexPath, 'utf8');
      expect(updatedContent).toContain('A'.repeat(200));
      expect(updatedContent).toContain('B'.repeat(1000));
      // Should still be valid HTML
      expect(updatedContent).toMatch(/^<!DOCTYPE html>/);
    });
  });
});