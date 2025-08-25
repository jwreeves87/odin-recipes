const FileSystemStorage = require('../js/FileSystemStorage');
const Recipe = require('../js/Recipe');
const fs = require('fs');
const path = require('path');

describe('FileSystemStorage', () => {
  let storage;
  let testRecipesDir;
  let sampleRecipe;

  beforeEach(() => {
    testRecipesDir = path.join(__dirname, 'test-recipes');
    
    sampleRecipe = new Recipe({
      title: 'Test Brisket',
      description: 'Test description',
      ingredients: ['Salt', 'Pepper'],
      instructions: ['Season', 'Smoke'],
      prepTime: 'PT30M',
      cookTime: 'PT16H',
      servings: '12'
    });

    // Ensure test directory is clean
    if (fs.existsSync(testRecipesDir)) {
      fs.rmSync(testRecipesDir, { recursive: true, force: true });
    }
    
    // Create storage after cleaning - this will create the directory
    storage = new FileSystemStorage(testRecipesDir);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testRecipesDir)) {
      fs.rmSync(testRecipesDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should use default recipes directory if none provided', () => {
      const defaultStorage = new FileSystemStorage();
      expect(defaultStorage.recipesDir).toBe(path.join(process.cwd(), 'recipes'));
    });

    it('should use provided recipes directory', () => {
      expect(storage.recipesDir).toBe(testRecipesDir);
    });

    it('should create recipes directory if it does not exist', () => {
      // Re-create storage to trigger directory creation
      const newTestDir = path.join(__dirname, 'new-test-recipes');
      if (fs.existsSync(newTestDir)) {
        fs.rmSync(newTestDir, { recursive: true, force: true });
      }
      
      new FileSystemStorage(newTestDir);
      
      expect(fs.existsSync(newTestDir)).toBe(true);
      expect(fs.statSync(newTestDir).isDirectory()).toBe(true);
      
      // Clean up
      fs.rmSync(newTestDir, { recursive: true, force: true });
    });
  });

  describe('writeRecipeFile', () => {
    it('should write recipe HTML file with metadata', async () => {
      const recipeWithMetadata = {
        ...sampleRecipe,
        id: 'test-123',
        filename: 'test-123.html',
        createdAt: new Date('2023-01-01'),
        modifiedAt: new Date('2023-01-02')
      };

      const result = await storage.writeRecipeFile(recipeWithMetadata, 'test-123.html');
      
      expect(result).toBe('test-123.html');
      
      const filePath = path.join(testRecipesDir, 'test-123.html');
      expect(fs.existsSync(filePath)).toBe(true);
      
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain('<title>Test Brisket - Reeves BBQ Co.</title>');
      expect(content).toContain('Salt');
      expect(content).toContain('Season');
    });

    it('should embed metadata as JSON in HTML comments', async () => {
      const recipeWithMetadata = {
        ...sampleRecipe,
        id: 'test-123',
        filename: 'test-123.html',
        createdAt: new Date('2023-01-01T10:00:00.000Z'),
        modifiedAt: new Date('2023-01-02T15:30:00.000Z')
      };

      await storage.writeRecipeFile(recipeWithMetadata, 'test-123.html');
      
      const filePath = path.join(testRecipesDir, 'test-123.html');
      const content = fs.readFileSync(filePath, 'utf8');
      
      expect(content).toContain('<!-- RECIPE_METADATA_START');
      expect(content).toContain('RECIPE_METADATA_END -->');
      expect(content).toContain('"id": "test-123"');
      expect(content).toContain('"createdAt": "2023-01-01T10:00:00.000Z"');
    });

    it('should handle write errors gracefully', async () => {
      // Create a read-only directory to cause write failure
      const readOnlyDir = path.join(__dirname, 'readonly-test');
      fs.mkdirSync(readOnlyDir, { mode: 0o444 });
      
      const readOnlyStorage = new FileSystemStorage(readOnlyDir);
      
      try {
        await expectAsync(
          readOnlyStorage.writeRecipeFile(sampleRecipe, 'test.html')
        ).toBeRejected();
      } finally {
        // Restore write permissions for cleanup
        fs.chmodSync(readOnlyDir, 0o755);
        fs.rmSync(readOnlyDir, { recursive: true, force: true });
      }
    });
  });

  describe('readRecipeFile', () => {
    beforeEach(async () => {
      const recipeWithMetadata = {
        ...sampleRecipe,
        id: 'test-123',
        filename: 'test-123.html',
        createdAt: new Date('2023-01-01T10:00:00.000Z'),
        modifiedAt: new Date('2023-01-02T15:30:00.000Z')
      };
      
      await storage.writeRecipeFile(recipeWithMetadata, 'test-123.html');
    });

    it('should read recipe with metadata from HTML file', async () => {
      const recipe = await storage.readRecipeFile('test-123.html');
      
      expect(recipe.id).toBe('test-123');
      expect(recipe.title).toBe('Test Brisket');
      expect(recipe.description).toBe('Test description');
      expect(recipe.ingredients).toEqual(['Salt', 'Pepper']);
      expect(recipe.instructions).toEqual(['Season', 'Smoke']);
      expect(recipe.filename).toBe('test-123.html');
      expect(new Date(recipe.createdAt)).toEqual(new Date('2023-01-01T10:00:00.000Z'));
      expect(new Date(recipe.modifiedAt)).toEqual(new Date('2023-01-02T15:30:00.000Z'));
    });

    it('should handle files without metadata gracefully', async () => {
      // Create a file without metadata
      const htmlWithoutMetadata = `
        <!DOCTYPE html>
        <html><head><title>Old Recipe</title></head>
        <body><h1>Old Recipe Format</h1></body>
        </html>
      `;
      
      fs.writeFileSync(path.join(testRecipesDir, 'old-recipe.html'), htmlWithoutMetadata);
      
      const recipe = await storage.readRecipeFile('old-recipe.html');
      
      expect(recipe.title).toBe('Old Recipe Format');
      expect(recipe.id).toBeUndefined();
      expect(recipe.createdAt).toBeUndefined();
    });

    it('should throw error for non-existent files', async () => {
      await expectAsync(
        storage.readRecipeFile('nonexistent.html')
      ).toBeRejected();
    });
  });

  describe('deleteRecipeFile', () => {
    beforeEach(async () => {
      await storage.writeRecipeFile({
        ...sampleRecipe,
        id: 'test-123'
      }, 'test-123.html');
    });

    it('should delete existing recipe file', async () => {
      const result = await storage.deleteRecipeFile('test-123.html');
      
      expect(result).toBe(true);
      expect(fs.existsSync(path.join(testRecipesDir, 'test-123.html'))).toBe(false);
    });

    it('should return false for non-existent files', async () => {
      const result = await storage.deleteRecipeFile('nonexistent.html');
      expect(result).toBe(false);
    });
  });

  describe('listRecipeFiles', () => {
    beforeEach(async () => {
      await storage.writeRecipeFile({ ...sampleRecipe, id: 'recipe1' }, 'recipe1.html');
      await storage.writeRecipeFile({ ...sampleRecipe, id: 'recipe2' }, 'recipe2.html');
      
      // Create a non-recipe file that should be ignored
      fs.writeFileSync(path.join(testRecipesDir, 'not-a-recipe.txt'), 'ignore me');
    });

    it('should list only HTML recipe files', async () => {
      const files = await storage.listRecipeFiles();
      
      expect(files).toHaveSize(2);
      expect(files).toContain('recipe1.html');
      expect(files).toContain('recipe2.html');
      expect(files).not.toContain('not-a-recipe.txt');
    });

    it('should return empty array if no recipe files exist', async () => {
      // Clean up existing files
      fs.rmSync(testRecipesDir, { recursive: true, force: true });
      fs.mkdirSync(testRecipesDir);
      
      const files = await storage.listRecipeFiles();
      expect(files).toEqual([]);
    });
  });

  describe('fileExists', () => {
    beforeEach(async () => {
      await storage.writeRecipeFile({
        ...sampleRecipe,
        id: 'existing'
      }, 'existing.html');
    });

    it('should return true for existing files', () => {
      expect(storage.fileExists('existing.html')).toBe(true);
    });

    it('should return false for non-existent files', () => {
      expect(storage.fileExists('nonexistent.html')).toBe(false);
    });
  });
});