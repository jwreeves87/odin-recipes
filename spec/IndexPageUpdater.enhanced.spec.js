const IndexPageUpdater = require('../js/IndexPageUpdater');
const fs = require('fs');
const path = require('path');

describe('IndexPageUpdater Enhanced Features', () => {
  let updater;
  let testIndexPath;
  let originalIndexContent;

  beforeEach(() => {
    testIndexPath = path.join(__dirname, 'test-index.html');
    updater = new IndexPageUpdater();
    // Override the index path for testing
    updater.indexPath = testIndexPath;

    // Create a test index.html with sample content
    originalIndexContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Test Reeves BBQ Co.</title>
</head>
<body>
  <div class="container">
    <h1>Test Recipes</h1>
    
    <div class="recipe-grid">
      <sl-card class="recipe-card" style="position: relative;">
        <div class="professional-badge">Test Recipe</div>
        <img slot="image" src="test1.jpg" alt="Test Recipe 1" style="height: 200px; object-fit: cover;" />
        <strong style="color: #ff6b35; font-size: 1.2rem;">Test Recipe 1</strong>
        <div slot="footer">
          <sl-button variant="primary" href="recipes/test1.html">
            <sl-icon slot="prefix" name="book"></sl-icon>
            View Recipe
          </sl-button>
        </div>
      </sl-card>

      <sl-card class="recipe-card" style="position: relative;">
        <div class="professional-badge">Test Recipe</div>
        <img slot="image" src="test2.jpg" alt="Test Recipe 2" style="height: 200px; object-fit: cover;" />
        <strong style="color: #ff6b35; font-size: 1.2rem;">Test Recipe 2</strong>
        <div slot="footer">
          <sl-button variant="primary" href="recipes/test2.html">
            <sl-icon slot="prefix" name="book"></sl-icon>
            View Recipe
          </sl-button>
        </div>
      </sl-card>
    </div>

    <sl-card style="margin-top: 3rem; background: #ffffff; border: 2px solid #ff6b35; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <h3 slot="header">Testimonials</h3>
      <p>Customer feedback goes here</p>
    </sl-card>
  </div>
</body>
</html>`;

    fs.writeFileSync(testIndexPath, originalIndexContent, 'utf8');
  });

  afterEach(() => {
    // Clean up test file
    if (fs.existsSync(testIndexPath)) {
      fs.unlinkSync(testIndexPath);
    }
  });

  describe('removeRecipeFromIndex', () => {
    it('should remove recipe card by filename', () => {
      const result = updater.removeRecipeFromIndex('test1.html');

      expect(result.success).toBe(true);
      
      const updatedContent = fs.readFileSync(testIndexPath, 'utf8');
      expect(updatedContent).not.toContain('recipes/test1.html');
      expect(updatedContent).not.toContain('Test Recipe 1');
      expect(updatedContent).toContain('Test Recipe 2'); // Should still have recipe 2
    });

    it('should handle non-existent recipe gracefully', () => {
      const result = updater.removeRecipeFromIndex('nonexistent.html');

      expect(result.success).toBe(true);
      expect(result.message).toContain('not found');
      
      // Content should be unchanged
      const updatedContent = fs.readFileSync(testIndexPath, 'utf8');
      expect(updatedContent).toBe(originalIndexContent);
    });

    it('should handle file read errors', () => {
      updater.indexPath = '/nonexistent/path/index.html';

      const result = updater.removeRecipeFromIndex('test1.html');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should preserve testimonials section after removal', () => {
      updater.removeRecipeFromIndex('test1.html');

      const updatedContent = fs.readFileSync(testIndexPath, 'utf8');
      expect(updatedContent).toContain('Testimonials');
      expect(updatedContent).toContain('Customer feedback goes here');
    });

    it('should remove only the specified recipe when multiple exist', () => {
      updater.removeRecipeFromIndex('test2.html');

      const updatedContent = fs.readFileSync(testIndexPath, 'utf8');
      expect(updatedContent).toContain('Test Recipe 1');
      expect(updatedContent).not.toContain('Test Recipe 2');
      expect(updatedContent).not.toContain('recipes/test2.html');
    });
  });

  describe('updateRecipeInIndex', () => {
    const updatedRecipeData = {
      title: 'Updated Brisket Recipe',
      description: 'An updated delicious brisket',
      image: 'updated-brisket.jpg',
      cookTime: 'PT18H',
      prepTime: 'PT45M'
    };

    it('should update existing recipe card', () => {
      const result = updater.updateRecipeInIndex(updatedRecipeData, 'test1.html');

      expect(result.success).toBe(true);
      
      const updatedContent = fs.readFileSync(testIndexPath, 'utf8');
      expect(updatedContent).toContain('Updated Brisket Recipe');
      expect(updatedContent).toContain('updated-brisket.jpg');
      expect(updatedContent).not.toContain('Test Recipe 1');
      expect(updatedContent).toContain('Test Recipe 2'); // Should preserve other recipes
    });

    it('should handle non-existent recipe by creating new card', () => {
      const result = updater.updateRecipeInIndex(updatedRecipeData, 'newrecipe.html');

      expect(result.success).toBe(true);
      expect(result.message).toContain('added as new');
      
      const updatedContent = fs.readFileSync(testIndexPath, 'utf8');
      expect(updatedContent).toContain('Updated Brisket Recipe');
      expect(updatedContent).toContain('recipes/newrecipe.html');
    });

    it('should handle missing recipe data gracefully', () => {
      const result = updater.updateRecipeInIndex(null, 'test1.html');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Recipe data is required');
    });

    it('should handle file errors gracefully', () => {
      updater.indexPath = '/nonexistent/path/index.html';

      const result = updater.updateRecipeInIndex(updatedRecipeData, 'test1.html');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should preserve formatting and structure when updating', () => {
      updater.updateRecipeInIndex(updatedRecipeData, 'test1.html');

      const updatedContent = fs.readFileSync(testIndexPath, 'utf8');
      expect(updatedContent).toContain('<div class="recipe-grid">');
      expect(updatedContent).toContain('sl-card class="recipe-card"');
      expect(updatedContent).toContain('margin-top: 3rem'); // Testimonials section preserved
    });
  });

  describe('findRecipeCardInContent', () => {
    it('should find recipe card by filename', () => {
      const cardMatch = updater.findRecipeCardInContent(originalIndexContent, 'test1.html');

      expect(cardMatch).not.toBeNull();
      expect(cardMatch.found).toBe(true);
      expect(cardMatch.cardContent).toContain('Test Recipe 1');
      expect(cardMatch.cardContent).toContain('recipes/test1.html');
    });

    it('should return not found for non-existent recipe', () => {
      const cardMatch = updater.findRecipeCardInContent(originalIndexContent, 'nonexistent.html');

      expect(cardMatch.found).toBe(false);
      expect(cardMatch.startIndex).toBe(-1);
      expect(cardMatch.endIndex).toBe(-1);
    });

    it('should handle malformed content gracefully', () => {
      const malformedContent = '<html><body><p>Not a recipe page</p></body></html>';
      
      const cardMatch = updater.findRecipeCardInContent(malformedContent, 'test1.html');

      expect(cardMatch.found).toBe(false);
    });
  });

  describe('generateRecipeCard', () => {
    it('should generate properly formatted recipe card', () => {
      const recipeData = {
        title: 'Test Recipe',
        description: 'A test description',
        image: 'test.jpg',
        cookTime: 'PT2H',
        prepTime: 'PT30M'
      };

      const cardHtml = updater.generateRecipeCard(recipeData, 'test.html');

      expect(cardHtml).toContain('<sl-card class="recipe-card"');
      expect(cardHtml).toContain('Test Recipe');
      expect(cardHtml).toContain('test.jpg');
      expect(cardHtml).toContain('recipes/test.html');
      expect(cardHtml).toContain('2-Hour Process');
    });

    it('should handle missing optional fields', () => {
      const minimalRecipeData = {
        title: 'Minimal Recipe'
      };

      const cardHtml = updater.generateRecipeCard(minimalRecipeData, 'minimal.html');

      expect(cardHtml).toContain('Minimal Recipe');
      expect(cardHtml).toContain('recipes/minimal.html');
      expect(cardHtml).not.toContain('undefined');
      expect(cardHtml).not.toContain('null');
    });

    it('should escape HTML in recipe data', () => {
      const recipeDataWithHtml = {
        title: '<script>alert("xss")</script>Safe Recipe',
        description: '<b>Bold</b> description'
      };

      const cardHtml = updater.generateRecipeCard(recipeDataWithHtml, 'safe.html');

      expect(cardHtml).not.toContain('<script>');
      expect(cardHtml).not.toContain('<b>Bold</b>');
      expect(cardHtml).toContain('Safe Recipe');
      expect(cardHtml).toContain('&lt;b&gt;Bold&lt;/b&gt; description');
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle concurrent modifications gracefully', async () => {
      // Simulate concurrent operations
      const promises = [
        Promise.resolve(updater.removeRecipeFromIndex('test1.html')),
        Promise.resolve(updater.updateRecipeInIndex({ title: 'Concurrent Update' }, 'test2.html')),
        Promise.resolve(updater.addRecipeToIndex({ title: 'New Recipe' }, 'new.html'))
      ];

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBeDefined();
      });
    });

    it('should maintain index structure after multiple operations', () => {
      // Perform multiple operations
      updater.removeRecipeFromIndex('test1.html');
      updater.updateRecipeInIndex({ title: 'Updated Recipe' }, 'test2.html');
      updater.addRecipeToIndex({ title: 'New Recipe' }, 'new.html');

      const finalContent = fs.readFileSync(testIndexPath, 'utf8');
      
      // Check structure is maintained
      expect(finalContent).toContain('<!DOCTYPE html>');
      expect(finalContent).toContain('<div class="recipe-grid">');
      expect(finalContent).toContain('</html>');
      expect(finalContent).not.toContain('Test Recipe 1');
      expect(finalContent).toContain('Updated Recipe');
      expect(finalContent).toContain('New Recipe');
    });
  });
});