const fs = require('fs');
const path = require('path');

class ServerTestUtils {
  constructor() {
    this.testIndexPath = null;
    this.originalIndexContent = null;
    this.testRecipesDir = path.join(__dirname, 'test-recipes');
  }

  setupTestEnvironment() {
    // Create test directories
    if (!fs.existsSync(this.testRecipesDir)) {
      fs.mkdirSync(this.testRecipesDir);
    }

    // Setup test index.html
    this.testIndexPath = path.join(__dirname, '..', '..', 'index.html');
    const realIndexPath = this.testIndexPath;
    
    if (fs.existsSync(realIndexPath)) {
      this.originalIndexContent = fs.readFileSync(realIndexPath, 'utf8');
    }

    const testIndexContent = `<!DOCTYPE html>
<html>
<head><title>Test Index</title></head>
<body>
  <div class="container">
    <div class="recipe-grid">
      <!-- Test recipes -->
    </div>
    
    <sl-card style="margin-top: 3rem; background: #ffffff; border: 2px solid #ff6b35; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"
      <h3 slot="header">Test Testimonials</h3>
    </sl-card>
  </div>
</body>
</html>`;
    
    fs.writeFileSync(realIndexPath, testIndexContent, 'utf8');
  }

  cleanupTestEnvironment() {
    // Clean up test files
    if (fs.existsSync(this.testRecipesDir)) {
      const files = fs.readdirSync(this.testRecipesDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(this.testRecipesDir, file));
      });
      fs.rmdirSync(this.testRecipesDir);
    }

    // Restore original index.html
    if (this.originalIndexContent && this.testIndexPath) {
      fs.writeFileSync(this.testIndexPath, this.originalIndexContent, 'utf8');
    }

    // Clean up test recipe files
    this.cleanupTestRecipeFiles();
  }

  cleanupTestRecipeFiles() {
    const recipesDir = path.join(__dirname, '..', '..', 'recipes');
    if (fs.existsSync(recipesDir)) {
      const testFiles = fs.readdirSync(recipesDir).filter(file => 
        file.includes('test') || file.includes('mock') || 
        file.includes('spec') || file.includes('concurrent') ||
        file.includes('servertest') || file.includes('indexupdate') ||
        file.includes('sanitization') || file.includes('dirtest') ||
        file.includes('large') || file.includes('moderate')
      );
      testFiles.forEach(file => {
        try {
          fs.unlinkSync(path.join(recipesDir, file));
        } catch (e) {
          // File might not exist, that's okay
        }
      });
    }
  }

  createTestRecipeData() {
    return {
      title: 'Test Recipe',
      description: 'A test recipe for server testing',
      image: 'https://example.com/test-image.jpg',
      cookTime: 'PT30M',
      prepTime: 'PT15M',
      servings: '4',
      ingredients: ['2 cups flour', '1 tsp salt'],
      instructions: ['Mix ingredients', 'Bake until done'],
      author: 'Test Chef'
    };
  }

  createTestHtml(title = 'Test Recipe') {
    return `<!DOCTYPE html>
<html>
<head><title>${title}</title></head>
<body>
  <h1>${title}</h1>
  <p>This is a test recipe for server testing.</p>
</body>
</html>`;
  }
}

module.exports = ServerTestUtils;